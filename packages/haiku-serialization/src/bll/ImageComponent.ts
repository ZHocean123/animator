import path from 'node:path'
import imageSize from 'image-size'
import BaseModel from './BaseModel'

const MODPATH = '@haiku/core/components/controls/Image/code/main/code'
const BYTECODE = require(MODPATH)

export default class ImageComponent extends (BaseModel as any) {
  modpath = MODPATH
  identifier = 'image'

  getTitle() {
    const parts = this.relpath.split(path.sep)
    const last = parts[parts.length - 1]
    const basename = path.basename(last, path.extname(last))
    return basename
  }

  getAbspath() { return path.join(this.project.getFolder(), this.relpath) }
  getLocalHref() { return `web+haikuroot://${path.normalize(this.relpath)}` }
  queryImageSize(cb: (err: any, size?: any) => void) { return imageSize(this.getAbspath(), cb) }
  getReifiedBytecode() { return BYTECODE }
  doesMatchOrHostComponent(other: any, cb: (err: any, v?: boolean) => void) { return cb(null, false) }
}

;(ImageComponent as any).DEFAULT_OPTIONS = { required: { project: true, relpath: true } }
;(BaseModel as any).extend(ImageComponent)

export { ImageComponent }
