import { MockWebsocket, Websocket } from 'haiku-serialization'
import { createRoot } from 'react-dom/client'
import Creator from './react/Creator'

const remote = require('electron').remote

function _fixPlumbingUrl(url) {
  return url.replace(/^http/, 'ws')
}

export default function dom(haiku) {
  const listeners = {}

  const props = {
    medium: window,
    listen: (key, fn) => {
      listeners[key] = fn
    },
  }

  const websocket = haiku.plumbing && !haiku.proxy.active
    ? new Websocket(
        _fixPlumbingUrl(haiku.plumbing.url),
        haiku.folder,
        'commander',
        'creator',
        null,
        haiku.socket.token,
      )
    : new MockWebsocket()

  websocket.on('close', () => {
    const currentWindow = remote.getCurrentWindow()
    if (currentWindow) {
      currentWindow.destroy()
    }
  })

  createRoot(document.getElementById('mount')).render(
    <Creator
      websocket={websocket}
      haiku={haiku}
      folder={haiku.folder}
      {...props}
    />,
  )
}
