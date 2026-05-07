# High-Level Architecture

Once requirements are clear, sketch the big picture. The goal is to show how major components interact before diving into any single one.

---

## Architecture Diagram

```mermaid
flowchart TB
    subgraph CLIENTS["Clients"]
        M[Mobile App]
        W[Web App]
        D[Desktop App]
    end

    subgraph EDGE["Edge Layer"]
        LB[Load Balancer]
        GW[API Gateway]
    end

    subgraph CORE["Core Services"]
        CS[Chat Service]
        PS[Presence Service]
        NS[Notification Service]
        MS[Media Service]
        US[User Service]
    end

    subgraph DATA["Data Layer"]
        CASS[(Cassandra — Messages)]
        PG[(PostgreSQL — Users/Groups)]
        REDIS[(Redis — Sessions/Presence)]
        S3[(S3 — Media Files)]
        KAFKA[Kafka — Event Bus]
    end

    subgraph DELIVERY["Delivery"]
        CDN[CDN — Media Delivery]
        FCM[FCM / APNs]
    end

    M & W & D <-->|WebSocket| LB
    LB <--> GW
    GW <--> CS & PS & US
    CS --> KAFKA
    CS --> CASS
    US --> PG
    PS --> REDIS
    KAFKA --> NS
    NS --> FCM
    MS --> S3
    S3 --> CDN
    CS --> MS
```

---

## Component Responsibilities

### Edge Layer

| Component | Role |
|-----------|------|
| **Load Balancer** | Distributes WebSocket connections across Chat Service instances; uses consistent hashing or sticky sessions so a user's connection stays on one server |
| **API Gateway** | Rate limiting, authentication, request routing; terminates TLS; routes REST calls to appropriate services |

### Core Services

| Service | Responsibility | Scaling Notes |
|---------|---------------|---------------|
| **Chat Service** | Manages WebSocket connections, routes messages between users, persists messages | Stateful (holds connections) — scale horizontally with a connection registry |
| **Presence Service** | Tracks online/offline status, last-seen timestamps | Backed by Redis; heartbeat-based with TTL expiration |
| **Notification Service** | Sends push notifications to offline users via FCM/APNs | Consumes events from Kafka; stateless, easy to scale |
| **Media Service** | Handles upload, compression, thumbnail generation, virus scanning | CPU-intensive; scales independently from chat traffic |
| **User Service** | User profiles, contacts, group membership, authentication | Standard CRUD; backed by PostgreSQL |

### Data Layer

| Store | Used For | Why This Store |
|-------|----------|----------------|
| **Cassandra** | Message storage | Write-optimized, time-series friendly, horizontal scaling, tunable consistency |
| **PostgreSQL** | Users, groups, contacts | Relational data with strong consistency, complex queries |
| **Redis** | Sessions, presence, recent conversations | Sub-millisecond reads, TTL support for ephemeral data |
| **Kafka** | Event streaming | Decouples services; ordered, durable, replayable event log |
| **S3 + CDN** | Media files | Cheap blob storage + global edge caching for fast delivery |

---

## Message Flow: 1-on-1

```mermaid
sequenceDiagram
    participant A as User A (Sender)
    participant CS as Chat Service
    participant K as Kafka
    participant DB as Cassandra
    participant CS2 as Chat Service (B's server)
    participant B as User B (Recipient)
    participant NS as Notification Service

    A->>CS: Send message via WebSocket
    CS->>CS: Validate & assign message_id
    CS->>DB: Persist message (async write)
    CS->>CS: Lookup: is User B connected?

    alt User B is online (connected to same server)
        CS->>B: Deliver via WebSocket
        B->>CS: ACK
        CS->>A: Status → delivered
    else User B is online (different server)
        CS->>K: Publish message event
        K->>CS2: Consume message event
        CS2->>B: Deliver via WebSocket
        B->>CS2: ACK
        CS2->>K: Publish ACK event
        K->>CS: Consume ACK
        CS->>A: Status → delivered
    else User B is offline
        CS->>K: Publish message event
        K->>NS: Consume event
        NS->>B: Push notification (FCM/APNs)
    end

    CS->>DB: Update message status
```

---

## Message Flow: Group Chat

Group messaging introduces **fan-out** — one message must reach N recipients.

