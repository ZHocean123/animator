const cp = require('child_process')
const fs = require('fs')
const path = require('path')

function run(cmd) {
  cp.execSync(cmd, { stdio: 'inherit' })
}

function exists(p) {
  return fs.existsSync(path.resolve(process.cwd(), p))
}

function main() {
  run('pnpm electron-vite build')
  const okMain = exists('out/main/index.js')
  const okPreload = exists('out/preload/index.js')
  if (!okMain || !okPreload) {
    console.error('electron-vite 迁移构建产物缺失')
    process.exit(1)
  }
  console.log('electron-vite 迁移构建产物验证通过')
}

main()