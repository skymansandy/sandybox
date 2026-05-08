# High-Level Architecture

Once requirements are clear, sketch the big picture. The goal is to show how major components interact before diving into any single one.

---

## Architecture Diagram

```mermaid
flowchart TB
    subgraph CLIENTS["Clients"]
        M[Mobile App]
        W[Web App]
    end

    subgraph EDGE["Edge Layer"]
        CDN[CDN — Static & Media]
        LB[Load Balancer]
        GW[API Gateway]
    end

    subgraph WRITE["Write Path"]
        PS[Post Service]
        MS[Media Service]
        FOS[Fan-Out Service]
    end

    subgraph READ["Read Path"]
        FS[Feed Service]
        RS[Ranking Service]
    end

    subgraph DATA["Data Layer"]
        PG[(PostgreSQL — Posts & Users)]
        REDIS[(Redis — Feed Cache & Social Graph)]
        S3[(S3 — Media Files)]
        KAFKA[Kafka — Event Bus]
    end

    subgraph SUPPORT["Supporting Services"]
        NS[Notification Service]
        SG[Social Graph Service]
    end

    M & W --> CDN
    M & W --> LB
    LB --> GW
    GW --> PS & FS
    PS --> PG
    PS --> MS --> S3
    S3 --> CDN
    PS --> KAFKA
    KAFKA --> FOS
    FOS --> REDIS
    FOS --> KAFKA
    KAFKA --> NS
    FS --> REDIS
    FS --> RS
    RS --> PG
    FOS --> SG --> REDIS
```

---

## Write Path vs. Read Path

The core architectural insight: **separate the write path (publishing) from the read path (feed serving)**. They have different latency requirements, scaling profiles, and failure modes.

```mermaid
flowchart LR
    subgraph WRITE_PATH["Write Path (Publish)"]
        direction TB
        W1[User publishes post] --> W2[Post Service persists to DB]
        W2 --> W3[Kafka event emitted]
        W3 --> W4[Fan-Out Service pushes to follower caches]
    end

    subgraph READ_PATH["Read Path (Feed)"]
        direction TB
        R1[User requests feed] --> R2[Feed Service reads from cache]
        R2 --> R3[Ranking Service scores & orders]
        R3 --> R4[Return ranked feed page]
    end
```

| Aspect | Write Path | Read Path |
|--------|-----------|-----------|
| **Latency target** | < 500ms (author sees post); fan-out is async | < 200ms (feed page load) |
| **Throughput** | ~11.5K posts/sec | ~58K feed reads/sec |
| **Bottleneck** | Fan-out write amplification | Cache hit rate |
| **Scaling strategy** | More Kafka partitions + fan-out workers | More Redis replicas + CDN |
| **Failure tolerance** | Can queue and retry | Must serve stale cache on failure |

---

## Component Responsibilities

### Edge Layer

| Component | Role |
|-----------|------|
| **CDN** | Serves static assets (JS, CSS) and media files (images, video); reduces origin load by 80%+ |
| **Load Balancer** | Distributes requests across API Gateway instances; L7 routing for path-based service routing |
| **API Gateway** | Authentication, rate limiting, request routing; terminates TLS |

### Write Path Services

| Service | Responsibility | Scaling Notes |
|---------|---------------|---------------|
| **Post Service** | Validates and persists posts; triggers media processing; emits post-created events to Kafka | Stateless; scale horizontally |
| **Media Service** | Handles upload, image resizing, video transcoding, thumbnail generation | CPU-intensive; scales independently with job queues |
| **Fan-Out Service** | Reads follower lists, writes post references to each follower's feed cache | Highest throughput demand; partitioned by author_id in Kafka |

### Read Path Services

| Service | Responsibility | Scaling Notes |
|---------|---------------|---------------|
| **Feed Service** | Assembles feed from cache; hydrates post metadata; applies pagination | Read-heavy; horizontally scalable with Redis read replicas |
| **Ranking Service** | Scores and reorders candidate posts using ML models | Latency-sensitive; uses pre-computed features + lightweight inference |

### Supporting Services

| Service | Responsibility | Scaling Notes |
|---------|---------------|---------------|
| **Social Graph Service** | Manages follow/unfollow; provides follower lists for fan-out | Backed by Redis or graph DB; read-heavy |
| **Notification Service** | Sends push/email notifications for new posts from close friends | Consumes Kafka events; stateless |

