# Dependency Injection (Dagger & Hilt)

## Why DI?

- Manage dependencies easily across the application
- Easier unit testing with mocked objects
- Manage object scope and lifecycle

---

## Singleton in Kotlin

=== "object keyword"

    ```kotlin
    object AppConfig {
        val baseUrl = "https://api.example.com"
    }
    ```

=== "Double-Check Locking"

    ```kotlin
    class DatabaseDriver private constructor() {
        companion object {
            @Volatile
            private var instance: DatabaseDriver? = null

            fun getInstance(): DatabaseDriver {
                if (instance == null) {
                    synchronized(this) {
                        if (instance == null) {
                            instance = DatabaseDriver()
                        }
                    }
                }
                return instance!!
            }
        }
    }
    ```

---

## Dagger Annotations

| Role | Annotations |
|------|-------------|
| **Consumer** | `@Inject` (constructor, field, method) |
| **Producer** | `@Module`, `@Provides`, `@Binds` |
| **Connector** | `@Component` |

---

## General Dagger Flow

```
Consumer asks Component → Component checks constructor @Inject or @Provides in Module
```

1. A class requests a dependency via `@Inject`
2. Dagger looks at the `@Component` to find how to provide it
3. The component checks if the class constructor has `@Inject`, or looks in `@Module` for a `@Provides` method

---

## Avoiding @Provides

If you `@Inject` on a constructor, Dagger can create the instance automatically — no `@Provides` needed.

```kotlin
class UserRepository @Inject constructor(
    private val api: ApiService
)
```

!!! note "When @Provides is required"
    - Classes you don't own (third-party libraries like Retrofit, OkHttp)
    - Interfaces (Dagger doesn't know which implementation to use)

---

## @Singleton

A scoped annotation. The instance is singleton **to the annotated component**.

```kotlin
@Singleton
@Component(modules = [AppModule::class])
interface ApplicationComponent {
    // ...
}
```

For example, `@Singleton` on `ApplicationComponent` means the instance lives as long as the application.

---

## Component Contracts

When a smaller component needs classes from a bigger component, it must sign a contract — declare a function in the application component exposing the dependency.

```kotlin
@Singleton
@Component(modules = [AppModule::class])
interface ApplicationComponent {
    // Contract: expose ApiService for sub-components
    fun apiService(): ApiService
}

@ActivityScope
@Component(dependencies = [ApplicationComponent::class])
interface ActivityComponent {
    fun inject(activity: MainActivity)
}
```

---

## Two Types of Injection

### Constructor Injection

`@Inject` before the constructor. Preferred approach.

```kotlin
class UserRepository @Inject constructor(
    private val apiService: ApiService,
    private val database: AppDatabase
)
```

### Field Injection

`@Inject` on the field + call `DaggerComponent.inject(this)`. Used for classes with private constructors that you don't control (Activity, Fragment, Service, Application).

```kotlin
class MainActivity : AppCompatActivity() {

    @Inject
    lateinit var userRepository: UserRepository

    override fun onCreate(savedInstanceState: Bundle?) {
        // Inject before super.onCreate()
        DaggerApplicationComponent.builder()
            .build()
            .inject(this)
        super.onCreate(savedInstanceState)
    }
}
```

The component interface must declare an `inject` function:

```kotlin
@Component(modules = [AppModule::class])
interface ApplicationComponent {
    fun inject(activity: MainActivity)
}
```

---

## @Qualifiers / @Named

Used when multiple objects of the same type need to be distinguished.

```kotlin
@Module
class NetworkModule {
    @Provides
    @Named("auth")
    fun provideAuthOkHttpClient(): OkHttpClient { /* ... */ }

    @Provides
    @Named("logging")
    fun provideLoggingOkHttpClient(): OkHttpClient { /* ... */ }
}

class ApiService @Inject constructor(
    @Named("auth") private val authClient: OkHttpClient
)
```

---

## @Binds vs @Provides

=== "@Provides"

    ```kotlin
    @Module
    class AppModule {
        @Provides
        fun provideRepository(apiService: ApiService): Repository {
            return RepositoryImpl(apiService)
        }
    }
    ```

    Creates and returns the object explicitly.

=== "@Binds"

    ```kotlin
    @Module
    abstract class AppModule {
        @Binds
        abstract fun bindRepository(impl: RepositoryImpl): Repository
    }
    ```

    No object creation needed — just tells Dagger which implementation to use for the interface. More efficient (no generated factory class).

---

## Best Practices

!!! tip "Injection Timing"
    - **Activity**: Inject in `onCreate()` **before** `super.onCreate()`
    - **Fragment**: Inject in `onAttach()` **after** `super.onAttach()`

---

## Dagger Hilt

Hilt is a wrapper over Dagger, purpose-built for Android. It provides predefined components and scopes.

### Predefined Scopes and Components

| Component | Scope | Lifecycle |
|-----------|-------|-----------|
| `SingletonComponent` | `@Singleton` | Application |
| `ViewModelComponent` | `@ViewModelScoped` | ViewModel |
| `ActivityComponent` | `@ActivityScoped` | Activity |
| `FragmentComponent` | `@FragmentScoped` | Fragment |
| `ViewComponent` | `@ViewScoped` | View |
| `ServiceComponent` | `@ServiceScoped` | Service |

### Setup

```kotlin
// Application class
@HiltAndroidApp
class MyApp : Application()

// Activity
@AndroidEntryPoint
class MainActivity : AppCompatActivity()

// Fragment — Activity must also have @AndroidEntryPoint
@AndroidEntryPoint
class HomeFragment : Fragment()
```

!!! warning "Important"
    If a Fragment uses `@AndroidEntryPoint`, its host Activity must **also** have `@AndroidEntryPoint`.

### Modules with Hilt

```kotlin
@Module
@InstallIn(SingletonComponent::class)
class NetworkModule {
    @Provides
    @Singleton
    fun provideRetrofit(): Retrofit { /* ... */ }
}
```

### Multibinding

Bind several objects into a `Set` or `Map` collection.

```kotlin
@Module
@InstallIn(SingletonComponent::class)
abstract class AnalyticsModule {
    @Binds
    @IntoSet
    abstract fun bindFirebaseAnalytics(impl: FirebaseAnalytics): AnalyticsService

    @Binds
    @IntoSet
    abstract fun bindMixpanelAnalytics(impl: MixpanelAnalytics): AnalyticsService
}

// Inject the set
class AnalyticsManager @Inject constructor(
    private val analyticsServices: Set<@JvmSuppressWildcards AnalyticsService>
)
```
