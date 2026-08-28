import type { TabParamList } from "@/navigation/types"
import { MaterialCommunityIcons } from "@expo/vector-icons"

/** Icon glyph name from the Material Community icon set. */
export type IconName = keyof typeof MaterialCommunityIcons.glyphMap

/** Supported arc sweep for the expandable menu. */
export const ARC_DEGREES = {
    SEMI: 180,
    THREE_QUARTER: 270,
} as const

export type ArcDegrees = (typeof ARC_DEGREES)[keyof typeof ARC_DEGREES]

/**
 * Centralized, easy-to-tune settings for the expandable FAB menu.
 * ARC_DEGREES: 180 = top semicircle, 270 = 3/4 circle (gap at bottom).
 */
export const MENU_CONFIG = {
    ITEM_SIZE: 54,
    RADIUS: 90,
    ARC_DEGREES: 180 as ArcDegrees,
    ARC_CENTER_DEGREES: 270, // 90 = arc centered on top
    FAB_BOTTOM_CLOSED_OFFSET: 24,
    FAB_BOTTOM_OPEN_OFFSET: 120,
    FAB_BOTTOM_PLAYING_OFFSET: 164,
    /** Spring for the FAB sliding to center (open). */
    BUTTON_SPRING: { friction: 9, tension: 90 },
    /** Snappier spring for the FAB returning to its corner (close). */
    BUTTON_RETURN_SPRING: { friction: 12, tension: 180 },
    /** Spring for the menu items fanning out. */
    ITEM_SPRING: { friction: 14, tension: 220 },
    /** Per-item cascade delay (ms) when fanning out / retracting. */
    ITEM_STAGGER_MS: 5,
    /** Lead (ms) the primary phase gets before the secondary phase starts. */
    FAN_LEAD_MS: 70,
    /** On close, how soon the FAB starts returning after the items begin retracting. */
    CLOSE_OVERLAP_MS: 120,
    /** Horizontal offset (pt) of the centered FAB from screen center (0 = centered). */
    CENTER_OFFSET_X: 0,
    /** Vertical offset (pt) of the centered FAB from its default center (0 = default). */
    CENTER_OFFSET_Y: 0,
} as const

export type MenuItem = {
    name: keyof TabParamList
    label: string
    icon: IconName
}

export const MENU_ITEMS: MenuItem[] = [
    { name: "HomeTab", label: "Home", icon: "home" },
    { name: "SearchTab", label: "Search", icon: "magnify" },
    { name: "LibraryTab", label: "Library", icon: "playlist-music" },
    { name: "RadioTab", label: "Radio", icon: "radio" },
    { name: "ProfileTab", label: "Profile", icon: "account" },
]
