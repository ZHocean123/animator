/* eslint-disable no-console */
import { EventEmitter } from 'node:events'
import * as path from 'node:path'
import jsonStringify from 'fast-safe-stringify'
import { isProduction, isWindows } from 'haiku-common'
import * as winston from 'winston'
import 'colors'

export interface HaikuLogInfo {
  timestamp?: string
  view?: string
  level?: string
  tag?: string
  durationMs?: number
  message: unknown | unknown[]
  noFormat?: boolean
  doNotLogOnFile?: boolean
}

export function formatJsonLogToString(message: HaikuLogInfo): string {
  if (message.noFormat)
    return String((message as any).message)
  const msg = message.message
  if (Array.isArray(msg)) {
    const formatted = msg.map(m => (typeof m === 'string' ? m : jsonStringify(m))).join(' ')
    ;(message as any).message = formatted
  }
  return `${message.timestamp}|${(message.view || '?').padEnd(8)}|${message.level || ''}${message.tag ? `|${message.tag}` : ''}${message.durationMs ? `|d=${message.durationMs}` : ''}|${message.message}`
}

const haikuFormat = winston.format.printf((info: any) => {
  return formatJsonLogToString(info as HaikuLogInfo)
})

const ignoreDoNotWriteToFile = winston.format((info: any) => {
  if (info.doNotLogOnFile)
    return false as any
  return info
})

const DEFAULTS = {
  maxsize: 1000000,
  maxFiles: 1,
  colorize: true,
}

export class Logger extends EventEmitter {
  private logger: winston.Logger
  public view = '?'

  constructor(folder?: string, relpath?: string, options: Partial<typeof DEFAULTS> = {}) {
    super(options as any)
    const config = Object.assign({}, DEFAULTS, options)
    const transports: winston.transport[] = []

    if (folder && relpath) {
      const filename = path.join(folder, relpath)
      transports.push(
        new (winston.transports as any).File({
          filename,
          tailable: true,
          maxsize: config.maxsize,
          maxFiles: config.maxFiles,
          colorize: (config as any).colorize,
          level: 'info',
          json: false,
          format: winston.format.combine(ignoreDoNotWriteToFile(), haikuFormat),
        }),
      )
    }

    if (!isProduction() && !isWindows()) {
      transports.push(
        new (winston.transports as any).Console({
          format: winston.format.combine(haikuFormat),
        }),
      )
    }

    this.logger = winston.createLogger({
      format: winston.format.combine(winston.format.timestamp()),
      transports,
    })
  }

  raw(jsonMessage: HaikuLogInfo) {
    this.logger.log(jsonMessage as any)
  }

  info(...args: unknown[]) {
    this.logger.info(args as any, { view: this.view } as any)
  }

  traceInfo(tag: string, message: unknown, attachedObject?: unknown) {
    this.logger.info(message as any, { view: this.view, tag, attachedObject } as any)
  }

  debug(...args: unknown[]) {
    this.logger.debug(args as any, { view: this.view } as any)
  }

  warn(...args: unknown[]) {
    this.logger.warn(args as any, { view: this.view } as any)
  }

  error(...args: unknown[]) {
    this.logger.error(args as any, { view: this.view } as any)
  }

  assert(...args: unknown[]) { console.assert(...(args as any)) }
  count(...args: unknown[]) { console.count(...(args as any)) }
  countReset(...args: unknown[]) { console.countReset(...(args as any)) }
  dir(...args: unknown[]) { console.dir(...(args as any)) }
  dirxml(...args: unknown[]) { console.dirxml && (console as any).dirxml(...(args as any)) }
  exception(...args: unknown[]) { (console as any).exception && (console as any).exception(...(args as any)) }
  group(...args: unknown[]) { console.group(...(args as any)) }
  groupCollapsed(...args: unknown[]) { console.groupCollapsed(...(args as any)) }
  groupEnd(...args: unknown[]) { console.groupEnd(...(args as any)) }
  profileEnd(...args: unknown[]) { console.profileEnd && (console as any).profileEnd(...(args as any)) }
  select(...args: unknown[]) { (console as any).select && (console as any).select(...(args as any)) }
  table(...args: unknown[]) { console.table(...(args as any)) }
  time(...args: unknown[]) { this.logger.profile && (this.logger as any).profile(args as any, { view: this.view }) }
  timeLog(...args: unknown[]) { console.timeLog && (console as any).timeLog(...(args as any)) }
  timeEnd(...args: unknown[]) { this.logger.profile && (this.logger as any).profile(args as any, { view: this.view }) }
  trace(...args: unknown[]) { console.trace(...(args as any)) }
}

export default { Logger, formatJsonLogToString }
