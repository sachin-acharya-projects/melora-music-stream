import { SongBrowser } from "@/components/song-browser/song-browser"
import { usePlayerStore } from "@/hooks/usePlayer"
import { useRecommendations } from "@/hooks/useRecommendations"
import { useTitle } from "@/hooks/useTitle"
import { type ArtistSong } from "@/types"
import { Sparkles } from "lucide-react"

const RECOMMENDATIONS_PAGE_LIMIT = 50

export default function Recommendations() {
    useTitle("Made for you")
    const { data, isLoading } = useRecommendations(RECOMMENDATIONS_PAGE_LIMIT)
    const songs = data ?? []
    const setPlaylist = usePlayerStore((s) => s.setPlaylist)

    const handlePlay = (list: ArtistSong[], index: number) => {
        setPlaylist(
            list.map((s) => ({ ...s, created_at: s.created_at ?? "" })),
            index,
            "recommendations",
        )
    }

    return (
        <div className='mx-auto w-full max-w-375 px-4 pt-4 pb-40'>
            <div className='mb-6'>
                <h1 className='flex items-center gap-2 text-2xl font-bold dark:text-white'>
                    <Sparkles className='h-5 w-5 text-red-500' />
                    Made for <span className='text-red-500'>you</span>
                </h1>
                <p className='mt-1 text-sm text-gray-500 dark:text-gray-400'>
                    Suggested from your listening history
                </p>
            </div>

            <SongBrowser songs={songs} isLoading={isLoading} onPlay={handlePlay} />
        </div>
    )
}
