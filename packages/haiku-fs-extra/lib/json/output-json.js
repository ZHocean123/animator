import fs from 'graceful-fs'
import path from 'path'
import jsonFile from './jsonfile.js'
import { mkdirs } from '../mkdirs/index.js'

function outputJson (file, data, options, callback) {
  if (typeof options === 'function') {
    callback = options
    options = {}
  }

  var dir = path.dirname(file)

  fs.access(dir, fs.constants.F_OK, function (err) {
    if (!err) return jsonFile.writeJson(file, data, options, callback)

    mkdirs(dir, function (err) {
      if (err) return callback(err)
      jsonFile.writeJson(file, data, options, callback)
    })
  })
}

export default outputJson
