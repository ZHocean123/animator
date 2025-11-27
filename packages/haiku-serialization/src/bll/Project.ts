import path from 'node:path'
import { InteractionMode } from '@haiku/core/lib/helpers/interactionModes'
import { getAngularSelectorName, getDefaultIllustratorAssetPath, getDefaultSketchAssetPath, getProjectNameLowerCase, getProjectNameSafeShort, getReactProjectName, getSafeProjectName, readPackageJson } from '@haiku/sdk-client'
import async from 'async'
import { Experiment, experimentIsEnabled } from 'haiku-common'
import fse from 'haiku-fs-extra'
import { EnvoyClient, EnvoyLogger, GLASS_CHANNEL } from 'haiku-sdk-creator'
import jss from 'json-stable-stringify'
import lodash from 'lodash'
import WebSocket from 'ws'
import logger from './../utils/LoggerInstance'
import ActionStack from './ActionStack'
import ActiveComponent from './ActiveComponent'
import Asset from './Asset'
import BaseModel from './BaseModel'

import File from './File'
import toTitleCase from './helpers/toTitleCase'
import Lock from './Lock'
import ModuleWrapper from './ModuleWrapper'

const SILENT_METHODS: Record<string, boolean> = { hoverElement: true, unhoverElement: true }

class Project extends (BaseModel as any) {
  metadata: any
  actionStack: any
  _didStartWebsocketListeners: boolean
  _activeComponentSceneName: string | null
  _multiComponentTabs: Array<{ scenename: string, active: boolean }>
  isHandlingMethods: boolean
  interactionMode: InteractionMode
  actionStackIndex: number
  websocket: any
  platform: any
  folder: string
  alias: string
  envoyOptions: any
  fileOptions: any
  WebSocket: any
  _envoyClient: any
  _envoyTimelineChannel: any
  _envoyGlassChannel: any
  _envoyTourChannel: any

  constructor(props: any, opts: any) {
    super(props, opts)
    this.metadata = { from: (this as any).alias, alias: (this as any).alias }
    this.ensurePlatformHaikuRegistry()
    this.actionStack = new ActionStack({ uid: this.getPrimaryKey(), project: this })
    this.actionStack.on('next', (method: string, params: any[], done: (err: any, out?: any) => void) => { (logger as any).info(`[project (${this.getAlias()})] sending action: ${method}`); this.websocket.action(method, params, (err: any, out: any) => { done(err, out) }, this.getFolder()) })
    this._didStartWebsocketListeners = false
    this.connectClients()
    this._activeComponentSceneName = null
    ;(ActiveComponent as any).on('update', (ac: any, what: any, entity: any) => { this.emit('update', what, entity, ac, this.getMetadata()) })
    this._multiComponentTabs = []
    this.isHandlingMethods = true
    this.interactionMode = InteractionMode.EDIT
    this.actionStackIndex = 0
  }

  teardown() {
    this.stopHandlingMethods(); this.getEnvoyClient().closeConnection(); if (this.websocket)
      this.websocket.disconnect(); this.actionStack.stop()
  }

  stopHandlingMethods() { this.isHandlingMethods = false }
  startHandlingMethods() { this.isHandlingMethods = true }
  connectClients() {
    this.startHandlingMethods()
    if (this.websocket) {
      this.websocket.connect()
      if (!this._didStartWebsocketListeners) {
        this.websocket.on('method', (this as any).receiveMethodCall.bind(this))
        this.websocket.on('close', () => (logger as any).info(`[project (${this.getAlias()})] websocket closed`))
        this.websocket.on('error', () => (logger as any).info(`[project (${this.getAlias()})] websocket error`))
        this._didStartWebsocketListeners = true
      }
    }
    if (this._envoyClient) { /* no-op */ }
    else {
      const websocketClient = this.WebSocket || ((typeof window !== 'undefined') && (window as any).WebSocket) || WebSocket
      this._envoyClient = new (EnvoyClient as any)(Object.assign({ WebSocket: websocketClient, logger: new (EnvoyLogger as any)('warn') }, this.getEnvoyOptions()))
      this._envoyClient.get('timeline').then((timelineChannel: any) => { this._envoyTimelineChannel = timelineChannel; this.emit('envoy:timelineClientReady', this._envoyTimelineChannel) })
      this._envoyClient.get(GLASS_CHANNEL).then((glassChannel: any) => { this._envoyGlassChannel = glassChannel; this.emit('envoy:glassClientReady', this._envoyGlassChannel) })
      this._envoyClient.get('tour').then((tourChannel: any) => { this._envoyTourChannel = tourChannel; if (!this._envoyClient.isInMockMode()) { this._envoyTourChannel.requestWebviewCoordinates().then(() => { this.emit('envoy:tourClientReady', this._envoyTourChannel) }) } })
    }
  }

