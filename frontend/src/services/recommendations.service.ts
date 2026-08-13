import { type Song } from "@/types"
import { ENDPOINTS } from "@/utils/api/endpoints"
import { http } from "@/utils/api/http"
import { API_LIMITS } from "@/utils/constants"

export interface RadioMood {
    id: string
    label: string
    genres: string[]
}

export interface RadioSeedResponse {
    genres: string[]
    top_artists: Array<{ name: string; plays: number }>
}

export interface RadioGenrePlaylist {
    id: string | null
    title: string
    thumbnail: string
}

export interface RadioGenre {
    name: string
    playlists: RadioGenrePlaylist[]
}

export interface RadioResponse {
    seed_type: "genre" | "artist" | "mood"
    seed_value: string
    count: number
    songs: Song[]
}

export type RadioSeedType = RadioResponse["seed_type"]

export const recommendationsService = {
    getRecommendations: async (limit: number = API_LIMITS.RECOMMENDATIONS): Promise<Song[]> => {
        const { data } = await http.get<Song[]>(ENDPOINTS.RECOMMENDATIONS.BASE, {
            params: { limit },
        })
        return data
    },

    getRadioMoods: async (): Promise<RadioMood[]> => {
        const { data } = await http.get<RadioMood[]>(ENDPOINTS.RADIO.MOODS)
        return data
    },

    getRadioGenres: async (): Promise<RadioGenre[]> => {
        const { data } = await http.get<RadioGenre[]>(ENDPOINTS.RADIO.GENRES)
        return data
    },

    getRadioSeeds: async (): Promise<RadioSeedResponse> => {
        const { data } = await http.get<RadioSeedResponse>(ENDPOINTS.RADIO.SEEDS)
        return data
    },

    generateRadio: async (
        seedType: RadioSeedType,
        seedValue: string,
        count: number = API_LIMITS.RADIO_COUNT,
    ): Promise<RadioResponse> => {
        const { data } = await http.get<RadioResponse>(ENDPOINTS.RADIO.BASE, {
            params: { seed_type: seedType, seed_value: seedValue, count },
        })
        return data
    },
}
