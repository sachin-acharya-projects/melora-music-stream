import { statsService } from "@/services/stats.service"
import { type TopSongStat } from "@/types"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "react-toastify"

export function useStats() {
    return useQuery({
        queryKey: ["stats"],
        queryFn: () => statsService.get(),
        staleTime: 30 * 60 * 1000,
    })
}

export function useTopSongs(limit: number = 10) {
    return useQuery({
        queryKey: ["stats", "top-songs", limit],
        queryFn: () => statsService.getTopSongs(limit),
        staleTime: 30 * 60 * 1000,
        placeholderData: (previous: TopSongStat[] | undefined) => previous,
    })
}

export function useRecalculateStats() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: statsService.recalculate,
        onSuccess: (data) => {
            queryClient.setQueryData(["stats"], data)
            toast.success("Stats refreshed")
        },
        onError: () => toast.error("Failed to refresh stats"),
    })
}
