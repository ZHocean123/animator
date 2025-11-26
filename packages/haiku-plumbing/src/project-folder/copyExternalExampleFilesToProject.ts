import * as path from 'node:path'
import * as fse from 'fs-extra'
import { getResourcesPath } from './getResourcesPath'

function getTemplateDesignFilesPath() {
  if (process.env.NODE_ENV === 'production') {
    return path.join(getResourcesPath(), 'template-design-files')
  }

  return path.join(__dirname, '../../', 'bins')
}

export function copyAssetFile(projectPath: string, assetPath: string, bin: string) {
  try {
    const assetDir = path.join(projectPath, assetPath)

    if (!fse.existsSync(assetDir)) {
      fse.copySync(bin, assetDir)
    }
  }
  catch (error) {
    return error
  }
}

export function copyDefaultSketchFile(projectPath: string, assetPath: string) {
  return copyAssetFile(projectPath, assetPath, path.join(getTemplateDesignFilesPath(), 'sketch-42.sketch'))
}

export function copyDefaultIllustratorFile(projectPath: string, assetPath: string) {
  return copyAssetFile(projectPath, assetPath, path.join(getTemplateDesignFilesPath(), 'illustrator-default.ai'))
}
