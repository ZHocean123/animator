const cp = require('child_process')

function bench(cmd) {
  const start = Date.now()
  cp.execSync(cmd, { stdio: 'inherit' })
  const end = Date.now()
  return end - start
}

function main() {
  const tVite = bench('pnpm electron-vite build')
  console.log(`electron-vite build 耗时: ${tVite}ms`)
}

main()