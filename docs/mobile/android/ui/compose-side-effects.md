# Compose Side Effects

---

## What is a Side Effect?

In Compose, a **side effect** is any state change that is visible outside the scope of a composable function. This includes writing to a database, sending analytics events, showing a snackbar, navigating to another screen, or modifying shared mutable state.

Composable functions should ideally be **pure** — given the same inputs, they produce the same UI with no observable side effects. But real apps need side effects. Compose provides **effect handlers** — special composable functions that execute side effects in a controlled, lifecycle-aware way.

!!! warning "Why Not Just Do It Directly?"
    Composable functions can re-execute **at any time**, in **any order**, and may even be **cancelled** partway through. If you make a network call directly in a composable body, it might fire dozens of times, run when you do not expect it, or run partially. Effect handlers give you guarantees about when and how your side effects execute.

---

## Coroutine-based Effects

### LaunchedEffect

`LaunchedEffect` launches a **coroutine** that is scoped to the composition. The coroutine starts when the composable enters composition and is **cancelled** when it leaves. If the key changes, the current coroutine is cancelled and a new one is launched.

```kotlin
@Composable
fun SnackbarDemo(message: String?, snackbarHostState: SnackbarHostState) {
    // Relaunches whenever message changes
    // Cancelled when this composable leaves composition
    LaunchedEffect(message) {
        message?.let {
            snackbarHostState.showSnackbar(it)
        }
    }
}
```

**When to use:**

- One-shot operations when a composable enters composition (fetch data, show a snackbar)
- Operations that should restart when a parameter changes
- Any suspend work that should be tied to a composable's lifecycle

**Key behavior:**

- Only callable from `@Composable` context (it is itself a composable)
- Runs in the `Composition` coroutine context (main thread by default)
- Cancels via standard coroutine cancellation (cooperative — your suspend functions must check for cancellation or use cancellable suspend points)
- Multiple keys are supported: `LaunchedEffect(key1, key2) { ... }`

**Common pattern — LaunchedEffect(Unit):**

```kotlin
@Composable
fun LoadDataScreen(viewModel: MyViewModel) {
    // Unit key = runs once on first composition, never relaunches
    LaunchedEffect(Unit) {
        viewModel.loadInitialData()
    }
}
```

!!! tip "LaunchedEffect vs rememberCoroutineScope"
    `LaunchedEffect` launches immediately when composition happens. `rememberCoroutineScope` gives you a scope to launch from **callbacks**. If you need to launch on composition entry, use `LaunchedEffect`. If you need to launch from `onClick`, use `rememberCoroutineScope`.

??? example "Common Mistake: Using LaunchedEffect for Event Collection"

    ```kotlin
    // WRONG — LaunchedEffect(Unit) with a channel/SharedFlow
    // If the composable recomposes, events emitted during recomposition might be lost
    LaunchedEffect(Unit) {
        viewModel.events.collect { event ->
            when (event) {
                is NavigateEvent -> navController.navigate(event.route)
            }
        }
    }

    // CORRECT — this is actually fine for SharedFlow because LaunchedEffect(Unit)
    // runs once and collect is a long-running suspend function.
    // But be careful: if the key changes, you lose the collection.
    ```

---

### rememberCoroutineScope

Returns a `CoroutineScope` that is **tied to the composable's lifecycle**. The scope is cancelled when the composable leaves composition. Unlike `LaunchedEffect`, the scope does not launch anything automatically — you call `scope.launch {}` yourself.

```kotlin
@Composable
fun ScrollToTopButton(listState: LazyListState) {
    val scope = rememberCoroutineScope()

    Button(onClick = {
        // Launch from a callback — cannot use LaunchedEffect here
        scope.launch {
            listState.animateScrollToItem(0)
        }
    }) {
        Text("Scroll to top")
    }
}
```

**When to use:**

- Launching coroutines from **callbacks** (`onClick`, `onValueChange`, etc.)
- When you need manual control over when a coroutine starts
- When you need to launch multiple independent coroutines from the same scope

**Key behavior:**

- The scope is **not** restarted on recomposition — it persists across recompositions
- All coroutines launched in the scope are cancelled when the composable leaves composition
- The scope uses the **main dispatcher** by default

!!! warning "Do Not Launch in Composition"
    ```kotlin
    // WRONG — launches a new coroutine on every recomposition
    val scope = rememberCoroutineScope()
    scope.launch { fetchData() }  // runs during composition!

    // CORRECT — use LaunchedEffect for work triggered by composition
    LaunchedEffect(Unit) { fetchData() }
    ```

---

## Non-Coroutine Effects

### DisposableEffect

