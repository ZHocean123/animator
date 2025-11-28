const { execSync } = require('node:child_process')
const path = require('node:path')

console.log('Testing tsdown...')

try {
  const output = execSync('npx tsdown --help', {
    encoding: 'utf8',
    cwd: __dirname,
    stdio: 'pipe',
  })
  console.log('Help command Success:', output)
}
catch (error) {
  console.error('Help command Error:', error.message)
  console.error('Status:', error.status)
  console.error('Stdout:', error.stdout)
  console.error('Stderr:', error.stderr)
}

console.log('\nTesting pnpm build...')

try {
  const output = execSync('pnpm build', {
    encoding: 'utf8',
    cwd: __dirname,
    stdio: 'pipe',
  })
  console.log('Build command Success:', output)
}
catch (error) {
  console.error('Build command Error:', error.message)
  console.error('Status:', error.status)
  console.error('Stdout:', error.stdout)
  console.error('Stderr:', error.stderr)
}
