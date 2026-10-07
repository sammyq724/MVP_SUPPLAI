import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Where the HQPSPLBAI backend is listening in dev. The proxy is what makes
// live mode same-origin, which matters for two reasons: the backend sets no
// CORS headers, and the shared password travels in a POST body that a
// cross-origin preflight would complicate for nothing.
const API_TARGET = process.env.VITE_API_TARGET ?? 'http://127.0.0.1:3000'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Mock mode is served from https://sammyq724.github.io/MVP_SUPPLAI/ — a
  // GitHub Pages project site, so assets resolve under the repo name rather
  // than the root. The live build overrides this to /app/, where the Node app
  // serves it (see HQPSPLBAI webapp/server.js).
  base: process.env.VITE_BASE ?? '/MVP_SUPPLAI/',
  server: {
    host: '127.0.0.1',
    port: 5173,
    proxy: {
      '/api': { target: API_TARGET, changeOrigin: true },
      // The stored image/PDF itself. A GET, and the only unauthenticated
      // endpoint on the backend — see its comment in server.js.
      '/attachment': { target: API_TARGET, changeOrigin: true },
    },
  },
})
