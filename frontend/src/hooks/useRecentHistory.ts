import { historyService } from "@/services/history.service"
import { type HistoryItem } from "@/types"
import { useQuery } from "@tanstack/react-query"

export function useRecentHistory(limit: number) {
    return useQuery({
        queryKey: ["history", "recent", limit],
        queryFn: () => historyService.getRecent(limit),
        staleTime: 30 * 60 * 1000,
        placeholderData: (previous: HistoryItem[] | undefined) => previous,
    })
}
