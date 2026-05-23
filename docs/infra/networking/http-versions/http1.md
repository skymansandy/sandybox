# HTTP/1.x

---

## Protocol Overview

HTTP/1.0 (1996) and HTTP/1.1 (1997) define a **plaintext, request-response** protocol over TCP. HTTP/1.1 introduced persistent connections and pipelining, but requests are still fundamentally sequential on a single connection.

| Property | HTTP/1.0 | HTTP/1.1 |
|----------|----------|----------|
| **Spec** | [RFC 1945](https://www.rfc-editor.org/rfc/rfc1945) | [RFC 9112](https://www.rfc-editor.org/rfc/rfc9112) |
| **Connection** | New TCP connection per request | Persistent by default (`keep-alive`) |
| **Pipelining** | Not supported | Supported (but rarely enabled) |
| **Host header** | Optional | Required — enables virtual hosting |
| **Chunked transfer** | Not supported | Supported — streaming responses |
| **Caching** | `Expires`, `Pragma` | `Cache-Control`, `ETag`, `If-None-Match` |

---

## Request Lifecycle

Every HTTP/1.x exchange follows the same sequence: establish a TCP connection (and optionally TLS), send a plaintext request, wait for the complete response.

```mermaid
sequenceDiagram
    participant C as Client
    participant S as Server

    Note over C,S: TCP 3-way handshake
    C->>S: SYN
    S->>C: SYN-ACK
    C->>S: ACK

    Note over C,S: TLS handshake (if HTTPS)
    C->>S: ClientHello
    S->>C: ServerHello + Certificate
    C->>S: Key Exchange + Finished
    S->>C: Finished

    Note over C,S: HTTP request/response
    C->>S: GET /index.html HTTP/1.1
    S->>C: HTTP/1.1 200 OK + body

    Note over C,S: Connection stays open (HTTP/1.1)
    C->>S: GET /style.css HTTP/1.1
    S->>C: HTTP/1.1 200 OK + body
```

---

## Request Message Format

HTTP/1.x messages are **plaintext** — human-readable but verbose. Every request repeats the full set of headers.

```http
GET /api/users?page=2 HTTP/1.1
Host: api.example.com
Accept: application/json
Authorization: Bearer eyJhbGciOiJIUzI1NiJ9...
Cache-Control: no-cache
Connection: keep-alive
User-Agent: MyApp/1.0
```

### Message Structure

```
Request-Line: METHOD SP Request-URI SP HTTP-Version CRLF
Headers:      field-name: field-value CRLF
              ...
              CRLF
Body:         (optional payload)
```

| Component | Example | Notes |
|-----------|---------|-------|
| **Method** | `GET`, `POST`, `PUT`, `DELETE` | Defined in RFC 9110 |
| **Request-URI** | `/api/users?page=2` | Absolute path + query string |
| **HTTP-Version** | `HTTP/1.1` | Determines feature set |
| **Headers** | `Host: api.example.com` | Repeated in full on every request |
| **Body** | JSON, form data, etc. | Present for `POST`/`PUT`/`PATCH` |

---

## Persistent Connections (Keep-Alive)

HTTP/1.0 opened a **new TCP connection for every request** — including the three-way handshake and TLS negotiation overhead each time.

HTTP/1.1 made connections persistent by default: the TCP connection stays open for multiple request-response exchanges.

=== "HTTP/1.0"

    ```http
    GET /page.html HTTP/1.0
    Connection: keep-alive

    # Server may or may not honor this
    ```

=== "HTTP/1.1"

    ```http
    GET /page.html HTTP/1.1
    Host: example.com

    # Connection is persistent by default
    # Use "Connection: close" to opt out
    ```

### Connection Lifecycle

```mermaid
flowchart TD
    A[Client opens TCP connection] --> B{HTTP version?}
    B -->|1.0| C[Send request, receive response]
    C --> D[Connection closes]
    D --> A

    B -->|1.1| E[Send request, receive response]
    E --> F{More requests?}
    F -->|Yes| E
    F -->|No / Idle timeout| G[Connection closes]
```

### Connection Limits

Browsers enforce a **per-origin connection limit** (typically 6 connections in modern browsers). With only one in-flight request per connection, this means at most 6 parallel requests to a single origin.

| Browser | Max Connections per Origin | Max Total Connections |
|---------|--------------------------|----------------------|
| Chrome | 6 | 256 |
| Firefox | 6 | 256 |
| Safari | 6 | — |

!!! warning "Domain Sharding"
    To work around the 6-connection limit, sites historically served assets from multiple subdomains (`img1.example.com`, `img2.example.com`). This is an **anti-pattern with HTTP/2** — it prevents multiplexing and wastes resources.

---

## Pipelining

HTTP/1.1 introduced **pipelining**: sending multiple requests without waiting for each response. Responses must arrive **in order** (FIFO).

```mermaid
sequenceDiagram
    participant C as Client
    participant S as Server

    Note over C,S: Without pipelining
    C->>S: GET /a
    S->>C: Response /a
    C->>S: GET /b
    S->>C: Response /b

    Note over C,S: With pipelining
    C->>S: GET /a
    C->>S: GET /b
    C->>S: GET /c
    S->>C: Response /a
    S->>C: Response /b
    S->>C: Response /c
```

### Why Pipelining Failed

| Problem | Description |
|---------|-------------|
| **FIFO ordering** | A slow response blocks all subsequent responses — head-of-line blocking at the HTTP layer |
| **Broken intermediaries** | Many proxies, load balancers, and servers mishandled pipelined requests |
| **No retry semantics** | If a connection drops mid-pipeline, the client can't tell which requests were processed |
| **Non-idempotent methods** | `POST` requests can't be safely pipelined |

All major browsers **disabled pipelining by default**. It was effectively a dead feature by the time HTTP/2 arrived.

---

## Head-of-Line Blocking

The core performance problem of HTTP/1.x. It manifests at **two layers**:

### HTTP-Layer HOL Blocking

On a single connection, the client must wait for a response before sending the next request (or, with pipelining, responses must arrive in order). A slow response blocks everything behind it.

```mermaid
gantt
    title HTTP/1.1 — Sequential on Single Connection
    dateFormat X
    axisFormat %s

    section Connection 1
    GET /slow-api      :a1, 0, 300
    GET /style.css     :a2, after a1, 50
    GET /script.js     :a3, after a2, 80
```

### TCP-Layer HOL Blocking

TCP delivers bytes **in order**. If a single TCP segment is lost, all subsequent segments — even for different HTTP requests — must wait for retransmission. This is a transport-level problem that HTTP/1.x (and HTTP/2) cannot solve.

```mermaid
flowchart LR
    A["Segment 1 ✓"] --> B["Segment 2 ✗ LOST"]
    B --> C["Segment 3 ✓ (buffered)"]
    C --> D["Segment 4 ✓ (buffered)"]
    B --> E["Retransmit Segment 2"]
    E --> F["All segments delivered in order"]
```

---

## Chunked Transfer Encoding

HTTP/1.1 introduced chunked encoding so servers can stream responses without knowing the total `Content-Length` upfront.

```http
HTTP/1.1 200 OK
Transfer-Encoding: chunked

1a
This is the first chunk.
1c
This is the second chunk.

0

```

Each chunk is prefixed with its size in hexadecimal, followed by CRLF, the data, and another CRLF. A final zero-length chunk signals the end.

| Scenario | Without Chunked | With Chunked |
|----------|----------------|--------------|
| **Dynamic content** | Buffer entire response to compute `Content-Length` | Stream as chunks are generated |
| **Large files** | Must know size upfront | Stream without full buffering |
| **Server-side rendering** | Send HTML only after full render | Flush `<head>` early, stream body |

---

## Common Optimization Patterns

Since HTTP/1.x can't multiplex, developers used various workarounds to improve page load performance:

| Pattern | Mechanism | Downside |
|---------|-----------|----------|
| **Spriting** | Combine multiple images into one file | Wastes bandwidth if only a few icons are needed |
| **Concatenation** | Bundle all JS/CSS into single files | Cache invalidation — one change busts the entire bundle |
| **Inlining** | Embed small resources as `data:` URIs or `<style>` blocks | Not cacheable separately |
| **Domain sharding** | Distribute assets across subdomains | Extra DNS lookups, no connection reuse across origins |

!!! note "HTTP/2 Makes These Anti-Patterns"
    All of these workarounds become counterproductive with HTTP/2 multiplexing. They prevent fine-grained caching and add unnecessary complexity.

---

## Connection Management Headers

| Header | Purpose | Example |
|--------|---------|---------|
| `Connection: keep-alive` | Request persistent connection (HTTP/1.0) | Default in HTTP/1.1 |
| `Connection: close` | Signal that the connection will close after this exchange | Opt-out of persistence |
| `Keep-Alive: timeout=5, max=100` | Hint idle timeout and max request count | Not widely honored |
| `Transfer-Encoding: chunked` | Stream response in chunks | Server → Client |
| `Content-Length: 1234` | Exact body size in bytes | Required if not chunked |

---

??? question "Interview Questions"

    **Q: Why did HTTP/1.0 create a new connection for each request?**
    The original design was stateless and simple — each request was independent. Persistent connections were added as an extension via `Connection: keep-alive` and became default in HTTP/1.1.

    **Q: What is head-of-line blocking in HTTP/1.x?**
    On a single connection, the client must wait for the current response to complete before the next response can begin. A slow response blocks all requests behind it, even if the server could serve them instantly.

    **Q: Why did HTTP/1.1 pipelining fail in practice?**
    Three reasons: (1) responses must be in FIFO order, so a slow response still blocks; (2) many proxies and servers didn't handle pipelined requests correctly; (3) non-idempotent methods like POST can't be safely pipelined.

    **Q: How do browsers work around the single-request-per-connection limit?**
    Browsers open multiple parallel TCP connections (typically 6 per origin). Developers also used domain sharding to increase the number of parallel connections, though this is counterproductive with HTTP/2.

    **Q: What is chunked transfer encoding used for?**
    It allows servers to stream responses without knowing the total size upfront. Each chunk includes its length, and a zero-length chunk signals the end. This enables server-side rendering to flush content progressively.

    **Q: What are the performance overhead costs of HTTP/1.x?**
    (1) TCP handshake per connection (1 RTT); (2) TLS handshake (1-2 RTT); (3) full plaintext headers repeated on every request (often 500-800 bytes); (4) no multiplexing forces workarounds like spriting, concatenation, and domain sharding.

!!! tip "Further Reading"
    - [RFC 9112 — HTTP/1.1](https://www.rfc-editor.org/rfc/rfc9112) — the current HTTP/1.1 message syntax spec
    - [RFC 9110 — HTTP Semantics](https://www.rfc-editor.org/rfc/rfc9110) — methods, headers, status codes (version-independent)
    - [High Performance Browser Networking — HTTP/1.x](https://hpbn.co/http1x/) — Ilya Grigorik's deep dive
