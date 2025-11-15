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
var logger = require('./../utils/LoggerInstance');
var BaseModel = require('./BaseModel');
var _a = require('./MathUtils'), rounded = _a.rounded, transformFourVectorByMatrix = _a.transformFourVectorByMatrix, basicallyEquals = _a.basicallyEquals;
var TransformCache = require('./TransformCache');
var Layout3D = require('@haiku/core/lib/Layout3D').default;
var HaikuElement = require('@haiku/core/lib/HaikuElement').default;
var composedTransformsToTimelineProperties = require('haiku-common/lib/layout/composedTransformsToTimelineProperties').default;
var invertMatrix = require('haiku-vendor-legacy/lib/gl-mat4/invert').default;
var _b = require('haiku-common/lib/experiments'), Experiment = _b.Experiment, experimentIsEnabled = _b.experimentIsEnabled;
var Figma = require('./Figma').Figma;
var Sketch = require('./Sketch');
var Illustrator = require('./Illustrator');
var lodash = require('lodash');
var PI_OVER_12 = Math.PI / 12;
var isNumeric = function (n) { return !isNaN(parseFloat(n)) && isFinite(n); };
var forceNumeric = function (n) { return (isNaN(n) || !isFinite(n)) ? 0 : n; };
var HAIKU_SOURCE_ATTRIBUTE = 'haiku-source';
var HAIKU_TITLE_ATTRIBUTE = 'haiku-title';
var SNAP_THRESHOLD = 10; // px, world-space (i.e. will get bigger/smaller with zoom)
var SNAP_EPSILON = 0.025;
/**
 * @class ElementSelectionProxy
 * @description
 *   Represents a set of 0 or more Element instances, providing a singular
 *   way to transform an edit them together, for times when said operations
 *   need to be aware of the entire set.
 */
