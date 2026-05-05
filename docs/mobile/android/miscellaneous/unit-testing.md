# Unit Testing

## Fundamentals

- **Testing** = finding as many bugs as possible before users do
- **Unit Testing** = testing the smallest unit — a method, a class, or a component in isolation
- **ViewModel should be independent of `android.jar`** so it can be tested on the JVM without a device
- **Inject dependencies** — create interfaces (`Logger`, `Dispatcher`) with separate production and test implementations

---

## Types of Tests

| Type | Runs On | Directory | Speed |
|------|---------|-----------|-------|
| **Local (unit)** | JVM | `test/` | Fast (~ms per test) |
| **Instrumented** | Device / Emulator | `androidTest/` | Slow (~seconds per test) |

### Testing Pyramid

```
        /  E2E  \        ← Few, slow, flaky
       / Integration \   ← Moderate — API + DB + real components
      /   Unit Tests   \ ← Many, fast, reliable
```

!!! warning "Common anti-pattern"
    Testing the implementation instead of the behavior. Don't verify that `repository.getUsers()` was called exactly once — verify that the **screen shows the user list**. Tests should survive refactors.

---

## Libraries

| Library | Purpose |
|---------|---------|
| **JUnit 4/5** | Assertions and test lifecycle |
| **Mockito / mockito-kotlin** | Mocking dependencies (Java-centric) |
| **MockK** | Kotlin-native mocking (coroutines, extension functions, top-level functions) |
| **Turbine** | Testing Kotlin `Flow` emissions |
| **Robolectric** | Runs Android framework tests on JVM without an emulator |
| **Espresso** | View testing (XML-based UI) |
| **Compose UI Test** | Compose semantics-based UI testing |
| **Paparazzi** | Screenshot testing on JVM (no device) |

---

## Test Doubles

!!! tip "Quick Reference"

    | Double | Description |
    |--------|-------------|
    | **Fake** | A working implementation that takes shortcuts (e.g., `HashMap` instead of a SQL database). |
    | **Stub** | Returns predefined answers — just returns whatever it is told. |
    | **Mock** | Pre-programmed with **expectations** about the calls it should receive. |

??? example "Fake vs Stub vs Mock"

    === "Fake"

        A `FakeUserRepository` backed by an in-memory map:

        ```kotlin
        class FakeUserRepository : UserRepository {
            private val users = mutableMapOf<String, User>()

            override suspend fun getUser(id: String): User? = users[id]
            override suspend fun saveUser(user: User) { users[user.id] = user }
        }
        ```

    === "Stub"

        A stub that always returns the same user:

        ```kotlin
        class StubUserRepository : UserRepository {
            override suspend fun getUser(id: String): User = User("stub-id", "Stub User")
            override suspend fun saveUser(user: User) { /* no-op */ }
        }
        ```

    === "Mock (MockK)"

        Using MockK to verify interactions:

        ```kotlin
        val mockRepo = mockk<UserRepository>()
        coEvery { mockRepo.getUser("123") } returns User("123", "Mock User")

        // ... run code under test ...

        coVerify { mockRepo.getUser("123") }
        ```

!!! tip "Staff POV: Fakes > Mocks"
    Fakes test **behavior**, mocks test **implementation**. If you refactor how a method is called internally, mock-based tests break even though behavior didn't change. Use fakes for repositories and data sources. Reserve mocks for verifying side effects (analytics, logging).

---

## Test Naming Conventions

Two common styles — pick one and stay consistent across the project:

=== "Underscore Style"

    ```kotlin
    @Test
    fun loadUsers_emptyList_showsEmptyState() { ... }

    @Test
    fun login_invalidPassword_returnsError() { ... }
    ```

    Pattern: `methodName_condition_expectedResult`

=== "Backtick Style"

    ```kotlin
    @Test
    fun `load users with empty list shows empty state`() { ... }

    @Test
    fun `login with invalid password returns error`() { ... }
    ```

    More readable, Kotlin-only (backticks are not valid in Java).