```mermaid
flowchart TB
    A[Sender] -->|WebSocket| CS[Chat Service]
    CS -->|Persist| DB[(Cassandra)]
    CS -->|Fetch| GM[Group Members List]
    CS -->|Fan-out| K[Kafka]

    K -->|Partition per recipient| CS1[Chat Service — Node 1]
    K -->|Partition per recipient| CS2[Chat Service — Node 2]
    K -->|Partition per recipient| CS3[Chat Service — Node 3]

    CS1 -->|WebSocket| B[User B]
    CS2 -->|WebSocket| C[User C]
    CS3 -->|Offline| NS[Notification Service]
    NS -->|Push| D[User D — Offline]
```

### Fan-Out Strategies

| Strategy | How It Works | Best For |
|----------|-------------|----------|
| **Write-time fan-out (push)** | When a message is sent, write a copy to each recipient's inbox | Small groups (< 100 members); simpler reads |
| **Read-time fan-out (pull)** | Store message once; each recipient queries the conversation on read | Large groups / channels; saves write amplification |
| **Hybrid** | Push for small groups, pull for large channels | Production systems (WhatsApp, Slack) |

!!! note "The Fan-Out Threshold"
    A common pattern: use write-time fan-out for groups ≤ 100 members and read-time fan-out for larger channels. This balances write cost against read latency.

---

## Connection Management

### The Connection Registry Problem

With millions of users spread across hundreds of Chat Service instances, you need to know **which server holds User B's WebSocket connection**.

| Approach | How It Works | Trade-offs |
|----------|-------------|------------|
| **Redis registry** | Each Chat Service registers `user_id → server_id` in Redis on connect | Simple; adds a Redis lookup per message route |
| **Consistent hashing** | Hash `user_id` to determine which server handles their connection | Predictable routing; rebalancing on scale events |
| **Service mesh / pub-sub** | Each server subscribes to a channel for its connected users | Decoupled; Kafka/Redis Pub-Sub handles routing |

### Connection Lifecycle

```mermaid
stateDiagram-v2
    [*] --> Connecting: Client initiates WebSocket
    Connecting --> Authenticated: Token validated
    Authenticated --> Connected: Registered in connection registry
    Connected --> Connected: Heartbeat (every 30s)
    Connected --> Reconnecting: Network drop / timeout
    Reconnecting --> Connected: Successful reconnect
    Reconnecting --> Disconnected: Max retries exceeded
    Connected --> Disconnected: Graceful close
    Disconnected --> [*]: Removed from registry
```

---

## Authentication & Security

| Concern | Approach |
|---------|----------|
| **WebSocket auth** | Authenticate via token during the handshake (`Sec-WebSocket-Protocol` header or query param); reject unauthenticated upgrades |
| **Token refresh** | Short-lived JWTs (15 min) + refresh tokens; WebSocket connections re-auth on token expiry |
| **Rate limiting** | Per-user message rate limit (e.g., 100 msg/min); per-IP connection limit at the gateway |
| **E2E encryption** | Optional: Signal Protocol — keys exchanged out-of-band; server sees only ciphertext |
| **Transport security** | TLS for all connections; certificate pinning on mobile clients |

---

??? question "Interview Questions"

    **Q: Why separate Chat Service from Notification Service?**
    Separation of concerns and independent scaling. Chat Service is latency-sensitive and connection-bound; Notification Service is throughput-oriented and interacts with external providers (FCM/APNs) that have their own rate limits and failure modes. Coupling them would let a push notification backlog degrade real-time message delivery.

    **Q: Why Kafka instead of a simple message queue like RabbitMQ?**
    Kafka provides ordered, durable, partitioned event logs. Messages can be replayed (useful for new consumers or failure recovery). Kafka's partition model maps well to per-conversation ordering. RabbitMQ is fine for task queues but lacks Kafka's ordering guarantees and replay capability at scale.

    **Q: How do you handle the "thundering herd" problem when a server crashes?**
    If a Chat Service instance dies, all its connected users will reconnect simultaneously. Mitigations: (1) clients use exponential backoff with jitter, (2) the load balancer distributes reconnections across healthy instances, (3) the connection registry has a TTL so stale entries are cleaned up.

    **Q: Why not use a single monolithic service?**
    At 500M DAU, a monolith can't scale individual concerns independently. Presence needs Redis and lightweight compute; media processing needs CPU/GPU; notifications interact with external APIs. Microservices let each component scale, deploy, and fail independently.
