const path = require('node:path')
const fse = require('haiku-fs-extra')

const haikuHomeDir = require('./../../utils/HaikuHomeDir')

// 检查是否有默认导出
const haikuHomeDirDefault = haikuHomeDir.default || haikuHomeDir

// 尝试从默认导出获取路径
let HOMEDIR_MODEL_STORAGE_PATH = haikuHomeDirDefault.HOMEDIR_MODEL_STORAGE_PATH

if (typeof HOMEDIR_MODEL_STORAGE_PATH === 'undefined') {
  // 尝试直接从类获取
  const { HaikuHomeDir } = haikuHomeDir
  const fallbackPath = HaikuHomeDir.HOMEDIR_MODEL_STORAGE_PATH

  if (fallbackPath) {
    HOMEDIR_MODEL_STORAGE_PATH = fallbackPath
  }
  else {
    throw new Error('HOMEDIR_MODEL_STORAGE_PATH is undefined and no fallback available')
  }
}

fse.mkdirpSync(HOMEDIR_MODEL_STORAGE_PATH)

class DiskStorage {
  store(key, pojo) {
    fse.writeJsonSync(
      path.join(HOMEDIR_MODEL_STORAGE_PATH, `${key}.json`),
      pojo,
      { spaces: 2 },
    )
    return pojo
  }

  unstore(key) {
    return fse.readJsonSync(
      path.join(HOMEDIR_MODEL_STORAGE_PATH, `${key}.json`),
    )
  }
}

module.exports = DiskStorage
