# Swift Essentials

---

## Value Types vs Reference Types

| | Value Type | Reference Type |
|---|---|---|
| Examples | `struct`, `enum`, `tuple` | `class`, `actor`, closures |
| Assignment | Copies the value | Copies the reference |
| Mutation | `mutating` keyword required in structs | Mutable by default |
| Identity | No identity (`==` structural) | Has identity (`===` referential) |
| Thread safety | Inherently safe (each thread gets its own copy) | Requires synchronization |

```swift
struct Point {
    var x: Double
    var y: Double
}

var a = Point(x: 1, y: 2)
var b = a       // copy
b.x = 10
print(a.x)     // 1 — unchanged
```

!!! note "Copy-on-Write (COW)"
    Swift collections (`Array`, `Dictionary`, `Set`) are value types but use COW internally. The underlying storage is shared until one copy is mutated, avoiding unnecessary allocations.

---

## Optionals

Optionals represent a value that may or may not exist. Under the hood, `Optional<T>` is an enum with `.some(T)` and `.none` cases.

```swift
var name: String? = "Alice"

// Force unwrap — crashes if nil
let length = name!.count

// Optional binding
if let name = name {
    print(name.count)
}

// Guard
func greet(_ name: String?) {
    guard let name = name else { return }
    print("Hello, \(name)")
}

// Nil coalescing
let displayName = name ?? "Anonymous"

// Optional chaining
let count = name?.count  // Int?
```

### Implicitly Unwrapped Optionals

Declared with `!` instead of `?`. Auto-unwraps on access — crashes if nil. Used when a value is guaranteed to exist after initialization (e.g., `@IBOutlet`).

```swift
var label: UILabel!  // nil until viewDidLoad sets it
```

!!! warning "Avoid overuse"
    Implicitly unwrapped optionals bypass the compiler's nil safety. Prefer regular optionals with `guard let` or `if let` unless the value is guaranteed to be set before use (IBOutlets, two-phase initialization).

---

## Closures

Closures are self-contained blocks of functionality that capture values from their surrounding context.

```swift
// Full syntax
let add: (Int, Int) -> Int = { (a: Int, b: Int) -> Int in
    return a + b
}

// Shortened — type inference + implicit return
let add: (Int, Int) -> Int = { $0 + $1 }

// Trailing closure
let sorted = names.sorted { $0 < $1 }

// Multiple trailing closures (Swift 5.3+)
UIView.animate(withDuration: 0.3) {
    view.alpha = 0
} completion: { _ in
    view.removeFromSuperview()
}
```

### Capturing Values

Closures capture variables by **reference** (not by value). The captured variable stays alive as long as the closure does.

```swift
func makeCounter() -> () -> Int {
    var count = 0
    return {
        count += 1  // captures `count` by reference
        return count
    }
}

let counter = makeCounter()
counter() // 1
counter() // 2
```

### @escaping vs Non-escaping

| | Non-escaping (default) | `@escaping` |
|---|---|---|
| Lifetime | Called within the function's scope | May outlive the function |
| Capture | No retain cycle risk | Can cause retain cycles |
| `self` | Implicit `self` allowed | Explicit `self` required |
| Use case | `map`, `filter`, `sorted` | Completion handlers, async callbacks |

```swift
func fetchData(completion: @escaping (Data) -> Void) {
    DispatchQueue.global().async {
        let data = loadFromNetwork()
        completion(data)  // escapes the function scope
    }
}
```

### @autoclosure

Wraps an expression in a closure automatically. Defers evaluation until the closure is called.

```swift
func assert(_ condition: @autoclosure () -> Bool, _ message: String) {
    if !condition() { print(message) }
}

assert(x > 0, "x must be positive")  // `x > 0` is wrapped in a closure
```

---

## Protocols

Protocols define a blueprint of methods, properties, and requirements. Similar to interfaces in other languages but more powerful.

```swift
protocol Drawable {
    var color: String { get set }
    func draw()
}

protocol Resizable {
    func resize(to size: CGSize)
}

// Conformance
struct Circle: Drawable, Resizable {
    var color: String
    var radius: Double

    func draw() { /* ... */ }
    func resize(to size: CGSize) { /* ... */ }
}
```

