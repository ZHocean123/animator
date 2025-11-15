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
var toTitleCase = require('./helpers/toTitleCase');
var BaseModel = require('./BaseModel');
var Sketch = require('./Sketch');
var Illustrator = require('./Illustrator');
var _a = require('./Figma'), Figma = _a.Figma, PHONY_FIGMA_FILE = _a.PHONY_FIGMA_FILE;
var _b = require('haiku-common/lib/experiments'), Experiment = _b.Experiment, experimentIsEnabled = _b.experimentIsEnabled;
var _c = require('haiku-common/lib/environments/os'), isMac = _c.isMac, isWindows = _c.isWindows;
var PAGES_REGEX = isWindows() ? /\\pages\\/ : /\/pages\//;
var SLICES_REGEX = isWindows() ? /\\slices\\/ : /\/slices\//;
var ARTBOARDS_REGEX = isWindows() ? /\\artboards\\/ : /\/artboards\//;
var GROUPS_REGEX = isWindows() ? /\\groups\\/ : /\/groups\//;
var FRAMES_REGEX = isWindows() ? /\\frames\\/ : /\/frames\//;
var MAIN_COMPONENT_NAME = 'main';
/**
 * @class Asset
 * @description
 *  Encapsulates any object that needs to be displayed in the Library UI.
 *  Also abstracts some of the logic for asset nesting/grouping for display.
 *  Includes static methods for common asset-related tasks.
 */
