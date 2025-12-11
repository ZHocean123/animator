var assign = require('./util/assign')

var fse = {}
var gfs = require('graceful-fs')

// attach fs methods to fse
Object.keys(gfs).forEach(function (key) {
  fse[key] = gfs[key]
})

var fs = fse

assign(fs, require('./copy'))
assign(fs, require('./copy-sync'))
assign(fs, require('./mkdirs'))
assign(fs, require('./remove'))
assign(fs, require('./json'))
assign(fs, require('./move'))
assign(fs, require('./empty'))
assign(fs, require('./ensure'))
assign(fs, require('./output'))
assign(fs, require('./walk'))
assign(fs, require('./walk-sync'))

module.exports = fs

// maintain backwards compatibility for awhile
var jsonfile = {}
Object.defineProperty(jsonfile, 'spaces', {
  get: function () {
    return fs.spaces // found in ./json
  },
  set: function (val) {
    fs.spaces = val
  }
})

module.exports.jsonfile = jsonfile // so users of fs-extra can modify jsonFile.spaces

// 显式导出 ES 模块需要的命名导出
module.exports.mkdirpSync = fs.mkdirpSync
module.exports.writeJsonSync = fs.writeJsonSync
module.exports.readJsonSync = fs.readJsonSync
module.exports.emptyDirSync = fs.emptyDirSync
module.exports.ensureFileSync = fs.ensureFileSync
module.exports.writeFile = fs.writeFile
module.exports.writeFileSync = fs.writeFileSync
module.exports.existsSync = fs.existsSync
module.exports.walkSync = fs.walkSync
module.exports.readFileSync = fs.readFileSync
