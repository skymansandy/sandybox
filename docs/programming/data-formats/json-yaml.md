# JSON & YAML

Two text-based data formats that dominate configuration and data interchange. JSON is the universal API format; YAML is the go-to for configuration files.

---

## JSON (JavaScript Object Notation)

### Specification

Defined by [RFC 8259](https://datatracker.ietf.org/doc/html/rfc8259). Six data types:

| Type | Example | Notes |
|------|---------|-------|
| **String** | `"hello"` | UTF-8, must use double quotes |
| **Number** | `42`, `3.14`, `-1e10` | No hex, no NaN, no Infinity |
| **Boolean** | `true`, `false` | Lowercase only |
| **Null** | `null` | Lowercase only |
| **Array** | `[1, 2, 3]` | Ordered, heterogeneous |
| **Object** | `{"key": "value"}` | Unordered key-value pairs, keys must be strings |

!!! warning "Common Gotchas"
    - No comments allowed in standard JSON (use JSON5 or JSONC for comments)
    - No trailing commas: `{"a": 1,}` is invalid
    - Keys must be double-quoted strings — not single quotes, not unquoted
    - Numbers have no integer/float distinction — `1` and `1.0` are both "number"
    - No `undefined` — only `null`

### Encoding & Wire Format

JSON is always UTF-8 encoded text (RFC 8259 mandates UTF-8 for closed ecosystems; RFC 7159 allowed UTF-16/32).

```
{"name":"Alice","age":30,"scores":[95,87]}
```

**Size breakdown** — field names repeat in every object:

```
Array of 1000 users:
  JSON:     ~45 KB  (field names × 1000)
  Protobuf: ~12 KB  (field numbers, varint encoding)
```

### JSON Parsing Internals

Two fundamental parsing strategies:

=== "DOM (Tree) Parsing"

    Parses the entire document into an in-memory tree structure. Random access to any node.

    ```
    Input → Lexer → Token Stream → Parser → Tree (Map/List)
    ```

    - **Pros**: Easy to navigate, modify, and query
    - **Cons**: Entire document in memory — O(n) space
    - **Libraries**: `org.json`, Gson, Jackson `ObjectMapper`

=== "Streaming (SAX-style) Parsing"

    Reads tokens one at a time. Never holds the full document in memory.

    ```
    Input → Lexer → Token Stream → Event callbacks
    ```

    - **Pros**: O(1) memory, handles huge files
    - **Cons**: Forward-only, complex application logic
    - **Libraries**: Jackson `JsonParser`, Gson `JsonReader`, `kotlinx.serialization` streaming

=== "Pull Parsing"

    Application pulls tokens on demand (vs push/callback model).

    ```kotlin
    val reader = JsonReader(inputStream.reader())
    reader.beginObject()
    while (reader.hasNext()) {
        val name = reader.nextName()
        when (name) {
            "id" -> id = reader.nextInt()
            "name" -> username = reader.nextString()
            else -> reader.skipValue()
        }
    }
    reader.endObject()
    ```

### JSON Schema

Optional validation layer — defines the shape of valid JSON documents.

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "name": { "type": "string", "minLength": 1 },
    "age": { "type": "integer", "minimum": 0 },
    "email": { "type": "string", "format": "email" }
  },
  "required": ["name", "email"],
  "additionalProperties": false
}
```

| Use Case | Tool |
|----------|------|
| API request/response validation | JSON Schema |
| Config file validation | JSON Schema in IDE (VSCode) |
| Code generation from schema | `quicktype`, `json-schema-to-typescript` |
| OpenAPI / Swagger | Uses JSON Schema for request/response bodies |

---

## YAML (YAML Ain't Markup Language)

### Specification

Superset of JSON — every valid JSON document is valid YAML. Designed for human readability.

```yaml
# This is a comment
server:
  host: localhost
  port: 8080
  features:
    - auth
    - logging
  database:
    url: "jdbc:postgresql://localhost/mydb"
    pool_size: 10
    ssl: true
