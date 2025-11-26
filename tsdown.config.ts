import { defineConfig } from 'tsdown';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

// 获取当前文件的目录路径
const __filename = fileURLToPath(import.meta.url);
const __dirname = resolve(__filename, '..');

export default defineConfig({
  skipNodeModulesBundle: true,

  // 入口配置
  entry: {
    // 根级别不需要构建，只是配置基础
    // 如果需要构建根级别，可以在这里添加入口
  },
  
  // 输出配置
  outDir: 'dist',
  format: ['cjs', 'esm'],
  
  // TypeScript 配置
  tsconfig: './tsconfig.base.json',
  
  // 插件配置
  plugins: [
    // 可以添加自定义插件
  ],
  
  // 路径别名
  alias: {
    '@': resolve(__dirname, 'src'),
    '@shared': resolve(__dirname, 'shared'),
    '@packages': resolve(__dirname, 'packages'),
  },
  
  // 外部依赖
  external: [
    'electron',
    'react',
    'react-dom',
  ],
  
  // 开发服务器配置
  server: {
    port: 3000,
    host: 'localhost',
    cors: true,
    hmr: {
      overlay: true,
    },
  },
  
  // 监听配置
  watch: {
    buildDelay: 100,
    clearScreen: false,
  },
  
  // 构建选项
  clean: true,
  dts: true,
  sourcemap: true,
  minify: false, // 生产环境通过环境变量控制
});