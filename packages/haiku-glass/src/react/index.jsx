/* eslint-disable node/prefer-global/process */
import { fetchProjectConfigInfo } from '@haiku/sdk-client'
import { ipcRenderer } from 'electron'
import { shouldEmitErrors } from 'haiku-common'
import { SentryReporter } from 'haiku-sdk-creator'
import { mixpanel, MockWebsocket, Websocket } from 'haiku-serialization'
import * as qs from 'qs'

import { createRoot } from 'react-dom/client'
import Glass from './Glass.jsx'

// We are in a webview; use query string parameters for boot-up configuration
const search = (window.location.search || '').split('?')[1] || ''
const params = qs.parse(search, { plainObjects: true })
const config = Object.assign({}, params)
if (config.dotenv) {
  Object.assign(globalThis.process.env, config.dotenv)
}

globalThis.sentryReporter = new SentryReporter()
window.Raven.config('https://287e52df9cfd48aab7f6091ec17a5921@sentry.io/226362', {
  environment: process.env.NODE_ENV,
  release: process.env.HAIKU_RELEASE_VERSION,
  dataCallback: globalThis.sentryReporter.callback.bind(globalThis.sentryReporter),
  shouldSendCallback: shouldEmitErrors,
})

window.Raven.install()

try {
  if (!config.folder) {
    throw new Error('A folder (the absolute path to the user project) is required')
  }

  function _fixPlumbingUrl(url) {
    return url.replace(/^http/, 'ws')
  }

  fetchProjectConfigInfo(config.folder, (err, userconfig) => {
    if (err) {
      throw err
    }

    const websocket = (config.plumbing)
      ? new Websocket(_fixPlumbingUrl(config.plumbing), config.folder, 'controllee', 'glass', null, config.socket.token)
      : new MockWebsocket(ipcRenderer)

    // Add extra context to Sentry reports, this info is also used by carbonite.
    const folderHelper = config.folder.split('/').reverse()

    window.Raven.setExtraContext({
      organizationName: folderHelper[1] || 'unknown',
      projectName: folderHelper[0] || 'unknown',
      projectPath: config.folder,
    })

    window.Raven.setUserContext({
      email: config.email,
    })

    mixpanel.mergeToPayload({
      distinct_id: config.email,
    })

    window.isWebview = config.webview

    createRoot(document.getElementById('root')).render(
      <Glass
        mixpanel={mixpanel}
        envoy={config.envoy}
        userconfig={userconfig}
        websocket={websocket}
        folder={config.folder}
        projectName={userconfig.project || 'untitled'}
      />,
    )
  })
}
catch (e) {
  Raven.captureException(e, () => {
    throw e
  })
}
