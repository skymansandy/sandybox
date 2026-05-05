# Design Patterns

## Creational Patterns — How to create objects?

### Singleton

One instance throughout the application. In Kotlin, the `object` keyword is the idiomatic way.

=== "Kotlin object"

    ```kotlin
    object DatabaseDriver {
        fun connect() { /* ... */ }
    }
    ```

    Thread-safe, lazily initialized by the class loader. Cannot accept constructor parameters.

=== "Double-Check Locking"

    ```kotlin
    class DatabaseDriver private constructor(config: DbConfig) {
        companion object {
            @Volatile
            private var instance: DatabaseDriver? = null

            fun getInstance(config: DbConfig): DatabaseDriver {
                return instance ?: synchronized(this) {
                    instance ?: DatabaseDriver(config).also { instance = it }
                }
            }
        }
    }
    ```

    Use when the singleton needs constructor parameters. `@Volatile` ensures visibility across threads.

!!! warning "Singletons and testing"
    Global state makes unit testing difficult — you can't swap the implementation. Prefer DI-scoped singletons (`@Singleton` in Dagger/Hilt) over language-level singletons when the class has dependencies.

### Builder

Step-by-step construction of complex objects. Common in Java-era Android (AlertDialog.Builder, Notification.Builder, Retrofit.Builder).

```kotlin
class Person private constructor(
    val name: String,
    val age: Int,
    val email: String?
) {
    class Builder {
        private var name: String = ""
        private var age: Int = 0
        private var email: String? = null

        fun setName(name: String) = apply { this.name = name }
        fun setAge(age: Int) = apply { this.age = age }
        fun setEmail(email: String?) = apply { this.email = email }
        fun build() = Person(name, age, email)
    }
}
```

!!! tip "Kotlin often replaces Builder"
    Kotlin's **named parameters** and **default values** eliminate most Builder use cases:

    ```kotlin
    data class Person(
        val name: String,
        val age: Int = 0,
        val email: String? = null
    )

    // Call site is just as readable, no Builder needed
    val person = Person(name = "Sandy", age = 25)
    ```

    Use the Builder pattern only when:

    - You're writing a library consumed by Java callers
    - Construction involves validation or multi-step logic (e.g., `Retrofit.Builder` validates base URL)
    - The object is mutable during construction but immutable after (e.g., `Notification.Builder`)

### Factory Method vs Abstract Factory

Both encapsulate object creation, but at different levels.

=== "Factory Method"

    A single method decides which subclass to instantiate. The client calls one function and gets back an interface.

    ```kotlin
    interface Coffee { fun brew(): String }
    class CaffeLatte : Coffee { override fun brew() = "Brewing Caffe Latte" }
    class Americano : Coffee { override fun brew() = "Brewing Americano" }

    // Factory method — often a companion object in Kotlin
    fun createCoffee(type: String): Coffee = when (type) {
        "latte" -> CaffeLatte()
        "americano" -> Americano()
        else -> throw IllegalArgumentException("Unknown: $type")
    }
    ```

=== "Abstract Factory"

    A factory of factories. Produces families of related objects without specifying concrete classes. Useful when you have multiple related types that vary together.

    ```kotlin
    // Families of UI components
    interface Button { fun render(): String }
    interface TextField { fun render(): String }

    // Abstract factory
    interface UIFactory {
        fun createButton(): Button
        fun createTextField(): TextField
    }

    // Material family
    class MaterialButton : Button { override fun render() = "Material Button" }
    class MaterialTextField : TextField { override fun render() = "Material TextField" }
    class MaterialFactory : UIFactory {
        override fun createButton() = MaterialButton()
        override fun createTextField() = MaterialTextField()
    }

    // iOS family
    class CupertinoButton : Button { override fun render() = "Cupertino Button" }
    class CupertinoTextField : TextField { override fun render() = "Cupertino TextField" }
    class CupertinoFactory : UIFactory {
        override fun createButton() = CupertinoButton()
        override fun createTextField() = CupertinoTextField()
    }
    ```

    The client depends only on `UIFactory` — swap the implementation and the entire UI family changes.

### Dependency Injection

Passing dependencies from outside via constructor instead of creating them internally. Not a "pattern" in the GoF sense, but a fundamental principle in Android.

