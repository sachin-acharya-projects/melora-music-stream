import { AnimatePresence, motion } from "framer-motion"
import { Check, ChevronDown } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"

export interface SortSelectOption {
    value: string
    label: string
}

interface SortSelectProps {
    value: string
    onChange: (value: string) => void
    options: SortSelectOption[]
    className?: string
}

export default function SortSelect({ value, onChange, options, className }: SortSelectProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [openUpward, setOpenUpward] = useState(false)
    const [rect, setRect] = useState<DOMRect | null>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const dropdownRef = useRef<HTMLDivElement>(null)

    const selected = options.find((option) => option.value === value)

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node
            if (
                containerRef.current &&
                !containerRef.current.contains(target) &&
                dropdownRef.current &&
                !dropdownRef.current.contains(target)
            ) {
                setIsOpen(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

    const toggleOpen = () => {
        if (containerRef.current) {
            const r = containerRef.current.getBoundingClientRect()
            setRect(r)
            setOpenUpward(window.innerHeight - r.bottom < 200)
        }
        setIsOpen((prev) => !prev)
    }

    return (
        <div className={`relative ${className}`} ref={containerRef}>
            <motion.button
                type='button'
                onClick={toggleOpen}
                aria-haspopup='listbox'
                aria-expanded={isOpen}
                layout
                transition={{ layout: { duration: 0.2, ease: "easeOut" } }}
                className='dark:bg-card flex h-11 cursor-pointer items-center gap-2 rounded-xl border bg-white px-3 text-sm font-medium shadow-sm transition-colors hover:border-red-200 dark:border-white/10 dark:text-white'
            >
                <span className='truncate'>
                    <AnimatePresence mode='popLayout' initial={false}>
                        <motion.span
                            key={selected?.value ?? ""}
                            className='inline-flex'
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -6 }}
                            transition={{ duration: 0.15 }}
                        >
                            {selected?.label ?? options[0]?.label}
                        </motion.span>
                    </AnimatePresence>
                </span>
                <ChevronDown
                    className={`h-4 w-4 shrink-0 text-gray-400 transition-transform ${
                        isOpen ? "rotate-180" : ""
                    }`}
                />
            </motion.button>

            {isOpen &&
                rect &&
                createPortal(
                    <motion.div
                        role='listbox'
                        ref={dropdownRef}
                        initial={{ opacity: 0, y: openUpward ? -10 : 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.15 }}
                        style={{
                            position: "fixed",
                            top: openUpward ? undefined : rect.bottom + 8,
                            bottom: openUpward ? window.innerHeight - rect.top + 8 : undefined,
                            left: rect.left,
                            minWidth: rect.width,
                        }}
                        className='z-50 max-h-80 overflow-y-auto rounded-xl border bg-white p-1 shadow-xl dark:border-white/10 dark:bg-black'
                    >
                        {options.map((option) => {
                            const isSelected = option.value === value
                            return (
                                <button
                                    key={option.value}
                                    type='button'
                                    role='option'
                                    aria-selected={isSelected}
                                    onClick={() => {
                                        onChange(option.value)
                                        setIsOpen(false)
                                    }}
                                    className={`flex w-full cursor-pointer items-center justify-between gap-6 rounded-lg px-3 py-2 text-left text-sm whitespace-nowrap transition-colors ${
                                        isSelected
                                            ? "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400"
                                            : "text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-white/5"
                                    }`}
                                >
                                    {option.label}
                                    {isSelected && <Check className='h-4 w-4 shrink-0' />}
                                </button>
                            )
                        })}
                    </motion.div>,
                    document.body,
                )}
        </div>
    )
}
