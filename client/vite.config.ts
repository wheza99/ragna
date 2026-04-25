import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import fs from 'fs'

function spaFallback(): Plugin {
  return {
    name: 'spa-fallback',
    configureServer(server) {
      return () => {
        server.middlewares.use((req, res, next) => {
          const url = req.url || '/'
          if (url.startsWith('/@') || url.startsWith('/assets/') || url.match(/\.[a-zA-Z0-9]+$/)) {
            return next()
          }
          const html = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf-8')
          server.transformIndexHtml(url, html).then((transformed) => {
            res.setHeader('Content-Type', 'text/html')
            res.end(transformed)
          }).catch(next)
        })
      }
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), spaFallback()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/api/': 'http://localhost:3000',
    },
  },
})
