# Compose Common Snippets

---

Production-ready Jetpack Compose snippets for UI patterns you'll build in almost every app. Each composable is self-contained with minimal dependencies.

## Time Ago Text

Displays a human-readable relative timestamp that updates automatically.

```kotlin
@Composable
fun TimeAgoText(
    timestamp: Long,
    modifier: Modifier = Modifier,
    style: TextStyle = MaterialTheme.typography.bodySmall,
    prefix: String = "",
    suffix: String = " ago"
) {
    val timeAgo by produceState(initialValue = "", key1 = timestamp) {
        while (true) {
            value = formatTimeAgo(timestamp)
            delay(60_000)
        }
    }

    Text(
        text = "$prefix$timeAgo$suffix",
        style = style,
        modifier = modifier
    )
}

private fun formatTimeAgo(timestamp: Long): String {
    val now = System.currentTimeMillis()
    val diff = now - timestamp
    val seconds = diff / 1000
    val minutes = seconds / 60
    val hours = minutes / 60
    val days = hours / 24

    return when {
        seconds < 60 -> "just now"
        minutes < 60 -> "${minutes}m"
        hours < 24 -> "${hours}h"
        days < 7 -> "${days}d"
        days < 30 -> "${days / 7}w"
        days < 365 -> "${days / 30}mo"
        else -> "${days / 365}y"
    }
}
```

Usage:

```kotlin
TimeAgoText(
    timestamp = message.createdAt,
    style = MaterialTheme.typography.labelSmall,
    prefix = "Posted "
)
// Renders: "Posted 3h ago"
```

## Debounced Click

Prevents accidental double-taps by ignoring rapid successive clicks.

```kotlin
@Composable
fun DebouncedClickable(
    onClick: () -> Unit,
    debounceMs: Long = 500L,
    modifier: Modifier = Modifier,
    content: @Composable () -> Unit
) {
    var lastClickTime by remember { mutableLongStateOf(0L) }

    Box(
        modifier = modifier.clickable {
            val now = System.currentTimeMillis()
            if (now - lastClickTime >= debounceMs) {
                lastClickTime = now
                onClick()
            }
        }
    ) {
        content()
    }
}

fun Modifier.debouncedClickable(
    debounceMs: Long = 500L,
    onClick: () -> Unit
): Modifier = composed {
    var lastClickTime by remember { mutableLongStateOf(0L) }
    clickable {
        val now = System.currentTimeMillis()
        if (now - lastClickTime >= debounceMs) {
            lastClickTime = now
            onClick()
        }
    }
}
```

## Shimmer Loading Placeholder

A shimmer effect for skeleton loading screens.

```kotlin
@Composable
fun ShimmerBox(
    modifier: Modifier = Modifier,
    shape: Shape = RoundedCornerShape(8.dp)
) {
    val shimmerColors = listOf(
        Color.LightGray.copy(alpha = 0.6f),
        Color.LightGray.copy(alpha = 0.2f),
        Color.LightGray.copy(alpha = 0.6f),
    )

    val transition = rememberInfiniteTransition(label = "shimmer")
    val translateAnim by transition.animateFloat(
        initialValue = 0f,
        targetValue = 1000f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 1200, easing = LinearEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "shimmer_translate"
    )

    val brush = Brush.linearGradient(
        colors = shimmerColors,
        start = Offset(translateAnim - 200f, 0f),
        end = Offset(translateAnim, 0f)
    )

    Box(
        modifier = modifier
            .clip(shape)
            .background(brush)
    )
}

// Usage: loading skeleton for a list item
@Composable
fun ListItemSkeleton() {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(16.dp),
        horizontalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        ShimmerBox(
            modifier = Modifier.size(48.dp),
            shape = CircleShape
        )
        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            ShimmerBox(modifier = Modifier.fillMaxWidth(0.6f).height(14.dp))
            ShimmerBox(modifier = Modifier.fillMaxWidth(0.4f).height(14.dp))
        }
    }
}
```

## Expandable Text

Shows truncated text with a "Show more" toggle.

