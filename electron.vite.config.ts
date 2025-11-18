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
        'haiku-sdk-creator/lib/bll/Error.js': 'packages/haiku-sdk-creator/src/bll/Error.ts',
        'haiku-common/lib': 'packages/haiku-common/src',
        'haiku-common/src': 'packages/haiku-common/src',
        'haiku-common/src/environments.js': 'packages/haiku-common/src/environments/index.ts',
        'haiku-common/src/environments/index.js': 'packages/haiku-common/src/environments/index.ts',
        'haiku-serialization/src': 'packages/haiku-serialization/src',
        'haiku-ui-common/src': 'packages/haiku-ui-common/src',
        'haiku-ui-common/lib': 'packages/haiku-ui-common/src'
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