import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    headers: {
      // Helps Google Identity Services / FedCM communicate with popups (reduces COOP postMessage warnings in dev)
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
    },
  },
})
