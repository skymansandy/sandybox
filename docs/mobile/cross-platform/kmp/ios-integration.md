# KMP iOS Integration

Integrating Kotlin Multiplatform into an iOS project requires understanding how Kotlin/Native compiles to an Apple framework, how Swift consumes Kotlin APIs, and how to distribute the shared module.

---

## Compilation Pipeline

```mermaid
flowchart LR
    KT[Kotlin Source<br/>commonMain + iosMain] --> FE[Kotlin Frontend<br/>FIR]
    FE --> BE[Kotlin/Native Backend<br/>LLVM IR]
    BE --> OBJ[Objective-C Framework<br/>.framework bundle]
    OBJ --> SW[Swift Consumes<br/>via ObjC interop header]

    style KT fill:#e8eaf6,stroke:#3f51b5
    style OBJ fill:#fff3e0,stroke:#ff9800
    style SW fill:#fce4ec,stroke:#e91e63
```

Kotlin/Native compiles to an **Objective-C framework**, not Swift. Swift interacts with Kotlin through the Objective-C bridge, which imposes certain limitations on API fidelity.

---

## Framework Types

| Type | Build | Pros | Cons |
|---|---|---|---|
| **Static framework** | `.a` + headers bundled in `.framework` | Smaller app binary (dead-code stripped by linker) | Longer link times, can't have duplicate symbols |
| **Dynamic framework** | `.dylib` in `.framework` | Faster link, supports multiple targets | Larger app binary, framework must be embedded |
| **XCFramework** | Multi-arch bundle (`.xcframework`) | Single artifact for device + simulator | Required for SPM distribution |

```kotlin
// build.gradle.kts — XCFramework configuration
kotlin {
    val xcf = XCFramework("Shared")

    listOf(iosX64(), iosArm64(), iosSimulatorArm64()).forEach { target ->
        target.binaries.framework {
            baseName = "Shared"
            isStatic = true  // static for smaller binary
            xcf.add(this)
        }
    }
}
```

Build with: `./gradlew assembleSharedXCFramework`

---

## Distribution Methods

### CocoaPods

The Kotlin CocoaPods plugin generates a `.podspec` and integrates directly with Xcode.

```kotlin
// build.gradle.kts
plugins {
    kotlin("multiplatform")
    kotlin("native.cocoapods")
}

kotlin {
    cocoapods {
        summary = "Shared KMP module"
        homepage = "https://github.com/yourorg/project"
        version = "1.0"
        ios.deploymentTarget = "15.0"
        podfile = project.file("../iosApp/Podfile")

        framework {
            baseName = "Shared"
            isStatic = true
        }
    }
}
```

```ruby
# iosApp/Podfile
target 'iosApp' do
  use_frameworks!
  pod 'Shared', :path => '../shared'
end
```

!!! tip
    CocoaPods integration rebuilds the framework on each `pod install`. For faster iteration during development, use direct framework linking and reserve CocoaPods for CI/CD.

### Swift Package Manager (SPM)

Distribute the XCFramework via SPM for teams that don't use CocoaPods.

```kotlin
// Publish XCFramework, then create a Package.swift wrapper

// Package.swift
// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "Shared",
    platforms: [.iOS(.v15)],
    products: [
        .library(name: "Shared", targets: ["Shared"])
    ],
    targets: [
        .binaryTarget(
            name: "Shared",
            path: "Shared.xcframework"
        )
    ]
)
```

### Direct Framework Embedding

For monorepo setups, embed the framework directly in Xcode:

1. Run `./gradlew assembleSharedXCFramework`
2. Drag `Shared.xcframework` into Xcode → Frameworks
3. Set "Embed & Sign" in target settings

Automate with a Gradle task in the Xcode build phase:

```bash
# Xcode Build Phase → Run Script
cd "$SRCROOT/../"
./gradlew :shared:assembleSharedReleaseXCFramework
```

---

## Swift Interop Deep Dive

### Type Mapping

| Kotlin | Swift Sees | Notes |
|---|---|---|
| `Int` | `Int32` | Kotlin `Int` is 32-bit; use `Long` for 64-bit |
| `Long` | `Int64` | |
| `String` | `String` | Bridged seamlessly |
| `Boolean` | `KotlinBoolean` (in collections) | Boxed in generic contexts |
| `List<T>` | `[T]` (NSArray) | Immutable. `MutableList` → `NSMutableArray` |
| `Map<K,V>` | `[K:V]` (NSDictionary) | |
| `Unit` | `KotlinUnit` / `Void` | Awkward in callbacks |
| `Nothing?` | `nil` | |
| `data class` | Regular class | No Swift `Equatable`/`Hashable` by default |
| `enum class` | Nested classes | Not a Swift `enum`, no exhaustive `switch` |
| `sealed class` | Class hierarchy | No exhaustive `switch` without SKIE |
| `object` | Singleton with `.shared` accessor | |
| `companion object` | Nested `.companion` | |

