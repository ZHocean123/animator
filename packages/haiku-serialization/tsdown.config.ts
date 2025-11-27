import { resolve } from 'node:path'
import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/index.ts'],
  outDir: 'lib',
  format: ['esm', 'cjs'],
  clean: true,
  dts: true,
  exports: true,
  tsconfig: resolve(__dirname, 'tsconfig.json'),
  external: [
    'haiku-formats',
  ],
})
