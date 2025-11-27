import { resolve } from 'node:path'
import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/index.js'],
  outDir: 'lib',
  format: ['esm', 'cjs'],
  clean: true,
  dts: true,
  tsconfig: resolve(__dirname, 'tsconfig.json'),
})
