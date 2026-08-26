import { albumService, type AlbumFavoritePayload } from "@/services/album.service"
import { type AlbumDetail, type AlbumDetailResponse, type FavoriteAlbum } from "@/types"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "react-toastify"

export function useAlbumFavorites() {
    return useQuery({
        queryKey: ["albums", "favorites"],
        queryFn: () => albumService.getFavorites(),
    })
}

export function useAlbumDetail(browseId: string | null) {
    return useQuery({
        queryKey: ["albums", "detail", browseId],
        queryFn: () => albumService.getDetail(browseId as string),
        enabled: !!browseId,
    })
}

export function useFavoriteAlbum() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: ({ browseId, payload }: { browseId: string; payload?: AlbumFavoritePayload }) =>
            albumService.favorite(browseId, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["albums"] })
        },
        onError: () => toast.error("Failed to favorite album"),
    })
}

export function useUnfavoriteAlbum() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (browseId: string) => albumService.unfavorite(browseId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["albums"] })
        },
        onError: () => toast.error("Failed to remove album"),
    })
}

export type { AlbumDetail, AlbumDetailResponse, FavoriteAlbum }
