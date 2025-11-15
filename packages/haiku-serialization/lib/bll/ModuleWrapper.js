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
var path = require('path');
var fs = require('fs');
var BaseModel = require('./BaseModel');
var overrideModulesLoaded = require('./../utils/overrideModulesLoaded');
var Lock = require('./Lock');
var logger = require('./../utils/LoggerInstance');
var HAIKU_SOURCE_ATTRIBUTE = 'haiku-source';
var HAIKU_VAR_ATTRIBUTE = 'haiku-var';
// When building a distribution (see 'distro' repo) the node_modules folder is at a different level #FIXME matthew
var CANONICAL_CORE_SOURCE_CODE_PATH = path.dirname(require.resolve('@haiku/core'));
var REPLACEMENT_MODULES = {
    // legacy name
    'haiku.ai/player/dom': path.join(CANONICAL_CORE_SOURCE_CODE_PATH, 'dom'), // <~ Note how this points to @haiku/core
    'haiku.ai/player/dom/index': path.join(CANONICAL_CORE_SOURCE_CODE_PATH, 'dom'), // <~ Note how this points to @haiku/core
    'haiku.ai/player/dom/react': path.join(CANONICAL_CORE_SOURCE_CODE_PATH, 'dom', 'react'), // <~ Note how this points to @haiku/core
    // legacy name
    '@haiku/player': CANONICAL_CORE_SOURCE_CODE_PATH,
    '@haiku/player/dom': path.join(CANONICAL_CORE_SOURCE_CODE_PATH, 'dom'), // <~ Note how this points to @haiku/core
    '@haiku/player/dom/index': path.join(CANONICAL_CORE_SOURCE_CODE_PATH, 'dom'), // <~ Note how this points to @haiku/core
    '@haiku/player/dom/react': path.join(CANONICAL_CORE_SOURCE_CODE_PATH, 'dom', 'react'), // <~ Note how this points to @haiku/core
    // current name
    '@haiku/core': CANONICAL_CORE_SOURCE_CODE_PATH,
    '@haiku/core/dom': path.join(CANONICAL_CORE_SOURCE_CODE_PATH, 'dom'),
    '@haiku/core/dom/index': path.join(CANONICAL_CORE_SOURCE_CODE_PATH, 'dom'),
    '@haiku/core/dom/react': path.join(CANONICAL_CORE_SOURCE_CODE_PATH, 'dom', 'react'),
};
var CORE_PACKAGE_JSON = require(path.join(CANONICAL_CORE_SOURCE_CODE_PATH, 'package.json'));
var CORE_VERSION = CORE_PACKAGE_JSON.version;
var MODULE_CACHE_HOT = {}; // May be cleared during runtime
var MODULE_CACHE_COLD = {}; // Never changes once populated
// In race conditions where the project node_modules is changed while monkeypatch
// is occurring, this allows project dependencies to be loaded without crashing
var haikuCore = require('@haiku/core');
var Module = require('module');
var originalRequire = Module.prototype.require;
MODULE_CACHE_COLD['@haiku/core'] = haikuCore;
Module.prototype.require = function (request) {
    if (MODULE_CACHE_COLD[request]) {
        return MODULE_CACHE_COLD[request];
    }
    if (MODULE_CACHE_HOT[request]) {
        return MODULE_CACHE_HOT[request];
    }
    return originalRequire.apply(this, arguments);
};
/**
 * @class Mod
 * @description
 *  Abstraction over an in-memory JavaScript module which we may want to...
 *    - Hot-reload at runtime and seamlessly replace
 *    - Hot-update and then write back to disk, via File
 *  Handles reloading the module using require(...) += a few useful config
 *  settings through which you can specify the exact require behavior.
 *
 *  Also has static functions and other utilities for module pathing within
 *  the host project folder, used extensively throughout the app.
 *
 *  Also contains a variety of useful constants related to module pathing.
 */
