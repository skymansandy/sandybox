# Full-Text Search

Full-text search (FTS) enables efficient searching of text content by building an **inverted index** — a precomputed mapping from words to the documents that contain them. Essential for search features that go beyond simple `LIKE` pattern matching.

---

## Why Not LIKE?

```sql
-- This forces a full table scan on every query
SELECT * FROM articles WHERE body LIKE '%database indexing%';
```

| Aspect | `LIKE '%term%'` | Full-Text Search |
|--------|-----------------|-----------------|
| **Index usage** | None (leading wildcard kills index) | Inverted index — O(1) per term |
| **Performance** | O(n) — scans every row | O(1) lookup + merge |
| **Ranking** | No relevance scoring | TF-IDF, BM25, proximity |
| **Linguistic** | Exact byte match | Stemming, stop words, synonyms |
| **Fuzzy matching** | No | Typo tolerance, phonetic |
| **Multi-word** | Manual AND/OR with multiple LIKE | Boolean queries, phrase search |

!!! note "When LIKE is fine"
    `LIKE 'prefix%'` (no leading wildcard) can use a B-tree index efficiently. Use it for autocomplete on short, exact-prefix fields (e.g., username search). FTS is overkill for this.

---

## Inverted Index Internals

The core data structure behind full-text search. Maps each **term** to a list of **document IDs** (posting list) where it appears.

### Building the Index

```mermaid
flowchart LR
    DOC[Document] --> TOK[Tokenizer<br/>split into words]
    TOK --> NORM[Normalizer<br/>lowercase, strip accents]
    NORM --> STEM[Stemmer<br/>running → run]
    STEM --> STOP[Stop Word Removal<br/>the, is, a → removed]
    STOP --> IDX[Inverted Index<br/>term → posting list]
```

**Example:**

| Doc ID | Text |
|--------|------|
| 1 | "Database indexing improves query performance" |
| 2 | "Query optimization requires proper indexes" |
| 3 | "Performance tuning for database queries" |

**After tokenization, normalization, and stemming:**

| Term | Posting List |
|------|-------------|
| `databas` | [1, 3] |
| `index` | [1, 2] |
| `improv` | [1] |
| `queri` | [1, 2, 3] |
| `perform` | [1, 3] |
| `optim` | [2] |
| `requir` | [2] |
| `proper` | [2] |
| `tune` | [3] |

### Text Processing Pipeline

| Step | Input | Output | Purpose |
|------|-------|--------|---------|
| **Tokenization** | `"high-performance DB"` | `["high", "performance", "DB"]` | Split text into words |
| **Lowercasing** | `["high", "performance", "DB"]` | `["high", "performance", "db"]` | Case-insensitive matching |
| **Stop word removal** | `["the", "database", "is"]` | `["database"]` | Remove common words |
| **Stemming** | `["running", "indexes"]` | `["run", "index"]` | Reduce to root form |
| **Lemmatization** | `["better", "ran"]` | `["good", "run"]` | Dictionary-based root form |

### Stemming vs Lemmatization

| Aspect | Stemming | Lemmatization |
|--------|----------|--------------|
| Method | Rule-based suffix stripping | Dictionary lookup |
| Speed | Fast | Slower |
| Accuracy | Approximate (may over/under-stem) | Accurate |
| Example | "studies" → "studi" | "studies" → "study" |
| Algorithm | Porter, Snowball | WordNet, spaCy |

---

## Ranking Algorithms

### TF-IDF (Term Frequency — Inverse Document Frequency)

```
TF(t, d) = count of term t in document d / total terms in d
IDF(t) = log(total documents / documents containing t)
TF-IDF(t, d) = TF(t, d) × IDF(t)
```

| Component | Purpose | Effect |
|-----------|---------|--------|
| **TF** | How often the term appears in this document | More mentions = higher score |
| **IDF** | How rare the term is across all documents | Rare terms = higher score |

**Example**: "database" appears in 90% of docs (low IDF → low value). "sharding" appears in 2% (high IDF → high value).