  isIgnoringMethodRequestsForMethod(method: string) { const fileOptions = this.getFileOptions(); return fileOptions && fileOptions.methodsToIgnore && fileOptions.methodsToIgnore[method] }
  receiveMethodCall(method: string, params: any[], message: any, cb: (err?: any, out?: any) => void) {
    if (!this.isHandlingMethods)
      return cb(); if (this.isIgnoringMethodRequestsForMethod(method))
      return null as any; return (this as any).handleMethodCall(method, params, message, cb)
  }

  handleMethodCall(method: string, params: any[], message: any, cb: (err?: any, out?: any) => void) {
    return (Lock as any).request((Lock as any).LOCKS.ProjectMethodHandler, false, (release: () => void) => {
      if (typeof params[0] === 'string' && typeof (ActiveComponent as any).prototype[method] === 'function') {
        return this.findActiveComponentBySource(params[0], (findAcError: any, ac: any) => {
          if (findAcError) { release(); return cb(findAcError) }
          if (!SILENT_METHODS[method]) { (logger as any).info(`[project (${this.getAlias()})] component handling method ${method}`) }
          return (ac as any)[method].apply(ac, params.slice(1).concat((err: any) => { release(); return cb(err) }))
        })
      }
      if (typeof (this as any)[method] === 'function') {
        if (!SILENT_METHODS) { (logger as any).info(`[project (${this.getAlias()})] project handling method ${method}`) }
        return (this as any)[method].apply(this, params.concat((err: any) => { release(); return cb(err) }))
      }
      release(); throw new Error(`Unknown project method ${method}`)
    })
  }

  ensurePlatformHaikuRegistry() {
    if (!(this as any).platform)
      (this as any).platform = {}; if (!(this as any).platform.haiku)
      (this as any).platform.haiku = {}; if (!(this as any).platform.haiku.registry)
      (this as any).platform.haiku.registry = {}
  }

  getName() { const parts = this.getFolder().split(path.sep); const last = parts[parts.length - 1]; return last }
  getNameVariations() { return (Project as any).getProjectNameVariations(this.getFolder()) }
  getFriendlyName(maybeProjectName?: string) { return maybeProjectName || (toTitleCase as any)(this.getName()) }
  getCurrentActiveComponentSceneName() { const ac = this.getCurrentActiveComponent(); return ac && ac.getSceneName() }
  getCurrentActiveComponentRelpath() { const ac = this.getCurrentActiveComponent(); return ac && ac.getRelpath() }
  getCurrentActiveComponent() {
    if (!this._activeComponentSceneName)
      return null; return this.findActiveComponentBySceneName(this._activeComponentSceneName)
  }

  getAllActiveComponents() { return (ActiveComponent as any).where({ project: this }) }
  addActiveComponentToMultiComponentTabs(scenename: string, active = false) { for (const tab of this._multiComponentTabs) { if (tab.scenename === scenename) { tab.active = active; return } } this._multiComponentTabs.push({ scenename, active }) }
  removeActiveComponentFromMultiComponentTabs(scenename: string) { const index = this._multiComponentTabs.findIndex(tab => tab.scenename === scenename); if (index !== -1) { this._multiComponentTabs.splice(index, 1) } }
  describeSubComponents() { return this._multiComponentTabs.map(({ scenename, active }) => ({ isActive: !!active, scenename, title: (toTitleCase as any)(scenename) })) }
  describeUndoState() { const ac = this.getCurrentActiveComponent(); const filter = (doable: any) => !doable.ac || doable.ac === ac; return { canUndo: this.actionStack.getUndoables().filter(filter).length > 0, canRedo: this.actionStack.getRedoables().filter(filter).length > 0 } }
  describeTopMenu() { return { subComponents: this.describeSubComponents(), undoState: this.describeUndoState() } }
  getExistingComponentNames() { const names: Record<string, boolean> = { main: true }; this._multiComponentTabs.forEach((tab) => { names[tab.scenename] = true }); return names }
  getNextAvailableSceneNameWithPrefix(prefix: string, num = 0) {
    const full = `${prefix}${(num < 2) ? '' : `_${num}`}`; if (!this.findActiveComponentBySceneName(full))
      return full; return this.getNextAvailableSceneNameWithPrefix(prefix, num + 1)
  }

