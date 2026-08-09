import { type Song } from "@/types"
import { ENDPOINTS } from "@/utils/api/endpoints"
import { http } from "@/utils/api/http"

export interface DiscoverAlbum {
    audio_playlist_id: string
    browse_id?: string | null
    title: string
    artists: string[]
    thumbnail: string
    songs: Song[]
}

export interface DiscoverPlaylist {
    playlistId: string
    title: string
    thumbnail: string
    category?: string | null
    songs: Song[]
}

export interface DiscoverFeed {
    top_songs: Song[]
    new_releases: DiscoverAlbum[]
    mood_playlists: DiscoverPlaylist[]
}

export const discoverService = {
    getFeed: async (): Promise<DiscoverFeed> => {
        const { data } = await http.get<DiscoverFeed>(ENDPOINTS.DISCOVER.BASE)
        return data
    },
}
