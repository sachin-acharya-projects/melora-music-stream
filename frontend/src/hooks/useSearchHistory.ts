import { searchHistoryService } from "@/services/history.service"
import { type SearchHistoryEntry } from "@/types"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "react-toastify"

export function useSearchHistory(limit: number = 10) {
    return useQuery({
        queryKey: ["search-history", limit],
        queryFn: () => searchHistoryService.getRecent(limit),
    })
}

export function useDeleteSearchHistory() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (entryId: string) => searchHistoryService.deleteEntry(entryId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["search-history"] })
        },
        onError: () => toast.error("Failed to delete search"),
    })
}

export function useClearSearchHistory() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: () => searchHistoryService.clear(),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["search-history"] })
        },
        onError: () => toast.error("Failed to clear history"),
    })
}

export type { SearchHistoryEntry }
