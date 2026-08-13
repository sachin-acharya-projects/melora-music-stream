import { API_BASE_URL } from "@/config"
import {
    type LyricsResponse,
    type SearchResults,
    type Song,
} from "@/types"
import { ENDPOINTS } from "@/utils/api/endpoints"
import { http } from "@/utils/api/http"
import { API_LIMITS } from "@/utils/constants"

export interface UserState {
    last_song_id: string | null
    current_queue: Song[]
    recent_songs: Song[]
    last_playlist_id: string | null
}

const EMPTY_SEARCH: SearchResults = {
    top_result: null,
    artists: [],
    songs: [],
    albums: [],
    playlists: [],
    videos: [],
    cached: false,
}

export const apiService = {
    search: async (q: string): Promise<SearchResults> => {
        if (!q) return { ...EMPTY_SEARCH }
        const { data, headers } = await http.get<SearchResults>(ENDPOINTS.SEARCH, {
            params: { q },
        })
        return {
            ...data,
            cached: headers["x-cache-status"] === "HIT",
        }
    },

    getSearchSuggestions: async (q: string): Promise<string[]> => {
        if (!q.trim()) return []
        const { data } = await http.get<string[]>(ENDPOINTS.SEARCH_SUGGESTIONS, {
            params: { q },
        })
        return data
    },

    getSearchTracks: async (playlistId: string): Promise<Song[]> => {
        const { data } = await http.get<Song[]>(ENDPOINTS.SEARCH_TRACKS, {
            params: { playlist_id: playlistId },
        })
        return data
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
