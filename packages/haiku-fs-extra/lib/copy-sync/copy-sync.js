let path = require('node:path')
let fs = require('graceful-fs')
let mkdir = require('../mkdirs')
let copyFileSync = require('./copy-file-sync')

function copySync(src, dest, options) {
  if (typeof options === 'function' || options instanceof RegExp) {
    options = { filter: options }
  }

  options = options || {}
  options.recursive = !!options.recursive

  // default to true for now
  options.clobber = 'clobber' in options ? !!options.clobber : true
  options.dereference = 'dereference' in options ? !!options.dereference : false
  options.preserveTimestamps = 'preserveTimestamps' in options ? !!options.preserveTimestamps : false

  options.filter = options.filter || function () { return true }

  // Warn about using preserveTimestamps on 32-bit node:
  if (options.preserveTimestamps && process.arch === 'ia32') {
    console.warn('fs-extra: Using the preserveTimestamps option in 32-bit node is not recommended;\n'
      + 'see https://github.com/jprichardson/node-fs-extra/issues/269')
  }

  let stats = (options.recursive && !options.dereference) ? fs.lstatSync(src) : fs.statSync(src)
  let destFolder = path.dirname(dest)
  let destFolderExists = fs.existsSync(destFolder)
  let performCopy = false

  if (stats.isFile()) {
    if (options.filter instanceof RegExp) {
      console.warn('Warning: fs-extra: Passing a RegExp filter is deprecated, use a function')
      performCopy = options.filter.test(src)
    }
    else if (typeof options.filter === 'function') {
      performCopy = options.filter(src)
    }

    if (performCopy) {
      if (!destFolderExists)
        mkdir.mkdirsSync(destFolder)
      copyFileSync(src, dest, { clobber: options.clobber, preserveTimestamps: options.preserveTimestamps })
    }
  }
  else if (stats.isDirectory()) {
    if (!fs.existsSync(dest))
      mkdir.mkdirsSync(dest)
    let contents = fs.readdirSync(src)
    contents.forEach((content) => {
      let opts = options
      opts.recursive = true
      copySync(path.join(src, content), path.join(dest, content), opts)
    })
  }
  else if (options.recursive && stats.isSymbolicLink()) {
    let srcPath = fs.readlinkSync(src)
    fs.symlinkSync(srcPath, dest)
  }
}

module.exports = copySync
