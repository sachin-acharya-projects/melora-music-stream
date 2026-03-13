import { create } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware"

type Mode = "dark" | "light"
type ViewMode = "grid" | "list"
type SortOrder = "asc" | "desc"

interface ThemeConfig {
    mode: Mode
    viewMode: ViewMode
    sortOrder: SortOrder
    toggleMode: () => void
    setMode: (mode: Mode) => void
    setViewMode: (viewMode: ViewMode) => void
    setSortOrder: (order: SortOrder) => void
}

export const useThemeStore = create<ThemeConfig>()(
    persist(
        (set, get) => ({
            mode: "light",
            viewMode: "grid",
            sortOrder: "asc",
            toggleMode: () => set({ mode: get().mode === "light" ? "dark" : "light" }),
            setMode: (mode: Mode) => set({ mode }),
            setViewMode: (viewMode: ViewMode) => set({ viewMode }),
            setSortOrder: (order: SortOrder) => set({ sortOrder: order }),
        }),
        {
            name: "theme-storage",
            storage: createJSONStorage(() => localStorage),
        },
    ),
)
