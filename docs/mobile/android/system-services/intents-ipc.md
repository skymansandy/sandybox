# Intents, Deeplinks & IPC

## Intents

An **Intent** is a messaging object used to communicate between Android components. It carries a `Bundle` of data and can be used to start activities, services, or deliver broadcasts.

### Explicit Intent

Specifies the **exact component** to start. Used for internal navigation within an app.

```kotlin
val intent = Intent(this, DetailActivity::class.java).apply {
    putExtra("user_id", 42)
    putExtra("user_name", "Sandy")
}
startActivity(intent)
```

### Implicit Intent

Declares a **general action** to perform. The system resolves which app/component can handle it.

```kotlin
val intent = Intent(Intent.ACTION_VIEW).apply {
    data = Uri.parse("https://www.example.com")
}
startActivity(intent)
```

```kotlin
// Open dialer
val intent = Intent(Intent.ACTION_DIAL).apply {
    data = Uri.parse("tel:+1234567890")
}
startActivity(intent)
```

!!! note
    If no app can handle an implicit intent, calling `startActivity()` will crash. Use `intent.resolveActivity(packageManager)` to check first.

## Intent Filter

Declared in the manifest, an intent filter specifies the types of intents a component can respond to. It includes **actions**, **categories**, and **data types**.

```xml
<activity android:name=".ShareActivity">
    <intent-filter>
        <action android:name="android.intent.action.SEND" />
        <category android:name="android.intent.category.DEFAULT" />
        <data android:mimeType="text/plain" />
    </intent-filter>
</activity>
```

## PendingIntent

A `PendingIntent` wraps an intent and grants permission to execute it **later**, even beyond the app's lifecycle. Commonly used with notifications, alarms, and widgets.

```kotlin
val intent = Intent(this, MainActivity::class.java)

// Factory methods
val activityPendingIntent = PendingIntent.getActivity(
    this, requestCode, intent, PendingIntent.FLAG_IMMUTABLE
)

val servicePendingIntent = PendingIntent.getService(
    this, requestCode, intent, PendingIntent.FLAG_IMMUTABLE
)

val broadcastPendingIntent = PendingIntent.getBroadcast(
    this, requestCode, intent, PendingIntent.FLAG_IMMUTABLE
)
```

!!! warning
    Always use `FLAG_IMMUTABLE` (or `FLAG_MUTABLE` only if needed) on Android 12+. This is required for security.

## Bundle

A `Bundle` is a mapping of key-value pairs used to pass data between components. Supported value types include:

- **Primitives**: `Int`, `String`, `Boolean`, `Float`, etc.
- **Serializable**: Objects implementing `java.io.Serializable`
- **Parcelable**: Objects implementing `android.os.Parcelable` (preferred for Android)

```kotlin
// Pass data between fragments
val bundle = Bundle().apply {
    putString("key", "value")
    putInt("count", 10)
    putParcelable("user", userParcelable)
}
fragment.arguments = bundle
```

## IPC (Inter-Process Communication)

IPC is the mechanism by which separate processes communicate and share data. Android provides several IPC mechanisms:

| Mechanism | Description |
|---|---|
| **Binder** | Low-level, high-performance IPC framework |
| **Intents** | Message objects for cross-component communication |
| **Content Providers** | Structured data sharing across apps |
| **Messenger** | Simple IPC via message-passing with a Handler |

## Deeplinks

Deeplinks allow external URLs to open specific screens in your app.

### Manifest Declaration

```xml
<activity android:name=".ProductActivity">
    <intent-filter android:autoVerify="true">
        <action android:name="android.intent.action.VIEW" />
        <category android:name="android.intent.category.DEFAULT" />
        <category android:name="android.intent.category.BROWSABLE" />

        <data
            android:scheme="https"
            android:host="www.example.com"
            android:pathPrefix="/product" />
    </intent-filter>

    <!-- Custom scheme -->
    <intent-filter>
        <action android:name="android.intent.action.VIEW" />
        <category android:name="android.intent.category.DEFAULT" />
        <category android:name="android.intent.category.BROWSABLE" />

        <data
            android:scheme="myapp"
            android:host="product" />
    </intent-filter>
</activity>
```

### Handling in Activity

```kotlin
class ProductActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        intent?.data?.let { uri ->
            val productId = uri.getQueryParameter("id")
            val path = uri.path
            Log.d("Deeplink", "Product ID: $productId, Path: $path")
            loadProduct(productId)
        }
    }
}
```

??? example "URL Examples"
    - `https://www.example.com/product?id=123` -- HTTPS deeplink
    - `myapp://product?id=123` -- Custom scheme deeplink

!!! tip "Custom Scheme vs HTTPS"
    - **Custom schemes** (`myapp://`) are simple but can be hijacked by other apps
    - **HTTPS App Links** with `autoVerify="true"` are more secure and require hosting a Digital Asset Links file on your domain

## Binders

The **Binder** is Android's low-level IPC mechanism, built on a kernel-level driver that maps memory between processes.

- `IBinder` is the base interface for remotable objects
- The Binder driver handles **transactions** securely between processes
- All higher-level IPC (AIDL, Messenger, Content Providers) is built on top of Binder

!!! note
    You rarely interact with Binder directly. AIDL and Messenger provide higher-level abstractions for most IPC needs.

---

## Interview Q&A

??? question "What is the difference between an explicit and implicit intent?"
    An explicit intent specifies the exact component (class) to start and is used for in-app navigation. An implicit intent declares a general action (like `ACTION_VIEW` or `ACTION_SEND`) and the system resolves which app or component can handle it. Implicit intents require at least one matching intent filter to be resolved.

??? question "What is a PendingIntent and why is it needed?"
    A PendingIntent wraps an intent and grants another app or the system permission to execute it on your app's behalf at a later time. It is commonly used with notifications, alarms, and widgets where the triggering component is outside your app's process. On Android 12+, you must specify `FLAG_IMMUTABLE` or `FLAG_MUTABLE` for security.

??? question "What is the difference between a deep link and an Android App Link?"
    A deep link uses a custom scheme (e.g., `myapp://product`) and can be hijacked by other apps that register the same scheme. An Android App Link uses HTTPS with `autoVerify="true"` and requires a Digital Asset Links JSON file hosted on your domain, which guarantees only your verified app handles those URLs.

??? question "What are the main IPC mechanisms in Android?"
    Android provides Binder (low-level, high-performance IPC framework), Intents (message objects for cross-component communication), Content Providers (structured data sharing across apps), and Messenger (simple message-passing via a Handler). All higher-level IPC mechanisms are built on top of the Binder kernel driver.

??? question "What is a Bundle and what types of data can it carry?"
    A Bundle is a key-value mapping used to pass data between Android components. It supports primitives (Int, String, Boolean), `Serializable` objects, and `Parcelable` objects. `Parcelable` is preferred on Android because it is faster than `Serializable` since it avoids reflection-based serialization.

!!! tip "Further Reading"
    - [Intents and Intent Filters - Android Developers](https://developer.android.com/guide/components/intents-filters)
    - [Deep Links and App Links - Android Developers](https://developer.android.com/training/app-links)
    - [PendingIntent - Android Developers](https://developer.android.com/reference/android/app/PendingIntent)
    - [Android IPC with AIDL - Android Developers](https://developer.android.com/develop/background-work/services/aidl)