---

## What to Test in Each Layer

| Layer | What to Test | Test Double |
|-------|-------------|-------------|
| **ViewModel** | State transitions, error handling, loading states | Fake Repository |
| **UseCase** | Business logic, validation, edge cases | Fake Repository |
| **Repository** | Data mapping, cache logic, source selection | Fake API / Fake DAO |
| **Mapper** | Input → output correctness | None (pure functions) |

---

## Testing Coroutines

### StandardTestDispatcher vs UnconfinedTestDispatcher

| Dispatcher | Execution Model | Use When |
|-----------|----------------|----------|
| `StandardTestDispatcher` | Paused — coroutines do not run until you call `advanceUntilIdle()`, `runCurrent()`, or `advanceTimeBy()` | You need precise control over coroutine timing |
| `UnconfinedTestDispatcher` | Eager — coroutines run immediately without explicit advancement | Simple tests where execution order does not matter |

```kotlin
@Test
fun `standard dispatcher requires explicit advancement`() = runTest {
    val dispatcher = StandardTestDispatcher(testScheduler)
    var result = ""

    launch(dispatcher) { result = "done" }

    assertEquals("", result)         // not yet executed
    advanceUntilIdle()
    assertEquals("done", result)     // now it ran
}

@Test
fun `unconfined dispatcher runs eagerly`() = runTest {
    val dispatcher = UnconfinedTestDispatcher(testScheduler)
    var result = ""

    launch(dispatcher) { result = "done" }

    assertEquals("done", result)     // already executed
}
```

### MainDispatcherRule

Replace `Dispatchers.Main` in ViewModel tests:

```kotlin
class MainDispatcherRule(
    private val dispatcher: TestDispatcher = UnconfinedTestDispatcher()
) : TestWatcher() {
    override fun starting(description: Description) {
        Dispatchers.setMain(dispatcher)
    }
    override fun finished(description: Description) {
        Dispatchers.resetMain()
    }
}

@OptIn(ExperimentalCoroutinesApi::class)
class UserViewModelTest {

    @get:Rule
    val mainDispatcherRule = MainDispatcherRule()

    @Test
    fun `load users updates state`() = runTest {
        val fakeRepo = FakeUserRepository(listOf(User("1", "Sandy")))
        val viewModel = UserViewModel(fakeRepo)

        viewModel.loadUsers()

        assertEquals(listOf(User("1", "Sandy")), viewModel.state.value.users)
    }
}
```

---

## Testing Flows with Turbine

```kotlin
@Test
fun `search emits loading then results`() = runTest {
    val viewModel = SearchViewModel(FakeSearchRepo())

    viewModel.results.test {
        viewModel.search("kotlin")
        assertEquals(SearchState.Loading, awaitItem())
        assertEquals(SearchState.Success(listOf("Kotlin Coroutines")), awaitItem())
        cancelAndConsumeRemainingEvents()
    }
}
```

---

## MockK

Kotlin-native mocking library that supports coroutines, extension functions, and top-level functions — things Mockito struggles with.

```kotlin
// Basic mock
val repo = mockk<UserRepository>()
every { repo.getUser("1") } returns User("1", "Sandy")

// Coroutine mock
coEvery { repo.fetchUsers() } returns listOf(User("1", "Sandy"))

// Relaxed mock — returns default values for unconfigured calls
val logger = mockk<Logger>(relaxed = true)

// Verify
verify(exactly = 1) { logger.log(any()) }
coVerify { repo.fetchUsers() }

// Extension function mock
mockkStatic("com.example.ExtensionsKt")
every { any<String>().toSlug() } returns "mocked-slug"
```

---

## Robolectric

Runs Android framework code on the JVM by providing shadow implementations of Android classes. Tests run in seconds instead of minutes.

```kotlin
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class MainActivityTest {

    @Test
    fun `activity displays title`() {
        val activity = Robolectric.buildActivity(MainActivity::class.java)
            .create()
            .start()
            .resume()
            .get()

        val title = activity.findViewById<TextView>(R.id.title)
        assertEquals("Welcome", title.text.toString())
    }
}
```

