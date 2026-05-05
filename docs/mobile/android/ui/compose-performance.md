# Compose Performance

---

## Stability and Skipping

### How Skipping Works

When Compose recomposes a parent, it evaluates whether each child composable needs to re-execute. A composable is **skipped** (its body is not called) if:

1. All parameters are **stable** types
2. All parameters are **equal** to their values from the previous composition (compared via `equals()`)

If either condition fails — an unstable parameter, or a parameter that changed — the composable recomposes.

```kotlin
// This composable is SKIPPABLE — all params are stable
@Composable
fun UserBadge(name: String, score: Int) {
    Text("$name: $score")
}

// This composable is NOT SKIPPABLE — List<User> is unstable
@Composable
fun UserList(users: List<User>) {
    LazyColumn {
        items(users) { UserCard(it) }
    }
}
```

### Strong Skipping Mode

Since Compose compiler **1.5.4**, strong skipping mode is enabled by default. It relaxes the skipping rules:

- **Unstable parameters** are compared by **referential equality** (`===`). If the exact same object instance is passed, the composable skips — even though the type is unstable.
- **Lambdas** passed to composables are **automatically remembered** by the compiler. Previously, passing a lambda that captured mutable state would create a new lambda instance on every recomposition, defeating skipping.

```kotlin
// Before strong skipping:
// onClick captures 'count', so a new lambda instance is created on every
// recomposition, making ChildButton always recompose
@Composable
fun Parent() {
    var count by remember { mutableIntStateOf(0) }
    ChildButton(onClick = { count++ })  // new lambda every time
}

// With strong skipping:
// The compiler auto-remembers the lambda.
// ChildButton skips if the remembered lambda reference hasn't changed.
```

!!! note "When Strong Skipping Does Not Help"
    If you create **new object instances** in the composition body, referential equality fails every time:

    ```kotlin
    @Composable
    fun Parent() {
        // Creates a new list on every recomposition — different reference each time
        val items = listOf("a", "b", "c")
        ChildList(items = items)  // never skips, even with strong skipping
    }

    // Fix: remember the list
    val items = remember { listOf("a", "b", "c") }
    ```

### Fixing Unstable Classes

=== "ImmutableList"

    Replace `List`, `Set`, `Map` with their immutable counterparts from `kotlinx.collections.immutable`:

    ```kotlin
    // BEFORE — unstable
    data class FeedState(
        val posts: List<Post>,
        val tags: Set<String>
    )

    // AFTER — stable
    data class FeedState(
        val posts: ImmutableList<Post>,
        val tags: ImmutableSet<String>
    )
    ```

    ```kotlin
    // Dependency
    implementation("org.jetbrains.kotlinx:kotlinx-collections-immutable:0.3.7")
    ```

=== "@Stable / @Immutable"

    Annotate your classes to tell the compiler they meet stability contracts:

    ```kotlin
    // @Immutable — ALL properties will NEVER change after construction
    @Immutable
    data class ThemeColors(
        val primary: Color,
        val secondary: Color,
        val background: Color
    )

    // @Stable — equals() is reliable, changes are observable
    @Stable
    class CounterState(initialCount: Int) {
        var count by mutableIntStateOf(initialCount)
    }
    ```

=== "Stability Config File"

    For classes you cannot annotate (third-party libraries), use a **stability configuration file**:

    ```
    // compose_stability.conf
    // Treat these classes as stable
    java.time.LocalDate
    java.time.Instant
    kotlinx.datetime.*
    com.google.android.gms.maps.model.LatLng
    ```

    ```kotlin
    // build.gradle.kts
    composeCompiler {
        stabilityConfigurationFile =
            rootProject.layout.projectDirectory.file("compose_stability.conf")
    }
    ```

    This is especially useful for types like `java.time.*`, `kotlinx.datetime.*`, or Google Maps models that are effectively immutable but the compiler cannot verify.

---

## Compose Compiler Reports

The Compose compiler can generate reports showing the stability of your composables and their parameters. This is the primary tool for finding performance issues.

### Generating Reports

```kotlin
// build.gradle.kts (module level)
composeCompiler {
    reportsDestination = layout.buildDirectory.dir("compose-reports")
    metricsDestination = layout.buildDirectory.dir("compose-metrics")
}
```

Run a build, then check the output directory. You will get several files per module:

| File | Content |
|------|---------|
| `*-composables.txt` | Every composable with its restartable/skippable status |
| `*-composables.csv` | Same data in CSV format for analysis |
| `*-classes.txt` | Stability of every class used as a parameter |
| `*-module.json` | Module-level aggregate statistics |

### Reading the Reports

The composables report shows entries like:

```
restartable skippable scheme("[androidx.compose.ui.UiComposable]") fun UserBadge(
  stable name: String
  stable score: Int
)

restartable scheme("[androidx.compose.ui.UiComposable]") fun UserList(
  unstable users: List<User>
)
```

**What to look for:** composables that are `restartable` but **NOT `skippable`**. These are your optimization targets — they recompose every time their parent recomposes, even if nothing changed.

The classes report shows:

