import AdminLayout from "@/components/admin/admin-layout"
import { BugSeverityBadge, BugStatusBadge } from "@/components/bug-reporter/badges"
import { bugReportsService } from "@/services/bug-reports.service"
import type { BugReport, BugReportSeverity, BugReportStatus } from "@sachin-acharya-projects/bug-reporter"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Bug, ChevronLeft, ChevronRight, Loader2, Trash2 } from "lucide-react"
import { useState } from "react"
import { toast } from "react-toastify"

const PAGE_SIZE = 20

interface FailedNetworkRequest {
    timestamp: string
    method: string
    url: string
    status: number | null
    duration_ms: number | null
    message: string
    request_payload: string | null
    response: string | null
}

const SEVERITY_FILTERS: (BugReportSeverity | "")[] = ["", "low", "medium", "high", "critical"]

const STATUS_FLOW: BugReportStatus[] = ["pending", "in_progress", "resolved"]

const STATUS_OPTIONS: { value: BugReportStatus; label: string }[] = [
    { value: "pending", label: "Pending" },
    { value: "in_progress", label: "In Progress" },
    { value: "resolved", label: "Resolved" },
]

export default function AdminBugs() {
    const queryClient = useQueryClient()
    const [statusFilter, setStatusFilter] = useState<BugReportStatus | "">("")
    const [severityFilter, setSeverityFilter] = useState<BugReportSeverity | "">("")
    const [page, setPage] = useState(1)
    const [detail, setDetail] = useState<BugReport | null>(null)

    const bugs = useQuery({
        queryKey: ["admin", "bugs", { status: statusFilter, severity: severityFilter, page }],
        queryFn: () =>
            bugReportsService.listAll({
                status: statusFilter || undefined,
                severity: severityFilter || undefined,
                page,
                page_size: PAGE_SIZE,
            }),
    })

    const invalidate = () => {
        queryClient.invalidateQueries({ queryKey: ["admin", "bugs"] })
    }

    const updateStatus = useMutation({
        mutationFn: ({ id, status }: { id: string; status: BugReportStatus }) =>
            bugReportsService.updateStatus(id, status),
        onSuccess: (report) => {
            setDetail(report)
            invalidate()
            toast.success(`Marked "${report.title}" as ${report.status}`)
        },
        onError: () => toast.error("Failed to update status"),
    })

    const remove = useMutation({
        mutationFn: (id: string) => bugReportsService.deleteReport(id),
        onSuccess: () => {
            setDetail(null)
            invalidate()
            toast.success("Bug report deleted")
        },
        onError: () => toast.error("Failed to delete bug report"),
    })

    const totalPages = Math.max(1, Math.ceil((bugs.data?.total ?? 0) / PAGE_SIZE))
    const items = bugs.data?.items ?? []

    return (
        <AdminLayout>
            <div className='mb-6'>
                <h1 className='text-3xl font-bold dark:text-white'>
                    Bug <span className='text-red-500'>Reports</span>
                </h1>
                <p className='mt-1 text-sm text-gray-500 dark:text-gray-400'>
                    Review user reports, update their status and clean up resolved ones
                </p>
            </div>

            <div className='mb-4 flex flex-wrap items-center gap-3'>
                <select
                    value={statusFilter}
                    onChange={(e) => {
                        setStatusFilter(e.target.value as BugReportStatus | "")
                        setPage(1)
                    }}
                    className='dark:bg-card h-11 cursor-pointer rounded-xl border bg-white px-3 text-sm shadow-sm transition-all focus:border-red-500 focus:outline-none dark:border-white/10 dark:text-white'
                >
                    <option value=''>All statuses</option>
                    {STATUS_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>
                <select
                    value={severityFilter}
                    onChange={(e) => {
                        setSeverityFilter(e.target.value as BugReportSeverity | "")
                        setPage(1)
                    }}
                    className='dark:bg-card h-11 cursor-pointer rounded-xl border bg-white px-3 text-sm shadow-sm transition-all focus:border-red-500 focus:outline-none dark:border-white/10 dark:text-white'
                >
                    <option value=''>All severities</option>
                    {SEVERITY_FILTERS.filter((value) => value !== "").map((value) => (
                        <option key={value} value={value}>
                            {value.charAt(0).toUpperCase() + value.slice(1)}
                        </option>
                    ))}
                </select>
                <span className='text-sm text-gray-500 dark:text-gray-400'>
                    {bugs.data?.total ?? 0} report{(bugs.data?.total ?? 0) === 1 ? "" : "s"}
                </span>
            </div>

            {bugs.isLoading ? (
                <div className='flex justify-center pt-20'>
                    <Loader2 className='h-12 w-12 animate-spin text-red-600' />
                </div>
            ) : items.length === 0 ? (
                <div className='dark:bg-card flex flex-col items-center gap-4 rounded-2xl border border-gray-200 bg-white py-16 text-center dark:border-white/10'>
                    <span className='flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-950'>
                        <Bug className='h-7 w-7 text-red-500' />
                    </span>
                    <p className='text-sm text-gray-500 dark:text-gray-400'>
                        {statusFilter || severityFilter ? "No reports match the filters" : "No bug reports yet"}
                    </p>
                </div>
            ) : (
                <>
                    <div className='dark:bg-card overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-white/10'>
                        <div className='divide-y divide-gray-100 dark:divide-white/5'>
                            {items.map((report) => (
                                <div
                                    key={report.id}
                                    onClick={() => setDetail(report)}
                                    className='flex cursor-pointer flex-wrap items-center gap-3 px-4 py-3 transition-colors hover:bg-black/5 dark:hover:bg-white/5'
                                >
                                    <div className='min-w-0 flex-1'>
                                        <p className='truncate font-semibold dark:text-white'>
                                            {report.title}
                                        </p>
                                        <p className='truncate text-sm text-gray-500 dark:text-gray-400'>
                                            {report.description || "No description provided."}
                                        </p>
                                        <p className='mt-0.5 text-xs text-gray-400 dark:text-gray-500'>
                                            {new Date(report.created_at).toLocaleString()}
                                        </p>
                                    </div>
                                    <div className='flex shrink-0 flex-wrap items-center gap-2'>
                                        <BugSeverityBadge severity={report.severity} />
                                        <BugStatusBadge status={report.status} />
                                    </div>
                                </div>
                            ))}
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

            {detail && (
                <div
                    className='fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4'
                    onClick={() => setDetail(null)}
                >
                    <div
                        className='dark:bg-card max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-gray-200 bg-white p-6 dark:border-white/10'
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className='mb-4 flex items-start justify-between gap-4'>
                            <div>
                                <h2 className='text-lg font-bold dark:text-white'>{detail.title}</h2>
                                <div className='mt-2 flex flex-wrap items-center gap-2'>
                                    <BugSeverityBadge severity={detail.severity} />
                                    <BugStatusBadge status={detail.status} />
                                </div>
                            </div>
                            <button
                                onClick={() => setDetail(null)}
                                className='flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-black/5 text-gray-500 transition-colors hover:bg-black/10 dark:bg-white/10 dark:text-gray-300'
                                aria-label='Close'
                            >
                                ×
                            </button>
                        </div>

                        {detail.screenshot_url && (
                            <div className='mb-4 overflow-hidden rounded-xl border border-gray-200 dark:border-white/10'>
                                <img
                                    src={detail.screenshot_url}
                                    alt='Reported screenshot'
                                    className='w-full'
                                />
                            </div>
                        )}

                        <p className='whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300'>
                            {detail.description || "No description provided."}
                        </p>

                        {(() => {
                            const context = (detail.network_context ?? null) as {
                                failed_requests?: FailedNetworkRequest[]
                            } | null
                            const requests = context?.failed_requests ?? []
                            if (requests.length === 0) return null
                            return (
                                <div className='mt-4'>
                                    <h3 className='mb-2 text-sm font-bold text-gray-700 dark:text-gray-300'>
                                        Network context
                                        <span className='ml-2 font-normal text-gray-400'>
                                            {requests.length} failed request{requests.length === 1 ? "" : "s"}
                                        </span>
                                    </h3>
                                    <div className='space-y-3'>
                                        {requests.map((request, index) => (
                                            <div
                                                key={index}
                                                className='overflow-hidden rounded-xl border border-gray-200 dark:border-white/10'
                                            >
                                                <div className='flex flex-wrap items-center gap-2 border-b border-gray-100 bg-black/[0.03] px-3 py-2 dark:border-white/5 dark:bg-white/5'>
                                                    <span className='rounded bg-gray-800 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-white'>
                                                        {request.method}
                                                    </span>
                                                    <span className='min-w-0 flex-1 truncate font-mono text-xs text-gray-700 dark:text-gray-300'>
                                                        {request.url}
                                                    </span>
                                                    <span
                                                        className={`rounded px-1.5 py-0.5 font-mono text-[11px] font-semibold ${
                                                            request.status
                                                                ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"
                                                                : "bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-300"
                                                        }`}
                                                    >
                                                        {request.status ?? "network"}
                                                    </span>
                                                </div>
                                                <div className='space-y-1 px-3 py-2'>
                                                    <p className='text-[11px] text-gray-400 dark:text-gray-500'>
                                                        {request.message}
                                                        {request.duration_ms != null &&
                                                            ` · ${request.duration_ms}ms`}
                                                        {` · ${new Date(request.timestamp).toLocaleString()}`}
                                                    </p>
                                                    {request.request_payload && (
                                                        <pre className='max-h-24 overflow-auto whitespace-pre-wrap break-all rounded-lg bg-black/[0.04] px-2 py-1.5 font-mono text-[11px] text-gray-600 dark:bg-white/5 dark:text-gray-300'>
                                                            <span className='font-semibold'>Request:</span>{" "}
                                                            {request.request_payload}
                                                        </pre>
                                                    )}
                                                    {request.response && (
                                                        <pre className='max-h-24 overflow-auto whitespace-pre-wrap break-all rounded-lg bg-black/[0.04] px-2 py-1.5 font-mono text-[11px] text-gray-600 dark:bg-white/5 dark:text-gray-300'>
                                                            <span className='font-semibold'>Response:</span>{" "}
                                                            {request.response}
                                                        </pre>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )
                        })()}

                        <div className='mt-4 border-t border-gray-100 pt-3 text-xs text-gray-400 dark:border-white/5 dark:text-gray-500'>
                            Submitted {new Date(detail.created_at).toLocaleString()}
                            {detail.resolved_at &&
                                ` · Resolved ${new Date(detail.resolved_at).toLocaleString()}`}
                        </div>

                        <div className='mt-4 flex flex-wrap items-center justify-between gap-3'>
                            <select
                                value={detail.status}
                                onChange={(e) => {
                                    const status = e.target.value as BugReportStatus
                                    const index = STATUS_FLOW.indexOf(status)
                                    void updateStatus.mutateAsync({
                                        id: detail.id,
                                        status: STATUS_FLOW[index],
                                    })
                                }}
                                disabled={updateStatus.isPending}
                                className='dark:bg-card h-11 cursor-pointer rounded-xl border bg-white px-3 text-sm shadow-sm transition-all focus:border-red-500 focus:outline-none dark:border-white/10 dark:text-white'
                            >
                                {STATUS_OPTIONS.map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                            <button
                                onClick={() => void remove.mutateAsync(detail.id)}
                                disabled={remove.isPending}
                                className='flex h-11 cursor-pointer items-center gap-1.5 rounded-xl border border-red-200 bg-white px-4 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:bg-black dark:hover:bg-red-950'
                            >
                                <Trash2 className='h-4 w-4' />
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    )
}
