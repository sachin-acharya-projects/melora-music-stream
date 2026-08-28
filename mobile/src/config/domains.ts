/** Domain registry — the bounded contexts of the app, used for typing/config. */
export const DOMAINS = [
  'home',
  'search',
  'library',
  'player',
  'radio',
  'profile',
  'artists',
  'albums',
  'playlists',
  'recommendations',
  'releases',
  'history',
  'stats',
  'notifications',
  'settings',
  'queue',
  'discover',
  'auth',
] as const;

export type Domain = (typeof DOMAINS)[number];

/**
 * Type-safe React Query keys, namespaced per domain so caches never collide.
 * Keyed objects are static arrays; functions build parameterized keys.
 */
export const queryKeys = {
  home: {
    recommendations: ['home', 'recommendations'] as const,
    recentlyPlayed: ['home', 'recentlyPlayed'] as const,
    playlistsFollowing: ['home', 'playlists', 'following'] as const,
    artistsFeatured: ['home', 'artists', 'featured'] as const,
    albumsFavorites: ['home', 'albums', 'favorites'] as const,
    discoverFeed: ['home', 'discover', 'feed'] as const,
  },
  search: {
    history: ['search', 'history'] as const,
    results: (q: string) => ['search', q] as const,
  },
  library: {
    playlists: ['library', 'playlists'] as const,
    followingArtists: ['library', 'followingArtists'] as const,
    favoriteAlbums: ['library', 'favoriteAlbums'] as const,
  },
  playlists: {
    detail: (id: string) => ['playlists', id] as const,
  },
  artists: {
    detail: (slug: string) => ['artists', slug] as const,
    songs: (slug: string) => ['artists', slug, 'songs'] as const,
    albums: (slug: string) => ['artists', slug, 'albums'] as const,
  },
  albums: {
    detail: (browseId: string) => ['albums', browseId] as const,
  },
  radio: {
    genres: ['radio', 'genres'] as const,
    moods: ['radio', 'moods'] as const,
    seeds: ['radio', 'seeds'] as const,
  },
  recommendations: { list: ['recommendations'] as const },
  releases: { list: ['releases'] as const },
  history: { list: ['history'] as const },
  discover: { feed: ['discover', 'feed'] as const },
  stats: {
    overview: ['stats', 'overview'] as const,
    topArtists: ['stats', 'topArtists'] as const,
    topSongs: ['stats', 'topSongs'] as const,
    topGenres: ['stats', 'topGenres'] as const,
  },
  profile: { unread: ['profile', 'unread'] as const },
  notifications: {
    list: ['notifications'] as const,
    settings: ['notifications', 'settings'] as const,
  },
  settings: { notif: ['settings', 'notif'] as const },
} as const;
