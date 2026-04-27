# Serialization & Parcelable

---

## Serializable vs Parcelable

| Aspect | Serializable | Parcelable |
|---|---|---|
| **Origin** | Java standard interface | Android-specific interface |
| **Mechanism** | Converts to byte stream | Marshaling/unmarshaling to `Parcel` class for IPC |
| **Reflection** | Uses reflection (slower) | No reflection (faster) |
| **GC Impact** | Generates temporary objects (more garbage collection) | Minimal temporary objects |
| **Implementation** | Easy — just implement the interface | More boilerplate code |
| **Use case** | General serialization | Preferred for IPC, Activities, Services |

```kotlin
// Serializable - simple but slow
data class User(
    val name: String,
    val age: Int
) : Serializable

// Parcelable - fast, Android optimized
@Parcelize
data class User(
    val name: String,
    val age: Int
) : Parcelable
```

!!! tip "Prefer Parcelable for Android"
    Use `Parcelable` for passing data between Activities, Services, and across processes (IPC). Use `@Parcelize` from `kotlin-parcelize` plugin to avoid boilerplate.

---

## Gson vs Moshi

=== "Gson"

    Uses **reflection** at runtime to map JSON fields to object properties.

    ```kotlin
    val gson = Gson()
    val json = gson.toJson(user)          // serialize
    val user = gson.fromJson(json, User::class.java) // deserialize
    ```

=== "Moshi"

    Uses **annotation processing** to generate adapters at compile time. Faster runtime, type-safe.

    ```kotlin
    val moshi = Moshi.Builder()
        .add(KotlinJsonAdapterFactory())
        .build()
    val adapter = moshi.adapter(User::class.java)
    val json = adapter.toJson(user)       // serialize
    val user = adapter.fromJson(json)     // deserialize
    ```

---

## JSON

- **String format** representation of byte data.
- Encoded in **UTF-8** (1 byte = 8 bits per ASCII character).
- Converting data to JSON = **JSON serialization**.

```json
{
    "name": "Sandy",
    "age": 25,
    "skills": ["Kotlin", "Android"]
}
```

---

## serialVersionUID

- Java adds this field automatically if not specified, or it can be added manually.
- Used to **detect changes** in a data class during deserialization.
- If the class has changed since serialization (fields added/removed), a mismatched `serialVersionUID` will throw `InvalidClassException`.

```java
public class User implements Serializable {
    private static final long serialVersionUID = 1L;

    private String name;
    private int age;
}
```

!!! warning "Version Mismatch"
    If you modify a `Serializable` class without updating the `serialVersionUID`, deserialization of previously stored objects will fail with `InvalidClassException`.
