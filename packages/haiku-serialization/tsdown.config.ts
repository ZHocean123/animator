import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/index.ts'],
  outDir: 'lib',
  format: ['esm', 'cjs'],
  clean: true,
  dts: false,
  sourcemap: true,
  exports: true,
  skipNodeModulesBundle: true,
  external: [
    'haiku-formats',
    '@haiku/core',
    '@haiku/sdk-creator',
    'haiku-serialization',
  ],
})
