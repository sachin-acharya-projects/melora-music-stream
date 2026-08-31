# Melora — Feature Specification

This document is the source-of-truth feature list for the **Melora mobile app**
(a React Native / Expo client). It enumerates every user-facing feature the
product supports today (sourced from the existing web app + FastAPI backend) and
is the spec the mobile app is built against.

> Scope decision: the mobile app targets **Android** (Expo dev build), uses a
> **dark immersive** design language, and replicates **user-facing features**.
> The web-only **Admin dashboard** and **in-app Bug Reporter** are out of scope
> for the mobile app (documented in §12 as excluded).

All data comes from the existing backend REST API under `/api/v1` (base URL
`https://melora.sachinacharya.name.np/api/v1`). Authentication is **Bearer JWT**
issued by Google OAuth. Audio is obtained per-track via
`GET /api/v1/stream/{video_id}` → a direct stream URL.

---

## 1. Authentication & Account

- **Google login** — system-browser OAuth. App opens
  `GET /api/v1/auth/login?redirect=com.melora.app://auth/callback`; Google
  redirects back with `access_token` + `refresh_token` in the deep-link query
  string. Tokens stored securely (not localStorage).
- **Session restore** — on launch, read stored tokens; call
  `GET /api/v1/auth/me` to populate the user.
- **Token refresh** — on `401`, `POST /api/v1/auth/refresh` with
  `{ refresh_token }` → new token pair, retry original request.
- **Logout** — `POST /api/v1/auth/logout` (server no-op), clear stored tokens,
  reset player state, return to login.
- **Profile** (`GET/PATCH /api/v1/auth/me`) — display name, bio, favorite
  genres. `is_super_admin` flag available for future gating.
- **Account deactivation** — backend may reject with `account_deactivated` →
  force logout to login screen.

## 2. Playback Engine (core)

- **Global player** — single source of truth: queue, current index, play/pause,
  shuffle, repeat (`none | one | all`), volume, position/seek, current song
  metadata. Persisted across app restarts.
- **Play a song** — resolve stream URL via `GET /api/v1/stream/{video_id}`
  (returns `{ url, title, thumbnail }`) and feed to the native player. Fallback
  to `GET /api/v1/download/{video_id}` (same-origin MP3) if the resolved URL is
  dead/expired.
- **Queue management** — set playlist (from search/album/playlist/radio),
  add-to-queue, play-next, remove, reorder (drag).
- **Next / Previous** — `next` respects repeat=`all` and end-of-queue; `previous`
  restarts current track if >3s elapsed, else goes back.
- **Shuffle** — Fisher-Yates shuffle of remaining tracks, current track kept
  first; toggle restores original order + index.
- **Repeat** — `none` → stop at end; `one` → replay; `all` → loop queue.
- **Seek / Volume** — scrubbing + volume control, persisted.
- **Background playback** — audio continues when app is backgrounded
  (foreground service on Android); lock-screen / media controls (play, pause,
  next, previous, seek) drive the player.
- **Playback continuity** — `POST /api/v1/state` saves
  `{ last_song_id, current_queue, last_playlist_id, recent_songs }`;
  `GET /api/v1/state` restores on launch ("resume where you left off").
- **Related / Lyrics** — `GET /api/v1/songs/{id}/related`,
  `GET /api/v1/songs/{id}/lyrics`.
- **Listen history** — starting a track records `POST /api/v1/history/`.

## 3. Search

- **Grouped search** — `GET /api/v1/search?q=` returns top result + grouped
  songs / artists / albums / playlists / videos (falls back to plain YouTube).
- **Autocomplete** — `GET /api/v1/search/suggestions?q=`.
- **Track browse** — `GET /api/v1/search/tracks?playlist_id=` lists tracks for
  an album/playlist browse id (used by album/playlist detail).
- **Search history** — `GET /api/v1/search/history` (deduped recent);
  `DELETE /api/v1/search/history` (clear all);
  `DELETE /api/v1/search/history/{entry_id}` (delete one). Recorded
  automatically when authenticated.

## 4. Playlists

- **List / manage** — `GET /api/v1/playlists/` (sort/search);
  `POST` create; `PATCH` update; `DELETE` remove.
- **Detail** — `GET /api/v1/playlists/{id}` (songs, sort/paginate).
- **Edit contents** — add one (`POST .../add`), add many (`POST .../add-bulk`,
  skips duplicates silently), remove (`DELETE .../songs/{song_id}`),
  reorder (`POST .../reorder`).
- **Import** — `POST /api/v1/playlists/import` from a YouTube playlist URL.
- **Sync** — `POST /api/v1/playlists/{id}/sync` re-pulls new items from the
  source playlist.
- **Share** — `POST .../share` creates a token; `GET /playlists/shared/{token}`
  (public) resolves it; `DELETE .../share` revokes.
- **Follow** — `POST .../follow` toggles; `GET /playlists/following` lists
  followed; `GET /playlists/discover` lists public discoverable playlists.
