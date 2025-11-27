const path = require('node:path')
const fse = require('haiku-fs-extra')

const Home = require('./../../utils/HaikuHomeDir').default
const { HOMEDIR_MODEL_STORAGE_PATH } = Home

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
