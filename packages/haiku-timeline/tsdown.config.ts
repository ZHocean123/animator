import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/**/*.(ts|tsx|jsx)'],
  outDir: 'lib',
  format: ['cjs'],
  clean: true,
  dts: false,
  target: 'ES2020',
  external: [
    // '@haiku/core',
    'haiku-common',
    'haiku-formats',
    'haiku-fs-extra',
    'haiku-serialization',
    'haiku-ui-common'
  ],
})