var ModuleWrapper = /** @class */ (function (_super) {
    __extends(ModuleWrapper, _super);
    function ModuleWrapper(props, opts) {
        var _this = _super.call(this, props, opts) || this;
        _this.exp = null; // Safest to set to null until we really load the content
        _this._hasLoadedAtLeastOnce = false;
        _this._projectConfig = null;
        return _this;
    }
    ModuleWrapper.prototype.hasLoadedAtLeastOnce = function () {
        return this._hasLoadedAtLeastOnce;
    };
    ModuleWrapper.prototype.clearInMemoryExport = function () {
        this.exp = null;
    };
    ModuleWrapper.prototype.fetchInMemoryExport = function () {
        return this.exp;
    };
    ModuleWrapper.prototype.isolatedClearCache = function () {
        ModuleWrapper.clearRequireCache(path.dirname(this.getAbspath()));
        ModuleWrapper.clearHotCache();
    };
    ModuleWrapper.prototype.basicReload = function (cb) {
        if (this.exp) {
            return cb(null, this.exp);
        }
        return this.reload(cb);
    };
    ModuleWrapper.prototype.getFolder = function () {
        return this.file.folder;
    };
    ModuleWrapper.prototype.getModpath = function () {
        return this.file.relpath;
    };
    ModuleWrapper.prototype.getAbspath = function () {
        if (this.isExternalModule) {
            return require.resolve(this.getModpath());
        }
        var abspath = path.normalize(this.file.getAbspath());
        // Handle Mac temporary folder discrepency so its key in require.cache is correct
        if (abspath.slice(0, 5) === '/var/') {
            abspath = "/private".concat(abspath);
        }
        return abspath;
    };
    ModuleWrapper.prototype.load = function () {
        var _this = this;
        overrideModulesLoaded(function (stop) {
            _this.isolatedClearCache();
            _this.exp = require(_this.getAbspath());
            _this._hasLoadedAtLeastOnce = true;
            _this.update(_this.exp, function () {
                // Tell the node hook to stop interfering with require(...)
                stop();
            });
        }, ModuleWrapper.getHaikuKnownImportMatch);
    };
    ModuleWrapper.prototype.reload = function (cb) {
        var _this = this;
        return Lock.request(Lock.LOCKS.FileReadWrite(this.getAbspath()), false, function (release) {
            try {
                _this.load();
            }
            catch (exception) {
                logger.warn("[module wrapper] cannot load ".concat(_this.getAbspath()));
                logger.warn(exception);
                // Assume the file hasn't been created and we should create it
                _this.exp = {};
                _this._hasLoadedAtLeastOnce = true;
                return _this.update(_this.exp, function () {
                    if (!_this.isExternalModule) {
                        logger.warn("[module wrapper] ***forcing flush content of ".concat(_this.getAbspath(), "***"));
                        _this.file.maybeFlushContentForceSync();
                    }
                    release();
                    return cb(null, _this.exp);
                });
            }
            release();
            return cb(null, _this.exp);
        });
    };
    ModuleWrapper.prototype.moduleAsMana = function (hostComponentRelpath, identifier, title, cb) {
        var _this = this;
        return this.basicReload(function (err, exp) {
            var _a;
            if (err) {
                return cb(err);
            }
            if (!exp) {
                return cb(null, null);
            }
            var source;
            if (_this.isExternalModule) {
                source = Template.normalizePath(_this.getModpath());
            }
            else {
                var relpath = path.relative(_this.getFolder(), _this.getAbspath());
                source = Template.normalizePath("./".concat(relpath));
            }
            exp.__reference = ModuleWrapper.buildReference(ModuleWrapper.REF_TYPES.COMPONENT, // type
            Template.normalizePath("./".concat(hostComponentRelpath)), // host
            Template.normalizePathOfPossiblyExternalModule(source), identifier);
            return cb(null, {
                // Nested components are represented thusly:
                // - The element name is the bytecode of the subcomponent
                // - When serialized the element name becomes just an identifier in the code
                // - Upon reification, it's loaded as bytecode with the appropriate __-properties
                elementName: exp,
                attributes: (_a = {},
                    _a[HAIKU_SOURCE_ATTRIBUTE] = source,
                    _a[HAIKU_VAR_ATTRIBUTE] = identifier,
                    _a['haiku-title'] = title,
                    _a),
                children: [],
            });
        });
    };
    ModuleWrapper.prototype.update = function (bytecode, cb) {
        if (this.isExternalModule) {
            return cb();
        }
        // Reassign in case our bytecode was empty and we created a new object
        this.exp = Bytecode.reinitialize(this.file.folder, path.normalize(this.file.relpath), bytecode, { title: this.component && this.component.getTitle() });
        MODULE_CACHE_HOT[this.getAbspath()] = this.exp;
        MODULE_CACHE_HOT[this.getModpath()] = this.exp;
        MODULE_CACHE_HOT[this.file.getAbspath()] = this.exp;
        return cb();
    };
    return ModuleWrapper;
}(BaseModel));
ModuleWrapper.DEFAULT_OPTIONS = {
    required: {
        file: true,
        component: true,
    },
};
BaseModel.extend(ModuleWrapper);
ModuleWrapper.buildReference = function (type, host, source, identifier) {
    return JSON.stringify({ type: type, host: host, source: source, identifier: identifier });
};
ModuleWrapper.isValidReference = function (__reference) {
    if (!__reference) {
        return false;
    }
    if (typeof __reference !== 'string') {
        return false;
    }
    var ref = ModuleWrapper.parseReference(__reference);
    if (!ref) {
        return false;
    }
    return (ref.type &&
        ref.host &&
        ref.source &&
        ref.identifier);
};
ModuleWrapper.parseReference = function (__reference) {
    if (typeof __reference !== 'string') {
        return null;
    }
    try {
        return JSON.parse(__reference);
    }
    catch (exception) {
        logger.warn('[module wrapper]', exception);
        return null;
    }
};
/**
 * @function modulePathToIdentifierName
 * @description Convert a module path into an identifier name for the module.
 */
