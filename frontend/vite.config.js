import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// In dev, /api calls are proxied to the Express backend.
// In production the backend serves the built frontend, so /api is same-origin.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: { '/api': 'http://localhost:3001' },
  },
})
