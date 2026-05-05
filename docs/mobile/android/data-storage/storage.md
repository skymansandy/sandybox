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
