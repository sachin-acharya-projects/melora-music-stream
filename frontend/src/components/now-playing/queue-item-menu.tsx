import { MenuButton } from "@/components/ui/menu-button/menu-button"
import { cn } from "@/lib/utils"
import { Download, ListPlus, MoreHorizontal, Plus, Trash2 } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"

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
    const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null)

    useEffect(() => {
        if (!open) return
        const close = () => onClose()
        window.addEventListener("scroll", close, true)
        window.addEventListener("resize", close)
        return () => {
            window.removeEventListener("scroll", close, true)
            window.removeEventListener("resize", close)
        }
    }, [open, onClose])

    return (
        <div ref={ref} className='shrink-0'>
            <button
                onClick={(e) => {
                    e.stopPropagation()
                    if (open) {
                        onClose()
                    } else {
                        setAnchorRect(ref.current?.getBoundingClientRect() ?? null)
                        onOpen()
                    }
                }}
                className={cn(
                    "flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-black/5 hover:text-red-500 dark:hover:bg-white/5",
                    open && "bg-black/5 text-red-500 dark:bg-white/5",
                )}
                title='More actions'
            >
                <MoreHorizontal className='h-4 w-4' />
            </button>
            {open &&
                anchorRect &&
                createPortal(
                    <>
                        <div className='fixed inset-0 z-30' onClick={onClose} />
                        <div
                            onClick={(e) => e.stopPropagation()}
                            className='dark:bg-card fixed z-40 w-52 overflow-hidden rounded-xl border bg-white p-1 shadow-xl dark:border-white/10'
                            style={{
                                top: anchorRect.bottom + 4,
                                right: Math.max(8, window.innerWidth - anchorRect.right),
                            }}
                        >
                            <MenuButton
                                onClick={() => {
                                    onPlayNext()
                                    onClose()
                                }}
                                icon={ListPlus}
                                label='Play next'
                            />
                            <MenuButton
                                onClick={() => {
                                    onAddToPlaylist()
                                    onClose()
                                }}
                                icon={Plus}
                                label='Add to playlist'
                            />
                            <MenuButton
                                onClick={() => {
                                    onDownload()
                                    onClose()
                                }}
                                icon={Download}
                                label='Download'
                            />
                            <div className='my-1 border-t border-gray-100 dark:border-white/10' />
                            <MenuButton
                                onClick={() => {
                                    onRemove()
                                    onClose()
                                }}
                                icon={Trash2}
                                label='Remove from queue'
                                danger
                            />
                        </div>
                    </>,
                    document.body,
                )}
        </div>
    )
}
