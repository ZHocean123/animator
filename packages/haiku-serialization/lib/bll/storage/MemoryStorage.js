var MemoryStorage = /** @class */ (function () {
    function MemoryStorage() {
    }
    MemoryStorage.prototype.store = function (key, pojo) {
        MemoryStorage.data[key] = pojo;
        return pojo;
    };
    MemoryStorage.prototype.unstore = function (key) {
        return MemoryStorage.data[key];
    };
    return MemoryStorage;
}());
MemoryStorage.data = {};
module.exports = MemoryStorage;
//# sourceMappingURL=MemoryStorage.js.map