### Suspend Functions

Without tooling, suspend functions appear as completion-handler callbacks in Swift:

```swift
// What Swift sees for: suspend fun getUser(id: String): User
SharedModule.getUser(id: "123", completionHandler: { user, error in
    if let user = user {
        // use user
    } else if let error = error {
        // handle error
    }
})
```

This is verbose and doesn't integrate with Swift's `async`/`await`. See [SKIE](#skie) and [KMP-NativeCoroutines](#kmp-nativecoroutines) below.

### Flow Exposure

Kotlin `Flow` is not directly accessible from Swift. It requires a wrapper:

```kotlin
// Manual wrapper in iosMain
class FlowWrapper<T>(private val flow: Flow<T>) {
    fun collect(onEach: (T) -> Unit, onComplete: () -> Unit, onError: (Throwable) -> Unit) {
        val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main)
        scope.launch {
            try {
                flow.collect { onEach(it) }
                onComplete()
            } catch (e: Throwable) {
                onError(e)
            }
        }
    }
}
```

Or use SKIE / KMP-NativeCoroutines which handle this automatically.

---

## SKIE

[SKIE](https://skie.touchlab.co/) (Swift Kotlin Interface Enhancer) by Touchlab generates idiomatic Swift APIs from Kotlin code at compile time.

### What SKIE Fixes

| Problem | Without SKIE | With SKIE |
|---|---|---|
| `suspend fun` | Completion handler | `async`/`await` |
| `sealed class` | Non-exhaustive classes | Exhaustive `switch` via `onEnum` |
| `enum class` | Nested classes | Swift-like `enum` |
| Default parameters | All params required | Default values preserved |
| `Flow<T>` | Not accessible | `AsyncSequence` |

### Setup

```kotlin
// build.gradle.kts
plugins {
    id("co.touchlab.skie") version "0.9.0"
}

skie {
    features {
        coroutinesInterop.set(true)
        sealedInterop.set(true)
        enumInterop.set(true)
        defaultArguments.set(true)
        flowInterop.set(true)
    }
}
```

### Usage in Swift

```kotlin
// Kotlin
sealed class UiState<out T> {
    data object Loading : UiState<Nothing>()
    data class Success<T>(val data: T) : UiState<T>()
    data class Error(val message: String) : UiState<Nothing>()
}

class UserViewModel {
    val state: StateFlow<UiState<User>> = /* ... */

    suspend fun refresh() { /* ... */ }
}
```

```swift
// Swift with SKIE
let viewModel = UserViewModel()

// async/await for suspend functions
try await viewModel.refresh()

// Exhaustive switch for sealed classes
switch onEnum(of: viewModel.state.value) {
case .loading:
    showSpinner()
case .success(let success):
    showUser(success.data)
case .error(let error):
    showError(error.message)
}

// StateFlow as AsyncSequence
Task {
    for await state in viewModel.state {
        updateUI(state)
    }
}
```

---

## KMP-NativeCoroutines

Alternative to SKIE, focused specifically on coroutine/Flow interop.

```kotlin
// Kotlin — annotate shared APIs
@NativeCoroutines
suspend fun getUser(id: String): User { /* ... */ }

@NativeCoroutines
val users: StateFlow<List<User>> = /* ... */
```

```swift
// Swift
import KMPNativeCoroutinesAsync

// suspend → async
let user = try await asyncFunction(for: viewModel.getUser(id: "123"))

// Flow → AsyncSequence
for try await users in asyncSequence(for: viewModel.users) {
    updateList(users)
}
```

### SKIE vs KMP-NativeCoroutines

| Feature | SKIE | KMP-NativeCoroutines |
|---|---|---|
| Sealed class interop | Yes (exhaustive switch) | No |
| Enum interop | Yes | No |
| Default parameters | Yes | No |
| suspend → async | Yes | Yes |
| Flow → AsyncSequence | Yes | Yes |
| Setup complexity | Gradle plugin | KSP + Swift package |
| Annotation required | No (automatic) | Yes (`@NativeCoroutines`) |

!!! tip
    SKIE is the more comprehensive solution. KMP-NativeCoroutines is lighter if you only need coroutine interop. Both are actively maintained.

---

## Debugging Kotlin from Xcode

### Xcode-Kotlin Plugin

[xcode-kotlin](https://github.com/nicklama/xcode-kotlin) enables setting breakpoints in Kotlin source files from Xcode.

```bash
# Install via Homebrew
brew install nicklama/formulae/xcode-kotlin
xcode-kotlin install
```

After installation, Xcode can step into Kotlin source files during debugging.

### LLDB Commands

```lldb
# Print Kotlin object
po object.description()

# Access Kotlin fields
expr -l objc++ -- [object valueForKey:@"fieldName"]

# Kotlin exceptions in LLDB
br set -E objc -O "kotlin.Exception"
```

### Crash Symbolication

Kotlin/Native crashes include Kotlin stack frames. For release builds:

```kotlin
// build.gradle.kts — keep debug info for crash reports
kotlin {
    targets.withType<KotlinNativeTarget> {
        binaries.all {
            freeCompilerArgs += "-Xadd-light-debug=enable"
        }
    }
}
```

---

## Memory & Threading

### Kotlin/Native Memory Manager

Since Kotlin 1.7.20, Kotlin/Native uses a **tracing garbage collector** similar to JVM GC. The old freeze/thread-confinement model is gone.

| Aspect | Behavior |
|---|---|
| **Mutable shared state** | Allowed across threads (no freeze) |
| **GC** | Concurrent mark-and-sweep, stop-the-world pauses are rare and short |
| **Autorelease** | Kotlin objects bridged to Obj-C are autoreleased. Watch for retain cycles in closures |
| **Synchronization** | Use `Mutex`, `AtomicReference`, `@SharedImmutable` (deprecated) — same concurrency rules as JVM |

### Avoiding Retain Cycles

```swift
// WRONG — strong reference cycle
viewModel.observe { [self] data in
    self.label.text = data.name  // self retains closure, closure retains self
}

// RIGHT — weak capture
viewModel.observe { [weak self] data in
    self?.label.text = data.name
}
```

!!! warning
    Kotlin lambdas passed to Swift are NOT automatically weak-captured. Always use `[weak self]` in Swift closures that reference `self` and are stored by Kotlin objects.

---

## Build Performance

| Strategy | Impact |
|---|---|
| **Static framework** | Faster incremental builds (no re-linking dylib) |
| **Gradle build cache** | Reuse compiled Kotlin/Native artifacts |
| **`embedAndSignAppleFrameworkForXcode` task** | Only recompiles when source changes |
| **SKIE incremental** | SKIE 0.8+ supports incremental compilation |
| **Kotlin 2.0+ compiler** | K2 compiler is significantly faster for Kotlin/Native |

```kotlin
// gradle.properties — performance flags
kotlin.native.cacheKind.iosArm64=static
kotlin.native.cacheKind.iosSimulatorArm64=static
kotlin.incremental=true
org.gradle.caching=true
```

---

??? question "Common Interview Questions"

    **Q: Why does Kotlin/Native compile to Objective-C and not Swift?**
    Objective-C has a stable ABI and runtime that Swift interoperates with natively. Swift's ABI stability is newer and its module format is less suited for external code generation. By targeting Obj-C, Kotlin/Native works with any Swift version.

    **Q: What are the main limitations of Kotlin-Swift interop?**
    Generics are limited to Obj-C generics (partial type erasure), sealed classes aren't exhaustive in switch statements (without SKIE), suspend functions become callbacks, Flows aren't directly accessible, and default parameter values are lost. SKIE addresses most of these.

    **Q: How do you handle memory management across Kotlin/Native and Swift?**
    Kotlin/Native uses its own GC. Objects passed to Swift are bridged via Obj-C and follow ARC rules. The main risk is retain cycles in closures — always use `[weak self]` in Swift closures stored by Kotlin. Kotlin's GC handles Kotlin-side memory independently.

    **Q: CocoaPods vs SPM for distributing a KMP framework?**
    CocoaPods has first-class Gradle plugin support and handles the build-and-link cycle automatically. SPM requires building an XCFramework first and managing a separate Package.swift. CocoaPods is simpler for development; SPM is preferred if the iOS team has already moved away from CocoaPods.

!!! tip "Further Reading"
    - [Touchlab SKIE Documentation](https://skie.touchlab.co/)
    - [KMP-NativeCoroutines GitHub](https://github.com/nicklama/KMP-NativeCoroutines)
    - [Kotlin/Native Memory Manager](https://kotlinlang.org/docs/native-memory-manager.html)
    - [Kotlin Multiplatform iOS Integration Guide](https://kotlinlang.org/docs/multiplatform-ios-integration-overview.html)
