/**
 * Logger类型定义的索引文件
 * 导出所有Logger相关的类型和接口
 */

// 导出主要类型定义
// 为了避免命名冲突，我们重新导出一些关键类型
import { ConsoleMethod, FormatTransformFunction, HaikuFormatOptions, LoggerClass, LoggerConfig, LoggerConstructor, LoggerOptions, LogLevel, LogMessage, LogMeta, WinstonFileTransportOptions } from './Logger'

// 导出colors全局声明
export * from './colors'

export * from './Logger'

// 导出winston自定义类型
export * from './winston'

export {
  ConsoleMethod,
  FormatTransformFunction,
  HaikuFormatOptions,
  LoggerClass,
  LoggerConfig,
  LoggerConstructor,
  LoggerOptions,
  LogLevel,
  LogMessage,
  LogMeta,
  WinstonFileTransportOptions,
}
