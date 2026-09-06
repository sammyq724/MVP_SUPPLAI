import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Served from https://sammyq724.github.io/MVP_SUPPLAI/ — a GitHub Pages
  // project site, so assets resolve under the repo name rather than the root.
  base: process.env.VITE_BASE ?? '/MVP_SUPPLAI/',
  server: { host: '127.0.0.1', port: 5173 },
})
