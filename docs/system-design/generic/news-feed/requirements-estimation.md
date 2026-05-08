# Requirements & Estimation

The first 5 minutes of a system design interview set the tone. Resist the urge to jump into architecture — instead, clarify scope and anchor the design in concrete numbers.

---

## Step 1: Clarify Functional Requirements

Start by asking the interviewer which features are in scope. A news feed system can range from a simple chronological timeline to a fully ranked, multimedia feed.

### Core Features (Almost Always In Scope)

| Feature | Details |
|---------|---------|
| **Publish a post** | Users create posts with text, images, or video |
| **View news feed** | Users see a personalized feed of posts from people they follow |
| **Follow/unfollow** | Users manage their social graph |
| **Like & comment** | Basic engagement actions on posts |

### Extended Features (Ask Before Including)

| Feature | Details |
|---------|---------|
| Feed ranking | ML-based relevance ordering vs. pure chronological |
| Rich media | Video, carousels, stories, live streams |
| Reshare/retweet | Amplification mechanics |
| Notifications | Alerts for new posts from close friends, trending content |
| Ads injection | Sponsored posts mixed into the feed |
| Content moderation | Filtering harmful or spam content before rendering |
| Search & discovery | Hashtags, trending topics, explore page |

!!! tip "Interview Tip"
    Scope your design early: *"I'll focus on publishing posts, generating a personalized feed with ranking, and the follow graph. I'll mention ads and moderation as extensions but won't design them in detail."*

---

## Step 2: Define Non-Functional Requirements

| Requirement | Target | Rationale |
|-------------|--------|-----------|
| **Feed latency** | < 200ms to load | Users expect instant feed rendering |
| **Publish latency** | < 500ms (visible to author) | Author sees their own post immediately; fan-out can be async |
| **Availability** | 99.99% uptime | Feed is the core product surface |
| **Consistency** | Eventual consistency is OK | Followers seeing a post a few seconds late is acceptable |
| **Durability** | No post loss | Every published post must be persisted |
| **Scalability** | Support 500M+ DAU | Must handle massive read throughput on feeds |

---

## Step 3: Capacity Estimation

Anchor your design with back-of-the-envelope math. Adjust numbers based on interviewer cues.

### Assumptions

| Parameter | Value |
|-----------|-------|
| Daily active users (DAU) | 500M |
| Avg posts published per user per day | 2 |
| Avg followers per user | 200 |
| Avg feed fetches per user per day | 10 |
| Avg post size (text + metadata) | 1 KB |
| Media attachment rate | 60% |
| Avg media size | 500 KB |
| Feed page size | 20 posts |

### Calculations

```
Posts/day        = 500M × 2 = 1B posts/day
Posts/sec        = 1B / 86,400 ≈ 11.5K posts/sec

Feed reads/day   = 500M × 10 = 5B reads/day
Feed reads/sec   = 5B / 86,400 ≈ 58K reads/sec
                 → Read-heavy system (~5:1 read-to-write ratio)

Fan-out events/day = 1B posts × 200 avg followers = 200B fan-out writes/day
Fan-out/sec        = 200B / 86,400 ≈ 2.3M fan-out events/sec (!)

Post storage/day   = 1B × 1 KB = 1 TB/day
Media storage/day  = 1B × 60% × 500 KB = 300 TB/day
```

### Storage Summary

| Data Type | Daily Volume | 1-Year Estimate |
|-----------|-------------|-----------------|
| Post metadata | 1 TB | ~365 TB |
| Media files | 300 TB | ~110 PB |
| Feed cache (per user) | ~20 posts × 100 bytes ref = 2 KB | 500M × 2 KB = ~1 TB |
| Social graph | Negligible daily growth | ~200 GB total |

!!! warning "These Are Order-of-Magnitude Estimates"
    The key insight: fan-out writes dominate. At 200B fan-out events/day, naive push-to-all-followers doesn't scale — this is why hybrid fan-out exists. Media storage also dominates long-term costs.

---

## Step 4: API Design

Define the core APIs before diving into architecture. Separate read-path (feed) from write-path (publishing).

### REST APIs

```
POST   /api/v1/posts                    — Publish a new post
GET    /api/v1/feed?cursor=X&limit=20   — Fetch personalized feed (cursor-based pagination)
GET    /api/v1/users/{id}/posts?cursor=X — Fetch a user's profile posts
POST   /api/v1/users/{id}/follow        — Follow a user
DELETE /api/v1/users/{id}/follow        — Unfollow a user
POST   /api/v1/posts/{id}/like          — Like a post
POST   /api/v1/posts/{id}/comments      — Comment on a post
POST   /api/v1/media/upload             — Upload media, returns media_url
```

### Post Object

```json
{
  "post_id": "post_01HXYZ...",
  "author_id": "user_42",
  "content": "Just shipped the new feature!",
  "media_urls": ["https://cdn.example.com/img/abc.jpg"],
  "created_at": 1700000000000,
  "like_count": 142,
  "comment_count": 23,
  "type": "text_image"
}
```

### Feed Response

```json
{
  "posts": [
    {
      "post_id": "post_01HXYZ...",
      "author": { "user_id": "user_42", "name": "Sandy", "avatar_url": "..." },
      "content": "Just shipped the new feature!",
      "media_urls": ["https://cdn.example.com/img/abc.jpg"],
      "created_at": 1700000000000,
      "like_count": 142,
      "comment_count": 23,
      "relevance_score": 0.92
    }
  ],
  "next_cursor": "eyJsYXN0X3Njb3JlIjowLjg1fQ=="
}
```

!!! note "Cursor-Based Pagination"
    Never use offset-based pagination for feeds — inserting new posts shifts offsets and causes duplicates or missed items. Use a cursor encoding the last seen score + timestamp for stable pagination.

---

??? question "Interview Questions"

    **Q: Why is the read-to-write ratio important here?**
    A 5:1 read-to-write ratio means the system is read-heavy. This pushes you toward pre-computing feeds (fan-out-on-write) and aggressive caching rather than computing feeds on every request. However, the fan-out write amplification (200 followers per post) means you can't blindly push to everyone — hence hybrid fan-out.

    **Q: Why cursor-based pagination instead of offset?**
    Offset pagination breaks when new posts are inserted. If a user is on page 2 (offset=20) and 5 new posts appear, offset=20 now returns some posts they already saw. Cursor-based pagination uses a stable reference point (e.g., last post's score or timestamp) that is unaffected by new inserts.

    **Q: Should post publishing be synchronous or asynchronous?**
    Hybrid: persist the post synchronously (so the author sees it immediately), then fan-out to followers asynchronously via a message queue. The author doesn't need to wait for all 200 followers' feed caches to update before getting a "post published" response.

    **Q: How do you estimate media storage costs?**
    At 300 TB/day of new media, annual storage is ~110 PB. S3 Standard costs ~$0.023/GB. 110 PB = $2.5M/year in storage alone. This drives lifecycle policies: move old media to S3 Infrequent Access (60 days) → Glacier (1 year). Video transcoding and CDN egress are the bigger cost drivers in practice.
