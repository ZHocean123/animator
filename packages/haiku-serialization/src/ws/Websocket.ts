import { EventEmitter } from 'node:events'
import util from 'node:util'
import logger from './../utils/LoggerInstance'
import serializeError from './../utils/serializeError'

const STATES = { CONNECTING: 0, OPEN: 1, CLOSING: 2, CLOSED: 3 }

function Websocket(this: any, url: string, folder: string, clientType: string, clientAlias: string, WebSocket?: any, token?: string) {
  EventEmitter.call(this)
  this.WebSocket = WebSocket || (typeof window !== 'undefined' ? (window as any).WebSocket : undefined)
  if (!url)
    throw new Error('A url is required')
  if (!clientType)
    throw new Error('A client type is required')
  if (!clientType)
    throw new Error('A client type is required')
  if (!folder)
    logger.warn('[websocket] received no folder argument')
  this.url = `${url}?type=${clientType}&alias=${clientAlias}`
  if (folder)
    this.url += `&folder=${folder}`
  if (token)
    this.url += `&token=${token}`
  this.folder = folder
  this.requests = {}
  this.workers = { connection: setInterval(() => {
    if (this._isPermanentlyDisconnected)
      return null; if (this.ws.readyState === STATES.CLOSING || this.ws.readyState === STATES.CLOSED) { this.connect() }
  }, 1000) }
  this._isPermanentlyDisconnected = false
  this.connect()
}

util.inherits(Websocket as any, EventEmitter as any)

;(Websocket as any).prototype.disconnect = function disconnect(this: any) {
  this._isPermanentlyDisconnected = true
  this.requests = {}
  if (this.ws) {
    if (this.ws.readyState === STATES.OPEN || this.ws.readyState === STATES.CONNECTING)
      this.ws.close()
  }
}

;(Websocket as any).prototype.connect = function connect(this: any, cb?: () => any) {
  this._isPermanentlyDisconnected = false
  const WebSocket = this.WebSocket
  if (this.ws) {
    if (this.ws.readyState === STATES.CLOSING || this.ws.readyState === STATES.CLOSED) { this.ws = new WebSocket(this.url); this.setupSocket() }
  }
  else { this.ws = new WebSocket(this.url); this.setupSocket() }
  if (cb)
    return this.whenConnected(cb)
}

;(Websocket as any).prototype.setupSocket = function setupSocket(this: any) {
  logger.info(`[websocket] connecting to ${this.url} (${this.folder || '?'})`)
  this.ws.onopen = () => { logger.info(`[websocket] connection opened (${this.url})`); this.emit('open') }
  this.ws.onclose = () => { logger.info(`[websocket] connection closed (${this.url})`); this.ws.readyState = this.WebSocket.CLOSED; this.emit('close') }
  this.ws.onerror = (error: any) => {
    if (error && error.message) { logger.error(`[websocket] error: ${error}` && error.message) }
    else { logger.error('[websocket] error: ', error || 'Unknown') } this.emit('error', error)
  }
  this.ws.onmessage = (event: any) => {
    const message = JSON.parse(event.data)
    if (message.type === 'broadcast')
      return this.emit('broadcast', message)
    if (message.type === 'signal')
      return this.emit('signal', message)
    if (message.type === 'relay')
      return this.emit('relay', message)
    if (this.requests[message.id]) { const entry = this.requests[message.id]; delete this.requests[message.id]; const callback = entry.callback; const error = (message.error) ? serializeError(message.error) : null; const result = message.result; return callback(error, result) }
    if (typeof message.method === 'string') { return this.emit('method', message.method, message.params || [], message, (error: any, result: any) => { return this.sendWhenConnected({ id: message.id, folder: message.folder || this.folder, result: (result !== undefined) ? result : void (0), error: (error) ? serializeError(error) : void (0) }) }) }
    return this.emit('message', message)
  }
  return this.ws
}

;(Websocket as any).prototype.whenConnected = function whenConnected(this: any, cb: () => any) {
  if (this.ws.readyState === STATES.OPEN)
    return cb()
  return setTimeout(() => this.whenConnected(cb), 100)
}

;(Websocket as any).prototype.sendWhenConnected = function sendWhenConnected(this: any, message: any) {
  if (this.ws.readyState === STATES.OPEN)
    return this.sendImmediate(message)
  return this.whenConnected(() => this.sendImmediate(message))
}

;(Websocket as any).prototype.sendImmediate = function sendImmediate(this: any, message: any) {
  if (this.ws.readyState === STATES.OPEN)
    return this.sendPayload(message)
  logger.warn(`[websocket] connection not open (state: ${this.ws.readyState})!`)
}

;(Websocket as any).prototype.sendPayload = function sendPayload(this: any, message: any) {
  if (typeof message !== 'string') { if (!message.folder) { message.folder = this.folder } message = JSON.stringify(message) }
  return this.ws.send(message)
}

;(Websocket as any).prototype.send = function send(this: any, message: any) {
  if (!message.folder) { message.folder = this.folder }
  if (!message.alias) { message.alias = this.alias }
  return this.sendWhenConnected(message)
}

;(Websocket as any).prototype.request = function request(this: any, message: any, callback: (...args: any[]) => any) {
  if (message.id === undefined) { message.id = (`request-${Math.random()}`) }
  let gotResponse = false
  let timedOut = false
  let timeoutInstance: any = null
  if (message.timeout) { timeoutInstance = setTimeout(() => { if (!gotResponse) { timedOut = true; if (typeof message.retry === 'number' && message.retry > 0) { message.retry -= 1; return this.request(message, callback) } const error: any = new Error('Timed out waiting for response'); error.code = 'ETIMEOUT'; callback(error) } }, message.timeout) }
  this.requests[message.id] = { callback: (err: any, a: any, b: any, c: any, d: any, e: any, f: any) => {
    gotResponse = true; if (timeoutInstance)
      clearTimeout(timeoutInstance); if (!timedOut) { callback(err, a, b, c, d, e, f) }
  } }
  return this.send(message)
}

;(Websocket as any).prototype.method = function method(this: any, method: string, params: any[], cb: (...args: any[]) => any) { return this.request({ method, params: params || [] }, cb) }
;(Websocket as any).prototype.action = function action(this: any, method: string, params: any[], cb: (...args: any[]) => any, folder?: string) { return this.request({ type: 'action', method, params: params || [], folder }, cb) }

export default (Websocket as any)
export { Websocket }
