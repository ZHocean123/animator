import path from 'path'
import fs from 'graceful-fs'
import { mkdirs } from '../mkdirs/index.js'

function outputFile (file, data, encoding, callback) {
  if (typeof encoding === 'function') {
    callback = encoding
    encoding = 'utf8'
  }

  var dir = path.dirname(file)
  fs.access(dir, fs.constants.F_OK, function (err) {
    if (!err) return fs.writeFile(file, data, encoding, callback)

    mkdirs(dir, function (err) {
      if (err) return callback(err)

      fs.writeFile(file, data, encoding, callback)
    })
  })
}

function outputFileSync (file, data, encoding) {
  var dir = path.dirname(file)
  if (fs.existsSync(dir)) {
    return fs.writeFileSync.apply(fs, arguments)
  }
  mkdirsSync(dir)
  fs.writeFileSync.apply(fs, arguments)
}

export default {
  outputFile: outputFile,
  outputFileSync: outputFileSync
}