### Protocol Extensions (Default Implementations)

```swift
extension Drawable {
    func draw() {
        print("Drawing in \(color)")
    }
}

// Circle can omit draw() and use the default
```

!!! warning "Static vs Dynamic Dispatch in Protocol Extensions"
    Default implementations in protocol extensions use **static dispatch** when called on the protocol type. Only requirements declared in the protocol itself use dynamic dispatch.

    ```swift
    protocol Greetable {
        func greet() -> String  // protocol requirement — dynamic dispatch
    }

    extension Greetable {
        func greet() -> String { "Hello" }      // default for requirement
        func farewell() -> String { "Goodbye" } // extension-only — static dispatch
    }

    struct Person: Greetable {
        func greet() -> String { "Hi there" }
        func farewell() -> String { "See ya" }
    }

    let person: Greetable = Person()
    person.greet()    // "Hi there" — dynamic dispatch
    person.farewell() // "Goodbye"  — static dispatch (calls extension, not Person)
    ```

### Protocol Composition

```swift
func render(_ item: Drawable & Resizable) {
    item.draw()
    item.resize(to: CGSize(width: 100, height: 100))
}
```

### Associated Types

```swift
protocol Repository {
    associatedtype Item
    func get(id: String) -> Item?
    func save(_ item: Item)
}

struct UserRepository: Repository {
    typealias Item = User  // or inferred from usage
    func get(id: String) -> User? { /* ... */ }
    func save(_ item: User) { /* ... */ }
}
```

---

## Enums

Swift enums are algebraic data types — far more powerful than C-style enumerations.

```swift
// Simple enum
enum Direction {
    case north, south, east, west
}

// Enum with associated values
enum Result<Success, Failure: Error> {
    case success(Success)
    case failure(Failure)
}

// Enum with raw values
enum StatusCode: Int {
    case ok = 200
    case notFound = 404
    case serverError = 500
}

let code = StatusCode(rawValue: 404)  // Optional<StatusCode>
```

### Pattern Matching

```swift
enum NetworkError: Error {
    case timeout(seconds: Int)
    case unauthorized
    case serverError(code: Int, message: String)
}

func handle(_ error: NetworkError) {
    switch error {
    case .timeout(let seconds) where seconds > 30:
        print("Long timeout: \(seconds)s")
    case .timeout:
        print("Timeout")
    case .unauthorized:
        print("Login required")
    case .serverError(let code, _) where code >= 500:
        print("Server error: \(code)")
    case .serverError:
        print("Unknown server error")
    }
}
```

### Enum with Methods and Computed Properties

```swift
enum Planet: Int, CaseIterable {
    case mercury = 1, venus, earth, mars

    var isHabitable: Bool {
        self == .earth
    }

    func distanceFromSun() -> Double {
        switch self {
        case .mercury: return 57.9
        case .venus:   return 108.2
        case .earth:   return 149.6
        case .mars:    return 227.9
        }
    }
}

// CaseIterable gives you all cases
Planet.allCases.forEach { print($0) }
```

---

## Structs vs Classes

| | Struct | Class |
|---|---|---|
| Type | Value | Reference |
| Inheritance | No | Yes |
| Deinitializer | No | Yes (`deinit`) |
| Identity check | No | `===` operator |
| Memberwise init | Auto-generated | Must define manually |
| Mutability | `mutating` keyword required | Mutable by default |

!!! tip "When to Use Which"
    Default to **structs**. Use classes when you need inheritance, reference semantics (shared mutable state), or Objective-C interoperability. Apple's guideline: "Use structures by default."

---

## Access Control

| Modifier | Scope |
|---|---|
| `open` | Any module, can subclass and override |
| `public` | Any module, **cannot** subclass/override |
| `internal` | Same module (default) |
| `fileprivate` | Same source file |
| `private` | Same declaration (enclosing braces) |

