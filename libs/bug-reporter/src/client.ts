import type { BugReporterConfig } from "./config"
import type { BugReport, BugReportSeverity } from "./types"

export interface CreateBugReportInput {
    title: string
    description?: string
    severity: BugReportSeverity
    screenshot?: Blob | null
}

const BUGS_PATH = "/bugs"

/**
 * Minimal HTTP client for the bug-reporter contract. The backend decides how
 * to handle the report; this only encodes the wire format.
 *
 *   POST /bugs   -> BugReport   (multipart: title, description, severity, screenshot)
 *   GET  /bugs   -> BugReport[] (current user's reports)
 *   GET  /bugs/{id} -> BugReport
 */
export class BugReporterClient {
    private readonly config: BugReporterConfig
    private readonly baseUrl: string

    constructor(config: BugReporterConfig) {
        this.config = config
        this.baseUrl = config.apiBaseUrl.replace(/\/+$/, "")
    }

    async createReport(input: CreateBugReportInput): Promise<BugReport> {
        const form = new FormData()
        form.append("title", input.title)
        form.append("description", input.description ?? "")
        form.append("severity", input.severity)
        if (input.screenshot) {
            form.append("screenshot", input.screenshot, "screenshot.png")
        }
        return this.request<BugReport>(BUGS_PATH, { method: "POST", body: form })
    }

    async getMyReports(): Promise<BugReport[]> {
        return this.request<BugReport[]>(BUGS_PATH)
    }

    async getReport(id: string): Promise<BugReport> {
        return this.request<BugReport>(`${BUGS_PATH}/${encodeURIComponent(id)}`)
    }

    private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
        const headers = new Headers(init.headers)
        const auth = this.config.getAuthHeaders()
        for (const [key, value] of Object.entries(auth)) {
            headers.set(key, value)
        }
        if (!(init.body instanceof FormData)) {
            headers.set("Content-Type", "application/json")
        }
        const response = await fetch(`${this.baseUrl}${path}`, { ...init, headers })
        if (!response.ok) {
            let detail = ""
            try {
                const body = (await response.json()) as { detail?: unknown }
                detail = typeof body.detail === "string" ? body.detail : JSON.stringify(body)
            } catch {
                detail = await response.text()
            }
            throw new Error(`Bug report request failed (${response.status})${detail ? `: ${detail}` : ""}`)
        }
        return (await response.json()) as T
    }
}
