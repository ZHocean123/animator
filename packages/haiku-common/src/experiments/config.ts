import { join, resolve } from 'node:path'
import { readJsonSync } from 'haiku-fs-extra'
import { fileURLToPath } from 'node:url'

/**
 * 从磁盘获取实验配置
 * 路径计算需要考虑打包后的目录结构
 */
export function getExperimentConfig() {
  const currentDir = fileURLToPath(import.meta.url)
  // 打包后文件在 lib/ 目录，需要回退一级到包根目录
  // 原始文件在 src/experiments/，打包后在 lib/
  const packageRoot = resolve(currentDir, '..')
  const experimentsFolder = join(packageRoot, 'config')
  return readJsonSync(join(experimentsFolder, 'experiments.json'))
}
