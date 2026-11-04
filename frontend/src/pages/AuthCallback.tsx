import { useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "@/hooks/useAuth"
import { Loader2 } from "lucide-react"
import { toast } from "react-toastify"
import { MESSAGES } from "@/utils/messages"

const DEACTIVATED_ERROR_PARAM = "account_deactivated"
const ACCOUNT_LINK_REQUIRED_PARAM = "account_link_required"
const IDENTITY_FAILED_PARAM = "identity_provider_authentication_failed"
const IDENTITY_SIGN_IN_FAILED_PARAM = "identity_sign_in_failed"

export default function AuthCallback() {
    const { isAuthenticated, isLoading } = useAuth()
    const navigate = useNavigate()

    useEffect(() => {
        if (isLoading) return

        const errorParam = new URLSearchParams(window.location.search).get("error")
        if (errorParam === ACCOUNT_LINK_REQUIRED_PARAM) {
            toast.error("An account already uses this email. Sign in to that account, then connect this provider from your profile.")
            navigate("/login")
            return
        }

        if (errorParam === IDENTITY_FAILED_PARAM) {
            toast.error("The identity provider could not authenticate this sign-in. Please try again.")
            navigate("/login")
            return
        }

        if (errorParam === IDENTITY_SIGN_IN_FAILED_PARAM) {
            toast.error("This identity provider could not sign you in. Check your account eligibility or contact the Melora administrator.")
            navigate("/login")
            return
        }

        if (errorParam === DEACTIVATED_ERROR_PARAM) {
            toast.error(MESSAGES.ACCOUNT_DEACTIVATED)
            navigate("/login")
            return
        }

        const identityLinked = new URLSearchParams(window.location.search).get("identity") === "linked"
        if (identityLinked && isAuthenticated) {
            toast.success("Sign-in method connected successfully")
            navigate("/profile")
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
