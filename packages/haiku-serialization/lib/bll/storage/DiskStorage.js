var fse = require('haiku-fs-extra');
var path = require('path');
var HOMEDIR_MODEL_STORAGE_PATH = require('./../../utils/HaikuHomeDir').HOMEDIR_MODEL_STORAGE_PATH;
fse.mkdirpSync(HOMEDIR_MODEL_STORAGE_PATH);
var DiskStorage = /** @class */ (function () {
    function DiskStorage() {
    }
    DiskStorage.prototype.store = function (key, pojo) {
        fse.writeJsonSync(path.join(HOMEDIR_MODEL_STORAGE_PATH, "".concat(key, ".json")), pojo, { spaces: 2 });
        return pojo;
    };
    DiskStorage.prototype.unstore = function (key) {
        return fse.readJsonSync(path.join(HOMEDIR_MODEL_STORAGE_PATH, "".concat(key, ".json")));
    };
    return DiskStorage;
}());
module.exports = DiskStorage;
//# sourceMappingURL=DiskStorage.js.map