var fse = require('haiku-fs-extra');
var path = require('path');
module.exports = function (dir, filter, done) {
    var items = [];
    return fse.walk(dir)
        .on('data', function (item) {
        if (!filter) {
            return items.push(item);
        }
        if (filter(item.path, null, item, path.relative(dir, item.path))) {
            return items.push(item);
        }
    })
        .on('end', function () { return done(null, items); })
        .on('error', done);
};
//# sourceMappingURL=filterWalkFolder.js.map