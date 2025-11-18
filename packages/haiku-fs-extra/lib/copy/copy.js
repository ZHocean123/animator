import fs from 'graceful-fs'
import path from 'path'
import ncp from './ncp.js'
import mkdirs from '../mkdirs/index.js'

function copy(src, dest, options, callback) {
  if (typeof options === 'function' && !callback) {
    callback = options
    options = {}
  } else if (typeof options === 'function' || options instanceof RegExp) {
    options = { filter: options }
  }
  callback = callback || function () { }
  options = options || {}

  // Warn about using preserveTimestamps on 32-bit node:
  if (options.preserveTimestamps && process.arch === 'ia32') {
    console.warn('fs-extra: Using the preserveTimestamps option in 32-bit node is not recommended;\n' +
      'see https://github.com/jprichardson/node-fs-extra/issues/269')
  }

  // don't allow src and dest to be the same
  var basePath = process.cwd()
  var currentPath = path.resolve(basePath, src)
  var targetPath = path.resolve(basePath, dest)
  if (currentPath === targetPath) return callback(new Error('Source and destination must not be the same.'))

  fs.lstat(src, function (err, stats) {
    if (err) return callback(err)

    var dir = null
    if (stats.isDirectory()) {
      var parts = dest.split(path.sep)
      parts.pop()
      dir = parts.join(path.sep)
    } else {
      dir = path.dirname(dest)
    }

    fs.access(dir, fs.constants.F_OK, function (err) {
      if (!err) return ncp(src, dest, options, callback)
      mkdirs(dir, function (err) {
        if (err) return callback(err)
        ncp(src, dest, options, callback)
      })
    })
  })
}

export default copy
