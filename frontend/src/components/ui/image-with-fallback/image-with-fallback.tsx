import { cn } from "@/lib/utils"
import { Music2 } from "lucide-react"
import { type ReactNode, useState } from "react"

interface ImageWithFallbackProps {
    src?: string | null
    alt: string
    className?: string
    fallbackClassName?: string
    fallback?: ReactNode
}

export function ImageWithFallback({
    src,
    alt,
    className,
    fallbackClassName,
    fallback,
}: ImageWithFallbackProps) {
    const [failedSrc, setFailedSrc] = useState<string | null>(null)

    if (!src || failedSrc === src) {
        return (
            <div
                role='img'
                aria-label={alt}
                className={cn(
                    "flex items-center justify-center bg-gradient-to-br from-red-500/20 via-purple-500/20 to-blue-500/20",
                    className,
                    fallbackClassName,
                )}
            >
                {fallback ?? <Music2 className='h-1/3 w-1/3 text-gray-400' />}
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
            onError={() => setFailedSrc(src)}
            onLoad={() => setFailedSrc(null)}
            className={cn("object-cover", className)}
        />
    )
}
