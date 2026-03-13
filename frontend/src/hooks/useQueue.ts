import { type Song } from "@/types"
import { create } from "zustand"

interface QueueItem extends Song {
    format: "audio" | "video"
    include_subtitle: boolean
}

interface QueueStore {
    queue: QueueItem[]
    add: (song: Song, format?: "audio" | "video", include_subtitle?: boolean) => void
    remove: (id: string) => void
    reorder: (queue: QueueItem[]) => void
    clear: () => void
}

export const useQueueStore = create<QueueStore>((set) => ({
    queue: [],
    add: (song, format = "audio", include_subtitle = false) =>
        set((state) => ({
            queue: [
                ...state.queue,
                {
                    ...song,
                    format,
                    include_subtitle,
                },
            ],
        })),
    remove: (id) =>
        set((state) => ({
            queue: state.queue.filter((item) => item.id !== id),
        })),
    reorder: (queue) => set({ queue }),
    clear: () => set({ queue: [] }),
}))