```kotlin
// Without DI — tightly coupled, untestable
class UserRepository {
    private val api = RetrofitClient.create()  // hard dependency
}

// With DI — loosely coupled, testable
class UserRepository @Inject constructor(
    private val api: ApiService  // injected, swappable
)
```

See the [Dependency Injection page](dependency-injection.md) for Dagger and Hilt details.

---

## Structural Patterns — How to compose objects?

### Adapter

Converts one interface into another that clients expect. Central to Android — `RecyclerView.Adapter` bridges data to ViewHolder views.

```kotlin
interface USBCharger {
    fun chargeWithUSBC()
}

interface LightningCharger {
    fun chargeWithLightning()
}

// Adapter makes a LightningCharger work where a USBCharger is expected
class LightningToUSBAdapter(
    private val lightning: LightningCharger
) : USBCharger {
    override fun chargeWithUSBC() {
        lightning.chargeWithLightning()  // delegates to the adaptee
    }
}
```

### Decorator

Wraps an object to add behavior without modifying the original class. Follows the **open/closed principle** — open for extension, closed for modification.

```kotlin
// OkHttp interceptors are decorators on the HTTP call chain
class AuthInterceptor(private val tokenProvider: TokenProvider) : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        val request = chain.request().newBuilder()
            .addHeader("Authorization", "Bearer ${tokenProvider.token}")
            .build()
        return chain.proceed(request)  // delegates to next in chain
    }
}

val client = OkHttpClient.Builder()
    .addInterceptor(AuthInterceptor(tokenProvider))   // decorator 1
    .addInterceptor(HttpLoggingInterceptor())          // decorator 2
    .build()
```

Each interceptor decorates the chain — it adds behavior (headers, logging, caching) and delegates to the next interceptor. You can stack any number without modifying existing ones.

### Repository

Abstracts data sources behind a single interface. The consumer doesn't know (or care) whether data comes from network, database, or cache.

```kotlin
// Interface in domain layer (pure Kotlin, no Android deps)
interface UserRepository {
    suspend fun getUser(id: String): User
    fun observeUsers(): Flow<List<User>>
}

// Implementation in data layer
class UserRepositoryImpl @Inject constructor(
    private val api: UserApi,
    private val dao: UserDao,
    private val dispatcher: CoroutineDispatcher
) : UserRepository {

    override suspend fun getUser(id: String): User = withContext(dispatcher) {
        // Offline-first: try local, fall back to remote
        dao.getUser(id) ?: api.getUser(id).toDomain().also { dao.insert(it) }
    }

    override fun observeUsers(): Flow<List<User>> {
        return dao.observeAll().map { entities -> entities.map { it.toDomain() } }
    }
}
```

!!! tip "Repository is the boundary"
    - The ViewModel depends on the **interface** (defined in `:core:domain`)
    - The implementation lives in `:core:data` with all the Android/network/database dependencies
    - In tests, swap with a `FakeUserRepository` — no Retrofit, no Room, no network

---

## Behavioral Patterns — How to coordinate interactions?

### Observer

One-to-many dependency: when the subject changes, all observers are notified.

=== "StateFlow (Recommended)"

    ```kotlin
    class HomeViewModel : ViewModel() {
        private val _state = MutableStateFlow(HomeState())
        val state: StateFlow<HomeState> = _state.asStateFlow()
    }

    // Compose — lifecycle-aware collection
    @Composable
    fun HomeScreen(viewModel: HomeViewModel) {
        val state by viewModel.state.collectAsStateWithLifecycle()
    }

    // Fragment — lifecycle-aware collection
    viewLifecycleOwner.lifecycleScope.launch {
        viewLifecycleOwner.repeatOnLifecycle(Lifecycle.State.STARTED) {
            viewModel.state.collect { state -> updateUI(state) }
        }
    }
    ```

=== "LiveData (Legacy)"

    ```kotlin
    val users = MutableLiveData<List<User>>()
    users.observe(viewLifecycleOwner) { list -> adapter.submitList(list) }
    ```

    LiveData is lifecycle-aware but limited: no operators, main-thread only for `setValue`, awkward for non-UI layers. StateFlow/SharedFlow are the modern replacements.

| Feature | LiveData | StateFlow | SharedFlow |
|---------|----------|-----------|------------|
| **Lifecycle-aware** | Built-in | Needs `repeatOnLifecycle` | Needs `repeatOnLifecycle` |
| **Initial value** | Optional | Required | None |
| **Replay** | Latest value | Latest value | Configurable |
| **Operators** | Limited (map/switchMap) | Full Flow operators | Full Flow operators |
| **Thread** | `setValue` main only | Any dispatcher | Any dispatcher |

