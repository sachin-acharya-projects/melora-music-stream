import { AnimatePresence, motion } from "framer-motion"
import { AlertCircle, X } from "lucide-react"

interface ConfirmationDialogProps {
    isOpen: boolean
    title: string
    message: string
    onConfirm: () => void
    onCancel: () => void
    confirmText?: string
    cancelText?: string
    type?: "danger" | "info"
}

export default function ConfirmationDialog({
    isOpen,
    title,
    message,
    onConfirm,
    onCancel,
    confirmText = "Confirm",
    cancelText = "Cancel",
    type = "danger",
}: ConfirmationDialogProps) {
    if (!isOpen) return null

    return (
        <AnimatePresence>
            <div className='fixed inset-0 z-5000 flex items-center justify-center p-4'>
                {/* Backdrop */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onCancel}
                    className='absolute inset-0 bg-black/60 backdrop-blur-sm'
                />

                {/* Dialog */}
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    className='relative w-full max-w-md overflow-hidden rounded-2xl border bg-white p-6 shadow-2xl dark:bg-black'
                >
                    <div className='flex items-start gap-4'>
                        <div
                            className={`rounded-full p-3 ${type === "danger" ? "bg-red-50 text-red-600 dark:bg-red-500/10" : "bg-blue-50 text-blue-600 dark:bg-blue-500/10"}`}
                        >
                            <AlertCircle className='h-6 w-6' />
                        </div>
                        <div className='flex-1'>
                            <h3 className='text-lg font-bold'>{title}</h3>
                            <p className='mt-2 text-sm text-gray-500 dark:text-gray-400'>
                                {message}
                            </p>
                        </div>
                        <button
                            onClick={onCancel}
                            className='cursor-pointer rounded-full p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5'
                        >
                            <X className='h-5 w-5' />
                        </button>
                    </div>

                    <div className='mt-8 flex justify-end gap-3'>
                        <button
                            onClick={onCancel}
                            className='cursor-pointer rounded-xl px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/5'
                        >
                            {cancelText}
                        </button>
                        <button
                            onClick={() => {
                                onConfirm()
                                onCancel()
                            }}
                            className={`cursor-pointer rounded-xl px-6 py-2 text-sm font-bold text-white shadow-lg transition-all hover:scale-105 active:scale-95 ${
                                type === "danger"
                                    ? "bg-red-600 hover:bg-red-700"
                                    : "bg-blue-600 hover:bg-blue-700"
                            }`}
                        >
                            {confirmText}
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    )
}
