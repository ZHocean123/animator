var fs = require('graceful-fs')
var path = require('path')
var jsonFile = require('./jsonfile')
var mkdir = require('../mkdirs')

function outputJson (file, data, options, callback) {
  if (typeof options === 'function') {
    callback = options
    options = {}
  }

  var dir = path.dirname(file)

  fs.access(dir, fs.constants.F_OK, function (err) {
    if (!err) return jsonFile.writeJson(file, data, options, callback)

    mkdir.mkdirs(dir, function (err) {
      if (err) return callback(err)
      jsonFile.writeJson(file, data, options, callback)
    })
  })
}

module.exports = outputJson
