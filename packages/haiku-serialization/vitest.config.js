import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['test/**/**/*.test.js'],
    exclude: ['node_modules', 'dist', 'lib'],
    testTimeout: 30000,
    hookTimeout: 30000,
    deps: {
      inline: [
        // 处理 ESModule 依赖
        '@haiku/core',
        'haiku-fs-extra',
        'haiku-common',
        'haiku-testing'
      ]
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json'],
  },
  optimizeDeps: {
    include: [
      '@haiku/core',
      'haiku-fs-extra',
      'haiku-common',
      'haiku-testing',
      'crypto-js',
      'lodash'
    ],
    exclude: [
      // 排除有问题的模块
    ]
  },
  ssr: {
    noExternal: [
      // 确保这些模块在 SSR 环境中可用
      '@haiku/core',
      'haiku-common'
    ]
  }
});