```swift
public class APIClient {
    private let apiKey: String
    fileprivate var session: URLSession
    internal func makeRequest() { /* ... */ }
    public func fetchData() { /* ... */ }
}

open class BaseViewController: UIViewController {
    open func configure() { /* subclasses can override */ }
}
```

!!! note "`open` vs `public`"
    `open` is only needed for classes and class members that should be subclassable/overridable **outside the module**. Within the same module, `public` classes can be subclassed freely.

---

## Generics

```swift
// Generic function
func swapValues<T>(_ a: inout T, _ b: inout T) {
    let temp = a
    a = b
    b = temp
}

// Generic type
struct Stack<Element> {
    private var items: [Element] = []

    mutating func push(_ item: Element) { items.append(item) }
    mutating func pop() -> Element? { items.popLast() }
}
```

### Constraints

```swift
// Type constraint
func findIndex<T: Equatable>(of value: T, in array: [T]) -> Int? {
    array.firstIndex(of: value)
}

// Protocol constraint with where clause
func allEqual<C: Collection>(_ collection: C) -> Bool
    where C.Element: Equatable {
    guard let first = collection.first else { return true }
    return collection.allSatisfy { $0 == first }
}
```

### Opaque Types (`some`) vs Existential Types (`any`)

| | `some Protocol` | `any Protocol` |
|---|---|---|
| Type identity | Fixed (compiler knows the concrete type) | Erased (can hold any conforming type) |
| Performance | Static dispatch, no heap allocation | Dynamic dispatch, may heap allocate |
| Usage | Return types, `SwiftUI` views | Heterogeneous collections, parameters |

```swift
// Opaque — always returns the same concrete type
func makeShape() -> some Shape {
    Circle(radius: 10)
}

// Existential — can hold different types
var shapes: [any Shape] = [Circle(radius: 5), Square(side: 3)]
```

!!! tip "Default to `some`"
    Use `some` when the caller doesn't need to know the concrete type but the type is consistent. Use `any` when you need heterogeneous collections or truly dynamic types.

---

## Error Handling

```swift
enum ValidationError: Error {
    case tooShort(minimum: Int)
    case invalidCharacter(Character)
}

func validate(_ password: String) throws -> Bool {
    guard password.count >= 8 else {
        throw ValidationError.tooShort(minimum: 8)
    }
    return true
}

// Handling
do {
    try validate("abc")
} catch ValidationError.tooShort(let min) {
    print("Password must be at least \(min) characters")
} catch {
    print("Unexpected: \(error)")
}

// try? — converts to optional
let isValid = try? validate("abc")  // nil on error

// try! — force (crashes on error)
let isValid = try! validate("validpassword1")
```

### Typed Throws (Swift 6.0+)

```swift
func validate(_ input: String) throws(ValidationError) -> Bool {
    guard input.count >= 8 else {
        throw .tooShort(minimum: 8)
    }
    return true
}

// Catch block knows the exact error type
do {
    try validate("abc")
} catch {
    // error is ValidationError, not any Error
    switch error {
    case .tooShort(let min): print("Min: \(min)")
    case .invalidCharacter(let c): print("Bad char: \(c)")
    }
}
```

---

## Concurrency (async/await)

### async/await

```swift
func fetchUser(id: String) async throws -> User {
    let (data, _) = try await URLSession.shared.data(from: url)
    return try JSONDecoder().decode(User.self, from: data)
}

// Calling
Task {
    do {
        let user = try await fetchUser(id: "123")
        print(user.name)
    } catch {
        print(error)
    }
}
```

### Structured Concurrency

```swift
// Parallel execution with async let
async let profile = fetchProfile(id: userId)
async let posts = fetchPosts(userId: userId)
let (userProfile, userPosts) = try await (profile, posts)

// Task group — dynamic number of concurrent tasks
let images = try await withThrowingTaskGroup(of: UIImage.self) { group in
    for url in urls {
        group.addTask { try await downloadImage(from: url) }
    }
    var results: [UIImage] = []
    for try await image in group {
        results.append(image)
    }
    return results
}
```

### Actors

Actors provide data-race safety by isolating their mutable state. Only one task can access an actor's state at a time.

