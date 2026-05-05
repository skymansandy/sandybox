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
