var nodehook = require('node-hook');
var path = require('path');
var remapSource = require('../ast/remapSource');
module.exports = function (cb, remapParams, iterator) {
    nodehook.hook('.js', function (source, filename) {
        if (path.basename(filename) !== 'code.js') {
            return source;
        }
        var updated = remapSource(source, remapParams);
        if (iterator) {
            iterator(filename, updated, source);
        }
        return updated;
    });
    return cb(function () { return nodehook.unhook('.js'); });
};
//# sourceMappingURL=overrideModulesLoaded.js.map