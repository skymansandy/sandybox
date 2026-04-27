# Broadcast Receivers

A **BroadcastReceiver** is an Android component that listens and responds to broadcast messages (intents) from other apps or the system. Common system broadcasts include battery level changes, network connectivity, incoming SMS, and locale changes.

## Manifest-Declared (Static) Broadcast Receiver

Register the receiver in the manifest so the system can deliver broadcasts even when the app is not running.

=== "Receiver Class"

    ```kotlin
    class SmsReceiver : BroadcastReceiver() {
        override fun onReceive(context: Context, intent: Intent) {
            val bundle = intent.extras ?: return
            val pdus = bundle.get("pdus") as Array<*>
            for (pdu in pdus) {
                val message = SmsMessage.createFromPdu(pdu as ByteArray)
                val sender = message.displayOriginatingAddress
                val body = message.messageBody
                Log.d("SmsReceiver", "From: $sender, Body: $body")
            }
        }
    }
    ```

=== "AndroidManifest.xml"

    ```xml
    <receiver
        android:name=".SmsReceiver"
        android:exported="true">
        <intent-filter>
            <action android:name="android.provider.Telephony.SMS_RECEIVED" />
        </intent-filter>
    </receiver>
    ```

!!! warning "Android 8.0+ Restriction"
    From Android 8 (API 26), you **cannot** use manifest-declared receivers for most implicit broadcast intents. Exceptions include `ACTION_LOCALE_CHANGED`, `SMS_RECEIVED`, and a few others. Use context-registered receivers for everything else.

## Context-Registered (Dynamic) Broadcast Receiver

Register and unregister the receiver programmatically, typically tied to an activity or fragment lifecycle.

```kotlin
class MainActivity : AppCompatActivity() {

    private val networkReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context, intent: Intent) {
            val isConnected = intent.getBooleanExtra(
                ConnectivityManager.EXTRA_NO_CONNECTIVITY, false
            )
            Log.d("NetworkReceiver", "Connected: ${!isConnected}")
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val filter = IntentFilter(ConnectivityManager.CONNECTIVITY_ACTION)
        registerReceiver(networkReceiver, filter)
    }

    override fun onDestroy() {
        super.onDestroy()
        unregisterReceiver(networkReceiver)
    }
}
```

## Custom Broadcasts

Send your own broadcast with a custom action string.

```kotlin
// Sending a custom broadcast
val intent = Intent("com.example.MY_CUSTOM_ACTION").apply {
    putExtra("message", "Hello from sender!")
}
sendBroadcast(intent)
```

```kotlin
// Receiving the custom broadcast
class MyCustomReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val message = intent.getStringExtra("message")
        Log.d("CustomReceiver", "Received: $message")
    }
}
```

## Limiting Broadcasts

### Restrict to a Specific Package

Use `setPackage()` to send a broadcast only to a specific app.

```kotlin
val intent = Intent("com.example.MY_ACTION").apply {
    setPackage("com.example.targetapp")
}
sendBroadcast(intent)
```

### Restrict with Permissions

Add a permission so only receivers that hold the permission can receive the broadcast.

```kotlin
// Sender
sendBroadcast(intent, "com.example.MY_PERMISSION")
```

```xml
<!-- Receiver's manifest must declare the permission -->
<uses-permission android:name="com.example.MY_PERMISSION" />
```

!!! tip
    Combining `setPackage()` with a custom permission gives you fine-grained control over who can receive your broadcasts.