```
stable class User {
  stable val id: String
  stable val name: String
}

unstable class FeedState {
  unstable val posts: List<Post>
  stable val isLoading: Boolean
}
```

!!! tip "Prioritize by Impact"
    Not every non-skippable composable is a problem. Focus on composables that:

    1. Appear inside `LazyColumn`/`LazyRow` items (recompose per item)
    2. Have expensive bodies (complex layouts, many children)
    3. Recompose frequently (parent state changes often)

    A non-skippable `Text` wrapper is usually not worth fixing.

---

## LazyColumn / LazyRow Optimization

### Always Provide key

Without a `key`, `LazyColumn` uses the **positional index** to identify items. This means inserting or removing an item at the top causes every subsequent item to recompose because its index changed.

```kotlin
// BAD — uses index position, everything recomposes on insert/delete
LazyColumn {
    items(users) { user ->
        UserCard(user)
    }
}

// GOOD — stable identity, only changed items recompose
LazyColumn {
    items(
        items = users,
        key = { it.id }
    ) { user ->
        UserCard(user)
    }
}
```

### Provide contentType

For lists with heterogeneous item types, `contentType` improves performance by enabling **view reuse** across items of the same type. Compose can reuse the composition of a "header" item for another "header" instead of creating a new one.

```kotlin
LazyColumn {
    items(
        items = feedItems,
        key = { it.id },
        contentType = { item ->
            when (item) {
                is FeedItem.Header -> "header"
                is FeedItem.Post -> "post"
                is FeedItem.Ad -> "ad"
            }
        }
    ) { item ->
        when (item) {
            is FeedItem.Header -> HeaderCard(item)
            is FeedItem.Post -> PostCard(item)
            is FeedItem.Ad -> AdCard(item)
        }
    }
}
```

### Avoid Heavy Computation in Item Lambdas

Item lambdas execute during composition. Heavy work here blocks the UI thread and slows scrolling.

```kotlin
// BAD — formatting on every composition
LazyColumn {
    items(messages, key = { it.id }) { message ->
        val formatted = expensiveDateFormat(message.timestamp) // slow
        MessageCard(message, formatted)
    }
}

// GOOD — pre-compute in ViewModel or use remember
LazyColumn {
    items(messages, key = { it.id }) { message ->
        val formatted = remember(message.timestamp) {
            expensiveDateFormat(message.timestamp)
        }
        MessageCard(message, formatted)
    }
}
```

### LazyListState

Do not create `LazyListState` in a way that creates a new instance on recomposition:

```kotlin
// BAD — new state on every recomposition (loses scroll position)
LazyColumn(state = LazyListState()) { ... }

// GOOD — remembered state
val listState = rememberLazyListState()
LazyColumn(state = listState) { ... }
```

---

## Deferred State Reads

The most impactful Compose performance optimization is reading state in the **latest possible phase**. Compose tracks state reads per phase:

| State read in... | Triggers... |
|------------------|-------------|
| Composition | Recomposition + Layout + Draw |
| Layout | Layout + Draw |
| Draw | Draw only |

### Lambda-based Modifiers

Many modifiers have two variants — one that takes a value (read in Composition) and one that takes a lambda (deferred to Layout or Draw phase).

=== "offset"

    ```kotlin
    // Composition phase — recomposes on every change
    Modifier.offset(x = animatedX.dp, y = 0.dp)

    // Layout phase — only re-layouts, no recomposition
    Modifier.offset { IntOffset(animatedX.roundToPx(), 0) }
    ```

=== "background via drawBehind"

    ```kotlin
    // Composition phase — recomposes on every color change
    Modifier.background(animatedColor)

    // Draw phase — only redraws, no recomposition or re-layout
    Modifier.drawBehind { drawRect(animatedColor) }
    ```

=== "alpha via graphicsLayer"

    ```kotlin
    // Composition phase
    Modifier.alpha(animatedAlpha)

    // Draw phase — best for animations
    Modifier.graphicsLayer { alpha = animatedAlpha }
    ```

### Modifier.graphicsLayer

`graphicsLayer` is the go-to modifier for **animation performance**. It defers property reads to the Draw phase and can leverage hardware acceleration. Properties available:

```kotlin
Modifier.graphicsLayer {
    // All of these are read in the Draw phase only
    alpha = fadeAnimation.value
    scaleX = scaleAnimation.value
    scaleY = scaleAnimation.value
    rotationZ = rotationAnimation.value
    translationX = slideAnimation.value
    translationY = slideAnimation.value
    shadowElevation = elevationAnimation.value
}
```

Changes to `graphicsLayer` properties trigger **only a redraw** of that layer — no recomposition, no re-layout. This makes animations smooth even in complex UIs.

### Practical Example: Collapsing Toolbar

