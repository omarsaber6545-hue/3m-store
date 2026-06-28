import { defineConfig } from 'vite'

export default defineConfig({
  root: '.',
  publicDir: 'assets',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: '/index.html',
    },
  },
  server: {
    port: 3000,
    open: false,
  },
  resolve: {
    alias: {
      '@': '/src',
      '@sections': '/src/sections',
      '@core': '/src/core',
      '@styles': '/src/styles',
    },
  },
})