- **Collaborative** — `POST .../collaborative` toggles; collaborator
  list/add/remove endpoints.
- **Picker** — `GET /playlists/options` lightweight id+name list for "add to
  playlist" sheets.

## 5. Library

- The user's personal space aggregating:
  - **Playlists** they own (`GET /api/v1/playlists/`).
  - **Followed artists** (`GET /api/v1/artists/following`).
  - **Favorited albums** (`GET /api/v1/albums/favorites`).
  - **Recently played** (`GET /api/v1/history/recently-played`).
  - **Listening stats** (`GET /api/v1/history/stats`).

## 6. Artists

- **Browse** — `GET /api/v1/artists/` (filter/sort);
  `GET /artists/featured`; `GET /artists/suggested` (personalized);
  `GET /artists/following`.
- **Detail** — `GET /api/v1/artists/{slug}` (enriched in background);
  `GET .../songs`; `GET .../albums`; `GET .../recently-played`.
- **Follow** — `POST /api/v1/artists/{id}/follow` toggles.
- **Import** — `GET /api/v1/artists/youtube/search?q=` then
  `POST /api/v1/artists/youtube/import` (add a YouTube channel as an artist).

## 7. Albums

- **Favorites** — `GET /api/v1/albums/favorites`;
  `POST /api/v1/albums/{browse_id}/favorite`;
  `DELETE /api/v1/albums/{browse_id}/favorite`.
- **Detail** — `GET /api/v1/albums/{browse_id}` (track list + favorite flag).

## 8. Radio

- **Generate** — `GET /api/v1/radio/?seed_type=&seed_value=&count=` builds a
  playable batch from a genre / artist / mood seed.
- **Seed catalog** — `GET /api/v1/radio/genres`, `GET /api/v1/radio/moods`.
- **Personal seeds** — `GET /api/v1/radio/seeds` (user's genres + top artists)
  for a personalized radio entry point.

## 9. Recommendations

- **Personalized** — `GET /api/v1/recommendations/?limit=` song list based on
  listening history.

## 10. New Releases

- **From followed artists** — `GET /api/v1/releases/?limit=&offset=&artist_id=`.

## 11. Discover

- **Global feed** — `GET /api/v1/discover/` (trending, new releases, mood
  playlists).

## 12. History & Stats

- **Listen history** — `GET /api/v1/history/` (paginated);
  `GET /api/v1/history/recent`; `GET /api/v1/history/recently-played`;
  `PATCH /api/v1/history/{entry_id}` updates play duration.
- **Stats** — `GET /api/v1/stats/` (overview); `GET /stats/top-artists`;
  `GET /stats/top-songs`; `GET /stats/genres`;
  `POST /stats/recalculate` (recompute).

## 13. Notifications & Settings

- **Notifications** — `GET /api/v1/notifications/` (list + unread count);
  `GET /notifications/unread-count`; `POST .../{id}/read`;
  `POST /notifications/read-all`.
- **Notification settings** — `GET /api/v1/notifications/settings`;
  `PATCH /api/v1/notifications/settings` (channel toggles).

## 14. Excluded from Mobile (web-only)

- **Admin dashboard** — artist/song/playlist/user management, settings,
  dashboard metrics (`/api/v1/admin/*`). Not built into the mobile app.
- **Bug reporter** — in-app bug submission with screenshot
  (`/api/v1/bugs/*`). Not built into the mobile app.

---

## Mobile UX Notes (dark immersive)

- **Navigation:** bottom tab bar (Home · Search · Library · Radio · Profile)
  with a persistent frosted **MiniPlayer**; tapping it (or a track) opens a
  full-bleed **Now Playing** screen. Per-tab stack navigators.
- **Now Playing:** large album art with gradient, transport controls, shuffle/
  repeat/volume, expandable **Queue** (drag reorder) and **Lyrics**.
- **Artwork:** always via the `GET /api/v1/thumbnail?url=` proxy (avoids Google
  CDN 429s), cached by the image lib.
- **Auth:** single Login screen with a "Continue with Google" button → system
  browser → deep-link callback.

## API Contract Summary (for client implementation)

- Base: `/api/v1` (configurable `EXPO_PUBLIC_API_URL`).
- Auth header: `Authorization: Bearer <access_token>` on every "required"
  endpoint.
- Unauthenticated (usable pre-login): `auth/login`, `auth/google/callback`,
  `auth/refresh`, `auth/logout`; `songs/{id}/related|lyrics`; all `media`
  (`/stream`, `/download`, `/thumbnail`); `search/?q=`, `search/suggestions`,
  `search/tracks`; `artists/{slug}` (+`/songs`,`/albums`), `albums/{id}`;
  `radio/genres`, `radio/moods`; `discover/`; `playlists/shared/{token}`.
- Requires auth: `auth/me`, all `playlists`, most `artists`, all `albums`
  favorites, `history`, `releases`, `radio` (generate + seeds), `recommendations`,
  `stats`, `notifications`, `users`, `state`, `cache`, `search/history`.
