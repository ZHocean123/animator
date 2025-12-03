/**
 * 全局声明文件，用于处理colors模块对String原型的扩展
 * 这解决了colors@1.1.2模块扩展String原型的问题
 */

declare global {
  interface String {
    // 基本颜色方法
    black?: string
    red?: string
    green?: string
    yellow?: string
    blue?: string
    magenta?: string
    cyan?: string
    white?: string
    gray?: string
    grey?: string

    // 样式方法
    reset?: string
    bold?: string
    dim?: string
    italic?: string
    underline?: string
    inverse?: string
    hidden?: string
    strikethrough?: string

    // 背景颜色方法
    bgBlack?: string
    bgRed?: string
    bgGreen?: string
    bgYellow?: string
    bgBlue?: string
    bgMagenta?: string
    bgCyan?: string
    bgWhite?: string

    // 其他可能的colors方法
    rainbow?: string
    zebra?: string
    america?: string
    trap?: string
    random?: string
  }
}

// 确保这是一个模块而不是全局脚本
export {}
