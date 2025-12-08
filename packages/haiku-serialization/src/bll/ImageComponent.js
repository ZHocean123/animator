import path from 'path';
import imageSize from 'image-size';
import BaseModel from './BaseModel.js';

import BYTECODE from '@haiku/core/components/controls/Image/code/main/code';

/**
 * @class ImageComponent
 */
class ImageComponent extends BaseModel {
  constructor (props, opts) {
    super(props, opts);
    this.modpath = MODPATH;
    this.identifier = 'image';
  }

  getTitle () {
    const parts = this.relpath.split(path.sep);
    const last = parts[parts.length - 1];
    const basename = path.basename(last, path.extname(last));
    return basename;
  }

  getAbspath () {
    return path.join(this.project.getFolder(), this.relpath);
  }

  getLocalHref () {
    return `web+haikuroot://${path.normalize(this.relpath)}`;
  }

  queryImageSize (cb) {
    return imageSize(this.getAbspath(), cb);
  }

  getReifiedBytecode () {
    return BYTECODE;
  }

  doesMatchOrHostComponent (other, cb) {
    // Stub. There's not a case where the user is directly editing the image component's definition.
    return cb(null, false);
  }
}

ImageComponent.DEFAULT_OPTIONS = {
  required: {
    project: true,
    relpath: true,
  },
};

BaseModel.extend(ImageComponent);

export default ImageComponent;
