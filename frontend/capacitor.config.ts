import type { CapacitorConfig } from "@capacitor/cli"

const config: CapacitorConfig = {
    appId: "com.melora.app",
    appName: "Melora",
    webDir: "dist",
    server: {
        androidScheme: "https",
    },
    plugins: {
        StatusBar: {
            style: "dark",
            backgroundColor: "#ef4444",
        },
    },
}

export default config
