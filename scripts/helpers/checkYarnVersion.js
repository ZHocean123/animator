const cp = require('child_process');

const log = require('./log');

const PNPM_VERSION = '10.23.0';

module.exports = () => {
  try {
    const pnpmVersion = cp.execSync('pnpm --version').toString().trim();
    log.hat(`Using pnpm version ${pnpmVersion}!`);
  } catch (error) {
    log.warn('WARNING: pnpm not found. Please install pnpm:');
    log.warn('  curl -fsSL https://get.pnpm.io/install.sh | sh -');
    log.warn('You have been warned!\n');
  }
};
