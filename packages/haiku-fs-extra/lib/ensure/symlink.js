import path from 'path'
import fs from 'graceful-fs'
import _mkdirs from '../mkdirs/index.js'
var mkdirs = mkdirs
var mkdirsSync = mkdirsSync

import _symlinkPaths from './symlink-paths.js'
var symlinkPaths = _symlinkPaths.symlinkPaths
var symlinkPathsSync = _symlinkPaths.symlinkPathsSync

import _symlinkType from './symlink-type.js'
var symlinkType = _symlinkType.symlinkType
var symlinkTypeSync = _symlinkType.symlinkTypeSync

function createSymlink (srcpath, dstpath, type, callback) {
  callback = (typeof type === 'function') ? type : callback
  type = (typeof type === 'function') ? false : type

  fs.access(dstpath, fs.constants.F_OK, function (err) {
    if (!err) return callback(null)
    symlinkPaths(srcpath, dstpath, function (err, relative) {
      if (err) return callback(err)
      srcpath = relative.toDst
      symlinkType(relative.toCwd, type, function (err, type) {
        if (err) return callback(err)
        var dir = path.dirname(dstpath)
        fs.access(dir, fs.constants.F_OK, function (err) {
          if (!err) return fs.symlink(srcpath, dstpath, type, callback)
          mkdirs(dir, function (err) {
            if (err) return callback(err)
            fs.symlink(srcpath, dstpath, type, callback)
          })
        })
      })
    })
  })
}

function createSymlinkSync (srcpath, dstpath, type, callback) {
  callback = (typeof type === 'function') ? type : callback
  type = (typeof type === 'function') ? false : type

  var destinationExists = fs.existsSync(dstpath)
  if (destinationExists) return undefined

  var relative = symlinkPathsSync(srcpath, dstpath)
  srcpath = relative.toDst
  type = symlinkTypeSync(relative.toCwd, type)
  var dir = path.dirname(dstpath)
  var exists = fs.existsSync(dir)
  if (exists) return fs.symlinkSync(srcpath, dstpath, type)
  mkdirsSync(dir)
  return fs.symlinkSync(srcpath, dstpath, type)
}

export default {
  createSymlink: createSymlink,
  createSymlinkSync: createSymlinkSync,
  // alias
  ensureSymlink: createSymlink,
  ensureSymlinkSync: createSymlinkSync
}
