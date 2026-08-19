import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import autoprefixer from 'autoprefixer'

import { fileURLToPath, URL } from 'node:url'

export default defineConfig(() => {
  return {
    base: './',
    build: {
      outDir: 'build',
    },
    css: {
      postcss: {
        plugins: [
          autoprefixer({}), // add options if needed
        ],
      },
    },
    plugins: [react()],
    resolve: {
      alias: {
        'src/': `${fileURLToPath(new URL('./src', import.meta.url)).replace(/\\/g, '/')}/`
      },
      extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json', '.scss'],
    },
    server: {
      port: 3004,
      headers: {
        'Cross-Origin-Opener-Policy': 'same-origin-allow-popups'
      },
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:5002',
          changeOrigin: true,
          configure: (proxy) => {
            proxy.on('error', (err) => {
              if (['ECONNRESET', 'ECONNABORTED', 'ECONNREFUSED'].includes(err.code)) return;
              console.warn('[vite-proxy-api-error]', err);
            });
          },
        },
        '/socket.io': {
          target: 'http://127.0.0.1:5002',
          ws: true,
          changeOrigin: true,
          configure: (proxy) => {
            proxy.on('error', (err) => {
              if (['ECONNRESET', 'ECONNABORTED', 'ECONNREFUSED'].includes(err.code)) return;
              console.warn('[vite-proxy-ws-error]', err);
            });
          },
        },
        '/public': {
          target: 'http://127.0.0.1:5002',
          changeOrigin: true,
        },
        '/uploads': {
          target: 'http://127.0.0.1:5002',
          changeOrigin: true,
        },
      },
    },
  }
})
// trigger restart
