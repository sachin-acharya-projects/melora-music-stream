import { discoverService } from "@/services/discover.service"
import { useQuery } from "@tanstack/react-query"

export function useDiscover() {
    return useQuery({
        queryKey: ["discover", "feed"],
        queryFn: () => discoverService.getFeed(),
        staleTime: 30 * 60 * 1000,
    })
}
