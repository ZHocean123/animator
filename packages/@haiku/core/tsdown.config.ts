import { defineConfig } from 'tsdown';

export default defineConfig({
    entry: ['src/**/*.(t|j|mj)s', 'src/**/*.(t|j)sx'],
  outDir: 'lib',
  clean: true,
  sourcemap: true,
  dts: false,
  hash: false,
  format: ['esm'],
  external: []
});