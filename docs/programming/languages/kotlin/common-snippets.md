# Kotlin Common Snippets

---

A collection of practical, production-ready Kotlin snippets that Android developers reach for daily. Each snippet is self-contained and copy-paste-ready.

## String Extensions

### Email & URL Validation

```kotlin
fun String.isValidEmail(): Boolean =
    android.util.Patterns.EMAIL_ADDRESS.matcher(this).matches()

fun String.isValidUrl(): Boolean =
    android.util.Patterns.WEB_URL.matcher(this).matches()

fun String.isValidPhone(): Boolean =
    android.util.Patterns.PHONE.matcher(this).matches()
```

### Formatting Helpers

```kotlin
fun String.capitalizeWords(): String =
    split(" ").joinToString(" ") { word ->
        word.replaceFirstChar { it.uppercaseChar() }
    }

fun String.toSlug(): String =
    lowercase()
        .replace(Regex("[^a-z0-9\\s-]"), "")
        .replace(Regex("[\\s-]+"), "-")
        .trim('-')

fun String.truncate(maxLength: Int, suffix: String = "..."): String =
    if (length <= maxLength) this
    else take(maxLength - suffix.length) + suffix

fun String.initials(limit: Int = 2): String =
    split(" ")
        .filter { it.isNotBlank() }
        .take(limit)
        .map { it.first().uppercaseChar() }
        .joinToString("")
```

### Masking

```kotlin
fun String.maskEmail(): String {
    val parts = split("@")
    if (parts.size != 2) return this
    val name = parts[0]
    val masked = name.take(2) + "*".repeat((name.length - 2).coerceAtLeast(0))
    return "$masked@${parts[1]}"
}

fun String.maskPhone(visibleLast: Int = 4): String {
    val digits = filter { it.isDigit() }
    if (digits.length <= visibleLast) return this
    return "*".repeat(digits.length - visibleLast) + digits.takeLast(visibleLast)
}

fun String.maskCreditCard(): String {
    val digits = filter { it.isDigit() }
    if (digits.length < 4) return this
    return "**** **** **** ${digits.takeLast(4)}"
}
```

## Date & Time Utilities

### Time Ago

```kotlin
fun Long.toTimeAgo(): String {
    val now = System.currentTimeMillis()
    val diff = now - this

    val seconds = diff / 1000
    val minutes = seconds / 60
    val hours = minutes / 60
    val days = hours / 24
    val weeks = days / 7
    val months = days / 30
    val years = days / 365

    return when {
        seconds < 60 -> "just now"
        minutes < 60 -> "${minutes}m ago"
        hours < 24 -> "${hours}h ago"
        days < 7 -> "${days}d ago"
        weeks < 4 -> "${weeks}w ago"
        months < 12 -> "${months}mo ago"
        else -> "${years}y ago"
    }
}

// Usage
val timestamp = 1716508800000L
println(timestamp.toTimeAgo()) // "3d ago"
```

### Date Formatting

```kotlin
import java.time.*
import java.time.format.DateTimeFormatter

fun Long.toFormattedDate(
    pattern: String = "MMM dd, yyyy",
    zone: ZoneId = ZoneId.systemDefault()
): String {
    val instant = Instant.ofEpochMilli(this)
    val formatter = DateTimeFormatter.ofPattern(pattern)
    return instant.atZone(zone).format(formatter)
}

fun Long.toRelativeDate(): String {
    val now = LocalDate.now()
    val date = Instant.ofEpochMilli(this)
        .atZone(ZoneId.systemDefault())
        .toLocalDate()

    return when {
        date == now -> "Today"
        date == now.minusDays(1) -> "Yesterday"
        date == now.plusDays(1) -> "Tomorrow"
        date.year == now.year -> toFormattedDate("MMM dd")
        else -> toFormattedDate("MMM dd, yyyy")
    }
}
```

### Duration Formatting

```kotlin
fun Long.toReadableDuration(): String {
    val totalSeconds = this / 1000
    val hours = totalSeconds / 3600
    val minutes = (totalSeconds % 3600) / 60
    val seconds = totalSeconds % 60

    return buildString {
        if (hours > 0) append("${hours}h ")
        if (minutes > 0) append("${minutes}m ")
        if (seconds > 0 || isEmpty()) append("${seconds}s")
    }.trim()
}

// 3_661_000L.toReadableDuration() → "1h 1m 1s"
```

## Number Formatting

```kotlin
import java.text.NumberFormat
import java.util.Locale

fun Long.toCompactCount(): String = when {
    this < 1_000 -> "$this"
    this < 1_000_000 -> "${this / 1_000}K"
    this < 1_000_000_000 -> String.format("%.1fM", this / 1_000_000.0)
    else -> String.format("%.1fB", this / 1_000_000_000.0)
}

fun Double.toCurrency(
    locale: Locale = Locale.US,
    currencyCode: String = "USD"
): String {
    val format = NumberFormat.getCurrencyInstance(locale)
    format.currency = java.util.Currency.getInstance(currencyCode)
    return format.format(this)
}

fun Long.toFileSize(): String {
    val units = arrayOf("B", "KB", "MB", "GB", "TB")
    var size = this.toDouble()
    var unitIndex = 0
    while (size >= 1024 && unitIndex < units.lastIndex) {
        size /= 1024
        unitIndex++
    }
    return if (unitIndex == 0) "$this B"
    else String.format("%.1f %s", size, units[unitIndex])
}

// 1_234_567L.toCompactCount() → "1K"
// 49.99.toCurrency()            → "$49.99"
// 1_536_000L.toFileSize()       → "1.5 MB"
```

