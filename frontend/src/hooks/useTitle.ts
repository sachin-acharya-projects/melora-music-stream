import { useEffect } from "react"

const APP_NAME = "Melora"

export function useTitle(title?: string) {
    useEffect(() => {
        const baseTitle = APP_NAME
        const fullTitle = title ? `${title} | ${baseTitle}` : `Search and Play Music | ${baseTitle}`

        document.title = fullTitle
    }, [title])
}