### BM25 (Best Match 25)

The industry standard ranking function used by Elasticsearch, PostgreSQL, and SQLite FTS5. An improvement over TF-IDF that handles **term saturation** and **document length normalization**.

```
BM25(d, q) = Σ IDF(t) × [TF(t,d) × (k₁ + 1)] / [TF(t,d) + k₁ × (1 - b + b × |d|/avgdl)]
```

| Parameter | Default | Effect |
|-----------|---------|--------|
| **k₁** | 1.2 | Term saturation — how quickly TF returns diminish (lower = faster saturation) |
| **b** | 0.75 | Document length normalization (0 = ignore length, 1 = full normalization) |

**Key differences from TF-IDF:**

- **Term saturation**: 10 occurrences of "database" doesn't score 10x higher than 1 occurrence — diminishing returns
- **Length normalization**: Long documents don't get unfairly penalized for having more terms

---

## FTS in Major Databases

### PostgreSQL

PostgreSQL has built-in full-text search with `tsvector` (document) and `tsquery` (query) types.

```sql
-- Add a tsvector column and GIN index
ALTER TABLE articles ADD COLUMN search_vector tsvector;
UPDATE articles SET search_vector = 
    to_tsvector('english', coalesce(title, '') || ' ' || coalesce(body, ''));

CREATE INDEX idx_articles_search ON articles USING GIN (search_vector);

-- Search
SELECT title, ts_rank(search_vector, query) AS rank
FROM articles, to_tsquery('english', 'database & indexing') AS query
WHERE search_vector @@ query
ORDER BY rank DESC;
```

| Component | Purpose |
|-----------|---------|
| `to_tsvector(config, text)` | Tokenize + normalize + stem → stored vector |
| `to_tsquery(config, query)` | Parse search query with operators |
| `@@` | Match operator (vector matches query) |
| `ts_rank()` | Rank by relevance (TF-based) |
| `ts_rank_cd()` | Rank by cover density (proximity) |
| GIN index | Inverted index for fast lookup |

**Query operators:**

```sql
'database & indexing'       -- AND (both terms)
'database | optimization'   -- OR (either term)
'!deprecated'               -- NOT
'database <-> indexing'     -- FOLLOWED BY (phrase/proximity)
'databas:*'                 -- PREFIX match
```

### MySQL

MySQL supports FTS on InnoDB (5.6+) and MyISAM tables.

```sql
-- Create fulltext index
ALTER TABLE articles ADD FULLTEXT INDEX idx_ft (title, body);

-- Natural language mode (default) — BM25 ranking
SELECT *, MATCH(title, body) AGAINST('database indexing') AS score
FROM articles
WHERE MATCH(title, body) AGAINST('database indexing')
ORDER BY score DESC;

-- Boolean mode — explicit operators
SELECT * FROM articles
WHERE MATCH(title, body) AGAINST('+database +indexing -deprecated' IN BOOLEAN MODE);
```

| Mode | Ranking | Operators | Stop Words |
|------|---------|-----------|------------|
| **Natural Language** | BM25-like | No | Yes (filtered) |
| **Boolean** | No ranking (or use MATCH for score) | `+` `-` `*` `""` `>` `<` | No |
| **Query Expansion** | Two-pass (find related terms) | No | Yes |

### SQLite FTS5

SQLite's latest full-text search module — used heavily on Android via Room.

```sql
-- Create FTS virtual table
CREATE VIRTUAL TABLE articles_fts USING fts5(title, body);

-- Insert data (often synced from a regular table)
INSERT INTO articles_fts SELECT title, body FROM articles;

-- Search with BM25 ranking
SELECT *, rank FROM articles_fts WHERE articles_fts MATCH 'database indexing'
ORDER BY rank;

-- Phrase search
SELECT * FROM articles_fts WHERE articles_fts MATCH '"database indexing"';

-- Column filter
SELECT * FROM articles_fts WHERE articles_fts MATCH 'title:database';

-- Prefix search
SELECT * FROM articles_fts WHERE articles_fts MATCH 'data*';
```

