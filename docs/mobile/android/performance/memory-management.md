# Memory Management

## Memory Areas

- **Heap**: Each app has its own process with its own ART/Dalvik instance and heap. Objects and arrays are allocated here.
- **Stack**: Each thread has its own call stack. Stores local variables, function call info, primitive types, and memory addresses. Follows LIFO order.
- **Native Heap**: Native C/C++ code allocates memory here.
- **Method Area (PermGen/Metaspace)**: Stores class structures and static variables. Shared among apps and managed by JVM. The `OutOfMemoryError` class is preloaded here.

!!! warning "Reference Retention"
    Any object reference held by the app will not be released until the app explicitly clears it.

!!! tip "onTrimMemory()"
    Callback invoked when the app moves to the background, providing a memory pressure level. Use this as the place to clear caches and release resources.

---

## OOM Error

Occurs when the system cannot allocate memory from the heap. The line where OOM is thrown may not be the actual cause -- a previous leak elsewhere can be the root issue.

!!! note "OutOfMemoryError Preloading"
    The `OutOfMemoryError` class is preloaded at startup in PermGen/Metaspace. When the heap is full, the existing instance is thrown (no new allocation needed).

**How to avoid OOM:**

- Do **not** use `android:largeHeap="true"` -- it increases GC time and causes lag.
- Instead, use `android:process` to run components in a separate process with dedicated memory.
- Avoid nesting views excessively.
- Avoid memory leaks.
- Release unused resources promptly.
- Modularize code.
- Use lazy initialization.

---

## Memory Leaks

A memory leak is the failure to release objects that are no longer needed.

**Two categories:**

| Type | Duration |
|------|----------|
| Permanent | Persists until the app terminates |
| Temporary | Persists until the method terminates |

Memory leaks occur when objects that should be eligible for GC still have something holding a reference to them. They cause performance issues, crashes, and ANR.

---

## How to Avoid Memory Leaks

- **Use Lifecycle-Aware Components**: `LiveData`, `Flow` with `collectAsStateWithLifecycle`
- **Avoid holding context references**: Never store an Activity context in singletons
- **Unregister listeners and callbacks** when no longer needed
- **Use `WeakReference`** where appropriate
- **Use LeakCanary and Memory Profiler** (dump heap to analyze)
- **Close resources**: file streams, cursors, database connections

---

## Why App Lags

!!! info "GC Pauses"
    When GC runs, the app is paused. Too many object allocations lead to more frequent GC, which causes lag.

!!! info "Main Thread Blocking"
    Long work on the main thread causes frame drops. At 60 FPS, each frame must complete within **16ms**. Exceeding 16ms means a dropped frame.

**How to avoid lag:**

- Use `lazy` initialization
- Avoid autoboxing (`Integer` vs `Int`)
- Use `const val` for compile-time constants (inlined by the compiler)

---

## App Performance

### Key Metrics

- FPS
- CPU usage
- Memory usage
- Disk I/O
- Network traffic

!!! note "Choreographer"
    The `Choreographer` class handles UI drawing internally in Android.

??? question "Can we force GC?"
    No. `System.gc()` is only a **suggestion** to the runtime. There is no guarantee it will trigger garbage collection.

### Security Measures

- Use obfuscation (ProGuard/R8)
- Investigate third-party libraries
- Encrypt keys and API communication
- Use OAuth 2.0
- Do not log sensitive information
- Avoid hardcoded secrets

### Performance Improvement Checklist

- **Optimize layouts**: Use `ConstraintLayout`, `ViewStub` for deferred inflation
- **Memory management**: Use Profiler and LeakCanary
- **Optimize bitmaps**: Downsampling, WebP format, `BitmapPool`, Glide
- **Reduce startup time**: Lazy initialization
- **Code shrinking**: ProGuard / R8
- **Connection pooling**: Reuse network connections
- **RecyclerView**: Efficient list rendering
- **Coroutines**: Offload work from the main thread