### Strategy

Define a family of algorithms, encapsulate each one, and make them interchangeable. The client picks a strategy at runtime.

```kotlin
// Strategy interface
interface ImageLoader {
    fun load(url: String, target: ImageView)
}

// Concrete strategies
class CoilImageLoader : ImageLoader {
    override fun load(url: String, target: ImageView) {
        target.load(url) // Coil extension
    }
}

class GlideImageLoader : ImageLoader {
    override fun load(url: String, target: ImageView) {
        Glide.with(target).load(url).into(target)
    }
}

// Context class — doesn't know which loader is used
class ProfileScreen @Inject constructor(
    private val imageLoader: ImageLoader  // injected strategy
) {
    fun showAvatar(url: String, view: ImageView) {
        imageLoader.load(url, view)
    }
}
```

Android examples of Strategy: `Comparator` for sorting, `Interceptor` for OkHttp, `DiffUtil.ItemCallback` for RecyclerView, `CoroutineDispatcher` for threading.

---

## Android Architectural Patterns

### Unidirectional Data Flow (UDF)

The core principle behind MVVM and MVI. State flows in one direction; events flow in the opposite direction. No circular dependencies between state and events.

```
┌──────────────────────────────────────────────┐
│                                              │
│   Events (user actions)                      │
│   UI ──────────────────────► ViewModel       │
│                                   │          │
│                              State update    │
│                                   │          │
│   State (UI data)                 ▼          │
│   UI ◄─────────────────────── StateFlow      │
│                                              │
└──────────────────────────────────────────────┘
```

- **State flows down**: ViewModel emits state, UI renders it
- **Events flow up**: UI sends user actions to ViewModel
- **Single source of truth**: the ViewModel holds the canonical state; UI is a pure function of that state
- **Predictability**: given the same state, the UI always renders the same way

UDF applies to both MVVM and MVI. The difference is how strictly events and state transitions are modeled.

---

### MVC (Model-View-Controller)

```
View (XML layout) ←→ Controller (Activity/Fragment) ←→ Model (data)
```

The original Android pattern by default. The fundamental problem: **Activity/Fragment is both View and Controller**. It handles UI rendering, user input, navigation, lifecycle, permissions, and business logic — leading to "God Activity" classes with thousands of lines.

No separation of concerns, nearly impossible to unit test (everything depends on the Android framework).

### MVP (Model-View-Presenter)

```
View (Activity/Fragment implements ViewInterface) ←→ Presenter ←→ Model
```

- The View implements an **interface** (`HomeView`), and the Presenter holds a reference to that interface — not to the Activity directly
- This interface boundary is what makes the Presenter **unit testable** — you can mock `HomeView` without any Android framework
- The Presenter contains all UI logic: it calls `view.showLoading()`, `view.showUsers(list)`, etc.

```kotlin
interface HomeView {
    fun showLoading()
    fun showUsers(users: List<User>)
    fun showError(message: String)
}

class HomePresenter(
    private val view: HomeView,
    private val repository: UserRepository
) {
    fun loadUsers() {
        view.showLoading()
        // fetch and call view.showUsers() or view.showError()
    }
}
```

**Issues:**

- Presenter is destroyed on configuration changes (no `ViewModelStore` equivalent)
- 1:1 coupling — each screen needs its own View interface and Presenter
- Presenter holds a View reference, risking leaks if not cleared in `onDestroy()`

### MVVM (Model-View-ViewModel)

```
View (Activity/Fragment/Compose) ──observes──► ViewModel ──calls──► Repository/UseCase
```

- ViewModel **has no reference to the View at all** — it exposes observable state (StateFlow, LiveData) and the View subscribes
- ViewModel survives configuration changes (backed by `ViewModelStore`)
- ViewModel is plain Kotlin + coroutines — fully unit testable without Robolectric

```kotlin
class HomeViewModel @Inject constructor(
    private val getUsers: GetUsersUseCase
) : ViewModel() {
    private val _state = MutableStateFlow(HomeState())
    val state = _state.asStateFlow()

    init { loadUsers() }

    private fun loadUsers() {
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true) }
            getUsers()
                .onSuccess { users -> _state.update { it.copy(users = users, isLoading = false) } }
                .onFailure { e -> _state.update { it.copy(error = e.message, isLoading = false) } }
        }
    }
}
```

