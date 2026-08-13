export const BUG_REPORT_STATUSES = ["pending", "in_progress", "resolved"] as const

export type BugReportStatus = (typeof BUG_REPORT_STATUSES)[number]

export const BUG_REPORT_SEVERITIES = ["low", "medium", "high", "critical"] as const

export type BugReportSeverity = (typeof BUG_REPORT_SEVERITIES)[number]

/**
 * A bug report as returned by any backend implementing the bug-reporter
 * contract. The widget only ever talks to this shape over HTTP.
 */
export interface BugReport {
    id: string
    title: string
    description: string | null
    severity: BugReportSeverity
    status: BugReportStatus
    screenshot_url: string | null
    created_at: string
    resolved_at: string | null
}
