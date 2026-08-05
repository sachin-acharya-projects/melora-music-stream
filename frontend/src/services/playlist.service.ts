import { type Playlist, type PlaylistDetail, type Song } from "@/types"
import { ENDPOINTS } from "@/utils/api/endpoints"
import { http } from "@/utils/api/http"

export interface PlaylistSortOptions {
    sort_by?: "name" | "created_at" | "title"
    order?: "asc" | "desc"
    q?: string
    page?: number
    page_size?: number
}

export const playlistService = {
    getAll: async (options: PlaylistSortOptions = {}): Promise<Playlist[]> => {
        const { data } = await http.get<Playlist[]>(ENDPOINTS.PLAYLISTS.BASE, { params: options })
        return data
    },

    getById: async (id: string, options: PlaylistSortOptions = {}): Promise<PlaylistDetail> => {
        const { data } = await http.get<PlaylistDetail>(ENDPOINTS.PLAYLISTS.BY_ID(id), {
            params: options,
        })
        return data
    },

    create: async (name: string): Promise<Playlist> => {
        const { data } = await http.post(ENDPOINTS.PLAYLISTS.BASE, { name })
        return data
    },

    rename: async (id: string, name: string): Promise<Playlist> => {
        const { data } = await http.patch(ENDPOINTS.PLAYLISTS.BY_ID(id), { name })
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
