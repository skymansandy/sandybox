# Pagination

## Offset Pagination

Uses `pageNum` and `limit` (number of items per page).

```
Offset = (pageNum - 1) * limit
```

??? example "Calculation Examples"

    | pageNum | limit | Offset | Items returned |
    |---------|-------|--------|---------------|
    | 3 | 10 | 20 | 21 -- 30 |
    | 4 | 20 | 60 | 61 -- 80 |

!!! tip "Best for static datasets"

    Offset pagination works well when the underlying data does not change frequently.

!!! warning "Problem with dynamic data"

    In feeds like Instagram where new posts are constantly added, offset pagination can return **duplicate items** because the offset shifts as new data is inserted.

---

## Cursor Pagination

Uses a `cursor` (an identifier marking a specific item) and `limit`.

- For reliability with dynamic datasets, the cursor value should be based on a **sorted** field.
- More resilient to insertions and deletions between pages.

### Keyset Pagination

A form of cursor pagination where you decide a **key** (e.g., `timestamp` or `created_at`):

- The backend returns a cursor (often an encoded ID).
- The pagination logic is **abstracted** from the client -- the client just passes the cursor back.

```
GET /posts?cursor=eyJpZCI6MTAwfQ==&limit=20
```

!!! note "Cursor vs Offset"

    | Feature | Offset | Cursor |
    |---------|--------|--------|
    | Implementation | Simple | More complex |
    | Dynamic data | Duplicates possible | Reliable |
    | Random page access | Yes (`?page=5`) | No (sequential only) |
    | Performance on large datasets | Slower (DB scans offset rows) | Faster (seeks directly) |

---

## Interview Q&A

??? question "What is the difference between offset pagination and cursor pagination?"
    Offset pagination uses a page number and limit to calculate a fixed offset into the dataset. Cursor pagination uses a pointer (cursor) to a specific item and fetches the next batch from that point. Cursor pagination is more resilient to insertions and deletions in dynamic datasets, while offset pagination supports random page access.

??? question "Why can offset pagination return duplicate items in dynamic feeds?"
    When new items are inserted at the top of a feed (e.g., new posts on Instagram), the offset shifts. A user who was on page 2 may see items that shifted from page 1 into page 2's range, resulting in duplicates. Cursor pagination avoids this by anchoring to a specific item rather than a numeric position.

??? question "What is keyset pagination and how does it differ from generic cursor pagination?"
    Keyset pagination is a form of cursor pagination where the cursor is based on a sorted field like `timestamp` or `created_at`. The backend encodes the last seen key into a cursor token that the client passes back for the next page. This allows the database to seek directly to the correct position instead of scanning offset rows, providing better performance on large datasets.

??? question "When would you choose offset pagination over cursor pagination?"
    Choose offset pagination when the dataset is relatively static, when you need random page access (e.g., "jump to page 5"), or when simplicity is more important than handling concurrent data changes. It is also easier to implement on both client and server sides.

!!! tip "Further Reading"
    - [Paging library overview - Android Developers](https://developer.android.com/topic/libraries/architecture/paging/v3-overview)
    - [Load and display paged data - Android Developers](https://developer.android.com/topic/libraries/architecture/paging/v3-paged-data)
    - [Paginating Real-Time Data with Firestore](https://firebase.google.com/docs/firestore/query-data/query-cursors)
