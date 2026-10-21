import path from "node:path"
import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"

export default defineConfig({
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
})
