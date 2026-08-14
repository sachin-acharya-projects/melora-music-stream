import { useThemeStore } from "@/hooks/useTheme"
import { useTitle } from "@/hooks/useTitle"
import { formatDuration } from "@/lib/utils"
import { playlistService } from "@/services/playlist.service"
import { useQuery } from "@tanstack/react-query"
import { Link, useParams } from "react-router-dom"
import { useEffect } from "react"
import { Loader2, Music2 } from "lucide-react"

export default function SharedPlaylist() {
    useTitle("Shared Playlist")
    const mode = useThemeStore((state) => state.mode)
    const { token = "" } = useParams<{ token: string }>()

    useEffect(() => {
        if (mode === "dark") {
            document.documentElement.classList.add("dark")
        } else {
            document.documentElement.classList.remove("dark")
        }
    }, [mode])

    const {
        data: playlist,
        isLoading,
        isError,
    } = useQuery({
        queryKey: ["shared-playlist", token],
        queryFn: () => playlistService.getSharedPlaylist(token),
        enabled: !!token,
        retry: false,
    })

    const songs = playlist?.songs ?? []
    const totalDuration = songs.reduce((acc, s) => acc + (s.duration || 0), 0) || 0

    if (isLoading) {
        return (
            <div className='flex min-h-screen items-center justify-center'>
                <Loader2 className='h-8 w-8 animate-spin text-red-500' />
            </div>
        )
    }

    if (isError || !playlist) {
        return (
            <div className='flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center'>
                <Music2 className='h-12 w-12 text-red-500' />
                <h1 className='text-2xl font-bold text-gray-900 dark:text-white'>
                    Playlist not found
                </h1>
                <p className='max-w-md text-gray-500 dark:text-gray-400'>
                    This share link is invalid or has been revoked by the owner.
                </p>
                <Link
                    to='/'
                    className='rounded-lg bg-red-500 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-600'
                >
                    Go to Melora
                </Link>
            </div>
        )
    }

    return (
        <div className='mx-auto flex min-h-screen w-full max-w-3xl flex-col px-4 py-10'>
            <header className='mb-8'>
                <h1 className='text-3xl font-bold text-gray-900 dark:text-white'>
                    {playlist.name}
                </h1>
                <p className='mt-1 text-sm text-gray-500 dark:text-gray-400'>
                    {songs.length} {songs.length === 1 ? "song" : "songs"} ·{" "}
                    {formatDuration(totalDuration)}
                </p>
            </header>

            <ul className='flex flex-col gap-1'>
                {songs.map((song, index) => (
                    <li
                        key={song.id}
                        className='flex items-center gap-3 rounded-xl px-3 py-2 transition-colors hover:bg-black/5 dark:hover:bg-white/5'
                    >
                        <span className='w-6 shrink-0 text-center text-sm text-gray-400 dark:text-gray-500'>
                            {index + 1}
                        </span>
                        {song.thumbnail ? (
                            <img
                                src={song.thumbnail}
                                alt={song.title || song.id}
                                loading='lazy'
                                decoding='async'
                                referrerPolicy='no-referrer'
                                className='h-12 w-12 shrink-0 rounded-lg object-cover'
                            />
                        ) : (
                            <div className='flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-gray-200 dark:bg-white/10'>
                                <Music2 className='h-5 w-5 text-gray-400 dark:text-gray-500' />
                            </div>
                        )}
                        <div className='min-w-0 flex-1'>
                            <p className='truncate text-sm font-medium text-gray-900 dark:text-white'>
                                {song.title || "Untitled"}
                            </p>
                            {song.uploader && (
                                <p className='truncate text-xs text-gray-500 dark:text-gray-400'>
                                    {song.uploader}
                                </p>
                            )}
                        </div>
                        <span className='shrink-0 text-xs text-gray-400 dark:text-gray-500'>
                            {formatDuration(song.duration)}
                        </span>
                    </li>
                ))}
            </ul>

            {songs.length === 0 && (
                <p className='text-center text-sm text-gray-500 dark:text-gray-400'>
                    This playlist is empty.
                </p>
            )}

            <footer className='mt-10 text-center text-xs text-gray-400 dark:text-gray-600'>
                <Link to='/' className='hover:text-gray-600 dark:hover:text-gray-300'>
                    Shared via Melora
                </Link>
            </footer>
        </div>
    )
}
