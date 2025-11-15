var EventEmitter = require('events').EventEmitter;
// Prevent trigger-happy MaxListenersExceededWarning
if (process.env.NODE_ENV === 'staging' || process.env.NODE_ENV === 'production') {
    EventEmitter.prototype._maxListeners = Infinity;
}
else {
    EventEmitter.prototype._maxListeners = 500;
}
/**
 * @class EmitterManager
 * @description For classes that are both emitters and which listen to emitters.
 * Intended to help manage large arrays of event emitters and abstract some complexity.
 */
var EmitterManager = /** @class */ (function () {
    function EmitterManager() {
        // Collection of event emitters tracked so we can sub/unsub from them in bulk
        // Array<{eventEmitter:EventEmitter, eventName:string, eventHandler:Function}>
        this._emitters = [];
    }
    EmitterManager.prototype.addEmitterListener = function (eventEmitter, eventName, eventHandler, options) {
        this._emitters.push([eventEmitter, eventName, eventHandler]);
        if (eventEmitter.on) {
            eventEmitter.on(eventName, eventHandler);
        }
        else if (eventEmitter.addEventListener) {
            eventEmitter.addEventListener(eventName, eventHandler, options);
        }
    };
    EmitterManager.prototype.addEmitterListenerIfNotAlreadyRegistered = function (eventEmitter, eventName, eventHandler) {
        // HACK: Instead of expanding the emitter directly, store this on ourselves somehow
        if (!eventEmitter._emitterManagerListenersRegistered) {
            eventEmitter._emitterManagerListenersRegistered = {};
        }
        if (!eventEmitter._emitterManagerListenersRegistered[eventName]) {
            eventEmitter._emitterManagerListenersRegistered[eventName] = eventHandler;
            this.addEmitterListener(eventEmitter, eventName, eventHandler);
        }
    };
    EmitterManager.prototype.removeEmitterListeners = function () {
        // Clean up subscriptions to prevent memory leaks and react warnings
        this._emitters.forEach(function (tuple) {
            tuple[0].removeListener(tuple[1], tuple[2]);
        });
    };
    return EmitterManager;
}());
EmitterManager.extend = function (instance) {
    var emitterManager = new EmitterManager();
    var propertyNames = Object.getOwnPropertyNames(EmitterManager.prototype);
    propertyNames.forEach(function (propertyName) {
        if (propertyName === 'constructor') {
            return;
        }
        var foundProperty = emitterManager[propertyName];
        if (typeof foundProperty === 'function') {
            instance[propertyName] = foundProperty.bind(emitterManager);
        }
    });
    return instance;
};
module.exports = EmitterManager;
//# sourceMappingURL=EmitterManager.js.map