import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Preferred dev port. Deliberately NOT strictPort: if 5173 is busy,
    // Vite falls back to 5174 instead of failing to start. The API's CORS
    // allows any loopback origin, so the app still works on the fallback.
    port: 5173,
  },
})
