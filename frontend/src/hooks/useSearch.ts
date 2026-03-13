import { apiService } from "@/services/api.service"
import { useQuery } from "@tanstack/react-query"

export function useSearch(query: string) {
    return useQuery({
        queryKey: ["search", query],
        queryFn: () => apiService.search(query),
        enabled: !!query,
    })
}
