import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    'process.env.AZURE_MAPS_CLIENT_ID': JSON.stringify(process.env.AZURE_MAPS_CLIENT_ID ?? ''),
    'process.env.AZURE_MAPS_SUBSCRIPTION_KEY': JSON.stringify(process.env.AZURE_MAPS_SUBSCRIPTION_KEY ?? ''),
  },
})
