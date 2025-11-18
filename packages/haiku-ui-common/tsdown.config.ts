import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/**/*.(t|j|mj)s', 'src/**/*.(t|j)sx'],
  outDir: 'lib',
  format: ['esm'],
  clean: true,
  dts: false,
  hash: false,
  external: [
    // Workspace dependencies - mark as external to avoid bundling
    'haiku-common',
    'haiku-sdk-creator',
    'haiku-serialization'
  ]
})