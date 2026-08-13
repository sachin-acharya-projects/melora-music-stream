import { apiService } from "@/services/api.service"
import { type SearchResults } from "@/types"
import { useQuery } from "@tanstack/react-query"

export function useSearch(query: string) {
    return useQuery({
        queryKey: ["search", query],
        queryFn: () => apiService.search(query),
        enabled: !!query,
        staleTime: 0,
    })
}

export function useSearchSuggestions(query: string) {
    return useQuery({
        queryKey: ["search", "suggestions", query],
        queryFn: () => apiService.getSearchSuggestions(query),
        enabled: query.trim().length >= 2,
        staleTime: 60_000,
    })
}

export type { SearchResults }
