import { defineConfig } from 'tsdown';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import baseConfig from '../../tsdown.config.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  ...baseConfig,
  
  // 包特定入口
  entry: {
    index: resolve(__dirname, 'src/react/index.jsx'),
    electron: resolve(__dirname, 'src/electron.js'),
    // 可以根据需要添加其他入口点
  },
  
  // 包特定输出
  outDir: resolve(__dirname, 'lib'),
  
  // 包特定外部依赖
  external: [
    ...baseConfig.external,
    'electron',
    'color',
    'qs',
    'radium',
    'raven-js',
    'react-transition-group',
  ],
  
  // 包特定别名
  alias: {
    ...baseConfig.alias,
    '@glass': resolve(__dirname, 'src'),
    '@common': resolve(__dirname, '../haiku-common/src'),
    '@ui-common': resolve(__dirname, '../haiku-ui-common/src'),
  },
  
  // 包特定插件
  plugins: [
    // 可以添加包特定的插件
  ],
  
  // 包特定构建选项
  dts: true,
  
  // 保持与现有构建兼容
  format: ['cjs', 'esm'],
  
  // 支持 JSX
  jsxFactory: 'React.createElement',
  jsxFragment: 'React.Fragment',
  jsx: true,
  
  // 禁用 watch 模式
  watch: false,
});
