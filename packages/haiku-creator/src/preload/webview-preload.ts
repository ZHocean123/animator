/**
 * Webview (Glass/Timeline) 的 preload 脚本
 * 使用 contextBridge 安全地暴露 Electron API 给 webview 渲染进程
 */
import { contextBridge, ipcRenderer } from 'electron'

// 定义暴露给 webview 渲染进程的 API
const electronAPI = {
  // WebContents 操作（用于开发者工具）
  webContents: {
    openDevTools: () => ipcRenderer.invoke('webview:open-dev-tools'),
    closeDevTools: () => ipcRenderer.invoke('webview:close-dev-tools'),
    isDevToolsFocused: () => ipcRenderer.invoke('webview:is-dev-tools-focused'),
  },

  // 发送消息到主进程（白名单通道）
  send: (channel: string, ...args: unknown[]) => {
    const allowedChannels = ['topmenu:update']
    if (allowedChannels.includes(channel)) {
      ipcRenderer.send(channel, ...args)
    }
    else {
      console.warn(`[webview-preload] 不允许发送到通道: ${channel}`)
    }
  },
}

// 使用 contextBridge 安全暴露 API
contextBridge.exposeInMainWorld('electronAPI', electronAPI)

// 导出类型供渲染进程使用
export type WebviewElectronAPI = typeof electronAPI
