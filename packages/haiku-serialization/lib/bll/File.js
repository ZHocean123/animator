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
var fse = require('fs-extra');
var debounce = require('lodash').debounce;
var path = require('path');
var xmlToMana = require('haiku-common/lib/layout/xmlUtils').xmlToMana;
var expressionToRO = require("@haiku/core/lib/reflection/expressionToRO.js").default;
var BaseModel = require('./BaseModel');
var logger = require('./../utils/LoggerInstance');
var getSvgOptimizer = require('./../svg/getSvgOptimizer');
var Lock = require('./Lock');
var Cache = require('./Cache');
var bootstrapSceneFilesSync = require("@haiku/sdk-client/lib/bootstrapSceneFilesSync.js").bootstrapSceneFilesSync;
// This file also depends on '@haiku/core/lib/HaikuComponent'
// in the sense that one of those instances is assigned as .hostInstance here.
// ^^ Leave this message in this file so we can grep for it if necessary
var DEFAULT_CONTEXT_SIZE = { width: 550, height: 400 };
var DISK_FLUSH_TIMEOUT = 500;
var AWAIT_CONTENT_FLUSH_TIMEOUT = 0;
var FILE_TYPES = {
    design: 'design',
    code: 'code',
};
/**
 * @class File
 * @description
 *  Abstraction of Files that are contained in a project.
 *  WARNING: Contains a lot of legacy code which extends its responsibilities
 *  quite a bit further than what you would expect its purview to be.
 *  Worth a refactor. Many methods here belong in ActiveComponent or elsewhere.
 */
