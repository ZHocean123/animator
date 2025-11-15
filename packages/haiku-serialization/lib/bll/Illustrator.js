var execSync = require('child_process').execSync;
var fse = require('haiku-fs-extra');
var _a = require('haiku-common/lib/environments/os'), isMac = _a.isMac, isWindows = _a.isWindows;
var logger = require('../utils/LoggerInstance');
var stringifyPath = require('../utils/fileManipulation').stringifyPath;
var os = require('os');
var uuid = require('uuid');
var path = require('path');
var IS_ILLUSTRATOR_FILE_RE = /\.ai$/;
var IS_ILLUSTRATOR_FOLDER_RE = /\.ai\.contents/;
var cachedWindowsInstallPath = null;
/**
 * This template script runs inside Illustrator and perform the export of the
 * artboards as SVG files.
 *
 * Full documentation of Illustrator scripting can be found [in the official reference][1].
 *
 * note: this script needs to be dinamically defined because the DESTINATION_PATH
 * string changes from import to import.
 *
 * [1]: https://wwwimages2.adobe.com/content/dam/acom/en/devnet/illustrator/pdf/Illustrator_JavaScript_Scripting_Reference_2017.pdf
 */
var EXPORTER_SCRIPT = "\n  if (app.documents.length > 0) {\n    var exportOptions = new ExportOptionsSVG()\n    var type = ExportType.SVG\n    var dest = 'DESTINATION_PATH'\n    var sourcePath = 'SOURCE_PATH'\n    var fileSpec = new File(dest)\n\n    // Try open/focus on the file to export\n    app.open(new File(sourcePath))\n\n    var srcFile = app.activeDocument.fullName;\n\n    // Export options can be further customized, check out the documentation.\n    exportOptions.embedRasterImages = true\n    exportOptions.embedAllFonts = false\n    exportOptions.cssProperties = SVGCSSPropertyLocation.PRESENTATIONATTRIBUTES\n    exportOptions.fontSubsetting = SVGFontSubsetting.None\n    exportOptions.fontType = SVGFontType.OUTLINEFONT\n    exportOptions.documentEncoding = SVGDocumentEncoding.UTF8\n    exportOptions.saveMultipleArtboards = true\n\n    // Export all artboards in the current document\n    app.activeDocument.exportFile(fileSpec, type, exportOptions)\n\n    // Unfortunately exporting artboards sets the exported file as the current\n    // active document, so we need to close it, and open the original ai file\n    app.activeDocument.close(SaveOptions.DONOTSAVECHANGES);\n    app.open(srcFile);\n  }\n";
var Illustrator = /** @class */ (function () {
    function Illustrator() {
    }
    /**
     * Checks if the file provided looks like an Illustrator file.
     * @param {string} abspath
     * @returns {Boolean}
     */
    Illustrator.isIllustratorFile = function (abspath) {
        return abspath.match(IS_ILLUSTRATOR_FILE_RE);
    };
    /**
     * Checks if the folder provided looks like a folder that should contain
     * Illustrator assets.
     * @param {string} abspath
     * @returns {Boolean}
     */
    Illustrator.isIllustratorFolder = function (abspath) {
        return !!abspath && abspath.match(IS_ILLUSTRATOR_FOLDER_RE);
    };
    /**
     * Import artboards as SVG files from an Illustrator document
     * @param {string} abspath
     * @returns {Boolean}
     */
    Illustrator.importSVG = function (_a) {
        var abspath = _a.abspath, tryToOpenFile = _a.tryToOpenFile;
        if (!Illustrator.isIllustratorFile(abspath)) {
            return false;
        }
        logger.info('[illustrator] got', abspath);
        var assetBaseFolder = "".concat(abspath, ".contents");
        var artboardFolder = path.join(assetBaseFolder, 'artboards/');
        fse.emptyDirSync(assetBaseFolder);
        fse.mkdirpSync(artboardFolder);
        logger.info('[illustrator] running commands');
        // We need to create a temporary Illustrator script file with the contents of
        // EXPORTER_SCRIPT to perform the export, this is an attempt to obscure the
        // file name to reduce the chances of an attacker modifying the contents of this
        // file before being executed.
        var tmpdir = os.tmpdir();
        var fileName = uuid.v4() + '.jsx';
        var exportScriptPath = path.join(tmpdir, fileName);
        var exportScript = EXPORTER_SCRIPT
            .replace('DESTINATION_PATH', stringifyPath(artboardFolder))
            .replace('SOURCE_PATH', stringifyPath(abspath));
        fse.writeFileSync(exportScriptPath, exportScript);
        if (tryToOpenFile) {
            execSync(Illustrator.openIllustratorFile(abspath));
            // Try to do our best to wait until the file is open before running the
            // script.
            setTimeout(function () { return Illustrator.openIllustratorFile(exportScriptPath); }, 5000);
        }
        else {
            execSync(Illustrator.openIllustratorFile(exportScriptPath));
        }
        return true;
    };
    Illustrator.openIllustratorFile = function (file) {
        if (isMac()) {
            return "open -g -b com.adobe.Illustrator ".concat(file);
        }
        if (isWindows()) {
            return "\"".concat(Illustrator.getWindowsIllustratorPath(), "\" \"").concat(file, "\"");
        }
    };
    Illustrator.getWindowsIllustratorPath = function () {
        if (cachedWindowsInstallPath) {
            return cachedWindowsInstallPath;
        }
        var illustratorPath;
        try {
            var installedApplications = execSync('reg QUERY "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths" /s')
                .toString();
            illustratorPath = installedApplications
                .split('\n')
                .find(function (record) { return record.includes('Illustrator') && record.includes('Default'); })
                .match(/([a-zA-Z]\:.+)/g)[0];
        }
        catch (error) {
            logger.info('[illustrator] error finding Illustrator: ', error);
            return;
        }
        if (!illustratorPath) {
            logger.info('[illustrator] unable to find an Illustrator installation');
            return;
        }
        cachedWindowsInstallPath = illustratorPath;
        return illustratorPath;
    };
    return Illustrator;
}());
module.exports = Illustrator;
//# sourceMappingURL=Illustrator.js.map