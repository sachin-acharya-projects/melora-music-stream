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
        onSuccess: (_data, { playlistId }) => {
            queryClient.invalidateQueries({ queryKey: ["playlists"] })
            queryClient.invalidateQueries({ queryKey: ["playlist", playlistId] })
        },
    })

    const addSongsBulkToPlaylistMutation = useMutation({
        mutationFn: ({ playlistId, songs }: { playlistId: string; songs: Song[] }) =>
            playlistService.addSongsBulk(playlistId, songs),
        onSuccess: (_data, { playlistId }) => {
            queryClient.invalidateQueries({ queryKey: ["playlists"] })
            queryClient.invalidateQueries({ queryKey: ["playlist", playlistId] })
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
        onSuccess: (_data, { id }) => {
            queryClient.invalidateQueries({ queryKey: ["playlists"] })
            queryClient.invalidateQueries({ queryKey: ["playlist", id] })
            toast.success("Playlist renamed")
        },
        onError: () => toast.error("Failed to rename playlist"),
    })

    const deletePlaylistMutation = useMutation({
        mutationFn: playlistService.delete,
        onSuccess: (_data, id) => {
            queryClient.invalidateQueries({ queryKey: ["playlists"] })
            queryClient.invalidateQueries({ queryKey: ["playlist", id] })
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
        onSuccess: (_data, { playlistId }) => {
            queryClient.invalidateQueries({ queryKey: ["playlists"] })
            queryClient.invalidateQueries({ queryKey: ["playlist", playlistId] })
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
        addSong: addSongToPlaylistMutation.mutateAsync,
        isAdding: addSongToPlaylistMutation.isPending,
        addSongsBulk: addSongsBulkToPlaylistMutation.mutateAsync,
        isAddingBulk: addSongsBulkToPlaylistMutation.isPending,
        importPlaylist: importPlaylistMutation.mutateAsync,
        isImporting: importPlaylistMutation.isPending,
        renamePlaylist: renamePlaylistMutation.mutate,
        isRenaming: renamePlaylistMutation.isPending,
        deletePlaylist: deletePlaylistMutation.mutate,
        isDeleting: deletePlaylistMutation.isPending,
        removeSongs: removeSongsMutation.mutate,
        isRemoving: removeSongsMutation.isPending,
    }
}

export function usePlaylist(id: string | null, options: PlaylistSortOptions = {}) {
    return useQuery({
        queryKey: ["playlist", id, options],
        queryFn: () => (id ? playlistService.getById(id, options) : null),
        enabled: !!id,
    })
}
