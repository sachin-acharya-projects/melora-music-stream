import { useAuth } from "@/hooks/useAuth"
import { Loader2 } from "lucide-react"
import { Navigate } from "react-router-dom"

export default function AdminRoute({ children }: { children: React.ReactNode }) {
    const { isAuthenticated, isLoading, user } = useAuth()

    if (isLoading) {
        return (
            <div className='flex min-h-screen items-center justify-center'>
                <Loader2 className='h-8 w-8 animate-spin text-red-500' />
            </div>
        )
    }

    if (!isAuthenticated) {
        return <Navigate to='/login' replace />
    }

    if (user?.role !== "admin") {
        return <Navigate to='/' replace />
    }

    return <>{children}</>
}