`DisposableEffect` is for **setup + cleanup** pairs. It runs a block on entering composition (or when the key changes), and you must provide an `onDispose` block that runs when the key changes or the composable leaves composition. Think of it as Compose's equivalent of `addObserver` / `removeObserver`.

```kotlin
@Composable
fun LifecycleLogger(lifecycleOwner: LifecycleOwner = LocalLifecycleOwner.current) {
    DisposableEffect(lifecycleOwner) {
        val observer = LifecycleEventObserver { _, event ->
            Log.d("Lifecycle", "Event: $event")
        }
        lifecycleOwner.lifecycle.addObserver(observer)

        onDispose {
            lifecycleOwner.lifecycle.removeObserver(observer)
        }
    }
}
```

**When to use:**

- Registering and unregistering observers, listeners, or callbacks
- Acquiring and releasing resources (sensors, camera, etc.)
- Any setup that requires a corresponding teardown

**Key behavior:**

- The `onDispose` block is **mandatory** — the compiler enforces this
- On key change: `onDispose` of the old effect runs first, then the new effect block runs
- On leaving composition: `onDispose` runs

**Execution order on key change:**

```
1. onDispose (old key) — cleanup previous
2. effect block (new key) — setup new
```

??? example "Managing a BroadcastReceiver"

    ```kotlin
    @Composable
    fun BatteryStatus() {
        val context = LocalContext.current
        var batteryLevel by remember { mutableIntStateOf(0) }

        DisposableEffect(Unit) {
            val receiver = object : BroadcastReceiver() {
                override fun onReceive(ctx: Context, intent: Intent) {
                    batteryLevel = intent.getIntExtra(
                        BatteryManager.EXTRA_LEVEL, -1
                    )
                }
            }
            val filter = IntentFilter(Intent.ACTION_BATTERY_CHANGED)
            context.registerReceiver(receiver, filter)

            onDispose {
                context.unregisterReceiver(receiver)
            }
        }

        Text("Battery: $batteryLevel%")
    }
    ```

---

### SideEffect

`SideEffect` runs after **every successful recomposition**. It has no key and no cleanup mechanism. Use it to synchronize Compose state with non-Compose code.

```kotlin
@Composable
fun UserScreen(user: User) {
    // Update analytics user property after every successful recomposition
    SideEffect {
        analytics.setUserProperty("name", user.name)
    }
    // ... UI
}
```

**When to use:**

- Syncing Compose state to non-Compose systems (analytics, logging, third-party SDKs)
- Publishing state to objects that are not backed by Compose's snapshot system

**Key behavior:**

- Runs **after** composition completes successfully — not during
- If recomposition is **cancelled** (e.g., state changed again before composition finished), the `SideEffect` does **not** run
- No cleanup — if you need cleanup, use `DisposableEffect`
- Runs on every recomposition, so keep it lightweight

!!! warning "SideEffect is Not for Suspend Work"
    `SideEffect` does not provide a coroutine scope. If you need to do async work, use `LaunchedEffect` or `rememberCoroutineScope`.

---

## State Converters

### rememberUpdatedState

Captures the **latest value** of a parameter inside a long-lived effect. Without it, a `LaunchedEffect(Unit)` would close over the initial value and never see updates.

```kotlin
@Composable
fun SplashScreen(onTimeout: () -> Unit) {
    // Capture the latest onTimeout lambda
    val currentOnTimeout by rememberUpdatedState(onTimeout)

    // LaunchedEffect(Unit) — runs once, never restarts
    LaunchedEffect(Unit) {
        delay(3000L)
        // Without rememberUpdatedState, this would call the ORIGINAL onTimeout
        // from first composition, even if the parent recomposed with a new lambda
        currentOnTimeout()
    }
}
```

**When to use:**

- Inside `LaunchedEffect(Unit)` or other long-lived effects where you reference a value that might change
- When you want the effect to always use the latest value without restarting the effect

**How it works internally:**

`rememberUpdatedState` is simply:

```kotlin
@Composable
fun <T> rememberUpdatedState(newValue: T): State<T> {
    return remember { mutableStateOf(newValue) }
        .apply { value = newValue }
}
```

It creates a `State` once and updates it on every recomposition. The effect reads `.value` at execution time, getting the latest.

---

### derivedStateOf

Creates **derived state** that only triggers recomposition when the derived value actually changes. This is the Compose equivalent of `distinctUntilChanged`.

```kotlin
@Composable
fun ChatScreen(listState: LazyListState) {
    // Without derivedStateOf: recomposes on EVERY scroll event
    // (firstVisibleItemIndex changes from 0→1→2→3→...)
    // val showButton = listState.firstVisibleItemIndex > 0

    // With derivedStateOf: only recomposes when the boolean flips
    // (false→true or true→false)
    val showButton by remember {
        derivedStateOf { listState.firstVisibleItemIndex > 0 }
    }

    if (showButton) {
        ScrollToTopButton()
    }
}
```

