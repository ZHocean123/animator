import path from 'path';
import cp from 'child_process';
import os from 'os';
import {createRequire} from 'module';
import {fileURLToPath, pathToFileURL} from 'url';
const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (!global.process.env.NODE_ENV || global.process.env.NODE_ENV === 'production') {
  process.env.HAIKU_GLASS_URL_MODE = 'distro';
  process.env.HAIKU_TIMELINE_URL_MODE = 'distro';
  process.env.HAIKU_INTERPRETER_URL_MODE = 'distro';
  if (process.env.HAIKU_APP_LAUNCH_CLI === '1') {
    process.env.HAIKU_APP_SKIP_LOG = '1';
  }
  require('./config');
}

// On Windows and Linux, custom protocol handler is passed as argument
const haikuURI = process.argv.find((arg) => arg.startsWith('haiku://'));

if (process.env.HAIKU_APP_LAUNCH_CLI === '1') {
  require('@haiku/cli');
} else {
  // 直接尝试导入Electron模块
  let app, dialog;
  try {
    const electron = require('electron');
    app = electron.app;
    dialog = electron.dialog;
  } catch (error) {
    console.error('Failed to import electron module:', error);
    process.exit(1);
  }
  
  // 检查app是否可用
  if (!app) {
    console.error('Electron app module is not available');
    process.exit(1);
  }

  try {
    const remoteMain = require('@electron/remote/main');
    remoteMain.initialize();
  } catch {}

  if (process.env.NODE_ENV === 'production' && os.platform() === 'darwin' && !app.isInApplicationsFolder()) {
    dialog.showErrorBox(
      'Move to Applications folder',
      'You cannot run Animator from the current folder. Please move Animator to the Applications folder and try again.',
    );
    global.process.exit(0);
  }

  app.once('open-url', (event, url) => {
    global.process.env.HAIKU_INITIAL_URL = url;
  });

  if (haikuURI) {
    global.process.env.HAIKU_INITIAL_URL = haikuURI;
  }

  const haikuHelperArgs = {stdio: 'inherit'};
  if (global.process.env.HAIKU_DEBUG) {
    haikuHelperArgs.execArgv = ['--inspect=9221'];
  }

  global.haikuHelper = cp.fork(path.resolve(__dirname, '..', '..', 'HaikuHelper.js'), haikuHelperArgs);
  global.haikuHelper.on('message', (data) => {
    if (!data || typeof data !== 'object' || !data.message) {
      return;
    }

    const {message} = data;
    switch (message) {
      case 'launchCreator':
        global.process.env.HAIKU_ENV = JSON.stringify(data.haiku);
        import('haiku-creator/lib/electron');
        break;
      case 'bakePngSequence':
        import('haiku-creator/lib/bakery/electron')
          .then((m) => m.default(
            data,
            () => {
              global.haikuHelper.send({type: 'bakePngSequenceComplete'});
            },
          ))
          .catch((err) => {
            console.error('Failed to load bakery electron module', err);
          });
        break;
    }
  });

  global.haikuHelper.on('exit', global.process.exit);
  global.process.on('exit', () => {
    global.haikuHelper && global.haikuHelper.kill('SIGKILL');
  });
}
