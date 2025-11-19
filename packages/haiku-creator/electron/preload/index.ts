import { contextBridge, ipcRenderer, shell, clipboard, webFrame } from 'electron'

const api = {
  ipc: {
    send: (channel: string, ...args: any[]) => ipcRenderer.send(channel, ...args),
    on: (channel: string, listener: (event: Electron.IpcRendererEvent, ...args: any[]) => void) => ipcRenderer.on(channel, listener),
    invoke: (channel: string, ...args: any[]) => ipcRenderer.invoke(channel, ...args)
  },
  windowControls: {
    openDevTools: () => ipcRenderer.send('global-menu:open-dev-tools'),
    closeDevTools: () => ipcRenderer.send('global-menu:close-dev-tools'),
    restart: () => ipcRenderer.send('restart')
  },
  system: {
    shellOpenExternal: (url: string) => shell.openExternal(url),
    clipboardWriteText: (text: string) => clipboard.writeText(text)
  },
  webFrame: {
    setZoomLevelLimits: (min: number, max: number) => {
      if (webFrame.setZoomLevelLimits) webFrame.setZoomLevelLimits(min, max)
    },
    setLayoutZoomLevelLimits: (min: number, max: number) => {
      if ((webFrame as any).setLayoutZoomLevelLimits) (webFrame as any).setLayoutZoomLevelLimits(min, max)
    }
  }
}

contextBridge.exposeInMainWorld('electronAPI', api)