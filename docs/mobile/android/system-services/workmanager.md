# WorkManager

**WorkManager** is the recommended solution for scheduling deferrable, asynchronous tasks that must run reliably, even if the app exits or the device restarts.

## Core Components

### Worker

Extend the `Worker` class and override `doWork()`. Return a `Result` to indicate the outcome.

```kotlin
class UploadWorker(
    context: Context,
    params: WorkerParameters
) : Worker(context, params) {

    override fun doWork(): Result {
        val data = inputData.getString("file_path") ?: return Result.failure()

        return try {
            uploadFile(data)
            Result.success()
        } catch (e: Exception) {
            Result.retry()
        }
    }
}
```

| Result | Behavior |
|---|---|
| `Result.success()` | Work completed successfully |
| `Result.retry()` | Work should be retried later |
| `Result.failure()` | Work failed permanently |

### CoroutineWorker

For coroutine-based work, extend `CoroutineWorker` instead. The `doWork()` function is a `suspend` function.

```kotlin
class UploadCoroutineWorker(
    context: Context,
    params: WorkerParameters
) : CoroutineWorker(context, params) {

    override suspend fun doWork(): Result {
        return withContext(Dispatchers.IO) {
            try {
                uploadFile()
                Result.success()
            } catch (e: Exception) {
                Result.retry()
            }
        }
    }
}
```

### Constraints

Define conditions that must be met before the work runs.

```kotlin
val constraints = Constraints.Builder()
    .setRequiredNetworkType(NetworkType.UNMETERED)   // Wi-Fi
    .setRequiresBatteryNotLow(true)
    .setRequiresCharging(true)
    .setRequiresDeviceIdle(true)
    .setRequiresStorageNotLow(true)
    .build()
```

### WorkRequest

=== "OneTimeWorkRequest"

    ```kotlin
    val uploadWork = OneTimeWorkRequestBuilder<UploadWorker>()
        .setConstraints(constraints)
        .setInputData(workDataOf("file_path" to "/storage/file.txt"))
        .addTag("upload")
        .build()

    WorkManager.getInstance(context).enqueue(uploadWork)
    ```

=== "PeriodicWorkRequest"

    ```kotlin
    val syncWork = PeriodicWorkRequestBuilder<SyncWorker>(
        1, TimeUnit.HOURS   // Minimum interval: 15 minutes
    )
        .setConstraints(constraints)
        .build()

    WorkManager.getInstance(context).enqueue(syncWork)
    ```

### Chaining Work

Chain multiple work requests to run in **sequence** or **parallel**.

```kotlin
WorkManager.getInstance(context)
    // Run these two in parallel
    .beginWith(listOf(downloadWork1, downloadWork2))
    // Then run this after both complete
    .then(processWork)
    // Then run this last
    .then(uploadWork)
    .enqueue()
```

### Cancel Work

```kotlin
WorkManager.getInstance(context).cancelAllWorkByTag("upload")
WorkManager.getInstance(context).cancelWorkById(uploadWork.id)
```

## Guaranteed Execution

!!! note "How it works"
    WorkManager uses a **local database** to persist scheduled work. This means:

    - Work survives **device restarts**
    - Work runs even after the app is **closed, updated, or reinstalled**
    - You must **cancel explicitly** if you no longer need the work

## WorkInfo & Observing State

Get output data and observe the state of work.

```
BLOCKED → ENQUEUED → RUNNING → SUCCEEDED / FAILED / CANCELLED
```

```kotlin
// Observe work status
WorkManager.getInstance(context)
    .getWorkInfosByTagLiveData("upload")
    .observe(this) { workInfoList ->
        workInfoList.forEach { workInfo ->
            when (workInfo.state) {
                WorkInfo.State.SUCCEEDED -> {
                    val result = workInfo.outputData.getString("result_key")
                    Log.d("WorkManager", "Success: $result")
                }
                WorkInfo.State.FAILED -> {
                    Log.d("WorkManager", "Work failed")
                }
                WorkInfo.State.RUNNING -> {
                    Log.d("WorkManager", "Work in progress...")
                }
                else -> {}
            }
        }
    }
```

!!! tip
    Use `setOutputData()` inside your Worker's `Result.success(outputData)` to pass data back to the observer.
