import { type Playlist, type Song } from "@/types"
import { http } from "@/utils/api/http"

export interface PlaylistSortOptions {
    sort_by?: "name" | "created_at" | "title"
    order?: "asc" | "desc"
    q?: string
}

export const playlistService = {
    getAll: async (options: PlaylistSortOptions = {}): Promise<Playlist[]> => {
        const { data } = await http.get<Playlist[]>("/playlists/", { params: options })
        return data
    },

    getById: async (id: string, options: PlaylistSortOptions = {}): Promise<Playlist> => {
        const { data } = await http.get<Playlist>(`/playlists/${id}`, { params: options })
        return data
    },

    create: async (name: string): Promise<Playlist> => {
        const { data } = await http.post("/playlists/", { name })
        return data
    },

    rename: async (id: string, name: string): Promise<Playlist> => {
        const { data } = await http.patch(`/playlists/${id}`, { name })
        return data
    },

    delete: async (id: string): Promise<void> => {
        await http.delete(`/playlists/${id}`)
    },

    addSong: async (playlistIdOrName: string, song: Song): Promise<void> => {
        await http.post(`/playlists/${encodeURIComponent(playlistIdOrName)}/add`, song)
    },

    removeSong: async (playlistId: string, songId: string): Promise<void> => {
        await http.delete(`/playlists/${playlistId}/songs/${songId}`)
    },

    import: async (payload: { url: string; name?: string; id?: string }): Promise<void> => {
        await http.post("/playlists/import", payload)
    },
}
