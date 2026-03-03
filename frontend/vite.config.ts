import { sentryVitePlugin } from "@sentry/vite-plugin";
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// BACKEND_URL is only set in Docker (docker-compose frontend environment).
// Local dev leaves it unset so proxy is skipped and VITE_API_URL is used directly.
const backendUrl = process.env.BACKEND_URL

export default defineConfig({
  plugins: [react(), sentryVitePlugin({
    org: "blagoy",
    project: "javascript-react"
  })],

  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: backendUrl ? {
      '/api': { target: backendUrl, changeOrigin: true },
      '/socket.io': { target: backendUrl, changeOrigin: true, ws: true },
    } : undefined,
  },

  build: {
    sourcemap: true
  }
})
