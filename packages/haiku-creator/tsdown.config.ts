import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/**/*.ts', 'src/**/*.tsx'],
  outDir: 'lib',
  format: ['cjs'],
  clean: true,
  dts: false,
  target: 'ES2020',
  external: [
    // Workspace dependencies - mark as external to avoid bundling
    '@haiku/core',
    'haiku-common',
    'haiku-glass',
    'haiku-sdk-creator',
    'haiku-serialization',
    'haiku-timeline',
    'haiku-ui-common'
  ]
})