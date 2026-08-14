import { type PlaylistOption } from "@/services/playlist.service"
import { AnimatePresence, motion } from "framer-motion"
import { ChevronDown } from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"

interface PlaylistSelectorProps {
    playlists: PlaylistOption[]
    value: string
    onChange: (value: string) => void
    placeholder?: string
    className?: string
    showSuggestions?: boolean
}

export default function PlaylistSelector({
    playlists,
    value,
    onChange,
    placeholder = "Playlist name...",
    className = "",
    showSuggestions = true,
}: PlaylistSelectorProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [openUpward, setOpenUpward] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)

    const suggestions = useMemo(() => {
        if (!showSuggestions) return []
        return playlists.filter((p) => p.name.toLowerCase().includes(value.toLowerCase()))
    }, [playlists, value, showSuggestions])

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

    useEffect(() => {
        if (isOpen && containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect()
            const spaceBelow = window.innerHeight - rect.bottom
            // If less than 200px below, open upwards
            setOpenUpward(spaceBelow < 200)
        }
    }, [isOpen])

    return (
        <div className={`relative ${className}`} ref={containerRef}>
            <div className='relative'>
                <input
                    type='text'
                    value={value}
                    onChange={(e) => {
                        onChange(e.target.value)
                        if (showSuggestions) setIsOpen(true)
                    }}
                    onFocus={() => {
                        if (showSuggestions) setIsOpen(true)
                    }}
                    className={`h-12 w-full rounded-lg border bg-white px-3 text-sm dark:border-white/10 dark:bg-black dark:text-white ${
                        showSuggestions ? "pr-10" : ""
                    }`}
                    placeholder={placeholder}
                />
                {showSuggestions && (
                    <button
                        type='button'
                        onClick={() => setIsOpen(!isOpen)}
                        className='absolute top-1/2 right-3 -translate-y-1/2 cursor-pointer p-1 text-gray-400 hover:text-gray-600 dark:hover:text-white'
                    >
                        <ChevronDown
                            className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
                        />
                    </button>
                )}
            </div>

            <AnimatePresence>
                {isOpen && suggestions.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: openUpward ? -10 : 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: openUpward ? -10 : 10 }}
                        className={`absolute left-0 z-50 max-h-48 w-full overflow-y-auto rounded-xl border bg-white p-1 shadow-xl dark:border-white/10 dark:bg-black ${
                            openUpward ? "bottom-full mb-2" : "top-full mt-2"
                        }`}
                    >
                        {suggestions.map((p) => (
                            <button
                                key={p.id}
                                type='button'
                                onClick={() => {
                                    onChange(p.name)
                                    setIsOpen(false)
                                }}
                                className='flex w-full cursor-pointer items-center justify-between rounded-lg px-4 py-3 text-left text-xs hover:bg-black/5 dark:text-white dark:hover:bg-white/5'
                            >
                                <span className='truncate capitalize'>{p.name}</span>
                                {/* <span className='ml-2 shrink-0 text-[9px] font-bold text-gray-400 uppercase'>
                                    Existing
                                </span> */}
                            </button>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
