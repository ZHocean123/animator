import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/index.ts'],
  outDir: 'lib',
  format: ['esm', 'cjs'],
  clean: true,
  dts: false,
  sourcemap: true,
  exports: true,
  external: [
    'ws',
    'haiku-fs-extra',
    'haiku-formats',
    '@haiku/core',
    '@haiku/sdk-creator',
    'haiku-serialization',
    'gl-matrix',
  ],
})
