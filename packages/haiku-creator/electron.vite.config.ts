import { resolve } from 'node:path'
import process from 'node:process'
import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'

// 确保 __dirname 在 ES 模块中可用
const __dirname = fileURLToPath(new URL('.', import.meta.url))

// 环境变量
const isDevelopment = process.env.NODE_ENV === 'development'
const isProduction = process.env.NODE_ENV === 'production'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin({
      // 排除 Node.js 内置模块，避免 generate createRequire
      exclude: [
        'node:*',
        'fs',
        'path',
        'url',
        'util',
        'events',
        'http',
        'https',
        'os',
        'crypto',
        'stream',
        'child_process',
        'querystring',
        'net',
        'tls',
        'dns',
        'zlib',
        'yargs',
      ],
    })],
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/main/index.ts'),
        },
      },
      minify: isProduction ? 'esbuild' : false,
      sourcemap: isDevelopment,
      target: 'node18',
    },
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
    plugins: [externalizeDepsPlugin({
      // 排除 Node.js 内置模块，避免 generate createRequire
      exclude: [
        'node:*',
        'fs',
        'path',
        'url',
        'util',
        'events',
        'http',
        'https',
        'os',
        'crypto',
        'stream',
        'child_process',
        'querystring',
        'net',
        'tls',
        'dns',
        'zlib',
        'yargs',
      ],
    })],
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/preload/index.ts'),
        },
      },
      minify: isProduction ? 'esbuild' : false,
      sourcemap: isDevelopment,
      target: 'node18',
    },
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
      react({
        // 移除emotion配置，因为项目中没有使用
      }),
    ],
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/renderer/index.html'),
        },
        output: {
          // 代码分割配置
          manualChunks: {
            // 将React相关库打包在一起
            'react-vendor': ['react', 'react-dom', 'react-draggable'],
            // 将Monaco Editor单独打包
            'monaco-editor': ['monaco-editor'],
            // 将UI相关库打包在一起
            'ui-vendor': ['radium', 'react-color', 'react-popover'],
            // 将工具库打包在一起
            'utils-vendor': ['lodash', 'uuid', 'color', 'qs'],
            // 将Haiku内部模块打包在一起
            'haiku-modules': ['haiku-common', 'haiku-serialization', 'haiku-plumbing', 'haiku-ui-common', 'react-syntax-highlighter'],
          },
        },
      },
      minify: isProduction ? 'esbuild' : false,
      sourcemap: isDevelopment ? 'inline' : false,
      target: 'es2020',
      // 启用CSS代码分割
      cssCodeSplit: true,
      // 优化资源大小
      assetsInlineLimit: 4096,
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
