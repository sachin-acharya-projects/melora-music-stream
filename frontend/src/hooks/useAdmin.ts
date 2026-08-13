import { adminService, type AdminArtistQuery, type AdminSongQuery, type AdminUserQuery } from "@/services/admin.service"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "react-toastify"

export function useAdminDashboard() {
    return useQuery({
        queryKey: ["admin", "dashboard"],
        queryFn: () => adminService.getDashboard(),
    })
}

export function useAdminArtists(options: AdminArtistQuery = {}) {
    return useQuery({
        queryKey: ["admin", "artists", options],
        queryFn: () => adminService.getArtists(options),
    })
}

export function useAdminSongs(options: AdminSongQuery = {}) {
    return useQuery({
        queryKey: ["admin", "songs", options],
        queryFn: () => adminService.getSongs(options),
    })
}

export function useAdminUsers(options: AdminUserQuery = {}) {
    return useQuery({
        queryKey: ["admin", "users", options],
        queryFn: () => adminService.getUsers(options),
    })
}

export function useAdminArtistActions() {
    const queryClient = useQueryClient()

    const invalidate = () => {
        queryClient.invalidateQueries({ queryKey: ["admin", "artists"] })
        queryClient.invalidateQueries({ queryKey: ["admin", "dashboard"] })
        queryClient.invalidateQueries({ queryKey: ["artists"] })
        queryClient.invalidateQueries({ queryKey: ["artist"] })
    }

    const updateArtist = useMutation({
        mutationFn: ({ id, update }: { id: string; update: Parameters<typeof adminService.updateArtist>[1] }) =>
            adminService.updateArtist(id, update),
        onSuccess: () => {
            invalidate()
            toast.success("Artist updated")
        },
        onError: () => toast.error("Failed to update artist"),
    })

    const featureArtist = useMutation({
        mutationFn: ({ id, featured }: { id: string; featured: boolean }) =>
            featured ? adminService.featureArtist(id) : adminService.unfeatureArtist(id),
        onSuccess: (artist) => {
            invalidate()
            toast.success(artist.is_featured ? "Artist featured" : "Artist unfeatured")
        },
        onError: () => toast.error("Failed to update artist"),
    })

    const publishArtist = useMutation({
        mutationFn: ({ id, published }: { id: string; published: boolean }) =>
            published ? adminService.publishArtist(id) : adminService.hideArtist(id),
        onSuccess: (artist) => {
            invalidate()
            toast.success(artist.is_published ? "Artist published" : "Artist hidden")
        },
        onError: () => toast.error("Failed to update artist"),
    })

    const deleteArtist = useMutation({
        mutationFn: (id: string) => adminService.deleteArtist(id),
        onSuccess: () => {
            invalidate()
            toast.success("Artist deleted")
        },
        onError: () => toast.error("Failed to delete artist"),
    })

    return { updateArtist, featureArtist, publishArtist, deleteArtist }
}

export function useAdminSongActions() {
    const queryClient = useQueryClient()

    const invalidate = () => {
        queryClient.invalidateQueries({ queryKey: ["admin", "songs"] })
        queryClient.invalidateQueries({ queryKey: ["admin", "dashboard"] })
        queryClient.invalidateQueries({ queryKey: ["artists"] })
        queryClient.invalidateQueries({ queryKey: ["artist"] })
    }

    const updateSong = useMutation({
        mutationFn: ({ id, update }: { id: string; update: Parameters<typeof adminService.updateSong>[1] }) =>
            adminService.updateSong(id, update),
        onSuccess: () => {
            invalidate()
            toast.success("Song updated")
        },
        onError: () => toast.error("Failed to update song"),
    })

    const featureSong = useMutation({
        mutationFn: ({ id, featured }: { id: string; featured: boolean }) =>
            featured ? adminService.featureSong(id) : adminService.unfeatureSong(id),
        onSuccess: (song) => {
            invalidate()
            toast.success(song.is_featured ? "Song featured" : "Song unfeatured")
        },
        onError: () => toast.error("Failed to update song"),
    })

    const publishSong = useMutation({
        mutationFn: ({ id, published }: { id: string; published: boolean }) =>
            published ? adminService.publishSong(id) : adminService.hideSong(id),
        onSuccess: (song) => {
            invalidate()
            toast.success(song.is_published ? "Song published" : "Song hidden")
        },
        onError: () => toast.error("Failed to update song"),
    })

    const deleteSong = useMutation({
        mutationFn: (id: string) => adminService.deleteSong(id),
        onSuccess: () => {
            invalidate()
            toast.success("Song deleted")
        },
        onError: () => toast.error("Failed to delete song"),
    })

    return { updateSong, featureSong, publishSong, deleteSong }
}

export function useAdminUserActions() {
    const queryClient = useQueryClient()

    const updateUser = useMutation({
        mutationFn: ({ id, update }: { id: string; update: Parameters<typeof adminService.updateUser>[1] }) =>
            adminService.updateUser(id, update),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin", "users"] })
            queryClient.invalidateQueries({ queryKey: ["admin", "dashboard"] })
        },
        onError: (error: { response?: { status?: number } }) => {
            const detail = (error as { response?: { data?: { detail?: string } } })?.response?.data
                ?.detail
            toast.error(detail || "Failed to update user")
        },
    })

    return { updateUser }
}

export function useBatchImportArtists() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: ({ items, thumbnail }: { items: string[]; thumbnail?: string | null }) =>
            adminService.batchImportArtists(items, thumbnail),
        onSuccess: (result) => {
            queryClient.invalidateQueries({ queryKey: ["admin", "artists"] })
            queryClient.invalidateQueries({ queryKey: ["admin", "dashboard"] })
            queryClient.invalidateQueries({ queryKey: ["artists"] })
            toast.success(
                `Imported ${result.imported} artist${result.imported === 1 ? "" : "s"}${
                    result.already_exists ? `, ${result.already_exists} already in library` : ""
                }`,
            )
        },
        onError: () => toast.error("Batch import failed"),
    })
}

export function useAdminSongImport() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (url: string) => adminService.importSong(url),
        onSuccess: (song) => {
            queryClient.invalidateQueries({ queryKey: ["admin", "songs"] })
            queryClient.invalidateQueries({ queryKey: ["admin", "dashboard"] })
            queryClient.invalidateQueries({ queryKey: ["artists"] })
            toast.success(`Imported "${song.title}"`)
        },
        onError: (error: { response?: { status?: number } }) => {
            const detail = (error as { response?: { data?: { detail?: string } } })?.response?.data
                ?.detail
            toast.error(detail || "Failed to import song")
        },
    })
}

export function useAdminPlaylistImport() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (url: string) => adminService.importPlaylist(url),
        onSuccess: (result) => {
            queryClient.invalidateQueries({ queryKey: ["admin", "songs"] })
            queryClient.invalidateQueries({ queryKey: ["admin", "dashboard"] })
            queryClient.invalidateQueries({ queryKey: ["artists"] })
            toast.success(
                `Playlist import done: ${result.imported} new, ${result.skipped_existing} already in library`,
            )
        },
        onError: (error: { response?: { status?: number } }) => {
            const detail = (error as { response?: { data?: { detail?: string } } })?.response?.data
                ?.detail
            toast.error(detail || "Playlist import failed")
        },
    })
}
