import { sentryVitePlugin } from "@sentry/vite-plugin";
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react(), sentryVitePlugin({
    org: "blagoy",
    project: "javascript-react"
  })],

  server: {
    host: '0.0.0.0', // allow Docker to expose the port
    port: 5173,
  },

  build: {
    sourcemap: true
  }
})