import { User } from "lucide-react"
import { useState } from "react"

interface AvatarProps {
    src?: string | null
    name?: string | null
    size?: number
    className?: string
}

function getInitials(name?: string | null): string {
    if (!name) return ""
    return name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((word) => word[0])
        .join("")
        .toUpperCase()
}

export default function Avatar({ src, name, size = 40, className = "" }: AvatarProps) {
    const [imageError, setImageError] = useState(false)
    const initials = getInitials(name)
    const showImage = !!src && !imageError

    if (showImage) {
        return (
            <img
                src={src as string}
                alt={name || "User avatar"}
                onError={() => setImageError(true)}
                className={`rounded-full object-cover ${className}`}
                style={{ width: size, height: size }}
            />
        )
    }

    return (
        <div
            aria-label={name || "User avatar"}
            className={`flex shrink-0 items-center justify-center rounded-full font-bold text-white ${
                initials
                    ? "bg-gradient-to-br from-red-500 to-rose-700"
                    : "bg-neutral-300 dark:bg-neutral-700"
            } ${className}`}
            style={{ width: size, height: size, fontSize: Math.round(size * 0.38) }}
        >
            {initials || <User className='h-1/2 w-1/2 text-neutral-500 dark:text-neutral-400' />}
        </div>
    )
}
