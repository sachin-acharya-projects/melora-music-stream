import { apiService } from "@/services/api.service"

export function openDownload(videoId: string): void {
    window.open(apiService.getDownloadUrl(videoId), "_blank")
}

export function openDownloads(videoIds: string[]): void {
    videoIds.forEach(openDownload)
}
