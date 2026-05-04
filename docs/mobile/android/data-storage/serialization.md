# Serialization & Data Formats

---

## Serializable vs Parcelable

| Aspect | Serializable | Parcelable |
|---|---|---|
| **Origin** | Java standard interface | Android-specific interface |
| **Mechanism** | Reflection-based conversion to byte stream | Marshaling/unmarshaling to `Parcel` via generated code |
| **Reflection** | Yes (slower, creates temporary objects) | No (faster, minimal allocations) |
| **Use case** | Disk persistence, network serialization | IPC, passing data between Activities/Fragments |
| **Multiplatform** | Java/Kotlin JVM only | Android only |

```kotlin
// Serializable — simple but slow (reflection + GC overhead)
data class User(
    val name: String,
    val age: Int
) : Serializable

// Parcelable — fast, Android optimized
@Parcelize
data class User(
    val name: String,
    val age: Int
) : Parcelable
```

### Parcelable Under the Hood

When you write a `Parcelable` object, the data is written into a **`Parcel`** — a container for IPC data backed by **native memory** (not the Java heap). The flow:

1. `writeToParcel()` writes each field into the Parcel's native buffer in order
2. The Parcel is marshaled across the process boundary via the **Binder** driver (kernel)
3. On the receiving side, `createFromParcel()` reads fields back in the same order

The Parcel is essentially a **serialized byte buffer in native memory** optimized for fast cross-process transfer. It is NOT designed for persistent storage — the binary format can change between Android versions.

!!! tip "Always Use @Parcelize"
    The `kotlin-parcelize` plugin generates `writeToParcel()` and `CREATOR` at compile time. Never write Parcelable boilerplate manually.

### @TypeParceler for Custom Types

When a type is not natively Parcelable (e.g., `java.util.Date`, `BigDecimal`, third-party classes), use `@TypeParceler` to provide a custom parceling strategy.

```kotlin
// Define a Parceler for Date
object DateParceler : Parceler<Date> {
    override fun create(parcel: Parcel): Date {
        return Date(parcel.readLong())
    }
    override fun Date.write(parcel: Parcel, flags: Int) {
        parcel.writeLong(time)
    }
}

// Use it on the class or individual field
@Parcelize
@TypeParceler<Date, DateParceler>()
data class Event(
    val name: String,
    val date: Date
) : Parcelable

// Or per-field
@Parcelize
data class Event(
    val name: String,
    @TypeParceler<Date, DateParceler>() val date: Date
) : Parcelable
```

---

## JSON

- **Text-based** data interchange format, human-readable
- Encoded in **UTF-8** (1 byte per ASCII character, up to 4 bytes for other Unicode)
- Converting data to JSON = **serialization**; JSON to data = **deserialization**

```json
{
    "name": "Sandy",
    "age": 25,
    "skills": ["Kotlin", "Android"],
    "address": null
}
```

### JSON Gotchas Across Libraries

| Scenario | Gson | Moshi | kotlinx.serialization |
|---|---|---|---|
| Missing field in JSON | Silently sets to `null` (even for non-null Kotlin types) | **Throws** `JsonDataException` | **Throws** `MissingFieldException` (unless field has a default value) |
| Extra unknown field | Ignored by default | Ignored by default | **Throws** unless `ignoreUnknownKeys = true` |
| `null` for non-null type | Silently allows it (breaks Kotlin null-safety) | **Throws** | **Throws** |
| Default values | Ignores Kotlin default values (always overwrites) | Respects defaults with codegen | Respects defaults (missing field uses default) |

!!! warning "Gson and Null Safety"
    Gson uses reflection and bypasses Kotlin's null-safety. A non-null `String` property can silently become `null` at runtime if the JSON field is missing, leading to `NullPointerException` far from the deserialization site. This is the primary reason to avoid Gson in Kotlin projects.

---

## Gson vs Moshi vs kotlinx.serialization

=== "Gson (Legacy)"

    Reflection-based. No compile-time safety. Silently produces nulls for missing fields.

    ```kotlin
    val gson = Gson()
    val json = gson.toJson(user)
    val user = gson.fromJson(json, User::class.java)
    ```

    **Verdict:** Do not use in new Kotlin projects.

=== "Moshi"

    Two adapter modes: **reflection** and **codegen**. Always prefer codegen.

    ```kotlin
    // CODEGEN (preferred) — generates adapter at compile time
    @JsonClass(generateAdapter = true)
    data class User(
        val name: String,
        val age: Int,
        @Json(name = "email_address") val email: String
    )

    val moshi = Moshi.Builder()
        // No KotlinJsonAdapterFactory needed with codegen!
        .build()
    val adapter = moshi.adapter(User::class.java)
    val json = adapter.toJson(user)
    val user = adapter.fromJson(json)
    ```

    ```kotlin
    // REFLECTION (avoid) — slower, requires kotlin-reflect dependency
    val moshi = Moshi.Builder()
        .add(KotlinJsonAdapterFactory()) // reflection adapter
        .build()
    ```

    !!! warning "Codegen vs Reflection"
        - `@JsonClass(generateAdapter = true)` = **codegen**. Fast, no reflection, type-safe. Always use this.
        - `KotlinJsonAdapterFactory()` = **reflection**. Slower startup, larger APK (includes kotlin-reflect). Only use if you cannot annotate the class (third-party types).

