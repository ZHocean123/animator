const cp = require('child_process');

const log = require('./log');

const PNPM_VERSION = '8.0.0';

module.exports = () => {
  const pnpmVersion = cp.execSync('pnpm --version').toString().trim();
  if (pnpmVersion !== PNPM_VERSION) {
    log.warn(`WARNING: you are using pnpm version ${pnpmVersion}. We recommend version ${PNPM_VERSION}.`);
    log.warn('Get it via:');
    log.warn(`  npm install -g pnpm@${PNPM_VERSION}`);
    log.warn('You have been warned!\n');
  } else {
    log.hat(`Using recommended version of pnpm (${PNPM_VERSION})!`);
  }
};
