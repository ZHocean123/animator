import { execSync } from 'node:child_process'
import path from 'node:path'
import fse from 'haiku-fs-extra'
import { PNG } from 'pngjs'
import sketchUtils from '../utils/sketchUtils'
import logger from './../utils/LoggerInstance'

import BaseModel from './BaseModel'

const LOOKS_LIKE_SLICE = /\.sketch\.contents\/slices\//
const LOOKS_LIKE_ARTBOARD = /\.sketch\.contents\/artboards\//
const LOOKS_LIKE_PAGE = /\.sketch\.contents\/pages\//
const IS_SKETCH_FILE_RE = /\.sketch$/
const IS_SKETCH_FOLDER_RE = /\.sketch\.contents/
const PARSER_CLI_PATH = '/Contents/Resources/sketchtool/bin/sketchtool'
const BASE64_BITMAP_RE = /"data:image\/(png|jpe?g|gif);base64,(.*?)"/gi

class Sketch extends (BaseModel as any) {}

;(Sketch as any).INSTALL_PATH = '/Applications/Sketch.app'
;(Sketch as any).findAndUpdateInstallPath = () => { (sketchUtils as any).checkIfInstalled().then((possibleSketchPath: string) => { (Sketch as any).INSTALL_PATH = possibleSketchPath || (Sketch as any).INSTALL_PATH }) }
;(Sketch as any).DEFAULT_OPTIONS = { required: {} }
;(BaseModel as any).extend(Sketch)

;(Sketch as any).looksLikeSlice = (relpath: string) => relpath.match(LOOKS_LIKE_SLICE)
;(Sketch as any).looksLikeArtboard = (relpath: string) => relpath.match(LOOKS_LIKE_ARTBOARD)
;(Sketch as any).looksLikePage = (relpath: string) => relpath.match(LOOKS_LIKE_PAGE)
;(Sketch as any).isSketchFile = (abspath: string) => abspath.match(IS_SKETCH_FILE_RE)
;(Sketch as any).isSketchFolder = (abspath: string) => !!abspath && abspath.match(IS_SKETCH_FOLDER_RE)
;(Sketch as any).exportFolderPath = (sketchRelpath: string) => { const cleanBasename = path.basename(sketchRelpath, path.extname(sketchRelpath)); const expectedExportFolderName = `${cleanBasename}.sketch.contents`; return path.join(path.dirname(sketchRelpath), expectedExportFolderName) }

;(Sketch as any).sketchtoolPipeline = (abspath: string) => {
  const sketchtoolPath = (Sketch as any).INSTALL_PATH + PARSER_CLI_PATH
  if (!(Sketch as any).isSketchFile(abspath))
    return void 0
  if (!fse.existsSync(sketchtoolPath)) {
    return void 0
    (logger as any).info('[sketchtool] got', abspath)
  }
  const assetBaseFolder = `${abspath}.contents/`
  fse.emptyDirSync(assetBaseFolder)
  const sliceFolder = `${assetBaseFolder}slices/`
  fse.mkdirpSync(sliceFolder)
  const artboardFolder = `${assetBaseFolder}artboards/`
  fse.mkdirpSync(artboardFolder)
  (logger as any).info('[sketchtool] running commands')
  const outputSlicesCmd = `${sketchtoolPath} export --format=svg --output=${_escapeShell(sliceFolder)} slices ${_escapeShell(abspath)}`
  execSync(outputSlicesCmd)
  const outputArtboardsCmd = `${sketchtoolPath} export --format=svg --output=${_escapeShell(artboardFolder)} artboards ${_escapeShell(abspath)}`
  execSync(outputArtboardsCmd)
  (logger as any).info('[sketchtool] fix gamma correction')
  const outputEntries = (fse as any).walkSync(assetBaseFolder)
  outputEntries.forEach((outputEntry: string) => {
    if (path.extname(outputEntry) !== '.svg')
      return void 0
    const outputContents = fse.readFileSync(outputEntry).toString()
    let numImageMatches = 0
    const updatedContents = outputContents.replace(BASE64_BITMAP_RE, (matchString: string, imageFormat: string, base64data: string) => matchString.replace(base64data, _processBase64ImageData(base64data, imageFormat, outputEntry, numImageMatches++)))
    fse.writeFileSync(outputEntry, updatedContents)
  })
  return true
}

function _escapeShell(cmd: string) { return cmd.replace(/(["\s'$`\\])/g, '\\$1') }
function _processBase64ImageData(base64data: string, imageFormat: string, fileAbspath: string, bitmapIndex: number) {
  if (imageFormat === 'png') {
    const imageBufferData = Buffer.from(base64data, 'base64')
    const pngInstance = (PNG as any).sync.read(imageBufferData)
    ;(pngInstance as any).gamma = 1 / 2.2
    (PNG as any).adjustGamma(pngInstance)
    const updatedBufferData = (PNG as any).sync.write(pngInstance)
    const updated64data = updatedBufferData.toString('base64')
    return updated64data
  }
  return base64data
}

export default Sketch
export { Sketch }
