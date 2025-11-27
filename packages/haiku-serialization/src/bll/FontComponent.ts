import path from 'node:path'
import BaseModel from './BaseModel'

const MODPATH = '@haiku/core/components/controls/Font/code/main/code'
const BYTECODE = require(MODPATH)

export default class FontComponent extends (BaseModel as any) {
  modpath = MODPATH
  identifier = 'font'

  getTitle() {
    const parts = this.relpath.split(path.sep)
    const last = parts[parts.length - 1]
    const basename = path.basename(last, path.extname(last))
    return basename
  }

  getAbspath() { return path.join(this.project.getFolder(), this.relpath) }
  getLocalHref() { return `web+haikuroot://${path.normalize(this.relpath)}` }
  getReifiedBytecode() { return BYTECODE }
  doesMatchOrHostComponent(other: any, cb: (err: any, v?: boolean) => void) { return cb(null, false) }
}

;(FontComponent as any).DEFAULT_OPTIONS = { required: { project: true, relpath: true } }
;(BaseModel as any).extend(FontComponent)

export { FontComponent }
