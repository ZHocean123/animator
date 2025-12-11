import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export default {
  entry: ['src/index.ts'],
  outDir: 'lib',
  format: ['cjs', 'esm'],
  clean: true,
  watch: false,
  tsconfig: resolve(__dirname, 'tsconfig.json'),
  dts: true,
  sourcemap: true,
  minify: false,
  exports: true,
  external: [
    'electron',
    'react',
    'react-dom',
    'haiku-common',
  ],
}
