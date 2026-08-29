import type { ImageSource } from 'expo-image';

/**
 * Local, music-themed backdrop images (optimized copies of melora-assets/).
 * Each screen picks one; AuroraBackground tints them so they read as ambient
 * texture rather than subject. Art/audio screens (player, album/artist/playlist
 * detail) intentionally do NOT use these — they show the real artwork instead.
 */
export const BACKGROUNDS = {
  login: require('@/assets/backgrounds/login.jpg'),
  intro: require('@/assets/backgrounds/intro.jpg'),
  home: require('@/assets/backgrounds/home.jpg'),
  library: require('@/assets/backgrounds/library.jpg'),
  radio: require('@/assets/backgrounds/radio.jpg'),
  search: require('@/assets/backgrounds/search.jpg'),
  profile: require('@/assets/backgrounds/profile.jpg'),
  discover: require('@/assets/backgrounds/discover.jpg'),
  releases: require('@/assets/backgrounds/releases.jpg'),
  recommendations: require('@/assets/backgrounds/recommendations.jpg'),
  history: require('@/assets/backgrounds/history.jpg'),
  notifications: require('@/assets/backgrounds/notifications.jpg'),
  settings: require('@/assets/backgrounds/settings.jpg'),
  stats: require('@/assets/backgrounds/stats.jpg'),
  queue: require('@/assets/backgrounds/queue.jpg'),
} as const satisfies Record<string, ImageSource>;

export type BackgroundKey = keyof typeof BACKGROUNDS;
