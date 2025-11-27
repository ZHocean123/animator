/* eslint-disable node/prefer-global/process */
import * as electron from 'electron'
import { shouldEmitErrors } from 'haiku-common'
import { SentryReporter } from 'haiku-sdk-creator'
import setup from './dom'

electron.ipcRenderer.on('haiku', (_, haiku) => {
  if (haiku.dotenv) {
    Object.assign(globalThis.process.env, haiku.dotenv)
  }

  globalThis.sentryReporter = new SentryReporter()
  window.Raven.config('https://07b703c10ea14681a29a1a870c28e84a@sentry.io/226383', {
    environment: globalThis.process.env.NODE_ENV,
    release: globalThis.process.env.HAIKU_RELEASE_VERSION,
    dataCallback: globalThis.sentryReporter.callback.bind(globalThis.sentryReporter),
    shouldSendCallback: shouldEmitErrors,
  })

  window.Raven.install()

  try {
    setup(haiku)
  }
  catch (e) {
    Raven.captureException(e, () => {
      throw e
    })
  }
})
