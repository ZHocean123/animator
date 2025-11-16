import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/**/*.(t|j)s'],
  outDir: 'lib',
  format: ['cjs'],
  clean: true,
  dts: false,
  target: 'ES2020',
  external: []
})