import { AnimatePresence, motion } from "framer-motion"
import { X } from "lucide-react"

interface AdminModalProps {
    isOpen: boolean
    title: string
    onClose: () => void
    children: React.ReactNode
}

export default function AdminModal({ isOpen, title, onClose, children }: AdminModalProps) {
    if (!isOpen) return null

    return (
        <AnimatePresence>
            <div className='fixed inset-0 z-5000 flex items-center justify-center p-4'>
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className='absolute inset-0 bg-black/60 backdrop-blur-sm'
                />
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    className='relative flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border bg-white shadow-2xl dark:bg-black'
                >
                    <div className='flex items-center justify-between border-b border-neutral-200 px-6 py-4 dark:border-white/10'>
                        <h3 className='text-lg font-bold'>{title}</h3>
                        <button
                            onClick={onClose}
                            className='cursor-pointer rounded-full p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5'
                        >
                            <X className='h-5 w-5' />
                        </button>
                    </div>
                    <div className='overflow-y-auto px-6 py-5'>{children}</div>
                </motion.div>
            </div>
        </AnimatePresence>
    )
}
