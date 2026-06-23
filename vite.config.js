import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
  },
  plugins: [tailwindcss(), react()],
  server: {
    port: 5177,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3003',
        changeOrigin: true,
      },
    },
  },
  preview: {
    port: 4177,
    strictPort: true,
  },
  build: {
    sourcemap: false,
  },
})
