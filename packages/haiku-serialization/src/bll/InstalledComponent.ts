import path from 'node:path'
import BaseModel from './BaseModel'
import ModuleWrapper from './ModuleWrapper'

export default class InstalledComponent extends (BaseModel as any) {
  getTitle() {
    const parts = this.modpath.split(path.sep)
    if (parts[0] === '@haiku' && parts[1] === 'core' && parts[2] === 'components') {
      return parts[4]
    }
    return parts.join('_')
  }

  getReifiedBytecode() { return null }
  doesMatchOrHostComponent(other: any, cb: (err: any, v?: boolean) => void) { return cb(null, false) }
  getIdentifier() { return ModuleWrapper.modulePathToIdentifierName(this.modpath) }
}

;(InstalledComponent as any).DEFAULT_OPTIONS = { required: { modpath: true } }
;(BaseModel as any).extend(InstalledComponent)

export { InstalledComponent }
