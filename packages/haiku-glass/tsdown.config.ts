import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/**/*.(j|t)s'],
  outDir: 'lib',
  format: ['esm'],
  clean: true,
  dts: false,
  target: 'ES2022',
  external: [
    // Workspace dependencies - mark as external to avoid bundling
    '@haiku/core',
    'haiku-common',
    'haiku-fs-extra',
    'haiku-serialization',
    'haiku-ui-common',
    'haiku-vendor-legacy',
    // React and related libraries should be external
    'react',
    'react-dom'
  ]
})