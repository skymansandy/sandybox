# Testing & Tools for Android Auto

Testing Android Auto apps requires the **Desktop Head Unit (DHU)**, which simulates the car display on your development machine. You don't need a physical car or head unit during development.

## Desktop Head Unit (DHU)

The DHU is bundled with Android Studio's SDK Manager under **SDK Tools > Android Auto Desktop Head Unit Emulator**.

### Setup

```bash
# 1. Enable developer mode in Android Auto settings on the phone
#    Settings > Android Auto > Version (tap 10x) > Developer Settings

# 2. Start the DHU server on the phone
adb forward tcp:5277 tcp:5277

# 3. Launch DHU (from SDK directory)
cd $ANDROID_HOME/extras/google/auto
./desktop-head-unit
```

### DHU Command Line Options

| Flag | Purpose |
|---|---|
| `--usb` | Connect via USB (default) |
| `--wifi` | Connect via WiFi |
| `--resolution WxH` | Set display resolution (e.g., `800x480`) |
| `--dpi N` | Set display density |
| `--fueltypes electric` | Simulate electric vehicle |
| `--screenconfig portrait` | Portrait orientation |

```bash
# Simulate a wide-screen car display
./desktop-head-unit --resolution 1280x720 --dpi 160

# Simulate an EV with day mode
./desktop-head-unit --fueltypes electric --day
```

### DHU Input Commands

While the DHU is running, use keyboard shortcuts or the command console:

| Command | Action |
|---|---|
| `day` | Switch to day mode |
| `night` | Switch to night mode |
| `navigation` | Simulate navigation start |
| `microphone` | Trigger voice input |
| `select` | Tap/select current item |
| `back` | Navigate back |
| `rotary` | Enable rotary controller simulation |

## Testing Cars App Library Apps

### Unit Testing with `TestCarContext`

```kotlin
dependencies {
    testImplementation("androidx.car.app:app-testing:1.4.0")
}
```

```kotlin
@Test
fun mainScreen_displaysListTemplate() {
    val testCarContext = TestCarContext.createCarContext(
        ApplicationProvider.getApplicationContext()
    )

    val screen = MainScreen(testCarContext)
    val template = screen.onGetTemplate()

    assertThat(template).isInstanceOf(ListTemplate::class.java)
    val listTemplate = template as ListTemplate
    assertThat(listTemplate.title.toString()).isEqualTo("My Navigation")
}
```

### Testing Screen Navigation

```kotlin
@Test
fun clickingItem_pushesDetailScreen() {
    val testCarContext = TestCarContext.createCarContext(
        ApplicationProvider.getApplicationContext()
    )
    val screenManager = testCarContext.getCarService(ScreenManager::class.java)

    val screen = MainScreen(testCarContext)
    screenManager.push(screen)

    // Simulate click on first item
    val template = screen.onGetTemplate() as ListTemplate
    val firstItem = template.singleList?.items?.first() as Row
    firstItem.onClickDelegate?.sendClick()

    // Verify navigation
    assertThat(screenManager.top).isInstanceOf(DetailScreen::class.java)
}
```

### Testing Session Lifecycle

```kotlin
@Test
fun session_createsMainScreen() {
    val session = MySession()
    val screen = session.onCreateScreen(Intent())
    assertThat(screen).isInstanceOf(MainScreen::class.java)
}
```

## Testing Media Apps

Media apps don't use the Cars App Library, so test the `MediaBrowserService` directly.

```kotlin
@Test
fun onLoadChildren_returnsRootCategories() {
    val service = Robolectric.setupService(MusicService::class.java)
    val latch = CountDownLatch(1)
    var result: List<MediaBrowserCompat.MediaItem>? = null

    val controller = MediaBrowserCompat(
        context,
        ComponentName(context, MusicService::class.java),
        object : MediaBrowserCompat.ConnectionCallback() {
            override fun onConnected() {
                controller.subscribe("root",
                    object : MediaBrowserCompat.SubscriptionCallback() {
                        override fun onChildrenLoaded(
                            parentId: String,
                            children: MutableList<MediaBrowserCompat.MediaItem>
                        ) {
                            result = children
                            latch.countDown()
                        }
                    }
                )
            }
        },
        null
    )
    controller.connect()
    latch.await(5, TimeUnit.SECONDS)

    assertThat(result).isNotNull()
    assertThat(result).hasSize(3) // playlists, albums, recent
}
```

