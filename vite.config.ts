import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import electron from 'vite-plugin-electron/simple'
import { resolve } from 'path'

export default defineConfig({
  plugins: [
    vue(),
    electron({
      main: {
        entry: 'src/main/main.ts',
      },
      preload: {
        input: 'src/preload/preload.ts',
      },
    }),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src/renderer')
    }
  },
  base: './',
  build: {
    outDir: 'dist'
  }
})