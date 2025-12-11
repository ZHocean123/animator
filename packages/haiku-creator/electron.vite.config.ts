import { resolve } from 'node:path'
import process from 'node:process'
import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'

// 确保 __dirname 在 ES 模块中可用
const __dirname = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin({ })],
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
        '@common': resolve(__dirname, '../haiku-common/src'),
        '@plumbing': resolve(__dirname, '../haiku-plumbing/src'),
        '@serialization': resolve(__dirname, '../haiku-serialization/src'),
        '@creator': resolve(__dirname, 'src'),
      },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin({ })],
  },
  renderer: {
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
        '@common': resolve(__dirname, '../haiku-common/src'),
        '@plumbing': resolve(__dirname, '../haiku-plumbing/src'),
        '@serialization': resolve(__dirname, '../haiku-serialization/src'),
        '@creator': resolve(__dirname, 'src'),
      },
    },
    plugins: [
      react({ include: [/\.jsx?$/, /\.tsx?$/] }),
      {
        name: 'native-modules',
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            if (req.url?.endsWith('.node')) {
              res.setHeader('Content-Type', 'application/octet-stream')
            }
            next()
          })
        },
      },
    ],
    build: {
      rollupOptions: {
        external: [
          // Node.js 内置模块 (node: 前缀)
          'node:path',
          'node:fs',
          'node:url',
          'node:os',
          'node:module',
          'node:events',
          'node:child_process',
          'node:https',
          'node:http',
          'node:net',
          'node:zlib',
          'node:stream',
          'node:buffer',
          'node:util',
          'node:process',
          'node:stream/web',
          // Node.js 内置模块 (无前缀)
          'path',
          'fs',
          'child_process',
          'os',
          'crypto',
          'http',
          'https',
          'stream',
          'zlib',
          'net',
          'tls',
          'module',
          'buffer',
          'util',
          'process',
          'constants',
          'worker_threads',
          // Electron 特定模块
          'electron',
          'session',
          'remote',
          'fsevents',
          '/^haiku-/',
          '/^@haiku\\//',
          // 处理 .node 文件
          /\.node$/,
        ],
      },
    },
    optimizeDeps: {
      // Monaco Editor 需要特殊处理
      exclude: ['monaco-editor'],
      include: [
        'react',
        'react-dom',
        'haiku-common',
        'haiku-serialization',
        'haiku-plumbing',
        'lodash',
        'uuid',
        'color',
        'qs',
        'radium',
        'react-draggable',
        'estree-walker',
      ],
    },
    define: {
      // 为 Monaco Editor 定义全局变量
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
      'global': 'globalThis',
      // 应用环境变量
      'import.meta.env.VITE_APP_NAME': JSON.stringify(process.env.VITE_APP_NAME || 'Haiku'),
      'import.meta.env.VITE_APP_VERSION': JSON.stringify(process.env.VITE_APP_VERSION || '5.1.2'),
      'import.meta.env.VITE_ENABLE_ANALYTICS': JSON.stringify(process.env.VITE_ENABLE_ANALYTICS !== 'false'),
      'import.meta.env.VITE_ENABLE_ERROR_REPORTING': JSON.stringify(process.env.VITE_ENABLE_ERROR_REPORTING !== 'false'),
      'import.meta.env.VITE_ENABLE_DEBUG_MODE': JSON.stringify(process.env.VITE_ENABLE_DEBUG_MODE === 'true'),
    },
    // 确保静态资源正确处理
    publicDir: resolve(__dirname, 'public'),
    // 开发服务器配置
    server: {
      port: 3000,
      strictPort: true,
    },
    // 预览服务器配置
    preview: {
      port: 4173,
      strictPort: true,
    },
  },
})
