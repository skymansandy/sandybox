# Kotlin Coroutines

A framework to manage concurrency in a more performant and simple way with its lightweight thread written on top of the actual threading framework, taking advantage of the cooperative nature of functions.

---

## withContext

A **suspend function** (not a coroutine) that blocks the coroutine until completed, even when executed on another thread.

---

## lifecycleScope and viewModelScope

- **lifecycleScope**: Internally uses `Dispatchers.Main.immediate` and a supervisor job.
- **viewModelScope**: Internally uses `Dispatchers.Main.immediate` and a supervisor job.

---

## Error Handling

!!! warning "Scope Cancellation"
    `CoroutineScope` gets **canceled forever** if an error occurs inside the scope and is not caught in a try-catch. If an exception handler is passed and the error is caught in the handler, the app won't crash but the scope is still canceled forever.

- **launch block**: Error crashes the app.
- **async block**: Holds the error in `Deferred`, throws on `await()`. Handle by wrapping `await()` in try-catch.

---

## launch vs async

| Feature | `launch` | `async` |
|---|---|---|
| Returns | `Job` | `Deferred<T>` |
| Result | No result value | Call `await()` for result |

---

## CoroutineScope vs SupervisorScope

| Behavior | `coroutineScope` | `supervisorScope` |
|---|---|---|
| On child failure | Cancels **all** children | Continues **other** children |

---

## Dispatchers

=== "Dispatchers.Default"

    Heavy computation tasks (e.g., image processing). Uses fewer threads (up to core pool size).

    CPU intensive = more CPU used. More threads than CPU cores leads to more context switching.

=== "Dispatchers.IO"

    Networking, reading, writing, database operations. Uses more threads (max of 64 or number of cores, whichever is greater).

    IO tasks mostly wait for a response, not CPU intensive. Shares pool with `Default` but creates more threads when needed.

=== "Dispatchers.Main"

    UI tasks (only the main thread).

    - `Main.immediate` runs immediately on the main thread.
    - `Main` posts to the main queue.

=== "Dispatchers.Unconfined"

    Runs in the caller thread until the first suspension point. After suspension, it can run on any thread.

---

## Other Concepts

### GlobalScope

!!! warning
    Not bound to any job. Risk of **memory leak**. Uses `Dispatchers.Default`.

### CoroutineScope and CoroutineContext

`CoroutineScope` has a `CoroutineContext` which contains the job and dispatcher.

### runBlocking

Blocks the current thread until all coroutines inside complete.

### Cooperative Cancellation (isActive)

A continuously running job can't be cancelled unless a suspend function is called or the code checks `job.isActive`.

### How Suspend Works

Suspend breaks code apart and adds a `Continuation` callback that gets invoked when the suspend function is done.

```kotlin
interface Continuation<in T> {
    val context: CoroutineContext
    fun resume(value: T)
    fun resumeWithException(exception: Throwable)
}
```

### coroutineScope vs CoroutineScope

| | `coroutineScope` (lowercase) | `CoroutineScope` (uppercase) |
|---|---|---|
| Type | Suspend function | Class/interface |
| Behavior | Launches coroutine and **waits** for completion | Launches coroutine **independently** |

### SuspendCancellableCoroutine

Bridges callback-based APIs with coroutines.

??? example "Full Example: Bridging Callbacks with Coroutines"

    ```kotlin
    object Api {
        fun getUser(id: String, callback: (User?) -> Unit) {
            callback(User(id, "John Doe"))
        }
    }

    suspend fun fetchUser(id: String): User = suspendCancellableCoroutine { continuation ->
        Api.getUser(id) { user ->
            if (user != null) {
                continuation.resume(user)
            } else {
                continuation.resumeWithException(Exception("User not found"))
            }
        }
        continuation.invokeOnCancellation {
            println("Coroutine cancelled for user $id, cleaning up...")
        }
    }
    ```

---

## First Time Coroutine Creation

!!! tip "Startup Performance"
    Coroutine creation has a significant initialization cost, especially during app startup. It is recommended to use `ExecutorService` in `Application.onCreate` since `ExecutorService` is preloaded by Zygote.

```kotlin
class MyApplication: Application() {
    override fun onCreate() {
        Executors.newSingleThreadExecutor().execute {
            // startup work here
        }
    }
}
```
