import type { BrowserWindow, Menu, MenuItem, MenuItemConstructorOptions } from 'electron'
import { EventEmitter } from 'node:events'

// remote 模块在新版本 Electron 中已被移除，使用 @electron/remote 替代
let remoteMenu: typeof Menu
let remoteMenuItem: typeof MenuItem
try {
  const remote = require('@electron/remote')
  remoteMenu = remote.Menu
  remoteMenuItem = remote.MenuItem
} catch {
  // 如果 @electron/remote 不可用，使用主进程的 Menu
  // 但在渲染进程中，我们需要导入 electron
  try {
    const electron = require('electron')
    remoteMenu = electron.Menu
    remoteMenuItem = electron.MenuItem
  } catch {
    // 最后的备选方案
    remoteMenu = {} as any
    remoteMenuItem = {} as any
  }
}

// 确保 Menu 和 MenuItem 在全局可用
declare global {
  var Menu: typeof Menu
  var MenuItem: typeof MenuItem
}

// 在模块顶部设置全局变量
if (typeof globalThis.Menu === 'undefined') {
  globalThis.Menu = remoteMenu
}
if (typeof globalThis.MenuItem === 'undefined') {
  globalThis.MenuItem = remoteMenuItem
}

const DISPLAY_HACK_TIMEOUT = 100

export interface MenuSpec {
  type: ('normal' | 'separator' | 'submenu' | 'checkbox' | 'radio')
  label: string
  enabled: boolean
  submenu: MenuSpec[]
  onClick: (menuItem: MenuItem, browserWindow: BrowserWindow, event: Event) => void
}

export interface MenuItemLaunchConfig {
  items: MenuSpec[]
}

function buildMenuItem(menu: Menu, { type, label, enabled, submenu, onClick }: MenuSpec) {
  const menuSpec: MenuItemConstructorOptions = {
    type,
    label,
    enabled,
    click: onClick,
  }

  if (submenu && submenu.length > 0) {
    menuSpec.submenu = new remoteMenu()
    submenu.forEach((subitem) => {
      buildMenuItem(menuSpec.submenu as Menu, subitem)
    })
  }

  const item = new remoteMenuItem(menuSpec)

  menu.append(item)
}

export class PopoverMenu extends EventEmitter {
  menu: Menu = null

  launch({ items }: MenuItemLaunchConfig) {
    if (!remoteMenu) {
      return
    }

    this.menu = new remoteMenu()

    items.forEach((item) => {
      buildMenuItem(this.menu as Menu, item)
    })

    this.show()
  }

  show() {
    if (!this.menu) {
      return
    }

    setTimeout(
      () => {
        this.menu.popup({ window: remote.getCurrentWindow() })
      },
      DISPLAY_HACK_TIMEOUT,
    )
  }
}

const singleton = new PopoverMenu()

export default singleton
