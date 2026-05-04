# Notifications & FCM

## Parts of a Notification

| Part | Description |
|---|---|
| **Small Icon** | Required. Shown in the status bar |
| **App Name** | Set by the system automatically |
| **Time Stamp** | Set by the system automatically |
| **Large Icon** | Optional. Shown in the expanded notification |
| **Title** | Main heading of the notification |
| **Text** | Body content of the notification |

## Notification Channel (Android 8.0+)

From Android 8.0 (API 26), every notification must be assigned to a **channel**. Channels appear in the app's notification settings, giving users granular control.

=== "Create Channel"

    ```kotlin
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        val channel = NotificationChannel(
            "channel_id",
            "General Notifications",
            NotificationManager.IMPORTANCE_DEFAULT
        ).apply {
            description = "Channel for general app notifications"
        }

        val notificationManager = getSystemService(NotificationManager::class.java)
        notificationManager.createNotificationChannel(channel)
    }
    ```

=== "Delete Channel"

    ```kotlin
    val notificationManager = getSystemService(NotificationManager::class.java)
    notificationManager.deleteNotificationChannel("channel_id")
    ```

## Creating a Notification

```kotlin
// Create an intent for the notification tap action
val intent = Intent(this, MainActivity::class.java).apply {
    flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
}

val pendingIntent = PendingIntent.getActivity(
    this, 0, intent, PendingIntent.FLAG_IMMUTABLE
)

// Build the notification
val notification = NotificationCompat.Builder(this, "channel_id")
    .setSmallIcon(R.drawable.ic_notification)
    .setContentTitle("New Message")
    .setContentText("You have a new message from Sandy")
    .setPriority(NotificationCompat.PRIORITY_DEFAULT)
    .setContentIntent(pendingIntent)
    .setAutoCancel(true)
    .build()

// Show the notification
with(NotificationManagerCompat.from(this)) {
    notify(NOTIFICATION_ID, notification)
}
```

!!! warning "POST_NOTIFICATIONS Permission"
    On Android 13 (API 33)+, you must request the `POST_NOTIFICATIONS` runtime permission before showing notifications.

## Push Notifications (FCM)

**Firebase Cloud Messaging** allows a server to send messages to your app. The app receives the data and decides what to do with it (show notification, update UI, etc.).

### Setup

1. Add the Firebase messaging dependency and `google-services.json` (generated with your app's SHA1 key)
2. Create a `FirebaseMessagingService` and register it in the manifest

### FCM Token

```kotlin
FirebaseInstanceId.getInstance().instanceId
    .addOnSuccessListener { result ->
        val token = result.token
        Log.d("FCM", "Token: $token")
        // Send token to your server
    }
```

??? note "When does the token change?"
    - App deletes the Instance ID
    - App is restored on a new device
    - User uninstalls and reinstalls the app
    - User clears app data

### FirebaseMessagingService

```kotlin
class MyFirebaseMessagingService : FirebaseMessagingService() {

    override fun onMessageReceived(remoteMessage: RemoteMessage) {
        // Handle data payload
        remoteMessage.data.let { data ->
            val title = data["title"]
            val body = data["body"]
            showNotification(title, body)
        }

        // Handle notification payload (auto-displayed when app in background)
        remoteMessage.notification?.let { notification ->
            Log.d("FCM", "Title: ${notification.title}, Body: ${notification.body}")
        }
    }

    override fun onNewToken(token: String) {
        Log.d("FCM", "New token: $token")
        // Send the new token to your server
        sendTokenToServer(token)
    }
}
```

```xml
<!-- AndroidManifest.xml -->
<service
    android:name=".MyFirebaseMessagingService"
    android:exported="false">
    <intent-filter>
        <action android:name="com.google.firebase.MESSAGING_EVENT" />
    </intent-filter>
</service>
```

### Why FCM Instead of Your Own Server?

!!! note "The Problem with Direct Push"
    If every app maintained its own **WebSocket** connection to its server, each connection would keep the radio active and drain the battery significantly.

FCM solves this by maintaining a **single shared connection** via Google Play Services for all apps on the device.

**How it works:**

1. Create a Firebase project and get a server key
2. Store the server key on your backend
3. App obtains an FCM token and sends it to your server
4. Server sends a message to Google (FCM) with the token
5. Google delivers the message to the app via the shared Play Services connection

!!! warning "Message Limits"
    FCM has message rate limits. Use it for **notifications and alerts**, not for real-time chat or streaming data.

---

## Interview Q&A

??? question "What is a Notification Channel and why is it required on Android 8.0+?"
    A Notification Channel groups notifications by type (e.g., promotions, messages) and gives users granular control over each category's behavior (sound, vibration, importance). Starting with Android 8.0 (API 26), every notification must be assigned to a channel or it will not be displayed. Channels appear in the app's system notification settings.

??? question "What is the difference between FCM data messages and notification messages?"
    Notification messages are automatically displayed by the system when the app is in the background, but delivered to `onMessageReceived()` when the app is in the foreground. Data messages are always delivered to `onMessageReceived()` regardless of app state, giving you full control over how to handle them. For maximum flexibility, use data-only payloads.

??? question "Why does Android use FCM instead of letting each app maintain its own push connection?"
    If every app maintained its own WebSocket or persistent connection, each would keep the radio active independently, causing significant battery drain. FCM solves this by maintaining a single shared connection through Google Play Services for all apps on the device, dramatically reducing battery consumption.

??? question "When does the FCM token change?"
    The FCM token changes when the app deletes its Instance ID, the app is restored on a new device, the user uninstalls and reinstalls the app, or the user clears app data. You should handle `onNewToken()` to send the updated token to your server whenever this happens.

??? question "What is the POST_NOTIFICATIONS permission and when is it required?"
    Starting with Android 13 (API 33), apps must request the `POST_NOTIFICATIONS` runtime permission before showing any notifications. Without this permission granted by the user, notification calls are silently ignored. This gives users explicit control over which apps can send notifications at install time.

!!! tip "Further Reading"
    - [Notifications overview - Android Developers](https://developer.android.com/develop/ui/views/notifications)
    - [Create a Notification Channel - Android Developers](https://developer.android.com/develop/ui/views/notifications/channels)
    - [Firebase Cloud Messaging - Android](https://firebase.google.com/docs/cloud-messaging/android/client)
    - [FCM Architecture - Firebase Docs](https://firebase.google.com/docs/cloud-messaging/fcm-architecture)