  getMultiComponentTabs() { return this._multiComponentTabs }
  getMetadata() { return this.metadata }
  getFileOptions() { return this.fileOptions }
  getEnvoyOptions() { return this.envoyOptions }
  getFolder() { return (this as any).folder }
  getAlias() { return (this as any).alias }
  buildFileUid(relpath: string) { return path.join(this.getFolder(), relpath) }
  getEnvoyChannel(name: string) { switch (name) { case 'timeline': return this._envoyTimelineChannel; case 'glass': return this._envoyGlassChannel; case 'tour': return this._envoyTourChannel; default: throw new Error('Envoy channel name required') } }
  getEnvoyClient() { return this._envoyClient }
  getPlatform() { return (this as any).platform }
  undo(options: any, metadata: any, cb: any) { this.actionStack.undo(options, metadata, cb) }
  redo(options: any, metadata: any, cb: any) { this.actionStack.redo(options, metadata, cb) }
  advanceActionStackIndex() { this.actionStackIndex++ }
  updateHook(...args: any[]) {
    const method = args.shift(); const tx = args.pop(); const metadata = Object.assign({}, args.pop()); args.push(metadata); delete metadata.actionStackIndex
    return this.actionStack.handleActionInitiation(method, args, metadata, (handleActionResolution: any) => tx((err: any, out: any) => {
      if (experimentIsEnabled(Experiment.IpcIntegrityCheck) && metadata.integrity !== false) {
        const integrity = this.describeIntegrity()
        if (metadata.integrity && this.isRemoteRequest(metadata)) {
          const mismatch = integritiesMismatched(metadata.integrity, integrity)
          if (mismatch) {
            (logger as any).error(`\n                Integrity mismatch due to ${method} in ${this.getAlias()}:\n                  ${metadata.from} (their result):\n                    ${mismatch[0]}\n                  ${this.getAlias()} (our result):\n                    ${mismatch[1]}\n              `)
            if (experimentIsEnabled(Experiment.CrashOnIpcIntegrityCheckFailure)) {
              let message = `Unable to update component (${method} in ${this.getAlias()})`
              if (process.env.NODE_ENV !== 'production') { message = `CRASH! Stop editing now and open dev tools (Cmd+Option+I). ${message}` }
              throw new Error(message)
            }
          }
        }
        Object.assign(metadata, { integrity })
      }
      if (!this.isRemoteRequest(metadata)) {
        this.emit('update', method, ...args)
        this.actionStack.enqueueAction(method, [this.getFolder()].concat(args), () => { metadata.actionStackIndex = this.actionStackIndex; this.advanceActionStackIndex(); handleActionResolution(err, out) })
      }
      else { this.emit('remote-update', method, ...args); handleActionResolution(err, out) }
    }))
  }

  getWebsocketBroadcastDefaults() { return { time: Date.now(), type: 'broadcast', folder: this.getFolder(), from: this.getMetadata().alias } }
  broadcastPayload(mainPayload: any) { const fullPayloadWithMetadata = Object.assign(this.getWebsocketBroadcastDefaults(), mainPayload); this.websocket.send(fullPayloadWithMetadata) }
  upsertFile({ relpath, type }: { relpath: string, type: any }) { const spec = Object.assign({}, (File as any).DEFAULT_ATTRIBUTES, { uid: this.buildFileUid(relpath), folder: this.getFolder(), dtModified: Date.now(), project: this, relpath, type }); return (File as any).upsert(spec, this.getFileOptions()) }
  isRemoteRequest(metadata: any) { return metadata && metadata.from !== this.getAlias() }
  isLocalUpdate(metadata: any) { return metadata && metadata.from === this.getAlias() }
  masterHeartbeat(cb: any) { return this.websocket.request({ folder: this.getFolder(), method: 'masterHeartbeat', params: [this.getFolder()] }, cb) }
  saveProject(project: any, saveOptions: any = {}, cb: any) { return this.websocket.request({ folder: this.getFolder(), method: 'saveProject', params: [project, saveOptions] }, cb) }
  setInteractionMode(interactionMode: InteractionMode, metadata: any, cb: any) {
    const components = (ActiveComponent as any).where({ project: this })
    return (Lock as any).request((Lock as any).LOCKS.ActiveComponentWork, false, (release: () => void) => {
      return async.eachSeries(components, (component: any, next: any) => {
        return component.moduleFindOrCreate('basicReload', {}, (err: any) => {
          if (err)
            return next(err); return component.setInteractionMode(interactionMode, next)
        })
      }, (err: any) => { if (err) { release(); return cb(err) } this.interactionMode = interactionMode; release(); this.updateHook('setInteractionMode', interactionMode, metadata, (fire: any) => fire()); return cb() })
    })
  }

