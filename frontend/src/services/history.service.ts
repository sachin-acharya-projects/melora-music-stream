import { type HistoryItem, type HistoryListResponse, type Song } from "@/types"
import { ENDPOINTS } from "@/utils/api/endpoints"
import { http } from "@/utils/api/http"
import { API_LIMITS } from "@/utils/constants"

export interface HistorySortOptions {
    page?: number
    page_size?: number
}

export const historyService = {
    record: async (song: Song, playDuration?: number): Promise<HistoryItem> => {
        const { data } = await http.post<HistoryItem>(ENDPOINTS.HISTORY.BASE, {
            song: {
                id: song.id,
                title: song.title,
                uploader: song.uploader,
                thumbnail: song.thumbnail,
                duration: song.duration,
            },
            play_duration: playDuration,
        })
        return data
    },

    updateDuration: async (entryId: string, playDuration: number): Promise<void> => {
        await http.patch(`${ENDPOINTS.HISTORY.BASE}${entryId}`, {
            play_duration: playDuration,
        })
    },

    getAll: async (options: HistorySortOptions = {}): Promise<HistoryListResponse> => {
        const { data } = await http.get<HistoryListResponse>(ENDPOINTS.HISTORY.BASE, {
            params: options,
        })
        return data
    },

    getRecent: async (limit: number = API_LIMITS.RECENT_HISTORY): Promise<HistoryItem[]> => {
        const { data } = await http.get<HistoryItem[]>(ENDPOINTS.HISTORY.RECENT, {
            params: { limit },
        })
        return data
    },
}
