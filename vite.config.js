import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,                 // allow external access (needed for ngrok)
    port: 5173,
    allowedHosts: [
      '.ngrok-free.app',        // allow any *.ngrok-free.app URL
    ],
    proxy: {
      // dev: forward /api/* to your backend (no CORS errors in the browser)
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  preview: {
    host: true,
    port: 5173,
    allowedHosts: [
      '.ngrok-free.app',
    ],
  },
})
