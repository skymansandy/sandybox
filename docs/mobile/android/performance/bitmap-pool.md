# Bitmap Pool & Image Loading

## What is a Bitmap?

A Bitmap is the image format Android understands internally. It represents an image as an RGB matrix.

??? example "2x2 Pixel Example"
    A 2x2 pixel image is stored as a 2x2 matrix where each cell contains `(r, g, b)` values:

    ```
    [(r,g,b), (r,g,b)]
    [(r,g,b), (r,g,b)]
    ```

---

## How an Image is Shown

```
URL → Image downloaded (JPG/PNG) → Decoded to Bitmap → Stored in memory
→ Shown in ImageView → Deallocated when not needed
```

---

## Bitmap Pooling

!!! warning "The Problem"
    Continuous allocation and deallocation of Bitmap objects triggers the GC frequently, causing app lag.

**Bitmap pooling** solves this by reusing allocated memory instead of frequently deallocating and reallocating.

- Bitmaps available for recycling are sent to the pool based on size/config constraints.
- Acts as a "fake GC" by holding Bitmap references so the real GC is not called frequently.

---

## How Glide Works

Glide solves three major problems:

| Problem | Solution |
|---------|----------|
| OOM | Downsampling |
| Slow loading | Caching + request cancellation |
| Unresponsive UI | Bitmap pool |

### Glide's Key Components

- Memory cache
- Disk cache
- Bitmap pool
- ImageView target
- URL source
- Lifecycle awareness

### Glide Request Flow

```
URL
 └→ Glide
     └→ Check Memory Cache
         ├→ HIT: Return cached bitmap
         └→ MISS: Check Disk Cache
             ├→ HIT: Decode → return bitmap
             └→ MISS: Download from network
                 └→ Store on disk
                     └→ Decode (check bitmap pool to reuse memory)
                         └→ Downsample to target size
                             └→ Store in memory cache
                                 └→ Display in ImageView
```

!!! note "LRU Eviction"
    When the memory cache is full, least-recently-used entries are evicted **to the bitmap pool** for reuse rather than being deallocated.

---

## Interview Q&A

??? question "What is a Bitmap pool and why is it needed?"
    A Bitmap pool is a cache of pre-allocated Bitmap objects available for reuse. Without it, loading and scrolling through many images causes continuous allocation and deallocation of Bitmap memory, which triggers frequent garbage collection and visible UI jank. The pool lets the image loader reuse existing memory blocks instead of allocating new ones.

??? question "Explain Glide's caching strategy."
    Glide uses a three-tier caching strategy. First, it checks the in-memory LRU cache for an already-decoded Bitmap. On a miss, it checks the disk cache for a previously downloaded and/or transformed image. On a disk miss, it downloads from the network, stores on disk, decodes (reusing memory from the Bitmap pool), downsamples to the target ImageView size, and stores in the memory cache.

??? question "What is downsampling and why is it important for image loading?"
    Downsampling reduces an image's resolution before loading it into memory. If an ImageView is 400x400 pixels but the source image is 4000x4000, loading the full image wastes ~60MB of memory. Downsampling (via `inSampleSize` or library-managed resizing) loads only the pixels needed for the target size, dramatically reducing memory usage and preventing OOM errors.

??? question "How does Glide handle lifecycle awareness?"
    Glide ties image requests to the lifecycle of the hosting Activity or Fragment. When the Activity is paused, Glide pauses ongoing requests. When the Activity is destroyed, Glide cancels requests and clears associated resources. This prevents wasted network calls, memory leaks, and crashes from setting images on destroyed views.

---

!!! tip "Further Reading"
    - [Glide Documentation](https://bumptech.github.io/glide/)
    - [Loading large bitmaps efficiently](https://developer.android.com/topic/performance/graphics/load-bitmap)
    - [Manage bitmap memory](https://developer.android.com/topic/performance/graphics/manage-memory)
    - [Coil Image Loading Library](https://coil-kt.github.io/coil/)

### Downsampling

Glide checks the target `ImageView` size (e.g., 400x400). If the source image is larger (e.g., 2000x2000), Glide reduces it to match the view dimensions before storing in memory. This prevents loading unnecessarily large bitmaps.
