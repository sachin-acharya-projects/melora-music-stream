import type { CapacitorConfig } from "@capacitor/cli"

const config: CapacitorConfig = {
    appId: "com.melora.app",
    appName: "Melora",
    webDir: "dist",
    server: {
        // Load the live site so the WebView shares the API's origin. This makes
        // Google OAuth work in-app: the consent screen renders inside the
        // WebView and the callback redirects back to the same origin, where the
        // app reads the tokens. (A bundled copy would run at https://localhost
        // and the callback would never return to the app.)
        url: "https://melora.sachinacharya.name.np",
        androidScheme: "https",
        cleartext: false,
    },
    plugins: {
        StatusBar: {
            style: "dark",
            backgroundColor: "#ef4444",
        },
    },
}

export default config
