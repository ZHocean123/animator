var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
var fs = require('fs');
var path = require('path');
var semver = require('semver');
var DEFAULT_CHANGELOG_PATH = path.join(__dirname, '..', '..', '..', '..', 'changelog/public');
var Changelog = /** @class */ (function () {
    function Changelog(lastViewedChangelog, changelogPath) {
        if (lastViewedChangelog === void 0) { lastViewedChangelog = process.env.HAIKU_RELEASE_VERSION; }
        if (changelogPath === void 0) { changelogPath = DEFAULT_CHANGELOG_PATH; }
        this.cachedChangelog = null;
        this.lastViewedChangelog = lastViewedChangelog;
        this.changelogPath = changelogPath;
    }
    Changelog.prototype.readSingleChangelog = function (changelog) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            fs.readFile(path.join(_this.changelogPath, changelog), 'utf8', function (err, content) {
                err ? reject(err) : resolve(JSON.parse(content));
            });
        });
    };
    Changelog.prototype.readChangelogs = function () {
        var _this = this;
        var rawChangelogs = fs.readdirSync(this.changelogPath, 'utf8').filter(function (filename) {
            return filename === 'latest.json' ||
                semver.gt(path.basename(filename, '.json'), _this.lastViewedChangelog || '0.0.0');
        }).sort(function (a, b) {
            if (b === 'latest.json') {
                return -1;
            }
            if (a === 'latest.json') {
                return 1;
            }
            return semver.lt(path.basename(a, '.json'), path.basename(b, '.json')) ? -1 : 1;
        });
        return Promise.all(rawChangelogs.map(function (changelogFilename) { return _this.readSingleChangelog(changelogFilename); }));
    };
    Changelog.prototype.getChangelog = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            if (_this.cachedChangelog) {
                resolve(_this.cachedChangelog);
            }
            else {
                _this.readChangelogs()
                    .then(function (changelogs) {
                    var latest = changelogs[changelogs.length - 1];
                    var outputSections = {};
                    for (var _i = 0, changelogs_1 = changelogs; _i < changelogs_1.length; _i++) {
                        var changelog = changelogs_1[_i];
                        for (var section in changelog.sections) {
                            outputSections[section] = __spreadArray(__spreadArray([], changelog.sections[section], true), (outputSections[section] ? outputSections[section] : []), true);
                        }
                    }
                    latest.sections = outputSections;
                    _this.cachedChangelog = latest;
                    resolve(latest);
                })
                    .catch(function (error) {
                    reject(error);
                });
            }
        });
    };
    return Changelog;
}());
module.exports = Changelog;
//# sourceMappingURL=Changelog.js.map