import { defineConfig } from 'tsdown';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import baseConfig from '../../../tsdown.config.ts';

// 获取当前文件的目录路径
const __filename = fileURLToPath(import.meta.url);
const __dirname = resolve(__filename, '..');

export default defineConfig({
  ...baseConfig,
  
  // 包特定入口
  entry: ['src/**/*.js', 'src/**/*.ts', 'src/**/*.jsx', 'src/**/*.tsx'],
  
  // 包特定输出
  outDir: resolve(__dirname, 'lib'),
  
  // 包特定外部依赖
  external: [
    ...baseConfig.external,
    '@angular/core',
    'react',
    'react-dom',
    'react-router-dom',
    'rxjs',
  ],
  
  // 包特定别名
  alias: {
    ...baseConfig.alias,
    '@core': resolve(__dirname, 'src'),
  },
  
  // 包特定插件
  plugins: [
    // 可以添加包特定的插件
  ],
  
  // 包特定构建选项
  dts: true,
  
  // 保持与现有构建兼容
  format: ['cjs', 'esm'],
  
  // 禁用监听模式，避免在构建脚本中出现错误
  watch: false,
});