var File = /** @class */ (function (_super) {
    __extends(File, _super);
    function File(props, opts) {
        var _this = _super.call(this, props, opts) || this;
        var scenename = _this.project.relpathToSceneName(_this.relpath);
        var uid = ActiveComponent.buildPrimaryKey(_this.project.getFolder(), scenename);
        // Timeline/Glass/Creator should not write to the file system
        if (_this.project.getAlias() === 'master' || _this.project.getAlias() === 'test') {
            bootstrapSceneFilesSync(_this.project.getFolder(), scenename, _this.project.userconfig);
        }
        _this.component = ActiveComponent.upsert({
            uid: uid,
            file: _this,
            relpath: _this.relpath,
            project: _this.project,
            scenename: scenename,
        });
        _this.mod = ModuleWrapper.upsert({
            component: _this.component,
            uid: _this.getAbspath(),
            file: _this,
        });
        _this.ast = AST.upsert({
            uid: _this.getAbspath(),
            file: _this,
        });
        _this.debouncedFlushContent = debounce(function () {
            _this.flushContent();
        }, DISK_FLUSH_TIMEOUT);
        // pendingRequestedFlush keeps tracks between requestAsyncContentFlush and when debouncedFlushContent is triggered
        _this.pendingRequestedFlush = false;
        // pendingWrite keeps tracks between flushContent and when async write is executed
        _this.pendingWrite = false;
        return _this;
        // Important: Please see afterInitialize for assigned properties
    }
    File.prototype.destroy = function (cleanup) {
        if (cleanup === void 0) { cleanup = false; }
        this.mod.destroy();
        this.ast.destroy();
        if (cleanup && this.options.doWriteToDisk) {
            // Dangerous! Actually removes contents from disk.
            fse.removeSync(this.getFolder());
        }
        _super.prototype.destroy.call(this);
    };
    // Hook called automatically by BaseModel during construction or upsert
    File.prototype.afterInitialize = function () {
        // Track how many times we've updated our in-memory content.
        // This runs as an afterInitialize hook because when the user navigates from
        // the dashboard to the editor, this object will be reused, meaning that the
        // content and bytecode validity assertion will run, which depend on this
        // value reflecting the number of the times per session that updates occurred
        this._numBytecodeUpdates = 0;
    };
    File.prototype.updateInMemoryHotModule = function (bytecode, cb) {
        var _this = this;
        // In no circumstance do we want to write bad bytecode to in-memory pointer.
        // so instead of returning an error message, we crash the app in hope
        // that a full restart will resolve the condition leading to this.
        // Throwing here should also give insight into when/why this occurs.
        this.assertBytecode(bytecode);
        this.dtModified = Date.now();
        this.cache.clear();
        return this.mod.update(bytecode, function () {
            // Helps detect whether we need to assert that bytecode is present
            _this._numBytecodeUpdates++;
            return cb();
        });
    };
    File.prototype.requestAsyncContentFlush = function (flushSpec) {
        if (flushSpec === void 0) { flushSpec = {}; }
        if (this.options.doWriteToDisk) {
            this.pendingRequestedFlush = true;
            this.debouncedFlushContent();
        }
    };
    File.prototype.awaitNoFurtherContentFlushes = function (cb) {
        var _this = this;
        // If there isn't pending flush request or write request, keep waiting (setTimeout allows going
        // back to nodejs event loop, so write debouncedFlushContent/async write can be executed)
        if (this.pendingRequestedFlush || this.pendingWrite) {
            return setTimeout(function () { return _this.awaitNoFurtherContentFlushes(cb); }, AWAIT_CONTENT_FLUSH_TIMEOUT);
        }
        return cb();
    };
    File.prototype.updateContents = function (contents) {
        this.contents = contents;
    };
    File.prototype.trackContentsAndGetCode = function () {
        this.updateContents(this.ast.updateWithBytecodeAndReturnCode(this.mod.fetchInMemoryExport(), // The current bytecode
        this.contents));
        return this.contents; // The updated contents
    };
    File.prototype.flushContent = function () {
        var _this = this;
        this.trackContentsAndGetCode(); // <~ Populates this.contents
        this.assertContents(this.contents);
        // When flushContent is executed, clear pending requested flush and set pendingWrite
        this.pendingRequestedFlush = false;
        this.pendingWrite = true;
        return this.write(function (err) {
            if (err) {
                throw err;
            }
            _this.pendingWrite = false;
        });
    };
    File.prototype.flushContentForceSync = function () {
        this.trackContentsAndGetCode(); // <~ Populates this.contents
        this.writeSync();
    };
    File.prototype.maybeFlushContentForceSync = function () {
        if (this.options.doWriteToDisk) {
            this.flushContentForceSync();
        }
    };
    File.prototype.assertBytecode = function (bytecode) {
        // If we have a blank bytecode object after the first couple of updates,
        // that usually means we're about to end up with a "Red Wall of Death"
        if (this._numBytecodeUpdates > 1) {
            if (Object.keys(bytecode).length < 2) {
                throw new Error("Bytecode object was empty ".concat(this.getAbspath()));
            }
        }
    };
    File.prototype.assertContents = function (contents) {
        if (typeof contents !== 'string') {
            throw new Error("Code was invalid ".concat(this.getAbspath()));
        }
        // Returns truthy for "", " ", "   \n ", etc.
        if (contents.match(/^\s*$/)) {
            throw new Error("Code was blank ".concat(this.getAbspath()));
        }
    };
    File.prototype.write = function (cb) {
        var _this = this;
        if (!this.options.doWriteToDisk) {
            throw new Error('[file] illegal write requested');
        }
        this.assertContents(this.contents);
        this.dtLastWriteStart = Date.now();
        logger.info("[file] async writing ".concat(this.relpath, " to disk"));
        return File.write(this.folder, this.relpath, this.contents, function (err) {
            _this.dtLastWriteEnd = Date.now();
            if (err) {
                logger.info("[file] error writing ".concat(_this.relpath, " to disk"), err);
                return cb(err);
            }
            return cb();
        });
    };
    File.prototype.writeSync = function () {
        if (!this.options.doWriteToDisk) {
            throw new Error('[file] illegal write requested');
        }
        this.assertContents(this.contents);
        this.dtLastWriteStart = Date.now();
        logger.info("[file] sync writing ".concat(this.relpath, " to disk"));
        var abspath = path.join(this.folder, this.relpath);
        fse.outputFileSync(abspath, this.contents);
        this.dtLastWriteEnd = Date.now();
    };
    File.prototype.getAbspath = function () {
        return path.join(this.folder, this.relpath);
    };
    File.prototype.getFolder = function () {
        return path.dirname(this.getAbspath());
    };
    File.prototype.isCode = function () {
        return this.type === FILE_TYPES.code;
    };
    File.prototype.isDesign = function () {
        return this.type === FILE_TYPES.design;
    };
    File.prototype.getImportPathTo = function (source) {
        // In case of builtin/installed components, we don't want to prefix with the dot :/
        // See also Asset#getLocalizedRelpath, Template#normalizePathOfPossiblyExternalModule
        // e.g. @haiku/core/components/controls/HTML
        // TODO: e.g. some-other-haiku-proj/moocow
        if (source[0] === '@') {
            return source;
        }
        return Template.normalizePath(path.relative(path.dirname(this.relpath), source));
    };
    /**
     * @method getReifiedBytecode
     * @description Return the reified form of the bytecode, that is, with actual functions, references,
     * and instances present as they would be if it were being executed in memory.
     */
    File.prototype.getReifiedBytecode = function () {
        // NOTE: Due to a legacy issue there used to be the assumption that the bytecode file could contain
        // multiple bytecodes, hence the [0]; that is no longer the case and this should be refactored! #FIXME
        return this.mod.fetchInMemoryExport();
    };
    /**
     * @method getReifiedDecycledBytecode
     * @description Similar to getReifiedBytecode but removes internal object pointers/annotations which either cause
     * serialization issues or which have the effect of adding too much metadata to the object. For example, the
     * reified bytecode by itself probably has a template that contains .layout properties, etc.
     */
    File.prototype.getReifiedDecycledBytecode = function (cleanManaOptions) {
        if (cleanManaOptions === void 0) { cleanManaOptions = {}; }
        var reified = this.getReifiedBytecode();
        return Bytecode.decycle(reified, { cleanManaOptions: cleanManaOptions, doCleanMana: true });
    };
    /**
     * @method getSerializedBytecode
     * @description Return the serialized form of the bytecode, that is, with all of its contents converted
     * into a form that can be safely transmitted over the wire. Functions get converted to function specifications,
     * identifiers are replaced with identifier descriptors, etc.
     * Note that this returns a new object; it doesn't serialize the bytecode in place. I.e., you can't
     * mutate the returned object and expect that to affect the live in-memory bytecode, nor the file system.
     */
    File.prototype.getSerializedBytecode = function () {
        var _this = this;
        return this.cache.fetch('getSerializedBytecode', function () {
            var reified = _this.getReifiedDecycledBytecode();
            Bytecode.cleanBytecode(reified);
            return expressionToRO(reified); // This returns a *new* object
        });
    };
    return File;
}(BaseModel));
BaseModel.extend(File);
File.TYPES = FILE_TYPES;
File.DEFAULT_OPTIONS = {
    doWriteToDisk: false, // Write all actions/content updates to disk
    skipDiffLogging: true, // Log a colorized diff of every content update
    required: {
        relpath: true,
        folder: true,
        project: true,
    },
};
File.DEFAULT_CONTEXT_SIZE = DEFAULT_CONTEXT_SIZE;
File.cache = new Cache();
File.write = function (folder, relpath, contents, cb) {
    var abspath = path.join(folder, relpath);
    return Lock.request(Lock.LOCKS.FileReadWrite(abspath), true, function (release) {
        return fse.outputFile(abspath, contents, function (err) {
            release();
            if (err) {
                return cb(err);
            }
            return cb();
        });
    });
};
File.read = function (folder, relpath, cb) {
    var abspath = path.join(folder, relpath);
    return Lock.request(Lock.LOCKS.FileReadWrite(abspath), false, function (release) {
        return fse.readFile(abspath, function (err, buffer) {
            release();
            if (err) {
                return cb(err);
            }
            return cb(null, buffer.toString());
        });
    });
};
File.isPathCode = function (relpath) {
    return _isFileCode(relpath);
};
File.buildManaCacheKey = function (folder, relpath) {
    return "mana:".concat(path.join(folder, relpath));
};
/**
 * @method readMana
 * @description Given the relative path to an SVG file, read the file into
 * memory, parse the contents, and return the respective 'mana' data object.
 * @param relpath {String} Relative path to SVG design asset within folder
 * @param cb {Function} Callback
 */