var Asset = /** @class */ (function (_super) {
    __extends(Asset, _super);
    function Asset() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    Asset.prototype.getAbspath = function () {
        return path.join(this.project.getFolder(), this.getRelpath());
    };
    Asset.prototype.getRelpath = function () {
        return this.relpath;
    };
    Asset.prototype.getSceneName = function () {
        if (!this.isComponent()) {
            return;
        }
        var parts = path.normalize(this.relpath).split(path.sep);
        return parts[1];
    };
    Asset.prototype.getAssetInfo = function () {
        var parts = this.relpath.split(path.sep);
        // It's definitely not a generated piece if its length doesn't match the pattern
        if (parts.length !== 4) {
            return { generator: null, relpath: null };
        }
        // Looking for a path like designs/Foo.sketch.contents/Slices
        var longSource = path.join(parts[0], parts[1], parts[2]);
        var shortSource = path.join(parts[0], parts[1]);
        var matchRegexp = isWindows() ? /\.(\w+)\.contents\\/ : /\.(\w+)\.contents\//;
        var match = longSource.match(matchRegexp);
        if (match) {
            return {
                generator: match[1],
                generatorRelpath: shortSource.replace(/\.contents$/, ''),
            };
        }
        return { generator: null, relpath: null };
    };
    Asset.prototype.isDraggable = function () {
        return ((this.isComponent() && this.isComponentOtherThanMain()) ||
            this.isVector() ||
            this.isImage());
    };
    Asset.prototype.isComponent = function () {
        return this.kind === Asset.KINDS.COMPONENT;
    };
    Asset.prototype.isVector = function () {
        return this.kind === Asset.KINDS.VECTOR;
    };
    Asset.prototype.isImage = function () {
        return this.kind === Asset.KINDS.IMAGE;
    };
    Asset.prototype.isSketchFile = function () {
        return this.kind === Asset.KINDS.SKETCH;
    };
    Asset.prototype.isFigmaFile = function () {
        return this.kind === Asset.KINDS.FIGMA;
    };
    Asset.prototype.isIllustratorFile = function () {
        return this.kind === Asset.KINDS.ILLUSTRATOR;
    };
    Asset.prototype.isRemoteAsset = function () {
        return this.proximity === Asset.PROXIMITIES.REMOTE;
    };
    Asset.prototype.isLocalAsset = function () {
        return this.proximity === Asset.PROXIMITIES.LOCAL;
    };
    Asset.prototype.isLocalComponent = function () {
        return this.isComponent() && this.isLocalAsset();
    };
    Asset.prototype.getLocalizedRelpath = function () {
        // In case of builtin/installed components, we don't want to prefix with the dot :/
        // See also Template#normalizePathOfPossiblyExternalModule
        // e.g. @haiku/core/components/controls/HTML
        // TODO: e.g. some-other-haiku-proj/moocow
        if (this.getRelpath()[0] === '@') {
            return this.getRelpath();
        }
        // ActiveComponent#instantiateComponent depends on us correctly indicating a local component
        return Template.normalizePath("./".concat(this.getRelpath()));
    };
    Asset.prototype.isOrphanSvg = function () {
        return this.isVector() && this.parent.isDesignsHostFolder();
    };
    Asset.prototype.isComponentOtherThanMain = function () {
        return (this.isComponent() && this.relpath !== 'code/main/code.js');
    };
    Asset.prototype.isDesignsHostFolder = function () {
        return this.relpath === 'designs';
    };
    Asset.prototype.isComponentsHostFolder = function () {
        return this.relpath === 'code';
    };
    Asset.prototype.addSketchChild = function (svgAsset) {
        if (svgAsset.isSlice()) {
            this.slicesFolderAsset.insertChild(svgAsset);
            this.unshiftFolderAsset(this.slicesFolderAsset);
        }
        else if (svgAsset.isArtboard()) {
            this.artboardsFolderAsset.insertChild(svgAsset);
            this.unshiftFolderAsset(this.artboardsFolderAsset);
        }
        else {
            this.insertChild(svgAsset);
        }
    };
    Asset.prototype.addFigmaChild = function (svgAsset) {
        if (svgAsset.isSlice()) {
            this.slicesFolderAsset.insertChild(svgAsset);
            this.unshiftFolderAsset(this.slicesFolderAsset);
        }
        else if (svgAsset.isGroup()) {
            this.groupsFolderAsset.insertChild(svgAsset);
            this.unshiftFolderAsset(this.groupsFolderAsset);
        }
        else if (svgAsset.isFrame()) {
            this.framesFolderAsset.insertChild(svgAsset);
            this.unshiftFolderAsset(this.framesFolderAsset);
        }
    };
    Asset.prototype.addIllustratorChild = function (svgAsset) {
        this.artboardsFolderAsset.insertChild(svgAsset);
        this.unshiftFolderAsset(this.artboardsFolderAsset);
    };
    Asset.prototype.addSketchAsset = function (relpath, dict) {
        var project = this.project;
        var result = Asset.findById(path.join(project.getFolder(), relpath));
        if (result) {
            this.insertChild(result);
            return result;
        }
        var artboardsFolderAsset = Asset.upsert({
            uid: path.join(project.getFolder(), 'designs', relpath, 'artboards'),
            type: Asset.TYPES.CONTAINER,
            kind: Asset.KINDS.FOLDER,
            proximity: Asset.PROXIMITIES.LOCAL,
            project: project,
            relpath: path.join('designs', relpath, 'artboards'),
            displayName: 'Artboards',
            children: [],
            dtModified: Date.now(),
        });
        var slicesFolderAsset = Asset.upsert({
            uid: path.join(project.getFolder(), 'designs', relpath, 'slices'),
            type: Asset.TYPES.CONTAINER,
            kind: Asset.KINDS.FOLDER,
            proximity: Asset.PROXIMITIES.LOCAL,
            project: project,
            relpath: path.join('designs', relpath, 'slices'),
            displayName: 'Slices',
            children: [],
            dtModified: Date.now(),
        });
        var sketchAsset = Asset.upsert({
            uid: path.join(project.getFolder(), relpath),
            type: Asset.TYPES.CONTAINER,
            kind: Asset.KINDS.SKETCH,
            proximity: Asset.PROXIMITIES.LOCAL,
            project: project,
            relpath: relpath,
            displayName: path.basename(relpath),
            children: [],
            slicesFolderAsset: slicesFolderAsset, // Hacky, but avoids extra 'upsert' logic
            artboardsFolderAsset: artboardsFolderAsset,
            dtModified: (dict[relpath] && dict[relpath].dtModified) || Date.now(),
        });
        slicesFolderAsset.parent = artboardsFolderAsset.parent = sketchAsset;
        this.insertChild(sketchAsset);
        return sketchAsset;
    };
    Asset.prototype.addFigmaAsset = function (relpath) {
        var project = this.project;
        var result = Asset.findById(path.join(project.getFolder(), relpath));
        if (result) {
            this.insertChild(result);
            return result;
        }
        var framesFolderAsset = Asset.upsert({
            uid: path.join(project.getFolder(), 'designs', relpath, 'frames'),
            type: Asset.TYPES.CONTAINER,
            kind: Asset.KINDS.FOLDER,
            proximity: Asset.PROXIMITIES.LOCAL,
            project: project,
            relpath: path.join('designs', relpath, 'frames'),
            displayName: 'Frames',
            children: [],
            dtModified: Date.now(),
        });
        var groupsFolderAsset = Asset.upsert({
            uid: path.join(project.getFolder(), 'designs', relpath, 'groups'),
            type: Asset.TYPES.CONTAINER,
            kind: Asset.KINDS.FOLDER,
            proximity: Asset.PROXIMITIES.LOCAL,
            project: project,
            relpath: path.join('designs', relpath, 'groups'),
            displayName: 'Groups',
            children: [],
            dtModified: Date.now(),
        });
        var slicesFolderAsset = Asset.upsert({
            uid: path.join(project.getFolder(), 'designs', relpath, 'slices'),
            type: Asset.TYPES.CONTAINER,
            kind: Asset.KINDS.FOLDER,
            proximity: Asset.PROXIMITIES.LOCAL,
            project: project,
            relpath: path.join('designs', relpath, 'slices'),
            displayName: 'Slices',
            children: [],
            dtModified: Date.now(),
        });
        var figmaAsset = Asset.upsert({
            uid: path.join(project.getFolder(), relpath),
            type: Asset.TYPES.CONTAINER,
            kind: Asset.KINDS.FIGMA,
            proximity: Asset.PROXIMITIES.LOCAL,
            figmaID: Figma.findIDFromPath(relpath),
            project: project,
            relpath: relpath,
            displayName: Figma.findDisplayNameFromPath(relpath),
            children: [],
            slicesFolderAsset: slicesFolderAsset, // Hacky, but avoids extra 'upsert' logic
            groupsFolderAsset: groupsFolderAsset,
            framesFolderAsset: framesFolderAsset,
            dtModified: Date.now(),
        });
        slicesFolderAsset.parent = groupsFolderAsset.parent = figmaAsset;
        this.insertChild(figmaAsset);
        // Must return for the asset to be listed
        return figmaAsset;
    };
    Asset.prototype.addIllustratorAsset = function (relpath, dict) {
        var project = this.project;
        var result = Asset.findById(path.join(project.getFolder(), relpath));
        if (result) {
            this.insertChild(result);
            return result;
        }
        var artboardsFolderAsset = Asset.upsert({
            uid: path.join(project.getFolder(), 'designs', relpath, 'artboards'),
            type: Asset.TYPES.CONTAINER,
            kind: Asset.KINDS.FOLDER,
            proximity: Asset.PROXIMITIES.LOCAL,
            project: project,
            relpath: path.join('designs', relpath, 'artboards'),
            displayName: 'Artboards',
            children: [],
            dtModified: Date.now(),
        });
        var illustratorAsset = Asset.upsert({
            uid: path.join(project.getFolder(), relpath),
            type: Asset.TYPES.CONTAINER,
            kind: Asset.KINDS.ILLUSTRATOR,
            project: project,
            proximity: Asset.PROXIMITIES.LOCAL,
            relpath: relpath,
            displayName: path.basename(relpath),
            children: [],
            artboardsFolderAsset: artboardsFolderAsset,
            dtModified: (dict[relpath] && dict[relpath].dtModified) || Date.now(),
        });
        artboardsFolderAsset.parent = illustratorAsset;
        this.insertChild(illustratorAsset);
        return illustratorAsset;
    };
    Asset.prototype.getChildAssets = function () {
        return this.children;
    };
    Asset.prototype.isPrimaryAsset = function () {
        var primaryAssetPath = this.project.getNameVariations().primaryAssetPath;
        return path.normalize(this.relpath) === primaryAssetPath;
    };
    Asset.prototype.isDefaultIllustratorAssetPath = function () {
        var defaultIllustratorAssetPath = this.project.getNameVariations().defaultIllustratorAssetPath;
        return path.normalize(this.relpath) === defaultIllustratorAssetPath;
    };
    Asset.prototype.isSlice = function () {
        return !!this.relpath.match(SLICES_REGEX);
    };
    Asset.prototype.isArtboard = function () {
        return !!this.relpath.match(ARTBOARDS_REGEX);
    };
    Asset.prototype.isGroup = function () {
        return !!this.relpath.match(GROUPS_REGEX);
    };
    Asset.prototype.isFrame = function () {
        return !!this.relpath.match(FRAMES_REGEX);
    };
    Asset.prototype.isPhony = function () {
        return this.relpath.includes(PHONY_FIGMA_FILE);
    };
    Asset.prototype.isPhonyOrOnlyHasPhonyChildrens = function () {
        var children = this.getChildAssets();
        return this.isPhony() || (children.length === 1 && children[0].isPhony());
    };
    Asset.prototype.unshiftFolderAsset = function (folderAsset) {
        var foundAmongChildren = this.children.indexOf(folderAsset) !== -1;
        if (folderAsset && !foundAmongChildren) {
            this.children.unshift(folderAsset);
        }
    };
    Asset.prototype.dump = function () {
        var str = "".concat(this.relpath);
        this.children.forEach(function (child) {
            var sublevel = child.dump();
            str += "\n  ".concat(sublevel.split('\n').join('\n  '));
        });
        return str;
    };
    return Asset;
}(BaseModel));
Asset.DEFAULT_OPTIONS = {
    required: {
        uid: true,
        type: true,
        kind: true,
        project: true,
        relpath: true,
        displayName: true,
        children: true,
        dtModified: true,
    },
};
BaseModel.extend(Asset);
Asset.TYPES = {
    CONTAINER: 'container',
    FILE: 'file',
    HACKY_MESSAGE: 'hacky_message',
};
Asset.KINDS = {
    FOLDER: 'folder',
    SKETCH: 'sketch',
    FIGMA: 'figma',
    ILLUSTRATOR: 'ai',
    IMAGE: 'image',
    FONT: 'font',
    VECTOR: 'vector',
    COMPONENT: 'component',
    OTHER: 'other',
    HACKY_MESSAGE: 'hacky_message',
};
Asset.PROXIMITIES = {
    LOCAL: 'local',
    REMOTE: 'remote',
};
Asset.ingestAssets = function (project, dict) {
    Asset.purge();
    var componentFolderAsset = Asset.upsert({
        uid: path.join(project.getFolder(), 'code'),
        type: Asset.TYPES.CONTAINER,
        kind: Asset.KINDS.FOLDER,
        proximity: Asset.PROXIMITIES.LOCAL,
        project: project,
        relpath: 'code',
        displayName: 'Components',
        children: [],
        dtModified: Date.now(),
    });
    var designFolderAsset = Asset.upsert({
        uid: path.join(project.getFolder(), 'designs'),
        type: Asset.TYPES.CONTAINER,
        kind: Asset.KINDS.FOLDER,
        proximity: Asset.PROXIMITIES.LOCAL,
        project: project,
        relpath: 'designs',
        displayName: 'Designs',
        children: [
        // The artboardsFolderAsset and slicesFolderAsset will live at the top, if needed
        ],
        dtModified: Date.now(),
    });
    var rootAssets = [designFolderAsset];
    rootAssets.unshift(componentFolderAsset);
    for (var relpath in dict) {
        var extname = path.extname(relpath).toLowerCase();
        if (isMac() && extname === '.sketch') {
            designFolderAsset.addSketchAsset(relpath, dict);
        }
        else if (extname === '.ai') {
            designFolderAsset.addIllustratorAsset(relpath, dict);
        }
        else if (extname === '.svg') {
            // Skip any Pages that may have been previously exported by Sketchtool
            // Our workflow only deals with Artboards/Slices, so that's all we display to reduce conceptual overhead
            if (relpath.match(PAGES_REGEX)) {
                continue;
            }
            var svgAsset = Asset.upsert({
                uid: path.join(project.getFolder(), relpath),
                type: Asset.TYPES.FILE,
                kind: Asset.KINDS.VECTOR,
                proximity: Asset.PROXIMITIES.LOCAL,
                project: project,
                relpath: relpath,
                displayName: path.basename(relpath, extname),
                children: [],
                dtModified: dict[relpath].dtModified,
            });
            var _a = svgAsset.getAssetInfo(), generator = _a.generator, generatorRelpath = _a.generatorRelpath;
            switch (generator) {
                case 'sketch':
                    var sketchAsset = designFolderAsset.addSketchAsset(generatorRelpath, dict);
                    sketchAsset.addSketchChild(svgAsset);
                    break;
                case 'figma':
                    var figmaAsset = designFolderAsset.addFigmaAsset(generatorRelpath);
                    if (figmaAsset) {
                        figmaAsset.addFigmaChild(svgAsset);
                    }
                    break;
                case 'ai':
                    var illustratorAsset = designFolderAsset.addIllustratorAsset(generatorRelpath, dict);
                    illustratorAsset.addIllustratorChild(svgAsset);
                    break;
                default:
                    designFolderAsset.insertChild(svgAsset);
            }
        }
        else if (path.basename(relpath) === 'code.js') { // Looks like a component
            var pathParts = relpath.split(path.sep);
            var namePart = pathParts[1];
            // Since the Main component can't be instantiated, we don't show it in the library
            if (namePart !== MAIN_COMPONENT_NAME) {
                componentFolderAsset.insertChild(Asset.upsert({
                    uid: path.join(project.getFolder(), relpath),
                    type: Asset.TYPES.FILE,
                    kind: Asset.KINDS.COMPONENT,
                    proximity: Asset.PROXIMITIES.LOCAL,
                    project: project,
                    relpath: relpath,
                    displayName: toTitleCase(namePart),
                    children: [],
                    dtModified: dict[relpath].dtModified,
                }));
            }
            componentFolderAsset.children = sortedChildrenOfComponentFolderAsset(componentFolderAsset);
        }
        else if (IMAGE_ASSET_EXTNAMES[extname] &&
            experimentIsEnabled(Experiment.AllowBitmapImages)) {
            var imageAsset = Asset.upsert({
                uid: path.join(project.getFolder(), relpath),
                type: Asset.TYPES.FILE,
                kind: Asset.KINDS.IMAGE,
                proximity: Asset.PROXIMITIES.LOCAL,
                project: project,
                relpath: relpath,
                displayName: path.basename(relpath, extname),
                children: [],
                dtModified: dict[relpath].dtModified,
            });
            designFolderAsset.insertChild(imageAsset);
        }
    }
    return rootAssets;
};
var sortedChildrenOfComponentFolderAsset = function (asset) {
    var main;
    var controls = [];
    var components = [];
    asset.children.forEach(function (child) {
        if (child.isControl) {
            controls.push(child);
        }
        else {
            if (child.displayName === 'Main') {
                main = child;
            }
            else {
                components.push(child);
            }
        }
    });
    // In case we don't find main on the first run, which can happen sometimes
    var out = [];
    if (main) {
        out.push(main);
    }
    return out.concat(sortAssetsAlpha(components)).concat(sortAssetsAlpha(controls));
};
var sortAssetsAlpha = function (assets) {
    return assets.sort(function (a, b) {
        if (a.displayName < b.displayName) {
            return -1;
        }
        if (a.displayName > b.displayName) {
            return 1;
        }
        return 0;
    });
};
/*
 * Checks if the event provided is dealing with files
 * dropped from the user file system. We can safely rely
 * on the 'Files' data transfer type to identify this.
 */
