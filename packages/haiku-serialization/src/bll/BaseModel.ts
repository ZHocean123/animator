import { EventEmitter } from 'node:events'
import lodash from 'lodash'
import CryptoUtils from './../utils/CryptoUtils'
import EmitterManager from './../utils/EmitterManager'
import logger from './../utils/LoggerInstance'
import Cache from './Cache'
import DiskStorage from './storage/DiskStorage'
import MemoryStorage from './storage/MemoryStorage'

const expressionToRO = require('@haiku/core/lib/reflection/expressionToRO').default
const reifyRO = require('@haiku/core/lib/reflection/reifyRO').default

const SYNC_DEBOUNCE_TIME = 100

export default class BaseModel extends EventEmitter {
  options: Record<string, any>
  parent: any
  children: any[]
  cache: Cache
  __sync: boolean
  __storage: 'mem' | 'disk'
  __updated: number
  __checked: number
  __initialized: number
  __marked: boolean
  __destroyed: number | null
  _updateReceivers: Record<string, (what: any) => void>
  syncDebounced: () => void

  constructor(props: Record<string, any> = {}, opts: Record<string, any> = {}) {
    super()
    ;(EmitterManager as any).extend(this)
    if (!(this.constructor as any).extended)
      throw new Error(`You must call BaseModel.extend(${(this.constructor as any).name})`)
    if (!(this as any).options)
      (this as any).options = {}
    this.setOptions(opts)
    if (!(this as any).options.validationOff) {
      if ((this as any).options.required) {
        for (const requirement in (this as any).options.required) {
          if (props[requirement] === undefined)
            throw new Error(`Property '${requirement}' is required`)
        }
      }
    }
    this.__sync = false
    this.syncDebounced = (lodash as any).debounce(() => { this.sync() }, SYNC_DEBOUNCE_TIME)
    this.parent = null
    this.children = []
    this.cache = new Cache()
    this.assign(props)
    if (!this.getPrimaryKey())
      this.setPrimaryKey(this.generateUniqueId())
    this.__storage = 'mem'
    this.__updated = Date.now()
    this.__checked = Date.now() - 1
    this.__initialized = Date.now()
    this.__marked = false
    this.__destroyed = null
    this._updateReceivers = {}
    if ((this as any).afterInitialize)
      (this as any).afterInitialize()
    this.__sync = true
    ;(this.constructor as any).add(this)
  }

  registerUpdateReceiver(source: string, cb: (what: any) => void) {
    if (typeof cb !== 'function')
      return () => {}
    this._updateReceivers[source] = cb
    return () => {
      delete this._updateReceivers[source]
    }
  }

  notifyUpdateReceivers(what: any) { Object.keys(this._updateReceivers).forEach((receiver) => { this._updateReceivers[receiver](what) }) }
  emit(...args: any[]) { (super.emit as any).call(this, ...args); (this.constructor as any).emit(args[0], this, ...args.slice(1)) }
  mark() { this.__marked = true; return true }
  sweep() { if (this.__marked) { this.destroy(); return true } return false }
  generateUniqueId() { return (lodash as any).uniqueId((this.constructor as any).name) }
  forceUpdate() { this.setUpdateTimestamp(); this.cache.clear(); return this }
  setUpdateTimestamp() { this.__updated = Date.now(); return this }
  getUpdateTimestamp() { return this.__updated }
  getClassName() { return (this.constructor as any).name }
  getPrimaryKeyShort() { const key = this.getPrimaryKey(); const parts = (key as string).split(':'); return parts[parts.length - 1] }
  getPrimaryKey() { return (this as any)[(this.constructor as any).config.primaryKey] }
  getKeySHA() { return (CryptoUtils as any).sha256(`${this.getClassName()}-${this.getPrimaryKey()}`) }
  toString() { return this.getPrimaryKey() }
  setPrimaryKey(value: any) { (this as any)[(this.constructor as any).config.primaryKey] = value; return this }
  setOptions(opts?: Record<string, any>) { Object.assign((this as any).options, (this.constructor as any).DEFAULT_OPTIONS, opts) }
  assign(props?: Record<string, any>) { if (props) { for (const key in props) { if (props[key] !== undefined) { this.set(key, props[key]) } } } this.cache.clear(); this.setUpdateTimestamp(); return this }
  set(key: string, value: any) { (this as any)[key] = value; this.syncDebounced() }
  destroy() { this.removeFromParent(); (this.constructor as any).remove(this); (this.constructor as any).clearCaches(); this.__destroyed = Date.now(); this.syncDebounced() }
  isDestroyed() { return !!this.__destroyed }
  hasAll(criteria?: Record<string, any>) {
    if (!criteria)
      return true
    for (const key in criteria) {
      if (criteria[key] !== (this as any)[key])
        return false
    }
    return true
  }

  hasAny(criteria: Record<string, any>) {
    for (const key in criteria) {
      if (criteria[key] === (this as any)[key])
        return true
    } return false
  }

