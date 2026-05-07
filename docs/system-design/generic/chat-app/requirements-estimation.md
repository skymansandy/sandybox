# Requirements & Estimation

The first 5 minutes of a system design interview set the tone. Resist the urge to jump into architecture — instead, clarify scope and anchor the design in concrete numbers.

---

## Step 1: Clarify Functional Requirements

Start by asking the interviewer which features are in scope. A chat app can range from bare-bones messaging to a full platform.

### Core Features (Almost Always In Scope)

| Feature | Details |
|---------|---------|
| **1-on-1 messaging** | Send/receive text messages between two users |
| **Group messaging** | Multi-user conversations (up to ~500 members) |
| **Online/offline status** | Real-time presence indicators |
| **Message history** | Persistent storage, scroll-back on any device |
| **Multi-device support** | Same account on phone, tablet, desktop |

### Extended Features (Ask Before Including)

| Feature | Details |
|---------|---------|
| Read receipts | Sent → Delivered → Read status per message |
| Typing indicators | Real-time "user is typing…" signals |
| Media sharing | Images, video, files with previews |
| Push notifications | Alerts when the app is backgrounded or closed |
| End-to-end encryption | Client-side encryption (Signal protocol) |
| Message search | Full-text search across conversation history |
| Voice/video calls | Real-time media streaming (usually out of scope) |

!!! tip "Interview Tip"
    Don't include everything. Pick core features + 1–2 extended features. Say something like: *"I'll focus on 1-on-1 and group messaging with presence and read receipts. I'll mention E2E encryption as a follow-up but won't design it in detail."*

---

## Step 2: Define Non-Functional Requirements

| Requirement | Target | Rationale |
|-------------|--------|-----------|
| **Latency** | < 200ms message delivery | Users expect near-instant messaging |
| **Availability** | 99.99% uptime | Chat is a primary communication channel |
| **Consistency** | Eventual consistency is OK | Messages can arrive slightly out of order; no strict linearizability needed |
| **Ordering** | Per-conversation ordering | Messages within a single conversation must be ordered; cross-conversation ordering is not required |
| **Durability** | No message loss | Every sent message must be persisted and delivered |
| **Scalability** | Support 500M+ DAU | Must handle massive concurrent connections |

---

## Step 3: Capacity Estimation

Anchor your design with back-of-the-envelope math. Adjust numbers based on interviewer cues.

### Assumptions

| Parameter | Value |
|-----------|-------|
| Daily active users (DAU) | 500M |
| Avg messages sent per user per day | 40 |
| Avg message size (text) | 200 bytes |
| Media messages (% of total) | 10% |
| Avg media size | 500 KB |
| Peak-to-average ratio | 3× |

### Calculations

```
Messages/day    = 500M × 40 = 20B messages/day
Messages/sec    = 20B / 86,400 ≈ 230K msg/sec (avg)
Peak msg/sec    = 230K × 3 = ~700K msg/sec

Text storage/day   = 20B × 200 bytes = 4 TB/day
Media storage/day  = 20B × 10% × 500 KB = 1 PB/day

Concurrent WebSocket connections
  = DAU × 0.10 (10% online at any moment) = 50M connections
```

### Storage Summary

| Data Type | Daily Volume | 1-Year Estimate |
|-----------|-------------|-----------------|
| Text messages | 4 TB | ~1.5 PB |
| Media files | 1 PB | ~365 PB |
| User metadata | Negligible | ~50 GB |
| Conversation metadata | Negligible | ~200 GB |

!!! warning "These Are Order-of-Magnitude Estimates"
    Interviewers don't expect exact math. The goal is to demonstrate you can reason about scale and identify which resources are bottlenecks. Media storage dominates — that's the key insight here.

---

## Step 4: API Design

Define the core APIs before diving into architecture. Use REST for standard operations and WebSocket for real-time messaging.

### REST APIs

```
POST   /api/v1/messages              — Send a message
GET    /api/v1/conversations          — List user's conversations
GET    /api/v1/conversations/{id}/messages?cursor=X&limit=50
                                      — Fetch message history (cursor-based pagination)
POST   /api/v1/conversations          — Create a group conversation
PUT    /api/v1/conversations/{id}     — Update group info (name, avatar)
POST   /api/v1/media/upload           — Upload media, returns media_url
```

### WebSocket Events

| Direction | Event | Payload |
|-----------|-------|---------|
| Server → Client | `new_message` | `{ conversation_id, message_id, sender_id, content, timestamp }` |
| Server → Client | `message_status` | `{ message_id, status: "delivered" \| "read" }` |
| Server → Client | `typing` | `{ conversation_id, user_id, is_typing }` |
| Server → Client | `presence` | `{ user_id, status: "online" \| "offline", last_seen }` |
| Client → Server | `ack` | `{ message_id }` — confirms receipt |
| Client → Server | `read` | `{ conversation_id, last_read_message_id }` |

### Message Object

```json
{
  "message_id": "msg_01HXYZ...",
  "conversation_id": "conv_01HABC...",
  "sender_id": "user_42",
  "type": "text",
  "content": "Hey, are you free tonight?",
  "media_url": null,
  "timestamp": 1700000000000,
  "status": "sent"
}
```

!!! note "ID Generation"
    Use **time-sortable IDs** (ULID, Snowflake, or Twitter's ID scheme) so messages are naturally ordered by creation time. This avoids expensive `ORDER BY timestamp` queries.

---

??? question "Interview Questions"

    **Q: Why not use HTTP polling instead of WebSocket for real-time messaging?**
    HTTP polling wastes bandwidth and adds latency. With 50M concurrent users, even long-polling creates enormous connection overhead. WebSocket provides full-duplex communication over a single TCP connection, reducing latency to near-zero for message delivery. The tradeoff is WebSocket connections are stateful, which complicates horizontal scaling.

    **Q: How do you handle ordering in a distributed system?**
    We use time-sortable message IDs (e.g., Snowflake) generated on the server when the message is received. Within a single conversation, messages are ordered by their server-assigned ID. We don't guarantee global ordering across conversations — that's neither needed nor practical at this scale.

    **Q: Should you use REST or WebSocket for sending messages?**
    Either works. Some designs send messages over the WebSocket channel (lower latency, already connected). Others use REST for sends and WebSocket only for receives (simpler to load-balance, easier retries). Both are valid — state your choice and justify it.

    **Q: Why eventual consistency instead of strong consistency?**
    Strong consistency (e.g., linearizability) requires coordination across replicas, increasing latency. For a chat app, it's acceptable if User B sees a message 100ms after User A sent it. The critical invariant is **durability** (no message loss) and **per-conversation ordering**, not global linearizability.
