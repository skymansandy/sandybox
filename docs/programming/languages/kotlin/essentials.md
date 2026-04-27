# Kotlin Language Essentials

---

## Sealed Class vs Sealed Interface vs Enum

=== "Sealed Class"

    Restricted hierarchy. Can only be subclassed inside the same module. **Can have a constructor.**

    ```kotlin
    sealed class HttpError(val code: Int, val message: String) {
        class NotFound : HttpError(404, "Not Found")
        class Unauthorized : HttpError(401, "Unauthorized")
        class ServerError(override val message: String) : HttpError(500, message)
    }
    ```

=== "Sealed Interface"

    When a constructor is **not required**.

    ```kotlin
    sealed interface HttpError {
        val code: Int
        val message: String

        data class NotFound(override val message: String = "Not Found") : HttpError {
            override val code = 404
        }
        data class Unauthorized(override val message: String = "Unauthorized") : HttpError {
            override val code = 401
        }
    }
    ```

=== "Enum Class"

    Constants with the **same data for all** entries.

    ```kotlin
    enum class HttpError(val code: Int, val message: String) {
        NOT_FOUND(404, "Not Found"),
        UNAUTHORIZED(401, "Unauthorized"),
        SERVER_ERROR(500, "Internal Server Error")
    }
    ```

---

## if vs let

!!! warning "Thread Safety"
    `if (x != null)` can have a race condition -- another thread may set `x` to null between the check and usage. `x?.let {}` captures the value safely.

```kotlin
// Race condition possible
if (x != null) {
    doSomething(x) // x might be null here
}

// Thread safe
x?.let {
    doSomething(it) // captured value, safe
}
```

---

## Class vs KClass

- **KClass** (`::class`): Kotlin Reflection API
- **Class** (`::class.java`): Java Reflection API

---

## Reflection

Introspect a class and its properties at runtime.

---

## String vs StringBuffer vs StringBuilder

| Type | Mutability | Thread-Safe |
|---|---|---|
| `String` | Immutable | Yes |
| `StringBuffer` | Mutable | Yes (synchronized) |
| `StringBuilder` | Mutable | No (efficient, no sync overhead) |

---

## HashMap vs ArrayMap vs LinkedHashMap vs SparseArray

=== "HashMap"

    Uses a hash function for index. Handles collisions with a linked list.

=== "ArrayMap"

    Uses two arrays: sorted key hashes and key-value pairs sequentially. More **memory-efficient** than HashMap.

=== "LinkedHashMap"

    Uses a doubly-linked list. Maintains **insertion order**.

=== "SparseArray"

    Like ArrayMap but the key is a **primitive int only**. Avoids boxing overhead.

---

## List vs ArrayList

`ArrayList` is mutable. `mutableListOf()` internally calls `ArrayList()`.

---

## == vs ===

| Operator | Compares |
|---|---|
| `==` | `equals()` (structural equality) |
| `===` | Reference (referential equality) |

---

## inline, noinline, crossinline

- **inline**: Code is copied at the caller site. Best for functions with functional parameters.
- **noinline**: Prevents inlining of a specific lambda parameter.
- **crossinline**: Can't use local returns in a lambda that is called from a local lambda inside an inline function.

```kotlin
inline fun executeTask(crossinline task: () -> Unit) {
    val runnable = Runnable {
        task() // crossinline needed: task is called inside another lambda
        // return not allowed here (non-local return)
    }
    runnable.run()
}
```

---

## Scope Functions

| Function | Context Object | Return Value |
|---|---|---|
| `let` | `it` | Last expression |
| `run` | `this` | Last expression |
| `also` | `it` | Context object |
| `apply` | `this` | Context object |
| `with` | `this` | Last expression |

---

## use {}

For `Closeable` resources. Automatically closes the resource after the block.

```kotlin
fun <T : Closeable, R> T.use(block: (T) -> R): R
```

---

## JvmField, JvmOverloads, JvmStatic

| Annotation | Purpose |
|---|---|
| `@JvmStatic` | Generates a static function (for Java interop) |
| `@JvmField` | Access property without getter/setter from Java |
| `@JvmOverloads` | Enables default parameter usage from Java by generating overloads |

---

## Dynamic Dispatch

Overridden method is resolved at **runtime** (basic inheritance / polymorphism).

---

## OOP Principles

- **Abstraction**: Abstract methods define the contract without implementation.
- **Encapsulation**: Private modifier hides internal state.
- **Inheritance**: Child class extends parent class.
- **Polymorphism**:
    - Overloading = compile-time polymorphism
    - Overriding = runtime polymorphism

---

## Transient

Turns off serialization on specific fields.

```kotlin
@Transient
val cachedData: String = "not serialized"
```

---

## SAM / Functional Interface

An interface with exactly one abstract method (declared with `fun` keyword in Kotlin). Allows using a lambda instead of an anonymous object.

```kotlin
fun interface Transformer<T, R> {
    fun transform(input: T): R
}

val intToString = Transformer<Int, String> { it.toString() }
```

---

## Nothing, Unit, Any

| Type | Meaning |
|---|---|
| `Nothing` | Function never returns (throws exception, infinite loop) |
| `Unit` | Equivalent to `void` |
| `Any` | Base class of all non-nullable types (like Java `Object`) |

---

## Abstract vs Interface

!!! note "Before and After Java 8"
    - Before Java 8: Interfaces **cannot** have method bodies.
    - After Java 8: Interfaces can have **default methods**.

Key difference: An interface **cannot have a constructor**. Both abstract classes and interfaces cannot be instantiated directly.

---

## val vs const val

| | `val` | `const val` |
|---|---|---|
| Evaluation | Runtime | Compile-time |
| Types | Any type, can use functions | Primitives and String only |
| Behavior | Assigned once | **Inlined** at usage site |

---

## lateinit vs lazy

| | `lateinit` | `lazy` |
|---|---|---|
| Keyword | `var` | `val` |
| Initialization | Manually, later | On first access |
| If not initialized | Throws `UninitializedPropertyAccessException` | N/A (always initialized on access) |
| Caching | N/A | Cached after first computation |

---

## open

Allows a class or function to be **inherited** or **overridden**. Classes and methods in Kotlin are `final` by default.

---

## Lambda and Higher-Order Functions

- **Lambda**: An anonymous function -- a block of code passed as an expression.
- **Higher-order function**: A function that takes another function as a parameter or returns a function.

---

## Why Reified Only Works with Inline

Generics are **erased at runtime**. With `inline`, the compiler copies code to the call site, knows the exact type, and replaces `T` with the actual class.

```kotlin
inline fun <reified T> isType(value: Any): Boolean {
    return value is T // only possible because T is reified
}
```

---

## data object

Overrides `toString()` in a human-readable form (class name instead of hash).

---

## object vs companion object

| | `object` | `companion object` |
|---|---|---|
| Scope | Standalone singleton | Singleton scoped to a class |
| Java equivalent | Singleton pattern | `static` members |
| Access to outer class | N/A | Can access outer class **private** members |

---

## Value Class

Inline wrapper around a single value. Erased at runtime to avoid allocation overhead.

```kotlin
@JvmInline
value class Password(val s: String)
```

---

## TypeAlias

Alternative names for existing types.

```kotlin
typealias ABC<T> = (T) -> Boolean
typealias UserList = List<User>
```
