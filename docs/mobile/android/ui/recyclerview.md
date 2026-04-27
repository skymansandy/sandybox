# RecyclerView Internals

---

## 4 Major Components

| Component | Role |
|---|---|
| **Adapter** | Holds the data list and binds data to the ViewHolder |
| **LayoutManager** | Positions items on screen (Linear, Grid, StaggeredGrid) |
| **ItemAnimator** | Handles add, remove, and move animations |
| **ViewHolder** | Holds the display view reference |

---

## Two Types of Caching

=== "Scrap View"

    A view that was **just detached** from the RecyclerView. The data is still valid — `onBindViewHolder()` is **NOT** called.

=== "Recycled View Pool"

    A view taken from scrap that is now considered a **dirty view**. The data is stale — `onBindViewHolder()` **WILL** be called to rebind fresh data.

---

## Multiple Nested RecyclerViews — Common Pool

When you have the same view type across multiple nested RecyclerViews (e.g., horizontal lists inside a vertical list), share a `RecycledViewPool` to avoid creating redundant ViewHolders.

```kotlin
class OuterRecyclerViewAdapter(
    private val items: List<List<Item>>
) : RecyclerView.Adapter<OuterViewHolder>() {

    private val viewPool = RecyclerView.RecycledViewPool()

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): OuterViewHolder {
        val view = LayoutInflater.from(parent.context)
            .inflate(R.layout.item_outer, parent, false)
        return OuterViewHolder(view)
    }

    override fun onBindViewHolder(holder: OuterViewHolder, position: Int) {
        val innerAdapter = InnerRecyclerViewAdapter(items[position])
        holder.innerRecyclerView.apply {
            adapter = innerAdapter
            setRecycledViewPool(viewPool) // share pool across inner RVs
        }
    }

    override fun getItemCount(): Int = items.size
}
```

---

## ViewHolder Design Pattern

!!! tip "Why ViewHolder?"
    `findViewById()` traverses the entire view hierarchy — a deep hierarchy causes significant performance issues. The ViewHolder pattern holds direct references to views, avoiding repeated `findViewById()` calls.

- Speeds up rendering by caching view references.
- Each ViewHolder is created once in `onCreateViewHolder()` and reused via `onBindViewHolder()`.
- Without ViewHolder, every bind would call `findViewById()`, traversing the view tree each time.
