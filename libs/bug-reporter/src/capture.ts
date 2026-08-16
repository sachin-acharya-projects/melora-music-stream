import { toPng } from "html-to-image"

const MAX_WIDTH = 1600

export interface CapturedScreenshot {
    /** PNG data URL of the downscaled screenshot, used for display + annotation. */
    dataUrl: string
    /** PNG blob of the same image, used for upload. */
    blob: Blob
}

export interface CaptureProgress {
    /** Human-readable description of the current capture stage. */
    message: string
    /** Resources loaded so far, for the progress bar. */
    loaded: number
    /** Total resources to load; 0 means the stage is indeterminate. */
    total: number
}

const FETCH_CONCURRENCY = 6

/**
 * Fetches every <img> on the page into the HTTP cache before html-to-image
 * clones the DOM. Capturing then reuses the cached bytes instead of hitting
 * the network again, and the caller gets real progress while it happens.
 */
async function prefetchImages(onProgress: (loaded: number, total: number) => void): Promise<void> {
    const urls = new Set<string>()
    for (const img of document.images) {
        if (img.src && !img.src.startsWith("data:")) {
            urls.add(img.src)
        }
    }
    const list = [...urls]
    if (list.length === 0) return
    let index = 0
    let loaded = 0
    const worker = async () => {
        while (index < list.length) {
            const url = list[index++]
            try {
                await fetch(url, { cache: "force-cache" })
            } catch {
                // Ignore — html-to-image falls back gracefully for bad resources.
            }
            loaded++
            onProgress(loaded, list.length)
        }
    }
    await Promise.all(
        Array.from({ length: Math.min(FETCH_CONCURRENCY, list.length) }, () => worker()),
    )
}

/**
 * The bug-reporter widget (launch button + dialog) must never appear in the
 * captured screenshot, so every node inside it is excluded from the clone.
 */
function isWidgetNode(node: Node): boolean {
    return node instanceof Element && node.closest("[data-br-widget]") !== null
}

interface FixedSnapshot {
    el: HTMLElement
    top: string
    left: string
    right: string
    bottom: string
    width: string
    height: string
}

/**
 * Fixed-position elements are laid out relative to the viewport, but the
 * capture renders the whole page from the top. While the capture runs, pin
 * every fixed element to its page coordinates (viewport rect + scroll offset)
 * so it appears exactly where the user saw it, then restore afterwards.
 */
function pinFixedElementsToPageCoordinates(): FixedSnapshot[] {
    const snapshots: FixedSnapshot[] = []
    for (const el of document.querySelectorAll<HTMLElement>("*")) {
        if (getComputedStyle(el).position !== "fixed") continue
        const rect = el.getBoundingClientRect()
        snapshots.push({
            el,
            top: el.style.top,
            left: el.style.left,
            right: el.style.right,
            bottom: el.style.bottom,
            width: el.style.width,
            height: el.style.height,
        })
        el.style.top = `${rect.top + window.scrollY}px`
        el.style.left = `${rect.left + window.scrollX}px`
        el.style.right = "auto"
        el.style.bottom = "auto"
        el.style.width = `${rect.width}px`
        el.style.height = `${rect.height}px`
    }
    return snapshots
}

function restoreFixedElements(snapshots: FixedSnapshot[]): void {
    for (const { el, top, left, right, bottom, width, height } of snapshots) {
        el.style.top = top
        el.style.left = left
        el.style.right = right
        el.style.bottom = bottom
        el.style.width = width
        el.style.height = height
    }
}

/**
 * Captures the whole page to a PNG and downscales it so annotated
 * coordinates stay manageable and uploads stay small. Reports progress
 * through {@link CaptureProgress} so the UI can show the user what is
 * happening while the capture runs.
 */
export async function capturePage(
    onProgress?: (progress: CaptureProgress) => void,
): Promise<CapturedScreenshot> {
    onProgress?.({ message: "Loading page images…", loaded: 0, total: 0 })
    await prefetchImages((loaded, total) =>
        onProgress?.({ message: `Loading page images… (${loaded}/${total})`, loaded, total }),
    )
    onProgress?.({ message: "Building screenshot…", loaded: 0, total: 0 })

    const snapshots = pinFixedElementsToPageCoordinates()
    let dataUrl: string
    try {
        dataUrl = await toPng(document.body, {
            pixelRatio: 1,
            skipFonts: true,
            backgroundColor: "#ffffff",
            fetchRequestInit: { cache: "force-cache" },
            filter: (node) => {
                if (isWidgetNode(node)) {
                    return false
                }
                if (node instanceof HTMLImageElement && !node.getAttribute("src")) {
                    return false
                }
                return true
            },
            onImageErrorHandler: () => {},
        })
    } finally {
        restoreFixedElements(snapshots)
    }

    const image = new Image()
    image.src = dataUrl
    await image.decode()

    const scale = Math.min(1, MAX_WIDTH / image.width)
    const width = Math.round(image.width * scale)
    const height = Math.round(image.height * scale)

    const canvas = document.createElement("canvas")
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext("2d")
    if (!context) {
        throw new Error("Could not create a 2D canvas context")
    }
    context.fillStyle = "#ffffff"
    context.fillRect(0, 0, width, height)
    context.drawImage(image, 0, 0, width, height)

    const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/png"),
    )
    if (!blob) {
        throw new Error("Could not encode the screenshot")
    }

    return { dataUrl: canvas.toDataURL("image/png"), blob }
}
