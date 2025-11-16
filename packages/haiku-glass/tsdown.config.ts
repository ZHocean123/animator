import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/**/*.ts', 'src/**/*.tsx'],
  outDir: 'lib',
  format: ['cjs'],
  clean: true,
  dts: true,
  target: 'ES2020',
  external: [
    // Workspace dependencies - mark as external to avoid bundling
    '@haiku/core',
    'haiku-common',
    'haiku-fs-extra',
    'haiku-serialization',
    'haiku-ui-common',
    'haiku-vendor-legacy'
  ]
})