import { defineConfig } from "vite"

export default defineConfig({
    build: {
        lib: {
            entry: "src/index.ts",
            name: "BugReporter",
            fileName: "bug-reporter",
            formats: ["es"],
        },
        rollupOptions: {
            external: ["react", "react-dom", "react/jsx-runtime"],
        },
    },
})
