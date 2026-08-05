export type Mode = "dark" | "light"
export type ViewMode = "grid" | "list"
export type SortOrder = "asc" | "desc"

export interface ThemeConfig {
    mode: Mode
    viewMode: ViewMode
    sortOrder: SortOrder
    toggleMode: () => void
    setMode: (mode: Mode) => void
    setViewMode: (viewMode: ViewMode) => void
    setSortOrder: (order: SortOrder) => void
}
