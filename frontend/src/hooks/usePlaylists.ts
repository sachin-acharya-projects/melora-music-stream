import {
    playlistService,
    type PlaylistSortOptions,
    type PlaylistUpdatePayload,
} from "@/services/playlist.service"
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
        mutationFn: ({
            name,
            description,
            visibility,
        }: {
            name: string
            description?: string
            visibility?: "private" | "public"
        }) => playlistService.create(name, description, visibility),
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
        onSuccess: (_data, { id }) => {
            queryClient.invalidateQueries({ queryKey: ["playlists"] })
            if (id) {
                queryClient.invalidateQueries({ queryKey: ["playlist", id] })
            }
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

    const deletePlaylistsBulkMutation = useMutation({
        mutationFn: async (ids: string[]) => {
            for (const id of ids) {
                await playlistService.delete(id)
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["playlists"] })
            toast.success("Playlists deleted")
        },
        onError: () => toast.error("Failed to delete some playlists"),
    })

    const updatePlaylistMutation = useMutation({
        mutationFn: ({ id, payload }: { id: string; payload: PlaylistUpdatePayload }) =>
            playlistService.update(id, payload),
        onSuccess: (_data, { id }) => {
            queryClient.invalidateQueries({ queryKey: ["playlists"] })
            queryClient.invalidateQueries({ queryKey: ["playlist", id] })
            toast.success("Playlist updated")
        },
        onError: () => toast.error("Failed to update playlist"),
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
        deletePlaylistsBulk: deletePlaylistsBulkMutation.mutateAsync,
        isDeletingBulk: deletePlaylistsBulkMutation.isPending,
        updatePlaylist: updatePlaylistMutation.mutate,
        isUpdating: updatePlaylistMutation.isPending,
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

export function useDiscoverPlaylists(limit = 50) {
    return useQuery({
        queryKey: ["playlists", "discover"],
        queryFn: () => playlistService.getDiscover(limit),
    })
}

export function useFollowingPlaylists() {
    return useQuery({
        queryKey: ["playlists", "following"],
        queryFn: () => playlistService.getFollowing(),
    })
}

export function useFollowPlaylist() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: playlistService.toggleFollow,
        onSuccess: (result, playlistId) => {
            queryClient.invalidateQueries({ queryKey: ["playlists"] })
            queryClient.invalidateQueries({ queryKey: ["playlist", playlistId] })
            toast.success(result.is_following ? "Following playlist" : "Unfollowed playlist")
        },
        onError: () => toast.error("Failed to update follow"),
    })
}
