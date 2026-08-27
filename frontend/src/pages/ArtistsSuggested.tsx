import { ArtistCard } from "@/components/artist-card/artist-card"
import { useImportYouTubeArtist, useSuggestedArtists } from "@/hooks/useArtists"
import { useTitle } from "@/hooks/useTitle"
import { type Artist } from "@/types"
import { ChevronLeft, Loader2, Mic2 } from "lucide-react"
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "react-toastify"

export default function ArtistsSuggested() {
    const navigate = useNavigate()
    const [importingId, setImportingId] = useState<string | null>(null)
    const { data, isLoading, fetchNextPage, isFetchingNextPage, hasNextPage } =
        useSuggestedArtists()
    const importYouTube = useImportYouTubeArtist()
    const artists = data?.pages.flatMap((page) => page.items) ?? []
    const total = data?.pages[0]?.total ?? artists.length

    useTitle("Suggested artists")

    const handleImport = async (artist: Artist) => {
        setImportingId(artist.id)
        try {
            const result = await importYouTube.mutateAsync({
                channel_id: artist.id,
                name: artist.name,
                thumbnail: artist.thumbnail_url,
            })
            navigate(`/artists/${result.slug}`)
        } catch {
            toast.error("Failed to import artist")
        } finally {
            setImportingId(null)
        }
    }

    return (
        <div className='mx-auto w-full max-w-375 px-4 pt-4 pb-40'>
            <button
                onClick={() => navigate("/artists")}
                className='mb-6 flex cursor-pointer items-center gap-1 text-sm text-gray-500 transition-colors hover:text-red-500'
            >
                <ChevronLeft className='h-4 w-4' /> Artists
            </button>

            <div className='mb-6'>
                <h1 className='text-2xl font-bold dark:text-white'>
                    Suggested <span className='text-red-500'>artists</span>
                </h1>
                <p className='mt-1 text-sm text-gray-500 dark:text-gray-400'>
                    {total} {total === 1 ? "artist" : "artists"} picked from your listening
                    history. Click any artist to import their music.
                </p>
            </div>

            {isLoading ? (
                <div className='flex justify-center pt-20'>
                    <Loader2 className='h-12 w-12 animate-spin text-red-600' />
                </div>
            ) : artists.length === 0 ? (
                <div className='flex flex-col items-center gap-4 py-16 text-center'>
                    <span className='flex h-20 w-20 items-center justify-center rounded-full bg-red-100 dark:bg-red-950'>
                        <Mic2 className='h-9 w-9 text-red-500' />
                    </span>
                    <h2 className='text-lg font-semibold dark:text-white'>No suggestions yet</h2>
                    <p className='text-sm text-gray-500 dark:text-gray-400'>
                        Listen to more music and suggestions will show up here.
                    </p>
                </div>
            ) : (
                <>
                    <div className='grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5'>
                        {artists.map((artist) => (
                            <ArtistCard
                                key={artist.id}
                                artist={artist}
                                onImport={handleImport}
                                isImporting={importingId === artist.id}
                            />
                        ))}
                    </div>
                    {hasNextPage && (
                        <div className='mt-10 flex justify-center'>
                            <button
                                type='button'
                                onClick={() => fetchNextPage()}
                                disabled={isFetchingNextPage}
                                className='flex h-11 cursor-pointer items-center gap-2 rounded-xl bg-red-600 px-6 text-sm font-semibold text-white transition-all hover:bg-red-700 disabled:cursor-wait disabled:opacity-60'
                            >
                                {isFetchingNextPage && (
                                    <Loader2 className='h-4 w-4 animate-spin' />
                                )}
                                Load more artists
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    )
}
