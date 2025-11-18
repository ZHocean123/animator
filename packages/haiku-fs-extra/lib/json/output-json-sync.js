import fs from 'graceful-fs'
import path from 'path'
import jsonFile from './jsonfile.js'
import { mkdirs } from '../mkdirs/index.js'

function outputJsonSync (file, data, options) {
  var dir = path.dirname(file)

  if (!fs.existsSync(dir)) {
    mkdirsSync(dir)
  }

  jsonFile.writeJsonSync(file, data, options)
}

export default outputJsonSync
