import type {
    BugReportSeverity,
    BugReportStatus,
} from "@sachin-acharya-projects/bug-reporter"

export const STATUS_LABELS: Record<BugReportStatus, string> = {
    pending: "Pending",
    in_progress: "In Progress",
    resolved: "Resolved",
}

export const SEVERITY_LABELS: Record<BugReportSeverity, string> = {
    low: "Low",
    medium: "Medium",
    high: "High",
    critical: "Critical",
}

export const STATUS_STYLES: Record<BugReportStatus, string> = {
    pending: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
    in_progress: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400",
    resolved: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400",
}

export const SEVERITY_STYLES: Record<BugReportSeverity, string> = {
    low: "bg-neutral-100 text-neutral-600 dark:bg-white/10 dark:text-neutral-300",
    medium: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400",
    high: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-400",
    critical: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400",
}
