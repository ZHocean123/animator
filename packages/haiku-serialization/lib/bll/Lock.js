var EventEmitter = require('events').EventEmitter;
var ACTIVE_LOCKS = {};
var LOCKS = {
    ActiveComponentWork: 'ActiveComponentWork',
    ActiveComponentReload: 'ActiveComponentReload',
    FilePerformComponentWork: 'FilePerformComponentWork',
    FileReadWrite: function (abspath) {
        return "FileReadWrite:".concat(abspath);
    },
    ProjectMethodHandler: 'ProjectMethodHandler',
    ActionStackUndoRedo: 'ActionStackUndoRedo',
    SetCurrentActiveComponent: 'SetCurrentActiveComponent',
};
var emitter = new EventEmitter();
var request = function (key, emit, cb) {
    if (!key) {
        throw new Error('Lock key must be truthy');
    }
    if (ACTIVE_LOCKS[key]) {
        // Push to the end of the stack
        return setTimeout(function () { return request(key, emit, cb); }, 0);
    }
    ACTIVE_LOCKS[key] = true;
    if (emit) {
        emitter.emit('lock-on', key);
    }
    var release = function () {
        if (emit) {
            emitter.emit('lock-off', key);
        }
        ACTIVE_LOCKS[key] = false;
    };
    return cb(release);
};
var awaitFree = function (keys, cb) {
    var anyLocked = false;
    keys.forEach(function (key) {
        if (ACTIVE_LOCKS[key]) {
            anyLocked = true;
        }
    });
    if (anyLocked) {
        return setTimeout(function () { return awaitFree(keys, cb); }, 100);
    }
    return cb();
};
var awaitAllLocksFree = function (cb) { return awaitFree(Object.keys(ACTIVE_LOCKS), cb); };
var awaitAllLocksFreeExcept = function (keys, cb) {
    var allKeys = Object.keys(ACTIVE_LOCKS).filter(function (key) { return keys.indexOf(key) === -1; });
    return awaitFree(allKeys, cb);
};
module.exports = {
    request: request,
    emitter: emitter,
    awaitFree: awaitFree,
    awaitAllLocksFree: awaitAllLocksFree,
    awaitAllLocksFreeExcept: awaitAllLocksFreeExcept,
    LOCKS: LOCKS,
    ACTIVE_LOCKS: ACTIVE_LOCKS,
};
//# sourceMappingURL=Lock.js.map