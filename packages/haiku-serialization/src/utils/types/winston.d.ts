/**
 * Winston库的自定义类型补充定义
 * 这解决了winston 3.0.0与@types/winston 2.4.4之间的版本兼容性问题
 */

import type { FormatTransformFunction, LogLevel, LogMessage, LogMeta, WinstonFileTransportOptions } from './Logger'

declare module 'winston' {
  namespace format {
    /**
     * 创建自定义格式化函数
     */
    function printf(transform: FormatTransformFunction): any

    /**
     * 组合多个格式化器
     */
    function combine(...formats: any[]): any

    /**
     * 添加时间戳
     */
    function timestamp(options?: { format?: string, alias?: string }): any

    /**
     * 创建一个转换格式，可以根据条件过滤信息
     */
    function transform(info: LogMessage, opts: any): any
  }

  namespace transports {
    /**
     * 文件传输类
     */
    class File {
      constructor(options: WinstonFileTransportOptions)
    }

    /**
     * 控制台传输类
     */
    class Console {
      constructor(options?: {
        level?: LogLevel
        format?: any
        handleExceptions?: boolean
        handleRejections?: boolean
        colorize?: boolean
        silent?: boolean
      })
    }
  }

  /**
   * Winston Logger实例接口
   */
  interface WinstonLogger {
    /**
     * 记录日志信息
     */
    log: (info: LogMessage) => void

    /**
     * 记录信息级别日志
     */
    info: (message: any, meta?: LogMeta) => void

    /**
     * 记录调试级别日志
     */
    debug: (message: any, meta?: LogMeta) => void

    /**
     * 记录警告级别日志
     */
    warn: (message: any, meta?: LogMeta) => void

    /**
     * 记录错误级别日志
     */
    error: (message: any, meta?: LogMeta) => void

    /**
     * 记录性能分析信息
     */
    profile: (message: any, meta?: LogMeta) => void

    /**
     * 添加传输器
     */
    add: (transport: any) => WinstonLogger

    /**
     * 移除传输器
     */
    remove: (transport: any) => WinstonLogger

    /**
     * 清除所有传输器
     */
    clear: () => WinstonLogger

    /**
     * 关闭日志记录器
     */
    close: () => void

    /**
     * 查询日志
     */
    query: (options?: any, callback?: (err: Error, results: any) => void) => any

    /**
     * 流式查询日志
     */
    stream: (options?: any) => any

    /**
     * 开始性能分析
     */
    startTimer: () => any
  }

  /**
   * 创建新的日志记录器实例
   */
  function createLogger(options: {
    level?: LogLevel
    format?: any
    transports?: any[]
    exitOnError?: boolean
    silent?: boolean
    handleExceptions?: boolean
    handleRejections?: boolean
  }): WinstonLogger

  /**
   * 日志级别映射
   */
  const levels: {
    error: number
    warn: number
    info: number
    http: number
    verbose: number
    debug: number
    silly: number
  }

  /**
   * 默认日志级别
   */
  let level: string

  /**
   * 日志格式化器
   */
  const format: typeof format

  /**
   * 传输器
   */
  const transports: typeof transports

  /**
   * 异常处理器
   */
  const exceptions: {
    handle: (...types: any[]) => void
    unhandle: (...types: any[]) => void
    getCatcher: () => (error: Error) => void
  }

  /**
   * 拒绝处理器
   */
  const rejections: {
    handle: (...types: any[]) => void
    unhandle: (...types: any[]) => void
  }

  /**
   * 性能分析器
   */
  const profile: (id: string) => void

  /**
   * 日志流
   */
  let stream: any
}
