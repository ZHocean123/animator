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
var winston = require('winston');
var jsonStringify = require('fast-safe-stringify');
var EventEmitter = require('events');
var isProduction = require('haiku-common/lib/environments').isProduction;
var isWindows = require('haiku-common/lib/environments/os').isWindows;
require('colors'); // TODO: use non-string-extending module
var formatJsonLogToString = function (message) {
    if (message.noFormat) {
        return message.message;
    }
    if (Array.isArray(message.message)) {
        message.message = message.message.map(function (message) {
            if (typeof message === 'string') {
                return message;
            }
            return jsonStringify(message);
        }).join(' ');
    }
    // Pading is done to visually align on file
    return "".concat(message.timestamp, "|").concat(message.view.padEnd(8), "|").concat(message.level).concat(message.tag ? '|' + message.tag : '').concat(message.durationMs ? '|d=' + message.durationMs : '', "|").concat(message.message);
};
/**
 * Control log message format output
 */
var haikuFormat = winston.format.printf(function (info, opts) {
    return formatJsonLogToString(info);
});
// Ignore log messages if they have { doNotLogOnFile: true }
// Its needed to avoid double writing to log file on plumbing
var ignoreDoNotWriteToFile = winston.format(function (info, opts) {
    if (info.doNotLogOnFile) {
        return false;
    }
    return info;
});
var DEFAULTS = {
    maxsize: 1000000,
    maxFiles: 1,
    colorize: true,
};
var Logger = /** @class */ (function (_super) {
    __extends(Logger, _super);
    function Logger(folder, relpath, options) {
        if (options === void 0) { options = {}; }
        var _this = _super.call(this, options) || this;
        var config = Object.assign({}, DEFAULTS, options);
        var transports = [];
        if (folder && relpath) {
            var filename = path.join(folder, relpath);
            transports.push(new winston.transports.File({
                filename: filename,
                tailable: true,
                maxsize: config.maxsize,
                maxFiles: config.maxFiles,
                colorize: config.colorize,
                level: 'info',
                json: false,
                format: winston.format.combine(ignoreDoNotWriteToFile(), haikuFormat),
            }));
        }
        // In prod, we don't really benefit from sending logs to the dev console.
        // In Windows, our logging library (winston) has problems with stdout.
        if (!isProduction() && !isWindows()) {
            transports.push(new winston.transports.Console({
                format: winston.format.combine(haikuFormat),
            }));
        }
        _this.logger = winston.createLogger({
            format: winston.format.combine(winston.format.timestamp()),
            transports: transports,
        });
        // Hook to allow consumers to configure the view prefix from which we log
        _this.view = '?';
        return _this;
    }
    Logger.prototype.raw = function (jsonMessage) {
        this.logger.log(jsonMessage);
    };
    Logger.prototype.info = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        this.logger.info(args, { view: this.view });
    };
    Logger.prototype.traceInfo = function (tag, message, attachedObject) {
        this.logger.info(message, { view: this.view, tag: tag, attachedObject: attachedObject });
    };
    Logger.prototype.debug = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        this.logger.debug(args, { view: this.view });
    };
    Logger.prototype.warn = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        this.logger.warn(args, { view: this.view });
    };
    Logger.prototype.error = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        this.logger.error(args, { view: this.view });
    };
    /**
     * Methods not supported by winston fall back to console
     */
    Logger.prototype.assert = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        console.assert.apply(console, args);
    };
    Logger.prototype.count = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        console.count.apply(console, args);
    };
    Logger.prototype.countReset = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        console.countReset.apply(console, args);
    };
    Logger.prototype.dir = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        console.dir.apply(console, args);
    };
    Logger.prototype.dirxml = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        console.dirxml.apply(console, args);
    };
    Logger.prototype.exception = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        console.exception.apply(console, args);
    };
    Logger.prototype.group = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        console.group.apply(console, args);
    };
    Logger.prototype.groupCollapsed = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        console.groupCollapsed.apply(console, args);
    };
    Logger.prototype.groupEnd = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        console.groupEnd.apply(console, args);
    };
    Logger.prototype.profileEnd = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        console.profileEnd.apply(console, args);
    };
    Logger.prototype.select = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        console.select.apply(console, args);
    };
    Logger.prototype.table = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        console.table.apply(console, args);
    };
    Logger.prototype.time = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        this.logger.profile(args, { view: this.view });
    };
    Logger.prototype.timeLog = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        console.timeLog.apply(console, args);
    };
    Logger.prototype.timeEnd = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        this.logger.profile(args, { view: this.view });
    };
    Logger.prototype.trace = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        console.trace.apply(console, args);
    };
    return Logger;
}(EventEmitter));
module.exports = { Logger: Logger, formatJsonLogToString: formatJsonLogToString };
//# sourceMappingURL=Logger.js.map