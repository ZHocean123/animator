import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { readJsonSync } from 'fs-extra'

/**
 * 获取当前模块所在目录
 * 兼容 CommonJS 和 ESM
 */
function getCurrentDir(): string {
  // 在 CommonJS 中 __dirname 已定义
  if (typeof __dirname !== 'undefined') {
    return __dirname
  }
  // 在 ESM 中使用 import.meta.url
  return dirname(fileURLToPath(import.meta.url))
}

/**
 * 从磁盘获取实验配置
 * 路径计算需要考虑打包后的目录结构
 */
export function getExperimentConfig() {
  const currentDir = getCurrentDir()
  // 打包后文件在 lib/ 目录，需要回退一级到包根目录
  // 原始文件在 src/experiments/，打包后在 lib/
  const packageRoot = resolve(currentDir, '..')
  const experimentsFolder = join(packageRoot, 'config')
  return readJsonSync(join(experimentsFolder, 'experiments.json'))
}
