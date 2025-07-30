import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Proxy API calls during development to the backend server running on port 5000.
    proxy: {
      '/api': 'http://localhost:5000',
    },
  },
})
