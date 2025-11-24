import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export default {
  entry: ['src/**/*.js', 'src/**/*.ts', 'src/**/*.jsx', 'src/**/*.tsx'],
  outDir: 'lib',
  format: ['cjs', 'esm'],
  clean: true,
  watch: false,
  tsconfig: resolve(__dirname, 'tsconfig.json'),
  dts: true,
  sourcemap: true,
  minify: false,
  skipLibCheck: true,
  __dirname
}
