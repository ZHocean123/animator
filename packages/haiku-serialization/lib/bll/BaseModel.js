var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
var EventEmitter = require('events').EventEmitter;
var lodash = require('lodash');
var Cache = require('./Cache');
var MemoryStorage = require('./storage/MemoryStorage');
var DiskStorage = require('./storage/DiskStorage');
var CryptoUtils = require('./../utils/CryptoUtils');
var EmitterManager = require('./../utils/EmitterManager');
var logger = require('./../utils/LoggerInstance');
var expressionToRO = require("@haiku/core/lib/reflection/expressionToRO.js").default;
var reifyRO = require("@haiku/core/lib/reflection/reifyRO.js").default;
var SYNC_DEBOUNCE_TIME = 100; // ms
/**
 * @class BaseModel
 * @description
 *  Base model class from which all entities in haiku-serialization/src/bll inherit.
 *  (Note: This author does not care if we call these models "BLL" entities or not;
 *  the point is that these are extremely useful; call them 'Snogglegorks' if you want.)
 *
 *  Here's what BaseModel provides:
 *    - Upsert functionality (reuse objects with the same uid)
 *     - Event emitter API for cross-entity communication
 *    - Model collection querying (Model.where, Model.find, etc.)
 *    - Built-in caching API
 *    - Handles object creation/destruction and updating the collection
 *
 *  Every instance of a subclass of BaseModel has a uid which is used to determine whether
 *  to create a new instance or return an existing instance when MyClass.upsert({}) is called.
 *  It's up to the caller to provide a uid appropriate to the model.
 *
 *  Author's note:
 *
 *  This collection of models has begun with some mixed responsibilities, including:
 *    - Dealing with view-related logic (view-model layer)
 *    - Serialization and writing to disk (DAL)
 *    - Communication transport app views (transport layer)
 *    - App business logic (BLL)
 *
 *  But keep in mind we can refactor these models to fit those divisions as we go. #TODO
 *  (Keep in mind that ALL of this logic used to live buried deep in a quagmire
 *  of tangled React-specific UI logic that had become almost impossible to work with.)
 */
