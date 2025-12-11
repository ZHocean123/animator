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
    // Using native ESModule functionality instead of ModuleWrapper
    const parts = this.modpath.split(path.sep);
    // @haiku/blah/foo.js -> @haiku/blah/foo
    const nicepath = path.dirname(this.modpath) + path.sep + path.basename(this.modpath, path.extname(this.modpath));
    const partsArray = nicepath.split(path.sep);
    // Underscoreize the path, so @haiku/core/blah/blah -> haiku_core_blah_blah
    return partsArray.map((part) => {
      return part.replace(/\W+/g, '_');
    }).join('_').slice(1); // Remove leading '_'
  }
}

InstalledComponent.DEFAULT_OPTIONS = {
  required: {
    modpath: true,
  },
};

BaseModel.extend(InstalledComponent);

export default InstalledComponent;

// ModuleWrapper has been removed as part of migration to ESModule and electron-vite hot reload support.
