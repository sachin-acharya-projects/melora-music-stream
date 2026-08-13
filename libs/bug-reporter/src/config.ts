import type { BugReport, BugReportSeverity } from "./types"

export interface SeverityOption {
    value: BugReportSeverity
    label: string
}

export const DEFAULT_SEVERITY_OPTIONS: SeverityOption[] = [
    { value: "low", label: "Low" },
    { value: "medium", label: "Medium" },
    { value: "high", label: "High" },
    { value: "critical", label: "Critical" },
]

/**
 * Configuration the host application provides. The widget never imports
 * anything from the host — everything it needs is passed in here.
 */
export interface BugReporterConfig {
    /** Base URL of the backend implementing the bug-reporter contract. */
    apiBaseUrl: string
    /** Returns auth headers (e.g. Authorization) for the current session. */
    getAuthHeaders: () => Record<string, string>
    /** Overridable severity labels; defaults to Low/Medium/High/Critical. */
    severityOptions?: SeverityOption[]
    /** Called with the created report after a successful submission. */
    onSubmitted?: (report: BugReport) => void
}
