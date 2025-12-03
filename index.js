/* eslint-disable node/prefer-global/process */
const cp = require('node:child_process')
const os = require('node:os')
const path = require('node:path')

if (!globalThis.process.env.NODE_ENV || globalThis.process.env.NODE_ENV === 'production') {
  globalThis.process.env.HAIKU_GLASS_URL_MODE = 'distro'
  globalThis.process.env.HAIKU_TIMELINE_URL_MODE = 'distro'
  globalThis.process.env.HAIKU_INTERPRETER_URL_MODE = 'distro'
  if (globalThis.process.env.HAIKU_APP_LAUNCH_CLI === '1') {
    globalThis.process.env.HAIKU_APP_SKIP_LOG = '1'
  }
  require('./config')
}

// On Windows and Linux, custom protocol handler is passed as argument
const haikuURI = globalThis.process.argv.find(arg => arg.startsWith('haiku://'))

if (globalThis.process.env.HAIKU_APP_LAUNCH_CLI === '1') {
  require('@haiku/cli')
}
else {
  // Try to get Electron APIs - they might not be available in all contexts
  let app, dialog
  try {
  // In Electron 28, require('electron') returns the executable path, not the APIs
  // We need to handle this differently
    const electronModule = require('electron')

    // The APIs should be available when running in Electron main process
    // Let's see if they're available through the global scope
    if (globalThis.app && globalThis.dialog) {
      app = globalThis.app
      dialog = globalThis.dialog
    }
    else {
    // Try alternative approaches
      console.log('Electron APIs not available through global scope, checking alternatives...')
      // For now, set app and dialog to undefined to avoid crashes
      app = undefined
      dialog = undefined
    }
  }
  catch (error) {
    console.error('Error accessing Electron APIs:', error.message)
    app = undefined
    dialog = undefined
  }

  // Only run Electron-specific code if APIs are available
  if (app && dialog) {
    if (process.env.NODE_ENV === 'production' && os.platform() === 'darwin' && !app.isInApplicationsFolder()) {
      dialog.showErrorBox(
        'Move to Applications folder',
        'You cannot run Animator from the current folder. Please move Animator to the Applications folder and try again.',
      )
      globalThis.process.exit(0)
    }

    app.once('open-url', (event, url) => {
      globalThis.process.env.HAIKU_INITIAL_URL = url
    })
  }
  else {
    console.log('Skipping Electron-specific initialization (APIs not available)')
  }

  if (haikuURI) {
    globalThis.process.env.HAIKU_INITIAL_URL = haikuURI
  }

  const haikuHelperArgs = { stdio: 'inherit' }
  if (globalThis.process.env.HAIKU_DEBUG) {
    haikuHelperArgs.execArgv = ['--inspect=9221']
  }

  globalThis.haikuHelper = cp.fork(path.join(__dirname, 'HaikuHelper'), haikuHelperArgs)
  globalThis.haikuHelper.on('message', (data) => {
    if (!data || typeof data !== 'object' || !data.message) {
      return
    }

    const { message } = data
    switch (message) {
      case 'launchCreator':
        globalThis.process.env.HAIKU_ENV = JSON.stringify(data.haiku)
        require('haiku-creator')
        break
      case 'bakePngSequence':
        require('haiku-creator').bakeryElectron(
          data,
          () => {
            globalThis.haikuHelper.send({ type: 'bakePngSequenceComplete' })
          },
        )
        break
    }
  })

  globalThis.haikuHelper.on('exit', globalThis.process.exit)
  globalThis.process.on('exit', () => {
    // haikuHelper.kill('SIGKILL')
  })
}