## Testing Messaging Apps

Verify notification structure with `NotificationCompat` assertions.

```kotlin
@Test
fun messageNotification_hasMessagingStyle() {
    showMessageNotification(context, testMessage)

    val notification = shadowOf(notificationManager)
        .allNotifications.first()
    val style = NotificationCompat.MessagingStyle
        .extractMessagingStyleFromNotification(notification)

    assertThat(style).isNotNull()
    assertThat(style!!.messages).hasSize(1)
    assertThat(style.messages[0].text).isEqualTo("Hello!")
}

@Test
fun messageNotification_hasReplyAction() {
    showMessageNotification(context, testMessage)

    val notification = shadowOf(notificationManager)
        .allNotifications.first()
    val replyAction = notification.actions.find {
        it.semanticAction == NotificationCompat.Action.SEMANTIC_ACTION_REPLY
    }

    assertThat(replyAction).isNotNull()
    assertThat(replyAction!!.remoteInputs).isNotEmpty()
}
```

## Quality Guidelines Checklist

Google reviews Auto apps before listing them. Key requirements:

| Area | Requirement |
|---|---|
| **Distraction** | No animations, video, or rapid visual updates |
| **Template limits** | Stay within 5 screen depth, 5 template steps |
| **Day/Night** | App must handle both modes (host controls switching) |
| **Voice** | Media apps must support `onPlayFromSearch`; messaging must support voice reply |
| **Error handling** | Show `MessageTemplate` for errors — don't crash or show blank screens |
| **Loading** | Use `Loading` state on templates — don't show empty lists while fetching |
| **Responsiveness** | `onGetTemplate()` must return within **500ms** |
| **Audio focus** | Media apps must respect audio focus changes |

## Debugging Tips

### Logging

```kotlin
// CarAppService has a carContext with a logger
CarLog.d("MyApp", "Screen pushed: ${screen::class.simpleName}")

// Standard Logcat filtering for Auto
adb logcat -s CarApp:D AndroidAutoHost:D
```

### Common Issues

| Symptom | Likely Cause |
|---|---|
| App doesn't appear on Auto | Missing `automotive_app_desc.xml` or `CarAppService` intent filter |
| "App not responding" on Auto | `onGetTemplate()` taking too long — avoid blocking calls |
| Template not updating | Forgot to call `invalidate()` after data change |
| Black map surface | `SurfaceCallback` not registered or `onSurfaceAvailable` not drawing |
| Voice reply spinner stuck | Not updating notification after processing `RemoteInput` |
| "Too many template steps" | Exceeded 5-step limit — flatten your navigation |

## CI Testing

Run Auto unit tests in CI like any Android instrumented test. The DHU is not available in CI environments, so focus on:

1. **Template construction** — verify correct template types and content
2. **Screen navigation** — verify push/pop behavior with `TestCarContext`
3. **Media browse tree** — verify `onLoadChildren` returns expected items
4. **Notification structure** — verify `MessagingStyle` format and actions

```yaml
# GitHub Actions example
- name: Run Auto tests
  run: ./gradlew testDebugUnitTest --tests "*.auto.*"
```

??? question "Common Interview Questions"

    **Q: How do you test an Android Auto app without a car?**
    Use the Desktop Head Unit (DHU), which simulates the car display on your dev machine. For automated testing, use `TestCarContext` from the Cars App Library testing artifact. The DHU connects to a real phone via ADB, so you can test the full pipeline locally.

    **Q: What's the most common reason Auto apps fail review?**
    Driver distraction violations — apps that try to display too much content, update too frequently, or have flows that are too deep. Google enforces strict UX guidelines. Design for glanceability: large touch targets, minimal text, shallow navigation.

    **Q: How do you handle different car display sizes?**
    You don't — the host handles layout. Templates adapt to the car's display size, resolution, and input modality (touch, rotary, trackpad). Your app provides content; the host decides how to render it. Test with different `--resolution` flags on the DHU to verify your content looks correct.

!!! tip "Further Reading"
    - [Test Android Auto apps](https://developer.android.com/training/cars/testing)
    - [Desktop Head Unit setup](https://developer.android.com/training/cars/testing/dhu)
    - [Car app quality guidelines](https://developer.android.com/docs/quality-guidelines/car-app-quality)