**When to use:**

- Converting a frequently-changing state into a less-frequently-changing derived value
- Combining multiple state objects into one derived value
- Any case where the "output" changes less often than the "input"

**Key behavior:**

- The lambda inside `derivedStateOf` runs whenever any state it reads changes
- But downstream recomposition only happens if the **result** of the lambda changes
- Must be wrapped in `remember` — otherwise you create a new `derivedStateOf` on every recomposition

!!! warning "Common Mistake: Using derivedStateOf for Simple Transformations"
    ```kotlin
    // WRONG — derivedStateOf adds overhead for no benefit
    val fullName by remember {
        derivedStateOf { "${user.firstName} ${user.lastName}" }
    }

    // CORRECT — just compute it directly (it changes at the same rate as its inputs)
    val fullName = "${user.firstName} ${user.lastName}"
    ```

    `derivedStateOf` only helps when the output changes **less frequently** than the input. If the output changes every time the input changes, you are adding overhead for no benefit.

---

### produceState

Converts **non-Compose state sources** (suspend functions, callbacks, Flows) into Compose `State`. Internally, it uses `LaunchedEffect`.

```kotlin
@Composable
fun UserProfile(userId: String, repository: UserRepository) {
    val userState by produceState<Result<User>>(
        initialValue = Result.Loading,
        key1 = userId
    ) {
        value = Result.Loading
        try {
            val user = repository.getUser(userId)
            value = Result.Success(user)
        } catch (e: Exception) {
            value = Result.Error(e)
        }
    }

    when (val state = userState) {
        is Result.Loading -> CircularProgressIndicator()
        is Result.Success -> UserContent(state.data)
        is Result.Error -> ErrorMessage(state.exception)
    }
}
```

**When to use:**

- Converting a suspend function result into Compose state
- Converting a callback-based API into Compose state
- When you want a self-contained state producer tied to composition

**Collecting a Flow inside produceState:**

```kotlin
val currentWeather by produceState<Weather>(
    initialValue = Weather.Loading,
    key1 = cityId
) {
    weatherRepository.getWeatherFlow(cityId)
        .collect { value = it }
}
```

!!! tip "produceState vs collectAsStateWithLifecycle"
    For Flows, prefer `collectAsStateWithLifecycle()` — it is more concise and handles lifecycle automatically. Use `produceState` when you have a suspend function or callback-based API, not a Flow.

---

### snapshotFlow

Converts **Compose State reads** into a cold **Flow**. This lets you apply Flow operators (debounce, filter, map, distinctUntilChanged) to Compose state changes.

```kotlin
@Composable
fun AnalyticsTracker(listState: LazyListState) {
    LaunchedEffect(listState) {
        snapshotFlow { listState.firstVisibleItemIndex }
            .debounce(500L)
            .distinctUntilChanged()
            .collect { index ->
                analytics.trackScrollPosition(index)
            }
    }
}
```

**When to use:**

- Applying Flow operators to state changes (debounce, throttle, filter)
- Bridging Compose state into Flow-based systems
- Performing work when state crosses a threshold

**How it works:**

- `snapshotFlow` takes a lambda that reads Compose `State` objects
- It creates a Flow that re-evaluates the lambda whenever any read state changes
- It emits a new value to the Flow if the result changes

**Another example — saving state on change with debounce:**

```kotlin
@Composable
fun NoteEditor(viewModel: NoteViewModel) {
    var text by remember { mutableStateOf("") }

    LaunchedEffect(Unit) {
        snapshotFlow { text }
            .debounce(1000L)          // wait 1s after typing stops
            .collect { currentText ->
                viewModel.saveDraft(currentText)
            }
    }

    TextField(value = text, onValueChange = { text = it })
}
```

---

## Effect Lifecycle Summary

| Effect | Trigger | Cancellation | Cleanup | Coroutine? |
|--------|---------|-------------|---------|------------|
| `LaunchedEffect(key)` | Enter composition / key change | Leave composition / key change | Coroutine cancellation | Yes |
| `rememberCoroutineScope` | Manual `scope.launch {}` | Leave composition | Coroutine cancellation | Yes |
| `DisposableEffect(key)` | Enter composition / key change | N/A | `onDispose {}` block | No |
| `SideEffect` | Every successful recomposition | N/A (skipped if cancelled) | None | No |
| `produceState` | Enter composition / key change | Leave composition / key change | Coroutine cancellation | Yes (internal) |
