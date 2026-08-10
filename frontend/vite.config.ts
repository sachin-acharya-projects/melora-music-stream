import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react-swc"
import path from "node:path"
import { defineConfig } from "vite"
import { VitePWA } from "vite-plugin-pwa"

// https://vite.dev/config/
export default defineConfig({
    plugins: [
        react(),
        tailwindcss(),
        VitePWA({
            registerType: "autoUpdate",
            workbox: {
                navigateFallback: "index.html",
                navigateFallbackDenylist: [/^\/api\//],
            },
            includeAssets: ["favicon.png", "pwa-192x192.png", "pwa-512x512.png"],
            manifest: {
                name: "Melora - YouTube Music Downloader",
                short_name: "Melora",
                description: "Premium YouTube Music downloader and player",
                theme_color: "#ef4444",
                icons: [
                    {
                        src: "pwa-192x192.png",
                        sizes: "192x192",
                        type: "image/png",
                    },
                    {
                        src: "pwa-512x512.png",
                        sizes: "512x512",
                        type: "image/png",
                    },
                    {
                        src: "pwa-512x512.png",
                        sizes: "512x512",
                        type: "image/png",
                        purpose: "any maskable",
                    },
                ],
            },
        }),
    ],
    resolve: {
        alias: {
            "@": path.resolve("./src"),
        },
    },
    server: {
        proxy: {
            "/media": "http://localhost:8000",
        },
    },
})