```kotlin
@Composable
fun CollapsingToolbar(scrollState: LazyListState) {
    val toolbarAlpha by remember {
        derivedStateOf {
            val offset = scrollState.firstVisibleItemScrollOffset
            val maxOffset = 300f
            (1f - (offset / maxOffset)).coerceIn(0f, 1f)
        }
    }

    // BAD — reads toolbarAlpha in Composition phase
    // Box(modifier = Modifier.alpha(toolbarAlpha))

    // GOOD — reads toolbarAlpha in Draw phase
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(56.dp)
            .graphicsLayer { alpha = toolbarAlpha }
    ) {
        Text("Toolbar")
    }
}
```

Here `derivedStateOf` reduces scroll events to meaningful alpha changes, and `graphicsLayer` ensures those changes only trigger redraws.

---

## Recomposition Debugging

### Layout Inspector

Android Studio's Layout Inspector shows **recomposition counts** and **skip counts** for each composable in real time. This is the fastest way to spot composables that recompose too often.

1. Run your app on a device/emulator
2. Open **Tools > Layout Inspector**
3. Enable **"Show Recomposition Counts"** in the toolbar
4. Interact with the app and watch the counts

Composables with high recomposition counts and low skip counts are optimization candidates.

### Composition Tracing

Compose integrates with **system tracing** (Perfetto / Android Studio Profiler). You can see exactly which composables are executing, how long they take, and what triggered them.

```kotlin
// Add tracing dependency
implementation("androidx.compose.runtime:runtime-tracing:1.0.0-beta01")

// Traces appear automatically in system traces
// Run: adb shell perfetto -o /data/misc/perfetto-traces/trace.perfetto-trace -t 10s
```

In Android Studio: **Profiler > CPU > System Trace** — you will see Compose function names in the trace.

### Recomposition Highlighter (Debug Only)

A debug-only modifier that flashes a color overlay when a composable recomposes. Useful during development to visually spot unnecessary recompositions.

```kotlin
// Add to debug builds only
fun Modifier.recompositionHighlighter(): Modifier = composed {
    val count = remember { mutableIntStateOf(0) }
    SideEffect { count.intValue++ }
    val color = remember(count.intValue) {
        Color.hsv(count.intValue * 30f % 360, 1f, 1f, 0.3f)
    }
    drawBehind { drawRect(color) }
}
```

---

## General Tips

### Use remember to Avoid Recomputation

Any computation that does not depend on recomposition-time inputs should be wrapped in `remember`:

```kotlin
// BAD — regex compiled on every recomposition
@Composable
fun EmailField(email: String) {
    val isValid = Regex("[a-zA-Z0-9+._%\\-]{1,256}@[a-zA-Z0-9][a-zA-Z0-9\\-]{0,64}(\\.[a-zA-Z0-9][a-zA-Z0-9\\-]{0,25})+")
        .matches(email)
    // ...
}

// GOOD — regex compiled once
@Composable
fun EmailField(email: String) {
    val pattern = remember {
        Regex("[a-zA-Z0-9+._%\\-]{1,256}@[a-zA-Z0-9][a-zA-Z0-9\\-]{0,64}(\\.[a-zA-Z0-9][a-zA-Z0-9\\-]{0,25})+")
    }
    val isValid = pattern.matches(email)
    // ...
}
```

### Extract Lambdas When Possible

Even with strong skipping mode auto-remembering lambdas, extracting lambdas to a stable reference is cleaner and avoids edge cases:

```kotlin
// Potentially unstable — depends on strong skipping for lambda remembering
@Composable
fun ItemList(items: ImmutableList<Item>, viewModel: ItemViewModel) {
    LazyColumn {
        items(items, key = { it.id }) { item ->
            ItemCard(
                item = item,
                onDelete = { viewModel.delete(item.id) }  // new lambda per item
            )
        }
    }
}

// Better — stable method reference
@Composable
fun ItemList(items: ImmutableList<Item>, viewModel: ItemViewModel) {
    LazyColumn {
        items(items, key = { it.id }) { item ->
            ItemCard(
                item = item,
                onDelete = viewModel::onDeleteItem  // stable reference
            )
        }
    }
}
```

### Use ImmutableList for Collection Parameters

This remains the single most common stability fix. Kotlin's `List<T>` interface does not guarantee immutability at the type level (a `MutableList` implements `List`), so the Compose compiler conservatively treats it as unstable.

```kotlin
// In your ViewModel / state holder
private val _state = MutableStateFlow(
    ScreenState(items = persistentListOf())
)

// When updating
_state.update { it.copy(items = newItems.toImmutableList()) }
```

### Baseline Profiles

Compose generates **Baseline Profiles** that tell the Android runtime (ART) which code paths to AOT-compile at install time. This reduces jank on first launch and first interactions.

The `androidx.compose` libraries ship with built-in baseline profiles. For your own composables, you can generate custom profiles:

```kotlin
// build.gradle.kts
plugins {
    id("androidx.baselineprofile")
}

dependencies {
    baselineProfile(project(":benchmark"))
}
```

Write a baseline profile generator test that exercises your critical UI paths (app startup, scrolling main feed, navigation). The generated profile is bundled in the APK and applied at install time.

!!! tip "Quick Win"
    Even without custom profiles, simply using Compose libraries gives you their built-in profiles. But for the best cold-start and scroll performance, generate profiles for your app's specific hot paths.
