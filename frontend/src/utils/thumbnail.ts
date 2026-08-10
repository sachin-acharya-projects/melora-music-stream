import { API_BASE_URL } from "@/config"

const ALLOWED_HOSTS = new Set([
    "yt3.googleusercontent.com",
    "yt4.googleusercontent.com",
    "lh3.googleusercontent.com",
    "lh5.googleusercontent.com",
    "yt3.ggpht.com",
    "yt4.ggpht.com",
    "lh3.ggpht.com",
    "i.ytimg.com",
])

export function isGoogleThumbnail(src: string): boolean {
    if (!src) return false
    try {
        const { protocol, hostname } = new URL(src)
        return protocol === "https:" && ALLOWED_HOSTS.has(hostname)
    } catch {
        return false
    }
}

/**
 * Route a Google-hosted artwork URL through the backend thumbnail proxy so the
 * browser never hits Google's image CDN directly (which rate-limits under
 * burst load). Non-Google URLs (e.g. local /media avatars) pass through.
 */
export function getThumbUrl(src: string): string {
    if (!isGoogleThumbnail(src)) return src
    return `${API_BASE_URL}/thumbnail?url=${encodeURIComponent(src)}`
}

/**
 * Normalize local media URLs. Older backend builds leaked the absolute
 * container path into stored avatar URLs (e.g. `//app/data/media/avatars/x.jpg`,
 * which the browser treats as host `app`, path `/data/media/avatars/x.jpg`).
 * Map any such path back onto the proxied `/media/...` route.
 */
export function normalizeLocalMediaUrl(src: string): string {
    try {
        const { pathname } = new URL(src, "http://localhost")
        if (pathname.startsWith("/data/media/")) {
            return `/media/${pathname.slice("/data/media/".length)}`
        }
    } catch {
        /* ignore malformed URLs */
    }
    return src
}

// Recursively rewrite artwork URLs in a data structure (API responses,
// persisted player state) to go through the backend proxy or onto the local
// /media mount.
export function rewriteThumbnails(
    value: unknown,
    seen: WeakSet<object> = new WeakSet(),
): unknown {
    if (typeof value === "string") {
        if (isGoogleThumbnail(value)) return getThumbUrl(value)
        return normalizeLocalMediaUrl(value)
    }
    if (Array.isArray(value)) {
        return value.map((item) => rewriteThumbnails(item, seen))
    }
    if (value !== null && typeof value === "object") {
        if (seen.has(value)) return value
        seen.add(value)
        const result: Record<string, unknown> = {}
        for (const [key, item] of Object.entries(value)) {
            result[key] = rewriteThumbnails(item, seen)
        }
        return result
    }
    return value
}
