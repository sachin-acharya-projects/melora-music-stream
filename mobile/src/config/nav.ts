import type { AppNavigation } from '@/navigation/types';

/** Tab-bar screens (live inside the TabRoot navigator). */
export const TAB_SCREENS = {
  home: 'HomeTab',
  search: 'SearchTab',
  library: 'LibraryTab',
  radio: 'RadioTab',
  profile: 'ProfileTab',
} as const;

export type TabScreenName = (typeof TAB_SCREENS)[keyof typeof TAB_SCREENS];

/** Full-screen stack destinations (live in the root navigator). */
export const STACK_SCREENS = {
  playlistDetail: 'PlaylistDetail',
  artistDetail: 'ArtistDetail',
  albumDetail: 'AlbumDetail',
  queue: 'Queue',
  notifications: 'Notifications',
  settings: 'Settings',
  stats: 'Stats',
  discover: 'Discover',
  releases: 'Releases',
  recommendations: 'Recommendations',
  history: 'History',
  nowPlaying: 'NowPlaying',
} as const;

export type StackScreenName = (typeof STACK_SCREENS)[keyof typeof STACK_SCREENS];

/** A typed, serializable navigation target usable from any screen. */
export type ScreenTarget =
  | { type: 'tab'; name: TabScreenName }
  | { type: 'stack'; name: StackScreenName; params?: Record<string, unknown> };

/** Logical screen aliases used by domain configs (e.g. Home sections). */
export const SCREENS = {
  recommendations: { type: 'stack', name: 'Recommendations' } as ScreenTarget,
  history: { type: 'stack', name: 'History' } as ScreenTarget,
  library: { type: 'tab', name: 'LibraryTab' } as ScreenTarget,
  discover: { type: 'stack', name: 'Discover' } as ScreenTarget,
  search: { type: 'tab', name: 'SearchTab' } as ScreenTarget,
} as const satisfies Record<string, ScreenTarget>;

/** Resolve a typed ScreenTarget into a real navigation call. */
export function navigateTo(navigation: AppNavigation, target: ScreenTarget): void {
  const nav = navigation as unknown as {
    navigate(screen: string, params?: unknown): void;
  };
  if (target.type === 'tab') {
    nav.navigate('TabRoot', { screen: target.name });
  } else {
    nav.navigate(target.name, target.params);
  }
}
