import { ENDPOINTS } from "@/utils/api/endpoints"
import { http } from "@/utils/api/http"
import {
    type AlbumDetail,
    type AlbumDetailResponse,
    type FavoriteAlbum,
    type SearchAlbumItem,
} from "@/types"

export interface AlbumFavoritePayload {
    title?: string
    artist_name?: string
    year?: number
    thumbnail_url?: string
    audio_playlist_id?: string
}

export const albumService = {
    favorite: async (
        browseId: string,
        payload: AlbumFavoritePayload = {},
    ): Promise<AlbumDetail> => {
        const { data } = await http.post<AlbumDetail>(
            ENDPOINTS.ALBUMS.FAVORITE(browseId),
            payload,
        )
        return data
    },

    unfavorite: async (browseId: string): Promise<void> => {
        await http.delete(ENDPOINTS.ALBUMS.FAVORITE(browseId))
    },

    getFavorites: async (): Promise<FavoriteAlbum[]> => {
        const { data } = await http.get<FavoriteAlbum[]>(ENDPOINTS.ALBUMS.FAVORITES)
        return data
    },

    getDetail: async (browseId: string): Promise<AlbumDetailResponse> => {
        const { data } = await http.get<AlbumDetailResponse>(
            ENDPOINTS.ALBUMS.BY_ID(browseId),
        )
        return data
    },
}

export function toFavoritePayload(album: SearchAlbumItem): AlbumFavoritePayload {
    return {
        title: album.title,
        artist_name: (album.artists ?? []).join(", "),
        year: album.year ?? undefined,
        thumbnail_url: album.thumbnail,
        audio_playlist_id: album.audio_playlist_id ?? undefined,
    }
}
