/**
 * Electron API 的全局类型定义
 * 用于在渲染进程中提供 window.electronAPI 的类型支持
 */
import type { OpenDialogOptions, OpenDialogReturnValue, SaveDialogOptions, SaveDialogReturnValue } from 'electron'

// Creator 窗口的 electronAPI 类型
export interface CreatorElectronAPI {
  window: {
    destroy: () => Promise<void>
    close: () => Promise<void>
    openDevTools: () => Promise<void>
    closeDevTools: () => Promise<void>
    isDevToolsFocused: () => Promise<boolean>
  }
  dialog: {
    showOpenDialog: (options: OpenDialogOptions) => Promise<OpenDialogReturnValue>
    showSaveDialog: (options: SaveDialogOptions) => Promise<SaveDialogReturnValue>
  }
  send: (channel: string, ...args: unknown[]) => void
  on: (channel: string, callback: (...args: unknown[]) => void) => () => void
  removeAllListeners: (channel: string) => void
}

// Webview (Glass/Timeline) 的 electronAPI 类型
export interface WebviewElectronAPI {
  webContents: {
    openDevTools: () => Promise<void>
    closeDevTools: () => Promise<void>
    isDevToolsFocused: () => Promise<boolean>
  }
  send: (channel: string, ...args: unknown[]) => void
}

// 全局 Window 接口扩展
declare global {
  interface Window {
    electronAPI: CreatorElectronAPI | WebviewElectronAPI
  }
}
