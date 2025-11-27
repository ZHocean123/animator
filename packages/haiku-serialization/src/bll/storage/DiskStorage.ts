import path from 'node:path'
import fse from 'fs-extra'
import Home from '../../utils/HaikuHomeDir'

fse.mkdirpSync(Home.HOMEDIR_MODEL_STORAGE_PATH)

export default class DiskStorage {
  store(key: string, pojo: any) {
    fse.writeJsonSync(path.join(Home.HOMEDIR_MODEL_STORAGE_PATH, `${key}.json`), pojo, { spaces: 2 })
    return pojo
  }

  unstore(key: string) {
    return fse.readJsonSync(path.join(Home.HOMEDIR_MODEL_STORAGE_PATH, `${key}.json`))
  }
}

export { DiskStorage }
