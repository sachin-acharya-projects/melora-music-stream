export { BugReporter } from "./bug-reporter"
export { BugReporterClient, type CreateBugReportInput } from "./client"
export { capturePage, type CapturedScreenshot } from "./capture"
export {
    ScreenshotAnnotator,
    type ScreenshotAnnotatorHandle,
} from "./annotator"
export type { BugReporterConfig, SeverityOption } from "./config"
export { DEFAULT_SEVERITY_OPTIONS } from "./config"
export type { BugReport, BugReportSeverity, BugReportStatus } from "./types"
export { BUG_REPORT_SEVERITIES, BUG_REPORT_STATUSES } from "./types"
