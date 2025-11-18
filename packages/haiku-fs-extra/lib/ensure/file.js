import path from 'path'
import fs from 'graceful-fs'
import { mkdirs } from '../mkdirs/index.js'

function createFile (file, callback) {
  function makeFile () {
    fs.writeFile(file, '', function (err) {
      if (err) return callback(err)
      callback()
    })
  }

  fs.access(file, fs.constants.F_OK, function (err) {
    if (!err) return callback()
    var dir = path.dirname(file)
    fs.access(dir, fs.constants.F_OK, function (err) {
      if (!err) return makeFile()
      mkdirs(dir, function (err) {
        if (err) return callback(err)
        makeFile()
      })
    })
  })
}

function createFileSync (file) {
  if (fs.existsSync(file)) return

  var dir = path.dirname(file)
  if (!fs.existsSync(dir)) {
    mkdirsSync(dir)
  }

  fs.writeFileSync(file, '')
}

export default {
  createFile: createFile,
  createFileSync: createFileSync,
  // alias
  ensureFile: createFile,
  ensureFileSync: createFileSync
}
