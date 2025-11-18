import rimraf from './rimraf.js'

function removeSync(dir) {
  return rimraf.sync(dir, { disableGlob: true })
}

function removePatternSync(dir) {
  return rimraf.sync(dir, { disableGlob: false })
}

function remove(dir, callback) {
  var options = { disableGlob: true }
  return callback ? rimraf(dir, options, callback) : rimraf(dir, options, function () { })
}

export {
  remove,
  removeSync,
  removePatternSync,
}

export default {
  remove: remove,
  removeSync: removeSync,
  removePatternSync: removePatternSync,
}
