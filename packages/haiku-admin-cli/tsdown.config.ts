import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/**/*.(t|j)s'],
  outDir: 'lib',
  format: ['esm'],
  clean: true,
  dts: false,
  target: 'ES2022'
})