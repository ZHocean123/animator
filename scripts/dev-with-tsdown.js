const cp = require('node:child_process')
const { join } = require('node:path')
const async = require('async')
const argv = require('yargs').argv

const log = require('./helpers/log')
const allPackages = require('./helpers/packages')()

if (!process.env.NODE_ENV) {
  // babel-cli requires this to be set for reasons I don't know
  process.env.NODE_ENV = 'development'
}

// Note the packages we would never want to develop for specific dev choices.
const appOwnedDeps = ['haiku-creator', 'haiku-plumbing']
const devChoiceExclusions = {
  glass: appOwnedDeps.concat(['haiku-timeline']),
  timeline: appOwnedDeps.concat(['haiku-glass']),
  everything: [],
}
const devChoice = argv.devChoice || 'everything'
const children = []

function runInstruction(pack, cb) {
  const cmd = 'pnpm'
  const cwd = pack.abspath

  // Check if package has tsdown dev script
  const hasTsdownDev = pack.pkg.scripts && pack.pkg.scripts.dev && pack.pkg.scripts.dev.includes('tsdown')

  let args
  if (hasTsdownDev) {
    // Use tsdown watch if available
    args = ['dev']
    log.log(`Starting tsdown dev for ${pack.name} in ${cwd}`)
  }
  else if (pack.pkg.scripts && pack.pkg.scripts.develop) {
    // Fallback to develop script
    args = ['develop']
    log.log(`Starting develop script for ${pack.name} in ${cwd}`)
  }
  else if (pack.pkg.scripts && pack.pkg.scripts.compile) {
    // Fallback to compile with watch
    args = ['compile', '--watch']
    log.log(`Starting compile with watch for ${pack.name} in ${cwd}`)
  }
  else {
    log.err(`No suitable dev script found for ${pack.name}, skipping...`)
    log.err(`Available scripts: ${JSON.stringify(pack.pkg.scripts || {})}`)
    return cb()
  }

  const proc = cp.spawn(cmd, args, { cwd, env: process.env, stdio: 'inherit', shell: true })

  // Handle process errors
  proc.on('error', (error) => {
    log.err(`Failed to start dev process for ${pack.name}: ${error.message}`)
    log.err(`Command: ${cmd} ${args.join(' ')}`)
    log.err(`Working directory: ${cwd}`)
  })

  proc.on('exit', (code, signal) => {
    if (code !== 0 && code !== null) {
      log.err(`Dev process for ${pack.name} exited with code ${code}`)
      log.err(`Command: ${cmd} ${args.join(' ')}`)
      log.err(`Working directory: ${cwd}`)
    }
    else if (signal) {
      log.warn(`Dev process for ${pack.name} was killed with signal ${signal}`)
    }
  })

  children.push({
    info: { cwd, cmd, args, packageName: pack.name },
    proc,
  })
  cb()
}

let allWatchersActive = false

async.each(allPackages, (pack, done) => {
  const { shortname } = pack
  if (devChoiceExclusions[devChoice] && devChoiceExclusions[devChoice].includes(shortname)) {
    done()
    return
  }

  switch (shortname) {
    case 'serialization':
    case 'fs-extra':
    case 'vendor-legacy':
      // These don't have watchers or need special treatment.
      done()
      break
    default:
      // Standard, new way of doing things: `pnpm dev` with tsdown or fallback to `pnpm develop`.
      runInstruction(pack, done)
      break
  }
}, () => {
  allWatchersActive = true
})

function exit(error) {
  if (!allWatchersActive) {
    setTimeout(exit, 500)
    return
  }

  log.log('=====================================')
  log.log('SHUTTING DOWN DEVELOPMENT SERVERS')
  log.log('=====================================')

  if (error) {
    log.err('Exit due to error:')
    log.err(error.message || error)
    if (error.stack) {
      log.err('Stack trace:')
      log.err(error.stack)
    }
  }

  log.log(`Terminating ${children.length} child processes...`)

  children.forEach((child, index) => {
    const packageName = child.info.packageName || 'unknown'
    log.log(`[${index + 1}/${children.length}] Stopping ${packageName} (${child.info.cmd} ${child.info.args.join(' ')})`)

    if (child.proc.stdin) {
      child.proc.stdin.end()
    }
    if (child.proc.stdout) {
      child.proc.stdout.destroy()
    }
    if (child.proc.stderr) {
      child.proc.stderr.destroy()
    }
    child.proc.kill('SIGTERM')

    // Force kill if SIGTERM doesn't work after 5 seconds
    setTimeout(() => {
      if (child.proc && !child.proc.killed) {
        log.warn(`Force killing ${packageName} process...`)
        child.proc.kill('SIGKILL')
      }
    }, 5000)
  })

  log.log('All child processes terminated.')
  log.log('=====================================')
}

global.process.on('exit', exit)
global.process.on('uncaughtException', (error) => {
  log.err('Uncaught exception:')
  log.err(error.message || error)
  if (error.stack) {
    log.err('Stack trace:')
    log.err(error.stack)
  }
  exit(error)
})
global.process.on('unhandledRejection', (reason, promise) => {
  log.err('Unhandled rejection at:')
  log.err(promise)
  log.err('Reason:')
  log.err(reason)
  exit(reason)
})
