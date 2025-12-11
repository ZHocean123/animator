import { resolve } from 'node:path'
import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'electron-vite'

// 确保 __dirname 在 ES 模块中可用
const __dirname = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  main: {
    plugins: [],
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
    plugins: [],
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
    ],
    // 确保静态资源正确处理
    publicDir: resolve(__dirname, 'public'),
  },
})
