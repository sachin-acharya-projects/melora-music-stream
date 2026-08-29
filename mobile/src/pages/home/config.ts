import { SCREENS, type ScreenTarget } from '@/config/nav';
import type { IconName } from '@/config/menu';

/** Default list sizes for the home feed (configurable). */
export const HOME_LIMITS = {
  recommendations: 10,
  recent: 8,
  sectionItems: 6,
} as const;

export type HomeSectionKey =
  | 'recent'
  | 'recs'
  | 'trending'
  | 'newReleases'
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
  recent: { key: 'recent', title: 'Recently played', icon: 'history', seeAll: SCREENS.history },
  recs: { key: 'recs', title: 'Made for you', icon: 'star', seeAll: SCREENS.recommendations },
  trending: { key: 'trending', title: 'Trending now', icon: 'fire', seeAll: SCREENS.discover },
  newReleases: {
    key: 'newReleases',
    title: 'New releases',
    icon: 'new-box',
    seeAll: SCREENS.discover,
  },
  playlists: {
    key: 'playlists',
    title: 'Your playlists',
    icon: 'playlist-music',
    seeAll: SCREENS.library,
  },
  albums: { key: 'albums', title: 'Albums you might like', icon: 'album', seeAll: SCREENS.discover },
  artists: {
    key: 'artists',
    title: 'Artists you might like',
    icon: 'account-music',
    seeAll: SCREENS.search,
  },
  mood: { key: 'mood', title: 'Mood & genre', icon: 'radio', seeAll: SCREENS.discover },
};

/** Stable render order for the home feed. */
export const HOME_SECTION_ORDER: HomeSectionKey[] = [
  'recent',
  'recs',
  'trending',
  'newReleases',
  'playlists',
  'albums',
  'artists',
  'mood',
];
