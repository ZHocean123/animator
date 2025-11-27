/* eslint-disable node/prefer-global/process */
import { EventEmitter } from 'node:events'

type Listener = (...args: unknown[]) => void

interface ManagedTarget {
  on?: (event: string, listener: Listener) => void
  addEventListener?: (event: string, listener: Listener, options?: unknown) => void
  removeListener?: (event: string, listener: Listener) => void
  _emitterManagerListenersRegistered?: Record<string, Listener>
}

class EmitterManager {
  private _emitters: Array<[ManagedTarget, string, Listener]> = []

  addEmitterListener(eventEmitter: ManagedTarget, eventName: string, eventHandler: Listener, options?: unknown) {
    this._emitters.push([eventEmitter, eventName, eventHandler])
    if (eventEmitter.on) {
      eventEmitter.on(eventName, eventHandler)
    }
    else if (eventEmitter.addEventListener) {
      eventEmitter.addEventListener(eventName, eventHandler, options)
    }
  }

  addEmitterListenerIfNotAlreadyRegistered(eventEmitter: ManagedTarget, eventName: string, eventHandler: Listener) {
    if (!eventEmitter._emitterManagerListenersRegistered) {
      eventEmitter._emitterManagerListenersRegistered = {}
    }
    if (!eventEmitter._emitterManagerListenersRegistered[eventName]) {
      eventEmitter._emitterManagerListenersRegistered[eventName] = eventHandler
      this.addEmitterListener(eventEmitter, eventName, eventHandler)
    }
  }

  removeEmitterListeners() {
    this._emitters.forEach((tuple) => {
      const [emitter, event, handler] = tuple
      emitter.removeListener && emitter.removeListener(event, handler)
    })
  }

  static extend<T extends object>(instance: T): T {
    const emitterManager = new EmitterManager()
    const propertyNames = Object.getOwnPropertyNames(EmitterManager.prototype)
    propertyNames.forEach((propertyName) => {
      if (propertyName === 'constructor')
        return
      const foundProperty = (emitterManager as any)[propertyName]
      if (typeof foundProperty === 'function') {
        ;(instance as any)[propertyName] = foundProperty.bind(emitterManager)
      }
    })
    return instance
  }
}

// Prevent trigger-happy MaxListenersExceededWarning
if (process.env.NODE_ENV === 'staging' || process.env.NODE_ENV === 'production') {
  ;(EventEmitter as any).prototype._maxListeners = Infinity
}
else {
  ;(EventEmitter as any).prototype._maxListeners = 500
}
export default EmitterManager
