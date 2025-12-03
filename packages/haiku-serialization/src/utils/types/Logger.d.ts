import type { EventEmitter } from 'node:events'

/**
 * 日志级别类型
 */
export type LogLevel = 'error' | 'warn' | 'info' | 'http' | 'verbose' | 'debug' | 'silly'

/**
 * 日志消息接口
 */
export interface LogMessage {
  level: LogLevel
  message: string | any[]
  timestamp?: string
  view?: string
  tag?: string
  durationMs?: number
  noFormat?: boolean
  doNotLogOnFile?: boolean
  attachedObject?: any
  [key: string]: any // 允许额外的元数据
}

/**
 * Logger配置选项接口
 */
export interface LoggerOptions {
  maxsize?: number
  maxFiles?: number
  colorize?: boolean
  level?: LogLevel
  json?: boolean
  tailable?: boolean
  format?: any // winston format
  transports?: any[] // winston transports
  silent?: boolean
  exitOnError?: boolean
}

/**
 * Winston文件传输选项接口
 */
export interface WinstonFileTransportOptions {
  filename: string
  tailable?: boolean
  maxsize?: number
  maxFiles?: number
  colorize?: boolean
  level?: LogLevel
  json?: boolean
  format?: any
  zippedArchive?: boolean
  options?: any
}

/**
 * Haiku格式化选项接口
 */
export interface HaikuFormatOptions {
  view?: string
  tag?: string
  durationMs?: number
  noFormat?: boolean
  doNotLogOnFile?: boolean
  attachedObject?: any
}

/**
 * 格式化转换函数类型
 */
export type FormatTransformFunction = (
  info: LogMessage,
  opts?: HaikuFormatOptions,
) => string | boolean | void

/**
 * 控制台方法类型
 */
export type ConsoleMethod = (
  ...args: any[]
) => void

/**
 * 日志元数据类型
 */
export type LogMeta = {
  view?: string
  tag?: string
  durationMs?: number
  noFormat?: boolean
  doNotLogOnFile?: boolean
  attachedObject?: any
} & Record<string, any>

/**
 * Logger配置类型
 */
export type LoggerConfig = LoggerOptions & {
  folder?: string
  relpath?: string
}

/**
 * Logger类接口
 */
export interface LoggerClass extends EventEmitter {
  readonly logger: any // winston.Logger instance
  view: string

  // Winston methods
  raw: (jsonMessage: any) => void
  info: (...args: any[]) => void
  traceInfo: (tag: string, message: string, attachedObject?: any) => void
  debug: (...args: any[]) => void
  warn: (...args: any[]) => void
  error: (...args: any[]) => void
  time: (...args: any[]) => void
  timeEnd: (...args: any[]) => void

  // Console fallback methods
  assert: ConsoleMethod
  count: ConsoleMethod
  countReset: ConsoleMethod
  dir: ConsoleMethod
  dirxml: ConsoleMethod
  exception: ConsoleMethod
  group: ConsoleMethod
  groupCollapsed: ConsoleMethod
  groupEnd: ConsoleMethod
  profileEnd: ConsoleMethod
  select: ConsoleMethod
  table: ConsoleMethod
  timeLog: ConsoleMethod
  trace: ConsoleMethod
}

/**
 * Logger类构造函数接口
 */
export interface LoggerConstructor {
  new(folder?: string, relpath?: string, options?: LoggerOptions): LoggerClass
}

/**
 * formatJsonLogToString函数类型
 */
export declare function formatJsonLogToString(message: LogMessage): string
