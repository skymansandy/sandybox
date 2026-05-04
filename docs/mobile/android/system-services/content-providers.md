# Content Providers

A **Content Provider** is an Android component that provides a secure, consistent interface for sharing data across applications. It encapsulates data and exposes it via queries, without revealing the underlying database or storage mechanism.

## Content URI

A Content URI identifies data in a provider and consists of two parts:

| Part | Description | Example |
|---|---|---|
| **Authority** | Uniquely identifies the content provider | `com.example.myapp.provider` |
| **Path** | Identifies the data type / table | `/users` |

Full URI: `content://com.example.myapp.provider/users`

## Creating a Content Provider

### Registration in Manifest

```xml
<provider
    android:name=".MyContentProvider"
    android:authorities="com.example.myapp.provider"
    android:exported="true" />
```

### Implementation

```kotlin
class MyContentProvider : ContentProvider() {

    override fun onCreate(): Boolean {
        // Initialize database or data source
        return true
    }

    override fun query(
        uri: Uri,
        projection: Array<String>?,
        selection: String?,
        selectionArgs: Array<String>?,
        sortOrder: String?
    ): Cursor? {
        // Query and return a Cursor
        return database.query("users", projection, selection, selectionArgs, null, null, sortOrder)
    }

    override fun insert(uri: Uri, values: ContentValues?): Uri? {
        val id = database.insert("users", null, values)
        context?.contentResolver?.notifyChange(uri, null)
        return ContentUris.withAppendedId(uri, id)
    }

    override fun update(
        uri: Uri,
        values: ContentValues?,
        selection: String?,
        selectionArgs: Array<String>?
    ): Int {
        return database.update("users", values, selection, selectionArgs)
    }

    override fun delete(
        uri: Uri,
        selection: String?,
        selectionArgs: Array<String>?
    ): Int {
        return database.delete("users", selection, selectionArgs)
    }

    override fun getType(uri: Uri): String? {
        return "vnd.android.cursor.dir/vnd.com.example.myapp.provider.users"
    }
}
```

## Accessing Data via ContentResolver

Other apps (or your own) access a content provider through `ContentResolver`.

=== "Query"

    ```kotlin
    val cursor = contentResolver.query(
        Uri.parse("content://com.example.myapp.provider/users"),
        arrayOf("id", "name", "email"),  // projection
        "name = ?",                       // selection
        arrayOf("Sandy"),                 // selectionArgs
        "name ASC"                        // sortOrder
    )

    cursor?.use {
        while (it.moveToNext()) {
            val name = it.getString(it.getColumnIndexOrThrow("name"))
            val email = it.getString(it.getColumnIndexOrThrow("email"))
            Log.d("CP", "Name: $name, Email: $email")
        }
    }
    ```

=== "Insert"

    ```kotlin
    val values = ContentValues().apply {
        put("name", "Sandy")
        put("email", "sandy@example.com")
    }

    val newUri = contentResolver.insert(
        Uri.parse("content://com.example.myapp.provider/users"),
        values
    )
    ```

## Security

Protect your content provider with custom permissions declared in the manifest.

```xml
<permission
    android:name="com.example.myapp.READ_DATA"
    android:protectionLevel="signature" />

<provider
    android:name=".MyContentProvider"
    android:authorities="com.example.myapp.provider"
    android:readPermission="com.example.myapp.READ_DATA"
    android:exported="true" />
```

!!! note "protectionLevel=\"signature\""
    Setting `protectionLevel` to `signature` means only apps signed with the **same signing key** can access the provider. This is the most secure option for sharing data between your own apps.

## DI with Content Provider

Content Providers are initialized **before** `Application.onCreate()`. If your DI framework (e.g., Hilt, Koin) initializes in `onCreate()`, the provider won't have access to injected dependencies.

!!! tip "Solution: Use attachBaseContext"
    Initialize your DI framework in `attachBaseContext()` instead of `onCreate()`. This method is called **before** `onCreate()` and before any Content Provider is initialized.

    ```kotlin
    class MyApplication : Application() {
        override fun attachBaseContext(base: Context) {
            super.attachBaseContext(base)
            // Initialize DI here - runs before Content Providers
            DaggerAppComponent.builder()
                .application(this)
                .build()
                .inject(this)
        }
    }
    ```

---

## Interview Q&A

??? question "What is a Content Provider and when would you use one?"
    A Content Provider is an Android component that provides a secure, standardized interface for sharing data between applications. Use it when you need to expose your app's data to other apps (e.g., contacts, media files) or when you need a consistent abstraction over different storage mechanisms. It is also required for features like search suggestions and widgets.

??? question "What is a Content URI and how is it structured?"
    A Content URI identifies data in a provider and consists of the scheme (`content://`), an authority (unique identifier for the provider, e.g., `com.example.myapp.provider`), and a path that identifies the data type or table (e.g., `/users`). The full URI looks like `content://com.example.myapp.provider/users`.

??? question "How do you secure a Content Provider?"
    You can secure a Content Provider by setting `android:exported="false"` to prevent external access, or by defining custom read/write permissions with `android:readPermission` and `android:writePermission`. Setting `android:protectionLevel="signature"` ensures only apps signed with the same key can access the provider.

??? question "Why are Content Providers initialized before Application.onCreate()?"
    The system creates all Content Providers before calling `Application.onCreate()` so that other apps and system components can access shared data as early as possible. This means if your DI framework initializes in `onCreate()`, the provider will not have access to injected dependencies. The workaround is to initialize DI in `attachBaseContext()`.

!!! tip "Further Reading"
    - [Content Providers - Android Developers](https://developer.android.com/guide/topics/providers/content-providers)
    - [Creating a Content Provider - Android Developers](https://developer.android.com/guide/topics/providers/content-provider-creating)
    - [Content Provider Basics - Android Developers](https://developer.android.com/guide/topics/providers/content-provider-basics)
    - [Calendar Provider - Android Developers](https://developer.android.com/guide/topics/providers/calendar-provider)
