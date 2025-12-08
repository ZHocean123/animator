import path from 'path';
import BaseModel from './BaseModel.js';

/**
 * @class InstalledComponent
 */
class InstalledComponent extends BaseModel {
  getTitle () {
    const parts = this.modpath.split(path.sep);

    if (parts[0] === '@haiku' && parts[1] === 'core' && parts[2] === 'components') {
      // @haiku/core/components/controls/HTML, etc
      return parts[4];
    }

    return parts.join('_');
  }

  getReifiedBytecode () {
    return null;
  }

  doesMatchOrHostComponent (other, cb) {
    return cb(null, false);
  }

  getIdentifier () {
    // This identifier is going to be something like HaikuLine or MyOrg_MyName
    return ModuleWrapper.modulePathToIdentifierName(this.modpath);
  }
}

InstalledComponent.DEFAULT_OPTIONS = {
  required: {
    modpath: true,
  },
};

BaseModel.extend(InstalledComponent);

export default InstalledComponent;

import ModuleWrapper from './ModuleWrapper.js';
