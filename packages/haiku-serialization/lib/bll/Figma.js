var _a;
/* eslint-disable prefer-promise-reject-errors */
var _b = require('url'), URL = _b.URL, URLSearchParams = _b.URLSearchParams;
var request = require('request');
var fse = require('haiku-fs-extra');
var path = require('path');
var inkstone = require('@haiku/sdk-inkstone').inkstone;
var logger = require('../utils/LoggerInstance');
var randomAlphabetical = require('../utils/randomAlphabetical');
var mixpanel = require('haiku-serialization/src/utils/Mixpanel');
var sanitize = require('../utils/fileManipulation').sanitize;
var API_BASE = 'https://api.figma.com/v1/';
var FIGMA_URL = 'https://www.figma.com/';
var FIGMA_CLIENT_ID = process.env.FIGMA_CLIENT_ID || 'tmhDo4V12I3fEiQ9OG8EHh';
var IS_FIGMA_FILE_RE = /\.figma$/;
var IS_FIGMA_FOLDER_RE = /\.figma\.contents/;
var FIGMA_DEFAULT_FILENAME = 'Untitled';
var VALID_TYPES = {
    SLICE: 'SLICE',
    GROUP: 'GROUP',
    FRAME: 'FRAME',
    COMPONENT: 'COMPONENT',
};
var FOLDERS = (_a = {},
    _a[VALID_TYPES.SLICE] = 'slices/',
    _a[VALID_TYPES.GROUP] = 'groups/',
    _a[VALID_TYPES.COMPONENT] = 'groups/',
    _a[VALID_TYPES.FRAME] = 'frames/',
    _a);
var MAX_ITEMS_TO_IMPORT = 100;
var PRIORITY_TO_IMPORT = [
    VALID_TYPES.SLICE,
    VALID_TYPES.GROUP,
    VALID_TYPES.FRAME,
    VALID_TYPES.COMPONENT,
];
var uniqueNameResolver = {};
var PHONY_FIGMA_FILE = 'phony-haiku-helper-file.svg';
/**
 * @class Figma
 * @description
 *  Collection of static class methods and constants related to Figma assets.
 */