**When to use Robolectric vs instrumented tests:**

| Use Robolectric | Use Instrumented |
|----------------|-----------------|
| Testing Android components that don't need real hardware | Testing camera, sensors, Bluetooth |
| Fast CI feedback loops | Visual UI validation |
| Unit-testing Activities, Fragments, Services | Testing real database performance |
| Most `android.*` API surface | Platform-specific behavior differences |

---

## Testing Hilt

```kotlin
@HiltAndroidTest
@UninstallModules(RepositoryModule::class)  // remove production module
@RunWith(AndroidJUnit4::class)
class UserViewModelTest {

    @get:Rule(order = 0)
    val hiltRule = HiltAndroidRule(this)

    @get:Rule(order = 1)
    val mainDispatcherRule = MainDispatcherRule()

    @BindValue  // inject this instead of the real repository
    val fakeRepo: UserRepository = FakeUserRepository()

    @Inject
    lateinit var viewModel: UserViewModel

    @Before
    fun setup() {
        hiltRule.inject()
    }

    @Test
    fun `loads users from fake repo`() = runTest {
        viewModel.loadUsers()
        assertEquals(UiState.Success(fakeUsers), viewModel.state.value)
    }
}
```

| Annotation | Purpose |
|------------|---------|
| `@HiltAndroidTest` | Enables Hilt injection in the test class |
| `@UninstallModules` | Removes specific production modules from the DI graph |
| `@BindValue` | Binds a field directly into the DI graph (replaces a binding) |
| `HiltAndroidRule` | Triggers Hilt injection when `inject()` is called |

---

## Testing Navigation

```kotlin
@Test
fun `clicking login navigates to home`() {
    val navController = TestNavHostController(ApplicationProvider.getApplicationContext())

    composeTestRule.setContent {
        navController.navigatorProvider.addNavigator(ComposeNavigator())
        navController.setGraph(R.navigation.main_nav_graph)

        NavHost(navController = navController, startDestination = "login") {
            composable("login") { LoginScreen(navController) }
            composable("home") { HomeScreen() }
        }
    }

    composeTestRule.onNodeWithText("Login").performClick()
    assertEquals("home", navController.currentBackStackEntry?.destination?.route)
}
```

---

## Compose UI Testing

Compose tests interact with the **semantics tree**, not view hierarchy.

```kotlin
@get:Rule
val composeTestRule = createComposeRule()

@Test
fun `shows user name and handles click`() {
    var clicked = false
    composeTestRule.setContent {
        UserCard(
            user = User("1", "Sandy"),
            onClick = { clicked = true }
        )
    }

    // Find by text
    composeTestRule.onNodeWithText("Sandy").assertIsDisplayed()

    // Find by test tag
    composeTestRule.onNodeWithTag("user_card").assertExists()

    // Perform action
    composeTestRule.onNodeWithText("Sandy").performClick()
    assertTrue(clicked)

    // Scroll and assert
    composeTestRule.onNodeWithTag("user_list").performScrollToIndex(5)
    composeTestRule.onNodeWithText("User 5").assertIsDisplayed()
}
```

### Key Assertions and Finders

| Finder | Usage |
|--------|-------|
| `onNodeWithText("...")` | Find by displayed text |
| `onNodeWithTag("...")` | Find by `Modifier.testTag("...")` |
| `onNodeWithContentDescription("...")` | Find by accessibility label |
| `onAllNodesWithText("...")` | Find multiple matches |

| Assertion | Usage |
|-----------|-------|
| `assertIsDisplayed()` | Node is visible on screen |
| `assertExists()` | Node exists in the semantics tree (may be off-screen) |
| `assertDoesNotExist()` | Node is not in the tree |
| `assertIsEnabled()` / `assertIsNotEnabled()` | Enabled state |
| `assertTextEquals("...")` | Exact text match |

