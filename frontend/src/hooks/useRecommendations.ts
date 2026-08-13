import { recommendationsService, type RadioSeedType } from "@/services/recommendations.service"
import { useMutation, useQuery } from "@tanstack/react-query"
import { API_LIMITS } from "@/utils/constants"

export function useRecommendations(limit: number = API_LIMITS.RECOMMENDATIONS) {
    return useQuery({
        queryKey: ["recommendations", limit],
        queryFn: () => recommendationsService.getRecommendations(limit),
        staleTime: 30 * 60 * 1000,
    })
}

export function useRadioMoods() {
    return useQuery({
        queryKey: ["radio", "moods"],
        queryFn: () => recommendationsService.getRadioMoods(),
        staleTime: Infinity,
    })
}

export function useRadioGenres() {
    return useQuery({
        queryKey: ["radio", "genres"],
        queryFn: () => recommendationsService.getRadioGenres(),
        staleTime: Infinity,
    })
}

export function useRadioSeeds() {
    return useQuery({
        queryKey: ["radio", "seeds"],
        queryFn: () => recommendationsService.getRadioSeeds(),
        staleTime: 30 * 60 * 1000,
    })
}

export function useGenerateRadio() {
    return useMutation({
        mutationFn: ({
            seedType,
            seedValue,
            count,
        }: {
            seedType: RadioSeedType
            seedValue: string
            count?: number
        }) => recommendationsService.generateRadio(seedType, seedValue, count),
    })
}
