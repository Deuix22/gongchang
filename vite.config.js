import { defineConfig } from 'vite'
import uni from '@dcloudio/vite-plugin-uni'
// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    uni(),
  ],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: false,
    open: false,
    proxy: {
      '/delicloud-api': {
        target: 'https://v2-api.delicloud.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/delicloud-api/, '')
      }
    }
  }
})
