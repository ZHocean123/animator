import { EventEmitter } from 'node:events'

const ACTIVE_LOCKS: Record<string, boolean> = {}

const LOCKS = {
  ActiveComponentWork: 'ActiveComponentWork',
  ActiveComponentReload: 'ActiveComponentReload',
  FilePerformComponentWork: 'FilePerformComponentWork',
  FileReadWrite: (abspath: string) => `FileReadWrite:${abspath}`,
  ProjectMethodHandler: 'ProjectMethodHandler',
  ActionStackUndoRedo: 'ActionStackUndoRedo',
  SetCurrentActiveComponent: 'SetCurrentActiveComponent',
}

const emitter = new EventEmitter()

function request(key: string, emit: boolean, cb: (release: () => void) => any) {
  if (!key)
    throw new Error('Lock key must be truthy')
  if (ACTIVE_LOCKS[key])
    return setTimeout(() => request(key, emit, cb), 0)
  ACTIVE_LOCKS[key] = true
  if (emit)
    emitter.emit('lock-on', key)
  const release = () => {
    if (emit)
      emitter.emit('lock-off', key)
    ACTIVE_LOCKS[key] = false
  }
  return cb(release)
}

function awaitFree(keys: string[], cb: () => any) {
  let anyLocked = false
  keys.forEach((key) => {
    if (ACTIVE_LOCKS[key])
      anyLocked = true
  })
  if (anyLocked)
    return setTimeout(() => awaitFree(keys, cb), 100)
  return cb()
}

const awaitAllLocksFree = (cb: () => any) => awaitFree(Object.keys(ACTIVE_LOCKS), cb)

function awaitAllLocksFreeExcept(keys: string[], cb: () => any) {
  const allKeys = Object.keys(ACTIVE_LOCKS).filter(key => !keys.includes(key))
  return awaitFree(allKeys, cb)
}

const Lock = { request, emitter, awaitFree, awaitAllLocksFree, awaitAllLocksFreeExcept, LOCKS, ACTIVE_LOCKS }

export default Lock
export { ACTIVE_LOCKS, awaitAllLocksFree, awaitAllLocksFreeExcept, awaitFree, emitter, Lock, LOCKS, request }
