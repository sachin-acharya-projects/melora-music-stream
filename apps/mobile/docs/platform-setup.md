# Native platform setup

## Android

Set the generated application ID to `com.melora.mobile`. Add Internet permission and this intent filter inside MainActivity in `android/app/src/main/AndroidManifest.xml`:

```xml
<intent-filter>
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data android:scheme="com.melora.app" android:host="auth" android:path="/callback" />
</intent-filter>
```

Follow audio_service Android setup for foreground media playback and notification permissions.

## iOS

Register `com.melora.app` as a URL scheme in Info.plist and add `audio` to `UIBackgroundModes`.

The backend currently redirects to `com.melora.app://auth/callback` with token query parameters. A one-time authorization-code exchange would be safer but needs a coordinated backend change.
