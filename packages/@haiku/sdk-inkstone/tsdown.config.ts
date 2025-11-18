import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/**/*.(t|j|mj)s', 'src/**/*.(t|j)sx'],
  outDir: 'lib',
  format: ['esm'],
  clean: true,
  dts: true,
  hash: false,
  target: 'ES2022',
  external: []
})