import * as os from 'node:os'
import * as path from 'node:path'
import * as async from 'async'
import * as fse from 'fs-extra'
import logger from './LoggerInstance'

type OrgProjects = Record<string, Array<{ project: string, abspath: string }>>

export const HOMEDIR_PATH = path.join(os.homedir(), '.haiku')

let didTakeTourCache: boolean | null = null

 export const HOMEDIR_AUTH_PATH= path.join(HOMEDIR_PATH, 'auth')
 export const HOMEDIR_PROJECTS_PATH= path.join(HOMEDIR_PATH, 'projects')
 export const HOMEDIR_LOGS_PATH= path.join(HOMEDIR_PATH, 'logs')
 export const HOMEDIR_MODEL_STORAGE_PATH= path.join(HOMEDIR_PATH, 'model-storage')
 export const HOMEDIR_CRASH_REPORTS_PATH= path.join(HOMEDIR_PATH, 'crash-reports')
 export const HOMEDIR_MANIFEST_PATH= path.join(HOMEDIR_PATH, 'manifest.json')
 export const HOMEDIR_TOUR_PATH= path.join(HOMEDIR_PATH, 'tour.json')
 export const HOMEDIR_SKETCH_DIALOG_PATH= path.join(HOMEDIR_PATH, 'sketch-dialog')

 export function didTakeTour(): boolean {
    if (didTakeTourCache === null) {
      didTakeTourCache = fse.existsSync(HOMEDIR_TOUR_PATH)
    }
    return didTakeTourCache as boolean
  }

 export function createTourFile(): void {
    didTakeTourCache = true
    fse.ensureFileSync(HOMEDIR_TOUR_PATH)
  }

  export function didAskedForSketch(): boolean {
    return fse.existsSync(HOMEDIR_SKETCH_DIALOG_PATH)
  }

export function  createSketchDialogFile(): void {
    fse.ensureFileSync(HOMEDIR_SKETCH_DIALOG_PATH)
  }

 export function enumerateAllProjectsByOrganization(cb: (err: Error | null, orgs?: OrgProjects) => void) {
    return fse.readdir(HOMEDIR_PROJECTS_PATH, (err, orgEntries) => {
      if (err)
        return cb(err)
      const organizations: OrgProjects = {}
      return async.each(
        orgEntries || [],
        (orgEntry: string, nextOrgEntry: (err?: Error | null) => void) => {
          const orgAbspath = path.join(HOMEDIR_PROJECTS_PATH, orgEntry)
          if (!isDir(orgAbspath))
            return nextOrgEntry()
          if (orgEntry[0] === '.')
            return nextOrgEntry()
          organizations[orgEntry] = []
          return fse.readdir(orgAbspath, (err, projEntries) => {
            if (err || !projEntries)
              return nextOrgEntry()
            projEntries.forEach((projEntry) => {
              const projAbspath = path.join(orgAbspath, projEntry)
              if (!isDir(projAbspath))
                return
              if (projEntry[0] === '.')
                return
              if (projEntry[0] === '~')
                return
              if (projEntry.match(/\.bak/))
                return
              organizations[orgEntry].push({ project: projEntry, abspath: projAbspath })
            })
            return nextOrgEntry()
          })
        },
        (err) => {
          if (err)
            return cb(err)
          return cb(null, organizations)
        },
      )
    })
  }

function isDir(abspath: string): boolean {
  try {
    return fse.lstatSync(abspath).isDirectory()
  }
  catch (exception: any) {
    try { 
      logger.warn(exception)
    }
    catch {}
    return false
  }
}
 
