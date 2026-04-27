# Jetpack Compose

---

## Basics

- **Not built into `android.jar`** — requires adding a dependency. Composable functions are the alternative to traditional Views.
- **Modifiers**: Used for layouting and styling UI elements.
- **`remember`**: Caches a value across recompositions (scoped to the composable function).
- **`mutableStateOf`**: Triggers recomposition when the value changes. Reads to state are subscribed to the nearest composable scope.
- **`rememberSaveable`**: Saves state across configuration changes and when items leave composition (e.g., scrolling out of a `LazyRow`/`LazyColumn`).
- **State Hoisting**: Moving state out of a composable to its caller, making the composable stateless. Follows unidirectional data flow — pass state down, get events up.
- **Recomposition**: Android calling the composable function again when state changes. You cannot control when recomposition happens.
- **`observeAsState` / `collectAsState`**: Observe ViewModel `LiveData` / `Flow` directly — no need for `remember` + `mutableStateOf`.
- **Composition Phases**: Compose → Layout (measure children, decide size, place children) → Drawing.
- **Side Effects**: Calling non-composable code from a composable. Recomposition can cause unexpected calls.
- **ViewCompositionStrategy**: Compose disposes when `ComposeView` detaches. In fragments, must follow the fragment view lifecycle using `DisposeOnViewTreeLifecycleDestroyed`.
- **CompositionLocal**: Provides data to lower hierarchy without passing it explicitly (e.g., `MaterialTheme`, `LocalContext`).

??? example "CompositionLocal Example"

    ```kotlin
    val localClass = compositionLocalOf { MyClass() }

    CompositionLocalProvider(localClass provides MyClass()) {
        // composables here have access to localClass.current
    }
    ```

---

## Lifecycle of a Composable

- **Enter Composition → Recompose 0+ times → Leave Composition**
- **Call site**: The source code location where a composable is called. Compose uses call sites to identify composables.
- Use `key(uniqueId) {}` to prevent unnecessary recomposition when the call site is the same but the identity should differ.
- Compose uses `@equals` for comparison to decide if recomposition is needed. Use `@Stable` annotation for non-primitive or non-data classes to help the compiler optimize.

---

## Side Effects — Effect Handlers

### Suspend

=== "LaunchedEffect"

    Called on first composition or when the key changes. Can call both suspend and non-suspend functions. Only available from composable context.

    ```kotlin
    LaunchedEffect(key) {
        // suspend work here
    }
    ```

=== "rememberCoroutineScope"

    Has the composable's lifecycle. Use `scope.launch {}` to launch coroutines from callbacks (non-composable context like `onClick`).

    ```kotlin
    val scope = rememberCoroutineScope()
    Button(onClick = {
        scope.launch {
            // suspend work here
        }
    }) { }
    ```

### Non-Suspend

=== "DisposableEffect"

    `onDispose` is called when the key changes or the composable leaves composition. Used for observers, listeners, and cleanup.

    ```kotlin
    DisposableEffect(key) {
        val observer = LifecycleEventObserver { ... }
        lifecycle.addObserver(observer)
        onDispose {
            lifecycle.removeObserver(observer)
        }
    }
    ```

=== "SideEffect"

    Runs on **every successful recomposition**. No key parameter. A cancelled recomposition will not trigger it.

    ```kotlin
    SideEffect {
        // runs after every successful recomposition
    }
    ```

---

## Side Effect States

- **`rememberUpdatedState`**: If used inside `LaunchedEffect(Unit)` and the value changes during delayed work, the state is updated with the latest value. Prevents needing to restart the effect.

    ```kotlin
    val currentOnTimeout by rememberUpdatedState(onTimeout)
    LaunchedEffect(Unit) {
        delay(5000)
        currentOnTimeout() // always calls the latest lambda
    }
    ```

- **`derivedStateOf`**: Like `distinctUntilChanged` — minimizes recomposition by only updating when the derived value actually changes.

    ```kotlin
    val showButton by remember {
        derivedStateOf { listState.firstVisibleItemIndex > 0 }
    }
    ```

- **`produceState`**: Convert non-Compose state (e.g., a repository call) into Compose state.

    ```kotlin
    val uiState by produceState<UiState>(initialValue = Loading) {
        value = repository.fetchData()
    }
    ```

- **`snapshotFlow`**: Convert Compose state to a Flow.

    ```kotlin
    LaunchedEffect(Unit) {
        snapshotFlow { listState.firstVisibleItemIndex }
            .collect { index -> analytics.trackScroll(index) }
    }
    ```

---

## Navigation

- **Routes** = String path to a composable destination.
- Each destination has a unique route.
- Think of routes as implicit deep links.

```kotlin
NavHost(navController, startDestination = "home") {
    composable("home") { HomeScreen() }
    composable("detail/{id}") { backStackEntry ->
        DetailScreen(backStackEntry.arguments?.getString("id"))
    }
}
```
