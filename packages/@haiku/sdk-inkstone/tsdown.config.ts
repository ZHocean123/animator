import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/**/*.(t|j)s'],
  outDir: 'lib',
  format: ['cjs'],
  clean: true,
  dts: true,
  target: 'ES2020',
  external: []
})