var ElementSelectionProxy = /** @class */ (function (_super) {
    __extends(ElementSelectionProxy, _super);
    function ElementSelectionProxy(props, opts) {
        var _this = _super.call(this, props, opts) || this;
        if (!Array.isArray(_this.selection)) {
            throw new Error('ElementSelectionProxy selection must be an array');
        }
        // When representing multiple elements, we apply changes to our proxy properties
        _this.reinitializeLayout();
        _this.cacheOrigins();
        // Allows transforms to be recalled on demand, e.g. during Alt+drag
        _this.transformCache = new TransformCache(_this);
        _this.initializeRotationSnap();
        return _this;
    }
    ElementSelectionProxy.prototype.reinitializeLayout = function () {
        var _this = this;
        this._proxyBoxPoints = [];
        this._proxyProperties = {};
        Object.assign(this._proxyProperties, ElementSelectionProxy.DEFAULT_PROPERTY_VALUES);
        if (!this.hasAnythingInSelection()) {
            return;
        }
        var elements = this.selection.filter(function (element) { return !!element.getLiveRenderedNode(); });
        // After ungrouping, the live rendered node of the <group> won't be available,
        // thus no bounding points to compute, thus we should early return.
        if (elements.length < 1) {
            return;
        }
        // If we're dealing with just a single element, we need to to use its points and
        // layout spec directly so that the transform control box fits to its actual shape.
        if (elements.length === 1) {
            // It's assumed that this list of points is *not* transformed here but downstream
            // as the return value of this.getBoxPointsTransformed
            this._proxyBoxPoints = elements[0].getBoundingBoxPoints().map(function (p) { return p; });
            Object.assign(this._proxyProperties, Property.layoutSpecAsProperties(elements[0].getLayoutSpec()), {
                'sizeAbsolute.x': Math.abs(this._proxyBoxPoints[0].x - this._proxyBoxPoints[8].x),
                'sizeAbsolute.y': Math.abs(this._proxyBoxPoints[0].y - this._proxyBoxPoints[8].y),
            });
            return;
        }
        var boxPoints = HaikuElement.getBoundingBoxPoints(elements.map(function (element) { return element.getBoxPointsTransformed(); }).reduce(function (accumulator, boxPoints) {
            accumulator.push.apply(accumulator, boxPoints);
            return accumulator;
        }, []));
        var xOffset = boxPoints[0].x;
        var yOffset = boxPoints[0].y;
        boxPoints.forEach(function (_a) {
            var x = _a.x, y = _a.y;
            _this._proxyBoxPoints.push({ x: x - xOffset, y: y - yOffset, z: 0 });
        });
        var width = Math.abs(boxPoints[0].x - boxPoints[8].x);
        var height = Math.abs(boxPoints[0].y - boxPoints[8].y);
        Object.assign(this._proxyProperties, {
            'sizeAbsolute.x': width,
            'sizeAbsolute.y': height,
            'translation.x': boxPoints[0].x + width * ElementSelectionProxy.DEFAULT_PROPERTY_VALUES['origin.x'],
            'translation.y': boxPoints[0].y + height * ElementSelectionProxy.DEFAULT_PROPERTY_VALUES['origin.y'],
        });
    };
    ElementSelectionProxy.prototype.initializeRotationSnap = function () {
        this.rotationSnapOffset = null;
        this.rotationSnapStrategy = null;
    };
    ElementSelectionProxy.prototype.hasAnythingInSelection = function () {
        return this.selection.length > 0;
    };
    ElementSelectionProxy.prototype.hasAnythingInSelectionButNotArtboard = function () {
        return (this.hasAnythingInSelection() &&
            !this.doesSelectionContainArtboard());
    };
    ElementSelectionProxy.prototype.hasMultipleInSelection = function () {
        return this.selection.length > 1;
    };
    ElementSelectionProxy.prototype.hasNothingInSelection = function () {
        return !this.hasAnythingInSelection();
    };
    ElementSelectionProxy.prototype.doesSelectionContainArtboard = function () {
        return !!this.getArtboardElement();
    };
    ElementSelectionProxy.prototype.getArtboardElement = function () {
        return this.selection.filter(function (element) {
            return element.isRootElement();
        })[0];
    };
    ElementSelectionProxy.prototype.doesManageSingleElement = function () {
        return this.selection.length === 1;
    };
    ElementSelectionProxy.prototype.canRotate = function () {
        return !this.doesSelectionContainArtboard();
    };
    ElementSelectionProxy.prototype.canControlHandles = function () {
        return this.hasAnythingInSelection() && (this.doesManageSingleElement() || experimentIsEnabled(Experiment.AdvancedMultiTransform));
    };
    ElementSelectionProxy.prototype.pushCachedTransform = function (key) {
        this.transformCache.set(key);
        this.selection.forEach(function (element) {
            element.transformCache.set(key);
        });
    };
    // very similar to pushCachedTransform, but does it for all selected elements,
    // doesn't keep a stack, and only tracks origins rather than full transforms
    ElementSelectionProxy.prototype.cacheOrigins = function () {
        this._originCache = this.selection.map(function (elem) {
            return elem.getOriginTransformed();
        });
        this._originCache.groupOrigin = this.getOriginTransformed();
    };
    ElementSelectionProxy.prototype.isSingleComponentSelected = function () {
        return this.selection.length === 1 &&
            this.selection[0] &&
            this.selection[0].isComponent();
    };
    ElementSelectionProxy.prototype.canEditComponentFromSelection = function () {
        return this.isSingleComponentSelected() && this.selection[0].isLocalComponent();
    };
    ElementSelectionProxy.prototype.getSourcePath = function () {
        if (!this.selection) {
            return;
        }
        if (!this.selection[0]) {
            return;
        }
        var node = this.selection[0].getStaticTemplateNode();
        return (node &&
            node.attributes &&
            node.attributes[HAIKU_SOURCE_ATTRIBUTE]);
    };
    ElementSelectionProxy.prototype.isSelectionFinderOpenable = function () {
        var sourcePath = this.getSourcePath();
        if (!sourcePath) {
            return false;
        }
    };
    ElementSelectionProxy.prototype.getAbspath = function () {
        var folder = this.component.project.getFolder();
        if (this.isSelectionSketchEditable()) {
            return path.join(folder, this.getSourcePath(), '..', '..');
        }
        if (this.canEditComponentFromSelection()) {
            var sourcePath = this.getSourcePath();
            var componentFolder = this.component.getSceneCodeFolder();
            var targetPath = path.resolve(componentFolder, sourcePath);
            return path.dirname(targetPath);
        }
        return folder;
    };
    ElementSelectionProxy.prototype.isSelectionSketchEditable = function () {
        var sourcePath = this.getSourcePath();
        return !!(sourcePath &&
            Sketch.isSketchFolder(sourcePath));
    };
    ElementSelectionProxy.prototype.getSketchAssetPath = function () {
        var sourcePath = this.getSourcePath();
        return (sourcePath &&
            sourcePath.split(/\.sketch\.contents/)[0].concat('.sketch'));
    };
    ElementSelectionProxy.prototype.isSelectionFigmaEditable = function () {
        var sourcePath = this.getSourcePath();
        return !!(sourcePath &&
            Figma.isFigmaFolder(sourcePath));
    };
    ElementSelectionProxy.prototype.getFigmaAssetPath = function () {
        var sourcePath = this.getSourcePath();
        return (sourcePath &&
            sourcePath.split(/\.figma\.contents/)[0].concat('.figma'));
    };
    ElementSelectionProxy.prototype.getFigmaAssetLink = function () {
        return Figma.buildFigmaLinkFromPath(this.getFigmaAssetPath());
    };
    ElementSelectionProxy.prototype.isSelectionIllustratorEditable = function () {
        var sourcePath = this.getSourcePath();
        return !!(sourcePath &&
            Illustrator.isIllustratorFolder(sourcePath));
    };
    ElementSelectionProxy.prototype.getIllustratorAssetPath = function () {
        var sourcePath = this.getSourcePath();
        return (sourcePath &&
            sourcePath.split(/\.ai\.contents/)[0].concat('.ai'));
    };
    ElementSelectionProxy.prototype.canCut = function () {
        return this.hasAnythingInSelection() && !this.doesSelectionContainArtboard();
    };
    ElementSelectionProxy.prototype.canCopy = function () {
        return this.hasAnythingInSelection() && !this.doesSelectionContainArtboard();
    };
    ElementSelectionProxy.prototype.canPaste = function () {
        // TODO: How can we determine whether we have a pasteable ready?
        return this.selection.length < 1;
    };
    ElementSelectionProxy.prototype.canDelete = function () {
        return this.hasAnythingInSelection() && !this.doesSelectionContainArtboard();
    };
    ElementSelectionProxy.prototype.canBringForward = function () {
        return (this.doesManageSingleElement() &&
            !this.doesSelectionContainArtboard() &&
            !this.selection[0].isAtFront());
    };
    ElementSelectionProxy.prototype.bringForward = function () {
        return this.selection[0].bringForward();
    };
    ElementSelectionProxy.prototype.canSendBackward = function () {
        return (this.doesManageSingleElement() &&
            !this.doesSelectionContainArtboard() &&
            !this.selection[0].isAtBack());
    };
    ElementSelectionProxy.prototype.sendBackward = function () {
        return this.selection[0].sendBackward();
    };
    ElementSelectionProxy.prototype.canBringToFront = function () {
        return (this.doesManageSingleElement() &&
            !this.doesSelectionContainArtboard() &&
            !this.selection[0].isAtFront());
    };
    ElementSelectionProxy.prototype.bringToFront = function () {
        return this.selection[0].bringToFront();
    };
    ElementSelectionProxy.prototype.canSendToBack = function () {
        return (this.doesManageSingleElement() &&
            !this.doesSelectionContainArtboard() &&
            !this.selection[0].isAtBack());
    };
    ElementSelectionProxy.prototype.sendToBack = function () {
        return this.selection[0].sendToBack();
    };
    ElementSelectionProxy.prototype.canGroup = function () {
        return (!this.doesSelectionContainArtboard() &&
            !this.doesManageSingleElement());
    };
    ElementSelectionProxy.prototype.group = function (metadata) {
        var _a;
        if (!this.hasAnythingInSelection()) {
            return;
        }
        var componentIds = this.selection.map(function (element) {
            return element.getComponentId();
        });
        // Re-normalize scale to 1 to simplify the upcoming math, but give our incoming group the same origin and rotation
        // as its ElementSelectionProxy. This allows us to keep visual continuity between onstage transforms before and
        // after grouping.
        this.reset();
        var computedLayout = this.getComputedLayout();
        var attributes = (_a = {
                width: computedLayout.size.x,
                height: computedLayout.size.y
            },
            _a[HAIKU_SOURCE_ATTRIBUTE] = '<group>',
            _a[HAIKU_TITLE_ATTRIBUTE] = this.component.nextSuggestedGroupName,
            _a['origin.x'] = computedLayout.origin.x,
            _a['origin.y'] = computedLayout.origin.y,
            _a['rotation.z'] = computedLayout.rotation.z,
            _a);
        // The new top-level object that will host the groupees. We can use the top-left box point of the selection proxy to
        // determine the correct translation offset of a new, non-virtual bounding box. To avoid recalculating the layouts
        // of inner elements, we wrap an additional inner div providing orientation/position offsets. Instantiation of this
        // mana in bytecode will transcribe these explicit transforms into the declarative layout system.
        var boxPoint = this.getBoxPointsTransformed()[0];
        // This shim layout has the effect of first reversing our rotation, then translating the top-left box point up to
        // (0, 0) in the parent coordinate system. In 2D, we're basically producing this matrix:
        // [ 1 0 -x ]   [ cos(-z)  -sin(-z)  0 ]
        // [ 0 1 -y ] * [ sin(-z)   cos(-z)  0 ]
        // [ 0 0  1 ]   [       0         0  1 ]
        var shimLayout = Layout3D.createLayoutSpec();
        shimLayout.rotation.z = -computedLayout.rotation.z;
        shimLayout.origin = computedLayout.origin;
        var shimMatrix = Layout3D.computeMatrix(shimLayout, computedLayout.size);
        shimMatrix[12] = -(boxPoint.x * shimMatrix[0] + boxPoint.y * shimMatrix[4]);
        shimMatrix[13] = -(boxPoint.x * shimMatrix[1] + boxPoint.y * shimMatrix[5]);
        var groupMana = {
            elementName: 'div',
            attributes: attributes,
            children: [{
                    elementName: 'div',
                    attributes: {
                        transform: "matrix3d(".concat(shimMatrix.join(','), ")"),
                        'origin.x': 0,
                        'origin.y': 0,
                        style: {
                            pointerEvents: 'none',
                        },
                        children: [],
                    },
                }],
        };
        return this.component.groupElements(componentIds, groupMana, 
        // The ElementSelectionProxy origin is the correct `coords` for the new group, since we kept the origin used
        // during on-stage transformation.
        this.getOriginTransformed(), metadata, function () { });
    };
    ElementSelectionProxy.prototype.canUngroup = function () {
        return (!this.doesSelectionContainArtboard() &&
            this.doesManageSingleElement() &&
            !this.selection[0].isComponent() && // components are treated as singletons
            this.selection[0].doesContainUngroupableContent());
    };
    ElementSelectionProxy.prototype.ungroup = function (metadata) {
        return this.selection[0].ungroup(metadata);
    };
    ElementSelectionProxy.prototype.canCopySVG = function () {
        return this.doesManageSingleElement();
    };
    ElementSelectionProxy.prototype.copySVG = function () {
        return this.selection[0].toXMLString();
    };
    ElementSelectionProxy.prototype.canHTMLSnapshot = function () {
        return true;
    };
    ElementSelectionProxy.prototype.getSingleComponentElement = function () {
        return this.selection[0];
    };
    ElementSelectionProxy.prototype.getSingleComponentElementRelpath = function () {
        return this.selection[0].getAttribute(HAIKU_SOURCE_ATTRIBUTE);
    };
    ElementSelectionProxy.prototype.getConglomerateTranslation = function () {
        var points = this.getBoundingBoxPoints();
        return points[0];
    };
    ElementSelectionProxy.prototype.getConglomerateSize = function () {
        var points = this.getBoundingBoxPoints();
        return {
            x: points[2].x - points[0].x,
            y: points[6].y - points[0].y,
        };
    };
    ElementSelectionProxy.prototype.getBoundingBoxPoints = function () {
        return HaikuElement.getBoundingBoxPoints(this.selection.map(function (element) { return element.getBoxPointsTransformed(); }).reduce(function (accumulator, boxPoints) {
            accumulator.push.apply(accumulator, boxPoints);
            return accumulator;
        }, []));
    };
    ElementSelectionProxy.prototype.getOriginTransformed = function () {
        var _this = this;
        return this.cache.fetch('getOriginTransformed', function () {
            var layout = _this.getComputedLayout();
            return HaikuElement.transformPointInPlace({
                x: layout.size.x * layout.origin.x,
                y: layout.size.y * layout.origin.y,
                z: layout.size.z * layout.origin.z,
            }, layout.matrix);
        });
    };
    // returns the box points of the base element, without transform applied
    ElementSelectionProxy.prototype.getBoxPointsCompletelyNotTransformed = function () {
        var layout = this.getComputedLayout();
        var w = layout.size.x;
        var h = layout.size.y;
        return [
            { x: 0, y: 0, z: 0 }, { x: w / 2, y: 0, z: 0 }, { x: w, y: 0, z: 0 },
            { x: 0, y: h / 2, z: 0 }, { x: w / 2, y: h / 2, z: 0 }, { x: w, y: h / 2, z: 0 },
            { x: 0, y: h, z: 0 }, { x: w / 2, y: h, z: 0 }, { x: w, y: h, z: 0 },
        ];
    };
    ElementSelectionProxy.prototype.getLayoutSpec = function () {
        // Important: in the case we're we have a single element selected, we ensure correctness of the box placement
        // by applying all the properties affecting layout.
        return {
            shown: true,
            opacity: 1.0,
            sizeMode: { x: 1, y: 1, z: 1 },
            sizeProportional: { x: 1, y: 1, z: 1 },
            sizeDifferential: { x: 0, y: 0, z: 0 },
            offset: {
                x: this.computePropertyValue('offset.x'),
                y: this.computePropertyValue('offset.y'),
                z: this.computePropertyValue('offset.z'),
            },
            origin: {
                x: this.computePropertyValue('origin.x'),
                y: this.computePropertyValue('origin.y'),
                z: this.computePropertyValue('origin.z'),
            },
            translation: {
                x: this.computePropertyValue('translation.x'),
                y: this.computePropertyValue('translation.y'),
                z: this.computePropertyValue('translation.z'),
            },
            shear: {
                xy: this.computePropertyValue('shear.xy'),
                xz: this.computePropertyValue('shear.xz'),
                yz: this.computePropertyValue('shear.yz'),
            },
            rotation: {
                x: this.computePropertyValue('rotation.x'),
                y: this.computePropertyValue('rotation.y'),
                z: this.computePropertyValue('rotation.z'),
            },
            scale: {
                x: this.computePropertyValue('scale.x'),
                y: this.computePropertyValue('scale.y'),
                z: 1,
            },
            sizeAbsolute: {
                x: this.computePropertyValue('sizeAbsolute.x'),
                y: this.computePropertyValue('sizeAbsolute.y'),
                z: this.computePropertyValue('sizeAbsolute.z'),
            },
        };
    };
    ElementSelectionProxy.prototype.isAutoSizeX = function () {
        if (this.hasNothingInSelection() || this.hasMultipleInSelection()) {
            return false;
        }
        // When displaying transform control lines, indicate the mode of the wrapee not wrapper
        if (this.selection[0].isComponent()) {
            var wrapper = this.selection[0].getHaikuElement();
            var node = wrapper.memory && wrapper.memory.children[0];
            if (node && node.layout) {
                return typeof node.layout.sizeAbsolute.x !== 'number';
            }
        }
        return this.selection[0].isAutoSizeX();
    };
    ElementSelectionProxy.prototype.isAutoSizeY = function () {
        if (this.hasNothingInSelection() || this.hasMultipleInSelection()) {
            return false;
        }
        // When displaying transform control lines, indicate the mode of the wrapee not wrapper
        if (this.selection[0].isComponent()) {
            var wrapper = this.selection[0].getHaikuElement();
            var node = wrapper.memory && wrapper.memory.children[0];
            if (node && node.layout) {
                return typeof node.layout.sizeAbsolute.y !== 'number';
            }
        }
        return this.selection[0].isAutoSizeY();
    };
    ElementSelectionProxy.prototype.getComputedLayout = function () {
        var _this = this;
        return this.cache.fetch('getComputedLayout', function () {
            var _a = _this.component.getContextSize(), width = _a.width, height = _a.height;
            var bounds = {
                left: null,
                top: null,
                right: null,
                bottom: null,
                front: null,
                back: null,
            };
            if (_this.doesManageSingleElement() && !_this.doesSelectionContainArtboard()) {
                bounds = _this.selection[0].parent.getHaikuElement().computeContentBounds();
            }
            return HaikuElement.computeLayout({
                layout: _this.getLayoutSpec(),
            }, {
                layout: {
                    computed: {
                        bounds: bounds,
                        matrix: Layout3D.createMatrix(),
                        size: {
                            x: width,
                            y: height,
                            z: 0,
                        },
                    },
                },
            });
        });
    };
    ElementSelectionProxy.prototype.getBoxPointsTransformed = function () {
        var _this = this;
        return this.cache.fetch('getBoxPointsTransformed', function () {
            var points = _this._proxyBoxPoints.map(function (point) { return Object.assign({}, point); });
            return HaikuElement.transformPointsInPlace(points, _this.getComputedLayout().matrix);
        });
    };
    ElementSelectionProxy.prototype.getControlsPosition = function (basisPointIndex, xOffset, yOffset) {
        var _this = this;
        return this.cache.fetch('getControlsPosition', function () {
            var layout = _this.getComputedLayout();
            var orthonormalBasisMatrix = Layout3D.computeOrthonormalBasisMatrix(layout.rotation, layout.shear);
            var offset = {
                x: xOffset * Math.sign(layout.scale.x),
                y: yOffset * Math.sign(layout.scale.y),
                z: 0,
            };
            HaikuElement.transformPointInPlace(offset, orthonormalBasisMatrix);
            var basisPoint = _this.getBoxPointsTransformed()[basisPointIndex];
            return {
                x: basisPoint.x + offset.x,
                y: basisPoint.y + offset.y,
                z: basisPoint.z,
            };
        });
    };
    ElementSelectionProxy.prototype.getBoundingClientRect = function () {
        var points = this.getBoxPointsTransformed();
        // tslint:disable-next-line:one-variable-per-declaration
        var left, right, top, bottom, width, height;
        if (!points || !points.length) {
            // It seems that sometimes proxy is given an empty set of elements to drag (?)
            // so `getBoxPointsTransformed` sensibly returns an empty array.
            // Unfortunately, that crashes the UI.
            // This provides a stub, non-UI-breaking bbox.
            left = -21;
            right = -20;
            top = -21;
            bottom = -20;
            width = 1;
            height = 1;
        }
        else {
            left = Math.min(points[0].x, points[2].x, points[6].x, points[8].x);
            right = Math.max(points[0].x, points[2].x, points[6].x, points[8].x);
            top = Math.min(points[0].y, points[2].y, points[6].y, points[8].y);
            bottom = Math.max(points[0].y, points[2].y, points[6].y, points[8].y);
            width = Math.abs(left - right);
            height = Math.abs(bottom - top);
        }
        return {
            left: left,
            right: right,
            top: top,
            bottom: bottom,
            width: width,
            height: height,
        };
    };
    ElementSelectionProxy.prototype.getElement = function () {
        return this.selection[0];
    };
    ElementSelectionProxy.prototype.computePropertyValue = function (key) {
        return this._proxyProperties[key];
    };
    ElementSelectionProxy.prototype.applyPropertyValue = function (key, value) {
        this._proxyProperties[key] = value;
        this.clearAllRelatedCaches();
    };
    ElementSelectionProxy.prototype.applyPropertyDelta = function (key, delta) {
        this.applyPropertyValue(key, this._proxyProperties[key] + delta);
    };
    ElementSelectionProxy.prototype.reset = function () {
        var layout = this.getComputedLayout();
        this.applyPropertyValue('sizeAbsolute.x', Math.abs(layout.size.x * layout.scale.x));
        this.applyPropertyValue('sizeAbsolute.y', Math.abs(layout.size.y * layout.scale.y));
        this.applyPropertyValue('scale.x', 1);
        this.applyPropertyValue('scale.y', 1);
    };
    ElementSelectionProxy.prototype.handleMouseDown = function (mousePosition) {
        this._shouldCaptureMousePosition = true;
    };
    ElementSelectionProxy.prototype.handleMouseUp = function (mousePosition) {
        ElementSelectionProxy.snaps = [];
    };
    // snapDefinitions are the element-side 'snap points' (lines)
    // snapLines are the stage-side 'snap points' (lines)
    // note that snapLines will generally include snapDefinitions, so there's a filter step at the beginning
    ElementSelectionProxy.prototype.findSnapsMatchesAndBreakTies = function (snapDefinitions, snapLines) {
        var _this = this;
        var horizWinners = [];
        var vertWinners = [];
        var winningDeltaHoriz;
        var winningDeltaVert;
        snapLines.forEach(function (snap) {
            // don't snap to this element's own bounding snaplines
            var ids = _this.getComponentIds();
            if (ids.indexOf(snap.elementId) !== -1) {
                return;
            }
            snapDefinitions.forEach(function (def) {
                if (snap.direction === def.direction &&
                    def.bboxEdgePosition > snap.positionWorld - SNAP_THRESHOLD &&
                    def.bboxEdgePosition < snap.positionWorld + SNAP_THRESHOLD) {
                    var delta = Math.abs(def.bboxEdgePosition - snap.positionWorld);
                    if (snap.direction === 'HORIZONTAL' && (winningDeltaHoriz === undefined || delta < winningDeltaHoriz + SNAP_EPSILON)) {
                        winningDeltaHoriz = Math.min(delta, winningDeltaHoriz) || delta;
                        var newWinner = {
                            direction: def.direction,
                            positionWorld: snap.positionWorld,
                            bboxEdgePosition: def.bboxEdgePosition,
                            metadata: Object.assign({}, def.metadata, snap.metadata),
                        };
                        for (var i = 0; i < horizWinners.length; i++) {
                            var oldWinner = horizWinners[i];
                            var oldWinningDelta = Math.abs(oldWinner.bboxEdgePosition - oldWinner.positionWorld);
                            if (winningDeltaHoriz + SNAP_EPSILON < oldWinningDelta) {
                                horizWinners.splice(i, 1);
                                i--;
                            }
                        }
                        horizWinners.push(newWinner);
                    }
                    else if (snap.direction === 'VERTICAL' && (winningDeltaVert === undefined || delta < winningDeltaVert + SNAP_EPSILON)) {
                        winningDeltaVert = Math.min(delta, winningDeltaVert) || delta;
                        var newWinner = {
                            direction: def.direction,
                            positionWorld: snap.positionWorld,
                            bboxEdgePosition: def.bboxEdgePosition,
                            metadata: Object.assign({}, def.metadata, snap.metadata),
                        };
                        for (var j = 0; j < vertWinners.length; j++) {
                            var oldWinner = vertWinners[j];
                            var oldWinningDelta = Math.abs(oldWinner.bboxEdgePosition - oldWinner.positionWorld);
                            if (winningDeltaVert + SNAP_EPSILON < oldWinningDelta) {
                                vertWinners.splice(j, 1);
                                j--;
                            }
                        }
                        vertWinners.push(newWinner);
                    }
                }
            });
        });
        return [].concat(horizWinners, vertWinners);
    };
    ElementSelectionProxy.prototype.getBboxValueFromEdgeValue = function (bbox, xEdge, yEdge) {
        if (xEdge !== undefined) {
            if (xEdge === 0) {
                return bbox.left;
            }
            if (xEdge === 0.5) {
                return bbox.left + (bbox.width / 2);
            }
            if (xEdge === 1) {
                return bbox.right;
            }
            throw new Error('Unknown edge value', xEdge);
        }
        else {
            if (yEdge === 0) {
                return bbox.top;
            }
            if (yEdge === 0.5) {
                return bbox.top + (bbox.height / 2);
            }
            if (yEdge === 1) {
                return bbox.bottom;
            }
            throw new Error('Unknown edge value', yEdge);
        }
    };
    // Aligns selected elements along the x or y axis, either to selection bbox or to stage bbox
    // xEdge ∈ {undefined, 0, .5, .1}
    // yEdge ∈ {undefined, 0, .5, .1}
    // toStage ∈ {true, falsy}
    ElementSelectionProxy.prototype.align = function (xEdge, yEdge, toStage) {
        if (!this.selection || !this.selection.length) {
            return;
        }
        var alignBbox = {};
        if (toStage) {
            var artboard = this.component.getArtboard();
            alignBbox = {
                top: 0,
                left: 0,
                right: artboard._mountWidth,
                bottom: artboard._mountHeight,
                width: artboard._mountWidth,
                height: artboard._mountHeight,
            };
        }
        else {
            alignBbox = this.getBoundingClientRect();
        }
        var edge = (xEdge !== undefined) ? xEdge : yEdge;
        var axis = (xEdge !== undefined) ? 'x' : 'y';
        var targetValue = (axis === 'x' ? this.getBboxValueFromEdgeValue(alignBbox, edge, undefined) : this.getBboxValueFromEdgeValue(alignBbox, undefined, edge));
        var origins = this.selection.map(function (elem) {
            return elem.getOriginTransformed();
        });
        var overrides = [];
        for (var i = 0; i < this.selection.length; i++) {
            var bbox = this.selection[i].getBoundingClientRect();
            var bboxEdgePosition = (axis === 'x' ? this.getBboxValueFromEdgeValue(bbox, edge, undefined) : this.getBboxValueFromEdgeValue(bbox, undefined, edge));
            overrides[i] = overrides[i] || {};
            overrides[i][axis] = targetValue - (bboxEdgePosition - origins[i][axis]);
        }
        this.move(0, 0, overrides);
        this.reinitializeLayout();
    };
    // Distributes selected elements over the x or y axis, either to selection bbox or to stage bbox
    // xEdge ∈ {undefined, 0, .5, .1}
    // yEdge ∈ {undefined, 0, .5, .1}
    // toStage ∈ {true, falsy}
    ElementSelectionProxy.prototype.distribute = function (xEdge, yEdge, toStage) {
        var _this = this;
        if (!this.selection || this.selection.length < 2) {
            return;
        }
        var axis = (xEdge !== undefined) ? 'x' : 'y';
        // First, we'll sort the elements by the appropriate bounding edge, tracking
        // relevant data along the way
        this.selection.forEach(function (elem, i) {
            var points = elem.getBoxPointsTransformed();
            var bbox = {
                top: Math.min.apply(_this, points.map(function (p) {
                    return p.y;
                })),
                right: Math.max.apply(_this, points.map(function (p) {
                    return p.x;
                })),
                bottom: Math.max.apply(_this, points.map(function (p) {
                    return p.y;
                })),
                left: Math.min.apply(_this, points.map(function (p) {
                    return p.x;
                })),
            };
            bbox.width = bbox.right - bbox.left;
            bbox.height = bbox.bottom - bbox.top;
            elem._distributeBbox = bbox;
            elem._distributeOriginalIndex = i;
            elem._distributeBoundingEdge = (axis === 'x' ? _this.getBboxValueFromEdgeValue(elem._distributeBbox, xEdge, undefined) : _this.getBboxValueFromEdgeValue(elem._distributeBbox, undefined, yEdge));
        });
        // Execute the sort
        var elementsSortedByBoundingEdge = lodash.cloneDeep(this.selection).sort(function (elemA, elemB) {
            return elemA._distributeBoundingEdge - elemB._distributeBoundingEdge;
        });
        // Calculate & populate overrides
        var overrides = [];
        var count = elementsSortedByBoundingEdge.length;
        var origins = this.selection.map(function (elem) {
            return elem.getOriginTransformed();
        });
        var min = elementsSortedByBoundingEdge[0]._distributeBoundingEdge;
        var max = elementsSortedByBoundingEdge[count - 1]._distributeBoundingEdge;
        // Stage has special boundaries
        if (toStage) {
            var artboard = this.component.getArtboard();
            if (axis === 'x') {
                min = (this.getBboxValueFromEdgeValue(elementsSortedByBoundingEdge[0]._distributeBbox, xEdge, undefined) - elementsSortedByBoundingEdge[0]._distributeBbox.left); // origins[elementsSortedByBoundingEdge[0]._distributeOriginalIndex][axis] - elementsSortedByBoundingEdge[0]._distributeBbox.left
                max = artboard._mountWidth - (elementsSortedByBoundingEdge[count - 1]._distributeBbox.right - this.getBboxValueFromEdgeValue(elementsSortedByBoundingEdge[count - 1]._distributeBbox, xEdge, undefined));
            }
            else {
                min = (this.getBboxValueFromEdgeValue(elementsSortedByBoundingEdge[0]._distributeBbox, undefined, yEdge) - elementsSortedByBoundingEdge[0]._distributeBbox.top);
                max = artboard._mountHeight - (elementsSortedByBoundingEdge[count - 1]._distributeBbox.bottom - this.getBboxValueFromEdgeValue(elementsSortedByBoundingEdge[count - 1]._distributeBbox, undefined, yEdge));
            }
        }
        var interval = (max - min) / (count - 1);
        elementsSortedByBoundingEdge.forEach(function (elem, i) {
            var origIndex = elem._distributeOriginalIndex;
            var targetValue = min + (interval * i);
            overrides[origIndex] = overrides[origIndex] || {};
            overrides[origIndex][axis] = targetValue - (elem._distributeBoundingEdge - origins[origIndex][axis]);
        });
        this.move(0, 0, overrides);
        this.reinitializeLayout();
    };
    /**
     * @method drag
     * @description Scale, rotate, or translate the elements in the selection
     */
    ElementSelectionProxy.prototype.drag = function (dx, dy, mouseCoordsCurrent, mouseCoordsPrevious, lastMouseDownCoord, isAnythingScaling, isAnythingRotating, isOriginPanning, controlActivation, viewportTransform, globals) {
        var _this = this;
        // If nothing's selected, we have nothing to drag
        if (!this.selection || !this.selection.length) {
            return;
        }
        // 'mousetrap' for snapping
        if (this._shouldCaptureMousePosition || globals.isSpecialKeyDown() || this._lastMouseDownPosition === undefined) {
            this._lastMouseDownPosition = mouseCoordsCurrent;
            this._lastBbox = this.getBoundingClientRect();
            this._lastProxyBox = this.getBoxPointsTransformed();
            this._lastOrigin = this.getOriginTransformed();
            this._baseBoxPointsNotTransformed = this.getBoxPointsCompletelyNotTransformed();
            this._lastOrigins = this.selection.map(function (elem) {
                return elem.getOriginTransformed();
            });
            this._shouldCaptureMousePosition = false;
        }
        // track mouse positions, offsets, and original bounding boxes for snapping
        var totalDragDelta = {
            x: mouseCoordsCurrent.x - this._lastMouseDownPosition.x,
            y: mouseCoordsCurrent.y - this._lastMouseDownPosition.y,
        };
        if (isOriginPanning) {
            return this.panOrigin(dx, dy);
        }
        if (this.canControlHandles()) {
            if (isAnythingScaling) {
                if (!controlActivation.cmd) {
                    // TODO: add snapping
                    return this.scale(dx, dy, controlActivation, mouseCoordsCurrent, mouseCoordsPrevious, viewportTransform, globals);
                }
            }
            else if (isAnythingRotating) {
                if (controlActivation.cmd) {
                    // In case we got here, don't allow artboard to rotate
                    if (this.doesSelectionContainArtboard()) {
                        return;
                    }
                    return this.rotate(dx, dy, mouseCoordsCurrent, mouseCoordsPrevious, controlActivation, globals);
                }
            }
        }
        // In case we got here, don't allow artboard to move
        if (this.doesSelectionContainArtboard()) {
            return;
        }
        var artboard = this.component.getArtboard();
        // handle snapping
        // don't snap if user is holding cmd key (like Sketch)
        if (!globals.isCommandKeyDown && experimentIsEnabled(Experiment.Snapping)) {
            var bbox = void 0;
            if (this._lastBbox !== undefined) {
                bbox = (function (bbox, delta) {
                    var ret = {};
                    ret.top = bbox.top + delta.y;
                    ret.right = bbox.right + delta.x;
                    ret.bottom = bbox.bottom + delta.y;
                    ret.left = bbox.left + delta.x;
                    ret.height = ret.bottom - ret.top;
                    ret.width = ret.right - ret.left;
                    return ret;
                })(this._lastBbox, totalDragDelta);
            }
            else {
                bbox = this.getBoundingClientRect();
            }
            // TODO:
            //  - handle snapping for origin
            //  - perf pass on snapping?
            //     - perf could filter only snaps within viewport
            //     - perf could check snap lines and bounding box edges using bounding volumes,
            //       instead of checking every element linearly+
            // Snapline {
            //  direction : "HORIZONTAL"|"VERTICAL"
            //  position : Number
            //  positionWorld : Number
            //  elementId : (Number | String) (?)
            // }
            var snapLines = artboard.getSnapLinesInScreenCoords();
            // index corresponds with selected elements' indicies
            // { x : number
            //  y : number }
            var overrides_1 = [];
            var origin_1 = addVectors(this._lastOrigin, totalDragDelta);
            var origins_1 = this._lastOrigins.map(function (o) {
                return addVectors(o, totalDragDelta);
            });
            origins_1.groupOrigin = origin_1;
            // note that 'name' is really only used for readability & debugging
            var SNAP_DEFINITIONS = [
                {
                    name: 'TOP',
                    direction: 'HORIZONTAL',
                    bboxEdgePosition: bbox.top,
                },
                {
                    name: 'RIGHT',
                    direction: 'VERTICAL',
                    bboxEdgePosition: bbox.right,
                },
                {
                    name: 'BOTTOM',
                    direction: 'HORIZONTAL',
                    bboxEdgePosition: bbox.bottom,
                },
                {
                    name: 'LEFT',
                    direction: 'VERTICAL',
                    bboxEdgePosition: bbox.left,
                },
                {
                    name: 'VERTICAL_MID',
                    direction: 'VERTICAL',
                    bboxEdgePosition: (bbox.right + bbox.left) / 2,
                },
                {
                    name: 'HORIZONTAL_MID',
                    direction: 'HORIZONTAL',
                    bboxEdgePosition: (bbox.bottom + bbox.top) / 2,
                },
            ];
            var foundSnaps = this.findSnapsMatchesAndBreakTies(SNAP_DEFINITIONS, snapLines);
            // Shift-dragging affects which axis we want to snap on
            // and can use the same `overrides` mechanism
            if (globals.isShiftKeyDown) {
                var isXAxis = Math.abs(mouseCoordsCurrent.x - this._originCache.groupOrigin.x) >
                    Math.abs(mouseCoordsCurrent.y - this._originCache.groupOrigin.y);
                // only snap to the relevant axis
                if (isXAxis) {
                    foundSnaps = foundSnaps.filter(function (snap) {
                        return snap.direction === 'VERTICAL';
                    });
                    for (var i = 0; i < this.selection.length; i++) {
                        overrides_1[i] = overrides_1[i] || {};
                        overrides_1[i].y = this._originCache[i].y;
                        overrides_1.groupOrigin = overrides_1.groupOrigin || {};
                        overrides_1.groupOrigin.y = this._originCache.groupOrigin.y;
                    }
                }
                else {
                    foundSnaps = foundSnaps.filter(function (snap) {
                        return snap.direction === 'HORIZONTAL';
                    });
                    for (var j = 0; j < this.selection.length; j++) {
                        overrides_1[j] = overrides_1[j] || {};
                        overrides_1[j].x = this._originCache[j].x;
                        overrides_1.groupOrigin = overrides_1.groupOrigin || {};
                        overrides_1.groupOrigin.x = this._originCache.groupOrigin.x;
                    }
                }
            }
            foundSnaps.forEach(function (snap) {
                var whichAxis = (snap.direction === 'HORIZONTAL' ? 'y' : 'x');
                var desiredPosition = snap.positionWorld;
                _this.selection.forEach(function (elem, i) {
                    overrides_1[i] = overrides_1[i] || {};
                    overrides_1[i][whichAxis] = desiredPosition - (snap.bboxEdgePosition - origins_1[i][whichAxis]);
                });
                overrides_1.groupOrigin = overrides_1.groupOrigin || {};
                overrides_1.groupOrigin[whichAxis] = desiredPosition - (snap.bboxEdgePosition - origins_1.groupOrigin[whichAxis]);
            });
            ElementSelectionProxy.snaps = foundSnaps;
            return this.move(dx, dy, overrides_1);
        }
        return this.move(dx, dy);
    };
    ElementSelectionProxy.prototype.panOrigin = function (dx, dy) {
        // Origin panning is a position-preserving operation (in parent coordinates), requiring us to update translation to
        // match. To achieve the desired effect, first we compute the effective (x, y) translation after accounting for
        // z-rotation and scale, so the origin dot "lands" in an expected place while dragging.
        var _this = this;
        // We don't want to mutate around with z origin or translation when we have a 3D rotated object, so it's simpler to
        // start with the scaled basis matrix S and solve directly:
        //   S * [ deltaX; deltaY; 0, 1] = [ dx, dy, ?, 1 ]
        // We don't particularly care what the value of `?` is here, so this resolves to a system of linear equations in two
        // unknowns:
        //   [ S[0] S[4] ] [ deltaX ] = [ dx ]
        //   [ S[1] S[5] ] [ deltaY ]   [ dy ]
        // We can solve this directly.
        var computedLayout = this.getComputedLayout();
        var scaledBasisMatrix = Layout3D.computeScaledBasisMatrix(computedLayout.rotation, computedLayout.scale, computedLayout.shear);
        var determinant = scaledBasisMatrix[0] * scaledBasisMatrix[5] - scaledBasisMatrix[1] * scaledBasisMatrix[4];
        var deltaX = (scaledBasisMatrix[5] * dx - scaledBasisMatrix[4] * dy) / determinant;
        var deltaY = (-scaledBasisMatrix[1] * dx + scaledBasisMatrix[0] * dy) / determinant;
        var deltaOriginX = rounded(forceNumeric(deltaX / computedLayout.size.x));
        var deltaOriginY = rounded(forceNumeric(deltaY / computedLayout.size.y));
        var layoutMatrix = computedLayout.matrix;
        var deltaTranslationX = layoutMatrix[0] * deltaX + layoutMatrix[4] * deltaY;
        var deltaTranslationY = layoutMatrix[1] * deltaX + layoutMatrix[5] * deltaY;
        this.applyPropertyDelta('translation.x', deltaTranslationX);
        this.applyPropertyDelta('translation.y', deltaTranslationY);
        this.applyPropertyDelta('origin.x', deltaOriginX);
        this.applyPropertyDelta('origin.y', deltaOriginY);
        if (!this.doesManageSingleElement()) {
            return;
        }
        // Now push the origin down to our selected element to match the user's expectation that this change
        // is kept.
        var targetElement = this.selection[0];
        var propertyGroupDelta = {
            'translation.x': {
                value: deltaTranslationX,
            },
            'translation.y': {
                value: deltaTranslationY,
            },
            'origin.x': {
                value: deltaOriginX,
            },
            'origin.y': {
                value: deltaOriginY,
            },
        };
        var propertyGroup = targetElement.computePropertyGroupValueFromGroupDelta(propertyGroupDelta);
        var accumulatedUpdates = {};
        ElementSelectionProxy.accumulateKeyframeUpdates(accumulatedUpdates, targetElement, this.component.getCurrentTimelineName(), this.component.getCurrentTimelineTime(), propertyGroup);
        targetElement.component.updateKeyframes(accumulatedUpdates, {}, this.component.project.getMetadata(), function () {
            _this.clearAllRelatedCaches();
        });
    };
    ElementSelectionProxy.prototype.clearAllRelatedCaches = function () {
        if (this.hasAnythingInSelection()) {
            this.cache.clear();
            this.selection.forEach(function (element) {
                element.cache.clear();
            });
        }
    };
    // overrides allow per-element absolute position overrides, useful for snapping
    ElementSelectionProxy.prototype.move = function (dx, dy, overrides) {
        var propertyGroupDelta = {};
        if (dx > 0 || dx < 0) {
            propertyGroupDelta['translation.x'] = {
                value: dx,
            };
        }
        if (dy > 0 || dy < 0) {
            propertyGroupDelta['translation.y'] = {
                value: dy,
            };
        }
        var accumulatedUpdates = {};
        this.selection.forEach(function (element, i) {
            var layoutSpec = element.getLayoutSpec();
            var propertyGroup = element.computePropertyGroupValueFromGroupDelta(propertyGroupDelta);
            if (overrides && overrides[i] && overrides[i].x !== undefined) {
                propertyGroup['translation.x'] = { value: overrides[i].x - layoutSpec.offset.x };
            }
            if (overrides && overrides[i] && overrides[i].y !== undefined) {
                propertyGroup['translation.y'] = { value: overrides[i].y - layoutSpec.offset.y };
            }
            ElementSelectionProxy.accumulateKeyframeUpdates(accumulatedUpdates, element, element.component.getCurrentTimelineName(), element.component.getCurrentTimelineTime(), propertyGroup);
        });
        this.component.updateKeyframes(accumulatedUpdates, {}, this.component.project.getMetadata(), function () { });
        if (overrides && overrides.groupOrigin && overrides.groupOrigin.x !== undefined) {
            this.applyPropertyValue('translation.x', overrides.groupOrigin.x - this.computePropertyValue('offset.x'));
        }
        else {
            this.applyPropertyDelta('translation.x', dx);
        }
        if (overrides && overrides.groupOrigin && overrides.groupOrigin.y !== undefined) {
            this.applyPropertyValue('translation.y', overrides.groupOrigin.y - this.computePropertyValue('offset.y'));
        }
        else {
            this.applyPropertyDelta('translation.y', dy);
        }
    };
    ElementSelectionProxy.prototype.getActivationPointInRadians = function (index) {
        switch (index) {
            case 5: return Math.PI * 2;
            case 8: return Math.PI / 4;
            case 7: return Math.PI / 2;
            case 6: return 3 * Math.PI / 4;
            case 3: return Math.PI;
            case 0: return 5 * Math.PI / 4;
            case 1: return 3 * Math.PI / 2;
            case 2: return 7 * Math.PI / 4;
            default:
                throw new Error('Cannot retrieve radian value for provided activation point: ' + index);
        }
    };
    ElementSelectionProxy.prototype.scale = function (dx, dy, activationPoint, mouseCoordsCurrent, mouseCoordsPrevious, viewportTransform, globals) {
        if (this.doesSelectionContainArtboard()) {
            return this.scaleArtboard(mouseCoordsCurrent, mouseCoordsPrevious, viewportTransform, activationPoint);
        }
        return this.scaleElements(mouseCoordsCurrent, mouseCoordsPrevious, activationPoint, globals);
    };
    ElementSelectionProxy.prototype.translateBoxPointsManual = function (boxPoints, delta) {
        return boxPoints.map(function (point) {
            return {
                x: point.x + delta.x,
                y: point.y + delta.y,
            };
        });
    };
    ElementSelectionProxy.prototype.scaleElements = function (mouseCoordsCurrent, mouseCoordsPrevious, activationPoint, globals) {
        var _this = this;
        var foundSnaps = [];
        var accumulatedUpdates = {};
        var baseProxyBox = Object.assign({}, this._lastProxyBox);
        // note an Object.assign({}, ...) doesn't suffice here because computeScalePropertyGroup mutates properties deeply
        var getBaseTransform = function () { return lodash.cloneDeep(_this.transformCache.get('CONTROL_ACTIVATION')); };
        var baseTransform = getBaseTransform();
        var fixedPoint = activationPoint.alt
            ? this._lastOrigin
            : ElementSelectionProxy.getFixedPointForScale(baseProxyBox, activationPoint);
        var translatedPoint = ElementSelectionProxy.getTranslatedPointForScale(baseProxyBox, activationPoint);
        var totalMouseDelta = {
            x: mouseCoordsCurrent.x - this._lastMouseDownPosition.x,
            y: mouseCoordsCurrent.y - this._lastMouseDownPosition.y,
            z: 0,
        };
        var scalePropertyGroup = ElementSelectionProxy.computeScalePropertyGroup(baseTransform, fixedPoint, translatedPoint, totalMouseDelta, activationPoint, true);
        var updatedLayout = getBaseTransform();
        updatedLayout.scale.x = scalePropertyGroup['scale.x'].value;
        updatedLayout.scale.y = scalePropertyGroup['scale.y'].value;
        updatedLayout.translation.x = scalePropertyGroup['translation.x'].value;
        updatedLayout.translation.y = scalePropertyGroup['translation.y'].value;
        var transformedPoints = lodash.cloneDeep(this._baseBoxPointsNotTransformed);
        ElementSelectionProxy.transformPointsByLayoutInPlace(transformedPoints, updatedLayout);
        // find axis-aligned bounding box; add each edge
        var axisAlignedBbox = [
            { name: 'TOP', value: Math.min.apply(this, transformedPoints.map(function (p) {
                    return p.y;
                })) },
            { name: 'RIGHT', value: Math.max.apply(this, transformedPoints.map(function (p) {
                    return p.x;
                })) },
            { name: 'BOTTOM', value: Math.max.apply(this, transformedPoints.map(function (p) {
                    return p.y;
                })) },
            { name: 'LEFT', value: Math.min.apply(this, transformedPoints.map(function (p) {
                    return p.x;
                })) },
        ];
        var transformedTranslatedPoint = transformedPoints[activationPoint.index];
        var filteredEdges = [];
        // When scaling, we want to snap to the axis-aligned bounding box of the control points, a.k.a. the "super-bounding box."
        // To complicate things though, the user expects only some of the edges of the bounding box to snap, depending on
        // which control point is being dragged and the rotation of the element.  The logic below simplifies this 'lookup'
        // based on observations of how the translated point and fixed point intersect with the axis-aligned bbox.
        var isDraggingEdge = false;
        if (activationPoint.alt) {
            // TODO:  when alt is held, we care about all bounding edges
            // BUT, the 'unusual' edges need to give a proper offset
            // for now, disable snapping when alt-scaling
        }
        else if (activationPoint.shift) {
            // TODO:  when shift is held, break ties between horiz & vert (could refactor findSnapsMatchesAndBreakTies to handle based on flag, or could do a post-pass manually)
            // for now, disable snapping when shift-scaling
        }
        else if ([1, 3, 5, 7].indexOf(activationPoint.index) > -1) {
            // When dragging an edge, check if the translated point is touching a bbox edge.  if it is,
            // we care ONLY about that edge.  If it's not, we care about the bbox edges that its two neighbor (corners) are touching.
            for (var _i = 0, axisAlignedBbox_1 = axisAlignedBbox; _i < axisAlignedBbox_1.length; _i++) {
                var edge = axisAlignedBbox_1[_i];
                var isHoriz = (edge.name === 'TOP' || edge.name === 'BOTTOM');
                if ((isHoriz && isWithinEpsilon(transformedTranslatedPoint.y, edge.value, 10)) ||
                    (!isHoriz && isWithinEpsilon(transformedTranslatedPoint.x, edge.value, 10))) {
                    filteredEdges.push(edge);
                    break;
                }
            }
            if (filteredEdges.length === 0) {
                // get neighbor points and find the edges they're touching
                isDraggingEdge = true;
                var transformedNeighborPoints_1 = ElementSelectionProxy.getNeighborPointsForScaleSnapping(transformedPoints, activationPoint);
                filteredEdges.push.apply(filteredEdges, axisAlignedBbox.filter(function (edge) {
                    var isHoriz = (edge.name === 'TOP' || edge.name === 'BOTTOM');
                    if (isHoriz && (isWithinEpsilon(transformedNeighborPoints_1[0].y, edge.value) || isWithinEpsilon(transformedNeighborPoints_1[1].y, edge.value))) {
                        return true;
                    }
                    if (!isHoriz && (isWithinEpsilon(transformedNeighborPoints_1[0].x, edge.value) || isWithinEpsilon(transformedNeighborPoints_1[1].x, edge.value))) {
                        return true;
                    }
                    return false;
                }));
            }
        }
        else {
            // TODO: Level up; when dragging a corner, we can handle adjacent corners by the following:
            // - We don't want to snap to any edges that the fixed point is touching
            // - Non 'active' corners (the ones that can still snap) have to provide an offset to the final
            //   delta-x and delta-y, as there's a trig relationship between active point's positionX and non-active-point's positionY
            // let transformedFixedPoint = activationPoint.alt
            //    ? this._lastOrigin
            //    : ElementSelectionProxy.getFixedPointForScale(transformedPoints, activationPoint)
            //
            // filteredEdges = axisAlignedBbox.filter((edge) => {
            //   const isHoriz = (edge.name === 'TOP' || edge.name === 'BOTTOM')
            //   if(isHoriz && isWithinEpsilon(transformedFixedPoint.y, edge.value)) return false
            //   if(!isHoriz && isWithinEpsilon(transformedFixedPoint.x, edge.value)) return false
            //   return true
            // })
            // Instead of the above, when dragging a corner, we only want to snap to the edge(s) that the translatedPoint is touching
            filteredEdges.push.apply(filteredEdges, axisAlignedBbox.filter(function (edge) {
                var isHoriz = (edge.name === 'TOP' || edge.name === 'BOTTOM');
                if (isHoriz && isWithinEpsilon(transformedTranslatedPoint.y, edge.value, 1)) {
                    return true;
                }
                if (!isHoriz && isWithinEpsilon(transformedTranslatedPoint.x, edge.value, 1)) {
                    return true;
                }
                return false;
            }));
        }
        var snapDefinitions = filteredEdges.map(function (edge) {
            var isHoriz = (edge.name === 'TOP' || edge.name === 'BOTTOM');
            return {
                name: edge.name,
                direction: isHoriz ? 'HORIZONTAL' : 'VERTICAL',
                bboxEdgePosition: edge.value,
                metadata: {
                    offset: edge.value - transformedTranslatedPoint[isHoriz ? 'y' : 'x'],
                    isDraggingEdge: isDraggingEdge,
                },
            };
        });
        var artboard = this.component.getArtboard();
        foundSnaps.push.apply(foundSnaps, this.findSnapsMatchesAndBreakTies(snapDefinitions, artboard.getSnapLinesInScreenCoords()));
        foundSnaps.forEach(function (snap) {
            if (snap.direction === 'HORIZONTAL') {
                totalMouseDelta.y = (snap.positionWorld - (snap.metadata.offset || 0)) - (_this._lastProxyBox[activationPoint.index].y);
                if (snap.metadata && snap.metadata.isDraggingEdge) {
                    // we know one of the deltas but must solve for the other based on our knowledge of the current
                    // rotation & the transform controls' absolute rotations.
                    var offsetRotation = _this.getActivationPointInRadians(activationPoint.index);
                    var transformRotation = updatedLayout.rotation.z;
                    var theta = (((offsetRotation + transformRotation) * 10000) % 62832) / 10000; // 'mod' by 2*pi
                    totalMouseDelta.x = (totalMouseDelta.y / Math.tan(theta)) || 0;
                }
            }
            else {
                totalMouseDelta.x = (snap.positionWorld - (snap.metadata.offset || 0)) - (_this._lastProxyBox[activationPoint.index].x);
                if (snap.metadata && snap.metadata.isDraggingEdge) {
                    var offsetRotation = _this.getActivationPointInRadians(activationPoint.index);
                    var transformRotation = updatedLayout.rotation.z;
                    var theta = (((offsetRotation + transformRotation) * 10000) % 62832) / 10000; // 'mod' by 2*pi
                    totalMouseDelta.y = (totalMouseDelta.x * Math.tan(theta)) || 0;
                }
            }
        });
        if (foundSnaps.length) {
            // Reset baseTransform
            Object.assign(baseTransform, getBaseTransform());
            scalePropertyGroup = ElementSelectionProxy.computeScalePropertyGroup(baseTransform, fixedPoint, translatedPoint, totalMouseDelta, activationPoint, true);
        }
        var matrixBeforeInverted = new Float32Array(16);
        invertMatrix(matrixBeforeInverted, baseTransform.matrix);
        var scaleX = scalePropertyGroup["scale.x"].value, scaleY = scalePropertyGroup["scale.y"].value, translationX = scalePropertyGroup["translation.x"].value, translationY = scalePropertyGroup["translation.y"].value;
        this.applyPropertyValue('scale.x', scaleX);
        this.applyPropertyValue('scale.y', scaleY);
        this.applyPropertyValue('translation.x', translationX);
        this.applyPropertyValue('translation.y', translationY);
        var matrixAfter = this.getComputedLayout().matrix;
        var shouldTick = false;
        this.selection.forEach(function (element) {
            // Use our cached transform to mitigate the possibility of rounding errors at small/weird scales.
            var layoutSpec = element.transformCache.get('CONTROL_ACTIVATION');
            if (!layoutSpec) {
                return;
            }
            // We're going to populate this object with all the necessary property values
            // to represent the scale transform.
            var propertyGroup = {};
            // This matrix represents all transformations that have occurred to the element,
            // treating the selection box as a container element.
            var finalMatrix = Layout3D.multiplyArrayOfMatrices([
                layoutSpec.originOffsetComposedMatrix,
                matrixBeforeInverted,
                matrixAfter,
            ]);
            // This converts a composition of matrices like [[1,0,0,...],...] into our own
            // transform properties like scale.x, rotation.z, and merges them into the
            // given property group object.
            composedTransformsToTimelineProperties(propertyGroup, [finalMatrix], true, element.getLayoutSpec());
            var offsetX = layoutSpec.offset.x;
            var offsetY = layoutSpec.offset.y;
            var offsetZ = layoutSpec.offset.z;
            var originX = layoutSpec.origin.x * layoutSpec.size.x;
            var originY = layoutSpec.origin.y * layoutSpec.size.y;
            var originZ = layoutSpec.origin.z * layoutSpec.size.z;
            // Ensure translation properties are defined so we can do #math with them below.
            // This is necessary when we pass explicit = false to composedTransformsToTimelineProperties like above.
            propertyGroup['translation.x'] = propertyGroup['translation.x'] || 0;
            propertyGroup['translation.y'] = propertyGroup['translation.y'] || 0;
            propertyGroup['translation.z'] = propertyGroup['translation.z'] || 0;
            propertyGroup['translation.x'] +=
                finalMatrix[0] * originX + finalMatrix[4] * originY + finalMatrix[8] * originZ - offsetX;
            propertyGroup['translation.y'] +=
                finalMatrix[1] * originX + finalMatrix[5] * originY + finalMatrix[9] * originZ - offsetY;
            propertyGroup['translation.z'] +=
                finalMatrix[2] * originX + finalMatrix[6] * originY + finalMatrix[10] * originZ - offsetZ;
            var propertyGroupNorm = Object.keys(propertyGroup).reduce(function (accumulator, property) {
                accumulator[property] = { value: propertyGroup[property] };
                return accumulator;
            }, {});
            if (experimentIsEnabled(Experiment.SizeInsteadOfScaleWhenPossible)) {
                if (element.isComponent()) {
                    var addressables = element.getComponentAddressables();
                    var baseProxyTransform = getBaseTransform();
                    if (addressables.width &&
                        addressables.width.typedef === 'number') {
                        propertyGroupNorm.width = { value: Math.abs(layoutSpec.size.x * scaleX / baseProxyTransform.scale.x) };
                        // Note: here and below, scale.x and scale.y are guaranteed to exist as properties of propertyGroup[Norm]
                        // because composedTransformsToTimelineProperties was called with explicit = true.
                        propertyGroupNorm['scale.x'] = { value: Math.sign(propertyGroup['scale.x'] || 1) };
                        shouldTick = true;
                    }
                    if (addressables.height &&
                        addressables.height.typedef === 'number') {
                        propertyGroupNorm.height = { value: Math.abs(layoutSpec.size.y * scaleY / baseProxyTransform.scale.y) };
                        propertyGroupNorm['scale.y'] = { value: Math.sign(propertyGroup['scale.y'] || 1) };
                        shouldTick = true;
                    }
                }
            }
            ElementSelectionProxy.accumulateKeyframeUpdates(accumulatedUpdates, element, element.component.getCurrentTimelineName(), element.component.getCurrentTimelineTime(), propertyGroupNorm);
        });
        this.component.updateKeyframes(accumulatedUpdates, {}, this.component.project.getMetadata(), function () {
            if (shouldTick) {
                _this.component.tick();
            }
            _this.clearAllRelatedCaches();
        });
        ElementSelectionProxy.snaps = foundSnaps;
    };
    ElementSelectionProxy.prototype.scaleArtboard = function (mouseCoordsCurrent, mouseCoordsPrevious, _a, activationPoint) {
        var _this = this;
        var zoom = _a.zoom;
        var accumulatedUpdates = {};
        var bytecode = this.component.getReifiedBytecode();
        var element = this.getArtboardElement();
        var timelineName = element.component.getCurrentTimelineName();
        var timelineTime = 0; // Lock artboard changes to time 0
        if (!bytecode.timelines[timelineName]) {
            bytecode.timelines[timelineName] = {};
        }
        if (!accumulatedUpdates[timelineName]) { // dupe accumulateKeyframeUpdates
            accumulatedUpdates[timelineName] = {};
        }
        var dx = (mouseCoordsCurrent.clientX - mouseCoordsPrevious.clientX) * 2 / zoom;
        var dy = (mouseCoordsCurrent.clientY - mouseCoordsPrevious.clientY) * 2 / zoom;
        var _b = ElementSelectionProxy.computeScaleInfoForArtboard(element, dx, dy, activationPoint), scaleX = _b["scale.x"].value, scaleY = _b["scale.y"].value, translationX = _b["translation.x"].value, translationY = _b["translation.y"].value;
        var sizeX = element.computePropertyValue('sizeAbsolute.x');
        var sizeY = element.computePropertyValue('sizeAbsolute.y');
        // If the artboard has "auto"-size designated, then resizing it has the effect of
        // switching it to numeric sizing. But in order for that to work, we first need to
        // compute the numeric size and then switch to it.
        if (typeof sizeX !== 'number' || typeof sizeY !== 'number') {
            var computedSize = element.getComputedSize();
            if (typeof sizeX !== 'number') {
                sizeX = computedSize.x;
            }
            if (typeof sizeY !== 'number') {
                sizeY = computedSize.y;
            }
        }
        var didSizeX = scaleX > 1.000001 || scaleX < 0.999999;
        var didSizeY = scaleY > 1.000001 || scaleY < 0.999999;
        if (!didSizeX && !didSizeY) {
            return;
        }
        var finalSize = {};
        // We don't want to overwrite "auto"-size unless the axis was actually changed numerically
        if (didSizeX) {
            finalSize['sizeAbsolute.x'] = {
                value: rounded(scaleX * sizeX),
            };
        }
        if (didSizeY) {
            finalSize['sizeAbsolute.y'] = {
                value: rounded(scaleY * sizeY),
            };
        }
        // Don't allow the user to reduce the artboard's scale to nothing
        if ((finalSize['sizeAbsolute.x'] && finalSize['sizeAbsolute.x'].value < 5) ||
            (finalSize['sizeAbsolute.y'] && finalSize['sizeAbsolute.y'].value < 5)) {
            return;
        }
        ElementSelectionProxy.accumulateKeyframeUpdates(accumulatedUpdates, element, timelineName, timelineTime, finalSize);
        var elementOffset = {};
        // We shouldn't bother translating elements if there was no offet along the given axis
        if (didSizeX) {
            elementOffset['translation.x'] = translationX;
        }
        if (didSizeY) {
            elementOffset['translation.y'] = translationY;
        }
        // Translate all elements on stage by the offset so the stage can be resized
        // from any side with the elements retaining their original placement
        this.component.getTopLevelElementHaikuIds().forEach(function (haikuId) {
            var selector = Template.buildHaikuIdSelector(haikuId);
            if (!accumulatedUpdates[timelineName][haikuId]) { // dupe accumulateKeyframeUpdates
                accumulatedUpdates[timelineName][haikuId] = {};
            }
            if (!bytecode.timelines[timelineName][selector]) {
                bytecode.timelines[timelineName][selector] = {};
            }
            for (var propertyName in elementOffset) {
                var offsetValue = elementOffset[propertyName];
                if (!accumulatedUpdates[timelineName][haikuId][propertyName]) { // dupe accumulateKeyframeUpdates
                    accumulatedUpdates[timelineName][haikuId][propertyName] = {};
                }
                if (!bytecode.timelines[timelineName][selector][propertyName]) {
                    bytecode.timelines[timelineName][selector][propertyName] = {};
                }
                // We must ensure the zeroth keyframe exists since some elements may end up on stage
                // without a translation.x,y value explicitly set, and we need to offset those too.
                if (!bytecode.timelines[timelineName][selector][propertyName][0]) {
                    bytecode.timelines[timelineName][selector][propertyName][0] = {};
                }
                for (var keyframeMs in bytecode.timelines[timelineName][selector][propertyName]) {
                    var existingValue = bytecode.timelines[timelineName][selector][propertyName][keyframeMs].value || 0;
                    if (isNumeric(existingValue)) {
                        var updatedValue = existingValue - offsetValue;
                        accumulatedUpdates[timelineName][haikuId][propertyName][keyframeMs] = {
                            value: updatedValue,
                        };
                    }
                }
            }
        });
        this.component.updateKeyframes(accumulatedUpdates, {}, this.component.project.getMetadata(), function () {
            _this.clearAllRelatedCaches();
            _this.reinitializeLayout();
        });
    };
    ElementSelectionProxy.prototype.rotate = function (dx, dy, coordsCurrent, coordsPrevious, activationPoint, globals) {
        var _this = this;
        var accumulatedUpdates = {};
        var fixedPoint = this.getOriginTransformed();
        var rotationZ = ElementSelectionProxy.computeRotationPropertyGroupDelta(this, this, coordsCurrent, coordsPrevious, globals)["rotation.z"].value;
        var rotationGroup = Object.assign({
            // Ensure we always get a default out in case rotation is snapping to 0.
            'rotation.z': { value: 0 },
        }, ElementSelectionProxy.computeRotationPropertyGroup(this, rotationZ, fixedPoint));
        for (var property in rotationGroup) {
            this.applyPropertyValue(property, rotationGroup[property].value);
        }
        this.selection.forEach(function (element) {
            ElementSelectionProxy.accumulateKeyframeUpdates(accumulatedUpdates, element, element.component.getCurrentTimelineName(), element.component.getCurrentTimelineTime(), Object.assign({
                // Ensure we always get a default out in case rotation is snapping to 0.
                'rotation.z': { value: 0 },
            }, ElementSelectionProxy.computeRotationPropertyGroup(element, rotationZ, fixedPoint)));
        });
        this.component.updateKeyframes(accumulatedUpdates, {}, this.component.project.getMetadata(), function () {
            _this.clearAllRelatedCaches();
        });
    };
    ElementSelectionProxy.prototype.pasteClipsAndSelect = function (clips, metadata, cb) {
        var _this = this;
        logger.info("[element selection proxy] paste ".concat(this.getComponentIds().join('|')));
        this.component.pasteThings(clips, {}, metadata, function (err, _a) {
            var haikuIds = _a.haikuIds;
            if (err) {
                return cb(err);
            }
            Element.unselectAllElements({ component: _this.component }, metadata);
            haikuIds.map(function (haikuId) { return _this.component.findElementByComponentId(haikuId); }).forEach(function (element) {
                if (element) {
                    element.selectSoftly(metadata);
                }
            });
            return cb(null);
        });
    };
    ElementSelectionProxy.prototype.duplicateAllAndSelectDuplicates = function (metadata, cb) {
        var clips = this.selection.map(function (element) {
            return element.clip(metadata);
        });
        return this.pasteClipsAndSelect(clips, metadata, cb);
    };
    ElementSelectionProxy.prototype.cut = function (metadata) {
        logger.info("[element selection proxy] cut ".concat(this.getComponentIds().join('|')));
        var pasteables = [];
        this.selection.forEach(function (element) {
            // Don't allow the artboard to be cut
            if (!element.isRootElement()) {
                pasteables.push(element.copy());
            }
        });
        ElementSelectionProxy.trackPasteables(pasteables);
        this.remove(metadata);
    };
    ElementSelectionProxy.prototype.copy = function (metadata) {
        logger.info("[element selection proxy] copy ".concat(this.getComponentIds().join('|')));
        var pasteables = [];
        this.selection.forEach(function (element) {
            // Don't allow the artboard to be copied
            if (!element.isRootElement()) {
                pasteables.push(element.copy(metadata));
            }
        });
        ElementSelectionProxy.trackPasteables(pasteables);
    };
    ElementSelectionProxy.prototype.remove = function (metadata) {
        logger.info("[element selection proxy] remove ".concat(this.getComponentIds().join('|')));
        var componentIdsToRemove = this.selection.filter(function (element) { return !element.isRootElement(); }).map(function (element) { return element.getComponentId(); });
        this.component.deleteComponents(componentIdsToRemove, metadata, function () { });
    };
    ElementSelectionProxy.prototype.getComponentIds = function () {
        return this.selection.map(function (element) { return element.getComponentId(); });
    };
    /**
     * @method dump
     * @description When debugging, use this to log a concise shorthand of this entity.
     */
    ElementSelectionProxy.prototype.dump = function () {
        return this.getPrimaryKey();
    };
    return ElementSelectionProxy;
}(BaseModel));
ElementSelectionProxy.DEFAULT_OPTIONS = {
    required: {
        uid: true,
        selection: true,
        component: true,
    },
};
BaseModel.extend(ElementSelectionProxy);
ElementSelectionProxy.DEFAULT_PROPERTY_VALUES = {
    'offset.x': 0,
    'offset.y': 0,
    'offset.z': 0,
    'origin.x': 0.5,
    'origin.y': 0.5,
    'origin.z': 0.5,
    'rotation.x': 0,
    'rotation.y': 0,
    'rotation.z': 0,
    'scale.x': 1,
    'scale.y': 1,
    'scale.z': 1,
    'sizeAbsolute.x': 0,
    'sizeAbsolute.y': 0,
    'sizeAbsolute.z': 0,
    'translation.x': 0,
    'translation.y': 0,
    'translation.z': 0,
};
ElementSelectionProxy.activeAxesFromActivationPoint = function (activationPoint) {
    var activeAxes = new Uint8Array(2);
    // Shift (proportional scale) should always enable all axes.
    if (activationPoint.shift) {
        activeAxes[0] = activeAxes[1] = 1;
        return activeAxes;
    }
    // Based on the handle being moved, build input vector (ignore unchanged axis by leaving as 0 when moving edge control
    // points).
    // x-axis is only disabled at top and bottom edges.
    if (activationPoint.index !== 1 && activationPoint.index !== 7) {
        activeAxes[0] = 1;
    }
    // y-axis is only disabled at left and right edges.
    if (activationPoint.index !== 3 && activationPoint.index !== 5) {
        activeAxes[1] = 1;
    }
    return activeAxes;
};
ElementSelectionProxy.isActivationPointLeft = function (activationPoint) { return activationPoint.index % 3 === 0; };
ElementSelectionProxy.isActivationPointTop = function (activationPoint) { return activationPoint.index < 3; };
ElementSelectionProxy.computeScaleInfoForArtboard = function (targetElement, dx, dy, activationPoint) {
    // Disable origin scaling, which does not really make sense in this context.
    activationPoint.alt = false;
    var boxPoints = targetElement.getBoxPointsTransformed();
    return ElementSelectionProxy.computeScalePropertyGroup(targetElement.getComputedLayout(), ElementSelectionProxy.getFixedPointForScale(boxPoints, activationPoint), ElementSelectionProxy.getTranslatedPointForScale(boxPoints, activationPoint), {
        x: dx,
        y: dy,
        z: 0,
    }, activationPoint, true);
};
ElementSelectionProxy.getFixedPointForScale = function (proxyBoxPoints, activationPoint) {
    switch (activationPoint.index) {
        case 5:
        case 7:
            return proxyBoxPoints[0];
        case 1:
            return proxyBoxPoints[6];
        case 3:
            return proxyBoxPoints[2];
        default:
            return proxyBoxPoints[8 - activationPoint.index];
    }
};
// For a given activation point, we're also interested in the snaps of its neighbors, for e.g.
ElementSelectionProxy.getNeighborPointsForScaleSnapping = function (proxyBoxPoints, activationPoint) {
    switch (activationPoint.index) {
        case 1:
            return [proxyBoxPoints[0], proxyBoxPoints[2]];
        case 3:
            return [proxyBoxPoints[0], proxyBoxPoints[6]];
        case 5:
            return [proxyBoxPoints[2], proxyBoxPoints[8]];
        case 7:
            return [proxyBoxPoints[6], proxyBoxPoints[8]];
        default: // 4 or other
            throw new Error('Snapping behavior for \'center point\' scaling is undefined');
    }
};
ElementSelectionProxy.getTranslatedPointForScale = function (proxyBoxPoints, activationPoint) {
    switch (activationPoint.index) {
        case 5:
        case 7:
            return proxyBoxPoints[8];
        case 1:
            return proxyBoxPoints[2];
        case 3:
            return proxyBoxPoints[6];
        default:
            return proxyBoxPoints[activationPoint.index];
    }
};
ElementSelectionProxy.computeScalePropertyGroup = function (targetLayout, fixedPointIn, translatedPointIn, deltaIn, activationPoint, applyConstraints) {
    // Make a copy of inbound points so we can transform them in place.
    var fixedPoint = Object.assign({}, fixedPointIn);
    var translatedPoint = Object.assign({}, translatedPointIn);
    var delta = lodash.cloneDeep(deltaIn);
    // We compute the entire scale property group by fixing a point (the *temporary* transform origin) and translating a
    // point (the point being dragged). These are represented by `fixedPoint` and `translatedPoint` respectively.
    // Prevent zero scale because matrix multiplication will lock the scale to zero permanently while interacting.
    if (targetLayout.scale.x === 0) {
        targetLayout.scale.x = 0.0001;
    }
    if (targetLayout.scale.y === 0) {
        targetLayout.scale.y = 0.0001;
    }
    if (applyConstraints) {
        // The activation point index corresponds to a box with this coordinate system:
        // 0 1 2
        // 3   5
        // 6 7 8
        // In a group-scale context, we should only apply constraints based on the bounding container. Accordingly, we
        // transform `delta` in place here so it can be reused on child elements. First, translate to "local" coordinates so
        // so that these adjustments are meaningful and correct.
        var scaledBasisMatrix = Layout3D.computeScaledBasisMatrix(targetLayout.rotation, targetLayout.scale, targetLayout.shear);
        var scaledBasisMatrixInverted = new Float32Array(16);
        invertMatrix(scaledBasisMatrixInverted, scaledBasisMatrix);
        HaikuElement.transformPointInPlace(delta, scaledBasisMatrixInverted);
        var activeAxes = ElementSelectionProxy.activeAxesFromActivationPoint(activationPoint);
        delta.x *= activeAxes[0];
        delta.y *= activeAxes[1];
        // If we are performing a proportional scale, it suffices to let the longer side "dominate" the shorter one.
        // Note that we are scale and rotation-normalized while carrying out this operation.
        if (activationPoint.shift) {
            // We encounter a "negative proportion" trigger whenever negative Δsx increases the size, while positive Δsy
            // decreases the size, or conversely. This is accordingly offset below.
            var negativeProportion = ElementSelectionProxy.isActivationPointLeft(activationPoint) ^
                ElementSelectionProxy.isActivationPointTop(activationPoint);
            // "Edge case", lulz: if we are scaling from a vertical edge, Δsx should _always_ dominate Δsy, even if the
            // transformed object is taller than it is wide.
            if (activationPoint.index === 3 || activationPoint.index === 5 ||
                (targetLayout.size.x > targetLayout.size.y && activationPoint.index !== 1 && activationPoint.index !== 7)) {
                delta.y = delta.x * targetLayout.size.y / targetLayout.size.x;
                if (negativeProportion) {
                    delta.y *= -1;
                }
            }
            else {
                delta.x = delta.y * targetLayout.size.x / targetLayout.size.y;
                if (negativeProportion) {
                    delta.x *= -1;
                }
            }
        }
        HaikuElement.transformPointInPlace(delta, scaledBasisMatrix);
    }
    var layoutMatrix = targetLayout.matrix;
    var layoutMatrixInverted = new Float32Array(16);
    invertMatrix(layoutMatrixInverted, layoutMatrix);
    HaikuElement.transformPointInPlace(fixedPoint, layoutMatrixInverted);
    HaikuElement.transformPointInPlace(translatedPoint, layoutMatrixInverted);
    // To save CPU cycles and rounding errors, armed with the knowledge that a set of four unique deltas in scale.x,
    // scale.y, translation.x, and translation.y will fix our "fixed point" and translate our "translated point" exactly
    // as intended (proof left to reader), we can "normalize" to the requested property group after solving a linear
    // equation in these four unknown deltas.
    //
    // This works because if we represent the original transformation matrix T as:
    // [ [0]   [4]     -   [12] ]
    // [ [1]   [5]     -   [13] ]
    // [   -     -     -      - ]
    // [   0     0     0      - ]
    //
    // With unknown scale and translation offsets Δsx, Δsy, Δtx, Δty we can obtain the corresponding transformation
    // matrix T', where sx, sy are the original scale.x and scale.y and ox, oy are the (unchanged) scaled origin.x and
    // origin.y:
    // [ [0] + [0]/sx * Δsx   [4] + [4]/sy * Δsy   _   [12] - [0]/sx * ox * Δsx - [4]/sy * oy * Δsy ]
    // [ [1] + [1]/sx * Δsx   [5] + [5]/sy * Δsy   _   [13] - [0]/sx * ox * Δsx - [5]/sy * oy * Δsy ]
    // [                  _                    _   _                                              _ ]
    // [                  0                    _   _                                              _ ]
    //
    // Our job is essentially to find Δsx, Δsy, Δtx, Δty such that:
    //  - T * fixedPoint = T' * fixedPoint
    //  - T * translatedPoint + <dx, dy> = T' * translatedPoint
    //
    // Using the notation above and cancelling terms, this boils down to the relatively simply system of linear equations,
    // where Fx, Fy represent the fixed point and Tx, Ty represent the translated point:
    // [ [0] * (Fx - ox) / sx   [4] * (Fy - oy) / sy   1   0 ]   [ Δsx ]   [ 0 ]
    // [ [1] * (Fx - ox) / sx   [5] * (Fy - oy) / sy   0   1 ] * [ Δsy ] = [ 0 ]
    // [ [0] * (Tx - ox) / sx   [4] * (Ty - oy) / sy   1   0 ]   [ Δtx ]   [ Δx ]
    // [ [1] * (Tx - ox) / sx   [5] * (Ty - oy) / sy   1   0 ]   [ Δty ]   [ Δy ]
    //
    // The result is quickly computed below.
    var originX = targetLayout.origin.x * targetLayout.size.x;
    var originY = targetLayout.origin.y * targetLayout.size.y;
    var coefficientMatrix = [
        layoutMatrix[0] * (fixedPoint.x - originX) / targetLayout.scale.x,
        layoutMatrix[1] * (fixedPoint.x - originX) / targetLayout.scale.x,
        layoutMatrix[0] * (translatedPoint.x - originX) / targetLayout.scale.x,
        layoutMatrix[1] * (translatedPoint.x - originX) / targetLayout.scale.x,
        layoutMatrix[4] * (fixedPoint.y - originY) / targetLayout.scale.y,
        layoutMatrix[5] * (fixedPoint.y - originY) / targetLayout.scale.y,
        layoutMatrix[4] * (translatedPoint.y - originY) / targetLayout.scale.y,
        layoutMatrix[5] * (translatedPoint.y - originY) / targetLayout.scale.y,
        1, 0, 1, 0,
        0, 1, 0, 1,
    ];
    var coefficientMatrixInverted = new Float32Array(16);
    invertMatrix(coefficientMatrixInverted, coefficientMatrix);
    var propertyGroupInitialVector = [0, 0, delta.x, delta.y];
    var propertyGroupFinalVector = new Float32Array(4);
    transformFourVectorByMatrix(propertyGroupFinalVector, propertyGroupInitialVector, coefficientMatrixInverted);
    targetLayout.scale.x += propertyGroupFinalVector[0];
    targetLayout.scale.y += propertyGroupFinalVector[1];
    targetLayout.translation.x += propertyGroupFinalVector[2];
    targetLayout.translation.y += propertyGroupFinalVector[3];
    return {
        'scale.x': {
            value: rounded(targetLayout.scale.x),
        },
        'scale.y': {
            value: rounded(targetLayout.scale.y),
        },
        'translation.x': {
            value: rounded(targetLayout.translation.x),
        },
        'translation.y': {
            value: rounded(targetLayout.translation.y),
        },
    };
};
// This is used for a side-effect-free 'dry run' calculation of points through a layout spec
ElementSelectionProxy.transformPointsByLayoutInPlace = function (points, layout) {
    var matrix = Layout3D.computeMatrix(layout, layout.size);
    return points.map(function (point) {
        HaikuElement.transformPointInPlace(point, matrix);
        return point;
    });
};
ElementSelectionProxy.computeRotationPropertyGroup = function (element, rotationZDelta, fixedPoint) {
    // Given a known rotation delta, we can directly compute the new property group for a subelement of a selection.
    //       target origin (x1, y1)
    //      /|
    //     /
    //    /
    //   /
    //  /
    // /dz
    // context origin (x0, y0)
    // It suffices to rotate the ray <x1 - x0, y1 - y0> about the origin and then renormalize in context coordinates.
    // First build a simple rotation matrix to hold the rotation by `rotationZDelta`. (We could do this directly but
    // prefer to use the layout system for consistent rounding etc.)
    var layout = Layout3D.createLayoutSpec();
    layout.rotation.z = rotationZDelta;
    var ignoredSize = { x: 0, y: 0, z: 0 };
    var matrix = Layout3D.computeMatrix(layout, ignoredSize);
    // Next build the vector from `fixedPoint` to `targetOrigin` and rotate it.
    var targetOrigin = element.getOriginTransformed();
    var ray = {
        x: targetOrigin.x - fixedPoint.x,
        y: targetOrigin.y - fixedPoint.y,
        z: targetOrigin.z - fixedPoint.z,
    };
    HaikuElement.transformPointInPlace(ray, matrix);
    var layoutSpec = element.getLayoutSpec();
    var originalRotationMatrix = Layout3D.computeOrthonormalBasisMatrix(layoutSpec.rotation, layoutSpec.shear);
    if (layoutSpec.offset.x !== 0 || layoutSpec.offset.y !== 0) {
        ray.x -= layoutSpec.offset.x;
        ray.y -= layoutSpec.offset.y;
    }
    var attributes = {};
    composedTransformsToTimelineProperties(attributes, [matrix, originalRotationMatrix], false, layoutSpec);
    // Return directly after offsetting translation by the `fixedPoint`'s coordinates. Note that we are choosing _not_ to
    // change the z-translation, effectively projecting the origin of rotation from the context element onto the z = C
    // plane, where C is the z-translation of the target origin. This is a natural expectation of multi-rotation.
    return Object.keys(attributes).reduce(function (accumulator, key) {
        accumulator[key] = { value: attributes[key] };
        return accumulator;
    }, {
        'translation.x': {
            value: rounded(fixedPoint.x + ray.x),
        },
        'translation.y': {
            value: rounded(fixedPoint.y + ray.y),
        },
        'translation.z': {
            value: rounded(fixedPoint.z + ray.z),
        },
    });
};
ElementSelectionProxy.normalizeRotationDelta = function (delta) {
    if (Math.abs(delta) > Math.PI) {
        // If we have somehow flipped over an axis, normalize in [-π, π]. In realistic scenarios, we are actually
        // normalizing in [- π / 64, π / 64] or so.
        return delta - 2 * Math.PI * Math.sign(delta);
    }
    return delta;
};
ElementSelectionProxy.computeRotationPropertyGroupDelta = function (targetElement, contextElement, coordsCurrent, coordsPrevious, globals) {
    // Calculate rotation delta based on old mouse position and new
    //  *(x0, y0)
    //  |          Ex.
    //  |        \ click+drag starts at x0,y0, ends at x1,y1
    // h|         v
    //  |(cx,cy)
    //  *-------------*(x1,y1)
    //  ^      w
    //  center of rotation
    var x0 = coordsPrevious.x;
    var y0 = coordsPrevious.y;
    var x1 = coordsCurrent.x;
    var y1 = coordsCurrent.y;
    var _a = targetElement.getOriginTransformed(), cx = _a.x, cy = _a.y;
    //       *mouse(x,y)
    //      /|
    //     / |
    //    /  |
    //   /   |h
    //  /    |
    // /θ ___|
    // ^   w
    // (cx,cy)
    // tan(θ) = h / w
    // New angle
    var theta1 = Math.atan2(cy - y1, cx - x1);
    // Last angle
    var theta0 = Math.atan2(cy - y0, cx - x0);
    var delta = ElementSelectionProxy.normalizeRotationDelta(theta1 - theta0);
    // If shift is held, snap to absolute increments of π / 12.
    if (globals.isShiftKeyDown) {
        var originalRotation = targetElement.computePropertyValue('rotation.z');
        if (!contextElement.rotationSnapOffset) {
            // Look at the directionality of the original requested rotation and round up/down according to the apparent wish
            // of the user. We need to stick with this strategy for as long as snapping rotation is active to avoid confusion
            // and/or judders.
            contextElement.rotationSnapStrategy = delta > 0 ? Math.ceil : Math.floor;
            var originalRotationRounded = PI_OVER_12 * contextElement.rotationSnapStrategy(originalRotation / PI_OVER_12);
            contextElement.rotationSnapOffset = PI_OVER_12 * contextElement.rotationSnapStrategy(theta1 / PI_OVER_12);
            return {
                'rotation.z': {
                    value: originalRotationRounded - originalRotation,
                },
            };
        }
        var theta1Rounded = PI_OVER_12 * contextElement.rotationSnapStrategy(theta1 / PI_OVER_12);
        var effectiveDelta = theta1Rounded - contextElement.rotationSnapOffset;
        if (effectiveDelta !== 0) {
            contextElement.rotationSnapOffset = theta1Rounded;
        }
        return {
            'rotation.z': {
                value: ElementSelectionProxy.normalizeRotationDelta(effectiveDelta),
            },
        };
    }
    // Reset rotation snap in case it comes back!
    contextElement.initializeRotationSnap();
    return {
        'rotation.z': {
            value: rounded(delta),
        },
    };
};
/**
 * @function accumulateKeyframeUpdates
 */