  getInteractionMode() { return this.interactionMode }
  toggleInteractionMode(metadata: any, cb: any) { const interactionMode = this.interactionMode === InteractionMode.EDIT ? InteractionMode.LIVE : InteractionMode.EDIT; this.setInteractionMode(interactionMode, metadata, cb) }
  linkAsset(assetAbspath: string, cb: any) { return this.websocket.request({ folder: this.getFolder(), method: 'linkAsset', params: [assetAbspath, this.getFolder()] }, cb) }
  unlinkAsset(assetRelpath: string, cb: any) { return this.websocket.request({ folder: this.getFolder(), method: 'unlinkAsset', params: [assetRelpath, this.getFolder()] }, cb) }
  bulkLinkAssets(assetAbspaths: string[], cb: any) { return this.websocket.request({ folder: this.getFolder(), method: 'bulkLinkAssets', params: [assetAbspaths, this.getFolder()] }, cb) }
  listAssets(cb: any) { return this.websocket.request({ folder: this.getFolder(), method: 'listAssets', params: [this.getFolder()] }, cb) }
  readAllStateValues(cb: any) { return this.websocket.method('readAllStateValues', [this.getFolder(), this.getCurrentActiveComponentRelpath()], cb) }
  queryImageSize(abspath: string, cb: any) { return this.websocket.method('queryImageSize', [abspath], cb) }
  mergeDesigns(designs: any[], metadata: any, cb: any) {
    const ac = this.getCurrentActiveComponent(); if (!ac) { (logger as any).warn(`[project] skipping design merge since no component is active`); return cb() }
    ;(ac as any).codeReloadingOn()
    return (Lock as any).request((Lock as any).LOCKS.ActiveComponentWork, false, (release: () => void) => {
      return this.updateHook('mergeDesigns', designs, metadata || this.getMetadata(), (fire: any) => {
        const components = (ActiveComponent as any).where({ project: this })
        return async.eachSeries(components, (component: any, next: any) => {
          return component.moduleFindOrCreate('basicReload', {}, (err: any) => {
            if (err)
              return next(err); return component.mergeDesignFiles(designs, next)
          })
        }, (err: any) => { if (err) { (ac as any).codeReloadingOff(); release(); (logger as any).error(`[project (${this.getAlias()})]`, err); return cb(err) } return (ac as any).reload({ hardReload: true, clearCacheOptions: { doClearEntityCaches: true } }, null, () => { (ac as any).codeReloadingOff(); release(); fire(); return cb() }) })
      })
    })
  }

  addActiveComponentToRegistry(activeComponent: any) { const activeComponentKey = path.join(this.getFolder(), activeComponent.getRelpath()); this.ensurePlatformHaikuRegistry(); (this as any).platform.haiku.registry[activeComponentKey] = activeComponent; this.addActiveComponentToMultiComponentTabs(activeComponent.getSceneName(), false) }
  removeActiveComponentFromRegistry(activeComponent: any) { const activeComponentKey = path.join(this.getFolder(), activeComponent.getRelpath()); this.ensurePlatformHaikuRegistry(); delete (this as any).platform.haiku.registry[activeComponentKey]; this.removeActiveComponentFromMultiComponentTabs(activeComponent.getSceneName()) }
  deleteSceneByName(scenename: string, cb: any) {
    const ac = this.findActiveComponentBySceneName(scenename); if (!ac)
      return cb(); this.removeActiveComponentFromRegistry(ac); this.emit('update', 'updateMenu'); (ac as any).destroy(true); return cb()
  }

