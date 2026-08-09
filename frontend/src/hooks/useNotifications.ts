import { notificationsService } from "@/services/notifications.service"
import { type NotificationEventSettings } from "@/types"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

const LIST_PAGE_SIZE = 20

export function useNotifications(offset = 0) {
    return useQuery({
        queryKey: ["notifications", offset],
        queryFn: () => notificationsService.list(LIST_PAGE_SIZE, offset),
        staleTime: 15 * 1000,
        placeholderData: (previous) => previous,
    })
}

export function useUnreadCount() {
    return useQuery({
        queryKey: ["notifications", "unread-count"],
        queryFn: () => notificationsService.unreadCount(),
        staleTime: 15 * 1000,
        refetchInterval: 60 * 1000,
    })
}

export function useNotificationSettings() {
    return useQuery({
        queryKey: ["notifications", "settings"],
        queryFn: () => notificationsService.getSettings(),
        staleTime: 30 * 1000,
    })
}

function useInvalidateNotifications() {
    const queryClient = useQueryClient()
    return () => {
        queryClient.invalidateQueries({ queryKey: ["notifications"] })
    }
}

export function useMarkNotificationRead() {
    const invalidate = useInvalidateNotifications()
    return useMutation({
        mutationFn: (id: string) => notificationsService.markRead(id),
        onSuccess: invalidate,
    })
}

export function useMarkAllNotificationsRead() {
    const invalidate = useInvalidateNotifications()
    return useMutation({
        mutationFn: () => notificationsService.markAllRead(),
        onSuccess: invalidate,
    })
}

export function useUpdateNotificationSettings() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (settings: Partial<Record<string, Partial<Record<string, boolean>>>>) =>
            notificationsService.updateSettings(settings),
        onSuccess: (data: NotificationEventSettings) => {
            queryClient.setQueryData(["notifications", "settings"], data)
        },
    })
}
