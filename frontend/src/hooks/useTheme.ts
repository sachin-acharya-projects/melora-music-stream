import { type ThemeConfig } from "@/store/theme/types"
import { create } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware"

export const useThemeStore = create<ThemeConfig>()(
    persist(
        (set, get) => ({
            mode: "light",
            viewMode: "grid",
            sortOrder: "asc",
            toggleMode: () => set({ mode: get().mode === "light" ? "dark" : "light" }),
            setMode: (mode) => set({ mode }),
            setViewMode: (viewMode) => set({ viewMode }),
            setSortOrder: (order) => set({ sortOrder: order }),
        }),
        {
            name: "theme-storage",
            storage: createJSONStorage(() => localStorage),
        },
    ),
)
