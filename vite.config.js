import { defineConfig } from 'vite'

// TSUKI sound engine — static SPA, deploy target: tsuki-sound.pages.dev
export default defineConfig({
  base: './',
  server: { open: true },
  build: { target: 'es2020' },
})
