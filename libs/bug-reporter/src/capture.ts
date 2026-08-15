import { toPng } from "html-to-image"

const MAX_WIDTH = 1600

export interface CapturedScreenshot {
    /** PNG data URL of the downscaled screenshot, used for display + annotation. */
    dataUrl: string
    /** PNG blob of the same image, used for upload. */
    blob: Blob
}

/**
 * Captures the visible page to a PNG. The full-DOM raster is taken at a
 * higher pixel ratio then downscaled so annotated coordinates stay manageable
 * and uploads stay small.
 */
export async function capturePage(): Promise<CapturedScreenshot> {
    const dataUrl = await toPng(document.body, {
        pixelRatio: 1,
        skipFonts: true,
        backgroundColor: "#ffffff",
        filter: (node) => {
            if (node instanceof HTMLImageElement && !node.getAttribute("src")) {
                return false
            }
            return true
        },
        onImageErrorHandler: () => {},
    })

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