### Data Layer

| Store | Used For | Why This Store |
|-------|----------|----------------|
| **PostgreSQL** | Posts, users, likes, comments | Strong consistency for writes, rich queries, ACID guarantees |
| **Redis** | Feed cache (sorted sets), social graph, session data | Sub-ms reads, sorted set operations for ranked feeds, TTL support |
| **Kafka** | Event streaming between services | Decouples write/read paths; ordered, durable, replayable |
| **S3 + CDN** | Media files (images, video) | Cheap blob storage + global edge caching |

---

## Publish Flow: End-to-End

```mermaid
sequenceDiagram
    participant U as User
    participant GW as API Gateway
    participant PS as Post Service
    participant DB as PostgreSQL
    participant MS as Media Service
    participant K as Kafka
    participant FO as Fan-Out Service
    participant SG as Social Graph
    participant RC as Redis Feed Cache

    U->>GW: POST /api/v1/posts (text + image)
    GW->>PS: Forward (authenticated)
    PS->>MS: Upload image (async)
    MS-->>PS: media_url
    PS->>DB: INSERT post record
    PS->>U: 201 Created (post visible to author)
    PS->>K: Emit PostCreated event

    K->>FO: Consume PostCreated
    FO->>SG: Get followers(author_id)
    SG-->>FO: [follower_1, follower_2, ..., follower_N]

    loop For each follower
        FO->>RC: ZADD feed:{follower_id} score post_id
    end
```

---

## Feed Read Flow: End-to-End

```mermaid
sequenceDiagram
    participant U as User
    participant GW as API Gateway
    participant FS as Feed Service
    participant RC as Redis Feed Cache
    participant RS as Ranking Service
    participant DB as PostgreSQL

    U->>GW: GET /api/v1/feed?cursor=X&limit=20
    GW->>FS: Forward (authenticated)
    FS->>RC: ZREVRANGE feed:{user_id} cursor limit*3
    RC-->>FS: [post_id_1, post_id_2, ..., post_id_60]
    FS->>DB: Multi-GET post metadata (batch)
    DB-->>FS: Post objects with author info
    FS->>RS: Rank(posts, user_context)
    RS-->>FS: Scored & sorted posts
    FS->>U: Top 20 posts + next_cursor
```

!!! note "Over-Fetching for Ranking"
    The Feed Service fetches 3× the requested page size from cache, then lets the Ranking Service filter and reorder. This ensures enough candidates survive filtering (e.g., removing already-seen posts, blocked users) to fill the page.

---

## Authentication & Security

| Concern | Approach |
|---------|----------|
| **API auth** | OAuth 2.0 / JWT; short-lived access tokens (15 min) + refresh tokens |
| **Rate limiting** | Per-user publish rate (e.g., 50 posts/hour); per-user feed reads (e.g., 300/min) |
| **Content validation** | Server-side input sanitization; media virus scanning; NSFW detection |
| **Privacy** | Respect block lists and privacy settings in feed assembly; never leak private posts |
| **Transport security** | TLS everywhere; certificate pinning on mobile |

---

??? question "Interview Questions"

    **Q: Why separate the write path from the read path?**
    They have fundamentally different characteristics. Writes are infrequent but trigger massive fan-out (1 post → 200 cache writes). Reads are frequent but cheap (1 cache lookup). Separating them lets you scale, optimize, and handle failures independently. This is a form of CQRS (Command Query Responsibility Segregation).

    **Q: Why use Kafka between Post Service and Fan-Out Service instead of direct calls?**
    Decoupling. The Post Service shouldn't block on fan-out completing — that could take seconds for users with millions of followers. Kafka absorbs the burst, provides durability (if Fan-Out Service is down, events are retained), and allows multiple consumers (notifications, analytics) from the same event stream.

    **Q: Why Redis sorted sets for feed cache instead of a simple list?**
    Sorted sets (`ZADD`, `ZREVRANGE`) let you store post references with scores (ranking scores or timestamps). This enables efficient pagination, score-based ordering, and deduplication — all in O(log N) operations. A plain list would require full scans for ranked feeds.

    **Q: What happens if the Redis feed cache is cold (new user or cache eviction)?**
    Fall back to the read path: query the social graph for who the user follows, fetch recent posts from those authors from the database, rank them, and populate the cache. This is the "pull" model and is always available as a fallback. Cache warm-up can also run as a background job.
