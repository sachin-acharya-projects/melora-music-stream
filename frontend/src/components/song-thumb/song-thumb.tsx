import { type Song } from "@/types"
import { Music2 } from "lucide-react"
import { useState } from "react"

export function SongThumb({ song }: { song: Pick<Song, "thumbnail" | "title"> }) {
    const [failed, setFailed] = useState(false)
    const showPlaceholder = !song.thumbnail || failed

    if (showPlaceholder) {
        return (
            <div className='flex h-full w-full items-center justify-center bg-gradient-to-br from-red-500/20 via-purple-500/20 to-blue-500/20'>
                <Music2 className='h-1/3 w-1/3 text-gray-400' />
            </div>
        )
    }

    return (
        <img
            src={song.thumbnail}
            alt={song.title}
            loading='lazy'
            decoding='async'
            referrerPolicy='no-referrer'
            onError={() => setFailed(true)}
            className='h-full w-full object-cover'
        />
    )
}
