import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/index.js'],
  format: ['esm', 'cjs'],
  clean: true,
  dts: true,
  rollupOptions: {
    external: [
      // Dependencies
      '@babel/core',
      '@babel/generator',
      '@babel/parser',
      '@babel/traverse',
      '@haiku/core',
      '@haiku/sdk-client',
      '@haiku/sdk-inkstone',
      'haiku-formats',
      'haiku-common',
      'haiku-fs-extra',
      'haiku-sdk-creator',
      'haiku-ui-common',
      'haiku-vendor-legacy',
      // Node built-ins
      'fs',
      'path',
      'crypto',
      'util',
      'events',
      'stream',
      'os',
      'child_process'
    ],
    output: {
      manualChunks: undefined
    }
  }
})