### Clean Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Presentation Layer    View ←→ ViewModel                │
├─────────────────────────────────────────────────────────┤
│  Domain Layer          UseCases, Repository interfaces  │
│                        (pure Kotlin — NO Android deps)  │
├─────────────────────────────────────────────────────────┤
│  Data Layer            Repository impls, API, DB, DTOs  │
└─────────────────────────────────────────────────────────┘
```

**The dependency rule**: outer layers depend on inner layers, never the reverse. The domain layer is the innermost — it defines interfaces that the data layer implements.

- **Domain layer must be pure Kotlin** (no `android.*` imports). This lets you share it in KMP, test without Robolectric, and enforce architectural boundaries at the module level.
- Repository interfaces live in domain; implementations live in data
- UseCases encapsulate one piece of business logic

!!! tip "When to use UseCases"
    - Complex business logic shared across multiple ViewModels
    - Logic that combines multiple repositories
    - When the ViewModel is getting too large
    - **One use case per action** — `GetUsersUseCase`, `DeleteUserUseCase`

!!! warning "Avoid over-engineering"
    If a UseCase just delegates to a repository with no additional logic, it's boilerplate. It's fine for a ViewModel to call a repository directly for simple CRUD. Add UseCases when real business logic exists.

---

### MVI (Model-View-Intent)

The strictest form of UDF. Every user action is an **Intent** (not Android Intent), every state transition goes through a **Reducer**, and the UI is a pure function of the **State**.

```
User Action → Intent → Reducer(currentState, intent) → newState → UI renders
```

```kotlin
// State — immutable, single source of truth
data class HomeState(
    val users: List<User> = emptyList(),
    val isLoading: Boolean = false,
    val error: String? = null
)

// Intent — sealed hierarchy of all possible user actions
sealed interface HomeIntent {
    data object LoadUsers : HomeIntent
    data class DeleteUser(val id: String) : HomeIntent
    data class SearchUsers(val query: String) : HomeIntent
}

// Side effects — one-time events that aren't state (navigation, toasts)
sealed interface HomeSideEffect {
    data class ShowToast(val message: String) : HomeSideEffect
    data object NavigateToDetail : HomeSideEffect
}
```

```kotlin
class HomeViewModel @Inject constructor(
    private val repo: UserRepository
) : ViewModel() {
    private val _state = MutableStateFlow(HomeState())
    val state = _state.asStateFlow()

    private val _sideEffects = Channel<HomeSideEffect>()
    val sideEffects = _sideEffects.receiveAsFlow()

    fun handleIntent(intent: HomeIntent) {
        when (intent) {
            is HomeIntent.LoadUsers -> loadUsers()
            is HomeIntent.DeleteUser -> deleteUser(intent.id)
            is HomeIntent.SearchUsers -> searchUsers(intent.query)
        }
    }

    // Reducer-style: each function transitions from current state to new state
    private fun loadUsers() {
        _state.update { it.copy(isLoading = true) }
        viewModelScope.launch {
            repo.getUsers()
                .onSuccess { users ->
                    _state.update { it.copy(users = users, isLoading = false) }
                }
                .onFailure { e ->
                    _state.update { it.copy(error = e.message, isLoading = false) }
                    _sideEffects.send(HomeSideEffect.ShowToast("Failed to load"))
                }
        }
    }
}
```

**MVI Libraries:**

- **Orbit MVI** — lightweight, coroutine-based, minimal boilerplate. Uses `container` + `intent { }` + `reduce { }` + `postSideEffect { }`
- **MVIKotlin** — Arkadii Ivanov's library, full Redux-like store with Dispatchers and Executors
- **FlowRedux** — state machine approach with DSL for defining state transitions

!!! tip "When to use MVI"
    - Complex screens with many interacting state variables
    - When you need state logging or time-travel debugging (every state transition is traceable)
    - Teams that struggle with inconsistent state bugs
    - **Overkill for simple CRUD screens** — MVVM is fine there

!!! note "MVVM vs MVI"
    The difference is mostly about strictness. MVVM with StateFlow and sealed intents *is* effectively MVI. Pure MVI adds a formal reducer function and prohibits direct state mutations outside the reducer. Choose based on team discipline needs — not dogma.
