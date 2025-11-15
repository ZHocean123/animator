var Cache = /** @class */ (function () {
    function Cache(data) {
        if (data === void 0) { data = {}; }
        this.data = data;
    }
    Cache.prototype.reset = function (data) {
        if (data === void 0) { data = {}; }
        this.data = data;
    };
    Cache.prototype.clear = function () {
        this.data = {};
    };
    Cache.prototype.get = function (key) {
        return this.data[key];
    };
    Cache.prototype.set = function (key, value) {
        this.data[key] = value;
    };
    Cache.prototype.unset = function (key) {
        this.data[key] = undefined;
    };
    Cache.prototype.fetch = function (key, provider, postproc) {
        var found = this.get(key);
        if (found !== undefined) {
            return (postproc) ? postproc(found) : found;
        }
        var given = provider();
        this.set(key, given);
        return (postproc) ? postproc(given) : given;
    };
    Cache.prototype.async = function (key, provider, cb, postproc) {
        var _this = this;
        var found = this.get(key);
        if (found !== undefined) {
            return cb(null, (postproc) ? postproc(found) : found);
        }
        return provider(function (err, given) {
            if (err) {
                return cb(err);
            }
            _this.set(key, given);
            return cb(null, (postproc) ? postproc(given) : given);
        });
    };
    return Cache;
}());
module.exports = Cache;
//# sourceMappingURL=Cache.js.map