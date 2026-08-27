import { registerPlugin } from "@capacitor/core"

export interface ExternalBrowserPlugin {
    open(options: { url: string }): Promise<void>
}

const ExternalBrowser = registerPlugin<ExternalBrowserPlugin>("ExternalBrowser", {
    web: {
        open: async (options: { url: string }) => {
            window.open(options.url, "_blank")
        },
    },
})

export default ExternalBrowser
