import { MockWebsocket, Websocket } from 'haiku-serialization'
import { createRoot } from 'react-dom/client'
import Creator from '../react/Creator'

function _fixPlumbingUrl(url: string): string {
  return url.replace(/^http/, 'ws')
}

interface HaikuConfig {
  plumbing?: {
    url: string
  }
  proxy?: {
    active: boolean
  }
  folder?: string
  socket?: {
    token: string
  }
}

// 等待 haiku 配置从主进程发送过来
function waitForHaikuConfig(): Promise<HaikuConfig> {
  return new Promise((resolve) => {
    if (window.electronAPI) {
      const unsubscribe = window.electronAPI.on('haiku', (haiku: HaikuConfig) => {
        unsubscribe()
        resolve(haiku)
      })
    }
    else {
      // 如果 electronAPI 不可用，使用默认配置
      resolve({})
    }
  })
}

async function initializeApp(): Promise<void> {
  const listeners: Record<string, Function> = {}

  const props = {
    medium: window,
    listen: (key: string, fn: Function) => {
      listeners[key] = fn
    },
  }

  const haiku = await waitForHaikuConfig()

  const websocket = haiku.plumbing && !haiku.proxy?.active
    ? new Websocket(
        _fixPlumbingUrl(haiku.plumbing.url),
        haiku.folder,
        'commander',
        'creator',
        null,
        haiku.socket?.token,
      )
    : new MockWebsocket()

  websocket.on('close', () => {
    // 使用 electronAPI 替代 remote.getCurrentWindow().destroy()
    if (window.electronAPI) {
      window.electronAPI.window.destroy()
    }
  })

  const container = document.getElementById('mount')
  if (container) {
    const root = createRoot(container)
    root.render(
      <Creator
        websocket={websocket}
        haiku={haiku}
        folder={haiku.folder}
        {...props}
      />,
    )
  }
}

// 启动应用
initializeApp().catch((error) => {
  console.error('Failed to initialize application:', error)
})
