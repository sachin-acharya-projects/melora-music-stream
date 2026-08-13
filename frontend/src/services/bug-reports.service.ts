import type {
    BugReport,
    BugReportSeverity,
    BugReportStatus,
} from "@sachin-acharya-projects/bug-reporter"
import { ENDPOINTS } from "@/utils/api/endpoints"
import { http } from "@/utils/api/http"

export interface AdminBugListResponse {
    items: BugReport[]
    total: number
    page: number
    page_size: number
}

export interface BugReportQuery {
    status?: BugReportStatus
    severity?: BugReportSeverity
    page?: number
    page_size?: number
}

export const bugReportsService = {
    getMyReports: async (): Promise<BugReport[]> => {
        const { data } = await http.get<BugReport[]>(ENDPOINTS.BUGS.BASE)
        return data
    },

    listAll: async (options: BugReportQuery = {}): Promise<AdminBugListResponse> => {
        const { data } = await http.get<AdminBugListResponse>(ENDPOINTS.BUGS.ADMIN, {
            params: options,
        })
        return data
    },

    updateStatus: async (id: string, status: BugReportStatus): Promise<BugReport> => {
        const { data } = await http.patch<BugReport>(ENDPOINTS.BUGS.ADMIN_BY_ID(id), {
            status,
        })
        return data
    },

    deleteReport: async (id: string): Promise<void> => {
        await http.delete(ENDPOINTS.BUGS.ADMIN_BY_ID(id))
    },
}
