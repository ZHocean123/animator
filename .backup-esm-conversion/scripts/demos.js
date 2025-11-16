const cp = require('child_process');
const path = require('path');

const CORE_PATH = path.join(__dirname, '..', 'packages/@haiku/core');

cp.execSync('pnpm demos', {cwd: CORE_PATH, stdio: 'inherit'});
