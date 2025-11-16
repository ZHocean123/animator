import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/**/*.(t|j)s'],
  outDir: 'lib',
  format: ['cjs'],
  clean: true,
  dts: false,
  external: [
    // Workspace dependencies - mark as external to avoid bundling
    '@haiku/core',
    'haiku-common',
    'haiku-sdk-creator',
    'haiku-serialization'
  ]
})