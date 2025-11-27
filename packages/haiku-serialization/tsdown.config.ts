import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/index.ts'],
  outDir: 'lib',
  format: ['esm', 'cjs'],
  clean: true,
  dts: true,
  exports: true,
  external: [
    'haiku-formats',
  ],
})