=== "kotlinx.serialization"

    Compile-time code generation via Kotlin compiler plugin. No reflection, multiplatform, fastest.

    ```kotlin
    @Serializable
    data class User(
        val name: String,
        val age: Int,
        @SerialName("email_address") val email: String
    )

    val json = Json.encodeToString(user)
    val user = Json.decodeFromString<User>(json)
    ```

    ```kotlin
    // Custom configuration
    val json = Json {
        ignoreUnknownKeys = true   // don't crash on extra fields
        isLenient = true           // accept quoted booleans/numbers
        encodeDefaults = false     // skip default values in output
        explicitNulls = false      // omit null fields from output
        coerceInputValues = true   // coerce null to default value for non-null types
    }
    ```

    **Best choice for new projects**, especially KMP.

---

## serialVersionUID

Used by Java `Serializable` to detect changes in a class during deserialization. If the UID does not match, deserialization throws `InvalidClassException`.

```java
public class User implements Serializable {
    private static final long serialVersionUID = 1L;
    private String name;
    private int age;
}
```

!!! warning "Version Mismatch"
    If you modify a `Serializable` class (add/remove fields) without updating `serialVersionUID`, deserialization of previously persisted data will fail. This primarily matters for disk/database persistence — not for transient IPC.

---

## Protocol Buffers (Protobuf)

Binary serialization format developed by Google. Smaller and faster than JSON, with strict schema enforcement.

### Key Characteristics

| Aspect | JSON | Protobuf |
|---|---|---|
| Format | Text (human-readable) | Binary (compact) |
| Schema | Optional | Required (`.proto` files) |
| Size | Larger (field names in every message) | 3-10x smaller (field numbers, varint encoding) |
| Speed | Slower (parse text) | Faster (parse binary) |
| Backward compatibility | Fragile | Built-in (field numbers, unknown field handling) |

### Proto Definition

```protobuf
syntax = "proto3";

message User {
    string id = 1;        // field number, NOT a default value
    string name = 2;
    int32 age = 3;
    repeated string skills = 4;  // list
    Address address = 5;         // nested message

    enum Role {
        UNKNOWN = 0;
        USER = 1;
        ADMIN = 2;
    }
    Role role = 6;
}

message Address {
    string street = 1;
    string city = 2;
}
```

### Android Usage

Protobuf is used in two primary contexts on Android:

1. **gRPC** — for network communication (protobuf is the wire format)
2. **Proto DataStore** — for typed local data persistence

```kotlin
// Proto DataStore with protobuf
val userPreferencesStore: DataStore<UserPreferences> = context.createDataStore(
    fileName = "user_prefs.pb",
    serializer = UserPreferencesSerializer
)

// Read
val flow: Flow<UserPreferences> = userPreferencesStore.data

// Write
userPreferencesStore.updateData { currentPrefs ->
    currentPrefs.toBuilder()
        .setDarkMode(true)
        .setFontSize(16)
        .build()
}
```

---

## kotlinx.serialization Formats

`kotlinx.serialization` is not just for JSON. The same `@Serializable` annotation works with multiple formats:

| Format | Artifact | Use Case |
|---|---|---|
| **JSON** | `kotlinx-serialization-json` | REST APIs, config files |
| **Protobuf** | `kotlinx-serialization-protobuf` | Binary serialization, DataStore |
| **CBOR** | `kotlinx-serialization-cbor` | Compact binary (like JSON but binary) |
| **Properties** | `kotlinx-serialization-properties` | Flat key-value maps |

```kotlin
@Serializable
data class User(val name: String, val age: Int)

// JSON
val jsonString = Json.encodeToString(user)

// Protobuf (binary)
val bytes = ProtoBuf.encodeToByteArray(user)
val decoded = ProtoBuf.decodeFromByteArray<User>(bytes)

// CBOR (binary)
val cborBytes = Cbor.encodeToByteArray(user)

// Properties (flat map)
val map = Properties.encodeToMap(user) // {name=Sandy, age=25}
```

!!! tip "One Annotation, Multiple Formats"
    Define `@Serializable` once on your data class, then serialize to JSON for the API, Protobuf for DataStore, and Properties for logging — all without changing the data class.

---

## DataStore Serializer Pattern