```kotlin
@Composable
fun ExpandableText(
    text: String,
    modifier: Modifier = Modifier,
    maxLines: Int = 3,
    style: TextStyle = MaterialTheme.typography.bodyMedium,
    expandLabel: String = "Show more",
    collapseLabel: String = "Show less"
) {
    var expanded by rememberSaveable { mutableStateOf(false) }
    var hasOverflow by remember { mutableStateOf(false) }

    Column(modifier = modifier) {
        Text(
            text = text,
            style = style,
            maxLines = if (expanded) Int.MAX_VALUE else maxLines,
            overflow = TextOverflow.Ellipsis,
            onTextLayout = { result ->
                hasOverflow = result.hasVisualOverflow
            }
        )

        if (hasOverflow || expanded) {
            Text(
                text = if (expanded) collapseLabel else expandLabel,
                style = style.copy(
                    color = MaterialTheme.colorScheme.primary,
                    fontWeight = FontWeight.Medium
                ),
                modifier = Modifier
                    .padding(top = 4.dp)
                    .clickable { expanded = !expanded }
            )
        }
    }
}
```

## Search Bar with Debounce

A search field that waits for the user to stop typing before triggering the query.

```kotlin
@Composable
fun DebouncedSearchBar(
    onSearch: (String) -> Unit,
    modifier: Modifier = Modifier,
    debounceMs: Long = 400L,
    placeholder: String = "Search..."
) {
    var query by rememberSaveable { mutableStateOf("") }

    LaunchedEffect(query) {
        if (query.isBlank()) {
            onSearch("")
            return@LaunchedEffect
        }
        delay(debounceMs)
        onSearch(query)
    }

    OutlinedTextField(
        value = query,
        onValueChange = { query = it },
        modifier = modifier.fillMaxWidth(),
        placeholder = { Text(placeholder) },
        leadingIcon = {
            Icon(Icons.Default.Search, contentDescription = "Search")
        },
        trailingIcon = {
            if (query.isNotEmpty()) {
                IconButton(onClick = { query = "" }) {
                    Icon(Icons.Default.Clear, contentDescription = "Clear")
                }
            }
        },
        singleLine = true,
        shape = RoundedCornerShape(12.dp)
    )
}
```

## Conditional Modifier

Apply modifiers only when a condition is true.

```kotlin
fun Modifier.conditional(
    condition: Boolean,
    ifTrue: Modifier.() -> Modifier,
    ifFalse: (Modifier.() -> Modifier)? = null
): Modifier =
    if (condition) ifTrue()
    else ifFalse?.invoke(this) ?: this

// Usage
Box(
    modifier = Modifier
        .fillMaxWidth()
        .conditional(isSelected) {
            border(2.dp, Color.Blue, RoundedCornerShape(8.dp))
        }
)
```

## Pull-to-Refresh Wrapper

```kotlin
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PullToRefreshBox(
    isRefreshing: Boolean,
    onRefresh: () -> Unit,
    modifier: Modifier = Modifier,
    content: @Composable BoxScope.() -> Unit
) {
    val state = rememberPullToRefreshState()

    Box(
        modifier = modifier.nestedScroll(state.nestedScrollConnection)
    ) {
        content()

        PullToRefreshContainer(
            state = state,
            modifier = Modifier.align(Alignment.TopCenter)
        )
    }

    LaunchedEffect(isRefreshing) {
        if (isRefreshing) state.startRefresh()
        else state.endRefresh()
    }

    LaunchedEffect(state.isRefreshing) {
        if (state.isRefreshing) onRefresh()
    }
}
```

## Keyboard-Aware Spacing

Adds space at the bottom of a screen so content isn't hidden behind the keyboard.

```kotlin
@Composable
fun KeyboardAwareSpacer() {
    val imeInsets = WindowInsets.ime
    val density = LocalDensity.current
    val imeHeight = with(density) { imeInsets.getBottom(density).toDp() }

    Spacer(modifier = Modifier.height(imeHeight))
}

// Usage in a Column
Column(modifier = Modifier.verticalScroll(rememberScrollState())) {
    // ... form fields
    KeyboardAwareSpacer()
}
```

## Empty State

A reusable empty/error state placeholder.

