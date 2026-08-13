import {
    type AdminArtist,
    type AdminDashboard,
    type AdminListResponse,
    type AdminSong,
    type AdminUser,
    type BatchImportResponse,
    type PlaylistImportResponse,
} from "@/types"
import { ENDPOINTS } from "@/utils/api/endpoints"
import { http } from "@/utils/api/http"
import { type ArtistSortField } from "@/services/artist.service"

export interface AdminArtistQuery {
    search?: string
    sort_by?: ArtistSortField
    order?: "asc" | "desc"
    page?: number
    page_size?: number
    source?: "youtube" | "platform"
    published?: boolean
}

export interface AdminSongQuery {
    search?: string
    page?: number
    page_size?: number
    published?: boolean
}

export interface AdminUserQuery {
    search?: string
    page?: number
    page_size?: number
}

export const adminService = {
    getDashboard: async (): Promise<AdminDashboard> => {
        const { data } = await http.get<AdminDashboard>(ENDPOINTS.ADMIN.DASHBOARD)
        return data
    },

    getArtists: async (options: AdminArtistQuery = {}): Promise<AdminListResponse<AdminArtist>> => {
        const { data } = await http.get<AdminListResponse<AdminArtist>>(ENDPOINTS.ADMIN.ARTISTS, {
            params: options,
        })
        return data
    },

    updateArtist: async (
        id: string,
        update: { name?: string; bio?: string; genres?: string[]; thumbnail_url?: string },
    ): Promise<AdminArtist> => {
        const { data } = await http.patch<AdminArtist>(ENDPOINTS.ADMIN.ARTIST(id), update)
        return data
    },

    featureArtist: async (id: string): Promise<AdminArtist> => {
        const { data } = await http.post<AdminArtist>(ENDPOINTS.ADMIN.ARTIST_FEATURE(id))
        return data
    },

    unfeatureArtist: async (id: string): Promise<AdminArtist> => {
        const { data } = await http.post<AdminArtist>(ENDPOINTS.ADMIN.ARTIST_UNFEATURE(id))
        return data
    },

    publishArtist: async (id: string): Promise<AdminArtist> => {
        const { data } = await http.post<AdminArtist>(ENDPOINTS.ADMIN.ARTIST_PUBLISH(id))
        return data
    },

    hideArtist: async (id: string): Promise<AdminArtist> => {
        const { data } = await http.post<AdminArtist>(ENDPOINTS.ADMIN.ARTIST_HIDE(id))
        return data
    },

    deleteArtist: async (id: string): Promise<{ id: string; deleted: boolean }> => {
        const { data } = await http.delete<{ id: string; deleted: boolean }>(
            ENDPOINTS.ADMIN.ARTIST(id),
        )
        return data
    },

    batchImportArtists: async (items: string[], thumbnail?: string | null): Promise<BatchImportResponse> => {
        const { data } = await http.post<BatchImportResponse>(ENDPOINTS.ADMIN.ARTIST_BATCH_IMPORT, {
            items,
            thumbnail,
        })
        return data
    },

    getSongs: async (options: AdminSongQuery = {}): Promise<AdminListResponse<AdminSong>> => {
        const { data } = await http.get<AdminListResponse<AdminSong>>(ENDPOINTS.ADMIN.SONGS, {
            params: options,
        })
        return data
    },

    importSong: async (url: string): Promise<AdminSong & { imported: boolean }> => {
        const { data } = await http.post<AdminSong & { imported: boolean }>(
            ENDPOINTS.ADMIN.SONG_IMPORT,
            { url },
        )
        return data
    },

    updateSong: async (
        id: string,
        update: { title?: string; uploader?: string; thumbnail?: string },
    ): Promise<AdminSong> => {
        const { data } = await http.patch<AdminSong>(ENDPOINTS.ADMIN.SONG(id), update)
        return data
    },

    featureSong: async (id: string): Promise<AdminSong> => {
        const { data } = await http.post<AdminSong>(ENDPOINTS.ADMIN.SONG_FEATURE(id))
        return data
    },

    unfeatureSong: async (id: string): Promise<AdminSong> => {
        const { data } = await http.post<AdminSong>(ENDPOINTS.ADMIN.SONG_UNFEATURE(id))
        return data
    },

    publishSong: async (id: string): Promise<AdminSong> => {
        const { data } = await http.post<AdminSong>(ENDPOINTS.ADMIN.SONG_PUBLISH(id))
        return data
    },

    hideSong: async (id: string): Promise<AdminSong> => {
        const { data } = await http.post<AdminSong>(ENDPOINTS.ADMIN.SONG_HIDE(id))
        return data
    },

    deleteSong: async (id: string): Promise<{ id: string; deleted: boolean }> => {
        const { data } = await http.delete<{ id: string; deleted: boolean }>(ENDPOINTS.ADMIN.SONG(id))
        return data
    },

    importPlaylist: async (url: string): Promise<PlaylistImportResponse> => {
        const { data } = await http.post<PlaylistImportResponse>(ENDPOINTS.ADMIN.PLAYLIST_IMPORT, {
            url,
        })
        return data
    },

    getUsers: async (options: AdminUserQuery = {}): Promise<AdminListResponse<AdminUser>> => {
        const { data } = await http.get<AdminListResponse<AdminUser>>(ENDPOINTS.ADMIN.USERS, {
            params: options,
        })
        return data
    },

    updateUser: async (
        id: string,
        update: { role?: string; is_active?: boolean },
    ): Promise<AdminUser> => {
        const { data } = await http.patch<AdminUser>(ENDPOINTS.ADMIN.USER(id), update)
        return data
    },
}
