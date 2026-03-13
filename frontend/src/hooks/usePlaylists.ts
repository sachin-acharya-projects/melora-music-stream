import { playlistService, type PlaylistSortOptions } from "@/services/playlist.service"
import { type Song } from "@/types"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "react-toastify"

export function usePlaylists(options: PlaylistSortOptions = {}) {
    const queryClient = useQueryClient()

    const playlistsQuery = useQuery({
        queryKey: ["playlists", options],
        queryFn: () => playlistService.getAll(options),
    })

    const createPlaylistMutation = useMutation({
        mutationFn: playlistService.create,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["playlists"] })
        },
    })

    const addSongToPlaylistMutation = useMutation({
        mutationFn: ({ playlistId, song }: { playlistId: string; song: Song }) =>
            playlistService.addSong(playlistId, song),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["playlists"] })
        },
    })

    const importPlaylistMutation = useMutation({
        mutationFn: playlistService.import,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["playlists"] })
            toast.success("Playlist imported successfully")
        },
        onError: () => toast.error("Failed to import playlist"),
    })

    const renamePlaylistMutation = useMutation({
        mutationFn: ({ id, name }: { id: string; name: string }) =>
            playlistService.rename(id, name),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["playlists"] })
            toast.success("Playlist renamed")
        },
        onError: () => toast.error("Failed to rename playlist"),
    })

    const deletePlaylistMutation = useMutation({
        mutationFn: playlistService.delete,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["playlists"] })
            toast.success("Playlist deleted")
        },
        onError: () => toast.error("Failed to delete playlist"),
    })

    const removeSongsMutation = useMutation({
        mutationFn: async ({ playlistId, songIds }: { playlistId: string; songIds: string[] }) => {
            for (const id of songIds) {
                await playlistService.removeSong(playlistId, id)
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["playlists"] })
            toast.success("Songs removed from playlist")
        },
        onError: () => toast.error("Failed to remove some songs"),
    })

    return {
        playlists: playlistsQuery.data || [],
        isLoading: playlistsQuery.isLoading,
        isError: playlistsQuery.isError,
        createPlaylist: createPlaylistMutation.mutateAsync,
        isCreating: createPlaylistMutation.isPending,
        addSong: addSongToPlaylistMutation.mutateAsync, // Exporting Async for easier loop handling
        isAdding: addSongToPlaylistMutation.isPending,
        importPlaylist: importPlaylistMutation.mutate,
        isImporting: importPlaylistMutation.isPending,
        renamePlaylist: renamePlaylistMutation.mutate,
        isRenaming: renamePlaylistMutation.isPending,
        deletePlaylist: deletePlaylistMutation.mutate,
        isDeleting: deletePlaylistMutation.isPending,
        removeSongs: removeSongsMutation.mutate,
        isRemoving: removeSongsMutation.isPending,
    }
}
