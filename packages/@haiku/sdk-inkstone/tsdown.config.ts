import { defineConfig } from 'tsdown';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

// 获取当前文件的目录路径
const __filename = fileURLToPath(import.meta.url);
const __dirname = resolve(__filename, '..');

export default defineConfig({
  // 使用单一入口点
  entry: ['src/index.ts'],

  // 包特定输出
  outDir: resolve(__dirname, 'lib'),
  
  // 包特定外部依赖
  external: [
    // Node.js built-ins
    'fs',
    'path',
    'os',
    'crypto',
    'util',
    'events',
    'stream',
    'child_process',
    'url',
    'querystring',
    'http',
    'https',
    'net',
    'tls',
    'dns',
    'zlib',
    // External dependencies
    '@haiku/*',
    'haiku-*'
  ],
  
  // 包特定别名
  alias: {
    '@sdk-inkstone': resolve(__dirname, 'src'),
  },
  
  // 包特定构建选项
  dts: true,
  
  // 保持与现有构建兼容
  format: ['cjs', 'esm'],
  
  // 禁用监听模式，避免在构建脚本中出现错误
  watch: false,
});
