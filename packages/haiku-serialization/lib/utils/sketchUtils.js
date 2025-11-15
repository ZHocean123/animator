var path = require('path');
var exec = require('child_process').exec;
var logger = require('./LoggerInstance');
var isMac = require('haiku-common/lib/environments/os').isMac;
var SKETCH_PATH_FINDER = "mdfind \"kMDItemKind == 'Application'\" | grep Sketch.app";
var PARSER_CLI_PATH = '/Contents/Resources/sketchtool/bin/sketchtool';
var sketchInstalledCache = null;
module.exports = {
    dumpToPaths: function (rawDump) {
        logger.info('[sketch utils] about to parse Sketch paths', rawDump);
        return rawDump
            .trim()
            .split('\n')
            .filter(Boolean);
    },
    pathsToInstallationInfo: function (sketchPaths) {
        var resolvingSketchPaths = sketchPaths.map(function (sketchPath) {
            return new Promise(function (resolve, reject) {
                var sketchtoolPath = path.join(sketchPath, PARSER_CLI_PATH);
                exec("".concat(sketchtoolPath, " --version"), function (error, stdout, stderr) {
                    if (error || !stdout || stdout.trim().length === 0 || stderr) {
                        return resolve(null);
                    }
                    var rawBuildNumber = stdout.match(/\((.*?)\)/)[1];
                    var sketchtoolBuildNumber = Number(rawBuildNumber);
                    return resolve({ sketchPath: sketchPath, sketchtoolBuildNumber: sketchtoolBuildNumber });
                });
            });
        });
        return Promise.all(resolvingSketchPaths);
    },
    getDumpInfo: function () {
        return new Promise(function (resolve, reject) {
            exec(SKETCH_PATH_FINDER, function (error, stdout, stderr) {
                if (error || !stdout || stdout.trim().length === 0 || stderr) {
                    reject(error);
                }
                return resolve(stdout, stderr);
            });
        });
    },
    findBestPath: function (sketchPaths) {
        var sortedPaths = sketchPaths
            .filter(Boolean)
            .sort(function (a, b) { return b.sketchtoolBuildNumber - a.sketchtoolBuildNumber; });
        return sortedPaths[0] && sortedPaths[0].sketchPath;
    },
    unsetSketchInstalledCache: function () {
        sketchInstalledCache = null;
    },
    checkIfInstalled: function () {
        var _this = this;
        // Only Mac has sketch support
        if (isMac()) {
            return new Promise(function (resolve, reject) {
                if (sketchInstalledCache !== null) {
                    return resolve(sketchInstalledCache);
                }
                _this.getDumpInfo()
                    .then(_this.dumpToPaths)
                    .then(_this.pathsToInstallationInfo)
                    .then(_this.findBestPath)
                    .then(function (path) {
                    sketchInstalledCache = Boolean(path);
                    resolve(path);
                })
                    .catch(function (error) {
                    logger.info('[sketch utils] error finding Sketch: ', error);
                    sketchInstalledCache = false;
                    resolve(false);
                });
            });
        }
        logger.info('[sketch utils] Platform does not support Sketch');
        return new Promise(function (resolve, reject) {
            resolve(null);
        });
    },
};
//# sourceMappingURL=sketchUtils.js.map