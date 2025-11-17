import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: [
    'src/**/*.ts'
  ],
  outDir: 'lib',
  clean: true,
  sourcemap: true,
  dts: false,
  format: ['esm'],
  external: []
});