  insertChild(entity: any) {
    const found: Array<{ child: any, index: number }> = []; this.children.forEach((child, index) => { if (child && (child === entity || child.getPrimaryKey() === entity.getPrimaryKey())) { found.push({ child, index }) } }); if (found.length > 0) { found.forEach(({ child, index }) => { this.children.splice(index, 1, entity); if (child !== entity) { child.destroy() } }) }
    else { this.children.push(entity) } entity.parent = this
  }

  removeChild(entity: any) {
    if (!this.children)
      return; for (let i = this.children.length - 1; i >= 0; i--) { if (this.children[i] === entity || this.children[i].getPrimaryKey() === entity.getPrimaryKey()) { this.children.splice(i, 1) } }
  }

  removeFromParent() { if (this.parent) { this.parent.removeChild(this) } }
  off(channel: string, fn: Function) { return (this as any).removeListener(channel, fn) }
  assertStorable() {
    if (!(this.constructor as any).toPOJO)
      throw new Error(`BaseModel subclass must implement 'toPOJO'`); if (!(this.constructor as any).fromPOJO)
      throw new Error(`BaseModel subclass must implement 'fromPOJO'`); if (!(BaseModel as any).storage)
      throw new Error(`BaseModel has no 'storage' configured`); if (!this.getStorage())
      throw new Error(`BaseModel has no '${this.getStorageType()} storage' configured`)
  }

  getStorageType() { return this.__storage }
  setStorageType(type: 'mem' | 'disk') {
    if (!(BaseModel as any).storage[type])
      throw new Error(`BaseModel has no storage module '${type}'`); this.__storage = type
  }

  getStorageModule() { return (BaseModel as any).storage[this.getStorageType()] }
  store() { this.assertStorable(); const pojo = (this.constructor as any).toPOJO(this); const key = `${this.getClassName()}-${this.getKeySHA()}`; const storage = this.getStorageModule(); return storage.store(key, pojo) }
  unstore() { this.assertStorable(); const key = `${this.getClassName()}-${this.getKeySHA()}`; const storage = this.getStorageModule(); const pojo = storage.unstore(key); if (pojo) { (this.constructor as any).fromPOJO(pojo) } }
  sync() {
    if (!(BaseModel as any).__sync || !this.__sync || !(this as any).synchronize)
      return; (this as any).synchronize(Object.assign(this.getWireReadyPayload(), { name: 'remote-model:receive-sync', syncIntent: (this.isDestroyed()) ? (BaseModel as any).SYNC_INTENTS.destroy : (BaseModel as any).SYNC_INTENTS.upsert }))
  }

  getWireReadyPayload() { return { className: this.getClassName(), primaryKey: this.getPrimaryKey(), objectAttributes: this.getWireReadyObjectAttributes() } }
  getWireReadyObjectAttributes() { return (BaseModel as any).getWireReadyObjectAttributes(this, true, true) }

  static SYNC_INTENTS = { upsert: 'upsert', destroy: 'destroy' }
  static __sync = false
  static receiveSync = ({ syncIntent, className, primaryKey, objectAttributes }: any) => {
    if (!(BaseModel as any).__sync) { (logger as any).warn(`BaseModel sync not ready to ${syncIntent} ${className} ${primaryKey}`); return }
    if (!(BaseModel as any).SYNC_INTENTS[syncIntent])
      throw new Error(`BaseModel sync intent invalid; cannot receive`)
    let instance
    switch ((BaseModel as any).SYNC_INTENTS[syncIntent]) {
      case (BaseModel as any).SYNC_INTENTS.upsert:
        instance = (BaseModel as any).upsertFromWireObjectAttributes({ className, primaryKey, objectAttributes })
        if (instance) { (instance as any).emit('local-model:handle-sync', { syncIntent }) }
        else { (logger as any).warn(`BaseModel sync could not ${syncIntent} ${className} ${primaryKey}`) }
        break
      case (BaseModel as any).SYNC_INTENTS.destroy:
        instance = (BaseModel as any).instanceFromModelSpec({ className, primaryKey })
        if (instance) { (instance as any).destroy(); (instance as any).emit('local-model:handle-sync', { syncIntent }) }
        else { (logger as any).warn(`BaseModel sync could not ${syncIntent} ${className} ${primaryKey}`) }
        break
    }
  }

  static upsertFromWireObjectAttributes = ({ className, primaryKey, objectAttributes }: any) => {
    const klass = (BaseModel as any).getModelClassByClassName(className)
    if (!klass)
      return
    const upsertSpec: Record<string, any> = {}
    for (const attrKey in objectAttributes) {
      const attrVal = objectAttributes[attrKey]
      if (attrVal && attrVal.__model) { upsertSpec[attrKey] = (BaseModel as any).instanceFromModelSpec(attrVal.__model); continue }
      upsertSpec[attrKey] = reifyRO(attrVal)
    }
    upsertSpec[klass.config.primaryKey] = primaryKey
    return klass.upsert(upsertSpec, { validationOff: true })
  }

