# Logging Strategies

## Android Log Levels

| Level | Method | Use Case |
|-------|--------|----------|
| **VERBOSE** | `Log.v()` | Fine-grained tracing (never in production) |
| **DEBUG** | `Log.d()` | Development diagnostics |
| **INFO** | `Log.i()` | Notable runtime events (lifecycle, config changes) |
| **WARN** | `Log.w()` | Recoverable issues, deprecated usage |
| **ERROR** | `Log.e()` | Failures that need attention |
| **ASSERT** | `Log.wtf()` | Should-never-happen conditions |

!!! warning "Never log sensitive data"
    PII, tokens, passwords, and financial data must never appear in logs — even at DEBUG level. Logs can be read via `adb logcat` on debuggable builds and may persist on device.

---

## Timber

Timber is the de facto logging library for Android. It wraps `android.util.Log` with automatic tag generation and pluggable log destinations (Trees).

### Setup

```kotlin
class App : Application() {
    override fun onCreate() {
        super.onCreate()
        if (BuildConfig.DEBUG) {
            Timber.plant(Timber.DebugTree())
        } else {
            Timber.plant(CrashReportingTree())
        }
    }
}
```

### Custom Tree for Production

```kotlin
class CrashReportingTree : Timber.Tree() {
    override fun log(priority: Int, tag: String?, message: String, t: Throwable?) {
        if (priority < Log.WARN) return // Only capture WARN+

        Firebase.crashlytics.log("[$tag] $message")

        t?.let { Firebase.crashlytics.recordException(it) }
    }
}
```

### Usage

```kotlin
// Tag is auto-generated from the calling class name
Timber.d("User loaded: id=%s", userId)
Timber.w(exception, "Failed to parse response, using cache")
Timber.e(exception, "Payment failed for order %s", orderId)
```

| Feature | `android.util.Log` | Timber |
|---------|-------------------|--------|
| Auto-tagging | No — manual tag string | Yes — class name |
| Production stripping | Manual if-checks | Plant no DebugTree |
| Multiple destinations | No | Multiple Trees |
| Format strings | No | Yes (`%s`, `%d`) |
| Crash integration | Manual | Custom Tree |

---

## Structured Logging

Structured logs use key-value pairs instead of free-form strings. They're searchable and parseable by log aggregation tools.

```kotlin
// Unstructured (bad for querying)
Timber.i("User 12345 purchased item SKU-789 for $29.99")

// Structured (queryable)
Timber.i(
    buildJsonLog(
        "event" to "purchase",
        "user_id" to "12345",
        "sku" to "SKU-789",
        "amount" to 29.99,
        "currency" to "USD"
    )
)

private fun buildJsonLog(vararg pairs: Pair<String, Any>): String {
    return JSONObject().apply {
        pairs.forEach { (k, v) -> put(k, v) }
    }.toString()
}
```

---

## Remote Logging

For production diagnostics, logs need to reach a remote system without impacting app performance.

```mermaid
flowchart LR
    APP[App] -->|"Write"| BUFFER[In-Memory Buffer]
    BUFFER -->|"Batch flush<br/>every 30s or 50 entries"| DISK[Local File]
    DISK -->|"Upload on WiFi<br/>or idle"| SERVER[Log Server]
```

### Implementation Considerations

| Concern | Strategy |
|---------|----------|
| **Battery** | Batch writes, upload on WiFi/charging only |
| **Storage** | Cap log file size (e.g., 5MB rolling), delete after upload |
| **Privacy** | Scrub PII before writing, hash user identifiers |
| **Reliability** | Write to disk first, upload async — survives crashes |
| **Sampling** | Log 100% for errors, sample 10% for info-level in production |

### Log Sampling

```kotlin
class SampledTree(private val sampleRate: Float = 0.1f) : Timber.Tree() {
    override fun log(priority: Int, tag: String?, message: String, t: Throwable?) {
        // Always log errors, sample everything else
        if (priority >= Log.ERROR || Random.nextFloat() < sampleRate) {
            remoteLogger.send(priority, tag, message, t)
        }
    }
}
```

---

## ProGuard & Log Stripping

Remove log calls from release builds to avoid leaking information and reduce APK size:

```proguard
# Remove all Timber debug/verbose logs in release
-assumenosideeffects class timber.log.Timber {
    public static void d(...);
    public static void v(...);
}

# Remove Android Log class calls
-assumenosideeffects class android.util.Log {
    public static int d(...);
    public static int v(...);
}
```

!!! note "assumenosideeffects"
    This ProGuard rule assumes the method has no side effects and removes calls entirely during optimization. Only use with logging methods — applying to methods with actual side effects causes bugs.

---

## Logcat Best Practices

| Practice | Why |
|----------|-----|
| Use consistent tag prefixes | Easy filtering: `adb logcat -s MyApp:*` |
| Include correlation IDs | Trace a request across layers |
| Log state transitions | Understand lifecycle without breakpoints |
| Avoid logging in tight loops | Fills logcat buffer, causes I/O thrashing |
| Use `%s` format args (Timber) | Avoids string concatenation when log is disabled |

---

??? question "Common Interview Questions"

    **Q: Why use Timber over android.util.Log?**
    Timber provides automatic tagging from the class name, format string support, the ability to plant different Trees for debug vs release builds, and easy integration with crash reporting. It eliminates the need for manual TAG constants and if-DEBUG checks scattered throughout the codebase.

    **Q: How do you prevent sensitive data from appearing in logs?**
    1. Use ProGuard's `assumenosideeffects` to strip debug/verbose logs from release builds.
    2. Implement a custom Timber Tree that scrubs known PII patterns (emails, phone numbers).
    3. Never log request/response bodies that may contain tokens or credentials.
    4. Use hashed identifiers instead of raw user IDs.
    5. Code review with a focus on log statements.

    **Q: How would you implement remote logging without impacting app performance?**
    Buffer logs in memory, flush to local disk in batches (every N entries or T seconds), then upload to the server opportunistically (on WiFi, when idle, using WorkManager). This ensures no network I/O on the logging path, logs survive crashes (persisted to disk), and uploads respect battery/data constraints.

    **Q: What log level should production builds use?**
    WARN and above — errors and warnings indicate actionable issues. INFO can be included with sampling. DEBUG and VERBOSE should be completely stripped from release builds via ProGuard rules.

!!! tip "Further Reading"
    - [Timber GitHub](https://github.com/JakeWharton/timber)
    - [Android logging best practices](https://developer.android.com/studio/debug/logcat)
