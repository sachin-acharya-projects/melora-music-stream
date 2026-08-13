import { type PlaylistItem } from "@/hooks/usePlayer"
import { formatDuration, slugify } from "@/lib/utils"
import { ExternalLink, MicVocal, X } from "lucide-react"
import { useEffect } from "react"
import { useNavigate } from "react-router-dom"

interface SongInfoModalProps {
    song: PlaylistItem
    onClose: () => void
}

export function SongInfoModal({ song, onClose }: SongInfoModalProps) {
    const navigate = useNavigate()

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") onClose()
        }
        document.addEventListener("keydown", onKeyDown)
        return () => document.removeEventListener("keydown", onKeyDown)
    }, [onClose])

    const openArtist = () => {
        onClose()
        navigate(`/artists/${slugify(song.uploader)}`)
    }

    return (
        <div
            className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4'
            onClick={onClose}
        >
            <div
                className='w-full max-w-md overflow-hidden rounded-2xl border bg-white shadow-2xl dark:border-white/10 dark:bg-black'
                onClick={(e) => e.stopPropagation()}
            >
                <div className='flex items-center justify-between border-b border-gray-100 px-6 py-4 dark:border-white/10'>
                    <h3 className='text-lg font-bold dark:text-white'>Music Info</h3>
                    <button
                        onClick={onClose}
                        className='cursor-pointer rounded-full p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5'
                        title='Close'
                    >
                        <X className='h-5 w-5' />
                    </button>
                </div>

                <div className='flex flex-col gap-5 p-6'>
                    <div className='relative aspect-video w-full overflow-hidden rounded-xl bg-gray-100 dark:bg-white/10'>
                        {song.thumbnail ? (
                            <img
                                src={song.thumbnail}
                                alt={song.title}
                                referrerPolicy='no-referrer'
                                className='h-full w-full object-cover'
                            />
                        ) : (
                            <div className='flex h-full w-full items-center justify-center bg-gradient-to-br from-red-400 to-red-600'>
                                <MicVocal className='h-12 w-12 text-white' />
                            </div>
                        )}
                    </div>

                    <div className='flex flex-col gap-3'>
                        <div>
                            <p className='text-xs font-medium tracking-wide text-red-500 uppercase'>
                                Title
                            </p>
                            <p className='mt-0.5 text-sm font-semibold break-words dark:text-white'>
                                {song.title || "Unknown Title"}
                            </p>
                        </div>
                        <button
                            onClick={openArtist}
                            className='flex cursor-pointer items-center gap-2 text-left'
                            title='View artist'
                        >
                            <p className='text-xs font-medium tracking-wide text-red-500 uppercase'>
                                Artist
                            </p>
                            <span className='mt-0.5 flex items-center gap-1 text-sm font-medium text-gray-600 transition-colors hover:text-red-500 dark:text-gray-300'>
                                {song.uploader || "Unknown Artist"}
                                <ExternalLink className='h-3 w-3 shrink-0' />
                            </span>
                        </button>
                        <div>
                            <p className='text-xs font-medium tracking-wide text-red-500 uppercase'>
                                Duration
                            </p>
                            <p className='mt-0.5 text-sm text-gray-600 dark:text-gray-300'>
                                {formatDuration(song.duration)}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
