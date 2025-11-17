import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const assign = require('./util/assign.js')
const gfs = require('graceful-fs')
const copyMod = require('./copy')
const copySyncMod = require('./copy-sync')
const mkdirsMod = require('./mkdirs')
const removeMod = require('./remove')
const jsonMod = require('./json')
const moveMod = require('./move')
const emptyMod = require('./empty')
const ensureMod = require('./ensure')
const outputMod = require('./output')
const walkMod = require('./walk')
const walkSyncMod = require('./walk-sync')

const fse = {}
Object.keys(gfs).forEach((key) => {
  fse[key] = gfs[key]
})

const fs = fse

assign(fs, copyMod)
assign(fs, copySyncMod)
assign(fs, mkdirsMod)
assign(fs, removeMod)
assign(fs, jsonMod)
assign(fs, moveMod)
assign(fs, emptyMod)
assign(fs, ensureMod)
assign(fs, outputMod)
assign(fs, walkMod)
assign(fs, walkSyncMod)

export default fs

export const jsonfile = {}
Object.defineProperty(jsonfile, 'spaces', {
  get () {
    return fs.spaces
  },
  set (val) {
    fs.spaces = val
  }
})
