import fs from 'node:fs'
import Module from 'node:module'
import path from 'node:path'
import haikuCore from '@haiku/core'
import logger from './../utils/LoggerInstance'
import overrideModulesLoaded from './../utils/overrideModulesLoaded'

import BaseModel from './BaseModel'
import Bytecode from './Bytecode'

import Lock from './Lock'

const HAIKU_SOURCE_ATTRIBUTE = 'haiku-source'
const HAIKU_VAR_ATTRIBUTE = 'haiku-var'

const CANONICAL_CORE_SOURCE_CODE_PATH = path.dirname(require.resolve('@haiku/core'))
const REPLACEMENT_MODULES: Record<string, string> = {
  'haiku.ai/player/dom': path.join(CANONICAL_CORE_SOURCE_CODE_PATH, 'dom'),
  'haiku.ai/player/dom/index': path.join(CANONICAL_CORE_SOURCE_CODE_PATH, 'dom'),
  'haiku.ai/player/dom/react': path.join(CANONICAL_CORE_SOURCE_CODE_PATH, 'dom', 'react'),
  '@haiku/player': CANONICAL_CORE_SOURCE_CODE_PATH,
  '@haiku/player/dom': path.join(CANONICAL_CORE_SOURCE_CODE_PATH, 'dom'),
  '@haiku/player/dom/index': path.join(CANONICAL_CORE_SOURCE_CODE_PATH, 'dom'),
  '@haiku/player/dom/react': path.join(CANONICAL_CORE_SOURCE_CODE_PATH, 'dom', 'react'),
  '@haiku/core': CANONICAL_CORE_SOURCE_CODE_PATH,
  '@haiku/core/dom': path.join(CANONICAL_CORE_SOURCE_CODE_PATH, 'dom'),
  '@haiku/core/dom/index': path.join(CANONICAL_CORE_SOURCE_CODE_PATH, 'dom'),
  '@haiku/core/dom/react': path.join(CANONICAL_CORE_SOURCE_CODE_PATH, 'dom', 'react'),
}

const CORE_PACKAGE_JSON = require(path.join(CANONICAL_CORE_SOURCE_CODE_PATH, 'package.json'))
const CORE_VERSION = CORE_PACKAGE_JSON.version

const MODULE_CACHE_HOT: Record<string, any> = {}
const MODULE_CACHE_COLD: Record<string, any> = {}

const originalRequire = Module.prototype.require
MODULE_CACHE_COLD['@haiku/core'] = haikuCore
Module.prototype.require = function (request: string) {
  if (MODULE_CACHE_COLD[request])
    return MODULE_CACHE_COLD[request]
  if (MODULE_CACHE_HOT[request])
    return MODULE_CACHE_HOT[request]
  return originalRequire.apply(this, arguments)
}

class ModuleWrapper extends (BaseModel as any) {
  exp: any
  _hasLoadedAtLeastOnce: boolean
  _projectConfig: any

  constructor(props: any, opts: any) {
    super(props, opts)
    this.exp = null
    this._hasLoadedAtLeastOnce = false
    this._projectConfig = null
  }

  hasLoadedAtLeastOnce() { return this._hasLoadedAtLeastOnce }
  clearInMemoryExport() { this.exp = null }
  fetchInMemoryExport() { return this.exp }
  isolatedClearCache() { ModuleWrapper.clearRequireCache(path.dirname(this.getAbspath())); ModuleWrapper.clearHotCache() }
  basicReload(cb: (err: any, exp?: any) => void) {
    if (this.exp)
      return cb(null, this.exp); return this.reload(cb)
  }

  getFolder() { return this.file.folder }
  getModpath() { return this.file.relpath }
  getAbspath() {
    if (this.isExternalModule) { return require.resolve(this.getModpath()) }
    let abspath = path.normalize(this.file.getAbspath())
    if (abspath.slice(0, 5) === '/var/') { abspath = `/private${abspath}` }
    return abspath
  }

  load() {
    overrideModulesLoaded((stop: () => void) => { this.isolatedClearCache(); this.exp = require(this.getAbspath()); this._hasLoadedAtLeastOnce = true; this.update(this.exp, () => { stop() }) }, ModuleWrapper.getHaikuKnownImportMatch)
  }

  reload(cb: (err: any, exp?: any) => void) {
    return (Lock as any).request((Lock as any).LOCKS.FileReadWrite(this.getAbspath()), false, (release: () => void) => {
      try { this.load() }
      catch (exception: any) { (logger as any).warn(`[module wrapper] cannot load ${this.getAbspath()}`); (logger as any).warn(exception); this.exp = {}; this._hasLoadedAtLeastOnce = true; return this.update(this.exp, () => { if (!this.isExternalModule) { (logger as any).warn(`[module wrapper] ***forcing flush content of ${this.getAbspath()}***`); this.file.maybeFlushContentForceSync() } release(); return cb(null, this.exp) }) }
      release(); return cb(null, this.exp)
    })
  }

  moduleAsMana(hostComponentRelpath: string, identifier: string, title: string, cb: (err: any, mana?: any) => void) {
    return this.basicReload((err, exp) => {
      if (err)
        return cb(err); if (!exp)
        return cb(null, null); let source: string; if (this.isExternalModule) { source = (Template as any).normalizePath(this.getModpath()) }
      else { const relpath = path.relative(this.getFolder(), this.getAbspath()); source = (Template as any).normalizePath(`./${relpath}`) } ;(exp as any).__reference = ModuleWrapper.buildReference(ModuleWrapper.REF_TYPES.COMPONENT, (Template as any).normalizePath(`./${hostComponentRelpath}`), (Template as any).normalizePathOfPossiblyExternalModule(source), identifier); return cb(null, { elementName: exp, attributes: { [HAIKU_SOURCE_ATTRIBUTE]: source, [HAIKU_VAR_ATTRIBUTE]: identifier, 'haiku-title': title }, children: [] })
    })
  }

