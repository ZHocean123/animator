import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/**/*.(t|j)s'],
  outDir: 'lib',
  format: ['esm'],
  clean: true,
  dts: true,
  target: 'ES2022',
  external: [
    // Workspace dependencies - mark as external to avoid bundling
    '@haiku/sdk-client',
    '@haiku/sdk-inkstone',
    'haiku-common',
    'haiku-serialization'
  ]
})