File.readMana = function (folder, relpath, cb) {
    return File.cache.async(File.buildManaCacheKey(folder, relpath), function (done) {
        return File.read(folder, relpath, function (err, buffer) {
            if (err) {
                return done(err);
            }
            var xml = buffer.toString();
            var returnUnoptimizedMana = function () {
                var manaFull = xmlToMana(xml);
                if (!manaFull) {
                    return done(new Error("We couldn't load the contents of ".concat(relpath)));
                }
                return done(null, manaFull);
            };
            return getSvgOptimizer().optimize(xml, { path: path.join(folder, relpath) }).then(function (contents) {
                var manaOptimized = xmlToMana(contents.data);
                if (!manaOptimized) {
                    throw new Error("We couldn't load the contents of ".concat(relpath));
                }
                return done(null, manaOptimized);
            })
                .catch(function (exception) {
                // Log the exception too in case the error occurred as part of our pipeline
                logger.warn("[file] svgo couldn't parse ".concat(relpath), exception);
                return setTimeout(function () {
                    return returnUnoptimizedMana();
                });
            });
        });
    }, cb, function (mana) {
        // Must clone the template here since mutation will occur in-place
        return Template.clone({}, mana);
    });
};
var _isFileCode = function (relpath) {
    return path.extname(relpath) === '.js';
};
module.exports = File;
// Down here to avoid Node circular dependency stub objects. #FIXME
var AST = require('./AST');
var Bytecode = require('./Bytecode');
var ActiveComponent = require('./ActiveComponent');
var ModuleWrapper = require('./ModuleWrapper');
var Template = require('./Template');
//# sourceMappingURL=File.js.map