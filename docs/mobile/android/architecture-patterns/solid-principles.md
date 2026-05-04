# SOLID Principles

---

## S — Single Responsibility Principle

> Every class should have only one responsibility.

=== "Violation"

    ```kotlin
    class SystemManager {
        fun addUser() { /* ... */ }
        fun deleteUser() { /* ... */ }
        fun sendNotification() { /* ... */ }
        fun sendEmail() { /* ... */ }
    }
    ```

    `SystemManager` handles user management, notifications, and emails — three responsibilities in one class.

=== "Correct"

    ```kotlin
    class UserManager {
        fun addUser() { /* ... */ }
        fun deleteUser() { /* ... */ }
    }

    class NotificationManager {
        fun sendNotification() { /* ... */ }
    }

    class MailManager {
        fun sendEmail() { /* ... */ }
    }
    ```

    Each class has a single, well-defined responsibility.

---

## O — Open-Closed Principle

> Open for extension, closed for modification.

=== "Violation"

    ```kotlin
    class Shape(val type: String, val width: Double, val height: Double, val radius: Double)

    fun area(shape: Shape): Double {
        return if (shape.type == "rectangle") {
            shape.width * shape.height
        } else if (shape.type == "circle") {
            Math.PI * shape.radius * shape.radius
        } else {
            throw IllegalArgumentException("Unknown shape")
        }
    }
    ```

    Adding a new shape requires modifying the `area` function.

=== "Correct"

    ```kotlin
    interface Shape {
        fun area(): Double
    }

    class Rectangle(val width: Double, val height: Double) : Shape {
        override fun area() = width * height
    }

    class Circle(val radius: Double) : Shape {
        override fun area() = Math.PI * radius * radius
    }
    ```

    New shapes are added by creating new classes — no existing code is modified.

---

## L — Liskov Substitution Principle

> Subclass methods should work without requiring changes in the calling code.

=== "Violation"

    ```kotlin
    open class Bird {
        open fun fly() {
            println("Flying...")
        }
    }

    class Penguin : Bird() {
        override fun fly() {
            println("I can't fly!")
        }
    }
    ```

    `Penguin` breaks the contract of `Bird.fly()`. Code expecting a `Bird` to fly will break with a `Penguin`.

=== "Correct"

    ```kotlin
    open class Bird {
        // Common bird behavior
    }

    interface IFlyingBird {
        fun fly()
    }

    class Eagle : Bird(), IFlyingBird {
        override fun fly() {
            println("Flying high!")
        }
    }

    class Penguin : Bird() {
        // No fly method — penguins don't fly
    }
    ```

    `Penguin` no longer violates the flying contract because it doesn't implement `IFlyingBird`.

---

## I — Interface Segregation Principle

> Split fat interfaces into smaller, specific ones.

=== "Violation"

    ```kotlin
    interface Animal {
        fun swim()
        fun fly()
    }

    class Duck : Animal {
        override fun swim() { println("Swimming") }
        override fun fly() { println("Flying") }
    }

    class Penguin : Animal {
        override fun swim() { println("Swimming") }
        override fun fly() {
            // Penguins can't fly — forced to implement an irrelevant method
            throw UnsupportedOperationException()
        }
    }
    ```

=== "Correct"

    ```kotlin
    interface CanSwim {
        fun swim()
    }

    interface CanFly {
        fun fly()
    }

    class Duck : CanSwim, CanFly {
        override fun swim() { println("Swimming") }
        override fun fly() { println("Flying") }
    }

    class Penguin : CanSwim {
        override fun swim() { println("Swimming") }
        // No need to deal with flying
    }
    ```

    Each class only implements the interfaces relevant to its behavior.

---

## D — Dependency Inversion Principle

> Depend on abstractions, not on concrete implementations.

=== "Violation"

    ```kotlin
    class PaypalPaymentProcessor {
        fun processPayment(amount: Double) {
            println("Processing $$amount via PayPal")
        }
    }

    class PaymentService {
        private val processor = PaypalPaymentProcessor() // hardcoded dependency

        fun pay(amount: Double) {
            processor.processPayment(amount)
        }
    }
    ```

    `PaymentService` is tightly coupled to `PaypalPaymentProcessor`. Switching to Stripe requires modifying `PaymentService`.

=== "Correct"

    ```kotlin
    interface PaymentProcessor {
        fun processPayment(amount: Double)
    }

    class PaypalPaymentProcessor : PaymentProcessor {
        override fun processPayment(amount: Double) {
            println("Processing $$amount via PayPal")
        }
    }

    class StripePaymentProcessor : PaymentProcessor {
        override fun processPayment(amount: Double) {
            println("Processing $$amount via Stripe")
        }
    }

    class PaymentService(private val processor: PaymentProcessor) {
        fun pay(amount: Double) {
            processor.processPayment(amount)
        }
    }

    // Usage — inject the dependency
    val service = PaymentService(PaypalPaymentProcessor())
    ```

    `PaymentService` depends on the `PaymentProcessor` abstraction. Concrete implementations are injected from outside.

---

## Interview Q&A

??? question "Can you explain the Single Responsibility Principle with an Android example?"
    A ViewModel should only handle UI state management, not also perform network calls, database queries, and analytics tracking directly. Each concern should be in its own class — a Repository for data access, a UseCase for business logic, and the ViewModel for UI state. This makes each class easier to test, maintain, and reuse.

??? question "How does the Open-Closed Principle apply in Android development?"
    OkHttp Interceptors are a great example — you extend HTTP behavior by adding new Interceptors (open for extension) without modifying OkHttpClient's core logic (closed for modification). Similarly, RecyclerView.Adapter lets you handle any data type by extending the adapter without modifying RecyclerView itself.

??? question "What is the Liskov Substitution Principle and why does it matter?"
    Any subclass should be usable wherever its parent class is expected without breaking behavior. If a function accepts a `Bird` and calls `fly()`, passing a `Penguin` that throws an exception violates LSP. The fix is to separate the flying capability into its own interface so only birds that can fly implement it.

??? question "How does Dependency Inversion relate to Dependency Injection?"
    Dependency Inversion is the principle — depend on abstractions, not concretions. Dependency Injection is the mechanism that implements it — a framework like Hilt provides concrete implementations through the constructor. Together, they enable loose coupling and testability by ensuring classes depend on interfaces rather than creating their own concrete dependencies.

??? question "Give a real-world example of Interface Segregation in Android."
    Instead of one large `LifecycleObserver` interface with methods for every lifecycle event, Android provides `DefaultLifecycleObserver` with default implementations so you only override what you need. Similarly, splitting a large repository interface into `ReadableUserRepository` and `WritableUserRepository` prevents read-only consumers from depending on write methods.

!!! tip "Further Reading"
    - [Guide to app architecture](https://developer.android.com/topic/architecture) — SOLID in practice within Android's recommended architecture
    - [SOLID principles](https://en.wikipedia.org/wiki/SOLID) — Wikipedia overview with detailed explanations
    - [Dependency injection in Android](https://developer.android.com/training/dependency-injection) — How DI implements Dependency Inversion
    - [Clean Architecture by Robert C. Martin](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html) — The original Clean Architecture blog post
