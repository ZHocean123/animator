import assign from './util/assign.js'
import gfs from 'graceful-fs'
import copyMod from './copy/index.js'
import copySyncMod from './copy-sync/index.js'
import mkdirsMod from './mkdirs/index.js'
import removeMod from './remove/index.js'
import jsonMod from './json/index.js'
import moveMod from './move/index.js'
import emptyMod from './empty/index.js'
import ensureMod from './ensure/index.js'
import outputMod from './output/index.js'
import walkMod from './walk/index.js'
import walkSyncMod from './walk-sync/index.js'

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
  get() {
    return fs.spaces
  },
  set(val) {
    fs.spaces = val
  }
})
