import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { TabParamList } from '@/navigation/types';

/** Icon glyph name from the Material Community icon set. */
export type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

/** Supported arc sweep for the expandable menu. */
export const ARC_DEGREES = {
  SEMI: 180,
  THREE_QUARTER: 270,
} as const;

export type ArcDegrees = (typeof ARC_DEGREES)[keyof typeof ARC_DEGREES];

/**
 * Centralized, easy-to-tune settings for the expandable FAB menu.
 * ARC_DEGREES: 180 = top semicircle, 270 = 3/4 circle (gap at bottom).
 */
export const MENU_CONFIG = {
  ITEM_SIZE: 54,
  RADIUS: 96,
  ARC_DEGREES: 270 as ArcDegrees,
  ARC_CENTER_DEGREES: 90, // 90 = arc centered on top
  FAB_BOTTOM_CLOSED_OFFSET: 24,
  FAB_BOTTOM_OPEN_OFFSET: 120,
  FAB_BOTTOM_PLAYING_OFFSET: 164,
  SPRING: { friction: 9, tension: 90 },
} as const;

export type MenuItem = {
  name: keyof TabParamList;
  label: string;
  icon: IconName;
};

export const MENU_ITEMS: MenuItem[] = [
  { name: 'HomeTab', label: 'Home', icon: 'home' },
  { name: 'SearchTab', label: 'Search', icon: 'magnify' },
  { name: 'LibraryTab', label: 'Library', icon: 'playlist-music' },
  { name: 'RadioTab', label: 'Radio', icon: 'radio' },
  { name: 'ProfileTab', label: 'Profile', icon: 'account' },
];
