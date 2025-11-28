const cp = require('node:child_process')
const path = require('node:path')

const CORE_PATH = path.join(__dirname, '..', 'packages/@haiku/core')

cp.execSync('pnpm demos', { cwd: CORE_PATH, stdio: 'inherit' })