```swift
actor BankAccount {
    private var balance: Double = 0

    func deposit(_ amount: Double) {
        balance += amount
    }

    func withdraw(_ amount: Double) throws -> Double {
        guard balance >= amount else { throw BankError.insufficientFunds }
        balance -= amount
        return amount
    }
}

let account = BankAccount()
await account.deposit(100)  // `await` required — actor-isolated
```

### @MainActor

Ensures code runs on the main thread. Use for UI updates.

```swift
@MainActor
class ViewModel: ObservableObject {
    @Published var items: [Item] = []

    func loadItems() async {
        let fetched = await api.fetchItems()
        items = fetched  // safe — guaranteed on main thread
    }
}
```

---

## Property Wrappers

Property wrappers encapsulate getter/setter logic into a reusable attribute.

```swift
@propertyWrapper
struct Clamped {
    var wrappedValue: Int {
        didSet { wrappedValue = min(max(wrappedValue, range.lowerBound), range.upperBound) }
    }
    let range: ClosedRange<Int>

    init(wrappedValue: Int, _ range: ClosedRange<Int>) {
        self.range = range
        self.wrappedValue = min(max(wrappedValue, range.lowerBound), range.upperBound)
    }
}

struct Player {
    @Clamped(0...100) var health: Int = 100
}

var player = Player()
player.health = 150  // clamped to 100
player.health = -10  // clamped to 0
```

### Common Built-in Property Wrappers

| Wrapper | Framework | Purpose |
|---|---|---|
| `@State` | SwiftUI | View-local mutable state |
| `@Binding` | SwiftUI | Two-way reference to parent's state |
| `@Published` | Combine | Emits changes to subscribers |
| `@ObservedObject` | SwiftUI | External observable object |
| `@StateObject` | SwiftUI | Owned observable object (survives redraws) |
| `@EnvironmentObject` | SwiftUI | Dependency injection via environment |
| `@AppStorage` | SwiftUI | UserDefaults-backed storage |

---

## Extensions

Add functionality to existing types without subclassing or modifying the original source.

```swift
extension String {
    var isPalindrome: Bool {
        self == String(self.reversed())
    }

    func truncated(to length: Int) -> String {
        count > length ? String(prefix(length)) + "..." : self
    }
}

// Protocol conformance via extension
extension Int: Identifiable {
    public var id: Int { self }
}

// Conditional conformance
extension Array: Summarizable where Element: CustomStringConvertible {
    func summary() -> String {
        map { $0.description }.joined(separator: ", ")
    }
}
```

---

## Strings

Swift strings are Unicode-correct by default. Each `Character` is an extended grapheme cluster.

```swift
let emoji = "👨‍👩‍👧‍👦"
emoji.count                    // 1 (one grapheme cluster)
emoji.unicodeScalars.count     // 7 (multiple Unicode scalars)
emoji.utf8.count               // 25 bytes

// String indexing — no integer subscript
let greeting = "Hello, World!"
let start = greeting.startIndex
let fifth = greeting.index(start, offsetBy: 4)
greeting[fifth]  // "o"

// Substring
let hello = greeting[..<greeting.index(start, offsetBy: 5)]
// hello is a Substring — shares storage with greeting
let owned = String(hello)  // copy into independent String
```

!!! note "Why no integer indexing?"
    Characters can span multiple bytes. `string[5]` would require O(n) traversal, which would be misleading if it looked like O(1). Swift forces explicit index manipulation to make this cost visible.

---

## Memory Management (ARC)

Swift uses **Automatic Reference Counting** — the compiler inserts `retain`/`release` calls at compile time (not a garbage collector).

### Reference Cycle Prevention

```swift
class Person {
    var apartment: Apartment?
}

class Apartment {
    weak var tenant: Person?  // weak breaks the cycle
}
```

| Keyword | Zeroes on dealloc? | Optional? | Use case |
|---|---|---|---|
| `strong` | N/A (default) | Either | Ownership |
| `weak` | Yes (becomes `nil`) | Must be `Optional` | Delegates, parent references |
| `unowned` | No (dangling = crash) | Non-optional | Guaranteed same or longer lifetime |

