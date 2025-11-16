import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/**/*.ts', 'src/**/*.tsx'],
  outDir: 'lib',
  format: ['cjs'],
  clean: true,
  dts: false,
  external: [
    // Workspace dependencies - mark as external to avoid bundling
    'haiku-common',
    'haiku-sdk-creator',
    'haiku-serialization'
  ]
})