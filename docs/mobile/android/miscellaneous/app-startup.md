# App Startup & Miscellaneous

## Library Initialization

| Approach | Issue |
|----------|-------|
| `Application.onCreate` | Lots of initialization code; client libraries need `Context`. |
| `ContentProvider` | Each library registers its own CP -- increases startup time; initialization order can mismatch. |
| **App Startup library** | Single `ContentProvider`; explicitly set initialization order. |

---

## App Startup Times

| Type | What happens |
|------|-------------|
| **Cold Start** | Starting from scratch: Process init --> Application --> Activity `onStart`. |
| **Warm Start** | Application already created: Activity `onCreate` --> `onStart`. |
| **Hot Start** | Activity already created: Activity `onStart`. |

!!! info "Display Metrics"

    - **Time to initial display (TTID)**: Time for the first frame to render. Android calculates this automatically.
    - **Time to full display (TTFD)**: Time for the first frame with full content. Use `reportFullyDrawn()` to mark this.

---

## GeoLocation

- Uses **Maps API** and **Google Play Services**.
- `LocationManager` and callbacks provide a `Location` object (longitude, latitude).
- Use a **Service** for background location tracking.

!!! warning "Three Permission Levels"

    | Permission | Accuracy | Notes |
    |-----------|----------|-------|
    | `ACCESS_COARSE_LOCATION` | Less accurate | Battery friendly, uses internet/cell towers. |
    | `ACCESS_FINE_LOCATION` | More accurate | Uses GPS hardware. |
    | `ACCESS_BACKGROUND_LOCATION` | Background access | Required for location access when app is not in foreground. |

---

## Is Kotlin `Int` a Primitive?

- **Non-nullable `Int`** --> compiled to JVM primitive `int`. Yes, it is primitive.
- **Nullable `Int?`** --> compiled to JVM `Integer` wrapper. No, it is not primitive.
- Even a nullable type without an actual `null` assignment gets optimized to a primitive by the compiler.

---

## StrictMode

- Catches accidental **disk or network access on the main thread**.
- Developer tool available from Developer Options.
- Should only be enabled in the **debug** build variant.

---

## Video vs GIF

- Video format is significantly smaller (e.g., a 1 MB GIF becomes ~200 KB as `.mp4` without audio).

---

## Edge to Edge (Android 15)

- App draws content **behind system bars** (status bar, navigation bar).

---

## Context

| Type | Lifecycle |
|------|-----------|
| **Application Context** | Tied to the app lifecycle. |
| **Activity Context** | Tied to the activity lifecycle. |

`Context` represents the environment and current state of the application.

---

## Application Class

- Base class and **entry point** of the app.
- Used to initialize one-time components: DI frameworks, databases, analytics, etc.

| Callback | When |
|----------|------|
| `onCreate` | Process starts. |
| `onTerminate` | Not guaranteed to be called. |
| `onLowMemory` | Older APIs for memory pressure. |
| `onTrimMemory` | More granular control over memory state. |

---

## AndroidManifest

- Critical configuration file that **bridges the app and the OS**.
- Declares: components, permissions, hardware/software feature requirements.

---

## Runtime Permissions

```
Declare in manifest
    --> checkSelfPermission()
    --> ActivityResultLauncher
    --> shouldShowRequestPermissionRationale()
```

---

## Global Crash Handling

- Set `Thread.setDefaultUncaughtExceptionHandler` in `Application.onCreate`.
- Log the crash, restart, or handle gracefully.

---

## Build Variants vs Product Flavors

!!! note "Definitions"

    - **Build Type**: Defines the environment -- `Debug`, `Release`.
    - **Product Flavor**: Defines an app variation -- Free vs Paid, or entirely different apps. Each flavor can have its own version number, name, and package ID.
    - **Build Variant** = Build Type x Product Flavor.

??? example "Variant Combinations"

    | Flavor | Build Type | Variant |
    |--------|-----------|---------|
    | Free | Debug | `freeDebug` |
    | Free | Release | `freeRelease` |
    | Paid | Debug | `paidDebug` |
    | Paid | Release | `paidRelease` |

---

## Accessibility

- Use `contentDescription` for screen readers.
- Use `sp` for font sizes (respects user font-size preferences).
- Focus management attributes like `nextFocusDown` for directional navigation.

---

## LiveData

- **Observable** data holder, **lifecycle-aware**, **thread-safe**.

| Method | Thread | Behavior |
|--------|--------|----------|
| `setValue()` | Main thread only | Synchronous |
| `postValue()` | Any thread | Asynchronous |

---

## LiveData vs StateFlow

- `StateFlow` lives in the coroutines library -- no extra dependency needed.
- Fully Kotlin, no Android framework dependency.

---

## `implementation` vs `api`

!!! tip "Dependency Visibility"

    Scenario: Library **A** depends on Library **B**. Your app depends on **A**.

    - `api`: App **can** see B's code (transitive exposure).
    - `implementation`: App **cannot** see B's code (encapsulated).

---

## Server Driven UI

- Make an API call, receive a UI contract, render UI based on that contract.

---

## React Native vs Flutter

| | React Native | Flutter |
|-|-------------|---------|
| Architecture | Bridge between native and React UI | Own rendering engine (Skia) |
| Language | JavaScript | Dart |
| Code Push | Possible | Not easy |

---

## Paging 3

**States:**

| State | Meaning |
|-------|---------|
| `Refresh` | Initial load |
| `Append` | Next page |
| `Prepend` | Previous page |

**Inner states** for each: `Loading`, `Error`, `NotLoading`.

---

## `compileSdk` vs `targetSdk` vs `minSdk`

| Property | Purpose |
|----------|---------|
| `compileSdk` | SDK version used for compilation. Cannot be greater than `targetSdk`. |
| `minSdk` | Lowest Android version the app can be installed on. |
| `targetSdk` | Version the app has been tested against. Newer OS applies backward-compat behaviors for older targets. |

---

## JWT, Encrypt vs Encode

!!! warning "JWT is signed, not encrypted"

    JWT structure: **Header** . **Payload** . **Signature**

| Concept | Secure? | Details |
|---------|---------|---------|
| **Encoding** (Base64) | No | Anyone can decode. |
| **Encryption** | Yes | Requires a secret key to decrypt. |

---

## SparseArray Advantages

- Lives in `android.util` package.
- Uses **integers as keys only**.
- More **memory-efficient** than `HashMap` (no auto-boxing of keys).
- Not as fast as `HashMap` for large datasets.

```kotlin
import android.util.SparseArray

val sparseArray = SparseArray<String>()

// Add items
sparseArray.put(1, "One")
sparseArray.put(5, "Five")
sparseArray.put(10, "Ten")

// Retrieve
val value = sparseArray.get(5) // "Five"

// Iterate
for (i in 0 until sparseArray.size()) {
    val key = sparseArray.keyAt(i)
    val v = sparseArray.valueAt(i)
    println("$key -> $v")
}
```
