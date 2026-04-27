# Unit Testing

## Basics

- **ViewModel should be independent of `android.jar`** (common code integrated with the OS), so it can be tested in a pure Kotlin/Java environment.
- **Inject dependencies from outside** -- create a `Logger` interface with separate `AppLogger` and `TestLogger` implementations. Apply the same pattern for dispatchers.
- **Testing** = find as many bugs as possible.
- **Unit Testing** = testing the smallest part -- a method, a class, or a component.

---

## Types of Tests

| Type | Runs on | Directory |
|------|---------|-----------|
| Local | JVM (locally) | `test/` |
| Instrumented | Device / Emulator | `androidTest/` |

---

## Libraries

| Library | Purpose |
|---------|---------|
| **JUnit** | Assertions & test lifecycle |
| **Turbine** | Testing Kotlin `Flow` |
| **Mockito** | Mocking dependencies |
| **Espresso** | View testing (XML-based UI) |

---

## Test Doubles

!!! tip "Quick Reference"

    | Double | Description |
    |--------|-------------|
    | **Fake** | A working implementation that takes shortcuts (e.g., `HashMap` instead of a SQL database). |
    | **Stub** | Returns predefined answers -- it just returns whatever it is told. |
    | **Mock** | Pre-programmed with **expectations** about the calls it should receive. |

??? example "Fake vs Stub vs Mock"

    === "Fake"

        A `FakeUserRepository` backed by an in-memory map:

        ```kotlin
        class FakeUserRepository : UserRepository {
            private val users = mutableMapOf<String, User>()

            override suspend fun getUser(id: String): User? = users[id]
            override suspend fun saveUser(user: User) { users[user.id] = user }
        }
        ```

    === "Stub"

        A stub that always returns the same user:

        ```kotlin
        class StubUserRepository : UserRepository {
            override suspend fun getUser(id: String): User = User("stub-id", "Stub User")
            override suspend fun saveUser(user: User) { /* no-op */ }
        }
        ```

    === "Mock"

        Using Mockito to verify interactions:

        ```kotlin
        val mockRepo = mock<UserRepository>()
        whenever(mockRepo.getUser("123")).thenReturn(User("123", "Mock User"))

        // ... run code under test ...

        verify(mockRepo).getUser("123")
        ```