```kotlin
@Composable
fun EmptyState(
    icon: ImageVector,
    title: String,
    description: String,
    modifier: Modifier = Modifier,
    action: (@Composable () -> Unit)? = null
) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .padding(32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            modifier = Modifier.size(64.dp),
            tint = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.4f)
        )
        Text(
            text = title,
            style = MaterialTheme.typography.titleMedium,
            textAlign = TextAlign.Center
        )
        Text(
            text = description,
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
            textAlign = TextAlign.Center
        )
        action?.invoke()
    }
}

// Usage
EmptyState(
    icon = Icons.Default.Inbox,
    title = "No messages yet",
    description = "Start a conversation to see your messages here."
) {
    Button(onClick = { /* ... */ }) {
        Text("Start Chat")
    }
}
```

## Circular Progress with Percentage

```kotlin
@Composable
fun CircularProgressWithLabel(
    progress: Float,
    modifier: Modifier = Modifier,
    strokeWidth: Dp = 8.dp,
    color: Color = MaterialTheme.colorScheme.primary,
    trackColor: Color = MaterialTheme.colorScheme.surfaceVariant
) {
    Box(modifier = modifier, contentAlignment = Alignment.Center) {
        CircularProgressIndicator(
            progress = { progress },
            modifier = Modifier.fillMaxSize(),
            strokeWidth = strokeWidth,
            color = color,
            trackColor = trackColor
        )
        Text(
            text = "${(progress * 100).toInt()}%",
            style = MaterialTheme.typography.labelLarge
        )
    }
}

// Usage
CircularProgressWithLabel(
    progress = 0.72f,
    modifier = Modifier.size(80.dp)
)
```

## Avatar with Fallback Initials

```kotlin
@Composable
fun Avatar(
    imageUrl: String?,
    name: String,
    modifier: Modifier = Modifier,
    size: Dp = 40.dp
) {
    val initials = remember(name) {
        name.split(" ")
            .take(2)
            .mapNotNull { it.firstOrNull()?.uppercaseChar() }
            .joinToString("")
    }

    if (imageUrl != null) {
        AsyncImage(
            model = imageUrl,
            contentDescription = name,
            modifier = modifier
                .size(size)
                .clip(CircleShape),
            contentScale = ContentScale.Crop
        )
    } else {
        Box(
            modifier = modifier
                .size(size)
                .clip(CircleShape)
                .background(MaterialTheme.colorScheme.primaryContainer),
            contentAlignment = Alignment.Center
        ) {
            Text(
                text = initials,
                style = MaterialTheme.typography.labelMedium,
                color = MaterialTheme.colorScheme.onPrimaryContainer
            )
        }
    }
}
```

## Scroll-Aware FAB Visibility

A FAB that hides when the user scrolls down and reappears on scroll up.

```kotlin
@Composable
fun ScrollAwareFab(
    listState: LazyListState,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    icon: ImageVector = Icons.Default.Add
) {
    val isVisible by remember {
        derivedStateOf {
            listState.firstVisibleItemIndex == 0 ||
                listState.lastScrolledBackward
        }
    }

    AnimatedVisibility(
        visible = isVisible,
        enter = slideInVertically(initialOffsetY = { it }) + fadeIn(),
        exit = slideOutVertically(targetOffsetY = { it }) + fadeOut(),
        modifier = modifier
    ) {
        FloatingActionButton(onClick = onClick) {
            Icon(icon, contentDescription = "Add")
        }
    }
}

val LazyListState.lastScrolledBackward: Boolean
    @Composable get() {
        var lastIndex by remember { mutableIntStateOf(firstVisibleItemIndex) }
        var lastOffset by remember { mutableIntStateOf(firstVisibleItemScrollOffset) }
        var scrollingBackward by remember { mutableStateOf(false) }

        LaunchedEffect(firstVisibleItemIndex, firstVisibleItemScrollOffset) {
            scrollingBackward = firstVisibleItemIndex < lastIndex ||
                (firstVisibleItemIndex == lastIndex &&
                    firstVisibleItemScrollOffset < lastOffset)
            lastIndex = firstVisibleItemIndex
            lastOffset = firstVisibleItemScrollOffset
        }

        return scrollingBackward
    }
```

## Snackbar with Action

A `remember`-able snackbar host pattern for showing messages with actions.

