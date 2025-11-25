const cp = require('child_process');
const argv = require('yargs').argv;

const log = require('./helpers/log');
const runScript = require('./helpers/runScript');
const nowVersion = require('./helpers/nowVersion');
const core = require('./helpers/packages')('@haiku/core');

log.hat(`note that the current version is ${nowVersion()}`);

log.hat('creating distribution builds of our core and adapters');

const makeBundle = () => {
  cp.execSync('yarn bundle', {cwd: core.abspath, stdio: 'inherit'});
};

if (!argv['skip-compile']) {
  cp.execSync('pnpm install', {cwd: global.process.cwd(), stdio: 'inherit'});
  
  // Try to use tsdown build command first, fallback to compile if not available
  const buildCommand = core.pkg.scripts.build ? 'pnpm run build' : 'pnpm run compile';
  cp.execSync(buildCommand, {cwd: core.abspath, stdio: 'inherit'});
  
  makeBundle();
} else {
  makeBundle();
}
