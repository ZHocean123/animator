import { defineConfig } from 'tsdown'

export default defineConfig({
  // 不继承 baseConfig 的 entry，单独配置
  // 包特定入口 - 使用单一 index.ts 文件作为入口
  entry: ['src/index.ts', 'src/entry.js', 'src/electron.js'],
  platform: 'node',

  // 包特定输出
  outDir: 'lib',
  // 包特定外部依赖
  external: [
    // 外部依赖
    'electron',
    'react',
    'react-dom',
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
    'ffmpeg-static',
    'fluent-ffmpeg',
    'image-size',
    'bezier-easing',
    'lottie-web',
    '@haiku/*',
    'haiku-*',
    'async',
  ],

  // 路径别名
  alias: {},

  // 包特定构建选项
  dts: true,

  // 保持与现有构建兼容
  format: ['cjs', 'esm'],
  shims: false,

  // 禁用监听模式，避免在构建脚本中出现错误
  watch: false,

  // TypeScript 配置
  tsconfig: './tsconfig.json',

  exports: true,
})
