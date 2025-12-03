/* eslint-disable no-console */
// 导入类型定义
import type {
  LoggerClass,
  LoggerOptions,
  LogMessage,
  WinstonFileTransportOptions,
} from './types'
import { EventEmitter } from 'node:events'
import * as path from 'node:path'
import jsonStringify from 'fast-safe-stringify'
import { isProduction, isWindows } from 'haiku-common'

import * as winston from 'winston'

// 导入colors以启用字符串扩展
import 'colors' // TODO: use non-string-extending module

/**
 * 格式化JSON日志消息为字符串
 * @param message 日志消息对象
 * @returns 格式化后的字符串
 */
function formatJsonLogToString(message: LogMessage): string {
  if (message.noFormat) {
    return message.message as string
  }

  if (Array.isArray(message.message)) {
    message.message = message.message.map((msg: string | any) => {
      if (typeof msg === 'string') {
        return msg
      }
      return jsonStringify(msg)
    }).join(' ')
  }

  // Pading is done to visually align on file
  return `${message.timestamp}|${message.view?.padEnd(8)}|${message.level}${message.tag ? `|${message.tag}` : ''}${message.durationMs ? `|d=${message.durationMs}` : ''}|${message.message}`
}

/**
 * 控制日志消息格式输出
 */
const haikuFormat = winston.format.printf((info: LogMessage, _opts?: any): string => {
  return formatJsonLogToString(info)
})

// 忽略具有 { doNotLogOnFile: true } 的日志消息
// 需要避免在管道中重复写入日志文件
const ignoreDoNotWriteToFile = winston.format((info: any, _opts?: any): any => {
  if (info.doNotLogOnFile) {
    return false
  }
  return info
})

const DEFAULTS: LoggerOptions = {
  maxsize: 1000000,
  maxFiles: 1,
  colorize: true,
}

class Logger extends EventEmitter implements LoggerClass {
  public readonly logger: any
  public view: string

  constructor(folder?: string, relpath?: string, options: LoggerOptions = {}) {
    super()

    const config: LoggerOptions = Object.assign({}, DEFAULTS, options)

    const transports: any[] = []

    if (folder && relpath) {
      const filename = path.join(folder, relpath)
      transports.push(new winston.transports.File({
        filename,
        tailable: true,
        maxsize: config.maxsize,
        maxFiles: config.maxFiles,
        colorize: config.colorize,
        level: 'info',
        json: false,
        format: winston.format.combine(
          ignoreDoNotWriteToFile(),
          haikuFormat,
        ),
      } as WinstonFileTransportOptions))
    }

    // 在生产环境中，我们不需要将日志发送到开发控制台
    // 在Windows上，我们的日志库(winston)在stdout上有问题
    if (!isProduction() && !isWindows()) {
      transports.push(new winston.transports.Console({
        format: winston.format.combine(
          haikuFormat,
        ),
      }))
    }

    this.logger = winston.createLogger({
      format: winston.format.combine(
        winston.format.timestamp(),
      ),
      transports,
    })

    // 允许消费者配置我们记录日志的视图前缀
    this.view = '?'
  }

  raw(jsonMessage: any): void {
    this.logger.log(jsonMessage)
  }

  info(...args: any[]): void {
    this.logger.info(args, { view: this.view })
  }

  traceInfo(tag: string, message: string, attachedObject?: any): void {
    this.logger.info(message, { view: this.view, tag, attachedObject })
  }

  debug(...args: any[]): void {
    this.logger.debug(args, { view: this.view })
  }

  warn(...args: any[]): void {
    this.logger.warn(args, { view: this.view })
  }

  error(...args: any[]): void {
    this.logger.error(args, { view: this.view })
  }

  /**
   * 不被winston支持的方法回退到console
   */

  assert(...args: any[]): void {
    console.assert(...args)
  }

  count(...args: any[]): void {
    console.count(...args)
  }

  countReset(...args: any[]): void {
    console.countReset(...args)
  }

  dir(...args: any[]): void {
    console.dir(...args)
  }

  dirxml(...args: any[]): void {
    console.dirxml(...args)
  }

  exception(...args: any[]): void {
    // 使用console.error作为console.exception的替代，因为console.exception不是标准API
    console.error(...args)
  }

  group(...args: any[]): void {
    if (typeof console.group === 'function') {
      console.group(...args)
    }
  }

  groupCollapsed(...args: any[]): void {
    if (typeof console.groupCollapsed === 'function') {
      console.groupCollapsed(...args)
    }
  }

  groupEnd(_args: any[]): void {
    if (typeof console.groupEnd === 'function') {
      console.groupEnd()
    }
  }

  profileEnd(...args: any[]): void {
    // console.profileEnd不是标准API，使用console.log作为替代
    console.profileEnd ? console.profileEnd(...args) : console.log(...args)
  }

  select(...args: any[]): void {
    // console.select不是标准API，使用console.log作为替代
    console.log(...args)
  }

  table(...args: any[]): void {
    console.table(...args)
  }

  time(...args: any[]): void {
    this.logger.profile(args, { view: this.view })
  }

  timeLog(...args: any[]): void {
    if (typeof console.timeLog === 'function') {
      console.timeLog(...args)
    }
  }

  timeEnd(...args: any[]): void {
    this.logger.profile(args, { view: this.view })
  }

  trace(...args: any[]): void {
    console.trace(...args)
  }
}

export { formatJsonLogToString, Logger }
export default Logger
