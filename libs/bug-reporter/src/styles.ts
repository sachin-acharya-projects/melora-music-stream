/**
 * Design tokens and shared inline styles for the widget. Inline styles keep
 * the package fully self-contained: no host CSS, no Tailwind, no globals.
 */

export const Z_INDEX = 9999

export const COLORS = {
    primary: "#ef4444",
    primaryHover: "#dc2626",
    text: "#18181b",
    textMuted: "#71717a",
    bg: "#ffffff",
    bgMuted: "#f4f4f5",
    border: "#e4e4e7",
    success: "#16a34a",
    danger: "#dc2626",
    annotation: "#ef4444",
} as const

export const ANNOTATION_COLORS = ["#ef4444", "#2563eb", "#16a34a", "#f59e0b", "#111827", "#ffffff"] as const

export const RADIUS = 12

export const MODAL_MAX_WIDTH = 720
