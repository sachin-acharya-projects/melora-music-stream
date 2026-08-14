import { useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "@/hooks/useAuth"
import { Loader2 } from "lucide-react"
import { toast } from "react-toastify"
import { MESSAGES } from "@/utils/messages"

const DEACTIVATED_ERROR_PARAM = "account_deactivated"

export default function AuthCallback() {
    const { isAuthenticated, isLoading } = useAuth()
    const navigate = useNavigate()

    useEffect(() => {
        if (isLoading) return

        const errorParam = new URLSearchParams(window.location.search).get("error")
        if (errorParam === DEACTIVATED_ERROR_PARAM) {
            toast.error(MESSAGES.ACCOUNT_DEACTIVATED)
            navigate("/login")
            return
        }

        if (isAuthenticated) {
            navigate("/")
        } else {
            navigate("/login")
        }
    }, [isAuthenticated, isLoading, navigate])

    return (
        <div className='flex min-h-screen items-center justify-center'>
            <div className='flex flex-col items-center gap-4'>
                <Loader2 className='h-8 w-8 animate-spin text-red-500' />
                <p className='text-neutral-500 dark:text-neutral-400'>Completing sign in...</p>
            </div>
        </div>
    )
}
