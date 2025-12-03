# Logger 类型定义文档

本文档详细说明了为Logger.js设计的TypeScript类型定义。

## 文件结构

```
packages/haiku-serialization/src/utils/types/
├── Logger.d.ts          # Logger主要类型定义
├── colors.d.ts          # colors模块全局声明
├── winston.d.ts         # winston自定义类型补充
├── index.d.ts           # 类型导出索引文件
└── README.md            # 本文档
```

## 核心类型和接口

### LogLevel

```typescript
export type LogLevel = 'error' | 'warn' | 'info' | 'http' | 'verbose' | 'debug' | 'silly'
```

定义了所有可能的日志级别，与winston的日志级别保持一致。

### LogMessage

```typescript
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
```

描述了日志消息的结构，包含：

- `level`: 日志级别
- `message`: 日志内容，可以是字符串或数组
- `timestamp`: 时间戳
- `view`: 视图标识符
- `tag`: 标签
- `durationMs`: 持续时间（毫秒）
- `noFormat`: 是否跳过格式化
- `doNotLogOnFile`: 是否不写入文件
- `attachedObject`: 附加对象
- 索引签名允许添加额外的元数据

### LoggerOptions

```typescript
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
```

定义了Logger的配置选项：

- `maxsize`: 单个日志文件的最大大小（字节）
- `maxFiles`: 最大文件数量
- `colorize`: 是否启用颜色
- `level`: 默认日志级别
- `json`: 是否使用JSON格式
- `tailable`: 是否可追加
- `format`: winston格式化器
- `transports`: winston传输器数组
- `silent`: 是否静默
- `exitOnError`: 错误时是否退出

### WinstonFileTransportOptions

```typescript
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
```

定义了winston文件传输的配置选项，与winston的FileTransport保持兼容。

### HaikuFormatOptions

```typescript
export interface HaikuFormatOptions {
  view?: string
  tag?: string
  durationMs?: number
  noFormat?: boolean
  doNotLogOnFile?: boolean
  attachedObject?: any
}
```

定义了Haiku特定格式化选项，用于自定义日志输出格式。

### FormatTransformFunction

```typescript
export type FormatTransformFunction = (
  info: LogMessage,
  opts?: HaikuFormatOptions
) => string | boolean | void
```

定义了格式化转换函数的类型，用于winston的format.printf方法。

### ConsoleMethod

```typescript
export type ConsoleMethod = (
  ...args: any[]
) => void
```

定义了控制台方法的类型，用于Logger中回退到控制台的方法。

### LogMeta

```typescript
export type LogMeta = {
  view?: string
  tag?: string
  durationMs?: number
  noFormat?: boolean
  doNotLogOnFile?: boolean
  attachedObject?: any
} & Record<string, any>
```

定义了日志元数据类型，包含常用的元数据字段，并允许额外的自定义字段。

### LoggerConfig

```typescript
export type LoggerConfig = LoggerOptions & {
  folder?: string
  relpath?: string
}
```

定义了Logger的完整配置类型，结合了LoggerOptions和路径配置。

### LoggerClass

```typescript
export interface LoggerClass extends EventEmitter {
  readonly logger: any // winston.Logger instance
  view: string

  constructor: (folder?: string, relpath?: string, options?: LoggerOptions) => void

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
```

定义了Logger类的接口，继承自EventEmitter，包含所有winston方法和控制台回退方法。

### formatJsonLogToString函数

```typescript
export declare function formatJsonLogToString(message: LogMessage): string
```

定义了formatJsonLogToString函数的类型，用于将日志消息格式化为字符串。

## 全局声明

### colors.d.ts

处理colors@1.1.2模块对String原型的扩展，声明了所有colors添加的字符串方法，避免了TypeScript类型错误。

### winston.d.ts

提供了winston 3.0.0的自定义类型补充，解决了与@types/winston 2.4.4的版本兼容性问题。

## 使用示例

```typescript
import { LoggerClass, LoggerOptions, LogLevel } from './types'

const options: LoggerOptions = {
  level: 'info',
  maxsize: 1000000,
  maxFiles: 1,
  colorize: true
}

const logger = new LoggerClass('/path/to/logs', 'app.log', options)

logger.info('This is an info message')
logger.error('This is an error message', { additionalData: 'value' })
```

## 设计原则

1. **类型安全**: 所有接口都有明确的属性类型，避免使用`any`类型
2. **可选属性**: 使用`?`标记可选属性，确保灵活性
3. **兼容性**: 与现有的winston库和colors模块兼容
4. **扩展性**: 通过索引签名和额外属性允许扩展
5. **模块化**: 将不同类型的定义分离到不同文件，便于维护
6. **文档完整**: 每个类型和接口都有详细的注释说明

## 注意事项

1. colors模块的String原型扩展是一个全局影响，colors.d.ts文件必须在项目中导入
2. winston.d.ts使用了WinstonLogger接口名称，避免与原有的Logger类冲突
3. 所有类型定义都遵循TypeScript严格模式的要求
4. 索引文件(index.d.ts)提供了统一的导出接口，便于其他模块导入