ModuleWrapper.modulePathToIdentifierName = function (modulepath) {
    // @haiku/blah/foo.js -> @haiku/blah/foo
    var nicepath = path.dirname(modulepath) + path.sep + path.basename(modulepath, path.extname(modulepath));
    var parts = nicepath.split(path.sep);
    // Underscoreize the path, so @haiku/core/blah/blah -> haiku_core_blah_blah
    return parts.map(function (part) {
        return part.replace(/\W+/g, '_');
    }).join('_').slice(1); // Remove leading `_`
};
ModuleWrapper.getScenenameFromRelpath = function (relpath) {
    return path.normalize(relpath).split(path.sep)[1];
};
/**
 * @function getHaikuKnownImportMatch
 * @description Convert a known import path to an application local installation
 */
ModuleWrapper.getHaikuKnownImportMatch = function (importPath) {
    var normalizedPath = importPath.trim().toLowerCase();
    if (normalizedPath in REPLACEMENT_MODULES) {
        return REPLACEMENT_MODULES[normalizedPath];
    }
    // not a good general solution, but good enough for player components
    return importPath.replace(/^@haiku\/player/, REPLACEMENT_MODULES['@haiku/player'])
        .replace(/^@haiku\/core/, REPLACEMENT_MODULES['@haiku/core']);
};
ModuleWrapper.clearHotCache = function () {
    var cleared = {};
    for (var key in MODULE_CACHE_HOT) {
        cleared[key] = true;
        MODULE_CACHE_HOT[key] = null;
    }
    logger.info("[module wrapper] cleared hot cache", cleared);
};
ModuleWrapper.clearRequireCache = function (dirname) {
    var cleared = {};
    for (var key in require.cache) {
        if (dirname) {
            if (key.indexOf(dirname) !== -1) {
                cleared[key] = true;
                delete require.cache[key];
            }
        }
        else if (!key.match(/node_modules/)) {
            cleared[key] = true;
            delete require.cache[key];
        }
    }
    logger.info("[module wrapper] cleared require cache", cleared);
};
ModuleWrapper.doesRelpathLookLikeLocalComponent = function (relpath) {
    var parts = path.normalize(relpath).split(path.sep);
    return (path.basename(relpath) === 'code.js' &&
        parts[0] === 'code' &&
        parts.length === 3 // e.g. code/foo/code.js
    );
};
ModuleWrapper.doesRelpathLookLikeSVGDesign = function (relpath) {
    return path.extname(relpath) === '.svg';
};
ModuleWrapper.doesRelpathLookLikeInstalledComponent = function (relpath) {
    var parts = path.normalize(relpath).split(path.sep);
    return parts[0] === '@haiku';
};
/**
 * Enable loading module from string.
 * Heavily based on https://github.com/floatdrop/require-from-string
 */
ModuleWrapper.requireFromString = function (code, filename, opts) {
    if (typeof filename === 'object') {
        opts = filename;
        filename = undefined;
    }
    opts = opts || {};
    filename = filename || '';
    if (typeof code !== 'string') {
        throw new Error('code must be a string, not ' + typeof code);
    }
    var m = new Module(filename, module.parent);
    m.paths = [].concat(path.dirname(filename), Module._nodeModulePaths(__dirname));
    m.filename = filename;
    m.id = filename;
    m._compile(code, filename);
    return m.exports;
};
/**
 * Enable loading module from file.
 */
ModuleWrapper.requireFromFile = function (filename) {
    var contents = fs.readFileSync(filename).toString();
    return ModuleWrapper.requireFromString(contents, filename);
};
/**
 * Test load bytecode by requiring it. Used to check if currently editing file can be required.
 */
ModuleWrapper.testLoadBytecode = function (contents, absPath) {
    var loadedBytecode = null;
    overrideModulesLoaded(function (stop) {
        loadedBytecode = ModuleWrapper.requireFromString(contents, absPath);
        stop();
    }, ModuleWrapper.getHaikuKnownImportMatch);
    return loadedBytecode;
};
ModuleWrapper.REF_TYPES = {
    COMPONENT: 'component',
};
ModuleWrapper.CORE_VERSION = CORE_VERSION;
module.exports = ModuleWrapper;
// Down here to avoid Node circular dependency stub objects. #FIXME
var Bytecode = require('./Bytecode');
var Template = require('./Template');
//# sourceMappingURL=ModuleWrapper.js.map