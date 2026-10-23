import path from "node:path"
import { defineConfig, loadEnv } from "vite"
import react from "@vitejs/plugin-react"

export default defineConfig(({ command, mode }) => {
  // Without it the bundle falls back to "<this host>:8080" (src/lib/api-base.js), which only exists
  // on a developer machine: a production build would deploy fine and then fail every request.
  if (command === "build" && mode === "production") {
    const apiBase = loadEnv(mode, process.cwd(), "VITE_").VITE_API_BASE_URL ?? ""
    if (!/^https?:\/\//.test(apiBase)) throw new Error("VITE_API_BASE_URL must be set to the API's full URL for a production build")
  }
  return {
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "src"),
      },
    },
    build: {
      rollupOptions: {
        output: {
          // Long-lived vendor chunks: an app deploy no longer invalidates React/motion/Firebase in the
          // browser cache, and they download in parallel with the page chunk.
          manualChunks(id) {
            if (!id.includes("node_modules")) return undefined
            if (/[\/]node_modules[\/](react|react-dom|scheduler|react-router|react-router-dom|@remix-run)[\/]/.test(id)) return "vendor-react"
            if (/[\/]node_modules[\/](motion|framer-motion|motion-dom|motion-utils)[\/]/.test(id)) return "vendor-motion"
            if (/[\/]node_modules[\/](firebase|@firebase)[\/]/.test(id)) return "vendor-firebase"
            if (/[\/]node_modules[\/](@reduxjs|redux|react-redux|immer|reselect)[\/]/.test(id)) return "vendor-redux"
            return undefined
          },
        },
      },
    },
    server: {
      host: process.env.VITE_HOST ?? "127.0.0.1",
      port: Number(process.env.VITE_PORT ?? 55000),
      strictPort: false,
    },
  }
})
