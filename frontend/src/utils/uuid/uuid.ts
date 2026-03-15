import { v4 as uuidv4 } from "uuid"

export function getUUID(): string {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
        return crypto.randomUUID()
    }

    // fallback to uuid library
    return uuidv4()
}
