# Multithreading in Android

## Terminology

| Term | Definition |
|------|-----------|
| **Core** | Physical processing unit within CPU, independently executes instructions |
| **Process** | Running instance of application with its own memory space, file handles, and resources |
| **Thread** | Unit of execution within a process, scheduled by OS, assigned to different cores. Single-core CPUs handle multiple threads via time-sharing |
| **Thread Pool** | Pool of pre-created worker threads ready to execute tasks |
| **Task Queue** | Holds tasks waiting for idle threads |
| **Scheduling** | Assigning tasks to threads |
| **Executors** | High-level abstractions managing creation, scheduling, and execution of threads |
| **ExecutorService** | Executor with termination methods and `Future` for tracking async tasks. Can be shut down |

!!! info "Concurrency vs Parallelism"
    - **Concurrency** = overlapping time periods (possible on single-core via context switching)
    - **Parallelism** = literally at the same time (requires multi-core)

---

## Handler, Looper, MessageQueue, Runnable

### Handler

Communicates between threads by posting `Runnable`s or `Message`s to a specific thread. You pass a `Looper` to execute on a specific thread. Crashes if the target thread has no `Looper`.

```java
public class Handler {
    final Looper mLooper;
    final MessageQueue mQueue;
    final Callback mCallback;
    // Methods: post(Runnable r), postDelayed(...)
}
```

### HandlerThread

A `Thread` extension that comes with its own `Looper`. Useful for background tasks that need a message loop.

```java
public class HandlerThread extends Thread {
    Looper mLooper;

    @Override
    public void run() {
        Looper.prepare();
        Looper.loop();
    }
}
```

### Message

Contains a target handler and a runnable. Use `Message.obtain()` (pool size = 50) instead of the constructor to avoid allocations.

### Runnable

Interface representing a unit of work for a thread.

### MessageQueue

Queue of `Message` objects for a `Looper` to process.

### Looper

Tied to a specific thread, runs the message loop. Has a `MessageQueue`. Continually checks the queue and dispatches messages to the target `Handler`.

```java
public final class Looper {
    private static Looper sMainLooper;
    final MessageQueue mQueue;
    final Thread mThread;
}
```

### AsyncTask

Internally uses Handlers, Runnables, and threads. Executes work in background then posts result to UI thread.

!!! warning "Key Points"
    - A thread has **no looper by default**. Create one via `Looper.prepare()` and `Looper.loop()`.
    - Each `Looper` has a `MessageQueue`.
    - **One unique Looper per thread** (enforced via `ThreadLocal` storage).

---

## ThreadPoolExecutor

Java thread pool that manages worker threads with a task queue.

### Optimal Pool Size

```java
private static final int CPU_COUNT = Runtime.getRuntime().availableProcessors();
private static final int CORE_POOL_SIZE = CPU_COUNT + 1;
private static final int MAXIMUM_POOL_SIZE = CPU_COUNT * 2 + 1;
```

### Parameters

| Parameter | Description |
|-----------|-------------|
| `corePoolSize` | Minimum number of threads, created as tasks are added |
| `maximumPoolSize` | Max threads allowed. New workers created only if queue is full |
| `keepAliveTime` | Idle timeout for excess threads (above core pool size) |
| `unit` | Time unit for `keepAliveTime` |
| `workQueue` | `BlockingQueue<Runnable>` holding tasks waiting for execution |

!!! tip "Benefits"
    - Powerful framework for thread management
    - Supports task addition, cancellation, and prioritization
    - Reduces thread creation overhead by reusing threads

---

## Synchronization Concepts

### Volatile

Variable changes are immediately visible to all threads. Writes go to main memory, reads come from main memory.

### Synchronized

Only one thread at a time can execute the synchronized block. Variables are refreshed from main memory on enter and written back on exit.

### Atomic vs Volatile

`AtomicXXX` classes provide atomic read-write operations without explicit locking. Needed when the current write depends on the previous read (e.g., `x++` is read-then-write, not atomic).

### Mutex

Only one coroutine at a time. Non-reentrant lock.

### Semaphore

Allows a fixed number of threads to access a shared resource concurrently.

### Race Conditions

Occur when multiple threads write to a shared object simultaneously. Read-only access does **not** cause race conditions.

### Deadlock

Two or more threads are blocked forever, each waiting for the other to release a lock.