Proto DataStore requires a `Serializer` to read/write your data type. Two common approaches:

=== "Protobuf Serializer (Google protobuf)"

    ```kotlin
    object UserPreferencesSerializer : Serializer<UserPreferences> {
        override val defaultValue: UserPreferences = UserPreferences.getDefaultInstance()

        override suspend fun readFrom(input: InputStream): UserPreferences {
            try {
                return UserPreferences.parseFrom(input)
            } catch (e: InvalidProtocolBufferException) {
                throw CorruptionException("Cannot read proto.", e)
            }
        }

        override suspend fun writeTo(t: UserPreferences, output: OutputStream) {
            t.writeTo(output)
        }
    }
    ```

=== "kotlinx.serialization Serializer"

    ```kotlin
    @Serializable
    data class UserPreferences(
        val darkMode: Boolean = false,
        val fontSize: Int = 14,
        val language: String = "en"
    )

    object UserPreferencesSerializer : Serializer<UserPreferences> {
        override val defaultValue = UserPreferences()

        override suspend fun readFrom(input: InputStream): UserPreferences {
            try {
                return Json.decodeFromString(
                    UserPreferences.serializer(),
                    input.readBytes().decodeToString()
                )
            } catch (e: SerializationException) {
                throw CorruptionException("Cannot read json.", e)
            }
        }

        override suspend fun writeTo(t: UserPreferences, output: OutputStream) {
            output.write(
                Json.encodeToString(UserPreferences.serializer(), t).encodeToByteArray()
            )
        }
    }

    // Create the DataStore
    val Context.userPrefsDataStore by dataStore(
        fileName = "user_prefs.json",
        serializer = UserPreferencesSerializer
    )
    ```

!!! tip "Proto DataStore vs Preferences DataStore"
    - **Preferences DataStore** — key-value pairs, no schema, like SharedPreferences but with Flow and coroutines
    - **Proto DataStore** — typed schema (protobuf or any Serializer), type-safe, better for complex structured data

---

## Comparison Matrix

| Library | Mechanism | Speed | Null Safety | KMP | Best For |
|---|---|---|---|---|---|
| **Gson** | Reflection | Slow | Unsafe (silently nulls) | No | Legacy projects only |
| **Moshi (codegen)** | Code generation | Fast | Safe (throws on null) | No | Android-only projects |
| **kotlinx.serialization** | Compiler plugin | Fastest | Safe (explicit handling) | Yes | New projects, KMP |
| **Protobuf** | Code generation | Fastest (binary) | Schema-enforced | Yes | gRPC, DataStore, bandwidth-critical |

---

## Interview Q&A

??? question "What is the difference between Serializable and Parcelable?"
    `Serializable` is a Java standard interface that uses reflection to convert objects to byte streams — it is simple but slow and creates many temporary objects. `Parcelable` is Android-specific, writes data into a native memory `Parcel` without reflection, and is significantly faster. Always use `@Parcelize` for passing data between Android components.

??? question "Why should you avoid Gson in Kotlin projects?"
    Gson uses reflection and completely bypasses Kotlin's null-safety system. If a JSON field is missing or null, Gson silently assigns `null` to a non-null Kotlin property instead of throwing an error. This leads to `NullPointerException` at runtime far from the deserialization site, making bugs hard to track down.

??? question "How does kotlinx.serialization differ from Moshi?"
    kotlinx.serialization is a Kotlin compiler plugin that generates serialization code at compile time with no reflection, supports multiplatform (Android, iOS, Desktop, JS), and works with multiple formats (JSON, Protobuf, CBOR) from a single `@Serializable` annotation. Moshi is JVM-only and limited to JSON, though its codegen mode is also fast and type-safe.

??? question "What is serialVersionUID and when does it matter?"
    `serialVersionUID` is a version identifier used by Java `Serializable` to verify that the sender and receiver of a serialized object have compatible class definitions. If you modify a `Serializable` class without updating the UID, deserialization of previously persisted data throws `InvalidClassException`. It matters primarily for disk persistence, not transient IPC.

??? question "When would you choose Protobuf over JSON?"
    Protobuf is preferred when payload size and parsing speed are critical — it produces 3-10x smaller messages than JSON and parses faster because it is binary. It also has built-in backward compatibility through field numbers. Use it for gRPC communication, Proto DataStore, and bandwidth-constrained mobile scenarios.

---

!!! tip "Further Reading"
    - [Parcelable implementation generator (kotlin-parcelize)](https://developer.android.com/kotlin/parcelize)
    - [kotlinx.serialization Guide](https://github.com/Kotlin/kotlinx.serialization/blob/master/docs/serialization-guide.md)
    - [Moshi GitHub Repository](https://github.com/square/moshi)
    - [Protocol Buffers Documentation](https://protobuf.dev/overview/)