  upsertSceneByName(scenename: string, cb: any) { const relpath = path.join('code', scenename, 'code.js'); return this.upsertComponentBytecodeToModule(relpath, cb) }
  findOrCreateActiveComponent(scenename: string, cb: any) {
    const ac = this.findActiveComponentBySceneName(scenename); if (ac)
      return cb(null, ac); return this.upsertSceneByName(scenename, (err: any) => {
      if (err)
        return cb(err); return cb(null, this.findActiveComponentBySceneName(scenename))
    })
  }

  setCurrentActiveComponent(scenename: string, metadata: any, cb: any) { metadata.integrity = false; return (Lock as any).request((Lock as any).LOCKS.SetCurrentActiveComponent, false, (release: () => void) => { this.findOrCreateActiveComponent(scenename, (err: any, ac: any) => { if (err) { release(); return cb(err) } this.addActiveComponentToMultiComponentTabs(scenename, true); this._multiComponentTabs.forEach((tab) => { tab.active = tab.scenename === scenename }); return (Lock as any).awaitAllLocksFreeExcept([(Lock as any).LOCKS.SetCurrentActiveComponent, (Lock as any).LOCKS.ProjectMethodHandler], () => { const currentActiveComponent = this.getCurrentActiveComponent(); if (currentActiveComponent) { (currentActiveComponent as any).emit('update', 'componentDeactivating') } this._activeComponentSceneName = scenename; this.updateHook('setCurrentActiveComponent', scenename, metadata || this.getMetadata(), (fire: any) => { fire(); release(); return cb(null, ac) }) }) }) }) }
  closeNamedActiveComponent(scenename: string, metadata: any, cb?: any) {
    for (let i = this._multiComponentTabs.length - 1; i >= 0; i--) {
      const tab = this._multiComponentTabs[i]; if (tab.scenename === scenename) { this._multiComponentTabs.splice(i, 1) }
      else { tab.active = false }
    } this._activeComponentSceneName = (this._multiComponentTabs[0] as any); this.updateHook('closeNamedActiveComponent', scenename, metadata || this.getMetadata(), (fire: any) => fire()); if (cb)
      return cb()
  }

  renameComponent(scenenameOld: string, scenenameNew: string, metadata: any, cb: any) { throw new Error('not yet implemented') }
  linkExternalAssetOnDrop(event: any, cb: any) {
    if ((Asset as any).isInternalDrop(event))
      return cb(); event.preventDefault(); const files = Array.from(event.dataTransfer.items).filter((Asset as any).isValidFile).map((item: any) => item.getAsFile().path); return this.websocket.request({ folder: this.getFolder(), method: 'bulkLinkAssets', params: [files, this.getFolder()] }, cb)
  }

  upsertComponentBytecodeToModule(relpath: string, cb: any) {
    this.upsertActiveComponentInstance(relpath, (err: any, ac: any) => {
      if (err)
        return cb(err); return (ac as any).mountApplication(null, {}, (err2: any) => {
        if (err2)
          return cb(err2); this.emit('active-component:upserted'); return cb(null, ac)
      })
    })
  }

  relpathToSceneName(relpath: string) { return path.normalize(relpath).split(path.sep)[1] }
  upsertActiveComponentInstance(relpath: string, cb: any) { const abspath = path.join(this.getFolder(), relpath); return (Lock as any).request((Lock as any).LOCKS.FileReadWrite(abspath), false, (release: () => void) => { const file = this.upsertFile({ relpath, type: (File as any).TYPES.code }); release(); return cb(null, file.component) }) }
  findActiveComponentBySource(relpath: string, cb: any) { const scenename = (ModuleWrapper as any).getScenenameFromRelpath(relpath); return this.findOrCreateActiveComponent(scenename, cb) }
  findActiveComponentBySourceIfPresent(relpath: string) { const scenename = (ModuleWrapper as any).getScenenameFromRelpath(relpath); return this.findActiveComponentBySceneName(scenename) }
  findActiveComponentBySceneName(scenename: string) { return (ActiveComponent as any).findById((ActiveComponent as any).buildPrimaryKey(this.getFolder(), scenename)) }
  getPackageJsonPath() { return path.join(this.getFolder(), 'package.json') }
  getDefaultComponentInfo() {}
  readPackageJsonSafe(cb: any) {
    let pkg; try { pkg = fse.readJsonSync(this.getPackageJsonPath(), { throws: false }) }
    catch (exception: any) { (logger as any).warn(`[project (${this.getAlias()})] package.json error:`, exception); pkg = {} } return cb(pkg)
  }

