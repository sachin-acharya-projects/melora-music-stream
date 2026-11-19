# Melora Mobile

Native Flutter client for the existing Melora FastAPI backend. This is a clean implementation; the archived legacy `mobile/` app is not a dependency.

## Bootstrap

From this directory, generate Android and iOS runners, then fetch packages:

```sh
flutter create --platforms=android,ios --org com.melora .
flutter pub get
```

Configure OAuth deep links and background audio using [docs/platform-setup.md](docs/platform-setup.md).

## Run

```sh
flutter run --dart-define=MELORA_API_BASE_URL=https://YOUR-MELORA-HOST/api/v1
```

The default API URL targets an Android emulator host: `http://10.0.2.2:8000/api/v1`.

The backend remains authoritative for accounts, catalogue, playlists, history and synchronized playback state. Riverpod owns application state; one audio_service handler owns playback.
