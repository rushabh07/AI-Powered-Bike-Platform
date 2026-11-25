import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const backendTarget = (env.VITE_BACKEND_URI || 'http://127.0.0.1:5000').replace(/\/+$/, '')

  return {
    plugins: [react(), tailwindcss()],
    server: {
      // Preferred dev port. Deliberately NOT strictPort: if 5173 is busy,
      // Vite falls back to 5174 instead of failing to start. The API's CORS
      // allows any loopback origin, so the app still works on the fallback.
      port: 5173,
      proxy: {
        '/api': {
          target: backendTarget,
          changeOrigin: true,
          secure: true,
        },
        '/uploads': {
          target: backendTarget,
          changeOrigin: true,
          secure: true,
        },
      },
    },
  }
})
