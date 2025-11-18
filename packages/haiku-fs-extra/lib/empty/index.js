import fs from 'fs'
import path from 'path'
import { mkdirs } from '../mkdirs/index.js'
import { remove } from '../remove/index.js'

function emptyDir(dir, callback) {
  callback = callback || function () { }
  fs.readdir(dir, function (err, items) {
    if (err) return mkdirs(dir, callback)

    items = items.map(function (item) {
      return path.join(dir, item)
    })

    deleteItem()

    function deleteItem() {
      var item = items.pop()
      if (!item) return callback()
      remove.remove(item, function (err) {
        if (err) return callback(err)
        deleteItem()
      })
    }
  })
}

function emptyDirSync(dir) {
  var items
  try {
    items = fs.readdirSync(dir)
  } catch (err) {
    return mkdirsSync(dir)
  }

  items.forEach(function (item) {
    item = path.join(dir, item)
    remove.removeSync(item)
  })
}

export default {
  emptyDirSync: emptyDirSync,
  emptydirSync: emptyDirSync,
  emptyDir: emptyDir,
  emptydir: emptyDir
}
