import * as path from 'path'
import { parse } from 'url'
import * as electron from 'electron'
import * as http from 'http'
import * as https from 'https'
import * as qs from 'qs'
import * as fs from 'fs'
import { isProxied, ProxyType } from 'haiku-common/src/proxies'
// TopMenu removed in migration; will restore via IPC-safe implementation later
import * as ensureTrailingSlash from 'haiku-serialization/src/utils/ensureTrailingSlash.js'
import { isMac, isWindows } from 'haiku-common/src/environments/os'

let browserWindow: any | null = null

electron.app.setName('Haiku Animator')
electron.app.setAsDefaultProtocolClient('haiku')

const handleUrl = (url: string) => {
  if (!browserWindow) {
    console.warn(`[creator] unable to handle custom protocol URL ${url}; browserWindow not ready`)
    return
  }
  console.info(`[creator] handling custom protocol URL ${url}`)
  const parsedUrl = parse(url)
  browserWindow.webContents.send(`open-url:${parsedUrl.host}`, parsedUrl.pathname, qs.parse(parsedUrl.query || ''))
}

if (isMac() && electron.systemPreferences && typeof electron.systemPreferences.setUserDefault === 'function') {
  electron.systemPreferences.setUserDefault('NSDisabledDictationMenuItem', 'boolean', true)
  electron.systemPreferences.setUserDefault('NSDisabledCharacterPaletteMenuItem', 'boolean', true)
}

  electron.app.on('login', (_: any, __: any, ___: any, authInfo: any) => {
  console.warn('[unexpected proxy interference]', authInfo)
})

const appUrlDev = process.env.ELECTRON_RENDERER_URL

const selectActiveFolder = (): string => {
  const mode = electron.dialog.showMessageBoxSync({
    message: 'Welcome to Haiku Animator!',
    type: 'question',
    buttons: ['New project...', 'Open project...', 'Exit']
  })

  if (mode === 0) {
    let folderIsEmpty = false
    let folder = ''
    while (!folderIsEmpty) {
      electron.dialog.showMessageBoxSync({
        message: 'On the coming screen, select an empty directory for this project.',
        type: 'info',
        buttons: ['OK']
      })
      const files = electron.dialog.showOpenDialogSync({ properties: ['openDirectory', 'showHiddenFiles', 'createDirectory'] })
      if (!files || !files.length) process.kill(0)
      folder = files[0]
      folderIsEmpty = fs.readdirSync(folder).length === 0
    }
    return folder
  } else if (mode === 1) {
    electron.dialog.showMessageBoxSync({
      message: 'On the coming screen, select a directory containing a Haiku Animator project. \r\n\r\nFor legacy commercial projects, check ~/.haiku/projects',
      type: 'info',
      buttons: ['OK']
    })
    const files = electron.dialog.showOpenDialogSync({ properties: ['openDirectory', 'showHiddenFiles'] })
    if (!files || !files.length) process.kill(0)
    return files[0]
  } else {
    process.kill(0)
    return ''
  }
}

function createWindow() {
  const gotLock = electron.app.requestSingleInstanceLock()
  if (!gotLock) {
    electron.app.quit()
    return
  }

  electron.app.on('second-instance', (_e: any, argv: string[]) => {
    for (const arg of argv) {
      if (arg.startsWith('haiku://')) {
        handleUrl(arg)
        break
      }
    }
    if (browserWindow) {
      if (browserWindow.isMinimized()) browserWindow.restore()
      browserWindow.focus()
    }
  })

  

  browserWindow = new electron.BrowserWindow({
    title: 'Haiku Animator',
    show: false,
    titleBarStyle: 'hiddenInset',
    minWidth: 700,
    minHeight: 650,
    backgroundColor: '#343f41',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  })

  

  electron.ipcMain.on('restart', () => {
    electron.app.relaunch()
    if (browserWindow) browserWindow.close()
  })

  electron.ipcMain.on('protocol:register', (_: any, projectPath: string) => {
    electron.protocol.registerFileProtocol('web+haikuroot', (request: any, cb: any) => {
      cb(ensureTrailingSlash(projectPath) + request.url.substr(16))
    })
  })

  electron.ipcMain.on('protocol:unregister', () => {
    electron.protocol.unregisterProtocol('web+haikuroot')
  })

  const activeFolder = selectActiveFolder()

  const haiku = process.env.HAIKU_ENV ? JSON.parse(process.env.HAIKU_ENV) : {}
  haiku.folder = activeFolder
  if (!haiku.plumbing) haiku.plumbing = {}
  if (!haiku.plumbing.url) {
    if (process.env.NODE_ENV !== 'test' && !process.env.HAIKU_PLUMBING_PORT) {
      throw new Error('Oops! You must define a HAIKU_PLUMBING_PORT env var!')
    }
    haiku.plumbing.url = `http://${process.env.HAIKU_PLUMBING_HOST || '0.0.0.0'}:${process.env.HAIKU_PLUMBING_PORT}/?token=${process.env.HAIKU_WS_SECURITY_TOKEN}`
  }

  browserWindow.setTitle('Haiku Animator')
  browserWindow.maximize()

  if (appUrlDev) {
    browserWindow.loadURL(appUrlDev)
  } else {
    const prodIndex = path.join(__dirname, '../renderer/index.html')
    browserWindow.loadFile(prodIndex)
  }

  if (process.env.DEV === '1' || process.env.DEV === 'creator') {
    browserWindow.openDevTools()
  }

  browserWindow.webContents.on('did-finish-load', async () => {
    const ses = electron.session.fromPartition('persist:name')
    const httpMod = require('http')
    const httpsMod = require('https')

    try {
      const proxy = await ses.resolveProxy(haiku.plumbing.url)
      haiku.proxy = {
        url: proxy.replace(`${ProxyType.Proxied} `, ''),
        active: isProxied(proxy)
      }
    } catch {}

    browserWindow?.webContents.send('haiku', haiku)
    if (process.env.HAIKU_INITIAL_URL) {
      handleUrl(process.env.HAIKU_INITIAL_URL)
      delete process.env.HAIKU_INITIAL_URL
    }
  })

  browserWindow.on('closed', () => {
    browserWindow = null
  })

  browserWindow.on('ready-to-show', () => {
    browserWindow?.show()
  })

  if (isWindows()) {
    electron.ipcMain.on('app:check-updates', () => {
      windowsCheckForUpdates()
    })
    setInterval(() => {
      windowsCheckForUpdates()
    }, 1000 * 60 * 60)
    windowsCheckForUpdates()
  }
}

function windowsCheckForUpdates() {
  if (!isWindows()) return
  try {
    const { autoUpdater } = require('electron-updater')
    autoUpdater.checkForUpdatesAndNotify()
  } catch (error) {
    console.log(error)
  }
}

electron.app.on('open-url', (event: any, url: string) => {
  event.preventDefault()
  handleUrl(url)
})

electron.app.whenReady().then(() => {
  createWindow()
})