import { Capacitor } from "@capacitor/core"

function resolveApiBaseUrl(): string {
    const raw = (import.meta.env.VITE_BASE_URL ?? "").trim()
    // Strip trailing slashes, then any accidental "/api/v1" so we never end up
    // with a doubled segment like ".../api/v1/api/v1".
    let base = raw.replace(/\/+$/, "")
    base = base.replace(/\/api\/v1$/, "")
    return `${base}/api/v1`
}

export const API_BASE_URL = resolveApiBaseUrl()

export const BUG_REPORTER_ENABLED = import.meta.env.VITE_ENABLE_BUGREPORTER === "true"

export const IS_NATIVE = Capacitor.isNativePlatform()
