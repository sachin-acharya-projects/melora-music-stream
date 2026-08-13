import { Music2, Mic2 } from "lucide-react"
import { useState } from "react"

interface AdminThumbProps {
    src: string | null | undefined
    alt: string
    variant?: "square" | "song"
    className?: string
}

export default function AdminThumb({
    src,
    alt,
    variant = "square",
    className = "",
}: AdminThumbProps) {
    const [failed, setFailed] = useState(false)
    const showPlaceholder = !src || failed

    if (showPlaceholder) {
        const Icon = variant === "song" ? Music2 : Mic2
        return (
            <div
                className={`flex shrink-0 items-center justify-center bg-gradient-to-br from-red-500/20 via-purple-500/20 to-blue-500/20 ${className}`}
            >
                <Icon className='h-1/3 w-1/3 text-gray-400' />
            </div>
        )
    }

    return (
        <img
            src={src}
            alt={alt}
            loading='lazy'
            decoding='async'
            referrerPolicy='no-referrer'
            onError={() => setFailed(true)}
            className={`shrink-0 object-cover ${className}`}
        />
    )
}