var Figma = /** @class */ (function () {
    function Figma(_a) {
        var token = _a.token, _b = _a.requestLib, requestLib = _b === void 0 ? request : _b;
        this._token = token;
        this._requestLib = requestLib;
    }
    Object.defineProperty(Figma.prototype, "token", {
        get: function () {
            return this._token;
        },
        set: function (token) {
            this._token = token;
        },
        enumerable: false,
        configurable: true
    });
    /**
     * Imports SVGs from a Figma url in the given path
     * @param {Object} params
     * @param {string} params.url
     * @param {string} params.projectFolder
     * @returns {Promise}
     */
    Figma.prototype.importSVG = function (_a) {
        var _this = this;
        var url = _a.url, projectFolder = _a.projectFolder;
        var id = Figma.parseProjectURL(url).id;
        var assetBaseFolder;
        logger.info('[figma] about to import document with id ' + id);
        mixpanel.haikuTrack('creator:figma:fileImport:start');
        return new Promise(function (resolve, reject) {
            _this.fetchDocument(id)
                .then(function (rawDocument) {
                var document = JSON.parse(rawDocument);
                var abspath = path.join(projectFolder, 'designs', "".concat(id, "-").concat(document.name, ".figma"));
                assetBaseFolder = "".concat(abspath, ".contents");
                _this.createFolders(assetBaseFolder);
                return document;
            })
                .then(function (document) { return _this.findInstantiableElements(document, id); })
                .then(function (elements) { return _this.sortElementsByPriorityToImport(elements); })
                .then(function (elements) { return _this.getSVGLinks(elements, id); })
                .then(function (elements) { return _this.getSVGContents(elements); })
                .then(function (elements) { return _this.writeSVGInDisk(elements, assetBaseFolder); })
                .then(function (elements) {
                mixpanel.haikuTrack('creator:figma:fileImport:success');
                resolve(elements.length);
            })
                .catch(reject);
        });
    };
    /**
     * Fetch document info from the Figma API
     * @param {string} id
     * @returns {Promise}
     */
    Figma.prototype.fetchDocument = function (id) {
        var uri = API_BASE + 'files/' + id;
        return this.request({ uri: uri });
    };
    /**
     * Create necessary folders
     * @param {string} assetBaseFolder
     */
    Figma.prototype.createFolders = function (assetBaseFolder) {
        return new Promise(function (resolve, reject) {
            try {
                fse.emptyDirSync(assetBaseFolder);
                var sliceFolder = path.join(assetBaseFolder, FOLDERS[VALID_TYPES.SLICE]);
                fse.mkdirpSync(sliceFolder);
                var groupFolder = path.join(assetBaseFolder, FOLDERS[VALID_TYPES.GROUP]);
                fse.mkdirpSync(groupFolder);
                var frameFolder = path.join(assetBaseFolder, FOLDERS[VALID_TYPES.FRAME]);
                fse.mkdirpSync(frameFolder);
                fse.ensureFileSync(path.join(sliceFolder, PHONY_FIGMA_FILE));
                resolve(true);
            }
            catch (error) {
                reject(error);
            }
        });
    };
    /**
     * Write an array of elements containing SVG info into disk
     * @param {Array} elements
     * @param {String} assetBaseFolder
     * @returns {Promise}
     */
    Figma.prototype.writeSVGInDisk = function (elements, assetBaseFolder) {
        logger.info('[figma] writing SVGs in disk');
        return Promise.all(elements.map(function (element) {
            if (element) {
                // Mimic the behaior of our Sketch importer: move to the slices folder
                // everything that is marked for export
                var folder = FOLDERS[element.type] || FOLDERS.SLICE;
                var svgPath = path.join(assetBaseFolder, folder, "".concat(sanitize(element.name), ".svg"));
                return fse.writeFile(svgPath, element.svg || '<svg version="1.1" xmlns="http://www.w3.org/2000/svg"></svg>');
            }
        }));
    };
    /**
     * Maps an array of elements with URLs pointing to SVG resources to elements
     * with actual SVG markup as a string property
     * @param {Array} elements
     */
    Figma.prototype.getSVGContents = function (elements) {
        var _this = this;
        logger.info('[figma] downloading SVGs from cloud');
        var requests = elements.map(function (element) {
            return new Promise(function (resolve, reject) {
                _this.request({ uri: element.svgURL, auth: false }).then(function (svg) {
                    resolve(Object.assign(element, { svg: svg }));
                })
                    .catch(function (error) {
                    logger.error("[figma] failed to import slice or group: ".concat(JSON.stringify(element)), error);
                    resolve();
                });
            });
        });
        return Promise.all(requests);
    };
    /**
     * Maps an array of elements into an array of elements with links to their
     * SVG representation in the cloud via the Figma API
     * @param {Array} elements
     * @param {string} id
     * @returns {Promise}
     */
    Figma.prototype.getSVGLinks = function (elements, id) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            var ids = elements.map(function (element) { return element.id; });
            if (ids.length === 0) {
                return reject({
                    status: 424,
                    err: 'It looks like the Figma document you imported doesn\'t have any groups or slices. Try adding some and re-syncing.',
                });
            }
            // TODO: instead of limiting the max number of items to import, import them in batches
            // for now it doesn't make sense to import a lot of items anyway due to performance
            // reasons. [Look in Asana][1] for the related ticket
            // [1]: https://app.asana.com/0/506410768732347/781835844490777
            if (ids.length > MAX_ITEMS_TO_IMPORT) {
                ids = ids.slice(0, MAX_ITEMS_TO_IMPORT);
            }
            var params = new URLSearchParams([['format', 'svg'], ['ids', ids], ['svg_include_id', true]]);
            var uri = API_BASE + 'images/' + id + '?' + params.toString();
            _this.request({ uri: uri })
                .then(function (SVGLinks) {
                // TODO: links comes with an error param, we should check that
                var images = JSON.parse(SVGLinks).images;
                var elementsWithLinks = elements.map(function (element) {
                    return Object.assign(element, { svgURL: images[element.id] });
                });
                resolve(elementsWithLinks);
            })
                .catch(reject);
        });
    };
    Figma.prototype.sortElementsByPriorityToImport = function (arr) {
        return arr.sort(function (a, b) { return PRIORITY_TO_IMPORT.indexOf(a.type) - PRIORITY_TO_IMPORT.indexOf(b.type); });
    };
    Figma.prototype.findItems = function (arr, fileId) {
        var result = [];
        for (var _i = 0, arr_1 = arr; _i < arr_1.length; _i++) {
            var item = arr_1[_i];
            if (VALID_TYPES[item.type] || (item.exportSettings && item.exportSettings.length > 0)) {
                result.push({
                    id: item.id,
                    name: Figma.getUniqueName(fileId, item.name),
                    type: item.type,
                });
            }
            if (item.children) {
                result.push.apply(result, this.findItems(item.children, fileId));
            }
        }
        return result;
    };
    Figma.prototype.findInstantiableElements = function (file, fileId) {
        uniqueNameResolver[fileId] = {};
        return this.findItems(file.document.children, fileId);
    };
    Figma.prototype.request = function (_a) {
        var _this = this;
        var uri = _a.uri, _b = _a.auth, auth = _b === void 0 ? true : _b;
        var headers = auth ? { Authorization: 'Bearer ' + this.token } : {};
        return new Promise(function (resolve, reject) {
            _this._requestLib({ uri: uri, headers: headers }, function (error, response, body) {
                if (error || response.statusCode !== 200) {
                    try {
                        reject(JSON.parse(body));
                    }
                    catch (e) {
                        reject({ status: 500, err: 'There was an error connecting with Figma.' });
                    }
                }
                else {
                    resolve(body);
                }
            });
        });
    };
    /**
     * Parse a Figma URL and return the name and the id of the file it references
     * @param {string} rawURL must be a string in the format 'protocol://host/id/name
     * @returns {Object} an object containing the id and the name in the URL
     */
    Figma.parseProjectURL = function (rawURL) {
        logger.info('[figma] parsing project URL: ' + rawURL);
        try {
            var url = new URL(rawURL);
            // eslint-disable-next-line
            var _a = url.pathname.split('/'), _1 = _a[0], __ = _a[1], id = _a[2], name_1 = _a[3];
            if (!id) {
                return null;
            }
            return { id: id, name: name_1 || FIGMA_DEFAULT_FILENAME };
        }
        catch (e) {
            return null;
        }
    };
    /**
     * Build a link to a Figma file based on the ID and the name
     * @param {string} fileID
     * @param {string} fileName
     * @returns {string}
     */
    Figma.buildFigmaLink = function (fileID, fileName) {
        if (fileName === void 0) { fileName = ''; }
        return "".concat(FIGMA_URL, "file/").concat(fileID, "/").concat(fileName);
    };
    /**
     * Build a OAuth link
     * @returns {string}
     */
    Figma.buildAuthenticationLink = function () {
        var state = randomAlphabetical(15);
        var redirectURI = "haiku://oauth/figma&scope=file_read&state=".concat(state, "&response_type=code");
        var url = "".concat(FIGMA_URL, "oauth?client_id=").concat(FIGMA_CLIENT_ID, "&redirect_uri=").concat(redirectURI);
        return { url: url, state: state };
    };
    /**
     * Request inkstone for a Figma access token
     * @param {Object} params
     * @param {string} params.code
     * @param {string} params.state
     * @param {string} params.stateCheck
     */
    Figma.getAccessToken = function (_a) {
        var code = _a.code, state = _a.state, stateCheck = _a.stateCheck;
        return new Promise(function (resolve, reject) {
            if (state !== stateCheck) {
                reject({ status: 403, err: 'Invalid state code' });
            }
            inkstone.integrations.getFigmaAccessToken(code, function (error, response) {
                error ? reject(error) : resolve(response);
            });
        });
    };
    /**
     * Checks if a path points to a Figma file
     * @param {string} path
     * @returns {boolean}
     */
    Figma.isFigmaFile = function (path) {
        return !!path && path.match(IS_FIGMA_FILE_RE);
    };
    /**
     * Checks if a path points to a Figma folder
     * @param {string} path
     * @returns {boolean}
     */
    Figma.isFigmaFolder = function (path) {
        return !!path && path.match(IS_FIGMA_FOLDER_RE);
    };
    /**
     * Tries to find an ID from a Figma path
     * @param {string} relpath
     * @returns {string|boolean}
     */
    Figma.findIDFromPath = function (relpath) {
        var basename = path.basename(relpath);
        var match = basename.match(/(\w+)-/);
        return match && match[1];
    };
    /**
     * Tries to find the asset name from a Figma path
     * @param {string} relpath
     * @returns {string}
     */
    Figma.findDisplayNameFromPath = function (relpath) {
        var basename = path.basename(relpath);
        var match = basename.match(/(\w+)-([\w-]+)\./);
        return match ? match[2] : FIGMA_DEFAULT_FILENAME;
    };
    Figma.buildFigmaLinkFromPath = function (relpath) {
        var id = Figma.findIDFromPath(relpath);
        return Figma.buildFigmaLink(id);
    };
    /**
     * Using uniqueNameResolver hashmap, retrieve a unique name for this Figma sync. This allows duplicate names on slices
     * while still allowing us to fetch and write out SVG contents async.
     * @param {string} fileId
     * @param {string} name
     * @returns {string}
     */
    Figma.getUniqueName = function (fileId, name) {
        if (!uniqueNameResolver[fileId]) {
            // This should never happen.
            uniqueNameResolver[fileId] = {};
        }
        if (!uniqueNameResolver[fileId].hasOwnProperty(name)) {
            uniqueNameResolver[fileId][name] = 0;
            return name;
        }
        return "".concat(name, " Copy ").concat(++uniqueNameResolver[fileId][name]);
    };
    return Figma;
}());
module.exports = { Figma: Figma, PHONY_FIGMA_FILE: PHONY_FIGMA_FILE, FIGMA_DEFAULT_FILENAME: FIGMA_DEFAULT_FILENAME, MAX_ITEMS_TO_IMPORT: MAX_ITEMS_TO_IMPORT };
//# sourceMappingURL=Figma.js.map