import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/index.ts', 'src/electron/TopMenu.ts'],
  outDir: 'lib',
  format: ['cjs', 'esm'],
  skipNodeModulesBundle: true,
  platform: 'node',
  clean: true,
  watch: false,
  dts: true,
  sourcemap: true,
  exports: true,
  minify: false,
  external: [
    'electron',
  ],
})
