/**
 * Creator 窗口的 preload 脚本
 * 使用 contextBridge 安全地暴露 Electron API 给渲染进程
 */
import { contextBridge, ipcRenderer } from 'electron'

// 允许发送的 IPC 通道白名单
const ALLOWED_SEND_CHANNELS = [
  'topmenu:update',
  'restart',
  'protocol:register',
  'protocol:unregister',
  'app:check-updates',
]

// 允许接收的 IPC 通道白名单
const ALLOWED_RECEIVE_CHANNELS = [
  'haiku',
  'global-menu:open-dev-tools',
  'global-menu:close-dev-tools',
  'global-menu:carbonite-snapshot',
  'global-menu:open-finder',
  'global-menu:open-terminal',
  'global-menu:open-text-editor',
  'global-menu:check-updates',
  'global-menu:show-changelog',
  'global-menu:set-active-component',
  'global-menu:zoom-in',
  'global-menu:zoom-out',
  'global-menu:reset-viewport',
  'global-menu:group',
  'global-menu:ungroup',
  'global-menu:undo',
  'global-menu:redo',
  'global-menu:copy',
  'global-menu:cut',
  'global-menu:paste',
  'global-menu:selectAll',
  'global-menu:show-new-project-modal',
  'global-menu:preview',
  'global-menu:start-tour',
  'global-menu:save',
  'global-menu:save-as',
  'open-url:fork',
]

// 定义暴露给渲染进程的 API
const electronAPI = {
  // 窗口操作
  window: {
    destroy: () => ipcRenderer.invoke('window:destroy'),
    close: () => ipcRenderer.invoke('window:close'),
    openDevTools: () => ipcRenderer.invoke('window:open-dev-tools'),
    closeDevTools: () => ipcRenderer.invoke('window:close-dev-tools'),
    isDevToolsFocused: () => ipcRenderer.invoke('window:is-dev-tools-focused'),
  },

  // 对话框操作
  dialog: {
    showOpenDialog: (options: Electron.OpenDialogOptions) =>
      ipcRenderer.invoke('dialog:show-open-dialog', options),
    showSaveDialog: (options: Electron.SaveDialogOptions) =>
      ipcRenderer.invoke('dialog:show-save-dialog', options),
  },

  // Shell 操作
  shell: {
    openExternal: (url: string) => ipcRenderer.invoke('shell:open-external', url),
    showItemInFolder: (abspath: string) => ipcRenderer.invoke('shell:show-item', abspath),
  },

  // 剪贴板
  clipboard: {
    writeText: (text: string) => ipcRenderer.invoke('clipboard:write-text', text),
  },

  // 只读文件系统
  fs: {
    readFile: (abspath: string) => ipcRenderer.invoke('fs:read-file', abspath),
    readdir: (abspath: string) => ipcRenderer.invoke('fs:readdir', abspath),
  },

  // Node 模块解析
  module: {
    resolve: (pkg: string, rel: string) => ipcRenderer.invoke('module:resolve', { pkg, rel }),
  },

  // 发送消息到主进程（白名单通道）
  send: (channel: string, ...args: unknown[]) => {
    if (ALLOWED_SEND_CHANNELS.includes(channel)) {
      ipcRenderer.send(channel, ...args)
    }
    else {
      console.warn(`[preload] 不允许发送到通道: ${channel}`)
    }
  },

  // 监听来自主进程的消息（白名单通道）
  on: (channel: string, callback: (...args: unknown[]) => void) => {
    if (ALLOWED_RECEIVE_CHANNELS.includes(channel)) {
      const subscription = (_event: Electron.IpcRendererEvent, ...args: unknown[]) => callback(...args)
      ipcRenderer.on(channel, subscription)
      // 返回取消订阅函数
      return () => {
        ipcRenderer.removeListener(channel, subscription)
      }
    }
    else {
      console.warn(`[preload] 不允许监听通道: ${channel}`)
      return () => {}
    }
  },

  // 移除所有监听器
  removeAllListeners: (channel: string) => {
    if (ALLOWED_RECEIVE_CHANNELS.includes(channel)) {
      ipcRenderer.removeAllListeners(channel)
    }
  },
}

// 使用 contextBridge 安全暴露 API
contextBridge.exposeInMainWorld('electronAPI', electronAPI)

// 导出类型供渲染进程使用
export type ElectronAPI = typeof electronAPI
