import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
  server: {
    host: true,
    port: 5173,
    allowedHosts: [
      'alert-gator-striking.ngrok-free.app'
    ],
    cors: true,
    proxy: {
      '/auth': {
        target: 'http://localhost:9000',
        changeOrigin: true,
        secure: false,
      },
      '/stores': {
        target: 'http://localhost:9000',
        changeOrigin: true,
        secure: false,
      },
      '/dashboard': {
        target: 'http://localhost:9000',
        changeOrigin: true,
        secure: false,
      }
    }
  }
})
