import * as os from 'node:os'
import * as path from 'node:path'
import * as async from 'async'
import * as fse from 'fs-extra'
import logger from './LoggerInstance'

type OrgProjects = Record<string, Array<{ project: string, abspath: string }>>

const HOMEDIR_PATH = path.join(os.homedir(), '.haiku')

let didTakeTourCache: boolean | null = null

const out = {
  HOMEDIR_PATH,
  HOMEDIR_AUTH_PATH: path.join(HOMEDIR_PATH, 'auth'),
  HOMEDIR_PROJECTS_PATH: path.join(HOMEDIR_PATH, 'projects'),
  HOMEDIR_LOGS_PATH: path.join(HOMEDIR_PATH, 'logs'),
  HOMEDIR_MODEL_STORAGE_PATH: path.join(HOMEDIR_PATH, 'model-storage'),
  HOMEDIR_CRASH_REPORTS_PATH: path.join(HOMEDIR_PATH, 'crash-reports'),
  HOMEDIR_MANIFEST_PATH: path.join(HOMEDIR_PATH, 'manifest.json'),
  HOMEDIR_TOUR_PATH: path.join(HOMEDIR_PATH, 'tour.json'),
  HOMEDIR_SKETCH_DIALOG_PATH: path.join(HOMEDIR_PATH, 'sketch-dialog'),

  didTakeTour(): boolean {
    if (didTakeTourCache === null) {
      didTakeTourCache = fse.existsSync(out.HOMEDIR_TOUR_PATH)
    }
    return didTakeTourCache as boolean
  },

  createTourFile(): void {
    didTakeTourCache = true
    fse.ensureFileSync(out.HOMEDIR_TOUR_PATH)
  },

  didAskedForSketch(): boolean {
    return fse.existsSync(out.HOMEDIR_SKETCH_DIALOG_PATH)
  },

  createSketchDialogFile(): void {
    fse.ensureFileSync(out.HOMEDIR_SKETCH_DIALOG_PATH)
  },

  enumerateAllProjectsByOrganization(cb: (err: Error | null, orgs?: OrgProjects) => void) {
    return fse.readdir(out.HOMEDIR_PROJECTS_PATH, (err, orgEntries) => {
      if (err)
        return cb(err)
      const organizations: OrgProjects = {}
      return async.each(
        orgEntries || [],
        (orgEntry: string, nextOrgEntry: (err?: Error | null) => void) => {
          const orgAbspath = path.join(out.HOMEDIR_PROJECTS_PATH, orgEntry)
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
  },
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

export default out
