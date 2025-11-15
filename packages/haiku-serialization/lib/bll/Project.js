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
var fse = require('haiku-fs-extra');
var path = require('path');
var async = require('async');
var WebSocket = require('ws');
var lodash = require('lodash');
var jss = require('json-stable-stringify');
var _a = require('haiku-common/lib/experiments'), Experiment = _a.Experiment, experimentIsEnabled = _a.experimentIsEnabled;
var EnvoyClient = require('haiku-sdk-creator/lib/envoy/EnvoyClient').default;
var EnvoyLogger = require('haiku-sdk-creator/lib/envoy/EnvoyLogger').default;
var GLASS_CHANNEL = require('haiku-sdk-creator/lib/glass').GLASS_CHANNEL;
var logger = require('./../utils/LoggerInstance');
var BaseModel = require('./BaseModel');
var InteractionMode = require('@haiku/core/lib/helpers/interactionModes').InteractionMode;
var toTitleCase = require('./helpers/toTitleCase');
var Lock = require('./Lock');
var ActionStack = require('./ActionStack');
var _b = require('@haiku/sdk-client/lib/ProjectDefinitions'), getSafeProjectName = _b.getSafeProjectName, getProjectNameSafeShort = _b.getProjectNameSafeShort, getDefaultIllustratorAssetPath = _b.getDefaultIllustratorAssetPath, getDefaultSketchAssetPath = _b.getDefaultSketchAssetPath, getReactProjectName = _b.getReactProjectName, getProjectNameLowerCase = _b.getProjectNameLowerCase, readPackageJson = _b.readPackageJson, getAngularSelectorName = _b.getAngularSelectorName;
var SILENT_METHODS = {
    hoverElement: true,
    unhoverElement: true,
};
/**
 * @class Project
 * @description
 *  Representation of an entire project folder, including:
 *    - All File objects tracked therein
 *    - All ActiveComponent objects
 *    - And all descendant model objects of those
 *
 *  This is also where Plumbing websockets and Envoy clients are attached.
 *  This handles transmitting updates to all the other views when updates happen.
 *  It also handles routing remote method calls to the appropriate ActiveComponent.
 *  TODO: A nice next step would be to Envoy-ize all of this.
 */
