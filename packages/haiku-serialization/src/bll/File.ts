import path from 'node:path'
import { bootstrapSceneFilesSync } from '@haiku/sdk-client'
import fse from 'fs-extra'
import { xmlToMana } from 'haiku-common'
import { debounce } from 'lodash'
import getSvgOptimizer from './../svg/getSvgOptimizer'
import logger from './../utils/LoggerInstance'
import BaseModel from './BaseModel'
import Cache from './Cache'
import Lock from './Lock'

const expressionToRO = require('@haiku/core/lib/reflection/expressionToRO').default

const DEFAULT_CONTEXT_SIZE = { width: 550, height: 400 }
const DISK_FLUSH_TIMEOUT = 500
const AWAIT_CONTENT_FLUSH_TIMEOUT = 0

const FILE_TYPES = { design: 'design', code: 'code' }

class File extends (BaseModel as any) {
  component: any
  mod: any
  ast: any
  debouncedFlushContent: () => void
  pendingRequestedFlush = false
  pendingWrite = false
  _numBytecodeUpdates = 0
  contents = ''
  dtLastWriteStart?: number
  dtLastWriteEnd?: number
  relpath!: string
  folder!: string
  project!: any
  type!: string

  constructor(props: any, opts: any) {
    super(props, opts)
    const scenename = this.project.relpathToSceneName(this.relpath)
    const uid = (ActiveComponent as any).buildPrimaryKey(this.project.getFolder(), scenename)
    if (this.project.getAlias() === 'master' || this.project.getAlias() === 'test') { bootstrapSceneFilesSync(this.project.getFolder(), scenename, this.project.userconfig) }
    this.component = (ActiveComponent as any).upsert({ uid, file: this, relpath: this.relpath, project: this.project, scenename })
    this.mod = (ModuleWrapper as any).upsert({ component: this.component, uid: this.getAbspath(), file: this })
    this.ast = (AST as any).upsert({ uid: this.getAbspath(), file: this })
    this.debouncedFlushContent = debounce(() => { this.flushContent() }, DISK_FLUSH_TIMEOUT)
  }

  destroy(cleanup = false) { this.mod.destroy(); this.ast.destroy(); if (cleanup && this.options.doWriteToDisk) { fse.removeSync(this.getFolder()) } ; super.destroy() }
  afterInitialize() { this._numBytecodeUpdates = 0 }
  updateInMemoryHotModule(bytecode: any, cb: (err?: any) => void) { this.assertBytecode(bytecode); (this as any).dtModified = Date.now(); this.cache.clear(); return this.mod.update(bytecode, () => { this._numBytecodeUpdates++; return cb() }) }
  requestAsyncContentFlush(flushSpec: any = {}) { if (this.options.doWriteToDisk) { this.pendingRequestedFlush = true; this.debouncedFlushContent() } }
  awaitNoFurtherContentFlushes(cb: () => void) { if (this.pendingRequestedFlush || this.pendingWrite) { return setTimeout(() => this.awaitNoFurtherContentFlushes(cb), AWAIT_CONTENT_FLUSH_TIMEOUT) } return cb() }
  updateContents(contents: string) { this.contents = contents }
  trackContentsAndGetCode() { this.updateContents(this.ast.updateWithBytecodeAndReturnCode(this.mod.fetchInMemoryExport(), this.contents)); return this.contents }
  flushContent() { this.trackContentsAndGetCode(); this.assertContents(this.contents); this.pendingRequestedFlush = false; this.pendingWrite = true; return this.write((err: any) => { if (err) { throw err } this.pendingWrite = false }) }
  flushContentForceSync() { this.trackContentsAndGetCode(); this.writeSync() }
  maybeFlushContentForceSync() { if (this.options.doWriteToDisk) { this.flushContentForceSync() } }
  assertBytecode(bytecode: any) { if (this._numBytecodeUpdates > 1) { if (Object.keys(bytecode).length < 2) { throw new Error(`Bytecode object was empty ${this.getAbspath()}`) } } }
  assertContents(contents: string) { if (typeof contents !== 'string') { throw new TypeError(`Code was invalid ${this.getAbspath()}`) } if (contents.match(/^\s*$/)) { throw new Error(`Code was blank ${this.getAbspath()}`) } }
  write(cb: (err?: any) => void) { if (!this.options.doWriteToDisk) { throw new Error('[file] illegal write requested') } this.assertContents(this.contents); this.dtLastWriteStart = Date.now(); (logger as any).info(`[file] async writing ${this.relpath} to disk`); return (File as any).write(this.folder, this.relpath, this.contents, (err: any) => { this.dtLastWriteEnd = Date.now(); if (err) { (logger as any).info(`[file] error writing ${this.relpath} to disk`, err); return cb(err) } return cb() }) }
  writeSync() { if (!this.options.doWriteToDisk) { throw new Error('[file] illegal write requested') } this.assertContents(this.contents); this.dtLastWriteStart = Date.now(); (logger as any).info(`[file] sync writing ${this.relpath} to disk`); const abspath = path.join(this.folder, this.relpath); fse.outputFileSync(abspath, this.contents); this.dtLastWriteEnd = Date.now() }
  getAbspath() { return path.join(this.folder, this.relpath) }
  getFolder() { return path.dirname(this.getAbspath()) }
  isCode() { return this.type === (FILE_TYPES as any).code }
  isDesign() { return this.type === (FILE_TYPES as any).design }
  getImportPathTo(source: string) { if (source[0] === '@') { return source } return (Template as any).normalizePath(path.relative(path.dirname(this.relpath), source)) }
  getReifiedBytecode() { return this.mod.fetchInMemoryExport() }
  getReifiedDecycledBytecode(cleanManaOptions: any = {}) { const reified = this.getReifiedBytecode(); return (Bytecode as any).decycle(reified, { cleanManaOptions, doCleanMana: true }) }
  getSerializedBytecode() { return this.cache.fetch('getSerializedBytecode', () => { const reified = this.getReifiedDecycledBytecode(); (Bytecode as any).cleanBytecode(reified); return expressionToRO(reified) }) }
}