!!! tip "Use `testTag` for stable selectors"
    Text changes with localization. Content descriptions change with UX updates. Test tags are stable identifiers that only exist for testing. Always use `Modifier.testTag("...")` for nodes you need to find reliably.

---

## Screenshot Testing

### Paparazzi (JVM, no device)

Renders Compose/View layouts on the JVM and compares against golden images. Runs in `test/`, not `androidTest/`.

```kotlin
class UserCardScreenshotTest {

    @get:Rule
    val paparazzi = Paparazzi(
        deviceConfig = DeviceConfig.PIXEL_6,
        theme = "android:Theme.Material3.DayNight"
    )

    @Test
    fun `user card default state`() {
        paparazzi.snapshot {
            UserCard(user = User("1", "Sandy"))
        }
    }

    @Test
    fun `user card loading state`() {
        paparazzi.snapshot {
            UserCard(user = null, isLoading = true)
        }
    }
}
```

Run `./gradlew :app:recordPaparazziDebug` to record golden images, then `./gradlew :app:verifyPaparazziDebug` in CI to compare.

### Compose Preview Screenshot Testing

Leverages `@Preview` composables directly as screenshot test targets — no separate test code needed.

```kotlin
@Preview(showBackground = true)
@Composable
fun UserCardPreview() {
    MyTheme {
        UserCard(user = User("1", "Sandy"))
    }
}

// In test — Compose Preview Screenshot Testing plugin picks up all @Preview functions
// and generates screenshots automatically
```

---

## Test Fixtures

Share test utilities (fakes, builders, sample data) across modules using Gradle's `test-fixtures` plugin.

```kotlin
// build.gradle.kts — module that exposes fixtures
plugins {
    id("java-test-fixtures")
}

// src/testFixtures/kotlin/com/example/data/FakeUserRepository.kt
class FakeUserRepository(
    private val users: List<User> = emptyList()
) : UserRepository {
    override suspend fun getUsers(): List<User> = users
}

// build.gradle.kts — consuming module
dependencies {
    testImplementation(testFixtures(project(":data")))
}
```

!!! tip "Why test fixtures over shared test modules"
    Test fixtures are published alongside the module they belong to. The consuming module gets access without creating a separate `:test-utils` module. Gradle handles visibility — fixture classes are available only in `test` and `androidTest` source sets.

---

## Code Coverage

### JaCoCo Setup

```kotlin
// build.gradle.kts (app module)
plugins {
    id("jacoco")
}

tasks.withType<Test> {
    extensions.configure<JacocoTaskExtension> {
        isIncludeNoLocationClasses = true
        excludes = listOf("jdk.internal.*")
    }
}

tasks.register<JacocoReport>("jacocoTestReport") {
    dependsOn("testDebugUnitTest")

    reports {
        xml.required.set(true)
        html.required.set(true)
    }

    val fileFilter = listOf(
        "**/R.class", "**/R$*.class", "**/BuildConfig.*",
        "**/Manifest*.*", "**/*_Hilt*.*", "**/*_Factory.*"
    )

    classDirectories.setFrom(
        fileTree("${buildDir}/tmp/kotlin-classes/debug") { exclude(fileFilter) }
    )
    sourceDirectories.setFrom("${project.projectDir}/src/main/java")
    executionData.setFrom("${buildDir}/jacoco/testDebugUnitTest.exec")
}
```

### Coverage Targets

| Target | Rationale |
|--------|-----------|
| **70-80%** line coverage | Practical target for most Android projects |
| **90%+** for business logic | UseCases, Mappers, Validators — pure functions are easy to cover |
| **Skip** generated code | Hilt, Room, BuildConfig, R classes |
| **Don't chase 100%** | Diminishing returns — focus on testing meaningful behavior, not trivial getters |

!!! warning "Coverage does not equal quality"
    A test that calls a function without asserting anything gives you coverage but catches zero bugs. Measure coverage to find blind spots, not as a goal in itself.