## Collection Extensions

```kotlin
fun <T> List<T>.safeSubList(fromIndex: Int, toIndex: Int): List<T> =
    subList(fromIndex.coerceAtLeast(0), toIndex.coerceAtMost(size))

inline fun <T> List<T>.indexOfFirstOrNull(predicate: (T) -> Boolean): Int? =
    indexOfFirst(predicate).takeIf { it != -1 }

fun <T> List<T>.toPairs(): List<Pair<T, T>> =
    chunked(2).filter { it.size == 2 }.map { it[0] to it[1] }

fun <T> List<T>.replace(old: T, new: T): List<T> =
    map { if (it == old) new else it }

inline fun <T> List<T>.replaceFirst(
    predicate: (T) -> Boolean,
    transform: (T) -> T
): List<T> {
    val index = indexOfFirst(predicate)
    if (index == -1) return this
    return toMutableList().apply { set(index, transform(get(index))) }
}

fun <K, V> Map<K, V>.mergeWith(other: Map<K, V>): Map<K, V> =
    toMutableMap().apply { putAll(other) }
```

## Result & Error Handling

### Typed Result Wrapper

```kotlin
sealed interface Result<out T> {
    data class Success<T>(val data: T) : Result<T>
    data class Error(
        val message: String,
        val cause: Throwable? = null
    ) : Result<Nothing>

    fun getOrNull(): T? = (this as? Success)?.data

    fun <R> map(transform: (T) -> R): Result<R> = when (this) {
        is Success -> Success(transform(data))
        is Error -> this
    }

    fun onSuccess(action: (T) -> Unit): Result<T> {
        if (this is Success) action(data)
        return this
    }

    fun onError(action: (String, Throwable?) -> Unit): Result<T> {
        if (this is Error) action(message, cause)
        return this
    }
}

inline fun <T> runCatching(block: () -> T): Result<T> =
    try {
        Result.Success(block())
    } catch (e: Exception) {
        Result.Error(e.message ?: "Unknown error", e)
    }
```

### Retry with Backoff

```kotlin
suspend fun <T> retryWithBackoff(
    times: Int = 3,
    initialDelay: Long = 100,
    maxDelay: Long = 1000,
    factor: Double = 2.0,
    block: suspend () -> T
): T {
    var currentDelay = initialDelay
    repeat(times - 1) {
        try {
            return block()
        } catch (e: Exception) {
            kotlinx.coroutines.delay(currentDelay)
            currentDelay = (currentDelay * factor).toLong().coerceAtMost(maxDelay)
        }
    }
    return block()
}

// Usage
val data = retryWithBackoff(times = 3) {
    api.fetchUser(userId)
}
```

## SharedPreferences Delegate

```kotlin
import android.content.SharedPreferences
import kotlin.properties.ReadWriteProperty
import kotlin.reflect.KProperty

class SharedPrefDelegate<T>(
    private val prefs: SharedPreferences,
    private val key: String,
    private val defaultValue: T
) : ReadWriteProperty<Any?, T> {

    @Suppress("UNCHECKED_CAST")
    override fun getValue(thisRef: Any?, property: KProperty<*>): T =
        with(prefs) {
            when (defaultValue) {
                is Boolean -> getBoolean(key, defaultValue)
                is Int -> getInt(key, defaultValue)
                is Long -> getLong(key, defaultValue)
                is Float -> getFloat(key, defaultValue)
                is String -> getString(key, defaultValue)
                is Set<*> -> getStringSet(key, defaultValue as Set<String>)
                else -> throw IllegalArgumentException("Unsupported type")
            } as T
        }

    override fun setValue(thisRef: Any?, property: KProperty<*>, value: T) {
        prefs.edit().apply {
            when (value) {
                is Boolean -> putBoolean(key, value)
                is Int -> putInt(key, value)
                is Long -> putLong(key, value)
                is Float -> putFloat(key, value)
                is String -> putString(key, value)
                is Set<*> -> putStringSet(key, value.map { it.toString() }.toSet())
                else -> throw IllegalArgumentException("Unsupported type")
            }
            apply()
        }
    }
}

fun <T> SharedPreferences.delegate(key: String, default: T) =
    SharedPrefDelegate(this, key, default)

// Usage
class UserPrefs(prefs: SharedPreferences) {
    var darkMode by prefs.delegate("dark_mode", false)
    var username by prefs.delegate("username", "")
    var loginCount by prefs.delegate("login_count", 0)
}
```

## Coroutine Utilities

### Debounce & Throttle

