import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      // HTTP: REST, SSE, and webhook endpoints → Django
      '/devices': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/webhook': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      // WebSocket → Django Channels (Daphne)
      '/ws': {
        target: 'ws://127.0.0.1:8000',
        ws: true,
        changeOrigin: true,
      },
    },
  },
})
