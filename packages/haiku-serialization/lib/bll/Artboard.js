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
var BaseModel = require('./BaseModel');
var Matrix = require('gl-matrix');
var HAIKU_ID_ATTRIBUTE = 'haiku-id';
/**
 * @class Artboard
 * @description
 *  Abstraction over logic for managing the artboard, including:
 *    - Artboard size and position
 *    - Zooming and panning
 *    - Current drawing tool (future)
 *  And other such concerns. Consider putting Glass-related logic
 *  in here instead of into the Glass React app.
 */
var Artboard = /** @class */ (function (_super) {
    __extends(Artboard, _super);
    function Artboard(props, opts) {
        var _this = _super.call(this, props, opts) || this;
        if (typeof window !== 'undefined') {
            _this._containerWidth = window.document.body.clientWidth || 1;
            _this._containerHeight = window.document.body.clientHeight || 1;
        }
        else {
            _this._containerWidth = 1;
            _this._containerHeight = 1;
        }
        _this._mountWidth = Artboard.DEFAULT_WIDTH;
        _this._mountHeight = Artboard.DEFAULT_HEIGHT;
        _this._mountX = Artboard.DEFAULT_WIDTH / 2;
        _this._mountY = Artboard.DEFAULT_HEIGHT / 2;
        _this._panX = 0;
        _this._panY = 0;
        _this._originalPanX = 0;
        _this._originalPanY = 0;
        _this._zoomXY = Artboard.DEFAULT_ZOOM;
        _this._drawingIsModal = true;
        _this.component.on('time:change', function (timelineName, timelineTime) {
            if (!_this.component.isCodeReloading()) {
                _this.updateMountSize();
            }
        });
        _this.project.on('update', function (what, arg1, arg2) {
            if (what === 'application-mounted' ||
                (what === 'reloaded' && arg1 === 'hard')) {
                _this.updateMountSize();
            }
            else if (what === 'updateKeyframes') {
                var timelineName = _this.component.getCurrentTimelineName();
                var artboardId = _this.getElementHaikuId();
                if (arg2 && arg2[timelineName] && arg2[timelineName][artboardId]) {
                    _this.updateMountSize();
                }
            }
        });
        _this.project.on('remote-update', function (what) {
            if (what === 'updateKeyframes') {
                _this.updateMountSize();
            }
        });
        return _this;
    }
    // used by at least "cmd + 0" to center and
    // reset zoom on stage
    Artboard.prototype.resetZoomPan = function () {
        this._panX = 0;
        this._panY = 0;
        this._originalPanX = 0;
        this._originalPanY = 0;
        this._zoomXY = Artboard.DEFAULT_ZOOM;
        this.dimensionsChangedHook();
    };
    Artboard.prototype.dimensionsChangedHook = function () {
        var hc = this.component.$instance;
        var renderer = hc && hc.context && hc.context.renderer;
        if (renderer) {
            if (!renderer.config) {
                renderer.config = {};
            }
            renderer.config.zoom = this.getZoom();
            renderer.config.pan = this.getPan();
        }
        ElementSelectionProxy.clearCaches();
        this.emit('update', 'dimensions-changed');
    };
    Artboard.prototype.getElementHaikuId = function () {
        var bytecode = this.component.fetchActiveBytecodeFile().getReifiedBytecode();
        var template = bytecode && bytecode.template; // If called too early this may not be present :/
        return template && template.attributes[HAIKU_ID_ATTRIBUTE];
    };
    Artboard.prototype.getElement = function () {
        var haikuId = this.getElementHaikuId();
        if (!haikuId) {
            return null;
        }
        return Element.findByComponentAndHaikuId(this.component, haikuId);
    };
    Artboard.prototype.getArtboardRenderInfo = function () {
        return {
            pan: {
                x: this._panX,
                y: this._panY,
            },
            zoom: {
                x: this._zoomXY,
                y: this._zoomXY,
            },
            container: {
                x: 0,
                y: 0,
                w: this._containerWidth,
                h: this._containerHeight,
            },
            mount: {
                x: this._mountX,
                y: this._mountY,
                w: this._mountWidth,
                h: this._mountHeight,
            },
        };
    };
    Artboard.prototype.getRect = function () {
        return this.mount.getBoundingClientRect();
    };
    Artboard.prototype.resetContainerDimensions = function ($container) {
        if ($container) {
            var w1 = $container.clientWidth;
            var h1 = $container.clientHeight;
            var w2 = this._mountWidth;
            var h2 = this._mountHeight;
            var mountX = Math.round((w1 - w2) / 2);
            var mountY = Math.round((h1 - h2) / 2);
            var cw = Math.max(w1, w2);
            var ch = Math.max(h1, h2);
            if (cw !== this._containerWidth ||
                ch !== this._containerHeight ||
                mountX !== this._mountX ||
                mountY !== this._mountY) {
                this._containerWidth = cw;
                this._containerHeight = ch;
                this._mountX = mountX;
                this._mountY = mountY;
            }
        }
        this.emit('update', 'dimensions-reset');
    };
    Artboard.prototype.updateMountSize = function ($container) {
        var updatedArtboardSize = this.component && this.component.getContextSize();
        if (updatedArtboardSize && updatedArtboardSize.width && updatedArtboardSize.height) {
            this._mountWidth = updatedArtboardSize.width;
            this._mountHeight = updatedArtboardSize.height;
        }
        this.resetContainerDimensions($container);
        this.dimensionsChangedHook();
    };
    Artboard.prototype.zoomIn = function (factor) {
        this._zoomXY = this._zoomXY * factor;
        this.dimensionsChangedHook();
    };
    Artboard.prototype.zoomOut = function (factor) {
        this._zoomXY = this._zoomXY / factor;
        this.dimensionsChangedHook();
    };
    Artboard.prototype.performPan = function (dx, dy) {
        this._panX = this._originalPanX + dx;
        this._panY = this._originalPanY + dy;
        this.dimensionsChangedHook();
    };
    Artboard.prototype.isDrawingModal = function () {
        return this._drawingIsModal;
    };
    Artboard.prototype.getSize = function () {
        return {
            x: this.getMountWidth(),
            y: this.getMountHeight(),
        };
    };
    Artboard.prototype.getMountX = function () {
        return this._mountX;
    };
    Artboard.prototype.getMountY = function () {
        return this._mountY;
    };
    Artboard.prototype.getMountWidth = function () {
        return this._mountWidth;
    };
    Artboard.prototype.getMountHeight = function () {
        return this._mountHeight;
    };
    Artboard.prototype.getContainerWidth = function () {
        return this._containerWidth;
    };
    Artboard.prototype.getContainerHeight = function () {
        return this._containerHeight;
    };
    Artboard.prototype.snapshotOriginalPan = function () {
        this._originalPanX = this._panX;
        this._originalPanY = this._panY;
    };
    Artboard.prototype.transformScreenToWorld = function (screenCoords) {
        var mat = Matrix.mat2d.create();
        var mount = Matrix.vec2.create();
        Matrix.vec2.set(mount, -this._mountX, -this._mountY);
        var mountMat = Matrix.mat2d.create();
        Matrix.mat2d.translate(mountMat, mountMat, mount);
        Matrix.mat2d.multiply(mat, mat, mountMat);
        var screenVec = Matrix.vec2.create();
        Matrix.vec2.set(screenVec, screenCoords.x, screenCoords.y);
        Matrix.vec2.transformMat2d(screenVec, screenVec, mat);
        var screenSpace = { x: screenVec[0], y: screenVec[1] };
        return screenSpace;
    };
    Artboard.prototype.getZoom = function () {
        return this._zoomXY;
    };
    Artboard.prototype.getPan = function () {
        return {
            x: this._panX,
            y: this._panY,
        };
    };
    // Snapline {
    //  direction : "HORIZONTAL"|"VERTICAL"
    //  positionWorld: Number
    //  elementId: String | undefined
    // }
    Artboard.prototype.getSnapLinesInScreenCoords = function () {
        var _this = this;
        var snapLines = [];
        var topWorld = 0;
        var rightWorld = this._mountWidth;
        var bottomWorld = this._mountHeight;
        var leftWorld = 0;
        snapLines.push({
            direction: 'HORIZONTAL',
            positionWorld: topWorld,
            elementId: 'STAGE_TOP',
        });
        snapLines.push({
            direction: 'VERTICAL',
            positionWorld: rightWorld,
            elementId: 'STAGE_RIGHT',
        });
        snapLines.push({
            direction: 'HORIZONTAL',
            positionWorld: bottomWorld,
            elementId: 'STAGE_BOTTOM',
        });
        snapLines.push({
            direction: 'VERTICAL',
            positionWorld: leftWorld,
            elementId: 'STAGE_LEFT',
        });
        snapLines.push({
            direction: 'VERTICAL',
            positionWorld: (leftWorld + rightWorld) / 2,
            elementId: 'STAGE_VERTICAL_MID',
        });
        snapLines.push({
            direction: 'HORIZONTAL',
            positionWorld: (topWorld + bottomWorld) / 2,
            elementId: 'STAGE_HORIZONTAL_MID',
        });
        var rootElement = this.getElement();
        var topLevelElements = rootElement.children;
        topLevelElements.forEach(function (elem) {
            // deleted elements will show up as null entries in this array
            if (!elem) {
                return;
            }
            var marginX = (_this._containerWidth - _this._mountWidth) / 2;
            var marginY = (_this._containerHeight - _this._mountHeight) / 2;
            var bbox = elem.getBoundingClientRect(-marginX, -marginY);
            snapLines.push({
                direction: 'HORIZONTAL',
                positionWorld: _this.transformScreenToWorld({ x: 0, y: bbox.top }).y,
                elementId: elem.getComponentId(),
            });
            snapLines.push({
                direction: 'HORIZONTAL',
                positionWorld: _this.transformScreenToWorld({ x: 0, y: bbox.bottom }).y,
                elementId: elem.getComponentId(),
            });
            snapLines.push({
                direction: 'HORIZONTAL',
                positionWorld: _this.transformScreenToWorld({ x: 0, y: (bbox.bottom + bbox.top) / 2 }).y,
                elementId: elem.getComponentId(),
            });
            snapLines.push({
                direction: 'VERTICAL',
                positionWorld: _this.transformScreenToWorld({ x: bbox.left, y: 0 }).x,
                elementId: elem.getComponentId(),
            });
            snapLines.push({
                direction: 'VERTICAL',
                positionWorld: _this.transformScreenToWorld({ x: bbox.right, y: 0 }).x,
                elementId: elem.getComponentId(),
            });
            snapLines.push({
                direction: 'VERTICAL',
                positionWorld: _this.transformScreenToWorld({ x: (bbox.right + bbox.left) / 2, y: 0 }).x,
                elementId: elem.getComponentId(),
            });
        });
        if (typeof window !== 'undefined') {
            window.snapLines = snapLines;
        }
        return snapLines;
    };
    return Artboard;
}(BaseModel));
Artboard.DEFAULT_OPTIONS = {
    required: {
        mount: true,
        component: true,
        project: true,
    },
};
BaseModel.extend(Artboard);
Artboard.DEFAULT_WIDTH = 550;
Artboard.DEFAULT_HEIGHT = 400;
Artboard.DEFAULT_ZOOM = 1;
module.exports = Artboard;
// Down here to avoid Node circular dependency stub objects. #FIXME
var Element = require('./Element');
var ElementSelectionProxy = require('./ElementSelectionProxy');
//# sourceMappingURL=Artboard.js.map