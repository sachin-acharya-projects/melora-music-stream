import { API_BASE_URL } from "@/config"
import { type LyricsResponse, type Song } from "@/types"
import { ENDPOINTS } from "@/utils/api/endpoints"
import { http } from "@/utils/api/http"
import { API_LIMITS } from "@/utils/constants"

export interface UserState {
    last_song_id: string | null
    current_queue: Song[]
    recent_songs: Song[]
    last_playlist_id: string | null
}

export interface SearchResponse {
    songs: Song[]
    cached: boolean
}

export const apiService = {
    search: async (q: string): Promise<SearchResponse> => {
        if (!q) return { songs: [], cached: false }
        const { data, headers } = await http.get<Song[]>(ENDPOINTS.SEARCH, {
            params: { q },
        })
        return {
            songs: data,
            cached: headers["x-cache-status"] === "HIT",
        }
    },

    invalidateCache: async (scope: "search" | "stream", key: string): Promise<void> => {
        await http.post(ENDPOINTS.CACHE.INVALIDATE, { scope, key })
    },

    getRelatedSongs: async (
        songId: string,
        limit: number = API_LIMITS.RELATED_SONGS,
    ): Promise<Song[]> => {
        const { data } = await http.get<Song[]>(ENDPOINTS.RELATED_SONGS(songId), {
            params: { limit },
        })
        return data
    },

    getLyrics: async (songId: string): Promise<LyricsResponse> => {
        const { data } = await http.get<LyricsResponse>(ENDPOINTS.LYRICS(songId))
        return data
    },

    getStreamUrl: async (videoId: string) => {
        const { data } = await http.get<{ url: string; title: string; thumbnail: string }>(
            ENDPOINTS.STREAM(videoId),
        )
        return data
    },

    getDownloadUrl: (videoId: string) => {
        return `${API_BASE_URL}${ENDPOINTS.DOWNLOAD(videoId)}`
    },

    getState: async (): Promise<UserState> => {
        const { data } = await http.get<UserState>(ENDPOINTS.STATE)
        return data
    },

    updateState: async (state: Partial<UserState>): Promise<void> => {
        await http.post(ENDPOINTS.STATE, state)
    },
}
