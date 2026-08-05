import { type Song } from "@/types"
import { ENDPOINTS } from "@/utils/api/endpoints"
import { http } from "@/utils/api/http"

export interface UserState {
    last_song_id: string | null
    current_queue: Song[]
    recent_songs: Song[]
    last_playlist_id: string | null
}

export const apiService = {
    search: async (q: string): Promise<Song[]> => {
        if (!q) return []
        const { data } = await http.get<Song[]>(ENDPOINTS.SEARCH, { params: { q } })
        return data
    },

    getRelatedSongs: async (songId: string, limit = 6): Promise<Song[]> => {
        const { data } = await http.get<Song[]>(ENDPOINTS.RELATED_SONGS(songId), {
            params: { limit },
        })
        return data
    },

    getStreamUrl: async (videoId: string) => {
        const { data } = await http.get<{ url: string; title: string; thumbnail: string }>(
            ENDPOINTS.STREAM(videoId),
        )
        return data
    },

    getDownloadUrl: (videoId: string) => {
        return `${import.meta.env.VITE_BASE_URL}/api/v1${ENDPOINTS.DOWNLOAD(videoId)}`
    },

    getState: async (): Promise<UserState> => {
        const { data } = await http.get<UserState>(ENDPOINTS.STATE)
        return data
    },

    updateState: async (state: Partial<UserState>): Promise<void> => {
        await http.post(ENDPOINTS.STATE, state)
    },
}