```kotlin
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.*

fun <T> Flow<T>.debounce(timeoutMillis: Long): Flow<T> =
    this.debounce(timeoutMillis)

fun <T> throttleFirst(
    intervalMs: Long,
    coroutineScope: CoroutineScope,
    action: (T) -> Unit
): (T) -> Unit {
    var lastTime = 0L
    return { param: T ->
        val now = System.currentTimeMillis()
        if (now - lastTime >= intervalMs) {
            lastTime = now
            action(param)
        }
    }
}
```

### Safe Launch

```kotlin
fun CoroutineScope.safeLaunch(
    onError: (Throwable) -> Unit = {},
    block: suspend CoroutineScope.() -> Unit
): Job = launch(
    CoroutineExceptionHandler { _, throwable -> onError(throwable) }
) { block() }

// Usage
viewModelScope.safeLaunch(
    onError = { e -> _error.value = e.message }
) {
    val user = repository.fetchUser()
    _state.value = UiState.Success(user)
}
```

## Context & Resource Extensions

```kotlin
import android.content.*
import android.net.Uri
import android.widget.Toast
import androidx.core.content.ContextCompat

fun Context.toast(message: String, long: Boolean = false) {
    Toast.makeText(
        this,
        message,
        if (long) Toast.LENGTH_LONG else Toast.LENGTH_SHORT
    ).show()
}

fun Context.copyToClipboard(text: String, label: String = "Copied") {
    val clipboard = getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
    clipboard.setPrimaryClip(ClipData.newPlainText(label, text))
}

fun Context.openUrl(url: String) {
    startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)))
}

fun Context.share(text: String, subject: String? = null) {
    val intent = Intent(Intent.ACTION_SEND).apply {
        type = "text/plain"
        putExtra(Intent.EXTRA_TEXT, text)
        subject?.let { putExtra(Intent.EXTRA_SUBJECT, it) }
    }
    startActivity(Intent.createChooser(intent, null))
}

fun Context.dpToPx(dp: Float): Float =
    dp * resources.displayMetrics.density

fun Context.pxToDp(px: Float): Float =
    px / resources.displayMetrics.density
```

## JSON Parsing Helpers

```kotlin
import kotlinx.serialization.json.*

fun JsonObject.getStringOrNull(key: String): String? =
    this[key]?.jsonPrimitive?.contentOrNull

fun JsonObject.getIntOrNull(key: String): Int? =
    this[key]?.jsonPrimitive?.intOrNull

fun JsonObject.getBooleanOrDefault(key: String, default: Boolean = false): Boolean =
    this[key]?.jsonPrimitive?.booleanOrNull ?: default

fun JsonObject.getNestedObject(vararg keys: String): JsonObject? {
    var current: JsonObject = this
    for (key in keys) {
        current = current[key]?.jsonObject ?: return null
    }
    return current
}
```

## Logging Utilities

```kotlin
import android.util.Log

inline fun <reified T> T.logd(message: () -> String) {
    if (BuildConfig.DEBUG) {
        Log.d(T::class.java.simpleName, message())
    }
}

inline fun <reified T> T.loge(message: () -> String, throwable: Throwable? = null) {
    Log.e(T::class.java.simpleName, message(), throwable)
}

// Usage
class UserRepository {
    fun fetchUser() {
        logd { "Fetching user data..." }
    }
}
```

??? question "Common Interview Questions"

    **Q: Why use extension functions instead of utility classes?**

    Extension functions provide discoverability through IDE autocomplete, read more naturally (`"hello".capitalizeWords()` vs `StringUtils.capitalizeWords("hello")`), and can be scoped to specific files or modules. They don't pollute the class itself — they're resolved statically at compile time.

    **Q: What's the difference between `inline` and regular extension functions?**

    `inline` functions are copied at the call site, avoiding the overhead of lambda object allocation. Use `inline` when the function takes a lambda parameter (like `replaceFirst` above). For simple property-style extensions, `inline` adds no benefit.

    **Q: Why use property delegates for SharedPreferences?**

    Delegates encapsulate the get/set boilerplate, provide type safety, and make preferences look like regular properties. The `by` keyword signals to readers that access is delegated. This pattern also centralizes the preference key strings, reducing typo bugs.

    **Q: When should you use `sealed interface` vs `sealed class` for Result types?**

    `sealed interface` allows implementing classes to extend other classes (since Kotlin supports multiple interface inheritance). `sealed class` is better when you need shared state or a common constructor. For pure type hierarchies like `Result`, `sealed interface` is preferred.

    **Q: How does `retryWithBackoff` prevent thundering herd?**

    Exponential backoff with a factor (e.g., 2.0) spaces out retries progressively. Add jitter (`currentDelay + Random.nextLong(0, currentDelay / 2)`) to prevent synchronized retries from multiple clients hitting the server simultaneously.

!!! tip "Further Reading"
    - [Kotlin Extensions Best Practices](https://kotlinlang.org/docs/extensions.html)
    - [kotlinx.serialization Guide](https://github.com/Kotlin/kotlinx.serialization/blob/master/docs/serialization-guide.md)
    - [Kotlin Delegated Properties](https://kotlinlang.org/docs/delegated-properties.html)
    - [Coroutine Exception Handling](https://kotlinlang.org/docs/exception-handling.html)
