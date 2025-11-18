import path from 'node:path';
import os from 'node:os';
import fse from 'fs-extra';
import async from 'async';

let didTakeTourCache = null;

export const HOMEDIR_PATH = path.join(os.homedir(), '.haiku');
export const HOMEDIR_AUTH_PATH = path.join(HOMEDIR_PATH, 'auth');
export const HOMEDIR_PROJECTS_PATH = path.join(HOMEDIR_PATH, 'projects');
export const HOMEDIR_LOGS_PATH = path.join(HOMEDIR_PATH, 'logs');
export const HOMEDIR_MODEL_STORAGE_PATH = path.join(HOMEDIR_PATH, 'model-storage');
export const HOMEDIR_CRASH_REPORTS_PATH = path.join(HOMEDIR_PATH, 'crash-reports');
export const HOMEDIR_MANIFEST_PATH = path.join(HOMEDIR_PATH, 'manifest.json');
export const HOMEDIR_TOUR_PATH = path.join(HOMEDIR_PATH, 'tour.json');
export const HOMEDIR_SKETCH_DIALOG_PATH = path.join(HOMEDIR_PATH, 'sketch-dialog');

export const didTakeTour = () => {
  if(didTakeTourCache === null) {
    didTakeTourCache = fse.existsSync(HOMEDIR_TOUR_PATH);
  }
  return didTakeTourCache;
};

export const createTourFile = () => {
  didTakeTourCache = true;
  return fse.ensureFileSync(HOMEDIR_TOUR_PATH);
};

export const didAskedForSketch = () => {
  return fse.existsSync(HOMEDIR_SKETCH_DIALOG_PATH);
};

export const createSketchDialogFile = () => {
  return fse.ensureFileSync(HOMEDIR_SKETCH_DIALOG_PATH);
};

function isDir(abspath) {
  try {
    return fse.lstatSync(abspath).isDirectory();
  } catch(exception) {
    console.warn(exception);
    return false;
  }
}

export const enumerateAllProjectsByOrganization = (cb) => {
  return fse.readdir(HOMEDIR_PROJECTS_PATH, (err, orgEntries) => {
    if(err) {
      return err;
    }
    const organizations = {};
    return async.each(orgEntries, (orgEntry, nextOrgEntry) => {
      const orgAbspath = path.join(HOMEDIR_PROJECTS_PATH, orgEntry);
      if(!isDir(orgAbspath)) {
        return nextOrgEntry();
      }
      if(orgEntry[0] === '.') {
        return nextOrgEntry();
      }
      organizations[orgEntry] = [];
      return fse.readdir(orgAbspath, (err, projEntries) => {
        if(err) {
          return nextOrgEntry();
        }
        if(!projEntries) {
          return nextOrgEntry();
        }
        projEntries.forEach((projEntry) => {
          const projAbspath = path.join(orgAbspath, projEntry);
          if(!isDir(projAbspath)) {
            return;
          }
          if(projEntry[0] === '.') {
            return;
          }
          if(projEntry[0] === '~') {
            return;
          }
          if(projEntry.match(/\.bak/)) {
            return;
          }
          organizations[orgEntry].push({
            project: projEntry,
            abspath: projAbspath,
          });
        });
        return nextOrgEntry();
      });
    }, (err) => {
      if(err) {
        return cb(err);
      }
      return cb(null, organizations);
    });
  });
};

const out = {
  HOMEDIR_PATH,
  HOMEDIR_AUTH_PATH,
  HOMEDIR_PROJECTS_PATH,
  HOMEDIR_LOGS_PATH,
  HOMEDIR_MODEL_STORAGE_PATH,
  HOMEDIR_CRASH_REPORTS_PATH,
  HOMEDIR_MANIFEST_PATH,
  HOMEDIR_TOUR_PATH,
  HOMEDIR_SKETCH_DIALOG_PATH,
  didTakeTour,
  createTourFile,
  didAskedForSketch,
  createSketchDialogFile,
  enumerateAllProjectsByOrganization,
};

export default out;
