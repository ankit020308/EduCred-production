import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  envDir: '../',
  build: {
    outDir: 'dist',
    // Increase warning limit for large chunks (Three.js/nivo are heavy)
    chunkSizeWarningLimit: 2000,
  },
  server: {
    port: 3000,
    strictPort: true,
    // Dev proxy: forwards /api requests to local backend
    // In production, VITE_API_URL is set as a Render env var
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5001',
        changeOrigin: true,
      },
    },
  },
})
