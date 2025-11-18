import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/**/*.(t|j|mj)s', 'src/**/*.(t|j)sx'],
  outDir: 'lib',
  format: ['esm'],
  clean: true,
  dts: false,
  hash: false,
  target: 'ES2022',
  external: [
    // Workspace dependencies - mark as external to avoid bundling
    '@haiku/cli',
    '@haiku/core',
    '@haiku/sdk-client',
    '@haiku/sdk-inkstone',
    'haiku-common',
    'haiku-formats',
    'haiku-fs-extra',
    'haiku-sdk-creator',
    'haiku-serialization'
  ]
})