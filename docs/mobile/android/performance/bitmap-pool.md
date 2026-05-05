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

### Downsampling

Glide checks the target `ImageView` size (e.g., 400x400). If the source image is larger (e.g., 2000x2000), Glide reduces it to match the view dimensions before storing in memory. This prevents loading unnecessarily large bitmaps.
