import { formatDuration } from "@/lib/utils"
import { type PlaylistDetail } from "@/types"
import { X } from "lucide-react"
import { useEffect } from "react"

interface PlaylistMoreInfoModalProps {
    playlist: PlaylistDetail
    onClose: () => void
}

export function PlaylistMoreInfoModal({ playlist, onClose }: PlaylistMoreInfoModalProps) {
    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") onClose()
        }
        document.addEventListener("keydown", onKeyDown)
        return () => document.removeEventListener("keydown", onKeyDown)
    }, [onClose])

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
                    <h3 className='text-lg font-bold dark:text-white'>More Info</h3>
                    <button
                        onClick={onClose}
                        className='cursor-pointer rounded-full p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5'
                    >
                        <X className='h-5 w-5' />
                    </button>
                </div>

                {playlist.description && (
                    <p className='text-sm whitespace-pre-line text-gray-600 dark:text-gray-300'>
                        {playlist.description}
                    </p>
                )}

                <div className='mt-4 flex flex-wrap gap-2'>
                    <span className='rounded-xl bg-gray-50 px-3 py-2 text-xs text-gray-600 dark:bg-white/5 dark:text-gray-300'>
                        {playlist.total_songs} {playlist.total_songs === 1 ? "song" : "songs"} ·{" "}
                        {formatDuration(playlist.total_duration)}
                    </span>
                    <span className='rounded-xl bg-gray-50 px-3 py-2 text-xs text-gray-600 dark:bg-white/5 dark:text-gray-300'>
                        {playlist.visibility === "public" ? "Public" : "Private"}
                    </span>
                    {playlist.is_collaborative && (
                        <span className='rounded-xl bg-gray-50 px-3 py-2 text-xs text-gray-600 dark:bg-white/5 dark:text-gray-300'>
                            Collaborative
                        </span>
                    )}
                </div>
            </div>
        </div>
    )
}