var BaseModel = /** @class */ (function (_super) {
    __extends(BaseModel, _super);
    function BaseModel(props, opts) {
        var _this = _super.call(this) || this;
        EmitterManager.extend(_this);
        if (!_this.constructor.extended) {
            throw new Error("You must call BaseModel.extend(".concat(_this.constructor.name, ")"));
        }
        if (!_this.options) {
            _this.options = {};
        }
        _this.setOptions(opts);
        // If validation is off, we know what we're doing and will add required props later
        if (!_this.options.validationOff) {
            if (_this.options.required) {
                for (var requirement in _this.options.required) {
                    if (props[requirement] === undefined) {
                        throw new Error("Property '".concat(requirement, "' is required"));
                    }
                }
            }
        }
        // Whether or not we should actively sync to remote instances of this model
        _this.__sync = false;
        // Allow us to freely call sync on any update without backing up websockets
        _this.syncDebounced = lodash.debounce(function () {
            _this.sync();
        }, SYNC_DEBOUNCE_TIME);
        // Enough models have this relationship that we provide it from BaseModel;
        // we set this before .assign() though in case they were provided in the constructor
        _this.parent = null;
        _this.children = [];
        // Generic cache object that can store 'anything' that model instances want.
        _this.cache = new Cache();
        // Assign initial attributes. Note that __sync is falsy until later
        _this.assign(props);
        if (!_this.getPrimaryKey()) {
            _this.setPrimaryKey(_this.generateUniqueId());
        }
        _this.__storage = 'mem';
        // Tracking when we were last updated can be used to optimize UI updates
        _this.__updated = Date.now();
        _this.__checked = Date.now() - 1;
        // Fresh objects are not candidates for sweep
        _this.__initialized = Date.now();
        _this.__marked = false;
        // When a model instance is destroyed, it may not be immediately garbage collected.
        _this.__destroyed = null;
        _this._updateReceivers = {};
        if (_this.afterInitialize) {
            _this.afterInitialize();
        }
        // Now that we're done constructing, assume we're ready to send syncs
        _this.__sync = true;
        _this.constructor.add(_this);
        return _this;
    }
    /**
     * This method returns a teardown function that decommissions the update receiver provided in its second argument as
     * a callback.
     *
     * IMPORTANT: Always call the teardown function when the entity is expected not to go out of scope but the update
     * receiver is.
     *
     * @param source
     * @param cb
     * @returns {function()}
     */
    BaseModel.prototype.registerUpdateReceiver = function (source, cb) {
        var _this = this;
        if (typeof cb !== 'function') {
            return function () { };
        }
        this._updateReceivers[source] = cb;
        return function () {
            delete _this._updateReceivers[source];
        };
    };
    BaseModel.prototype.notifyUpdateReceivers = function (what) {
        var _this = this;
        Object.keys(this._updateReceivers).forEach(function (receiver) {
            _this._updateReceivers[receiver](what);
        });
    };
    BaseModel.prototype.emit = function () {
        var _a, _b;
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        (_a = _super.prototype.emit).call.apply(_a, __spreadArray([this], args, false));
        (_b = this.constructor).emit.apply(_b, __spreadArray([args[0], this], args.slice(1), false));
    };
    BaseModel.prototype.mark = function () {
        // This gets set to `false` whenever we are upserted (constructed or initialized)
        this.__marked = true;
        return true;
    };
    BaseModel.prototype.sweep = function () {
        if (this.__marked) {
            this.destroy();
            return true;
        }
        return false;
    };
    BaseModel.prototype.generateUniqueId = function () {
        return lodash.uniqueId(this.constructor.name);
    };
    BaseModel.prototype.forceUpdate = function () {
        this.setUpdateTimestamp();
        this.cache.clear();
        return this;
    };
    BaseModel.prototype.setUpdateTimestamp = function () {
        this.__updated = Date.now();
        return this;
    };
    BaseModel.prototype.getUpdateTimestamp = function () {
        return this.__updated;
    };
    BaseModel.prototype.getClassName = function () {
        return this.constructor.name;
    };
    BaseModel.prototype.getPrimaryKeyShort = function () {
        var key = this.getPrimaryKey();
        var parts = key.split(':');
        return parts[parts.length - 1];
    };
    BaseModel.prototype.getPrimaryKey = function () {
        return this[this.constructor.config.primaryKey];
    };
    BaseModel.prototype.getKeySHA = function () {
        return CryptoUtils.sha256("".concat(this.getClassName(), "-").concat(this.getPrimaryKey()));
    };
    BaseModel.prototype.toString = function () {
        return this.getPrimaryKey();
    };
    BaseModel.prototype.setPrimaryKey = function (value) {
        this[this.constructor.config.primaryKey] = value;
        return this;
    };
    BaseModel.prototype.setOptions = function (opts) {
        Object.assign(this.options, this.constructor.DEFAULT_OPTIONS, opts);
    };
    BaseModel.prototype.assign = function (props) {
        if (props) {
            for (var key in props) {
                if (props[key] !== undefined) {
                    this.set(key, props[key]);
                }
            }
        }
        this.cache.clear();
        this.setUpdateTimestamp();
        return this;
    };
    BaseModel.prototype.set = function (key, value) {
        this[key] = value;
        this.syncDebounced();
    };
    BaseModel.prototype.destroy = function () {
        this.removeFromParent();
        this.constructor.remove(this);
        this.constructor.clearCaches();
        this.__destroyed = Date.now();
        this.syncDebounced();
    };
    BaseModel.prototype.isDestroyed = function () {
        return !!this.__destroyed;
    };
    BaseModel.prototype.hasAll = function (criteria) {
        if (!criteria) {
            return true;
        }
        for (var key in criteria) {
            if (criteria[key] !== this[key]) {
                return false;
            }
        }
        return true;
    };
    BaseModel.prototype.hasAny = function (criteria) {
        for (var key in criteria) {
            if (criteria[key] === this[key]) {
                return true;
            }
        }
        return false;
    };
    BaseModel.prototype.insertChild = function (entity) {
        var _this = this;
        var found = [];
        this.children.forEach(function (child, index) {
            if (child && (child === entity ||
                child.getPrimaryKey() === entity.getPrimaryKey())) {
                found.push({ child: child, index: index });
            }
        });
        if (found.length > 0) {
            found.forEach(function (_a) {
                var child = _a.child, index = _a.index;
                // Replace the existing one with the new one, in the same slot
                _this.children.splice(index, 1, entity);
                // If the child entity is garbage, collect it
                if (child !== entity) {
                    child.destroy();
                }
            });
        }
        else {
            // But if we didn't find any copy, just insert at the end of the list
            this.children.push(entity);
        }
        // Important; some dependencies downstream need this
        entity.parent = this;
    };
    BaseModel.prototype.removeChild = function (entity) {
        if (!this.children) {
            return;
        }
        for (var i = this.children.length - 1; i >= 0; i--) {
            if (this.children[i] === entity ||
                this.children[i].getPrimaryKey() === entity.getPrimaryKey()) {
                this.children.splice(i, 1);
            }
        }
    };
    BaseModel.prototype.removeFromParent = function () {
        if (this.parent) {
            this.parent.removeChild(this);
        }
    };
    /**
     * @method off
     * @description Synonymous with removeListener; removes an event listener
     * @param channel {String} Channel to subscribe to
     * @param fn {Function} Handler function to remove
     */
    BaseModel.prototype.off = function (channel, fn) {
        return this.removeListener(channel, fn);
    };
    BaseModel.prototype.assertStorable = function () {
        if (!this.constructor.toPOJO) {
            throw new Error("BaseModel subclass must implement 'toPOJO'");
        }
        if (!this.constructor.fromPOJO) {
            throw new Error("BaseModel subclass must implement 'fromPOJO'");
        }
        if (!BaseModel.storage) {
            throw new Error("BaseModel has no 'storage' configured");
        }
        if (!this.getStorage()) {
            throw new Error("BaseModel has no '".concat(this.getStorageType(), " storage' configured"));
        }
    };
    BaseModel.prototype.getStorageType = function () {
        return this.__storage;
    };
    BaseModel.prototype.setStorageType = function (type) {
        if (!BaseModel.storage[type]) {
            throw new Error("BaseModel has no storage module '".concat(type, "'"));
        }
        this.__storage = type;
    };
    BaseModel.prototype.getStorageModule = function () {
        return BaseModel.storage[this.getStorageType()];
    };
    BaseModel.prototype.store = function () {
        this.assertStorable();
        var pojo = this.constructor.toPOJO(this);
        var key = "".concat(this.getClassName(), "-").concat(this.getKeySHA());
        var storage = this.getStorageModule();
        return storage.store(key, pojo);
    };
    BaseModel.prototype.unstore = function () {
        this.assertStorable();
        var key = "".concat(this.getClassName(), "-").concat(this.getKeySHA());
        var storage = this.getStorageModule();
        var pojo = storage.unstore(key);
        if (pojo) {
            this.constructor.fromPOJO(pojo);
        }
    };
    BaseModel.prototype.sync = function () {
        if (
        // Don't send syncs until we're globally ready to do so
        !BaseModel.__sync ||
            // Don't actually transmit if we aren't sync-ready yet
            !this.__sync ||
            // Don't try to transmit if we have no synchronize capability
            !this.synchronize) {
            return;
        }
        this.synchronize(Object.assign(this.getWireReadyPayload(), {
            name: 'remote-model:receive-sync',
            syncIntent: (this.isDestroyed())
                ? BaseModel.SYNC_INTENTS.destroy
                : BaseModel.SYNC_INTENTS.upsert,
        }));
    };
    BaseModel.prototype.getWireReadyPayload = function () {
        return {
            className: this.getClassName(),
            primaryKey: this.getPrimaryKey(),
            objectAttributes: this.getWireReadyObjectAttributes(),
        };
    };
    BaseModel.prototype.getWireReadyObjectAttributes = function () {
        return BaseModel.getWireReadyObjectAttributes(this, true, true);
    };
    return BaseModel;
}(EventEmitter));
BaseModel.SYNC_INTENTS = {
    upsert: 'upsert',
    destroy: 'destroy',
};
// Use this to toggle whether any model can send/receive syncs or not
BaseModel.__sync = false; // Caution: singleton
BaseModel.receiveSync = function (_a) {
    var syncIntent = _a.syncIntent, className = _a.className, primaryKey = _a.primaryKey, objectAttributes = _a.objectAttributes;
    // Don't try to receive any syncs if we aren't ready at all yet
    if (!BaseModel.__sync) {
        logger.warn("BaseModel sync not ready to ".concat(syncIntent, " ").concat(className, " ").concat(primaryKey));
        return;
    }
    if (!BaseModel.SYNC_INTENTS[syncIntent]) {
        throw new Error("BaseModel sync intent invalid; cannot receive");
    }
    var instance;
    switch (syncIntent) {
        case BaseModel.SYNC_INTENTS.upsert:
            instance = BaseModel.upsertFromWireObjectAttributes({ className: className, primaryKey: primaryKey, objectAttributes: objectAttributes });
            if (instance) {
                instance.emit('local-model:handle-sync', { syncIntent: syncIntent });
            }
            else {
                logger.warn("BaseModel sync could not ".concat(syncIntent, " ").concat(className, " ").concat(primaryKey));
            }
            break;
        case BaseModel.SYNC_INTENTS.destroy:
            instance = BaseModel.instanceFromModelSpec({ className: className, primaryKey: primaryKey });
            if (instance) {
                instance.destroy();
                instance.emit('local-model:handle-sync', { syncIntent: syncIntent });
            }
            else {
                logger.warn("BaseModel sync could not ".concat(syncIntent, " ").concat(className, " ").concat(primaryKey));
            }
            break;
    }
};
BaseModel.upsertFromWireObjectAttributes = function (_a) {
    var className = _a.className, primaryKey = _a.primaryKey, objectAttributes = _a.objectAttributes;
    var klass = BaseModel.getModelClassByClassName(className);
    if (!klass) {
        // We may not have a class yet if we're not fully bootstrapped (race condition)
        return;
    }
    var upsertSpec = {};
    for (var attrKey in objectAttributes) {
        var attrVal = objectAttributes[attrKey];
        // Transform a reference to an instance into the instance itself
        if (attrVal && attrVal.__model) {
            upsertSpec[attrKey] = BaseModel.instanceFromModelSpec(attrVal.__model);
            continue;
        }
        upsertSpec[attrKey] = reifyRO(attrVal);
    }
    // Must set the primary key as part of the upsertSpec for the lookup to work
    upsertSpec[klass.config.primaryKey] = primaryKey;
    return klass.upsert(upsertSpec, { validationOff: true });
};
BaseModel.instanceFromModelSpec = function (_a) {
    var className = _a.className, primaryKey = _a.primaryKey;
    var klass = BaseModel.getModelClassByClassName(className);
    // In case we receive a sync before bootstrapped, don't assume we have a class
    var instance = klass && klass.findById(primaryKey);
    return instance; // This may be undefined in race condition cases
};
BaseModel.getWireReadyObjectAttributes = function (obj, isBase, goDeep) {
    if (isBase === void 0) { isBase = false; }
    if (goDeep === void 0) { goDeep = false; }
    if (typeof obj === 'boolean' ||
        typeof obj === 'number' ||
        typeof obj === 'string' ||
        typeof obj === 'function' ||
        !obj) {
        return expressionToRO(obj);
    }
    if (goDeep) {
        if (Array.isArray(obj)) {
            return obj.map(BaseModel.getWireReadyObjectAttributes);
        }
        var out = {};
        for (var key in obj) {
            if (obj.hasOwnProperty(key)) {
                if (
                // Exclude any property blacklisted as reserved
                !RESERVED_PROPERTY_KEYS[key] &&
                    // Exclude any property that matches our primary key name
                    obj.constructor.config.primaryKey !== key) {
                    var result = BaseModel.getWireReadyObjectAttributes(obj[key], false, false);
                    // Undefined indicates no change when upserting, to we just exclude these
                    if (result !== undefined) {
                        out[key] = result;
                    }
                }
            }
        }
        return out;
    }
    if (obj instanceof BaseModel && !goDeep) {
        return {
            __model: {
                className: obj.getClassName(),
                primaryKey: obj.getPrimaryKey(),
            },
        };
    }
};
// HACK: I want to blacklist all methods properties that belong to BaseModel,
// but I can't figure out how to do it. klass.prototype[] didn't work?
var RESERVED_PROPERTY_KEYS = {
    __checked: true,
    __destroyed: true,
    __initialized: true,
    __marked: true,
    __proxy: true,
    __storage: true,
    __sync: true,
    __updated: true,
    _events: true,
    _eventsCount: true,
    _maxListeners: true,
    _updateReceivers: true,
    addEmitterListener: true,
    addEmitterListenerIfNotAlreadyRegistered: true,
    cache: true,
    children: true,
    options: true,
    parent: true,
    removeEmitterListeners: true,
    synchronize: true,
    sync: true,
    syncDebounced: true,
    uid: true,
};
BaseModel.DEFAULT_OPTIONS = {};
BaseModel.storage = {
    mem: new MemoryStorage(),
    disk: new DiskStorage(),
};
BaseModel.extensions = [];
BaseModel.extend = function extend(klass, opts) {
    if (!klass.extended) {
        createCollection(klass, opts);
        klass.emitter = new EventEmitter();
        klass.emit = klass.emitter.emit.bind(klass.emitter);
        klass.on = klass.emitter.on.bind(klass.emitter);
        lodash.defaults(klass.DEFAULT_OPTIONS, BaseModel.DEFAULT_OPTIONS);
        klass.extended = true;
        BaseModel.extensions.push(klass);
    }
};
var KNOWN_MODEL_CLASSES = {};
BaseModel.getModelClassByClassName = function (className) {
    return KNOWN_MODEL_CLASSES[className];
};
var createCollection = function (klass, opts) {
    KNOWN_MODEL_CLASSES[klass.name] = klass;
    klass.config = {
        primaryKey: 'uid',
    };
    Object.assign(klass.config, opts);
    // Use two internal representations of the full table: an array collection for querying where order matters, and a
    // hashmap collection for fast primary key lookups.
    var arrayCollection = [];
    var hashmapCollection = {};
    klass.idx = function (instance) {
        for (var i = 0; i < arrayCollection.length; i++) {
            if (arrayCollection[i] === instance) {
                return i;
            }
        }
        return -1;
    };
    klass.setInstancePrimaryKey = function (instance, primaryKey) {
        if (klass.has(instance)) {
            delete hashmapCollection[instance.getPrimaryKey()];
            instance.setPrimaryKey(primaryKey);
            hashmapCollection[instance.getPrimaryKey()] = instance;
        }
    };
    klass.get = function (instance) {
        return hashmapCollection[instance.getPrimaryKey()] || null;
    };
    klass.has = function (instance) { return hashmapCollection[instance.getPrimaryKey()] !== undefined; };
    klass.add = function (instance) {
        if (!klass.has(instance)) {
            arrayCollection.push(instance);
            hashmapCollection[instance.getPrimaryKey()] = instance;
        }
    };
    klass.remove = function (instance) {
        // Note: We previously only did this work if klass.has() evaluated to true,
        // but this caused issues where models weren't removed correctly if we ended
        // up adding multiple elements to the collection with the same id, which occurred
        // due to an implementation detail in Keyframe when dragging to 0
        var idx = klass.idx(instance);
        if (idx !== -1) {
            arrayCollection.splice(idx, 1);
        }
        delete hashmapCollection[instance.getPrimaryKey()];
    };
    klass.all = function () { return arrayCollection; };
    klass.count = function () { return klass.all().length; };
    klass.filter = function (iteratee) { return klass.all().filter(iteratee); };
    klass.where = function (criteria) {
        return klass.filter(function (instance) { return instance.hasAll(criteria); });
    };
    klass.any = function (criteria) {
        return klass.filter(function (instance) { return instance.hasAll(criteria); });
    };
    klass.find = function (criteria) {
        var found = klass.where(criteria);
        return found && found[0];
    };
    klass.findById = function (id) { return hashmapCollection[id]; };
    // eslint-disable-next-line
    klass.create = function (props, opts) { return new klass(props, opts); };
    klass.upsert = function (props, opts) {
        klass.clearCaches();
        var primaryKey = props[klass.config.primaryKey];
        var found = klass.findById(primaryKey); // Criteria in case of id collisions :/
        if (found) {
            found.assign(props);
            found.setOptions(opts);
            // The object is fresh again and no longer a candidate for sweep
            found.__initialized = Date.now();
            found.__marked = false;
            if (found.afterInitialize) {
                found.afterInitialize();
            }
            return found;
        }
        return klass.create(props, opts);
    };
    klass.clearCaches = function () {
        arrayCollection.forEach(function (item) {
            item.cache.clear();
        });
    };
    klass.sweep = function () {
        arrayCollection.forEach(function (item) {
            item.sweep();
        });
    };
    klass.purge = function () {
        while (arrayCollection.length > 0) {
            arrayCollection[0].destroy();
        }
    };
};
module.exports = BaseModel;
//# sourceMappingURL=BaseModel.js.map