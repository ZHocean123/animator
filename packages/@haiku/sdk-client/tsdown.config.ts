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
    '@haiku/sdk-inkstone',
    // External dependencies that should not be transformed
    'dedent',
    'fs-extra',
    'path',
    'lodash',
    'mkdirp',
    'pascalcase',
    'request',
    'dotenv'
  ]
})