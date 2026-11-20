import { ImageWithFallback } from "@/components/ui/image-with-fallback/image-with-fallback"
import { type Song } from "@/types"

export function SongThumb({ song }: { song: Pick<Song, "thumbnail" | "title"> }) {
    return (
        <ImageWithFallback
            src={song.thumbnail}
            alt={song.title}
            className='h-full w-full'
        />
    )
}
