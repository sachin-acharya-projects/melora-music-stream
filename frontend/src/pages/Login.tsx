import { useEffect } from "react"
import { BackgroundWave } from "@/components/login/background-wave"
import { useAuth } from "@/hooks/useAuth"
import { AUTH_ERROR_STORAGE_KEY } from "@/services/auth.service"
import { Loader2, Music } from "lucide-react"
import { toast } from "react-toastify"

export default function Login() {
    const { login, isLoading } = useAuth()

    useEffect(() => {
        const error = sessionStorage.getItem(AUTH_ERROR_STORAGE_KEY)
        if (error) {
            sessionStorage.removeItem(AUTH_ERROR_STORAGE_KEY)
            toast.error(error)
        }
    }, [])

    return (
        <div className='relative flex min-h-screen items-center justify-center overflow-hidden bg-neutral-50 px-6 dark:bg-neutral-950'>
            <BackgroundWave />

            <div className='relative w-full max-w-lg space-y-10 rounded-2xl border border-neutral-200/60 bg-white/80 px-10 py-12 shadow-xl backdrop-blur-xl dark:border-neutral-800/60 dark:bg-neutral-900/80'>
                <div className='flex flex-col items-center gap-5'>
                    <div className='flex h-18 w-18 items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-red-600 text-white shadow-lg shadow-red-500/20'>
                        <Music className='h-9 w-9' />
                    </div>
                    <div className='space-y-2 text-center'>
                        <h1 className='text-4xl font-bold text-neutral-900 dark:text-white'>
                            Melora
                        </h1>
                        <p className='text-neutral-500 dark:text-neutral-400'>
                            Your personal music streaming experience
                        </p>
                    </div>
                </div>

                <div className='space-y-6'>
                    <button
                        onClick={login}
                        disabled={isLoading}
                        className='flex w-full cursor-pointer items-center justify-center gap-4 rounded-xl border border-neutral-300 bg-white px-6 py-4 text-base font-medium text-neutral-700 shadow-sm transition-all hover:bg-neutral-50 hover:shadow-md active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700'
                    >
                        {isLoading ? (
                            <Loader2 className='h-5 w-5 animate-spin' />
                        ) : (
                            <svg className='h-5 w-5 shrink-0' viewBox='0 0 24 24'>
                                <path
                                    fill='currentColor'
                                    d='M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z'
                                />
                                <path
                                    fill='currentColor'
                                    d='M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z'
                                />
                                <path
                                    fill='currentColor'
                                    d='M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z'
                                />
                                <path
                                    fill='currentColor'
                                    d='M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z'
                                />
                            </svg>
                        )}
                        Continue with Google
                    </button>
                </div>

                <p className='text-center text-sm text-neutral-400 dark:text-neutral-500'>
                    By continuing, you agree to our Terms of Service and Privacy Policy
                </p>
            </div>
        </div>
    )
}
