import { exec } from 'node:child_process'
import path from 'node:path'
import { isMac } from 'haiku-common'
import logger from './LoggerInstance'

const SKETCH_PATH_FINDER = `mdfind "kMDItemKind == 'Application'" | grep Sketch.app`
const PARSER_CLI_PATH = '/Contents/Resources/sketchtool/bin/sketchtool'
let sketchInstalledCache: boolean | null = null

export default {
  dumpToPaths(rawDump: string) {
    (logger as any).info('[sketch utils] about to parse Sketch paths', rawDump)
    return rawDump.trim().split('\n').filter(Boolean)
  },
  pathsToInstallationInfo(sketchPaths: string[]) {
    const resolvingSketchPaths = sketchPaths.map(sketchPath => new Promise((resolve) => {
      const sketchtoolPath = path.join(sketchPath, PARSER_CLI_PATH)
      exec(`${sketchtoolPath} --version`, (error, stdout, stderr) => {
        if (error || !stdout || stdout.trim().length === 0 || stderr)
          return resolve(null)
        const rawBuildNumber = (stdout.match(/\((.*?)\)/) as RegExpMatchArray)[1]
        const sketchtoolBuildNumber = Number(rawBuildNumber)
        return resolve({ sketchPath, sketchtoolBuildNumber })
      })
    }))
    return Promise.all(resolvingSketchPaths)
  },
  getDumpInfo() {
    return new Promise((resolve, reject) => {
      exec(SKETCH_PATH_FINDER, (error, stdout, stderr) => {
        if (error || !stdout || stdout.trim().length === 0 || stderr)
          return reject(error)
        return resolve(stdout as any)
      })
    })
  },
  findBestPath(sketchPaths: Array<{ sketchPath: string, sketchtoolBuildNumber: number } | null>) {
    const sortedPaths = (sketchPaths as any).filter(Boolean).sort((a: any, b: any) => b.sketchtoolBuildNumber - a.sketchtoolBuildNumber)
    return sortedPaths[0] && sortedPaths[0].sketchPath
  },
  unsetSketchInstalledCache() { sketchInstalledCache = null },
  checkIfInstalled() {
    if (isMac()) {
      return new Promise((resolve) => {
        if (sketchInstalledCache !== null) {
          return resolve(sketchInstalledCache)
        }
        (this as any).getDumpInfo().then((this as any).dumpToPaths).then((this as any).pathsToInstallationInfo).then((this as any).findBestPath).then((p: string | null) => {
          sketchInstalledCache = Boolean(p)
          resolve(p)
        }).catch((error: any) => {
         logger.info('[sketch utils] error finding Sketch: ', error)
          sketchInstalledCache = false
          resolve(false)
        })
      })
    }
    logger.info('[sketch utils] Platform does not support Sketch')
    return new Promise(resolve => resolve(null))
  },
}
