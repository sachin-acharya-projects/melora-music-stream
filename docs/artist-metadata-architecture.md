# Melora artist metadata architecture

## Status
Phase 1 foundation. Melora's database remains the source of truth for local artists and playback. External providers enrich and identify records; they do not own the catalogue.

## Canonical identity
- `artists.id` is the stable Melora canonical artist ID.
- `artist_identities` maps provider-specific IDs to that canonical ID.
- Provider IDs are unique by `(provider, external_id)`.
- Names, thumbnails, descriptions, uploader names, and channel titles are not identity keys.
- Existing `artists.external_ids` JSON remains during transition for backwards compatibility.

Supported migrated provider keys: MusicBrainz, YouTube channel, YouTube Music artist, Last.fm, and Spotify.

## Classification and resolution
Artist rows gain conservative `entity_type`, `identity_status`, `identity_confidence`, and `identity_source` fields. MusicBrainz auto-resolution requires exactly one exact normalized-name candidate with score >= 95. Ambiguous matches remain unverified; no artist merge occurs.

MusicBrainz entity types map to person, group, orchestra, choir, character, other, or unknown. YouTube channel/creator/label classification is a separate future decision and is never inferred solely from a channel title.

## Provider responsibilities
- MusicBrainz: free canonical artist/release/recording identifiers and descriptive metadata, subject to API rate limits and attribution requirements.
- YouTube Music: current discoverable/playable catalogue and provider-specific artist/release references.
- YouTube channel IDs: source/channel identity, not proof of canonical music-artist identity.
- Melora: playback IDs, user follows, playlists, listening history, and canonical internal IDs.

## Data safety
The first migration only adds fields/table and copies existing external IDs. It does not delete, rewrite, merge, or re-key artists, songs, releases, playlists, or listening history. Duplicate provider IDs are assigned deterministically to the first existing artist; no records are merged. Legacy JSON remains intact.

## Follow-up
1. Reviewed classification workflow for artist vs channel/creator/label/unknown.
2. Normalize releases and recordings with provider identity mappings; use ISRC where available.
3. Produce duplicate-candidate reports and require explicit review before merging.
4. Expand discovery independently of playback registration.
5. Audit API calls, caching, background jobs, provider rate limits, and frontend/backend ownership.
