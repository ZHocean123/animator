import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/index.ts'],
  outDir: 'lib',
  format: ['esm', 'cjs'],
  clean: true,
  dts: false,
  exports: true,
  external: [
    'haiku-formats',
    '@haiku/core',
  ],
})
