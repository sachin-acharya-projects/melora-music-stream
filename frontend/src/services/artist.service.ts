import {
    type Artist,
    type ArtistAlbumsResponse,
    type ArtistDetail,
    type ArtistFeaturedResponse,
    type ArtistListResponse,
    type ArtistSong,
    type ArtistSuggestedResponse,
    type YouTubeArtistSearchResponse,
} from "@/types"
import { ENDPOINTS } from "@/utils/api/endpoints"
import { http } from "@/utils/api/http"
import { API_LIMITS } from "@/utils/constants"

export type ArtistSortField =
    "name" | "follower_count" | "monthly_listeners" | "created_at" | "plays"

export interface ArtistSortOptions {
    search?: string
    sort_by?: ArtistSortField
    order?: "asc" | "desc"
    page?: number
    page_size?: number
    source?: "youtube"
}

export interface FollowingFilterOptions {
    search?: string
    source?: "youtube" | "platform"
}

export const artistService = {
    getAll: async (options: ArtistSortOptions = {}): Promise<ArtistListResponse> => {
        const { data } = await http.get<ArtistListResponse>(ENDPOINTS.ARTISTS.BASE, {
            params: options,
        })
        return data
    },

    getFollowing: async (options: FollowingFilterOptions = {}): Promise<Artist[]> => {
        const { data } = await http.get<Artist[]>(ENDPOINTS.ARTISTS.FOLLOWING, {
            params: options,
        })
        return data
    },

    getFeatured: async (): Promise<ArtistFeaturedResponse> => {
        const { data } = await http.get<ArtistFeaturedResponse>(ENDPOINTS.ARTISTS.FEATURED)
        return data
    },

    getSuggested: async (options: {
        page: number
        page_size: number
    }): Promise<ArtistSuggestedResponse> => {
        const { data } = await http.get<ArtistSuggestedResponse>(
            ENDPOINTS.ARTISTS.SUGGESTED,
            { params: options },
        )
        return data
    },

    getBySlug: async (slug: string): Promise<ArtistDetail> => {
        const { data } = await http.get<ArtistDetail>(ENDPOINTS.ARTISTS.BY_SLUG(slug))
        return data
    },

    getSongs: async (slug: string): Promise<ArtistSong[]> => {
        const { data } = await http.get<ArtistSong[]>(ENDPOINTS.ARTISTS.SONGS(slug))
        return data
    },

    getAlbums: async (slug: string): Promise<ArtistAlbumsResponse> => {
        const { data } = await http.get<ArtistAlbumsResponse>(ENDPOINTS.ARTISTS.ALBUMS(slug))
        return data
    },

    getRecentlyPlayed: async (
        slug: string,
        limit: number = API_LIMITS.ARTIST_RECENTLY_PLAYED,
    ): Promise<ArtistSong[]> => {
        const { data } = await http.get<ArtistSong[]>(ENDPOINTS.ARTISTS.RECENTLY_PLAYED(slug), {
            params: { limit },
        })
        return data
    },

    searchYouTube: async (
        query: string,
        limit: number = API_LIMITS.YOUTUBE_SEARCH,
    ): Promise<YouTubeArtistSearchResponse> => {
        const { data } = await http.get<YouTubeArtistSearchResponse>(
            ENDPOINTS.ARTISTS.YOUTUBE_SEARCH,
            { params: { q: query, limit } },
        )
        return data
    },

    importYouTube: async (artist: {
        channel_id: string
        name: string
        thumbnail: string | null
    }): Promise<{ slug: string; id: string }> => {
        const { data } = await http.post<{ slug: string; id: string }>(
            ENDPOINTS.ARTISTS.YOUTUBE_IMPORT,
            artist,
        )
        return data
    },

    toggleFollow: async (
        artistId: string,
    ): Promise<{ is_following: boolean; follower_count: number }> => {
        const { data } = await http.post<{ is_following: boolean; follower_count: number }>(
            ENDPOINTS.ARTISTS.FOLLOW(artistId),
        )
        return data
    },
}
