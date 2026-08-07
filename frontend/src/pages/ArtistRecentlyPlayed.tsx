import { RecentlyPlayedCard } from "@/components/recently-played-card/recently-played-card"
import { useArtist, useArtistRecentlyPlayed } from "@/hooks/useArtists"
import { usePlayerStore } from "@/hooks/usePlayer"
import { useTitle } from "@/hooks/useTitle"
import { type ArtistSong } from "@/types"
import { Clock, Loader2 } from "lucide-react"
import { useNavigate, useParams } from "react-router-dom"

const RECENTLY_PLAYED_LIMIT = 100

export default function ArtistRecentlyPlayed() {
    const navigate = useNavigate()
    const { slug } = useParams<{ slug: string }>()
    const { data: artist } = useArtist(slug ?? null)
    const { data, isLoading } = useArtistRecentlyPlayed(slug ?? null, RECENTLY_PLAYED_LIMIT)
    const songs = data ?? []
    const setPlaylist = usePlayerStore((s) => s.setPlaylist)

    useTitle(artist ? `Recently played · ${artist.name}` : "Recently played")

    const handlePlay = (list: ArtistSong[], index: number) => {
        setPlaylist(
            list.map((s) => ({ ...s, created_at: s.created_at ?? "" })),
            index,
            `artist:${slug}:recently-played`,
        )
    }

    return (
        <div className='mx-auto w-full max-w-375 px-4 pt-10 pb-40'>
            <button
                onClick={() => navigate(`/artists/${slug}`)}
                className='mb-6 flex cursor-pointer items-center gap-1 text-sm text-gray-500 transition-colors hover:text-red-500'
            >
                <Clock className='h-4 w-4' /> {artist?.name ?? "Artist"}
            </button>

            <div className='mb-6'>
                <h1 className='text-2xl font-bold dark:text-white'>
                    Recently played <span className='text-red-500'>by you</span>
                </h1>
                <p className='mt-1 text-sm text-gray-500 dark:text-gray-400'>
                    {songs.length} {songs.length === 1 ? "song" : "songs"} from {artist?.name}
                </p>
            </div>

            {isLoading ? (
                <div className='flex justify-center pt-20'>
                    <Loader2 className='h-12 w-12 animate-spin text-red-600' />
                </div>
            ) : songs.length === 0 ? (
                <div className='flex flex-col items-center gap-4 py-16 text-center'>
                    <span className='flex h-20 w-20 items-center justify-center rounded-full bg-red-100 dark:bg-red-950'>
                        <Clock className='h-9 w-9 text-red-500' />
                    </span>
                    <h2 className='text-lg font-semibold dark:text-white'>Nothing played yet</h2>
                    <p className='text-sm text-gray-500 dark:text-gray-400'>
                        Songs you listen to will show up here.
                    </p>
                </div>
            ) : (
                <div className='grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5'>
                    {songs.map((song, index) => (
                        <RecentlyPlayedCard
                            key={song.id}
                            song={song}
                            onClick={() => handlePlay(songs, index)}
                            className='w-full'
                        />
                    ))}
                </div>
            )}
        </div>
    )
}
