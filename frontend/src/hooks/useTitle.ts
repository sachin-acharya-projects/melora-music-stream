import { useEffect } from "react"

export function useTitle(title?: string) {
    useEffect(() => {
        document.title = title?.trim() || "Melora"
    }, [title])
}
