# Android Storage

---

## Room Database

Room provides an abstraction layer over SQLite. Three main components:

| Component | Annotation | Role |
|---|---|---|
| **Entity** | `@Entity` | Data class representing a database table |
| **DAO** | `@Dao` | Interface defining CRUD operations |
| **Database** | `@Database` | Abstract class, entry point to the database |

```kotlin
@Entity(tableName = "users")
data class User(
    @PrimaryKey val id: Int,
    val name: String,
    val email: String
)

@Dao
interface UserDao {
    @Query("SELECT * FROM users")
    fun getAll(): Flow<List<User>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(user: User)

    @Delete
    suspend fun delete(user: User)
}

@Database(entities = [User::class], version = 1)
abstract class AppDatabase : RoomDatabase() {
    abstract fun userDao(): UserDao
}
```

- **`@TypeConverter`**: Used for complex types that SQLite cannot store directly (e.g., `Date`, `List`).
- Uses **SQLite** internally.
- `allowBackup` in the manifest controls whether the database is included in device backups.

!!! note "Normalization vs Denormalization"
    - **Normalization**: More tables with joins — reduces redundancy, better data integrity.
    - **Denormalization**: Fewer tables — faster reads, but data duplication.

---

## SharedPreferences

Key-value storage for primitive data types.

| Method | Behavior |
|---|---|
| `commit()` | Synchronous, returns `Boolean` success/failure |
| `apply()` | Asynchronous, no return value |

!!! warning "`apply()` blocks `commit()`"
    An outstanding `apply()` will block any subsequent `commit()` call until the write completes.

```kotlin
class MySharedPreferences(context: Context) {

    private val prefs = context.getSharedPreferences("my_prefs", Context.MODE_PRIVATE)

    fun saveString(key: String, value: String) {
        prefs.edit().putString(key, value).apply()
    }

    fun getString(key: String, default: String = ""): String {
        return prefs.getString(key, default) ?: default
    }

    fun saveInt(key: String, value: Int) {
        prefs.edit().putInt(key, value).apply()
    }

    fun getInt(key: String, default: Int = 0): Int {
        return prefs.getInt(key, default)
    }

    fun clear() {
        prefs.edit().clear().apply()
    }
}
```

---

## File System

Two approaches for reading/writing files:

=== "Byte-Based"

    Uses `InputStream` / `OutputStream` for raw byte data (images, binary files).

=== "Character-Based"

    Uses `Reader` / `Writer` for text data (strings, JSON).

---

## Jetpack DataStore

Built on **Coroutines** and **Flow**. Replacement for SharedPreferences.

=== "Proto DataStore"

    Stores typed objects using **Protocol Buffers**. Type-safe, schema-defined.

=== "Preferences DataStore"

    Stores key-value pairs, similar to SharedPreferences but with Flow-based async API.

```kotlin
val dataStore: DataStore<Preferences> by preferencesDataStore(name = "settings")

// Write
suspend fun saveTheme(isDark: Boolean) {
    dataStore.edit { prefs ->
        prefs[booleanPreferencesKey("dark_theme")] = isDark
    }
}

// Read
val isDarkTheme: Flow<Boolean> = dataStore.data.map { prefs ->
    prefs[booleanPreferencesKey("dark_theme")] ?: false
}
```

---

## Serialization / Deserialization

- **Serialization**: Converting an object to a byte stream for storage or transmission.
- **`serialVersionUID`**: Used to detect changes in a class during deserialization. Prevents `InvalidClassException`.
- **JSON**: String format representation of byte data, encoded in **UTF-8**.

=== "Gson"

    Uses **reflection** at runtime to serialize/deserialize. Simpler setup but slower.

=== "Moshi"

    Uses **annotation processing** to generate code at compile time. Faster runtime performance.

---

## Database vs File System for Caching

!!! tip "When to Use What"
    - **Complex queries** (filtering, sorting, joining) → use a **database** (Room/SQLite).
    - **Simple read/write** of whole objects → use the **file system** (JSON files, DataStore).

---

## Interview Q&A

??? question "What are the main differences between SharedPreferences and Jetpack DataStore?"
    SharedPreferences uses synchronous I/O on the main thread (with `commit()`) or fire-and-forget writes (with `apply()`), has no type safety, and can cause ANRs. DataStore uses Kotlin Coroutines and Flow for fully asynchronous reads and writes, provides error handling via exceptions, and offers a Proto DataStore variant for type-safe schema-backed storage.

??? question "When would you use Room over SharedPreferences or DataStore?"
    Room is the right choice when you need relational data with complex queries — filtering, sorting, joining multiple tables, or full-text search. SharedPreferences and DataStore are designed for simple key-value pairs or small structured objects like user settings.

??? question "What is the difference between `commit()` and `apply()` in SharedPreferences?"
    `commit()` writes synchronously to disk and returns a boolean indicating success or failure. `apply()` writes asynchronously with no return value. However, an outstanding `apply()` will block any subsequent `commit()` call until the async write completes, which can cause subtle performance issues.

??? question "How does Room handle database migrations?"
    Room uses `Migration` objects that define SQL statements to transform the schema from one version to the next. If no migration path is provided, Room throws an `IllegalStateException` at runtime. You can also use `.fallbackToDestructiveMigration()` to drop and recreate the database, losing all data.

??? question "What is a TypeConverter in Room and when do you need one?"
    A `@TypeConverter` converts complex types that SQLite cannot store natively (e.g., `Date`, `List`, custom enums) into supported primitive types like `Long` or `String`. You annotate converter methods and register them with your `@Database` class so Room knows how to persist and restore those types.

---

!!! tip "Further Reading"
    - [Save data in a local database using Room](https://developer.android.com/training/data-storage/room)
    - [Jetpack DataStore Guide](https://developer.android.com/topic/libraries/architecture/datastore)
    - [Android Data Storage Overview](https://developer.android.com/training/data-storage)
    - [Room Migration Guide](https://developer.android.com/training/data-storage/room/migrating-db-versions)