```kotlin
@Composable
fun rememberSnackbarAction(
    snackbarHostState: SnackbarHostState = remember { SnackbarHostState() }
): SnackbarAction {
    val scope = rememberCoroutineScope()
    return remember(snackbarHostState, scope) {
        SnackbarAction(snackbarHostState, scope)
    }
}

class SnackbarAction(
    val hostState: SnackbarHostState,
    private val scope: CoroutineScope
) {
    fun show(
        message: String,
        actionLabel: String? = null,
        onAction: (() -> Unit)? = null,
        duration: SnackbarDuration = SnackbarDuration.Short
    ) {
        scope.launch {
            val result = hostState.showSnackbar(
                message = message,
                actionLabel = actionLabel,
                duration = duration
            )
            if (result == SnackbarResult.ActionPerformed) {
                onAction?.invoke()
            }
        }
    }
}

// Usage
val snackbar = rememberSnackbarAction()

Scaffold(snackbarHost = { SnackbarHost(snackbar.hostState) }) {
    Button(onClick = {
        snackbar.show(
            message = "Item deleted",
            actionLabel = "Undo",
            onAction = { viewModel.undoDelete() }
        )
    }) {
        Text("Delete")
    }
}
```

## Quick Reference

| Snippet | Use Case | Key API |
|---|---|---|
| `TimeAgoText` | Social feeds, messages | `produceState`, `delay` |
| `DebouncedClickable` | Buttons, list items | `mutableLongStateOf` |
| `ShimmerBox` | Loading skeletons | `infiniteTransition`, `Brush` |
| `ExpandableText` | Long descriptions, bios | `onTextLayout`, `hasVisualOverflow` |
| `DebouncedSearchBar` | Search screens | `LaunchedEffect`, `delay` |
| `PullToRefreshBox` | List screens | `PullToRefreshState` |
| `EmptyState` | Empty lists, error screens | Slot-based composable |
| `CircularProgressWithLabel` | Upload, download progress | `CircularProgressIndicator` |
| `Avatar` | User profiles, chat | `AsyncImage`, fallback initials |
| `ScrollAwareFab` | List screens with FAB | `derivedStateOf`, `AnimatedVisibility` |
| `SnackbarAction` | Undo, confirmations | `SnackbarHostState` |

??? question "Common Interview Questions"

    **Q: Why use `produceState` in `TimeAgoText` instead of a ViewModel?**

    `produceState` ties the coroutine lifecycle to the composable's lifecycle — when the composable leaves composition, the coroutine is cancelled automatically. For UI-only derived state like "time ago," pushing this to a ViewModel adds unnecessary complexity. The composable is the right scope.

    **Q: How does the shimmer animation avoid recomposition overhead?**

    `animateFloat` with `infiniteTransition` uses Compose's animation system, which updates via `Modifier.background()` — a layout-phase operation, not a recomposition trigger. The `Brush` is recalculated efficiently without recomposing the content tree.

    **Q: Why use `rememberSaveable` in search bar but `remember` elsewhere?**

    `rememberSaveable` survives configuration changes (rotation, process death). Search query text is user input that should persist. Internal state like `lastClickTime` or `hasOverflow` is transient and can be safely reset — `remember` is sufficient.

    **Q: What's the problem with `Modifier.clickable {}` for preventing double clicks?**

    Compose's `clickable` fires on every tap with no built-in debounce. Rapid taps can trigger navigation twice, submit a form twice, or launch duplicate coroutines. The `debouncedClickable` modifier adds a timestamp check with zero overhead when not clicking.

    **Q: Why use `derivedStateOf` in `ScrollAwareFab`?**

    `derivedStateOf` caches its value and only triggers recomposition when the derived result changes, not when the inputs change. Without it, every scroll pixel would recompose the FAB visibility check. With it, recomposition only happens on actual visibility transitions.

!!! tip "Further Reading"
    - [Compose Side Effects Guide](https://developer.android.com/develop/ui/compose/side-effects)
    - [State and Jetpack Compose](https://developer.android.com/develop/ui/compose/state)
    - [Compose Performance Best Practices](https://developer.android.com/develop/ui/compose/performance)
    - [Compose Animation](https://developer.android.com/develop/ui/compose/animation/introduction)
