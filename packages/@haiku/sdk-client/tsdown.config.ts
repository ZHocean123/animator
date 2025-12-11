import { resolve } from 'node:path'

export default {
  entry: ['src/index.ts'],
  outDir: 'lib',
  format: ['esm'],
  clean: true,
  watch: false,
  tsconfig: resolve(__dirname, 'tsconfig.json'),
  dts: true,
  sourcemap: true,
  minify: false,
  exports: true,
}
