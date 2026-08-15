import AdminLayout from "@/components/admin/admin-layout"
import { useAuth } from "@/hooks/useAuth"
import { useAdminUserActions, useAdminUsers } from "@/hooks/useAdmin"
import { type AdminUser } from "@/types"
import {
    BadgeCheck,
    ChevronLeft,
    ChevronRight,
    Crown,
    Loader2,
    Search,
    Shield,
    ShieldOff,
    User as UserIcon,
} from "lucide-react"
import { useEffect, useState } from "react"

const PAGE_SIZE = 50

export default function AdminUsers() {
    const { user: me } = useAuth()
    const [query, setQuery] = useState("")
    const [debouncedQuery, setDebouncedQuery] = useState("")
    const [page, setPage] = useState(1)

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedQuery(query), 250)
        return () => clearTimeout(timer)
    }, [query])

    const users = useAdminUsers({
        search: debouncedQuery || undefined,
        page,
        page_size: PAGE_SIZE,
    })
    const { updateUser } = useAdminUserActions()

    const isSuperAdmin = me?.is_super_admin === true
    const totalPages = Math.max(1, Math.ceil((users.data?.total ?? 0) / PAGE_SIZE))

    const handleToggleRole = async (user: AdminUser) => {
        await updateUser.mutateAsync({
            id: user.id,
            update: { role: user.role === "admin" ? "user" : "admin" },
        })
    }

    const handleToggleActive = async (user: AdminUser) => {
        await updateUser.mutateAsync({
            id: user.id,
            update: { is_active: !user.is_active },
        })
    }

    return (
        <AdminLayout>
            <div className='mb-6'>
                <h1 className='text-3xl font-bold dark:text-white'>
                    Users <span className='text-red-500'>Manager</span>
                </h1>
                <p className='mt-1 text-sm text-gray-500 dark:text-gray-400'>
                    Manage accounts, roles and active state
                </p>
            </div>

            <div className='mb-4'>
                <div className='relative'>
                    <Search className='absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400' />
                    <input
                        type='text'
                        value={query}
                        onChange={(e) => {
                            setQuery(e.target.value)
                            setPage(1)
                        }}
                        placeholder='Search name, email or username...'
                        className='dark:bg-card h-11 w-64 rounded-xl border bg-white pr-4 pl-10 text-sm shadow-sm transition-all focus:border-red-500 focus:outline-none dark:border-white/10 dark:text-white'
                    />
                </div>
            </div>

            {users.isLoading ? (
                <div className='flex justify-center pt-20'>
                    <Loader2 className='h-12 w-12 animate-spin text-red-600' />
                </div>
            ) : (users.data?.items ?? []).length === 0 ? (
                <div className='dark:bg-card flex flex-col items-center gap-4 rounded-2xl border border-gray-200 bg-white py-16 text-center dark:border-white/10'>
                    <span className='flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-950'>
                        <UserIcon className='h-7 w-7 text-red-500' />
                    </span>
                    <p className='text-sm text-gray-500 dark:text-gray-400'>
                        {debouncedQuery ? `Nothing matched "${debouncedQuery}"` : "No users yet"}
                    </p>
                </div>
            ) : (
                <>
                    <div className='dark:bg-card overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-white/10'>
                        <div className='flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-white/10'>
                            <span className='text-sm text-gray-500 dark:text-gray-400'>
                                {users.data?.total ?? 0} user
                                {(users.data?.total ?? 0) === 1 ? "" : "s"}
                            </span>
                        </div>
                        <div className='divide-y divide-gray-100 dark:divide-white/5'>
                            {(users.data?.items ?? []).map((user) => {
                                const isSelf = user.id === me?.id
                                return (
                                    <div
                                        key={user.id}
                                        className='flex flex-wrap items-center gap-4 px-4 py-3 transition-colors hover:bg-black/5 dark:hover:bg-white/5'
                                    >
                                        <span className='flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-neutral-200 dark:bg-neutral-700'>
                                            {user.avatar_url ? (
                                                <img
                                                    src={user.avatar_url}
                                                    alt={user.username}
                                                    className='h-full w-full object-cover'
                                                />
                                            ) : (
                                                <UserIcon className='h-6 w-6 text-neutral-500 dark:text-neutral-300' />
                                            )}
                                        </span>
                                        <div className='min-w-0 flex-1'>
                                            <div className='flex items-center gap-2'>
                                                <p className='truncate font-semibold dark:text-white'>
                                                    {user.display_name || user.username}
                                                </p>
                                                {user.role === "admin" ? (
                                                    <span className='flex items-center gap-1 rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-600 dark:bg-purple-950 dark:text-purple-400'>
                                                        <Shield className='h-3 w-3' />
                                                        Admin
                                                    </span>
                                                ) : (
                                                    <span className='rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-600 dark:bg-white/10 dark:text-neutral-300'>
                                                        User
                                                    </span>
                                                )}
                                                {user.is_super_admin && (
                                                    <span className='flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-600 dark:bg-amber-950 dark:text-amber-400'>
                                                        <Crown className='h-3 w-3' />
                                                        Super Admin
                                                    </span>
                                                )}
                                                {isSelf && (
                                                    <span className='rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-600 dark:bg-blue-950 dark:text-blue-400'>
                                                        You
                                                    </span>
                                                )}
                                            </div>
                                            <p className='truncate text-sm text-gray-500 dark:text-gray-400'>
                                                {user.email}
                                            </p>
                                        </div>
                                        <div className='flex items-center gap-1'>
                                            {user.role !== "admin" ? (
                                                <button
                                                    onClick={() => handleToggleRole(user)}
                                                    disabled={updateUser.isPending}
                                                    className='flex h-9 cursor-pointer items-center gap-1 rounded-lg px-2.5 text-sm font-medium transition-colors disabled:opacity-50'
                                                    title='Grant admin'
                                                >
                                                    <span className='flex items-center gap-1 rounded-lg bg-black/5 px-3 py-1.5 text-xs font-semibold text-gray-600 transition-colors hover:bg-purple-100 hover:text-purple-600 dark:bg-white/10 dark:text-gray-300 dark:hover:bg-purple-950 dark:hover:text-purple-400'>
                                                        <BadgeCheck className='h-3.5 w-3.5' />
                                                        Make admin
                                                    </span>
                                                </button>
                                            ) : isSuperAdmin && !isSelf ? (
                                                <button
                                                    onClick={() => handleToggleRole(user)}
                                                    disabled={updateUser.isPending}
                                                    className='flex h-9 cursor-pointer items-center gap-1 rounded-lg px-2.5 text-sm font-medium transition-colors disabled:opacity-50'
                                                    title='Revoke admin'
                                                >
                                                    <span className='flex items-center gap-1 rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-purple-700'>
                                                        <ShieldOff className='h-3.5 w-3.5' />
                                                        Revoke
                                                    </span>
                                                </button>
                                            ) : null}
                                            {user.role !== "admin" || (isSuperAdmin && !isSelf) ? (
                                                <button
                                                    onClick={() => handleToggleActive(user)}
                                                    disabled={updateUser.isPending || isSelf}
                                                    className={`h-9 cursor-pointer rounded-lg px-2.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                                                        user.is_active
                                                            ? "bg-black/5 text-gray-600 hover:text-amber-500 dark:bg-white/10 dark:text-gray-300"
                                                            : "bg-green-600 text-white hover:bg-green-700"
                                                    }`}
                                                    title={
                                                        isSelf
                                                            ? "You cannot deactivate your own account"
                                                            : user.is_active
                                                              ? "Deactivate account"
                                                              : "Reactivate account"
                                                    }
                                                >
                                                    {user.is_active ? "Deactivate" : "Reactivate"}
                                                </button>
                                            ) : null}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    <div className='mt-6 flex items-center justify-center gap-3'>
                        <button
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            disabled={page <= 1}
                            className='flex h-10 cursor-pointer items-center gap-1 rounded-xl border border-gray-200 bg-white px-4 text-sm font-medium transition-colors hover:border-red-300 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/10 dark:bg-black dark:text-white'
                        >
                            <ChevronLeft className='h-4 w-4' />
                            Previous
                        </button>
                        <span className='text-sm text-gray-500 dark:text-gray-400'>
                            Page {page} of {totalPages}
                        </span>
                        <button
                            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                            disabled={page >= totalPages}
                            className='flex h-10 cursor-pointer items-center gap-1 rounded-xl border border-gray-200 bg-white px-4 text-sm font-medium transition-colors hover:border-red-300 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/10 dark:bg-black dark:text-white'
                        >
                            Next
                            <ChevronRight className='h-4 w-4' />
                        </button>
                    </div>
                </>
            )}
        </AdminLayout>
    )
}
