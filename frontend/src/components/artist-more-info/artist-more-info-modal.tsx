import { type ArtistMoreInfo } from "@/types"
import { BadgeCheck, ExternalLink, Globe, X } from "lucide-react"
import { useEffect } from "react"

interface ArtistMoreInfoModalProps {
    artistName: string
    info: ArtistMoreInfo
    onClose: () => void
}

function Stat({ label, value }: { label: string; value: string }) {
    return (
        <div className='rounded-xl bg-gray-50 px-3 py-2 dark:bg-white/5'>
            <p className='text-xs text-gray-500 dark:text-gray-400'>{label}</p>
            <p className='mt-0.5 truncate text-sm font-semibold dark:text-white'>{value}</p>
        </div>
    )
}

export function ArtistMoreInfoModal({ artistName, info, onClose }: ArtistMoreInfoModalProps) {
    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") onClose()
        }
        document.addEventListener("keydown", onKeyDown)
        return () => document.removeEventListener("keydown", onKeyDown)
    }, [onClose])

    const stats: { label: string; value: string }[] = []
    if (info.subscribers != null)
        stats.push({ label: "Subscribers", value: info.subscribers.toLocaleString() })
    if (info.view_count != null)
        stats.push({ label: "Total views", value: info.view_count.toLocaleString() })
    if (info.video_count != null)
        stats.push({ label: "Videos", value: info.video_count.toLocaleString() })
    if (info.country) stats.push({ label: "Country", value: info.country })

    return (
        <div
            className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4'
            onClick={onClose}
        >
            <div
                className='max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-2xl border bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-black'
                onClick={(e) => e.stopPropagation()}
            >
                <div className='mb-4 flex items-center justify-between'>
                    <div className='flex items-center gap-2'>
                        <h3 className='text-lg font-bold dark:text-white'>More Info</h3>
                        {info.is_verified && (
                            <span className='inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-600 dark:bg-blue-950 dark:text-blue-400'>
                                <BadgeCheck className='h-3.5 w-3.5' /> Verified
                            </span>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        className='cursor-pointer rounded-full p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5'
                    >
                        <X className='h-5 w-5' />
                    </button>
                </div>

                {info.description && (
                    <p className='text-sm whitespace-pre-line text-gray-600 dark:text-gray-300'>
                        {info.description}
                    </p>
                )}

                {stats.length > 0 && (
                    <div className='mt-4 grid grid-cols-2 gap-2'>
                        {stats.map((stat) => (
                            <Stat key={stat.label} label={stat.label} value={stat.value} />
                        ))}
                    </div>
                )}

                <div className='mt-4 flex flex-col gap-2'>
                    {info.channel_url && (
                        <a
                            href={info.channel_url}
                            target='_blank'
                            rel='noopener noreferrer'
                            className='flex items-center justify-between gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:border-red-200 hover:text-red-600 dark:border-white/10 dark:text-gray-200'
                        >
                            <span className='flex items-center gap-2'>
                                <Globe className='h-4 w-4 text-gray-400' />
                                {artistName}
                                {info.handle && (
                                    <span className='text-xs text-gray-400'>{info.handle}</span>
                                )}
                            </span>
                            <ExternalLink className='h-4 w-4 shrink-0' />
                        </a>
                    )}
                    {info.links.map((link) => (
                        <a
                            key={link}
                            href={link}
                            target='_blank'
                            rel='noopener noreferrer'
                            className='flex items-center justify-between gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:border-red-200 hover:text-red-600 dark:border-white/10 dark:text-gray-200'
                        >
                            <span className='truncate'>{link}</span>
                            <ExternalLink className='h-4 w-4 shrink-0' />
                        </a>
                    ))}
                </div>
            </div>
        </div>
    )
}
