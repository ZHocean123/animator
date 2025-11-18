import fse from 'haiku-fs-extra';
import path from 'path';

import { HOMEDIR_MODEL_STORAGE_PATH } from './../../utils/HaikuHomeDir.js';

fse.mkdirpSync(HOMEDIR_MODEL_STORAGE_PATH);

class DiskStorage {
  store (key, pojo) {
    fse.writeJsonSync(
      path.join(HOMEDIR_MODEL_STORAGE_PATH, `${key}.json`),
      pojo,
      {spaces: 2},
    );
    return pojo;
  }

  unstore (key) {
    return fse.readJsonSync(
      path.join(HOMEDIR_MODEL_STORAGE_PATH, `${key}.json`),
    );
  }
}

export default DiskStorage;
