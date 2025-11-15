var path = require('path');
var os = require('os');
var fse = require('fs-extra');
var async = require('async');
var out = {};
var didTakeTourCache = null;
var HOMEDIR_PATH = path.join(os.homedir(), '.haiku');
out.HOMEDIR_PATH = HOMEDIR_PATH;
out.HOMEDIR_AUTH_PATH = path.join(HOMEDIR_PATH, 'auth');
out.HOMEDIR_PROJECTS_PATH = path.join(HOMEDIR_PATH, 'projects');
out.HOMEDIR_LOGS_PATH = path.join(HOMEDIR_PATH, 'logs');
out.HOMEDIR_MODEL_STORAGE_PATH = path.join(HOMEDIR_PATH, 'model-storage');
out.HOMEDIR_CRASH_REPORTS_PATH = path.join(HOMEDIR_PATH, 'crash-reports');
out.HOMEDIR_MANIFEST_PATH = path.join(HOMEDIR_PATH, 'manifest.json');
out.HOMEDIR_TOUR_PATH = path.join(HOMEDIR_PATH, 'tour.json');
out.HOMEDIR_SKETCH_DIALOG_PATH = path.join(HOMEDIR_PATH, 'sketch-dialog');
// Checks if the user has taken the tour based on the
// existence of the HOMEDIR_TOUR_PATH.
//
// @returns Boolean
out.didTakeTour = function () {
    if (didTakeTourCache === null) {
        didTakeTourCache = fse.existsSync(out.HOMEDIR_TOUR_PATH);
    }
    return didTakeTourCache;
};
// Creates a file to store tour options
out.createTourFile = function () {
    // Even if the file wasn't in fact created (imagine an error on
    //  ensureFileSync), we want to set the cache anyway
    didTakeTourCache = true;
    return fse.ensureFileSync(out.HOMEDIR_TOUR_PATH);
};
// Checks if the user has taken the tour based on the
// existence of the HOMEDIR_SKETCH_DIALOG_PATH.
//
// @returns Boolean
out.didAskedForSketch = function () {
    return fse.existsSync(out.HOMEDIR_SKETCH_DIALOG_PATH);
};
// Creates a file to store tour options
out.createSketchDialogFile = function () {
    return fse.ensureFileSync(out.HOMEDIR_SKETCH_DIALOG_PATH);
};
function isDir(abspath) {
    try {
        return fse.lstatSync(abspath).isDirectory();
    }
    catch (exception) {
        logger.warn(exception);
        return false;
    }
}
out.enumerateAllProjectsByOrganization = function (cb) {
    return fse.readdir(out.HOMEDIR_PROJECTS_PATH, function (err, orgEntries) {
        if (err) {
            return err;
        }
        var organizations = {};
        return async.each(orgEntries, function (orgEntry, nextOrgEntry) {
            var orgAbspath = path.join(out.HOMEDIR_PROJECTS_PATH, orgEntry);
            // Don't include any orgs that aren't directories
            if (!isDir(orgAbspath)) {
                return nextOrgEntry();
            }
            if (orgEntry[0] === '.') {
                return nextOrgEntry();
            }
            organizations[orgEntry] = [];
            return fse.readdir(orgAbspath, function (err, projEntries) {
                if (err) {
                    return nextOrgEntry();
                }
                if (!projEntries) {
                    return nextOrgEntry();
                }
                projEntries.forEach(function (projEntry) {
                    var projAbspath = path.join(orgAbspath, projEntry);
                    // Only include visible directories that aren't backups or weird files
                    if (!isDir(projAbspath)) {
                        return;
                    }
                    if (projEntry[0] === '.') {
                        return;
                    }
                    if (projEntry[0] === '~') {
                        return;
                    }
                    if (projEntry.match(/\.bak/)) {
                        return;
                    }
                    organizations[orgEntry].push({
                        project: projEntry,
                        abspath: projAbspath,
                    });
                });
                return nextOrgEntry();
            });
        }, function (err) {
            if (err) {
                return cb(err);
            }
            return cb(null, organizations);
        });
    });
};
module.exports = out;
var logger = require('./LoggerInstance');
//# sourceMappingURL=HaikuHomeDir.js.map