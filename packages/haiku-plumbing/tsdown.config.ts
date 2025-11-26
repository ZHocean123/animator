import { defineConfig } from 'tsdown';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

// 获取当前文件的目录路径
const __filename = fileURLToPath(import.meta.url);
const __dirname = resolve(__filename, '..');

export default defineConfig({
  // 不继承 baseConfig 的 entry，单独配置
  // 包特定入口 - 使用单一 index.ts 文件作为入口
  entry: ['src/index.ts'],

  // 包特定输出
  outDir: resolve(__dirname, 'lib'),

  // 包特定外部依赖
  external: [
    // 外部依赖
    'electron',
    'react',
    'react-dom',
    // Node.js built-ins
    'fs', 'path', 'os', 'crypto', 'util', 'events', 'stream',
    'child_process', 'url', 'querystring', 'http', 'https', 'net',
    'tls', 'dns', 'zlib',
    // External dependencies
    'nodegit', 'raven', 'electron', 'chokidar', 'tmp', 'ws',
    'yargs', 'rollup', 'semver', 'simple-git', 'raven', 'chalk',
    '@haiku/*', 'haiku-*',
    'remote', 'electron-proxy-agent',
  ],
  
  // 路径别名
  alias: {
    '@plumbing': resolve(__dirname, 'src'),
  },

  // 包特定构建选项
  dts: true,

  // 保持与现有构建兼容
  format: ['cjs', 'esm'],
  shims: true,

  // 禁用监听模式，避免在构建脚本中出现错误
  watch: false,

  // 清理文件名，确保生成 index.cjs 而非分块文件
  clean: true,

  // TypeScript 配置
  tsconfig: './tsconfig.json',
});
