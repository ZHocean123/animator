import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default {
  entry: ['src/index.ts'],
  outDir: 'lib',
  format: ['cjs', 'esm'],
  clean: true,
  watch: false,
  tsconfig: resolve(__dirname, 'tsconfig.json'),
  dts: true,
  sourcemap: true,
  exports: true,
  minify: false,
  // 确保生成单一的入口文件
  rollupOptions: {
    output: {
      manualChunks: undefined,
    },
  },
};
