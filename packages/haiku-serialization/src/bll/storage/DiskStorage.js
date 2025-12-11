import path from 'node:path'
import * as fse from 'haiku-fs-extra'
import haikuHomeDir from './../../utils/HaikuHomeDir'

// 尝试从默认导出获取路径
let HOMEDIR_MODEL_STORAGE_PATH = haikuHomeDir.HOMEDIR_MODEL_STORAGE_PATH

if (typeof HOMEDIR_MODEL_STORAGE_PATH === 'undefined') {
  throw new Error('HOMEDIR_MODEL_STORAGE_PATH is undefined and no fallback available')
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

export default DiskStorage
