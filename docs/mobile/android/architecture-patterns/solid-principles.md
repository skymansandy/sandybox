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