  static instanceFromModelSpec = ({ className, primaryKey }: any) => { const klass = (BaseModel as any).getModelClassByClassName(className); const instance = klass && klass.findById(primaryKey); return instance }
  static getWireReadyObjectAttributes = (obj: any, isBase = false, goDeep = false): any => {
    if (typeof obj === 'boolean' || typeof obj === 'number' || typeof obj === 'string' || typeof obj === 'function' || !obj)
      return expressionToRO(obj)
    if (goDeep) {
      if (Array.isArray(obj))
        return obj.map((BaseModel as any).getWireReadyObjectAttributes)
      const out: Record<string, any> = {}
      for (const key in obj) {
        if ((obj as any).hasOwnProperty(key)) {
          if (!RESERVED_PROPERTY_KEYS[key] && (obj as any).constructor.config.primaryKey !== key) {
            const result = (BaseModel as any).getWireReadyObjectAttributes((obj as any)[key], false, false)
            if (result !== undefined)
              out[key] = result
          }
        }
      }
      return out
    }
    if (obj instanceof BaseModel && !goDeep) { return { __model: { className: (obj as any).getClassName(), primaryKey: (obj as any).getPrimaryKey() } } }
  }
}

const RESERVED_PROPERTY_KEYS: Record<string, boolean> = { __checked: true, __destroyed: true, __initialized: true, __marked: true, __proxy: true, __storage: true, __sync: true, __updated: true, _events: true, _eventsCount: true, _maxListeners: true, _updateReceivers: true, addEmitterListener: true, addEmitterListenerIfNotAlreadyRegistered: true, cache: true, children: true, options: true, parent: true, removeEmitterListeners: true, synchronize: true, sync: true, syncDebounced: true, uid: true }

;(BaseModel as any).DEFAULT_OPTIONS = {}
;(BaseModel as any).storage = { mem: new (MemoryStorage as any)(), disk: new (DiskStorage as any)() }
;(BaseModel as any).extensions = []

const KNOWN_MODEL_CLASSES: Record<string, any> = {}
;(BaseModel as any).getModelClassByClassName = (className: string) => KNOWN_MODEL_CLASSES[className]

;(BaseModel as any).extend = function extend(klass: any, opts?: Record<string, any>) {
  if (!klass.extended) {
    createCollection(klass, opts)
    klass.emitter = new EventEmitter()
    klass.emit = (klass.emitter as any).emit.bind(klass.emitter)
    klass.on = (klass.emitter as any).on.bind(klass.emitter)
    (lodash as any).defaults(klass.DEFAULT_OPTIONS, (BaseModel as any).DEFAULT_OPTIONS)
    klass.extended = true
    ;(BaseModel as any).extensions.push(klass)
  }
}

function createCollection(klass: any, opts?: Record<string, any>) {
  KNOWN_MODEL_CLASSES[klass.name] = klass
  klass.config = { primaryKey: 'uid' }
  Object.assign(klass.config, opts)
  const arrayCollection: any[] = []
  const hashmapCollection: Record<string, any> = {}
  klass.idx = (instance: any) => {
    for (let i = 0; i < arrayCollection.length; i++) {
      if (arrayCollection[i] === instance)
        return i
    } return -1
  }
  klass.setInstancePrimaryKey = (instance: any, primaryKey: string) => { if (klass.has(instance)) { delete hashmapCollection[instance.getPrimaryKey()]; instance.setPrimaryKey(primaryKey); hashmapCollection[instance.getPrimaryKey()] = instance } }
  klass.get = (instance: any) => hashmapCollection[instance.getPrimaryKey()] || null
  klass.has = (instance: any) => hashmapCollection[instance.getPrimaryKey()] !== undefined
  klass.add = (instance: any) => { if (!klass.has(instance)) { arrayCollection.push(instance); hashmapCollection[instance.getPrimaryKey()] = instance } }
  klass.remove = (instance: any) => { const idx = klass.idx(instance); if (idx !== -1) { arrayCollection.splice(idx, 1) } delete hashmapCollection[instance.getPrimaryKey()] }
  klass.all = () => arrayCollection
  klass.count = () => klass.all().length
  klass.filter = (iteratee: (instance: any) => boolean) => klass.all().filter(iteratee)
  klass.where = (criteria: Record<string, any>) => klass.filter((instance: any) => instance.hasAll(criteria))
  klass.any = (criteria: Record<string, any>) => klass.filter((instance: any) => instance.hasAll(criteria))
  klass.find = (criteria: Record<string, any>) => { const found = klass.where(criteria); return found && found[0] }
  klass.findById = (id: string) => hashmapCollection[id]
  klass.create = (props: Record<string, any>, opts?: Record<string, any>) => new klass(props, opts)
  klass.upsert = (props: Record<string, any>, opts?: Record<string, any>) => { klass.clearCaches(); const primaryKey = props[klass.config.primaryKey]; const found = klass.findById(primaryKey); if (found) { found.assign(props); found.setOptions(opts); found.__initialized = Date.now(); found.__marked = false; if (found.afterInitialize) { found.afterInitialize() } return found } return klass.create(props, opts) }
  klass.clearCaches = () => { arrayCollection.forEach((item: any) => { item.cache.clear() }) }
  klass.sweep = () => { arrayCollection.forEach((item: any) => { item.sweep() }) }
  klass.purge = () => { while (arrayCollection.length > 0) { arrayCollection[0].destroy() } }
}

export { BaseModel }
