import { type Song } from "@/types"
import { useCallback, useState } from "react"

export function useSongSelection() {
    const [selectedSongIds, setSelectedSongIds] = useState<string[]>([])
    const [lastSelectedId, setLastSelectedId] = useState<string | null>(null)

    const toggleSelect = useCallback(
        (id: string, e: React.MouseEvent, songs: Song[]) => {
            if (
                (e.target as HTMLElement).closest("button") ||
                (e.target as HTMLElement).closest(".drag-handle")
            )
                return

            if (e.shiftKey && lastSelectedId) {
                const currentIndex = songs.findIndex((s) => s.id === id)
                const lastIndex = songs.findIndex((s) => s.id === lastSelectedId)

                if (currentIndex !== -1 && lastIndex !== -1) {
                    const start = Math.min(currentIndex, lastIndex)
                    const end = Math.max(currentIndex, lastIndex)
                    const rangeIds = songs.slice(start, end + 1).map((s) => s.id)

                    setSelectedSongIds((prev) => Array.from(new Set([...prev, ...rangeIds])))
                    setLastSelectedId(id)
                    return
                }
            }

            setSelectedSongIds((prev) => {
                if (prev.includes(id)) {
                    setLastSelectedId(null)
                    return prev.filter((i) => i !== id)
                }
                setLastSelectedId(id)
                return [...prev, id]
            })
        },
        [lastSelectedId],
    )

    const toggleSelectAll = useCallback((allIds: string[]) => {
        setSelectedSongIds((prev) => (prev.length === allIds.length ? [] : allIds))
    }, [])

    const clearSelection = useCallback(() => {
        setSelectedSongIds([])
        setLastSelectedId(null)
    }, [])

    const getSelectedSongs = useCallback(
        (songs: Song[]) => songs.filter((s) => selectedSongIds.includes(s.id)),
        [selectedSongIds],
    )

    return {
        selectedSongIds,
        toggleSelect,
        toggleSelectAll,
        clearSelection,
        getSelectedSongs,
    }
}
