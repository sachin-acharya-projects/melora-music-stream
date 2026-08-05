import { MenuButton } from "@/components/ui/menu-button/menu-button"
import { cn } from "@/lib/utils"
import { Download, ListPlus, MoreHorizontal, Plus, Trash2 } from "lucide-react"
import { useEffect, useRef } from "react"

export function QueueItemMenu({
    open,
    onOpen,
    onClose,
    onPlayNext,
    onAddToPlaylist,
    onDownload,
    onRemove,
}: {
    open: boolean
    onOpen: () => void
    onClose: () => void
    onPlayNext: () => void
    onAddToPlaylist: () => void
    onDownload: () => void
    onRemove: () => void
}) {
    const ref = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (!open) return
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                onClose()
            }
        }
        document.addEventListener("mousedown", handler)
        return () => document.removeEventListener("mousedown", handler)
    }, [open, onClose])

    return (
        <div ref={ref} className='relative shrink-0'>
            <button
                onClick={(e) => {
                    e.stopPropagation()
                    if (open) onClose()
                    else onOpen()
                }}
                className={cn(
                    "flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-black/5 hover:text-red-500 dark:hover:bg-white/5",
                    open && "bg-black/5 text-red-500 dark:bg-white/5",
                )}
                title='More actions'
            >
                <MoreHorizontal className='h-4 w-4' />
            </button>
            {open && (
                <div className='absolute top-full right-0 z-30 mt-2 w-44 overflow-hidden rounded-xl border border-gray-100 bg-white p-1 shadow-xl dark:border-white/10 dark:bg-black'>
                    <MenuButton onClick={onPlayNext} icon={ListPlus} label='Play next' />
                    <MenuButton onClick={onAddToPlaylist} icon={Plus} label='Add to playlist' />
                    <MenuButton onClick={onDownload} icon={Download} label='Download' />
                    <div className='my-1 border-t border-gray-100 dark:border-white/10' />
                    <MenuButton onClick={onRemove} icon={Trash2} label='Remove from queue' danger />
                </div>
            )}
        </div>
    )
}
