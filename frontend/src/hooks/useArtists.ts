import {
    artistService,
    type ArtistSortOptions,
    type FollowingFilterOptions,
} from "@/services/artist.service"
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "react-toastify"
import { API_LIMITS } from "@/utils/constants"
import { MESSAGES } from "@/utils/messages"

const ARTISTS_PAGE_SIZE = 50

export function useArtists(options: ArtistSortOptions = {}, enabled = true) {
    return useInfiniteQuery({
        queryKey: ["artists", options],
        queryFn: ({ pageParam }) =>
            artistService.getAll({ ...options, page: pageParam, page_size: ARTISTS_PAGE_SIZE }),
        initialPageParam: 1,
        getNextPageParam: (lastPage, allPages) => {
            if (lastPage.items.length < ARTISTS_PAGE_SIZE) return undefined
            return allPages.length + 1
        },
        placeholderData: (previousData) => previousData,
        enabled,
    })
}

export function useFollowingArtists(options: FollowingFilterOptions = {}, enabled = true) {
    return useQuery({
        queryKey: ["artists", "following", options],
        queryFn: () => artistService.getFollowing(options),
        enabled,
    })
}

export function useFeaturedArtists(enabled = true) {
    return useQuery({
        queryKey: ["artists", "featured"],
        queryFn: () => artistService.getFeatured(),
        enabled,
    })
}

export function useSuggestedArtists(enabled = true) {
    return useInfiniteQuery({
        queryKey: ["artists", "suggested"],
        queryFn: ({ pageParam }) =>
            artistService.getSuggested({
                page: pageParam,
                page_size: API_LIMITS.ARTIST_SUGGESTED_PAGE,
            }),
        initialPageParam: 1,
        getNextPageParam: (lastPage, allPages) => {
            if (lastPage.items.length < API_LIMITS.ARTIST_SUGGESTED_PAGE) return undefined
            return allPages.length + 1
        },
        enabled,
    })
}

export function useArtistSongs(slug: string | null) {
    return useQuery({
        queryKey: ["artist", slug, "songs"],
        queryFn: () => (slug ? artistService.getSongs(slug) : null),
        enabled: !!slug,
    })
}

export function useArtist(slug: string | null) {
    return useQuery({
        queryKey: ["artist", slug],
        queryFn: () => (slug ? artistService.getBySlug(slug) : null),
        enabled: !!slug,
    })
}

export function useArtistAlbums(slug: string | null) {
    return useQuery({
        queryKey: ["artist", slug, "albums"],
        queryFn: () => (slug ? artistService.getAlbums(slug) : null),
        enabled: !!slug,
    })
}

export function useArtistRecentlyPlayed(
    slug: string | null,
    limit: number = API_LIMITS.ARTIST_RECENTLY_PLAYED,
) {
    return useQuery({
        queryKey: ["artist", slug, "recently-played", limit],
        queryFn: () => (slug ? artistService.getRecentlyPlayed(slug, limit) : null),
        enabled: !!slug,
    })
}

export function useYouTubeArtists(query: string, enabled = true) {
    return useQuery({
        queryKey: ["artists", "youtube", query],
        queryFn: () => artistService.searchYouTube(query),
        enabled: enabled && !!query.trim(),
    })
}

export function useImportYouTubeArtist() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: artistService.importYouTube,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["artists"] })
        },
    })
}

export function useFollowArtist() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: artistService.toggleFollow,
        onSuccess: (result) => {
            queryClient.invalidateQueries({ queryKey: ["artists"] })
            queryClient.invalidateQueries({ queryKey: ["artist"] })
            toast.success(result.is_following ? "Following artist" : "Unfollowed artist")
        },
        onError: () => toast.error(MESSAGES.FOLLOW_UPDATE_FAILED),
    })
}
