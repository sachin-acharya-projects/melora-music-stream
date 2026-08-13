import { SEVERITY_LABELS, SEVERITY_STYLES, STATUS_LABELS, STATUS_STYLES } from "./labels"
import type { BugReportSeverity, BugReportStatus } from "@sachin-acharya-projects/bug-reporter"

export function BugStatusBadge({ status }: { status: BugReportStatus }) {
    return (
        <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[status]}`}
        >
            {STATUS_LABELS[status]}
        </span>
    )
}

export function BugSeverityBadge({ severity }: { severity: BugReportSeverity }) {
    return (
        <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${SEVERITY_STYLES[severity]}`}
        >
            {SEVERITY_LABELS[severity]}
        </span>
    )
}