```

### Data Types

| Type | YAML | Equivalent JSON |
|------|------|----------------|
| **String** | `name: Alice` | `"name": "Alice"` |
| **Integer** | `port: 8080` | `"port": 8080` |
| **Float** | `ratio: 3.14` | `"ratio": 3.14` |
| **Boolean** | `enabled: true` | `"enabled": true` |
| **Null** | `value: null` or `value: ~` | `"value": null` |
| **List** | `- item` (block) or `[a, b]` (flow) | `["a", "b"]` |
| **Map** | `key: value` (block) or `{k: v}` (flow) | `{"k": "v"}` |
| **Date** | `created: 2024-01-15` | Auto-parsed to date |

!!! warning "The Norway Problem"
    YAML 1.1 auto-casts certain strings to booleans: `NO`, `yes`, `on`, `off` all become booleans. Country code `NO` (Norway) becomes `false`. YAML 1.2 fixes this — only `true`/`false` are booleans. Always quote ambiguous strings.

    ```yaml
    # Dangerous in YAML 1.1
    country: NO        # parsed as false!
    country: "NO"      # safe — always a string
    ```

### Multiline Strings

```yaml
# Literal block (|) — preserves newlines
description: |
  This is line 1.
  This is line 2.
  
  This has a blank line above.

# Folded block (>) — joins lines with spaces
description: >
  This is a long sentence
  that wraps across multiple
  lines but becomes one line.

# Chomping indicators
text: |+    # keep trailing newlines
text: |-    # strip trailing newlines
text: |     # clip (single trailing newline)
```

### Anchors & Aliases

Reuse YAML nodes to avoid repetition:

```yaml
defaults: &defaults
  adapter: postgres
  host: localhost
  pool: 5

development:
  <<: *defaults        # merge all keys from defaults
  database: myapp_dev

production:
  <<: *defaults
  database: myapp_prod
  pool: 25             # override the default
```

!!! warning "Security: YAML Deserialization Attacks"
    YAML supports language-specific tags like `!!python/object/apply:os.system` which can execute arbitrary code. **Never** use unsafe loaders on untrusted input.

    | Language | Safe | Unsafe |
    |----------|------|--------|
    | Python | `yaml.safe_load()` | `yaml.load()` (with `Loader=FullLoader`) |
    | Ruby | `YAML.safe_load()` | `YAML.load()` |
    | Java (SnakeYAML) | `new SafeConstructor()` | Default constructor |

---

## JSON vs YAML

| Aspect | JSON | YAML |
|--------|------|------|
| **Readability** | Moderate (braces, quotes) | High (indentation-based) |
| **Comments** | Not supported | `#` comments |
| **Data types** | 6 basic types | Rich (dates, binary, sets) |
| **Multiline strings** | Escaped `\n` only | `|` and `>` block scalars |
| **Anchors/aliases** | Not supported | `&` and `*` for reuse |
| **Parsing speed** | Fast | Slower (complex spec) |
| **Security** | Safe (no code execution) | Risky (tag deserialization) |
| **Trailing commas** | Not allowed | N/A (no commas) |
| **Primary use** | APIs, data interchange | Config files, CI/CD |

---

## Common Formats in Practice

| Domain | Format | Why |
|--------|--------|-----|
| REST APIs | JSON | Universal browser support, fast parsing |
| gRPC | Protobuf | Binary efficiency, schema enforcement |
| Kubernetes | YAML | Human-editable config, comments |
| Docker Compose | YAML | Readable service definitions |
| GitHub Actions | YAML | Workflow config with comments |
| Package manifests | JSON | `package.json`, `composer.json` — machine + human |
| Terraform | HCL (JSON superset) | Infrastructure as code |

---

??? question "Interview Questions"

    **Q: Why does JSON not support comments?**

    Douglas Crockford intentionally excluded comments to prevent their misuse as parsing directives (as happened in XML). JSON is a data interchange format, not a configuration format. Use JSONC/JSON5 if you need comments.

    **Q: What's the difference between `|` and `>` in YAML?**

    `|` (literal) preserves newlines — each line break stays. `>` (folded) joins consecutive lines with spaces, turning a block into a single paragraph. Both support chomping indicators (`+`, `-`) for trailing newlines.

    **Q: How would you handle a 2GB JSON file?**

    Use streaming/pull parsing (Jackson `JsonParser`, Gson `JsonReader`) instead of DOM parsing. Read tokens one at a time with O(1) memory. For repeated processing, consider converting to a binary format (Protobuf, Avro) or loading into a database.

    **Q: Is YAML a superset of JSON?**

    Yes — every valid JSON document is valid YAML (since YAML 1.2). YAML's flow style syntax (`{key: value}`, `[item]`) is JSON. However, YAML has a much richer feature set (comments, anchors, multiline strings, custom tags).

!!! tip "Further Reading"
    - [RFC 8259 — The JSON Data Interchange Format](https://datatracker.ietf.org/doc/html/rfc8259)
    - [JSON Schema Specification](https://json-schema.org/specification)
    - [YAML 1.2 Specification](https://yaml.org/spec/1.2.2/)
    - [The Norway Problem](https://hitchdev.com/strictyaml/why/implicit-typing-removed/)
