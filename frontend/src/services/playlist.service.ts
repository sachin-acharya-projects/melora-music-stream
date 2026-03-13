import { type Playlist, type Song } from "@/types"
import { http } from "@/utils/api/http"

export interface PlaylistSortOptions {
    sort_by?: "name" | "created_at"
    order?: "asc" | "desc"
}

export const playlistService = {
    getAll: async (options: PlaylistSortOptions = {}): Promise<Playlist[]> => {
        const res = await http.get<Playlist[]>("/playlists/", { params: options })
        return res.data
    },

    create: async (name: string): Promise<{ id: string; name: string; message: string }> => {
        const res = await http.post("/playlists/", { name })
        return res.data
    },

    addSong: async (
        playlistId: string,
        song: Song,
    ): Promise<{ message: string; playlist_id: string }> => {
        const res = await http.post(`/playlists/${playlistId}/add`, song)
        return res.data
    },

    import: async (vars: {
        url: string
        name?: string
        id?: string
    }): Promise<{ message: string; count: number; playlist_id: string }> => {
        const res = await http.post("/playlists/import", vars)
        return res.data
    },

    rename: async (
        id: string,
        name: string,
    ): Promise<{ id: string; name: string; message: string }> => {
        const res = await http.patch(`/playlists/${id}`, { name })
        return res.data
    },

    delete: async (id: string): Promise<void> => {
        await http.delete(`/playlists/${id}`)
    },

    removeSong: async (playlistId: string, songId: string): Promise<void> => {
        await http.delete(`/playlists/${playlistId}/songs/${songId}`)
    },
}
