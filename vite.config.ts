import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/fluentswap-demo-frontend/',
  build: {
    // Ensure all assets are copied to dist
    assetsDir: 'assets',
    // Copy public directory contents to dist
    copyPublicDir: true,
  },
  // Ensure proper handling of JSON files
  assetsInclude: ['**/*.json'],
})


