import { SCREENS, type ScreenTarget } from '@/config/nav';
import type { IconName } from '@/config/menu';

/** Default list sizes for the home feed (configurable). */
export const HOME_LIMITS = {
  recommendations: 10,
  recent: 8,
  sectionItems: 6,
} as const;

export type HomeSectionKey =
  | 'recs'
  | 'recent'
  | 'playlists'
  | 'albums'
  | 'artists'
  | 'mood';

export type HomeSectionMeta = {
  key: HomeSectionKey;
  title: string;
  icon: IconName;
  seeAll: ScreenTarget;
};

/** Declarative home sections — drives ordering, titles, icons and "see all". */
export const HOME_SECTIONS: Record<HomeSectionKey, HomeSectionMeta> = {
  recs: { key: 'recs', title: 'Made for you', icon: 'star', seeAll: SCREENS.recommendations },
  recent: { key: 'recent', title: 'Recently played', icon: 'history', seeAll: SCREENS.history },
  playlists: {
    key: 'playlists',
    title: 'Your playlists',
    icon: 'playlist-music',
    seeAll: SCREENS.library,
  },
  albums: { key: 'albums', title: 'New releases', icon: 'album', seeAll: SCREENS.discover },
  artists: {
    key: 'artists',
    title: 'Featured artists',
    icon: 'account-music',
    seeAll: SCREENS.search,
  },
  mood: { key: 'mood', title: 'Mood & genre', icon: 'radio', seeAll: SCREENS.discover },
};

/** Stable render order for the home feed. */
export const HOME_SECTION_ORDER: HomeSectionKey[] = [
  'recs',
  'recent',
  'playlists',
  'albums',
  'artists',
  'mood',
];
