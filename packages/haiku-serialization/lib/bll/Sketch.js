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
var fse = require('haiku-fs-extra');
var execSync = require('child_process').execSync;
var PNG = require('pngjs').PNG;
var logger = require('./../utils/LoggerInstance');
var BaseModel = require('./BaseModel');
var sketchUtils = require('../utils/sketchUtils');
var LOOKS_LIKE_SLICE = /\.sketch\.contents\/slices\//;
var LOOKS_LIKE_ARTBOARD = /\.sketch\.contents\/artboards\//;
var LOOKS_LIKE_PAGE = /\.sketch\.contents\/pages\//;
var IS_SKETCH_FILE_RE = /\.sketch$/;
var IS_SKETCH_FOLDER_RE = /\.sketch\.contents/;
var PARSER_CLI_PATH = '/Contents/Resources/sketchtool/bin/sketchtool';
var BASE64_BITMAP_RE = /"data:image\/(png|jpe?g|gif);base64,(.*?)"/gi;
/**
 * @class Sketch
 * @description
 *  Collection of static class methods and constants related to Sketch assets.
 */
var Sketch = /** @class */ (function (_super) {
    __extends(Sketch, _super);
    function Sketch() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return Sketch;
}(BaseModel));
Sketch.INSTALL_PATH = '/Applications/Sketch.app';
Sketch.findAndUpdateInstallPath = function () {
    sketchUtils.checkIfInstalled().then(function (possibleSketchPath) {
        Sketch.INSTALL_PATH = possibleSketchPath || Sketch.INSTALL_PATH;
    });
};
Sketch.DEFAULT_OPTIONS = {
    required: {},
};
BaseModel.extend(Sketch);
Sketch.looksLikeSlice = function (relpath) {
    return relpath.match(LOOKS_LIKE_SLICE);
};
Sketch.looksLikeArtboard = function (relpath) {
    return relpath.match(LOOKS_LIKE_ARTBOARD);
};
Sketch.looksLikePage = function (relpath) {
    return relpath.match(LOOKS_LIKE_PAGE);
};
Sketch.isSketchFile = function (abspath) {
    return abspath.match(IS_SKETCH_FILE_RE);
};
Sketch.isSketchFolder = function (abspath) {
    return !!abspath && abspath.match(IS_SKETCH_FOLDER_RE);
};
Sketch.exportFolderPath = function (sketchRelpath) {
    var cleanBasename = path.basename(sketchRelpath, path.extname(sketchRelpath));
    var expectedExportFolderName = "".concat(cleanBasename, ".sketch.contents");
    var expectedExportFolderPath = path.join(path.dirname(sketchRelpath), expectedExportFolderName);
    return expectedExportFolderPath;
};
Sketch.sketchtoolPipeline = function (abspath) {
    var sketchtoolPath = Sketch.INSTALL_PATH + PARSER_CLI_PATH;
    // Don't bother if the file passed is not a .sketch file
    if (!Sketch.isSketchFile(abspath)) {
        return void (0);
    }
    // Don't bother if we detect that the user doesn't even have sketchtool installed
    if (!fse.existsSync(sketchtoolPath)) {
        return void (0);
    }
    logger.info('[sketchtool] got', abspath);
    // Note: We used to generate Pages too (and adding those hooks back here
    // would obviously be easy, but we had no docs for how to use them, and all of our collateral
    // is focused on slices, so for an optimization, I've set this up
    // to only export slices and artboards. Feel free to change back if this is a problem.
    var assetBaseFolder = abspath + '.contents/';
    // Clear out all old contents that may exist in the folder, so the user doesn't see
    // a bunch of stale assets and wonder why they didn't go away after updating Sketch
    fse.emptyDirSync(assetBaseFolder);
    var sliceFolder = assetBaseFolder + 'slices/';
    fse.mkdirpSync(sliceFolder);
    var artboardFolder = assetBaseFolder + 'artboards/';
    fse.mkdirpSync(artboardFolder);
    // Full Command:
    // $ /Applications/Sketch.app/Contents/Resources/sketchtool/bin/sketchtool export --format=svg --output=~/TEST.sketch.export/artboards/ artboards ~/TEST.sketch
    logger.info('[sketchtool] running commands');
    var outputSlicesCmd = "".concat(sketchtoolPath, " export --format=svg --output=").concat(_escapeShell(sliceFolder), " slices ").concat(_escapeShell(abspath));
    execSync(outputSlicesCmd);
    var outputArtboardsCmd = "".concat(sketchtoolPath, " export --format=svg --output=").concat(_escapeShell(artboardFolder), " artboards ").concat(_escapeShell(abspath));
    execSync(outputArtboardsCmd);
    logger.info('[sketchtool] fix gamma correction');
    // Now loop through all of the outputs and fix the gamma value which leads to opacitation inconsistencies between browsers
    var outputEntries = fse.walkSync(assetBaseFolder);
    outputEntries.forEach(function (outputEntry) {
        // We only care about SVG vilew for now, since those are our primary component data format
        if (path.extname(outputEntry) !== '.svg') {
            return void (0);
        }
        var outputContents = fse.readFileSync(outputEntry).toString();
        var numImageMatches = 0;
        var updatedContents = outputContents.replace(BASE64_BITMAP_RE, function (matchString, imageFormat, base64data) {
            return matchString.replace(base64data, _processBase64ImageData(base64data, imageFormat, outputEntry, numImageMatches++));
        });
        fse.writeFileSync(outputEntry, updatedContents);
    });
    return true;
};
function _escapeShell(cmd) {
    return cmd.replace(/(["\s'$`\\])/g, '\\$1');
}
function _processBase64ImageData(base64data, imageFormat, fileAbspath, bitmapIndex) {
    // TODO: Support other image formats (if necessary?) I dunno if formats other than png have gamma correction...
    if (imageFormat === 'png') {
        var imageBufferData = Buffer.from(base64data, 'base64');
        var pngInstance = PNG.sync.read(imageBufferData);
        // I've tried 0, 1, and 2.2, and only the magic number 1/2.2 seems to give me consistent
        // results that render correctly in Chrome, Firefox, and Safari...
        // I don't have any great ideas on how to derive the correct gamma setting based on the
        // sketch outputs, so I'll just normalize everything to this.
        // This is partly a #HACK in that when pngjs runs 'adjustGamma' it uses the internally
        // set .gamma property, so my setting it here might be poor coding practice...
        pngInstance.gamma = 1 / 2.2;
        PNG.adjustGamma(pngInstance);
        var updatedBufferData = PNG.sync.write(pngInstance);
        var updated64data = updatedBufferData.toString('base64');
        return updated64data;
        // FUTURE: In case we want to write out the bitmap, we could use a path like this:
        // let imageAbspath = `${fileAbspath}.${bitmapIndex}.${imageFormat}`
    }
    // If not a png, just return the base64 data directly since there's nothing to do for now
    return base64data;
}
module.exports = Sketch;
//# sourceMappingURL=Sketch.js.map