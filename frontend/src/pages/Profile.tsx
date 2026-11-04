import { useEffect, useState } from "react"
import Avatar from "@/components/ui/avatar/avatar"
import { useAuth } from "@/hooks/useAuth"
import { authService, type ExternalIdentity, type OIDCProvider } from "@/services/auth.service"
import { toast } from "react-toastify"
import { Loader2, LogOut, Music, Link2, Unlink } from "lucide-react"

export default function Profile() {
    const { user, isLoading, logout } = useAuth()
    const [identities, setIdentities] = useState<ExternalIdentity[]>([])
    const [providers, setProviders] = useState<OIDCProvider[]>([])
    const [identityLoading, setIdentityLoading] = useState(true)

    useEffect(() => {
        let active = true
        Promise.all([authService.getLinkedIdentities(), authService.getOIDCProviders()])
            .then(([linked, available]) => {
                if (!active) return
                setIdentities(linked)
                setProviders(available)
            })
            .catch(() => {
                if (active) toast.error("Unable to load connected sign-in methods")
            })
            .finally(() => {
                if (active) setIdentityLoading(false)
            })
        return () => {
            active = false
        }
    }, [])

    const unlinkIdentity = async (identity: ExternalIdentity) => {
        try {
            await authService.unlinkIdentity(identity.id)
            setIdentities((current) => current.filter((item) => item.id !== identity.id))
            toast.success(identity.provider_name + " disconnected")
        } catch {
            toast.error("Unable to disconnect this identity. Keep at least one sign-in method connected.")
        }
    }

    if (isLoading) {
        return (
            <div className='flex min-h-[60vh] items-center justify-center'>
                <Loader2 className='h-8 w-8 animate-spin text-red-500' />
            </div>
        )
    }

    if (!user) {
        return null
    }

    return (
        <div className='mx-auto max-w-2xl space-y-6 p-6'>
            <h1 className='text-2xl font-bold text-neutral-900 dark:text-white'>Profile</h1>

            <div className='rounded-xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900'>
                <div className='flex items-start gap-6'>
                    <Avatar
                        src={user.avatar_url}
                        name={user.display_name || user.username}
                        size={80}
                    />

                    <div className='flex-1 space-y-4'>
                        <div>
                            <h2 className='text-xl font-semibold text-neutral-900 dark:text-white'>
                                {user.display_name || user.username}
                            </h2>
                            <p className='text-neutral-500 dark:text-neutral-400'>
                                @{user.username}
                            </p>
                        </div>

                        {user.bio && (
                            <p className='text-neutral-600 dark:text-neutral-300'>{user.bio}</p>
                        )}

                        <div className='flex flex-wrap gap-2'>
                            <span className='inline-flex items-center gap-1 rounded-full bg-neutral-100 px-3 py-1 text-sm text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300'>
                                <Music className='h-4 w-4' />
                                {user.role}
                            </span>
                            {user.oauth_provider && (
                                <span className='inline-flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'>
                                    {user.oauth_provider}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                <div className='mt-6 border-t border-neutral-200 pt-6 dark:border-neutral-800'>
                    <div className='grid grid-cols-2 gap-4 text-sm'>
                        <div>
                            <p className='text-neutral-500 dark:text-neutral-400'>Email</p>
                            <p className='font-medium text-neutral-900 dark:text-white'>
                                {user.email}
                            </p>
                        </div>
                        <div>
                            <p className='text-neutral-500 dark:text-neutral-400'>Member since</p>
                            <p className='font-medium text-neutral-900 dark:text-white'>
                                {new Date(user.created_at).toLocaleDateString()}
                            </p>
                        </div>
                    </div>
                </div>

                <div className='mt-6 border-t border-neutral-200 pt-6 dark:border-neutral-800'>
                    <div className='mb-4 flex items-center justify-between gap-4'>
                        <div>
                            <h3 className='font-semibold text-neutral-900 dark:text-white'>Connected sign-in methods</h3>
                            <p className='mt-1 text-sm text-neutral-500 dark:text-neutral-400'>
                                Manage the external accounts that can access Melora.
                            </p>
                        </div>
                        {identityLoading && <Loader2 className='h-4 w-4 animate-spin text-neutral-400' />}
                    </div>

                    <div className='space-y-2'>
                        {identities.map((identity) => (
                            <div key={identity.id} className='flex items-center justify-between gap-3 py-2'>
                                <div className='min-w-0'>
                                    <p className='text-sm font-medium text-neutral-800 dark:text-neutral-200'>
                                        {identity.provider_name}
                                    </p>
                                    <p className='truncate text-xs text-neutral-500 dark:text-neutral-400'>
                                        {identity.email || identity.display_name || "Connected account"}
                                        {identity.email_verified ? " · verified" : ""}
                                    </p>
                                </div>
                                <button
                                    onClick={() => void unlinkIdentity(identity)}
                                    className='inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-red-600 dark:hover:bg-neutral-800'
                                    title='Disconnect identity'
                                >
                                    <Unlink className='h-3.5 w-3.5' />
                                    Disconnect
                                </button>
                            </div>
                        ))}
                        {!identityLoading && identities.length === 0 && (
                            <p className='py-2 text-sm text-neutral-500 dark:text-neutral-400'>
                                No external accounts are connected yet.
                            </p>
                        )}
                    </div>

                    {providers.length > 0 && (
                        <div className='mt-4 flex flex-wrap gap-2'>
                            {providers.map((provider) => (
                                    <button
                                        key={provider.id}
                                        onClick={() => void authService.linkOIDCIdentity(provider.id).catch(() => toast.error("Unable to start identity linking"))}
                                        className='inline-flex items-center gap-2 rounded-lg bg-neutral-100 px-3 py-2 text-sm text-neutral-700 transition-colors hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700'
                                    >
                                        <Link2 className='h-4 w-4' />
                                        Connect {provider.display_name}
                                    </button>
                                ))}
                        </div>
                    )}
                </div>

                <div className='mt-6 border-t border-neutral-200 pt-6 dark:border-neutral-800'>
                    <button
                        onClick={logout}
                        className='flex items-center gap-2 rounded-lg border border-red-200 px-4 py-2 text-red-600 transition-colors hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20'
                    >
                        <LogOut className='h-4 w-4' />
                        Sign out
                    </button>
                </div>
            </div>
        </div>
    )
}