  writePackageJson(pkg: any, cb: any) {
    try { fse.outputJsonSync(this.getPackageJsonPath(), pkg) }
    catch (exception: any) { return cb(exception) } return cb()
  }

  readComponentInfo(scenename: string, cb: any) {
    return this.readPackageJsonSafe((pkg: any) => {
      const info = lodash.get(pkg, `haiku.${scenename}`) || {}; const getMetadata = (cb2: any) => {
        const ac = this.findActiveComponentBySceneName(scenename); if (!ac)
          return cb2({}); return (ac as any).readMetadata((err: any, metadata: any) => { if (err) { (logger as any).warn(`[project (${this.getAlias()})] component metadata error:`, err) } return cb2(metadata || {}) })
      }; return getMetadata((metadata: any) => { const final = lodash.assign({}, metadata, info); return cb(null, final) })
    })
  }

  getCodeFolderAbspath() { return path.join(this.getFolder(), 'code') }
  rehydrate() { fse.readdirSync(this.getCodeFolderAbspath()).filter(entry => entry && entry[0] !== '.').forEach((scenename) => { this.addActiveComponentToMultiComponentTabs(scenename) }) }
  describeIntegrity() { const descriptor: Record<string, any> = {}; this.getAllActiveComponents().forEach((ac: any) => { const relpath = ac.getRelpath(); const { hash } = ac.getInsertionPointInfo(); descriptor[relpath] = { hash } }); return descriptor }
}

;(Project as any).DEFAULT_OPTIONS = { required: { uid: true, folder: true, alias: true, userconfig: true, websocket: true, platform: true, fileOptions: true, envoyOptions: true } }
;(BaseModel as any).extend(Project)
;(Project as any).awaitOneUpdateFromActiveComponent = (activeComponent: any, channel: string, fn: (...args: any[]) => void) => { let once = true; activeComponent.on('update', (what: any, a: any, b: any, c: any, d: any, e: any, f: any, g: any, h: any) => { if (once && what === channel) { once = false; fn(a, b, c, d, e, f, g, h) } }) }
;(Project as any).setup = (folder: string, alias: string, websocket: any, platform: any = {}, userconfig: any = {}, fileOptions: any = {}, envoyOptions: any = {}, cb: any) => { fse.mkdirpSync(path.join(folder, 'code')); const project = (Project as any).upsert({ uid: folder, folder, alias, websocket, userconfig, platform, fileOptions, envoyOptions }); project.rehydrate(); return cb(null, project) }
;(Project as any).getProjectNameVariations = (folder: string) => { const projectHaikuConfig = readPackageJson(folder).haiku; const projectNameSafe = getSafeProjectName(projectHaikuConfig.project); const projectNameSafeShort = getProjectNameSafeShort(projectHaikuConfig.project); const projectNameLowerCase = getProjectNameLowerCase(projectHaikuConfig.project); const reactProjectName = getReactProjectName(projectHaikuConfig.project); const angularSelectorName = getAngularSelectorName(projectHaikuConfig.project); const primaryAssetPath = getDefaultSketchAssetPath(projectHaikuConfig.project); const defaultIllustratorAssetPath = getDefaultIllustratorAssetPath(projectHaikuConfig.project); return { projectNameSafe, projectNameSafeShort, projectNameLowerCase, reactProjectName, angularSelectorName, primaryAssetPath, defaultIllustratorAssetPath } }
function integritiesMismatched(i1: any, i2: any) {
  const s1 = jss(Object.keys(i1).reduce((accumulator: any, key: string) => { if (i2[key]) { accumulator[key] = i1[key] } return accumulator }, {})); const s2 = jss(Object.keys(i1).reduce((accumulator: any, key: string) => { if (i1[key]) { accumulator[key] = i2[key] } return accumulator }, {})); if (s1 !== s2)
    return [s1, s2]; return false
}
;(Project as any).PUBLIC_METHODS = { setCurrentActiveComponent: true, closeNamedActiveComponent: true, renameComponent: true }

export default Project
export { Project }
