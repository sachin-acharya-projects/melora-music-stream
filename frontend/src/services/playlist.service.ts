import {
    type CollaboratorRole,
    type Playlist,
    type PlaylistCollaborator,
    type PlaylistDetail,
    type PlaylistVisibility,
    type Song,
    type UserSearchResult,
} from "@/types"
import { ENDPOINTS } from "@/utils/api/endpoints"
import { http } from "@/utils/api/http"
import { API_LIMITS } from "@/utils/constants"

export interface PlaylistSortOptions {
    sort_by?: "name" | "created_at" | "title" | "uploader" | "duration" | "position"
    order?: "asc" | "desc"
    q?: string
    page?: number
    page_size?: number
}

export interface PlaylistUpdatePayload {
    name?: string
    description?: string | null
    visibility?: PlaylistVisibility
}

export interface PlaylistOption {
    id: string
    name: string
}

export const playlistService = {
    getAll: async (options: PlaylistSortOptions = {}): Promise<Playlist[]> => {
        const { data } = await http.get<Playlist[]>(ENDPOINTS.PLAYLISTS.BASE, { params: options })
        return data
    },

    getOptions: async (): Promise<PlaylistOption[]> => {
        const { data } = await http.get<PlaylistOption[]>(ENDPOINTS.PLAYLISTS.OPTIONS)
        return data
    },

    getDiscover: async (
        limit: number = API_LIMITS.DISCOVER_PLAYLISTS,
        q?: string,
    ): Promise<Playlist[]> => {
        const { data } = await http.get<Playlist[]>(ENDPOINTS.PLAYLISTS.DISCOVER, {
            params: { limit, q },
        })
        return data
    },

    getFollowing: async (q?: string): Promise<Playlist[]> => {
        const { data } = await http.get<Playlist[]>(ENDPOINTS.PLAYLISTS.FOLLOWING, {
            params: { q },
        })
        return data
    },

    getById: async (id: string, options: PlaylistSortOptions = {}): Promise<PlaylistDetail> => {
        const { data } = await http.get<PlaylistDetail>(ENDPOINTS.PLAYLISTS.BY_ID(id), {
            params: options,
        })
        return data
    },

    create: async (
        name: string,
        description?: string,
        visibility?: PlaylistVisibility,
    ): Promise<Playlist> => {
        const { data } = await http.post(ENDPOINTS.PLAYLISTS.BASE, {
            name,
            description,
            visibility,
        })
        return data
    },

    rename: async (id: string, name: string): Promise<Playlist> => {
        const { data } = await http.patch(ENDPOINTS.PLAYLISTS.BY_ID(id), { name })
        return data
    },

    update: async (id: string, payload: PlaylistUpdatePayload): Promise<Playlist> => {
        const { data } = await http.patch(ENDPOINTS.PLAYLISTS.BY_ID(id), payload)
        return data
    },

    toggleFollow: async (
        id: string,
    ): Promise<{ is_following: boolean; follower_count: number }> => {
        const { data } = await http.post<{ is_following: boolean; follower_count: number }>(
            ENDPOINTS.PLAYLISTS.FOLLOW(id),
        )
        return data
    },

    toggleCollaborative: async (id: string): Promise<{ is_collaborative: boolean }> => {
        const { data } = await http.post<{ is_collaborative: boolean }>(
            ENDPOINTS.PLAYLISTS.COLLABORATIVE(id),
        )
        return data
    },

    getCollaborators: async (id: string): Promise<PlaylistCollaborator[]> => {
        const { data } = await http.get<PlaylistCollaborator[]>(
            ENDPOINTS.PLAYLISTS.COLLABORATORS(id),
        )
        return data
    },

    addCollaborator: async (id: string, userId: string, role: CollaboratorRole): Promise<void> => {
        await http.post(ENDPOINTS.PLAYLISTS.COLLABORATORS(id), { user_id: userId, role })
    },

    removeCollaborator: async (id: string, userId: string): Promise<void> => {
        await http.delete(ENDPOINTS.PLAYLISTS.COLLABORATOR(id, userId))
    },

    searchUsers: async (query: string): Promise<UserSearchResult[]> => {
        const { data } = await http.get<UserSearchResult[]>(ENDPOINTS.USERS.SEARCH(query))
        return data
    },

    delete: async (id: string): Promise<void> => {
        await http.delete(ENDPOINTS.PLAYLISTS.BY_ID(id))
    },

    addSong: async (playlistIdOrName: string, song: Song): Promise<void> => {
        await http.post(ENDPOINTS.PLAYLISTS.ADD_SONG(playlistIdOrName), song)
    },

    addSongsBulk: async (playlistIdOrName: string, songs: Song[]): Promise<void> => {
        await http.post(ENDPOINTS.PLAYLISTS.ADD_SONGS_BULK(playlistIdOrName), songs)
    },

    removeSong: async (playlistId: string, songId: string): Promise<void> => {
        await http.delete(ENDPOINTS.PLAYLISTS.REMOVE_SONG(playlistId, songId))
    },

    import: async (payload: { url: string; name?: string; id?: string }): Promise<void> => {
        await http.post(ENDPOINTS.PLAYLISTS.IMPORT, payload)
    },

    sync: async (playlistId: string): Promise<{ count: number }> => {
        const { data } = await http.post<{ count: number }>(ENDPOINTS.PLAYLISTS.SYNC(playlistId))
        return data
    },

    reorder: async (playlistId: string, songIds: string[]): Promise<void> => {
        await http.post(ENDPOINTS.PLAYLISTS.REORDER(playlistId), { song_ids: songIds })
    },

    createShareLink: async (playlistId: string): Promise<string> => {
        const { data } = await http.post<{ token: string }>(ENDPOINTS.PLAYLISTS.SHARE(playlistId))
        return data.token
    },

    revokeShareLink: async (playlistId: string): Promise<void> => {
        await http.delete(ENDPOINTS.PLAYLISTS.SHARE(playlistId))
    },

    getSharedPlaylist: async (token: string): Promise<Playlist> => {
        const { data } = await http.get<Playlist>(ENDPOINTS.PLAYLISTS.SHARED_BY_TOKEN(token))
        return data
    },
}