!!! tip "FTS5 on Android (Room)"
    ```kotlin
    @Fts4  // or @Fts4 for older FTS version
    @Entity(tableName = "articles_fts")
    data class ArticleFts(
        @ColumnInfo(name = "title") val title: String,
        @ColumnInfo(name = "body") val body: String
    )
    
    @Dao
    interface SearchDao {
        @Query("SELECT * FROM articles_fts WHERE articles_fts MATCH :query")
        fun search(query: String): List<ArticleFts>
    }
    ```

---

## Architecture Patterns

### Dedicated Search Engine vs Database FTS

| Aspect | Database FTS (PostgreSQL, MySQL) | Dedicated Engine (Elasticsearch, Meilisearch) |
|--------|--------------------------------|----------------------------------------------|
| **Consistency** | Transactional (ACID) | Eventually consistent |
| **Setup** | No extra infra | Separate cluster |
| **Sync** | Automatic (same table) | Requires sync pipeline |
| **Ranking** | Basic (TF-IDF, BM25) | Advanced (boosting, fuzzy, facets) |
| **Scale** | Limited by DB instance | Horizontally scalable |
| **Features** | Search + CRUD in one query | Facets, aggregations, highlighting, suggestions |
| **Best for** | < 10M docs, simple search | Large-scale, feature-rich search |

### Sync Pattern for External Search Engine

```mermaid
flowchart LR
    APP[Application] -->|writes| DB[(Database)]
    DB -->|CDC / polling| SYNC[Sync Pipeline]
    SYNC -->|index| ES[(Search Engine)]
    APP -->|search queries| ES
    APP -->|read by ID| DB
```

---

## When to Use FTS

| Scenario | Solution |
|----------|----------|
| Prefix search on a single column | B-tree index with `LIKE 'prefix%'` |
| Exact match lookup | B-tree or hash index |
| Multi-word search across text columns | **Full-text search** |
| Search with relevance ranking | **Full-text search** |
| Typo-tolerant / fuzzy search | Elasticsearch, Meilisearch, Typesense |
| Faceted search with aggregations | Elasticsearch, Solr |
| Real-time search on < 1M documents | PostgreSQL / MySQL FTS |
| Search on > 10M documents | Dedicated search engine |

---

??? question "Interview Questions"

    **Q: What is an inverted index and why is it used for search?**

    An inverted index maps each unique term to the list of documents containing it (posting list). For a search query, the engine looks up each term in O(1), retrieves the posting lists, and intersects/unions them. This is fundamentally faster than scanning every document for matching text.

    **Q: How does BM25 improve over TF-IDF?**

    BM25 adds term saturation (10 occurrences of a word doesn't score 10x more than 1) and document length normalization (a long document isn't unfairly penalized). These make ranking more intuitive and accurate for real-world text.

    **Q: When would you choose PostgreSQL FTS over Elasticsearch?**

    When you have < 10M documents, don't need advanced features (facets, fuzzy, suggestions), and want transactional consistency with your relational data. PostgreSQL FTS avoids the operational overhead of a separate Elasticsearch cluster and the complexity of data synchronization.

    **Q: What's the write overhead of maintaining an FTS index?**

    Every INSERT/UPDATE/DELETE must update the inverted index — tokenize the text, update posting lists, potentially rebalance the index structure. This is heavier than B-tree index maintenance. For write-heavy workloads, consider async indexing or a separate search service.

!!! tip "Further Reading"
    - [PostgreSQL Full-Text Search Documentation](https://www.postgresql.org/docs/current/textsearch.html)
    - [SQLite FTS5 Extension](https://www.sqlite.org/fts5.html)
    - [Elasticsearch: The Definitive Guide](https://www.elastic.co/guide/en/elasticsearch/reference/current/index.html)
    - [Introduction to Information Retrieval — Stanford](https://nlp.stanford.edu/IR-book/)
