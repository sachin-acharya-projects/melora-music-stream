import { cn } from "@/lib/utils"
import { Keyboard } from "lucide-react"
import { useEffect, useRef, useState } from "react"

const SHORTCUTS: { keys: string[]; label: string }[] = [
    { keys: ["Space"], label: "Play / pause" },
    { keys: ["←", "→"], label: "Seek 10s" },
    { keys: ["↑", "↓"], label: "Volume" },
    { keys: ["N", "P"], label: "Next / previous" },
]

export function ShortcutHelp() {
    const [open, setOpen] = useState(false)
    const ref = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (!open) return
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false)
            }
        }
        document.addEventListener("mousedown", handler)
        return () => document.removeEventListener("mousedown", handler)
    }, [open])

    return (
        <div ref={ref} className='relative shrink-0'>
            <button
                onClick={() => setOpen((v) => !v)}
                className={cn(
                    "cursor-pointer rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-white/5 dark:hover:text-gray-200",
                    open && "bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-gray-200",
                )}
                title='Keyboard shortcuts'
            >
                <Keyboard className='h-5 w-5' />
            </button>
            {open && (
                <div className='absolute top-full right-0 z-30 mt-2 w-52 rounded-xl border border-gray-100 bg-white p-3 shadow-xl dark:border-white/10 dark:bg-black'>
                    <h4 className='mb-2 text-sm font-bold dark:text-white'>Keyboard shortcuts</h4>
                    <div className='flex flex-col gap-2'>
                        {SHORTCUTS.map((shortcut) => (
                            <div
                                key={shortcut.label}
                                className='flex items-center justify-between gap-3'
                            >
                                <span className='text-xs text-gray-500 dark:text-gray-400'>
                                    {shortcut.label}
                                </span>
                                <span className='flex items-center gap-1'>
                                    {shortcut.keys.map((key) => (
                                        <kbd
                                            key={key}
                                            className='rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5 font-mono text-[10px] font-medium text-gray-600 dark:border-white/10 dark:bg-white/5 dark:text-gray-200'
                                        >
                                            {key}
                                        </kbd>
                                    ))}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
