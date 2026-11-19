# Native platform setup

Generate the platform runners from `apps/mobile/` with Flutter before applying these settings.

## Android

Set the application ID to `com.melora.mobile` and the minimum SDK to 23 (required by the current secure-storage plugin).

Use the audio_service activity base class in `android/app/src/main/kotlin/.../MainActivity.kt`:

```kotlin
import com.ryanheise.audioservice.AudioServiceActivity

class MainActivity : AudioServiceActivity()
```

Add Internet, foreground media playback and notification permissions, then register the service and media-button receiver inside `<application>` in `AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK" />
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />

<service
    android:name="com.ryanheise.audioservice.AudioService"
    android:foregroundServiceType="mediaPlayback"
    android:exported="true">
    <intent-filter>
        <action android:name="android.media.browse.MediaBrowserService" />
    </intent-filter>
</service>
<receiver
    android:name="com.ryanheise.audioservice.MediaButtonReceiver"
    android:exported="true">
    <intent-filter>
        <action android:name="android.intent.action.MEDIA_BUTTON" />
    </intent-filter>
</receiver>
```

Register the OAuth callback intent filter inside the MainActivity `<activity>`:

```xml
<intent-filter>
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data android:scheme="com.melora.app" android:host="auth" android:path="/callback" />
</intent-filter>
```

For local HTTP development only, allow cleartext traffic in the debug manifest or use a debug network-security config. Do not enable unrestricted cleartext traffic in release builds; use HTTPS for the home-server deployment.

## iOS

Register `com.melora.app` as a URL scheme in `ios/Runner/Info.plist` and add `audio` to `UIBackgroundModes`:

```xml
<key>UIBackgroundModes</key>
<array>
    <string>audio</string>
</array>
```

Use HTTPS for the backend. If local HTTP is required for development, configure a narrowly scoped ATS exception in the debug build only.

## OAuth

The existing backend accepts `com.melora.app://auth/callback` and redirects there with access and refresh tokens in query parameters. The app writes them to Android Keystore-backed storage / iOS Keychain through `flutter_secure_storage`. A one-time authorization-code exchange would be safer, but requires a coordinated backend change.