var Project = /** @class */ (function (_super) {
    __extends(Project, _super);
    function Project(props, opts) {
        var _this = _super.call(this, props, opts) || this;
        // Super hack, but it turns out we need to have this in a LOT of places in order for routing to work
        // and not end up with infinite loops of events emitted, captured, and emitted again. Beware!
        _this.metadata = {
            from: _this.alias, // #FIXME, dumb name?
            alias: _this.alias,
        };
        _this.ensurePlatformHaikuRegistry();
        // Batched collections of methods to send through the websocket
        _this.actionStack = new ActionStack({
            uid: _this.getPrimaryKey(),
            project: _this,
        });
        _this.actionStack.on('next', function (method, params, done) {
            logger.info("[project (".concat(_this.getAlias(), ")] sending action: ").concat(method));
            _this.websocket.action(method, params, function (err, out) {
                done(err, out);
            }, _this.getFolder());
        });
        // Setup the Plumbing websocket and Envoy connections if necessary
        _this._didStartWebsocketListeners = false;
        _this.connectClients();
        // In multi-component editing, this controls what the current active component is
        _this._activeComponentSceneName = null;
        ActiveComponent.on('update', function (ac, what, entity) {
            _this.emit('update', what, entity, ac, _this.getMetadata());
        });
        // List of components we are tracking as part of the component tabs
        /**
         * @type {Array.<{scenename: string, active: boolean}>}
         * @private
         */
        _this._multiComponentTabs = [];
        // Whether we should actually receive and act upon remote methods received
        _this.isHandlingMethods = true;
        _this.interactionMode = InteractionMode.EDIT;
        // An internal counter of how many updateHook requests we have dispatched.
        _this.actionStackIndex = 0;
        return _this;
    }
    Project.prototype.teardown = function () {
        this.stopHandlingMethods();
        this.getEnvoyClient().closeConnection();
        if (this.websocket) {
            this.websocket.disconnect();
        }
        this.actionStack.stop();
    };
    Project.prototype.stopHandlingMethods = function () {
        this.isHandlingMethods = false;
    };
    Project.prototype.startHandlingMethods = function () {
        this.isHandlingMethods = true;
    };
    Project.prototype.connectClients = function () {
        var _this = this;
        this.startHandlingMethods();
        if (this.websocket) {
            // Idempotent setup should handle an already-connected client gracefully
            this.websocket.connect();
            if (!this._didStartWebsocketListeners) {
                // Upon receipt of a method, route to the correct ActiveComponent
                this.websocket.on('method', this.receiveMethodCall.bind(this));
                this.websocket.on('close', function () { return logger.info("[project (".concat(_this.getAlias(), ")] websocket closed")); });
                this.websocket.on('error', function () { return logger.info("[project (".concat(_this.getAlias(), ")] websocket error")); });
                this._didStartWebsocketListeners = true;
            }
        }
        if (this._envoyClient) {
            // no-op; the client should already be connected to the server
        }
        else {
            var websocketClient = (this.WebSocket ||
                ((typeof window !== 'undefined') && window.WebSocket) ||
                WebSocket);
            this._envoyClient = new EnvoyClient(Object.assign({
                WebSocket: websocketClient,
                logger: new EnvoyLogger('warn'),
            }, this.getEnvoyOptions()));
            this._envoyClient.get('timeline').then(function (timelineChannel) {
                _this._envoyTimelineChannel = timelineChannel;
                _this.emit('envoy:timelineClientReady', _this._envoyTimelineChannel);
            });
            this._envoyClient.get(GLASS_CHANNEL).then(function (glassChannel) {
                _this._envoyGlassChannel = glassChannel;
                _this.emit('envoy:glassClientReady', _this._envoyGlassChannel);
            });
            this._envoyClient.get('tour').then(function (tourChannel) {
                _this._envoyTourChannel = tourChannel;
                if (!_this._envoyClient.isInMockMode()) {
                    _this._envoyTourChannel.requestWebviewCoordinates().then(function () {
                        _this.emit('envoy:tourClientReady', _this._envoyTourChannel);
                    });
                }
            });
        }
    };
    Project.prototype.isIgnoringMethodRequestsForMethod = function (method) {
        // HACK: This probably doesn't/shouldn't belong as a part of 'fileOptions'
        // It's a hacky way for MasterProcess to handle certain methods it cares about
        var fileOptions = this.getFileOptions();
        return fileOptions && fileOptions.methodsToIgnore && fileOptions.methodsToIgnore[method];
    };
    Project.prototype.receiveMethodCall = function (method, params, message, cb) {
        if (!this.isHandlingMethods) {
            return cb();
        }
        if (this.isIgnoringMethodRequestsForMethod(method)) {
            return null; // Another handler will call the callback in this case
        }
        return this.handleMethodCall(method, params, message, cb);
    };
    Project.prototype.handleMethodCall = function (method, params, message, cb) {
        var _this = this;
        return Lock.request(Lock.LOCKS.ProjectMethodHandler, false, function (release) {
            // Try matching a method on a given active component
            if (typeof params[0] === 'string' && ActiveComponent.prototype[method] instanceof Function) {
                return _this.findActiveComponentBySource(params[0], function (findAcError, ac) {
                    if (findAcError) {
                        release();
                        return cb(findAcError);
                    }
                    if (!SILENT_METHODS[method]) {
                        logger.info("[project (".concat(_this.getAlias(), ")] component handling method ").concat(method));
                    }
                    return ac[method].apply(ac, params.slice(1).concat(function (err) {
                        release();
                        return cb(err);
                    }));
                });
            }
            // If we have a method here at the top, call it
            if (_this[method] instanceof Function) {
                if (!SILENT_METHODS) {
                    logger.info("[project (".concat(_this.getAlias(), ")] project handling method ").concat(method));
                }
                return _this[method].apply(_this, params.concat(function (err) {
                    release();
                    return cb(err);
                }));
            }
            release();
            throw new Error("Unknown project method ".concat(method));
        });
    };
    Project.prototype.ensurePlatformHaikuRegistry = function () {
        if (!this.platform) {
            this.platform = {};
        }
        if (!this.platform.haiku) {
            this.platform.haiku = {};
        }
        if (!this.platform.haiku.registry) {
            this.platform.haiku.registry = {};
        }
    };
    Project.prototype.getName = function () {
        var parts = this.folder.split(path.sep);
        var last = parts[parts.length - 1];
        return last;
    };
    Project.prototype.getNameVariations = function () {
        return Project.getProjectNameVariations(this.getFolder());
    };
    Project.prototype.getFriendlyName = function (maybeProjectName) {
        return maybeProjectName || toTitleCase(this.getName());
    };
    Project.prototype.getCurrentActiveComponentSceneName = function () {
        var ac = this.getCurrentActiveComponent();
        return ac && ac.getSceneName();
    };
    Project.prototype.getCurrentActiveComponentRelpath = function () {
        var ac = this.getCurrentActiveComponent();
        return ac && ac.getRelpath();
    };
    Project.prototype.getCurrentActiveComponent = function () {
        if (!this._activeComponentSceneName) {
            return null;
        }
        return this.findActiveComponentBySceneName(this._activeComponentSceneName);
    };
    Project.prototype.getAllActiveComponents = function () {
        return ActiveComponent.where({ project: this });
    };
    Project.prototype.addActiveComponentToMultiComponentTabs = function (scenename, active) {
        if (active === void 0) { active = false; }
        // Update the active tabs in memory used for displaying in the UI
        for (var _i = 0, _a = this._multiComponentTabs; _i < _a.length; _i++) {
            var tab = _a[_i];
            if (tab.scenename === scenename) {
                tab.active = active;
                return;
            }
        }
        this._multiComponentTabs.push({ scenename: scenename, active: active });
    };
    Project.prototype.removeActiveComponentFromMultiComponentTabs = function (scenename) {
        var index = this._multiComponentTabs.findIndex(function (tab) { return tab.scenename === scenename; });
        if (index !== -1) {
            this._multiComponentTabs.splice(index, 1);
        }
    };
    Project.prototype.describeSubComponents = function () {
        return this._multiComponentTabs.map(function (_a) {
            var scenename = _a.scenename, active = _a.active;
            return {
                isActive: !!active,
                scenename: scenename,
                title: toTitleCase(scenename),
            };
        });
    };
    Project.prototype.describeUndoState = function () {
        var ac = this.getCurrentActiveComponent();
        var filter = function (doable) { return !doable.ac || doable.ac === ac; };
        return {
            canUndo: this.actionStack.getUndoables().filter(filter).length > 0,
            canRedo: this.actionStack.getRedoables().filter(filter).length > 0,
        };
    };
    Project.prototype.describeTopMenu = function () {
        return {
            subComponents: this.describeSubComponents(),
            undoState: this.describeUndoState(),
        };
    };
    Project.prototype.getExistingComponentNames = function () {
        var names = {
            main: true, // Never allow 'main'
        };
        this._multiComponentTabs.forEach(function (tab) {
            names[tab.scenename] = true;
        });
        return names;
    };
    Project.prototype.getNextAvailableSceneNameWithPrefix = function (prefix, num) {
        if (num === void 0) { num = 0; }
        // myName, myName_2, myName_3, ...
        var full = "".concat(prefix).concat((num < 2) ? '' : "_".concat(num));
        if (!this.findActiveComponentBySceneName(full)) {
            return full;
        }
        return this.getNextAvailableSceneNameWithPrefix(prefix, num + 1);
    };
    Project.prototype.getMultiComponentTabs = function () {
        return this._multiComponentTabs;
    };
    Project.prototype.getMetadata = function () {
        return this.metadata;
    };
    Project.prototype.getFileOptions = function () {
        return this.fileOptions;
    };
    Project.prototype.getEnvoyOptions = function () {
        return this.envoyOptions;
    };
    Project.prototype.getFolder = function () {
        return this.folder;
    };
    Project.prototype.getAlias = function () {
        return this.alias;
    };
    Project.prototype.buildFileUid = function (relpath) {
        return path.join(this.getFolder(), relpath);
    };
    Project.prototype.getEnvoyChannel = function (name) {
        switch (name) {
            case 'timeline': return this._envoyTimelineChannel;
            case 'glass': return this._envoyGlassChannel;
            case 'tour': return this._envoyTourChannel;
            default:
                throw new Error('Envoy channel name required');
        }
    };
    Project.prototype.getEnvoyClient = function () {
        return this._envoyClient;
    };
    Project.prototype.getPlatform = function () {
        return this.platform;
    };
    Project.prototype.undo = function (options, metadata, cb) {
        this.actionStack.undo(options, metadata, cb);
    };
    Project.prototype.redo = function (options, metadata, cb) {
        this.actionStack.redo(options, metadata, cb);
    };
    Project.prototype.advanceActionStackIndex = function () {
        this.actionStackIndex++;
    };
    Project.prototype.updateHook = function () {
        var _this = this;
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        var method = args.shift();
        var tx = args.pop();
        // Make our own copy of metadata to munge on, to ensure that we don't pass actionStackIndex along to dependent
        // methods.
        var metadata = Object.assign({}, args.pop());
        args.push(metadata);
        // In case this was provided by a parent updateHook.
        delete metadata.actionStackIndex;
        return this.actionStack.handleActionInitiation(method, args, metadata, function (handleActionResolution) { return tx(function (err, out) {
            // Should only called if there is *not* an error, but sticking with err-first convention anyway.
            if (experimentIsEnabled(Experiment.IpcIntegrityCheck) && metadata.integrity !== false) {
                var integrity = _this.describeIntegrity();
                if (metadata.integrity && _this.isRemoteRequest(metadata)) {
                    var mismatch = integritiesMismatched(metadata.integrity, integrity);
                    if (mismatch) {
                        logger.error("\n                Integrity mismatch due to ".concat(method, " in ").concat(_this.getAlias(), ":\n                  ").concat(metadata.from, " (their result):\n                    ").concat(mismatch[0], "\n                  ").concat(_this.getAlias(), " (our result):\n                    ").concat(mismatch[1], "\n              "));
                        if (experimentIsEnabled(Experiment.CrashOnIpcIntegrityCheckFailure)) {
                            var message = "Unable to update component (".concat(method, " in ").concat(_this.getAlias(), ")");
                            if (process.env.NODE_ENV !== 'production') {
                                message = "CRASH! Stop editing now and open dev tools (Cmd+Option+I). ".concat(message);
                            }
                            throw new Error(message);
                        }
                    }
                }
                Object.assign(metadata, { integrity: integrity });
            }
            // If we originated the action, notify all other views
            if (!_this.isRemoteRequest(metadata)) {
                _this.emit.apply(_this, __spreadArray(['update', method], args, false));
                _this.actionStack.enqueueAction(method, [_this.getFolder()].concat(args), function () {
                    // Only assign the actionStackIndex before we're actually going to fire the action. This ensures we don't
                    // prematurely increment our dispatch counter when we're only going to accumulate and defer a remote update.
                    metadata.actionStackIndex = _this.actionStackIndex;
                    _this.advanceActionStackIndex();
                    handleActionResolution(err, out);
                });
            }
            else {
                // Otherwise we received an update and may need to update ourselves
                _this.emit.apply(_this, __spreadArray(['remote-update', method], args, false));
                handleActionResolution(err, out);
            }
        }); });
    };
    Project.prototype.getWebsocketBroadcastDefaults = function () {
        return {
            time: Date.now(),
            type: 'broadcast',
            folder: this.getFolder(),
            from: this.getMetadata().alias,
        };
    };
    Project.prototype.broadcastPayload = function (mainPayload) {
        var fullPayloadWithMetadata = Object.assign(this.getWebsocketBroadcastDefaults(), mainPayload);
        this.websocket.send(fullPayloadWithMetadata);
    };
    Project.prototype.upsertFile = function (_a) {
        var relpath = _a.relpath, type = _a.type;
        var spec = Object.assign({}, File.DEFAULT_ATTRIBUTES, {
            uid: this.buildFileUid(relpath),
            folder: this.getFolder(),
            dtModified: Date.now(),
            project: this,
            relpath: relpath,
            type: type,
        });
        return File.upsert(spec, this.getFileOptions());
    };
    Project.prototype.isRemoteRequest = function (metadata) {
        return metadata && metadata.from !== this.getAlias();
    };
    Project.prototype.isLocalUpdate = function (metadata) {
        return metadata && metadata.from === this.getAlias();
    };
    Project.prototype.masterHeartbeat = function (cb) {
        return this.websocket.request({
            folder: this.getFolder(),
            method: 'masterHeartbeat',
            params: [this.getFolder()],
        }, cb);
    };
    Project.prototype.saveProject = function (project, saveOptions, cb) {
        if (saveOptions === void 0) { saveOptions = {}; }
        return this.websocket.request({
            folder: this.getFolder(),
            method: 'saveProject',
            params: [
                project,
                saveOptions,
            ],
        }, cb);
    };
    Project.prototype.setInteractionMode = function (interactionMode, metadata, cb) {
        var _this = this;
        var components = ActiveComponent.where({ project: this });
        return Lock.request(Lock.LOCKS.ActiveComponentWork, false, function (release) {
            return async.eachSeries(components, function (component, next) {
                // If we toggle preview mode before any subcomponents are bootstrapped,
                // the bytecode for those subcomponents will be null
                return component.moduleFindOrCreate('basicReload', {}, function (err) {
                    if (err) {
                        return next(err);
                    }
                    return component.setInteractionMode(interactionMode, next);
                });
            }, function (err) {
                if (err) {
                    release();
                    return cb(err);
                }
                // Only set interaction mode once it's been completely assigned to the in-mem components
                _this.interactionMode = interactionMode;
                release();
                _this.updateHook('setInteractionMode', interactionMode, metadata, function (fire) { return fire(); });
                return cb();
            });
        });
    };
    Project.prototype.getInteractionMode = function () {
        return this.interactionMode;
    };
    Project.prototype.toggleInteractionMode = function (metadata, cb) {
        var interactionMode = this.interactionMode === InteractionMode.EDIT
            ? InteractionMode.LIVE
            : InteractionMode.EDIT;
        this.setInteractionMode(interactionMode, metadata, cb);
    };
    Project.prototype.linkAsset = function (assetAbspath, cb) {
        return this.websocket.request({
            folder: this.getFolder(),
            method: 'linkAsset',
            params: [
                assetAbspath,
                this.getFolder(),
            ],
        }, cb);
    };
    Project.prototype.unlinkAsset = function (assetRelpath, cb) {
        return this.websocket.request({
            folder: this.getFolder(),
            method: 'unlinkAsset',
            params: [
                assetRelpath,
                this.getFolder(),
            ],
        }, cb);
    };
    Project.prototype.bulkLinkAssets = function (assetAbspaths, cb) {
        return this.websocket.request({
            folder: this.getFolder(),
            method: 'bulkLinkAssets',
            params: [
                assetAbspaths,
                this.getFolder(),
            ],
        }, cb);
    };
    Project.prototype.listAssets = function (cb) {
        return this.websocket.request({
            folder: this.getFolder(),
            method: 'listAssets',
            params: [this.getFolder()],
        }, cb);
    };
    Project.prototype.readAllStateValues = function (cb) {
        return this.websocket.method('readAllStateValues', [
            this.getFolder(),
            this.getCurrentActiveComponentRelpath(),
        ], cb);
    };
    Project.prototype.queryImageSize = function (abspath, cb) {
        return this.websocket.method('queryImageSize', [abspath], cb);
    };
    Project.prototype.mergeDesigns = function (designs, metadata, cb) {
        var _this = this;
        var ac = this.getCurrentActiveComponent();
        if (!ac) {
            logger.warn("[project] skipping design merge since no component is active");
            return cb();
        }
        // Since several designs are merged, and that process occurs async, we can get into a situation
        // where individual fragments are inserted but their parent layouts have not been appropriately
        // populated. To fix this, we wait to do any rendering until this whole process has finished
        ac.codeReloadingOn();
        return Lock.request(Lock.LOCKS.ActiveComponentWork, false, function (release) {
            return _this.updateHook('mergeDesigns', designs, metadata || _this.getMetadata(), function (fire) {
                var components = ActiveComponent.where({ project: _this });
                return async.eachSeries(components, function (component, next) {
                    return component.moduleFindOrCreate('basicReload', {}, function (err) {
                        if (err) {
                            return next(err);
                        }
                        return component.mergeDesignFiles(designs, next);
                    });
                }, function (err) {
                    if (err) {
                        ac.codeReloadingOff();
                        release();
                        logger.error("[project (".concat(_this.getAlias(), ")]"), err);
                        return cb(err);
                    }
                    return ac.reload({
                        hardReload: true,
                        clearCacheOptions: {
                            doClearEntityCaches: true,
                        },
                    }, null, function () {
                        ac.codeReloadingOff();
                        release();
                        fire();
                        return cb();
                    });
                });
            });
        });
    };
    Project.prototype.addActiveComponentToRegistry = function (activeComponent) {
        var activeComponentKey = path.join(this.getFolder(), activeComponent.getRelpath());
        this.ensurePlatformHaikuRegistry(); // Make sure we have this.platform.haiku; race condition
        this.platform.haiku.registry[activeComponentKey] = activeComponent;
        this.addActiveComponentToMultiComponentTabs(activeComponent.getSceneName(), false);
    };
    Project.prototype.removeActiveComponentFromRegistry = function (activeComponent) {
        var activeComponentKey = path.join(this.getFolder(), activeComponent.getRelpath());
        this.ensurePlatformHaikuRegistry(); // Make sure we have this.platform.haiku; race condition
        delete this.platform.haiku.registry[activeComponentKey];
        this.removeActiveComponentFromMultiComponentTabs(activeComponent.getSceneName());
    };
    Project.prototype.deleteSceneByName = function (scenename, cb) {
        // Note: this is a VERY ROUGH implementation of subcomponent destruction that is only meant to be used to undo
        // subcomponent creation in its current form. If planning to use this for proper subcomponent deletion in any context,
        // we would also need to find/destroy any subcomponent instances that would have require(...) broken by these actions.
        var ac = this.findActiveComponentBySceneName(scenename);
        if (!ac) {
            // Bail if no ActiveComponent.
            return cb();
        }
        // First unregister it from the UI.
        this.removeActiveComponentFromRegistry(ac);
        this.emit('update', 'updateMenu');
        // Next actually destroy the corresponding BLL entities.
        ac.destroy(true);
        return cb();
    };
    Project.prototype.upsertSceneByName = function (scenename, cb) {
        var relpath = path.join('code', scenename, 'code.js');
        return this.upsertComponentBytecodeToModule(relpath, cb);
    };
    Project.prototype.findOrCreateActiveComponent = function (scenename, cb) {
        var _this = this;
        var ac = this.findActiveComponentBySceneName(scenename);
        if (ac) {
            return cb(null, ac);
        }
        return this.upsertSceneByName(scenename, function (err) {
            if (err) {
                return cb(err);
            }
            return cb(null, _this.findActiveComponentBySceneName(scenename));
        });
    };
    Project.prototype.setCurrentActiveComponent = function (scenename, metadata, cb) {
        var _this = this;
        metadata.integrity = false;
        return Lock.request(Lock.LOCKS.SetCurrentActiveComponent, false, function (release) {
            // If not in read only mode, create the component entity for the scene in question
            _this.findOrCreateActiveComponent(scenename, function (err, ac) {
                if (err) {
                    release();
                    return cb(err);
                }
                _this.addActiveComponentToMultiComponentTabs(scenename, true);
                _this._multiComponentTabs.forEach(function (tab) {
                    // Deactivate all other components held in memory
                    tab.active = tab.scenename === scenename;
                });
                return Lock.awaitAllLocksFreeExcept([Lock.LOCKS.SetCurrentActiveComponent, Lock.LOCKS.ProjectMethodHandler], function () {
                    // Useful to stop haiku-creator listeners when deactivating ActiveComponent
                    var currentActiveComponent = _this.getCurrentActiveComponent();
                    if (currentActiveComponent) {
                        currentActiveComponent.emit('update', 'componentDeactivating');
                    }
                    _this._activeComponentSceneName = scenename;
                    _this.updateHook('setCurrentActiveComponent', scenename, metadata || _this.getMetadata(), function (fire) {
                        fire();
                        release();
                        return cb(null, ac);
                    });
                });
            });
        });
    };
    Project.prototype.closeNamedActiveComponent = function (scenename, metadata, cb) {
        for (var i = this._multiComponentTabs.length - 1; i >= 0; i--) {
            var tab = this._multiComponentTabs[i];
            if (tab.scenename === scenename) {
                this._multiComponentTabs.splice(i, 1);
            }
            else {
                tab.active = false;
            }
        }
        // TODO: Make smarter instead of just choosing the first one in the list
        this._activeComponentSceneName = this._multiComponentTabs[0];
        this.updateHook('closeNamedActiveComponent', scenename, metadata || this.getMetadata(), function (fire) { return fire(); });
        if (cb) {
            return cb();
        }
    };
    Project.prototype.renameComponent = function (scenenameOld, scenenameNew, metadata, cb) {
        // TODO, important for multi-component, launching straight to editing, etc.
        // Need to change all in-memory references to the name,
        // all existing file-system references to the name including other components
        // within the project that may have instantiated this :/
        throw new Error('not yet implemented');
        // if (cb) return cb()
    };
    /**
     * Standard import and instantiation of files dropped
     * in Haiku from the user file system by:
     * - Handling the drop event
     * - Filtering files that are not supported
     * - Linking the assets via plumbing
     */
    Project.prototype.linkExternalAssetOnDrop = function (event, cb) {
        if (Asset.isInternalDrop(event)) {
            return cb();
        }
        event.preventDefault();
        var files = Array.from(event.dataTransfer.items)
            .filter(Asset.isValidFile) /* Allow only svg and sketch files */
            .map(function (item) { return item.getAsFile().path; });
        return this.websocket.request({
            folder: this.getFolder(),
            method: 'bulkLinkAssets',
            params: [files, this.getFolder()],
        }, cb);
    };
    /**
     * @method upsertComponentBytecodeToFile
     * @description Given a relpath and a bytecode object, insert a component file
     * at the given relpath with the given bytecode as its code.js export. If the
     * file already exists, we'll merge the bytecode objects' contents together.
     * The relpath here is the destination of the file to write to within the project
     * @param relpath {String} Relative path to destination code file within project
     * @param cb {Function}
     */
    Project.prototype.upsertComponentBytecodeToModule = function (relpath, cb) {
        var _this = this;
        // Note: This assumes that the basic bytecode file *has already been created*
        this.upsertActiveComponentInstance(relpath, function (err, ac) {
            if (err) {
                return cb(err);
            }
            return ac.mountApplication(null, {}, function (err) {
                if (err) {
                    return cb(err);
                }
                _this.emit('active-component:upserted');
                return cb(null, ac);
            });
        });
    };
    Project.prototype.relpathToSceneName = function (relpath) {
        // Must normalize so ./foo/bar/baz becomes foo/bar/baz (note number of slashes)
        return path.normalize(relpath).split(path.sep)[1];
    };
    Project.prototype.upsertActiveComponentInstance = function (relpath, cb) {
        var _this = this;
        var abspath = path.join(this.getFolder(), relpath);
        return Lock.request(Lock.LOCKS.FileReadWrite(abspath), false, function (release) {
            var file = _this.upsertFile({
                relpath: relpath,
                type: File.TYPES.code,
            });
            release();
            return cb(null, file.component);
        });
    };
    Project.prototype.findActiveComponentBySource = function (relpath, cb) {
        var scenename = ModuleWrapper.getScenenameFromRelpath(relpath);
        return this.findOrCreateActiveComponent(scenename, cb);
    };
    Project.prototype.findActiveComponentBySourceIfPresent = function (relpath) {
        var scenename = ModuleWrapper.getScenenameFromRelpath(relpath);
        return this.findActiveComponentBySceneName(scenename);
    };
    Project.prototype.findActiveComponentBySceneName = function (scenename) {
        return ActiveComponent.findById(ActiveComponent.buildPrimaryKey(this.getFolder(), scenename));
    };
    Project.prototype.getPackageJsonPath = function () {
        return path.join(this.getFolder(), 'package.json');
    };
    Project.prototype.getDefaultComponentInfo = function () {
    };
    Project.prototype.readPackageJsonSafe = function (cb) {
        var pkg;
        try {
            pkg = fse.readJsonSync(this.getPackageJsonPath(), { throws: false });
        }
        catch (exception) {
            logger.warn("[project (".concat(this.getAlias(), ")] package.json error:"), exception);
            pkg = {};
        }
        return cb(pkg);
    };
    Project.prototype.writePackageJson = function (pkg, cb) {
        try {
            fse.outputJsonSync(this.getPackageJsonPath(), pkg);
        }
        catch (exception) {
            return cb(exception);
        }
        return cb();
    };
    Project.prototype.readComponentInfo = function (scenename, cb) {
        var _this = this;
        return this.readPackageJsonSafe(function (pkg) {
            var info = lodash.get(pkg, "haiku.".concat(scenename)) || {};
            var getMetadata = function (cb) {
                var ac = _this.findActiveComponentBySceneName(scenename);
                if (!ac) {
                    return cb({}); // eslint-disable-line standard/no-callback-literal
                }
                return ac.readMetadata(function (err, metadata) {
                    if (err) {
                        logger.warn("[project (".concat(_this.getAlias(), ")] component metadata error:"), err);
                    }
                    return cb(metadata || {});
                });
            };
            return getMetadata(function (metadata) {
                var final = lodash.assign({}, metadata, info);
                return cb(null, final);
            });
        });
    };
    Project.prototype.getCodeFolderAbspath = function () {
        return path.join(this.getFolder(), 'code');
    };
    Project.prototype.rehydrate = function () {
        var _this = this;
        fse.readdirSync(this.getCodeFolderAbspath()).filter(function (entry) {
            // Ignore hidden files that may appear here such as everyone's favorite .DS_Store
            return entry && entry[0] !== '.';
        }).forEach(function (scenename) {
            _this.addActiveComponentToMultiComponentTabs(scenename);
        });
    };
    Project.prototype.describeIntegrity = function () {
        var descriptor = {};
        this.getAllActiveComponents().forEach(function (ac) {
            var relpath = ac.getRelpath();
            var hash = ac.getInsertionPointInfo().hash;
            descriptor[relpath] = { hash: hash };
        });
        return descriptor;
    };
    return Project;
}(BaseModel));
Project.DEFAULT_OPTIONS = {
    required: {
        uid: true,
        folder: true, // Absolute path to project folder on file system
        alias: true, // Name of view in which we are running
        userconfig: true, // Generic configuration project
        websocket: true, // Websocket for plumbing connection - Expected to be initialized already
        platform: true, // E.g. window or global
        fileOptions: true,
        envoyOptions: true,
    },
};
BaseModel.extend(Project);
module.exports = Project;
Project.awaitOneUpdateFromActiveComponent = function (activeComponent, channel, fn) {
    var once = true;
    activeComponent.on('update', function (what, a, b, c, d, e, f, g, h) {
        if (once && what === channel) {
            once = false;
            fn(a, b, c, d, e, f, g, h);
        }
    });
};
Project.setup = function (folder, alias, websocket, platform, userconfig, fileOptions, envoyOptions, cb) {
    if (platform === void 0) { platform = {}; }
    if (userconfig === void 0) { userconfig = {}; }
    if (fileOptions === void 0) { fileOptions = {}; }
    if (envoyOptions === void 0) { envoyOptions = {}; }
    fse.mkdirpSync(path.join(folder, 'code'));
    var project = Project.upsert({
        uid: folder,
        folder: folder,
        alias: alias,
        websocket: websocket,
        userconfig: userconfig,
        platform: platform,
        fileOptions: fileOptions,
        envoyOptions: envoyOptions,
    });
    project.rehydrate();
    return cb(null, project);
};
Project.getProjectNameVariations = function (folder) {
    var projectHaikuConfig = readPackageJson(folder).haiku;
    var projectNameSafe = getSafeProjectName(projectHaikuConfig.project);
    var projectNameSafeShort = getProjectNameSafeShort(projectHaikuConfig.project);
    var projectNameLowerCase = getProjectNameLowerCase(projectHaikuConfig.project);
    var reactProjectName = getReactProjectName(projectHaikuConfig.project);
    var angularSelectorName = getAngularSelectorName(projectHaikuConfig.project);
    var primaryAssetPath = getDefaultSketchAssetPath(projectHaikuConfig.project);
    var defaultIllustratorAssetPath = getDefaultIllustratorAssetPath(projectHaikuConfig.project);
    return {
        projectNameSafe: projectNameSafe,
        projectNameSafeShort: projectNameSafeShort,
        projectNameLowerCase: projectNameLowerCase,
        reactProjectName: reactProjectName,
        angularSelectorName: angularSelectorName,
        primaryAssetPath: primaryAssetPath,
        defaultIllustratorAssetPath: defaultIllustratorAssetPath,
    };
};
var integritiesMismatched = function (i1, i2) {
    var s1 = jss(Object.keys(i1).reduce(function (accumulator, key) {
        if (i2[key]) {
            accumulator[key] = i1[key];
        }
        return accumulator;
    }, {}));
    var s2 = jss(Object.keys(i1).reduce(function (accumulator, key) {
        if (i1[key]) {
            accumulator[key] = i2[key];
        }
        return accumulator;
    }, {}));
    if (s1 !== s2) {
        return [s1, s2];
    }
    return false;
};
// Sorry, hacky. We route some methods to this object dynamically, and in order
// to detect which should receive the metadata parameter, we use this
Project.PUBLIC_METHODS = {
    setCurrentActiveComponent: true,
    closeNamedActiveComponent: true,
    renameComponent: true,
};
// Down here to avoid Node circular dependency stub objects. #FIXME
var ActiveComponent = require('./ActiveComponent');
var Asset = require('./Asset');
var File = require('./File');
var ModuleWrapper = require('./ModuleWrapper');
//# sourceMappingURL=Project.js.map