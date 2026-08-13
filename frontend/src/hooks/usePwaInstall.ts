import { useCallback, useEffect, useState } from "react"

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>
    userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>
}

export function usePwaInstall() {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
    const [isInstalled, setIsInstalled] = useState(
        () => window.matchMedia("(display-mode: standalone)").matches,
    )

    useEffect(() => {
        const onBeforeInstallPrompt = (e: Event) => {
            e.preventDefault()
            setDeferredPrompt(e as BeforeInstallPromptEvent)
        }
        const onInstalled = () => {
            setIsInstalled(true)
            setDeferredPrompt(null)
        }
        const standalone = window.matchMedia("(display-mode: standalone)")
        const onDisplayModeChange = () => setIsInstalled(standalone.matches)

        window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt)
        window.addEventListener("appinstalled", onInstalled)
        standalone.addEventListener("change", onDisplayModeChange)

        return () => {
            window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt)
            window.removeEventListener("appinstalled", onInstalled)
            standalone.removeEventListener("change", onDisplayModeChange)
        }
    }, [])

    const promptInstall = useCallback(async () => {
        if (!deferredPrompt) return false
        await deferredPrompt.prompt()
        const { outcome } = await deferredPrompt.userChoice
        setDeferredPrompt(null)
        return outcome === "accepted"
    }, [deferredPrompt])

    return { canInstall: !!deferredPrompt && !isInstalled, promptInstall }
}
