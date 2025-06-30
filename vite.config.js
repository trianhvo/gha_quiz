import { defineConfig } from 'vite'

export default defineConfig({
  base: '/gha_quiz/',
  root: '.',
  server: {
    host: true,
    port: 5173,
    open: true
  },
  build: {
    outDir: 'dist'
  }
})