import { useMarkAllNotificationsRead, useNotifications } from "@/hooks/useNotifications"
import { useTitle } from "@/hooks/useTitle"
import { Bell, BellRing, CheckCheck, Loader2 } from "lucide-react"
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "react-toastify"

const ITEMS_PER_PAGE = 20

const formatRelativeTime = (iso: string) => {
    const date = new Date(iso)
    const seconds = Math.round((date.getTime() - Date.now()) / 1000)
    const abs = Math.abs(seconds)
    const units: [number, string][] = [
        [60, "s"],
        [60, "m"],
        [24, "h"],
        [7, "d"],
        [4.345, "w"],
        [12, "mo"],
    ]
    let value = abs
    let unit = "s"
    for (const [divider, nextUnit] of units) {
        if (value < divider) break
        value /= divider
        unit = nextUnit
    }
    const rounded = Math.round(value)
    return seconds < 0 ? `${rounded}${unit} ago` : `in ${rounded}${unit}`
}

export default function Notifications() {
    useTitle("Notifications")
    const navigate = useNavigate()
    const [offset, setOffset] = useState(0)
    const { data, isLoading } = useNotifications(offset)
    const markAll = useMarkAllNotificationsRead()

    const items = data?.items ?? []
    const total = data?.total ?? 0
    const totalPages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE))
    const currentPage = Math.floor(offset / ITEMS_PER_PAGE) + 1

    const handleOpen = (notification: (typeof items)[number]) => {
        const artistSlug = notification.data?.artist_slug
        if (artistSlug) {
            navigate(`/artists/${encodeURIComponent(String(artistSlug))}`)
        }
    }

    const handleMarkAll = () => {
        markAll.mutate(undefined, {
            onSuccess: (updated) => {
                if (updated > 0) toast.success(`Marked ${updated} notification${updated === 1 ? "" : "s"} as read`)
            },
        })
    }

    if (isLoading && !data) {
        return (
            <div className='flex justify-center pt-20'>
                <Loader2 className='h-12 w-12 animate-spin text-red-600' />
            </div>
        )
    }

    return (
        <div className='mx-auto w-full max-w-225 px-4 pt-10 pb-40'>
            <div className='mb-8 flex flex-wrap items-end justify-between gap-4'>
                <div>
                    <h1 className='text-3xl font-bold dark:text-white'>
                        <span className='text-red-500'>Notifications</span>
                    </h1>
                    <p className='mt-1 text-sm text-gray-500 dark:text-gray-400'>
                        New releases from the artists you follow
                    </p>
                </div>
                <button
                    onClick={handleMarkAll}
                    disabled={markAll.isPending || (data?.unread_count ?? 0) === 0}
                    className='dark:bg-card flex h-10 cursor-pointer items-center gap-2 rounded-xl border bg-white px-4 text-sm font-medium transition-all hover:border-red-200 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:text-white'
                >
                    <CheckCheck className='h-4 w-4 text-red-500' />
                    Mark all as read
                </button>
            </div>

            <div className='flex flex-col gap-2'>
                {items.length === 0 ? (
                    <div className='dark:bg-card flex flex-col items-center gap-3 rounded-2xl border border-gray-200 bg-white px-6 py-16 shadow-sm dark:border-white/10'>
                        <Bell className='h-10 w-10 text-gray-300 dark:text-neutral-600' />
                        <p className='text-sm text-gray-500 dark:text-gray-400'>
                            No notifications yet. Follow artists to get notified about their releases.
                        </p>
                    </div>
                ) : (
                    items.map((notification) => (
                        <button
                            key={notification.id}
                            onClick={() => handleOpen(notification)}
                            disabled={!notification.data?.artist_slug}
                            className={`dark:bg-card flex w-full cursor-pointer items-start gap-3 rounded-2xl border bg-white p-4 text-left shadow-sm transition-all hover:border-red-200 disabled:cursor-default dark:border-white/10 ${
                                notification.is_read
                                    ? "opacity-60"
                                    : "border-red-200 dark:border-red-900"
                            }`}
                        >
                            <div
                                className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                                    notification.is_read
                                        ? "bg-gray-100 text-gray-400 dark:bg-white/10 dark:text-neutral-500"
                                        : "bg-red-500 text-white"
                                }`}
                            >
                                <BellRing className='h-4 w-4' />
                            </div>
                            <div className='min-w-0 flex-1'>
                                <div className='flex items-center justify-between gap-2'>
                                    <p className='truncate text-sm font-semibold dark:text-white'>
                                        {notification.title}
                                    </p>
                                    <span className='shrink-0 text-xs text-gray-400'>
                                        {formatRelativeTime(notification.created_at)}
                                    </span>
                                </div>
                                {notification.message && (
                                    <p className='mt-0.5 line-clamp-2 text-sm text-gray-500 dark:text-gray-400'>
                                        {notification.message}
                                    </p>
                                )}
                            </div>
                            {!notification.is_read && (
                                <span className='mt-1.5 h-2 w-2 shrink-0 rounded-full bg-red-500' />
                            )}
                        </button>
                    ))
                )}
            </div>

            {totalPages > 1 && (
                <div className='mt-6 flex items-center justify-between'>
                    <button
                        onClick={() => setOffset(Math.max(0, offset - ITEMS_PER_PAGE))}
                        disabled={currentPage <= 1}
                        className='cursor-pointer rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-40 dark:text-gray-300 dark:hover:bg-white/10'
                    >
                        Previous
                    </button>
                    <span className='text-xs text-gray-500 dark:text-gray-400'>
                        Page {currentPage} of {totalPages}
                    </span>
                    <button
                        onClick={() => setOffset(offset + ITEMS_PER_PAGE)}
                        disabled={currentPage >= totalPages}
                        className='cursor-pointer rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-40 dark:text-gray-300 dark:hover:bg-white/10'
                    >
                        Next
                    </button>
                </div>
            )}
        </div>
    )
}
