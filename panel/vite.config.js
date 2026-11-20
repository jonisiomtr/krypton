import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: true
  },
  server: {
    port: 5000,
    proxy: {
      '/api': {
        target: 'http://localhost:4177',
        changeOrigin: true,
        rewrite: (path) => path
      },
      '/uploads': {
        target: 'http://localhost:4177',
        changeOrigin: true,
        rewrite: (path) => path
      },
      '/site': {
        target: 'http://localhost:4177',
        changeOrigin: true,
        rewrite: (path) => path,
        configure: (proxy, options) => {
          proxy.on('error', (err, req, res) => {
            console.log('proxy error', err);
          });
          proxy.on('proxyReq', (proxyReq, req, res) => {
            console.log('Sending request to the target:', req.method, req.url);
          });
          proxy.on('proxyRes', (proxyRes, req, res) => {
            console.log('Received response from the target:', proxyRes.statusCode, req.url);
          });
        }
      }
    }
  }
})
