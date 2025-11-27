import { execSync } from 'node:child_process'
import os from 'node:os'
import path from 'node:path'
import { isMac, isWindows } from 'haiku-common'
import fse from 'haiku-fs-extra'
import { v4 as uuidv4 } from 'uuid'
import fileManipulation from '../utils/fileManipulation'
import logger from '../utils/LoggerInstance'

const IS_ILLUSTRATOR_FILE_RE = /\.ai$/
const IS_ILLUSTRATOR_FOLDER_RE = /\.ai\.contents/
let cachedWindowsInstallPath: string | null = null

const EXPORTER_SCRIPT = `
  if (app.documents.length > 0) {
    var exportOptions = new ExportOptionsSVG()
    var type = ExportType.SVG
    var dest = 'DESTINATION_PATH'
    var sourcePath = 'SOURCE_PATH'
    var fileSpec = new File(dest)

    app.open(new File(sourcePath))
    var srcFile = app.activeDocument.fullName;
    exportOptions.embedRasterImages = true
    exportOptions.embedAllFonts = false
    exportOptions.cssProperties = SVGCSSPropertyLocation.PRESENTATIONATTRIBUTES
    exportOptions.fontSubsetting = SVGFontSubsetting.None
    exportOptions.fontType = SVGFontType.OUTLINEFONT
    exportOptions.documentEncoding = SVGDocumentEncoding.UTF8
    exportOptions.saveMultipleArtboards = true
    app.activeDocument.exportFile(fileSpec, type, exportOptions)
    app.activeDocument.close(SaveOptions.DONOTSAVECHANGES);
    app.open(srcFile);
  }
`

function stringifyPath(p: string) { return (fileManipulation as any).stringifyPath(p) }

class Illustrator {
  static isIllustratorFile(abspath: string) { return abspath.match(IS_ILLUSTRATOR_FILE_RE) }
  static isIllustratorFolder(abspath: string) { return !!abspath && abspath.match(IS_ILLUSTRATOR_FOLDER_RE) }
  static importSVG({ abspath, tryToOpenFile }: { abspath: string, tryToOpenFile?: boolean }) {
    if (!Illustrator.isIllustratorFile(abspath)) {
      return false
      (logger as any).info('[illustrator] got', abspath)
    }
    const assetBaseFolder = `${abspath}.contents`
    const artboardFolder = path.join(assetBaseFolder, 'artboards/')
    fse.emptyDirSync(assetBaseFolder)
    fse.mkdirpSync(artboardFolder)
    (logger as any).info('[illustrator] running commands')
    const tmpdir = os.tmpdir()
    const fileName = `${uuidv4()}.jsx`
    const exportScriptPath = path.join(tmpdir, fileName)
    const exportScript = EXPORTER_SCRIPT.replace('DESTINATION_PATH', stringifyPath(artboardFolder)).replace('SOURCE_PATH', stringifyPath(abspath))
    fse.writeFileSync(exportScriptPath, exportScript)
    if (tryToOpenFile) { execSync(Illustrator.openIllustratorFile(abspath)); setTimeout(() => Illustrator.openIllustratorFile(exportScriptPath), 5000) }
    else { execSync(Illustrator.openIllustratorFile(exportScriptPath)) }
    return true
  }

  static openIllustratorFile(file: string) {
    if (isMac())
      return `open -g -b com.adobe.Illustrator ${file}`; if (isWindows())
      return `"${Illustrator.getWindowsIllustratorPath()}" "${file}"`
  }

  static getWindowsIllustratorPath() {
    if (cachedWindowsInstallPath)
      return cachedWindowsInstallPath
    let illustratorPath
    try {
      const installedApplications = execSync('reg QUERY "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths" /s').toString()
      illustratorPath = installedApplications.split('\n').find((record: string) => record.includes('Illustrator') && record.includes('Default'))!.match(/([a-z]:.+)/gi)![0]
    }
    catch (error) { (logger as any).info('[illustrator] error finding Illustrator: ', error); return }
    if (!illustratorPath) { (logger as any).info('[illustrator] unable to find an Illustrator installation'); return }
    cachedWindowsInstallPath = illustratorPath
    return illustratorPath
  }
}

export default Illustrator
export { Illustrator }