### Closure Capture Lists

```swift
class ViewModel {
    var data: [String] = []

    func loadData() {
        fetchFromAPI { [weak self] result in
            guard let self else { return }
            self.data = result
        }
    }
}
```

!!! tip "When to use `[weak self]` vs `[unowned self]`"
    Use `[weak self]` when the closure might outlive `self` (network callbacks, timers). Use `[unowned self]` only when you're certain `self` will always be alive when the closure executes (e.g., a closure stored as a property that's always called during the owner's lifetime).

---

## Result Builders

Power SwiftUI's declarative syntax. A result builder transforms a series of statements into a single combined value.

```swift
@resultBuilder
struct ArrayBuilder {
    static func buildBlock(_ components: Int...) -> [Int] {
        components
    }

    static func buildOptional(_ component: [Int]?) -> [Int] {
        component ?? []
    }

    static func buildEither(first component: [Int]) -> [Int] {
        component
    }

    static func buildEither(second component: [Int]) -> [Int] {
        component
    }
}

@ArrayBuilder
func makeNumbers(includeExtra: Bool) -> [Int] {
    1
    2
    3
    if includeExtra {
        4
        5
    }
}
```

---

## Key Paths

Type-safe references to properties, used for dynamic property access.

```swift
struct User {
    var name: String
    var age: Int
}

let nameKeyPath = \User.name  // KeyPath<User, String>

let user = User(name: "Alice", age: 30)
user[keyPath: nameKeyPath]  // "Alice"

// Writable key paths
var mutable = user
mutable[keyPath: \.name] = "Bob"

// Key paths as functions (Swift 5.2+)
let names = users.map(\.name)  // equivalent to .map { $0.name }
```

---

??? question "Interview Questions"

    **Q: What's the difference between `struct` and `class` in Swift?**
    Structs are value types (copied on assignment), classes are reference types (shared). Structs have no inheritance, get auto memberwise init, and are generally preferred. Classes support inheritance, have `deinit`, and identity comparison with `===`.

    **Q: How does ARC work? How do you prevent retain cycles?**
    ARC inserts retain/release at compile time — no runtime GC. Retain cycles happen with strong reference loops. Break them with `weak` (zeroing, optional) or `unowned` (non-zeroing, non-optional). In closures, use capture lists: `[weak self]`.

    **Q: What is a protocol-oriented approach vs OOP?**
    Protocol-oriented: define behavior via protocols + extensions with default implementations. Supports value types and multiple conformance. OOP: shared behavior via class inheritance hierarchies. Swift favors protocols — they work with structs, enums, and classes alike.

    **Q: Explain `some` vs `any` for protocol types.**
    `some` (opaque type) preserves the concrete type identity — compiler knows it, caller doesn't. Static dispatch, no boxing. `any` (existential) erases the type — can hold different conforming types but uses dynamic dispatch and may heap-allocate.

    **Q: How does Swift concurrency differ from GCD?**
    Swift concurrency uses `async`/`await` with structured concurrency (task trees, automatic cancellation). GCD uses dispatch queues with closures. Actors replace serial queues for state isolation. The compiler can verify data-race safety at compile time with `Sendable` checks.

    **Q: What are property wrappers and when would you use them?**
    Property wrappers encapsulate reusable get/set logic via `@propertyWrapper`. SwiftUI uses them extensively (`@State`, `@Binding`, `@Published`). Custom ones are useful for validation, clamping, logging, or UserDefaults backing.

    **Q: What is copy-on-write and which types use it?**
    COW defers copying a value type until mutation occurs. Swift collections (`Array`, `Dictionary`, `Set`) implement COW — multiple copies share the same underlying buffer until one is mutated. Custom value types don't get COW automatically; you must implement it using `isKnownUniquelyReferenced`.

!!! tip "Further Reading"
    - [The Swift Programming Language (Official)](https://docs.swift.org/swift-book/)
    - [Swift Evolution Proposals](https://github.com/swiftlang/swift-evolution)
    - [WWDC Sessions on Swift](https://developer.apple.com/videos/swift)
