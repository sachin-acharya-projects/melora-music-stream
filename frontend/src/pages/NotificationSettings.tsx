import { useNotificationSettings, useUpdateNotificationSettings } from "@/hooks/useNotifications"
import { useTitle } from "@/hooks/useTitle"
import { type NotificationEventSettings } from "@/types"
import { BellRing, Loader2, Mail, Smartphone } from "lucide-react"
import { toast } from "react-toastify"

const CHANNELS = [
    { key: "in_app", label: "In-app", icon: BellRing },
    { key: "email", label: "Email", icon: Mail },
    { key: "push", label: "Push", icon: Smartphone },
] as const

const EVENT_LABELS: Record<string, string> = {
    new_release: "New releases",
}

const EVENT_DESCRIPTIONS: Record<string, string> = {
    new_release: "When an artist you follow releases new music",
}

export default function NotificationSettings() {
    useTitle("Notification Settings")
    const { data: settings, isLoading } = useNotificationSettings()
    const update = useUpdateNotificationSettings()

    if (isLoading && !settings) {
        return (
            <div className='flex justify-center pt-20'>
                <Loader2 className='h-12 w-12 animate-spin text-red-600' />
            </div>
        )
    }

    const current = (settings ?? {}) as NotificationEventSettings
    const events = Object.keys(current)

    const handleToggle = (event: string, channel: string, value: boolean) => {
        update.mutate(
            { [event]: { [channel]: value } },
            {
                onError: () => toast.error("Failed to update settings"),
            },
        )
    }

    return (
        <div className='mx-auto w-full max-w-225 px-4 pt-4 pb-40'>
            <div className='mb-8'>
                <h1 className='text-3xl font-bold dark:text-white'>
                    Notification <span className='text-red-500'>Settings</span>
                </h1>
                <p className='mt-1 text-sm text-gray-500 dark:text-gray-400'>
                    Choose which channels you want for each type of notification
                </p>
            </div>

            <div className='flex flex-col gap-4'>
                {events.length === 0 ? (
                    <p className='py-10 text-center text-sm text-gray-400'>No settings available.</p>
                ) : (
                    events.map((event) => (
                        <div
                            key={event}
                            className='dark:bg-card rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-white/10'
                        >
                            <div className='mb-4'>
                                <h2 className='text-base font-semibold dark:text-white'>
                                    {EVENT_LABELS[event] ?? event}
                                </h2>
                                {EVENT_DESCRIPTIONS[event] && (
                                    <p className='mt-0.5 text-sm text-gray-500 dark:text-gray-400'>
                                        {EVENT_DESCRIPTIONS[event]}
                                    </p>
                                )}
                            </div>
                            <div className='flex flex-wrap gap-3'>
                                {CHANNELS.map(({ key, label, icon: Icon }) => {
                                    const enabled = current[event]?.[key] ?? false
                                    return (
                                        <button
                                            key={key}
                                            onClick={() => handleToggle(event, key, !enabled)}
                                            className={`flex cursor-pointer items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition-all ${
                                                enabled
                                                    ? "border-red-300 bg-red-50 text-red-600 dark:border-red-800 dark:bg-red-950/40 dark:text-red-400"
                                                    : "border-gray-200 text-gray-500 hover:bg-black/5 dark:border-white/10 dark:text-gray-400 dark:hover:bg-white/10"
                                            }`}
                                        >
                                            <Icon className='h-4 w-4' />
                                            {label}
                                        </button>
                                    )
                                })}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}