ElementSelectionProxy.accumulateKeyframeUpdates = function (out, element, timelineName, timelineTime, propertyGroup) {
    if (!out[timelineName]) {
        out[timelineName] = {};
    }
    var componentId = element.getComponentId();
    if (!out[timelineName][componentId]) {
        out[timelineName][componentId] = {};
    }
    var currentProperties = TimelineProperty.getPropertiesBase(element.component.getReifiedBytecode().timelines, timelineName, componentId) || {};
    for (var propertyName in propertyGroup) {
        if (
        // Are we setting a layout property to the default value for the first time? If yes, just skip it.
        // Because of rounding errors, we should allow a reasonable margin of error. Because translation is
        // snappable, definitely always set this even if it appears to be trivial.
        !currentProperties[propertyName] &&
            basicallyEquals(Property.PREPOPULATED_VALUES[propertyName], propertyGroup[propertyName].value)) {
            continue;
        }
        // We can also skip if the last defined keyframe for the same property is unchanged.
        if (currentProperties[propertyName]) {
            var lastKeyframe = Object.keys(currentProperties[propertyName])
                .map(Number)
                .filter(function (time) { return time <= timelineTime; })
                .sort(function (a, b) { return a - b; })
                .pop();
            if (lastKeyframe !== undefined &&
                basicallyEquals(currentProperties[propertyName][lastKeyframe].value, propertyGroup[propertyName].value)) {
                continue;
            }
        }
        if (!out[timelineName][componentId][propertyName]) {
            out[timelineName][componentId][propertyName] = {};
        }
        out[timelineName][componentId][propertyName][timelineTime] = {
            value: propertyGroup[propertyName].value,
        };
    }
    return out;
};
var addVectors = function (v0, v1) {
    return {
        x: v0.x + v1.x,
        y: v0.y + v1.y,
    };
};
var isWithinEpsilon = function (v0, v1, override) {
    return (v0 < v1 + (override || SNAP_EPSILON)) && (v0 > v1 - (override || SNAP_EPSILON));
};
// Storage for snap lines data
ElementSelectionProxy.snaps = [];
ElementSelectionProxy.fromSelection = function (rawSelection, component) {
    var uid = "".concat(component && component.getPrimaryKey(), "+").concat(rawSelection.map(function (element) { return element.getPrimaryKey(); }).sort().join('+') || 'none');
    return ElementSelectionProxy.findById(uid) || ElementSelectionProxy.upsert(Object.assign({
        uid: uid,
        selection: rawSelection.reduce(function (accumulator, element) {
            while (!element.isVisuallySelectable && element.parent) {
                element = element.parent;
            }
            accumulator.push(element);
            return accumulator;
        }, []),
    }, { component: component }));
};
var PASTEABLES = [];
ElementSelectionProxy.trackPasteables = function (pasteables) {
    PASTEABLES.splice(0);
    PASTEABLES.push.apply(PASTEABLES, pasteables);
};
ElementSelectionProxy.getPasteables = function () {
    return PASTEABLES;
};
module.exports = ElementSelectionProxy;
// Down here to avoid Node circular dependency stub objects. #FIXME
var Element = require('./Element');
var Property = require('./Property');
var Template = require('./Template');
var TimelineProperty = require('./TimelineProperty');
//# sourceMappingURL=ElementSelectionProxy.js.map