;(BaseModel as any).extend(File)
;(File as any).TYPES = FILE_TYPES
;(File as any).DEFAULT_OPTIONS = { doWriteToDisk: false, skipDiffLogging: true, required: { relpath: true, folder: true, project: true } }
;(File as any).DEFAULT_CONTEXT_SIZE = DEFAULT_CONTEXT_SIZE
;(File as any).cache = new (Cache as any)()
;(File as any).write = (folder: string, relpath: string, contents: string, cb: (err?: any) => void) => { const abspath = path.join(folder, relpath); return (Lock as any).request((Lock as any).LOCKS.FileReadWrite(abspath), true, (release: () => void) => { return fse.outputFile(abspath, contents, (err: any) => { release(); if (err) { return cb(err) } return cb() }) }) }
;(File as any).read = (folder: string, relpath: string, cb: (err?: any, contents?: string) => void) => { const abspath = path.join(folder, relpath); return (Lock as any).request((Lock as any).LOCKS.FileReadWrite(abspath), false, (release: () => void) => { return fse.readFile(abspath, (err: any, buffer: Buffer) => { release(); if (err) { return cb(err) } return cb(null, buffer.toString()) }) }) }
;(File as any).isPathCode = (relpath: string) => _isFileCode(relpath)
;(File as any).buildManaCacheKey = (folder: string, relpath: string) => `mana:${path.join(folder, relpath)}`
;(File as any).readMana = (folder: string, relpath: string, cb: (err?: any, mana?: any) => void) => {
  return (File as any).cache.async((File as any).buildManaCacheKey(folder, relpath), (done: (err?: any, mana?: any) => void) => {
    return (File as any).read(folder, relpath, (err: any, buffer: string) => {
      if (err)
        return done(err); const xml = buffer.toString(); const returnUnoptimizedMana = () => {
        const manaFull = xmlToMana(xml); if (!manaFull)
          return done(new Error(`We couldn't load the contents of ${relpath}`)); return done(null, manaFull)
      }; return (getSvgOptimizer as any)().optimize(xml, { path: path.join(folder, relpath) }).then((contents: any) => { const manaOptimized = xmlToMana(contents.data); if (!manaOptimized) { throw new Error(`We couldn't load the contents of ${relpath}`) } return done(null, manaOptimized) }).catch((exception: any) => { (logger as any).warn(`[file] svgo couldn't parse ${relpath}`, exception); return setTimeout(() => { return returnUnoptimizedMana() }) })
    })
  }, cb, (mana: any) => { return (Template as any).clone({}, mana) })
}
function _isFileCode(relpath: string) { return path.extname(relpath) === '.js' }

export default File
export { File }
