import { BugSeverityBadge, BugStatusBadge } from "@/components/bug-reporter/badges"
import { useTitle } from "@/hooks/useTitle"
import { bugReportsService } from "@/services/bug-reports.service"
import { useQuery } from "@tanstack/react-query"
import { Bug, ChevronRight, Loader2 } from "lucide-react"
import { useState } from "react"
import { useNavigate } from "react-router-dom"

export default function ReportedBugs() {
    useTitle("Reported Bugs")

    const [selectedId, setSelectedId] = useState<string | null>(null)
    const navigate = useNavigate()

    const { data: reports = [], isLoading } = useQuery({
        queryKey: ["bugs", "mine"],
        queryFn: () => bugReportsService.getMyReports(),
    })

    const selected = reports.find((report) => report.id === selectedId)

    return (
        <div className='mx-auto max-w-3xl px-4 pt-10 pb-40'>
            <div className='mb-8 flex items-center gap-4'>
                <span className='flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500 text-white'>
                    <Bug className='h-7 w-7' />
                </span>
                <div>
                    <h1 className='text-3xl font-bold dark:text-white'>
                        Reported <span className='text-red-500'>Bugs</span>
                    </h1>
                    <p className='mt-1 text-sm text-gray-500 dark:text-gray-400'>
                        Track the bug reports you submitted and their status
                    </p>
                </div>
            </div>

            {isLoading ? (
                <div className='flex justify-center pt-20'>
                    <Loader2 className='h-12 w-12 animate-spin text-red-600' />
                </div>
            ) : reports.length === 0 ? (
                <div className='dark:bg-card flex flex-col items-center gap-4 rounded-2xl border border-gray-200 bg-white py-16 text-center dark:border-white/10'>
                    <span className='flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-950'>
                        <Bug className='h-7 w-7 text-red-500' />
                    </span>
                    <p className='text-sm text-gray-500 dark:text-gray-400'>
                        You haven't reported any bugs yet
                    </p>
                    <p className='text-xs text-gray-400 dark:text-gray-500'>
                        Use the red "Report a bug" button at the bottom-right of any page.
                    </p>
                </div>
            ) : (
                <>
                    <div className='dark:bg-card overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-white/10'>
                        <div className='flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-white/10'>
                            <span className='text-sm text-gray-500 dark:text-gray-400'>
                                {reports.length} report{reports.length === 1 ? "" : "s"}
                            </span>
                        </div>
                        <div className='divide-y divide-gray-100 dark:divide-white/5'>
                            {reports.map((report) => (
                                <button
                                    key={report.id}
                                    onClick={() => setSelectedId(report.id)}
                                    className='flex w-full items-center gap-4 px-4 py-4 text-left transition-colors hover:bg-black/5 dark:hover:bg-white/5'
                                >
                                    <div className='min-w-0 flex-1'>
                                        <div className='flex flex-wrap items-center gap-2'>
                                            <p className='truncate font-semibold dark:text-white'>
                                                {report.title}
                                            </p>
                                            <BugSeverityBadge severity={report.severity} />
                                        </div>
                                        <p className='mt-1 line-clamp-2 text-sm text-gray-500 dark:text-gray-400'>
                                            {report.description || "No description provided."}
                                        </p>
                                        <p className='mt-1 text-xs text-gray-400 dark:text-gray-500'>
                                            {new Date(report.created_at).toLocaleString()}
                                        </p>
                                    </div>
                                    <div className='flex shrink-0 items-center gap-3'>
                                        <BugStatusBadge status={report.status} />
                                        <ChevronRight className='h-4 w-4 text-gray-400' />
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className='mt-6 flex justify-center'>
                        <button
                            onClick={() => navigate("/")}
                            className='cursor-pointer rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:border-red-300 dark:border-white/10 dark:bg-black dark:text-gray-300'
                        >
                            Back to browsing
                        </button>
                    </div>
                </>
            )}

            {selected && (
                <div
                    className='fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4'
                    onClick={() => setSelectedId(null)}
                >
                    <div
                        className='dark:bg-card max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-gray-200 bg-white p-6 dark:border-white/10'
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className='mb-4 flex items-start justify-between gap-4'>
                            <div>
                                <h2 className='text-lg font-bold dark:text-white'>{selected.title}</h2>
                                <div className='mt-2 flex flex-wrap items-center gap-2'>
                                    <BugSeverityBadge severity={selected.severity} />
                                    <BugStatusBadge status={selected.status} />
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedId(null)}
                                className='flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-black/5 text-gray-500 transition-colors hover:bg-black/10 dark:bg-white/10 dark:text-gray-300'
                                aria-label='Close'
                            >
                                ×
                            </button>
                        </div>

                        {selected.screenshot_url && (
                            <div className='mb-4 overflow-hidden rounded-xl border border-gray-200 dark:border-white/10'>
                                <img
                                    src={selected.screenshot_url}
                                    alt='Reported screenshot'
                                    className='w-full'
                                />
                            </div>
                        )}

                        <p className='whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300'>
                            {selected.description || "No description provided."}
                        </p>

                        <div className='mt-4 border-t border-gray-100 pt-3 text-xs text-gray-400 dark:border-white/5 dark:text-gray-500'>
                            Submitted {new Date(selected.created_at).toLocaleString()}
                            {selected.resolved_at &&
                                ` · Resolved ${new Date(selected.resolved_at).toLocaleString()}`}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
