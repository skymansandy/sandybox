# Design Patterns

## Creational Patterns — How to create objects?

### Singleton

One instance throughout the application.

=== "Kotlin object"

    ```kotlin
    object DatabaseDriver {
        fun connect() { /* ... */ }
    }
    ```

=== "Double-Check Locking"

    ```kotlin
    class DatabaseDriver private constructor() {
        companion object {
            @Volatile
            private var instance: DatabaseDriver? = null

            fun getInstance(): DatabaseDriver {
                return instance ?: synchronized(this) {
                    instance ?: DatabaseDriver().also { instance = it }
                }
            }
        }
    }
    ```

### Builder

Step-by-step construction of complex objects.

```kotlin
class Person private constructor(
    val name: String?,
    val age: Int?
) {
    class Builder {
        private var name: String? = null
        private var age: Int? = null

        fun setName(name: String) = apply { this.name = name }
        fun setAge(age: Int) = apply { this.age = age }
        fun build() = Person(name, age)
    }
}

// Usage
val person = Person.Builder()
    .setName("Sandy")
    .setAge(25)
    .build()
```

### Factory

Create objects without specifying the exact class. Removes instantiation logic from client code.

```kotlin
interface Coffee {
    fun brew()
}

class CaffeLatte : Coffee {
    override fun brew() { println("Brewing Caffe Latte") }
}

class Americano : Coffee {
    override fun brew() { println("Brewing Americano") }
}

class CoffeeFactory {
    fun createCoffee(type: String): Coffee {
        return when (type) {
            "latte" -> CaffeLatte()
            "americano" -> Americano()
            else -> throw IllegalArgumentException("Unknown coffee type")
        }
    }
}
```

### Dependency Injection

Passing dependencies from outside via constructor instead of creating them internally. Frameworks: Dagger2, Hilt.

```kotlin
class UserRepository(private val api: ApiService) {
    // api is injected, not created here
}
```

---

## Structural Patterns — How to compose objects?

### Adapter

Converts one interface to another that clients expect.

```kotlin
interface AndroidCharger {
    fun chargeWithTypeC()
}

interface IPhoneCharger {
    fun chargeWithLightning()
}

class IPhone : IPhoneCharger {
    override fun chargeWithLightning() {
        println("Charging with Lightning")
    }
}

class IPhoneToAndroidAdapter(private val iPhone: IPhoneCharger) : AndroidCharger {
    override fun chargeWithTypeC() {
        // Adapts Type-C call to Lightning
        iPhone.chargeWithLightning()
    }
}

// Usage
val iPhone = IPhone()
val adapter: AndroidCharger = IPhoneToAndroidAdapter(iPhone)
adapter.chargeWithTypeC()
```

---

## Behavioral Patterns — How to coordinate interactions?

### Observer

Changes are observed by all subscribers. In Android: Kotlin Flows, LiveData.

```kotlin
// LiveData example
val liveData = MutableLiveData<String>()
liveData.observe(lifecycleOwner) { value ->
    // React to changes
}

// Flow example
val flow = MutableStateFlow("initial")
lifecycleScope.launch {
    flow.collect { value ->
        // React to changes
    }
}
```

---

## Android Architectural Patterns

### MVC (Model-View-Controller)

```
View (XML) ↔ Controller (Activity/Fragment) ↔ Model (Data class)
```

- Default Android pattern
- **Issue**: View and Controller are tightly coupled (Activity handles both UI and logic)

### MVP (Model-View-Presenter)

```
View (XML + Activity/Fragment) ↔ Presenter ↔ Model
```

- **Issues**:
    - Presenter is lost on configuration change
    - Presenter has direct view access
    - Presenter cannot be shared across views

### MVVM (Model-View-ViewModel)

```
View (XML + Activity/Fragment) ↔ ViewModel ↔ Model (Repository / Remote / DB)
```

- ViewModel survives configuration changes
- No direct view reference (uses observable data)

### Clean Architecture

```
Presentation (View ↔ ViewModel) ↔ Domain (UseCase) ↔ Data (Repository / Remote / DB)
```

Module-based separation of concerns.

!!! tip "When to use UseCases"
    - Complex business logic
    - Reusable logic across multiple ViewModels
    - Validation logic
    - When ViewModel gets too big
    - **One use case per task**

!!! warning "Cons"
    Can be over-complex for simple projects. Adds boilerplate with little benefit when the app logic is straightforward.