Asset.isInternalDrop = function (dropEvent) {
    return dropEvent && dropEvent.dataTransfer && dropEvent.dataTransfer.types.indexOf('Files') === -1;
};
/*
 * Hacky way to check if a file is a Sketch file. We have to
 * rely on this because Sketch files doesn't have a `file.type`
 */
Asset.isSketchFile = function (fileFromDropEvent) {
    var extname = path.extname(fileFromDropEvent.getAsFile().name).toLowerCase();
    return extname === '.sketch';
};
Asset.isValidFile = function (fileFromDropEvent) {
    var file = fileFromDropEvent.getAsFile();
    if (!file) {
        return false;
    }
    var abspath = file.name;
    return (fileFromDropEvent.type === 'image/svg+xml' ||
        Asset.isSketchFile(fileFromDropEvent) ||
        Asset.isDesignAsset(abspath));
};
Asset.preventDefaultDrag = function (dropEvent) {
    if (Asset.isInternalDrop(dropEvent)) {
        return null;
    }
    return dropEvent.preventDefault();
};
var IMAGE_ASSET_EXTNAMES = {
    '.png': true,
    '.jpg': true,
    '.jpeg': true,
    '.gif': true,
};
Asset.isImage = function (filepath) {
    var extname = path.extname(filepath).toLowerCase();
    return IMAGE_ASSET_EXTNAMES[extname];
};
Asset.isDesignAsset = function (abspath) {
    var extname = path.extname(abspath).toLowerCase();
    return (Sketch.isSketchFile(abspath) ||
        Illustrator.isIllustratorFile(abspath) ||
        extname === '.svg' ||
        Asset.isImage(abspath));
};
module.exports = Asset;
var Template = require('./Template');
//# sourceMappingURL=Asset.js.map