import { defineConfig, defineViteConfig } from 'electron-vite'

export default defineConfig({
  main: {
    build: {
      lib: {
        entry: 'index.mjs'
      }
    }
  },
  preload: {
    build: {
      lib: {
        entry: 'src/preload/index.ts'
      }
    }
  },
  renderer: defineViteConfig(() => ({
    root: 'src/renderer',
    resolve: {
      alias: {
      }
    },
    build: {
      rollupOptions: {
        input: {
          creator: 'src/renderer/creator/index.html'
        }
      },
      outDir: 'out/renderer'
    }
  }))
})