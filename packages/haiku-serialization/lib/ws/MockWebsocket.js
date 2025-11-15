var MockWebsocket = /** @class */ (function () {
    function MockWebsocket(eventEmitter) {
        if (eventEmitter === void 0) { eventEmitter = null; }
        this.eventEmitter = eventEmitter;
    }
    MockWebsocket.prototype.on = function (eventName, handler) {
        if (this.eventEmitter === null) {
            return;
        }
        // In mock mode, we can use whatever event emitter was provided to us.
        this.eventEmitter.on(eventName, function (_, payload) {
            handler(payload);
        });
    };
    MockWebsocket.prototype.connect = function () { };
    MockWebsocket.prototype.disconnect = function () { };
    MockWebsocket.prototype.send = function () { };
    MockWebsocket.prototype.method = function () { };
    MockWebsocket.prototype.request = function () { };
    MockWebsocket.prototype.action = function (method, params, cb) {
        return cb();
    };
    return MockWebsocket;
}());
module.exports = MockWebsocket;
//# sourceMappingURL=MockWebsocket.js.map