  update(bytecode: any, cb: () => void) {
    if (this.isExternalModule)
      return cb()
    this.exp = Bytecode.reinitialize(this.file.folder, path.normalize(this.file.relpath), bytecode, { title: this.component && this.component.getTitle() })
    MODULE_CACHE_HOT[this.getAbspath()] = this.exp
    MODULE_CACHE_HOT[this.getModpath()] = this.exp
    MODULE_CACHE_HOT[this.file.getAbspath()] = this.exp
    return cb()
  }
}

;(ModuleWrapper as any).DEFAULT_OPTIONS = { required: { file: true, component: true } }
;(BaseModel as any).extend(ModuleWrapper)
;(ModuleWrapper as any).buildReference = (type: string, host: string, source: string, identifier: string) => JSON.stringify({ type, host, source, identifier })
;(ModuleWrapper as any).isValidReference = (__reference: any) => {
  if (!__reference)
    return false; if (typeof __reference !== 'string')
    return false; const ref = (ModuleWrapper as any).parseReference(__reference); if (!ref)
    return false; return (ref.type && ref.host && ref.source && ref.identifier)
}
;(ModuleWrapper as any).parseReference = (__reference: any) => {
  if (typeof __reference !== 'string')
    return null; try { return JSON.parse(__reference) }
  catch (exception: any) { (logger as any).warn('[module wrapper]', exception); return null }
}
;(ModuleWrapper as any).modulePathToIdentifierName = (modulepath: string) => { const nicepath = path.dirname(modulepath) + path.sep + path.basename(modulepath, path.extname(modulepath)); const parts = nicepath.split(path.sep); return parts.map(part => part.replace(/\W+/g, '_')).join('_').slice(1) }
;(ModuleWrapper as any).getScenenameFromRelpath = (relpath: string) => path.normalize(relpath).split(path.sep)[1]
;(ModuleWrapper as any).getHaikuKnownImportMatch = (importPath: string) => {
  const normalizedPath = importPath.trim().toLowerCase(); if (normalizedPath in REPLACEMENT_MODULES)
    return REPLACEMENT_MODULES[normalizedPath]; return importPath.replace(/^@haiku\/player/, REPLACEMENT_MODULES['@haiku/player']).replace(/^@haiku\/core/, REPLACEMENT_MODULES['@haiku/core'])
}
;(ModuleWrapper as any).clearHotCache = () => { const cleared: Record<string, boolean> = {}; for (const key in MODULE_CACHE_HOT) { cleared[key] = true; MODULE_CACHE_HOT[key] = null } ;(logger as any).info(`[module wrapper] cleared hot cache`, cleared) }
;(ModuleWrapper as any).clearRequireCache = (dirname?: string) => {
  const cleared: Record<string, boolean> = {}; for (const key in require.cache) {
    if (dirname) { if (key.includes(dirname)) { cleared[key] = true; delete require.cache[key] } }
    else if (!key.match(/node_modules/)) { cleared[key] = true; delete require.cache[key] }
  } ;(logger as any).info(`[module wrapper] cleared require cache`, cleared)
}
;(ModuleWrapper as any).doesRelpathLookLikeLocalComponent = (relpath: string) => { const parts = path.normalize(relpath).split(path.sep); return (path.basename(relpath) === 'code.js' && parts[0] === 'code' && parts.length === 3) }
;(ModuleWrapper as any).doesRelpathLookLikeSVGDesign = (relpath: string) => path.extname(relpath) === '.svg'
;(ModuleWrapper as any).doesRelpathLookLikeInstalledComponent = (relpath: string) => { const parts = path.normalize(relpath).split(path.sep); return parts[0] === '@haiku' }
;(ModuleWrapper as any).requireFromString = (code: string, filename?: string, opts?: any) => { if (typeof filename === 'object') { opts = filename; filename = undefined } opts = opts || {}; filename = filename || ''; if (typeof code !== 'string') { throw new TypeError(`code must be a string, not ${typeof code}`) } const m = new Module(filename, module.parent); m.paths = [].concat(path.dirname(filename), Module._nodeModulePaths(__dirname)); m.filename = filename; m.id = filename; m._compile(code, filename); return m.exports }
;(ModuleWrapper as any).requireFromFile = (filename: string) => { const contents = fs.readFileSync(filename).toString(); return (ModuleWrapper as any).requireFromString(contents, filename) }
;(ModuleWrapper as any).testLoadBytecode = (contents: string, absPath: string) => { let loadedBytecode: any = null; overrideModulesLoaded((stop: () => void) => { loadedBytecode = (ModuleWrapper as any).requireFromString(contents, absPath); stop() }, (ModuleWrapper as any).getHaikuKnownImportMatch); return loadedBytecode }
;(ModuleWrapper as any).REF_TYPES = { COMPONENT: 'component' }
;(ModuleWrapper as any).CORE_VERSION = CORE_VERSION

const Template = require('./Template').default

export default ModuleWrapper
export { ModuleWrapper }
