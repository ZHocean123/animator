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
var lodash = require('lodash');
var HaikuElement = require("@haiku/core/lib/HaikuElement.js").default;
var Layout3D = require("@haiku/core/lib/Layout3D.js").default;
var cssQueryTree = require("@haiku/core/lib/HaikuNode.js").cssQueryTree;
var composedTransformsToTimelineProperties = require('haiku-common/lib/layout/composedTransformsToTimelineProperties').default;
var functionToRFO = require("@haiku/core/lib/reflection/functionToRFO.js").default;
var LAYOUT_3D_SCHEMA = require("@haiku/core/lib/HaikuComponent.js").LAYOUT_3D_SCHEMA;
var KnownDOMEvents = require("@haiku/core/lib/renderers/dom/Events.js").default;
var titlecase = require('titlecase');
var decamelize = require('decamelize');
var Matrix = require('gl-matrix');
var polygonOverlap = require('polygon-overlap');
var logger = require('./../utils/LoggerInstance');
var BaseModel = require('./BaseModel');
var TransformCache = require('./TransformCache');
var _a = require('haiku-common/lib/experiments'), Experiment = _a.Experiment, experimentIsEnabled = _a.experimentIsEnabled;
/**
 * Tag names with no presentational context on their own. These are usually found inside <defs>, but technically don't
 * have to be.
 */
var DEFABLE_TAG_NAMES = {
    hatch: true,
    linearGradient: true,
    meshGradient: true,
    pattern: true,
    radialGradient: true,
    solidcolor: true,
    filter: true,
};
/**
 * Attributes which only show on SVG and shouldn't be copied during ungrouping.
 */
var SVG_ONLY_ATTRIBUTES = {
    baseProfile: true,
    contentScriptType: true,
    contentStyleType: true,
    height: true,
    preserveAspectRatio: true,
    version: true,
    viewBox: true,
    xmlns: true,
    width: true,
};
var HAIKU_ID_ATTRIBUTE = 'haiku-id';
var HAIKU_TITLE_ATTRIBUTE = 'haiku-title';
var HAIKU_LOCKED_ATTRIBUTE = 'haiku-locked';
var HAIKU_SOURCE_ATTRIBUTE = 'haiku-source';
var SYNC_LOCKED_ID_SUFFIX = '#lock';
var TIMELINE_EVENT_PREFIX = 'timeline:';
var EMPTY_ELEMENT = { elementName: 'div', attributes: {}, children: [] };
function isNumeric(n) {
    return !isNaN(parseFloat(n)) && isFinite(n);
}
function getAncestry(ancestors, elementInstance) {
    ancestors.unshift(elementInstance);
    if (elementInstance.parent) {
        getAncestry(ancestors, elementInstance.parent);
    }
    return ancestors;
}
var cleanHaikuId = function (str) { return titlecase(decamelize((str + '').trim()).replace(/[\W_:]/g, ' ')); };
/**
 * @class Element
 * @description
 *  Model to abstract on-stage elements. This model has logic for:
 *    - Locating elements
 *    - Getting elements' DOM nodes
 *    - Getting position, transformation, and bounding box info about the element
 *    - Changing the element's state, e.g. selected or hovered
 *    - Managing addressable properties for the element in component's context.
 */
var Element = /** @class */ (function (_super) {
    __extends(Element, _super);
    function Element(props, opts) {
        var _this = _super.call(this, props, opts) || this;
        _this._isHovered = false;
        _this._isSelected = false;
        _this._clusterAndPropertyRows = [];
        _this._headingRow = null;
        _this.transformCache = new TransformCache(_this);
        return _this;
    }
    Element.prototype.$el = function () {
        var staticTemplateNode = this.getStaticTemplateNode();
        if (typeof staticTemplateNode === 'string') {
            return null;
        }
        var haikuId = staticTemplateNode.attributes && staticTemplateNode.attributes[HAIKU_ID_ATTRIBUTE];
        return Element.findDomNode(haikuId, this.component.getMount().$el());
    };
    Element.prototype.afterInitialize = function () {
        // Make sure we add to the appropriate collections to avoid unexpected state issues
        if (!this._visibleProperties) {
            this._visibleProperties = {};
        }
    };
    Element.prototype.oneListener = function ($el, uid, type, fn) {
        if (!Element.cache.eventListeners[uid]) {
            Element.cache.eventListeners[uid] = {};
        }
        if (Element.cache.eventListeners[uid][type]) {
            $el.removeEventListener(type, Element.cache.eventListeners[uid][type]);
            delete Element.cache.eventListeners[uid][type];
        }
        Element.cache.eventListeners[uid][type] = fn;
        $el.addEventListener(type, fn);
        return fn;
    };
    Element.prototype.hoverOn = function (metadata, softly) {
        if (softly === void 0) { softly = false; }
        if (!this._isHovered) {
            this.cache.clear();
            this._isHovered = true;
            if (!softly) {
                this.emit('update', 'element-hovered', metadata);
            }
        }
        return this;
    };
    Element.prototype.hoverOnSoftly = function (metadata) {
        return this.hoverOn(metadata, true);
    };
    Element.prototype.hoverOff = function (metadata, softly) {
        if (softly === void 0) { softly = false; }
        if (this._isHovered) {
            this.cache.clear();
            this._isHovered = false;
            if (!softly) {
                this.emit('update', 'element-unhovered', metadata);
            }
        }
    };
    Element.prototype.hoverOffSoftly = function (metadata) {
        return this.hoverOff(metadata, true);
    };
    Element.prototype.isHovered = function () {
        return this._isHovered;
    };
    Element.prototype.isShimElement = function () {
        return this.parent && this.parent.getSource() === '<group>';
    };
    Element.prototype.select = function (metadata, softly) {
        if (softly === void 0) { softly = false; }
        if (this.isLocked()) {
            return;
        }
        if (!this._isSelected) {
            this._isSelected = true;
            if (softly) {
                this.emit('update', 'element-selected-softly', metadata);
            }
            else {
                // Roundabout! Note that rows, when selected, will select their corresponding element
                var row = this.getHeadingRow();
                if (row) {
                    row.expandAndSelect(metadata);
                }
                this.emit('update', 'element-selected', metadata);
            }
        }
    };
    /**
     * @method selectSoftly
     * @description Like select, but emit a different event and don't select the row.
     * Mainly used for multi-selection in glass-only context.
     */
    Element.prototype.selectSoftly = function (metadata) {
        return this.select(metadata, true);
    };
    Element.prototype.unselect = function (metadata, softly) {
        if (softly === void 0) { softly = false; }
        if (this._isSelected) {
            this._isSelected = false;
            if (softly) {
                this.emit('update', 'element-unselected-softly', metadata);
            }
            else {
                // Roundabout! Note that rows, when deselected, will deselect their corresponding element
                var row = this.getHeadingRow();
                if (row && row.isSelected()) {
                    row.deselect(metadata);
                }
                this.emit('update', 'element-unselected', metadata);
            }
            // #FIXME: this is a bit overzealous.
            ElementSelectionProxy.purge();
        }
    };
    /**
     * @method unselectSoftly
     * @description Like unselect, but emit a different event and don't select the row.
     * Mainly used for multi-selection in glass-only context.
     */
    Element.prototype.unselectSoftly = function (metadata) {
        return this.unselect(metadata, true);
    };
    Element.prototype.getHeadingRow = function () {
        return this._headingRow;
    };
    Element.prototype.getPropertyRowByPropertyName = function (propertyName) {
        for (var i = 0; i < this._clusterAndPropertyRows.length; i++) {
            var candidateRow = this._clusterAndPropertyRows[i];
            if (candidateRow.isPropertyOfName(propertyName)) {
                return candidateRow;
            }
        }
    };
    Element.prototype.isSelected = function () {
        return this._isSelected;
    };
    Element.prototype.isLocked = function () {
        return !!this.getStaticTemplateNode().attributes[HAIKU_LOCKED_ATTRIBUTE];
    };
    Element.prototype.isLockedViaParents = function () {
        // tslint:disable-next-line:no-this-assignment
        var p = this;
        while (p) {
            if (p.isLocked()) {
                return true;
            }
            p = p.parent;
        }
        return false;
    };
    Element.prototype.toggleLocked = function (metadata, cb) {
        this.component.setLockedStatusForComponent(this.getComponentId(), !this.getStaticTemplateNode().attributes[HAIKU_LOCKED_ATTRIBUTE], metadata, cb);
        this.emit('update', 'element-locked-toggle');
    };
    Element.prototype.getStaticTemplateNode = function () {
        return this.component.locateTemplateNodeByComponentId(this.componentId);
    };
    Element.prototype.getCoreHostComponentInstance = function () {
        return this.component.$instance;
    };
    Element.prototype.copy = function () {
        return this.clip();
    };
    Element.prototype.clip = function () {
        return this.buildClipboardPayload();
    };
    Element.prototype.getVisibleEvents = function () {
        var _this = this;
        return Object.keys(this.getReifiedEventHandlers()).filter(function (handler) { return !_this.isTimelineEvent(handler); });
    };
    Element.prototype.getTimelineEvents = function () {
        var _this = this;
        return Object.keys(this.getReifiedEventHandlers()).filter(function (handler) { return _this.isTimelineEvent(handler); });
    };
    Element.prototype.isTimelineEvent = function (eventName) {
        return eventName.includes(TIMELINE_EVENT_PREFIX);
    };
    Element.prototype.hasEventHandlers = function () {
        return !lodash.isEmpty(this.getReifiedEventHandlers());
    };
    Element.prototype.hasVisibleEventHandlers = function () {
        return !lodash.isEmpty(this.getVisibleEvents());
    };
    Element.prototype.getReifiedEventHandlers = function () {
        var bytecode = this.component.getReifiedBytecode();
        var selector = 'haiku:' + this.getComponentId();
        if (!bytecode.eventHandlers) {
            bytecode.eventHandlers = {};
        }
        return bytecode.eventHandlers[selector] || {};
    };
    Element.prototype.getReifiedEventHandler = function (eventName) {
        return this.getReifiedEventHandlers()[eventName];
    };
    Element.prototype.getEventHandlerSaveStatus = function (eventName) {
        if (!this._eventHandlerSaves) {
            this._eventHandlerSaves = {};
        }
        return this._eventHandlerSaves[eventName];
    };
    Element.prototype.setEventHandlerSaveStatus = function (eventName, statusValue) {
        if (!this._eventHandlerSaves) {
            this._eventHandlerSaves = {};
        }
        this._eventHandlerSaves[eventName] = statusValue;
        this.emit('update', 'element-event-handler-save-status-update');
        return this;
    };
    Element.prototype.getApplicableEventHandlerOptionsList = function () {
        var options = [];
        // Track which ones we've already accounted for in the 'known events' lists so that
        // we only display those that aren't accounted for under the 'custom events' list
        var predefined = {};
        Element.HIGHER_ORDER_EVENTS.forEach(function (spec) {
            predefined[spec.value] = true;
        });
        options.push({
            label: 'Favorites',
            options: Element.HIGHER_ORDER_EVENTS,
        });
        var handlers = this.getReifiedEventHandlers();
        for (var category in KnownDOMEvents) {
            var suboptions = [];
            options.push({
                label: category,
                options: suboptions,
            });
            for (var name_1 in KnownDOMEvents[category]) {
                var candidate = KnownDOMEvents[category][name_1];
                predefined[name_1] = true;
                // If this is whitelisted to appear in the menu, show it.
                // If not, show it only if there is a handler explicitly defined for it.
                if (candidate.menuable || handlers[name_1]) {
                    suboptions.push({
                        label: candidate.human || name_1,
                        value: name_1,
                    });
                }
            }
        }
        Element.COMPONENT_EVENTS.forEach(function (spec) {
            predefined[spec.value] = true;
        });
        options.push({
            label: 'Component/Lifecycle',
            options: Element.COMPONENT_EVENTS,
        });
        var customEvents = [];
        for (var name_2 in handlers) {
            if (!this.isTimelineEvent(name_2) && !predefined[name_2]) {
                customEvents.push({
                    label: name_2,
                    value: name_2,
                });
            }
        }
        options.push({
            label: 'Custom Events',
            options: customEvents,
        });
        return options;
    };
    /**
     * @method buildClipboardPayload
     * @description Return a serializable payload for this object that represents sufficient
     * information to be able to paste (instantiate with overrides) or delete it if received as
     * part of a pasteThing command.
     */
    Element.prototype.buildClipboardPayload = function () {
        var originalNode = this.getStaticTemplateNode();
        // These are cloned because we may mutate their references in place when we paste
        var clonedNode = lodash.cloneDeep(Template.manaWithOnlyStandardProps(originalNode, true));
        var clonedBytecode = lodash.cloneDeepWith(this.component.fetchActiveBytecodeFile().getReifiedDecycledBytecode(), function (value) {
            if (value instanceof Function && value.injectee) {
                return functionToRFO(value);
            }
        });
        var eventHandlers = Bytecode.getAppliedEventHandlersForNode({}, clonedBytecode, clonedNode);
        Object.keys(eventHandlers).forEach(function (element) {
            Object.keys(eventHandlers[element]).forEach(function (event) {
                eventHandlers[element][event].handler = functionToRFO(eventHandlers[element][event].handler);
            });
        });
        return {
            kind: 'bytecode',
            data: {
                eventHandlers: eventHandlers,
                timelines: Bytecode.getAppliedTimelinesForNode({}, clonedBytecode, clonedNode),
                template: clonedNode,
            },
        };
    };
    Element.prototype.getQualifiedBytecode = function () {
        // Grab the 'host' bytecode and pull any control structures applied to us from it
        // These are cloned because we may mutate their references in place if we instantiate it
        var bytecode = Bytecode.clone(this.component.getReifiedBytecode());
        var template = Template.clone({}, Template.manaWithOnlyStandardProps(this.getStaticTemplateNode(), false));
        var states = Bytecode.getAppliedStatesForNode({}, bytecode, template);
        var helpers = Bytecode.getAppliedHelpersForNode({}, bytecode, template);
        var timelines = Bytecode.getAppliedTimelinesForNode({}, bytecode, template);
        var eventHandlers = Bytecode.getAppliedEventHandlersForNode({}, bytecode, template);
        return {
            helpers: helpers,
            states: states,
            timelines: timelines,
            eventHandlers: eventHandlers,
            template: template,
        };
    };
    Element.prototype.isSyncLocked = function () {
        var node = this.getStaticTemplateNode();
        if (node && node.attributes && node.attributes[HAIKU_SOURCE_ATTRIBUTE]) {
            return node.attributes[HAIKU_SOURCE_ATTRIBUTE].endsWith(SYNC_LOCKED_ID_SUFFIX);
        }
        return false;
    };
    Element.prototype.getStackingInfo = function () {
        if (!this.parent) {
            return;
        }
        if (!this.parent.getStaticTemplateNode()) {
            return;
        }
        return Template.getStackingInfo(this.component.getReifiedBytecode(), this.parent.getStaticTemplateNode(), 
        // TODO: If we ever support time-bound stacking, change these to their dynamic counterparts
        this.component.getInstantiationTimelineName(), this.component.getInstantiationTimelineTime());
    };
    Element.prototype.isAtFront = function () {
        var stackingInfo = this.getStackingInfo();
        if (!stackingInfo) {
            return true;
        } // Can happen with artboard
        var myIndex = lodash.findIndex(stackingInfo, { haikuId: this.getComponentId() });
        return myIndex === stackingInfo.length - 1;
    };
    Element.prototype.isAtBack = function () {
        var stackingInfo = this.getStackingInfo();
        if (!stackingInfo) {
            return true;
        } // Can happen with artboard
        var myIndex = lodash.findIndex(stackingInfo, { haikuId: this.getComponentId() });
        return myIndex === 0;
    };
    Element.prototype.sendToBack = function () {
        this.component.zMoveToBack(this.getComponentId(), this.component.getCurrentTimelineName(), 0, this.component.project.getMetadata(), function (err) {
            if (err) {
                return void (0);
            }
        });
        this.emit('update', 'element-send-to-back');
    };
    Element.prototype.bringToFront = function () {
        this.component.zMoveToFront(this.getComponentId(), this.component.getCurrentTimelineName(), 0, this.component.project.getMetadata(), function (err) {
            if (err) {
                return void (0);
            }
        });
        this.emit('update', 'element-bring-to-front');
    };
    Element.prototype.bringForward = function () {
        this.component.zMoveForward(this.getComponentId(), this.component.getCurrentTimelineName(), 0, this.component.project.getMetadata(), function (err) {
            if (err) {
                return void (0);
            }
        });
        this.emit('update', 'element-bring-forward');
    };
    Element.prototype.sendBackward = function () {
        this.component.zMoveBackward(this.getComponentId(), this.component.getCurrentTimelineName(), 0, this.component.project.getMetadata(), function (err) {
            if (err) {
                return void (0);
            }
        });
        this.emit('update', 'element-send-backward');
    };
    // marginX and marginY represent the distance from the container
    // boundary to the stage boundary, i.e. the margin that centers the
    // stage.
    // since this is dependent on artboard + window dimensions,
    // this needs to be passed in from the artboard.
    Element.prototype.getBoundingClientRect = function (marginX, marginY) {
        var points = this.getBoxPointsTransformed();
        // account for stage margin to provide a screen-space bbox
        if (marginX !== undefined && marginY !== undefined) {
            var mat = Matrix.mat2d.create();
            var margin = Matrix.vec2.create();
            Matrix.vec2.set(margin, -marginX, -marginY);
            Matrix.mat2d.translate(mat, mat, margin);
            for (var i = 0; i < points.length; i++) {
                var pointInput = Matrix.vec2.create();
                var pointOutput = Matrix.vec2.create();
                Matrix.vec2.set(pointInput, points[i].x, points[i].y);
                Matrix.vec2.transformMat2d(pointOutput, pointInput, mat);
                points[i] = { x: pointOutput[0], y: pointOutput[1] };
            }
        }
        var top = Math.min(points[0].y, points[2].y, points[6].y, points[8].y);
        var bottom = Math.max(points[0].y, points[2].y, points[6].y, points[8].y);
        var left = Math.min(points[0].x, points[2].x, points[6].x, points[8].x);
        var right = Math.max(points[0].x, points[2].x, points[6].x, points[8].x);
        var height = Math.abs(bottom - top);
        var width = Math.abs(right - left);
        return {
            top: top,
            right: right,
            bottom: bottom,
            left: left,
            width: width,
            height: height,
        };
    };
    Element.prototype.isAutoSizeX = function () {
        var layout = this.getLayoutSpec();
        return typeof layout.sizeAbsolute.x !== 'number';
    };
    Element.prototype.isAutoSizeY = function () {
        var layout = this.getLayoutSpec();
        return typeof layout.sizeAbsolute.y !== 'number';
    };
    Element.prototype.getComputedSize = function () {
        if (this.isTextNode()) {
            return this.parent.getComputedSize();
        }
        return this.getHaikuElement().size;
    };
    Element.prototype.getComputedLayout = function () {
        var targetNode = this.getLiveRenderedNode() || {}; // Fallback in case of render race
        var parentNode = (this.parent && this.parent.getLiveRenderedNode()) || {}; // Fallback in case of render race
        return HaikuElement.computeLayout({
            // We need the layout spec which is *produced by this module* as opposed to the
            // layout spec mutated on the node during rendering/property application, because
            // this module's layout spec represents a "snapshot in time" that we can safely
            // transform without resulting in exponentially-accumulating value-updates.
            // (If we pass the actual live rendered node, resizing the stage goes crazy.)
            layout: this.getLayoutSpec(),
            // But we still need the live node's actual properties in case we need to compute
            // auto sizing, which will require that we hydrate a HaikuElement and recurse
            // into its children and compute their sizes, and so-on.
            elementName: targetNode.elementName,
            attributes: targetNode.attributes,
            children: (targetNode.__memory && targetNode.__memory.children) || targetNode.children,
            __memory: targetNode.__memory,
        }, {
            layout: {
                computed: {
                    matrix: Layout3D.createMatrix(),
                    bounds: (this.parent && this.parent.getHaikuElement().computeContentBounds()) || {},
                    size: (this.parent && this.parent.getComputedSize()) || this.getComputedSize(),
                },
            },
            elementName: parentNode.elementName,
            attributes: parentNode.attributes,
            children: parentNode.children,
            __memory: parentNode.__memory,
        });
    };
    Element.prototype.getLayoutSpec = function () {
        var bytecode = this.component.getReifiedBytecode();
        var hostInstance = this.component.$instance;
        // Race condition when converting elements on stage to components
        if (!hostInstance) {
            return Layout3D.createLayoutSpec();
        }
        var componentId = this.getComponentId();
        var elementName = Element.safeElementName(this.getStaticTemplateNode());
        var elementNode = hostInstance.findElementsByHaikuId(componentId)[0];
        var timelineName = this.component.getCurrentTimelineName();
        var timelineTime = this.component.getCurrentTimelineTime();
        var propertiesBase = TimelineProperty.getPropertiesBase(bytecode.timelines, timelineName, componentId) || {};
        var grabValue = function (outputName) {
            var computedValue = hostInstance.grabValue(timelineName, componentId, elementNode, outputName, propertiesBase[outputName], timelineTime, !hostInstance.shouldPerformFullFlush(), // isPatchOperation
            true).computedValue;
            if (computedValue === undefined || computedValue === null) {
                return TimelineProperty.getFallbackValue(elementName, outputName);
            }
            return computedValue;
        };
        return {
            shown: grabValue('shown'),
            opacity: grabValue('opacity'),
            offset: {
                x: grabValue('offset.x'),
                y: grabValue('offset.y'),
                z: grabValue('offset.z'),
            },
            origin: {
                x: grabValue('origin.x'),
                y: grabValue('origin.y'),
                z: grabValue('origin.z'),
            },
            translation: {
                x: grabValue('translation.x'),
                y: grabValue('translation.y'),
                z: grabValue('translation.z'),
            },
            rotation: {
                x: grabValue('rotation.x'),
                y: grabValue('rotation.y'),
                z: grabValue('rotation.z'),
            },
            scale: {
                x: grabValue('scale.x'),
                y: grabValue('scale.y'),
                z: grabValue('scale.z'),
            },
            shear: {
                xy: grabValue('shear.xy'),
                xz: grabValue('shear.xz'),
                yz: grabValue('shear.yz'),
            },
            sizeMode: {
                x: grabValue('sizeMode.x'),
                y: grabValue('sizeMode.y'),
                z: grabValue('sizeMode.z'),
            },
            sizeProportional: {
                x: grabValue('sizeProportional.x'),
                y: grabValue('sizeProportional.y'),
                z: grabValue('sizeProportional.z'),
            },
            sizeDifferential: {
                x: grabValue('sizeDifferential.x'),
                y: grabValue('sizeDifferential.y'),
                z: grabValue('sizeDifferential.z'),
            },
            sizeAbsolute: {
                x: grabValue('sizeAbsolute.x'),
                y: grabValue('sizeAbsolute.y'),
                z: grabValue('sizeAbsolute.z'),
            },
        };
    };
    Element.prototype.getBoundingBoxPoints = function () {
        var layout = this.getComputedLayout();
        var w = layout.size.x;
        var h = layout.size.y;
        return [
            { x: 0, y: 0, z: 0 }, { x: w / 2, y: 0, z: 0 }, { x: w, y: 0, z: 0 },
            { x: 0, y: h / 2, z: 0 }, { x: w / 2, y: h / 2, z: 0 }, { x: w, y: h / 2, z: 0 },
            { x: 0, y: h, z: 0 }, { x: w / 2, y: h, z: 0 }, { x: w, y: h, z: 0 },
        ];
    };
    Element.prototype.getBoxPointsTransformed = function () {
        return HaikuElement.transformPointsInPlace(this.getBoundingBoxPoints(), this.getOriginOffsetComposedMatrix());
    };
    Element.prototype.getOriginNotTransformed = function () {
        var _this = this;
        return this.cache.fetch('getOriginNotTransformed', function () {
            var layout = _this.getComputedLayout();
            return {
                x: layout.size.x * layout.origin.x,
                y: layout.size.y * layout.origin.y,
                z: layout.size.z * layout.origin.z,
            };
        });
    };
    Element.prototype.getOriginTransformed = function () {
        var _this = this;
        return this.cache.fetch('getOriginTransformed', function () {
            return HaikuElement.transformPointInPlace(_this.getOriginNotTransformed(), _this.getOriginOffsetComposedMatrix());
        });
    };
    Element.prototype.getOriginOffsetComposedMatrix = function () {
        var _this = this;
        return this.cache.fetch('getOriginOffsetComposedMatrix', function () {
            return Layout3D.multiplyArrayOfMatrices(_this.getComputedLayoutAncestry().reverse().map(function (layout) { return layout.matrix; }));
        });
    };
    Element.prototype.getAncestry = function () {
        var ancestors = []; // We'll build a list with the original ancestor first and our node last
        getAncestry(ancestors, this);
        return ancestors;
    };
    Element.prototype.getComputedLayoutAncestry = function () {
        return this.getAncestry().map(function (ancestor) {
            return ancestor.getComputedLayout();
        });
    };
    Element.prototype.getPropertyKeyframesObject = function (propertyName) {
        var bytecode = this.component.getReifiedBytecode();
        return TimelineProperty.getPropertySegmentsBase(bytecode.timelines, this.component.getCurrentTimelineName(), this.getComponentId(), propertyName);
    };
    Element.prototype.computePropertyValue = function (propertyName, fallbackValue) {
        var bytecode = this.component.getReifiedBytecode();
        var host = this.component.$instance;
        var states = (host && host.getStates()) || {};
        var computed = TimelineProperty.getComputedValue(this.getComponentId(), Element.safeElementName(this.getStaticTemplateNode()), propertyName, this.component.getCurrentTimelineName(), this.component.getCurrentTimelineTime(), fallbackValue, bytecode, host, states);
        // Re: the scale NaN/Infinity issue on a freshly instantiated component module,
        // The problem is probably upstream of here in core or ActiveComponent
        return computed;
    };
    Element.prototype.computePropertyGroupValueFromGroupDelta = function (propertyGroupDelta) {
        var propertyGroupValue = {};
        for (var propertyName in propertyGroupDelta) {
            var existingPropertyValue = this.computePropertyValue(propertyName, 0);
            var deltaPropertyValue = propertyGroupDelta[propertyName].value;
            if (isNumeric(existingPropertyValue) && isNumeric(deltaPropertyValue)) {
                propertyGroupValue[propertyName] = {
                    value: MathUtils.rounded(existingPropertyValue + deltaPropertyValue),
                };
            }
            else {
                propertyGroupValue[propertyName] = {
                    value: existingPropertyValue,
                };
            }
        }
        return propertyGroupValue;
    };
    Element.prototype.remove = function () {
        this.destroy();
        var row = this.getHeadingRow();
        if (row) {
            row.delete();
        }
        this.emit('update', 'element-removed');
    };
    Element.prototype.isRepeater = function () {
        var rkfs = this.getRepeaterKeyframes();
        return !!(rkfs && Object.keys(rkfs).length > 0);
    };
    Element.prototype.getRepeaterKeyframes = function () {
        return this.getPropertyKeyframesObject('controlFlow.repeat');
    };
    Element.prototype.isTextNode = function () {
        return typeof this.getStaticTemplateNode() === 'string';
    };
    Element.prototype.isComponent = function () {
        return !!this.getHostedComponentBytecode();
    };
    Element.prototype.isNonRenderedComponent = function () {
        var bytecode = this.getHostedComponentBytecode();
        if (!bytecode) { // Not even a component
            return false;
        }
        if (!bytecode.metadata) {
            return false;
        }
        return !!bytecode.metadata.nonrendered;
    };
    Element.prototype.isExternalComponent = function () {
        if (!this.isComponent()) {
            return false;
        }
        return !this.isLocalComponent();
    };
    Element.prototype.isLocalComponent = function () {
        if (!this.isComponent()) {
            return false;
        }
        var sourceAttr = this.getSource();
        // Like npm, assume dot-paths equate to a local component
        return sourceAttr && sourceAttr[0] === '.';
    };
    Element.prototype.getSource = function () {
        var node = this.getStaticTemplateNode();
        return node && node.attributes && node.attributes[HAIKU_SOURCE_ATTRIBUTE];
    };
    Element.prototype.getHostedComponentBytecode = function () {
        if (this.isTextNode()) {
            return null;
        }
        var node = this.getStaticTemplateNode();
        if (!node) {
            return null;
        }
        var elementName = node.elementName;
        if (!elementName) {
            return null;
        }
        if (typeof elementName !== 'object') {
            return null;
        }
        return elementName;
    };
    Element.prototype.getTitle = function () {
        if (this.isTextNode()) {
            return '<text>';
        } // HACK, but not sure what else to do
        return this.getStaticTemplateNode().attributes[HAIKU_TITLE_ATTRIBUTE] || "<".concat(this.getNameString(), ">");
    };
    Element.prototype.setTitle = function (newTitle, metadata, cb) {
        this.component.setTitleForComponent(this.getComponentId(), newTitle, metadata, cb);
    };
    Element.prototype.getNameString = function () {
        if (this.isTextNode()) {
            return '<text>';
        } // HACK, but not sure what else to do
        if (this.isComponent()) {
            return 'div';
        } // this tends to be the default
        var node = this.getStaticTemplateNode();
        if (node) {
            return node.elementName;
        }
        return 'div';
    };
    Element.prototype.getSafeDomFriendlyName = function () {
        // If this element is component, then start by populating standard DOM properties
        var elementName = (this.isComponent())
            ? 'div'
            : this.getNameString();
        return elementName;
    };
    Element.prototype.getComponentId = function () {
        return this.componentId;
    };
    Element.prototype.getGraphAddress = function () {
        return this.address;
    };
    Element.prototype.updateTargetingRows = function (updateEventName) {
        this.getAllRows().forEach(function (row) {
            row.emit('update', updateEventName);
        });
    };
    Element.prototype.getAllRows = function () {
        return Row.where({ component: this.component, element: this });
    };
    Object.defineProperty(Element.prototype, "isVisuallySelectable", {
        get: function () {
            return this.parent && this.parent.isRootElement();
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Element.prototype, "topmostHeadingRow", {
        get: function () {
            var headingRow = this.getHeadingRow();
            if (!this.parent) {
                return headingRow;
            }
            if (headingRow) {
                // TODO: since we are [not displaying][1] <g> elements, we _need_ to set
                // their `_isExpanded` property to `true`, otherwise the nested element [will
                // not be shown][2].
                // Fix for this will be to display <g> elements, but that involves more work
                // than just showing them.
                //
                // [1]: https://github.com/HaikuTeam/mono/blob/5613bab3cc6006a72acc00c99bf42d723c01ed74/packages/haiku-serialization/src/bll/Property.js#L241
                // [2]: https://github.com/HaikuTeam/mono/blob/65cbfd8e0f2d32ac285c84a45753d741cf2d421b/packages/haiku-timeline/src/components/RowManager.js#L106-L107
                headingRow.parent.silentlyExpandAllGParents();
                return headingRow;
            }
            return this.parent.topmostHeadingRow;
        },
        enumerable: false,
        configurable: true
    });
    Element.prototype.shouldBeDisplayed = function () {
        return (!this.isTextNode() &&
            !this.isShimElement() &&
            this._clusterAndPropertyRows.length);
    };
    Element.prototype.getHostedPropertyRows = function (doRecurse) {
        if (doRecurse === void 0) { doRecurse = false; }
        var rows = [];
        var headingRow = this.getHeadingRow();
        if (headingRow) {
            rows.push(headingRow);
            if (headingRow.children) {
                headingRow.children.forEach(function (childRow) {
                    if (childRow.isCluster() || childRow.isProperty()) {
                        rows.push(childRow);
                        if (childRow.children) {
                            childRow.children.forEach(function (grandchildRow) {
                                rows.push(grandchildRow);
                            });
                        }
                    }
                });
            }
        }
        if (doRecurse && experimentIsEnabled(Experiment.ShowSubElementsInJitMenu)) {
            var deeprows_1 = [];
            this.visitDescendants(function (descendantElement) {
                if (!descendantElement.shouldBeDisplayed()) {
                    return;
                }
                var currentHeadingRow = descendantElement.topmostHeadingRow || headingRow;
                var subrows = descendantElement
                    .getHostedPropertyRows(false)
                    .filter(function (row) { return row.shouldBeDisplayed(currentHeadingRow); });
                deeprows_1.push.apply(deeprows_1, subrows);
            });
            rows.push.apply(rows, deeprows_1);
        }
        return rows;
    };
    Element.prototype.clearEntityCaches = function () {
        if (this.children) {
            this.children.forEach(function (element) {
                element.cache.clear();
                element.clearEntityCaches();
            });
        }
        this.getAllRows().forEach(function (row) {
            row.cache.clear();
            row.clearEntityCaches();
        });
    };
    Element.prototype.getFirstNotShimParent = function (current) {
        if (current === void 0) { current = this; }
        if (!current.parent || !current.parent.isShimElement()) {
            return current.parent;
        }
        return current.getFirstNotShimParent(current.parent);
    };
    Element.prototype.rehydrateRows = function (options) {
        var _this = this;
        if (options === void 0) { options = {}; }
        if (options.superficial ||
            process.env.HAIKU_SUBPROCESS !== 'timeline') {
            return;
        }
        var existingRows = this.getAllRows();
        existingRows.forEach(function (row) { return row.mark(); });
        // tslint:disable-next-line:no-this-assignment
        var element = this;
        var component = this.component;
        var timeline = this.component.getCurrentTimeline();
        var parent = this.getFirstNotShimParent();
        var parentElementHeadingRow = parent && parent.getHeadingRow();
        var currentElementHeadingRow = Row.upsert({
            uid: Row.buildHeadingUid(component, element),
            parent: parentElementHeadingRow,
            element: element,
            component: component,
            timeline: timeline,
            children: [],
            property: null,
            cluster: null,
        }, {});
        if (parentElementHeadingRow) {
            parentElementHeadingRow.insertChild(currentElementHeadingRow);
        }
        this._headingRow = currentElementHeadingRow;
        this._clusterAndPropertyRows = [];
        var clusters = {};
        this.hasAddressableProperties = false;
        this.eachAddressableProperty(function (propertyGroupDescriptor, addressableName) {
            _this.hasAddressableProperties = true;
            if (propertyGroupDescriptor.cluster) {
                // Properties that are 'clustered', like rotation.x,y,z
                var clusterId = Row.buildClusterUid(_this, element, propertyGroupDescriptor);
                var clusterRow = void 0;
                if (clusters[clusterId]) {
                    clusterRow = Row.findById(clusterId);
                }
                else {
                    clusterRow = Row.upsert({
                        uid: clusterId,
                        element: element,
                        component: component,
                        timeline: timeline,
                        parent: currentElementHeadingRow,
                        children: [],
                        property: null, // This null is used to determine isClusterHeading
                        cluster: propertyGroupDescriptor.cluster,
                    }, {});
                    _this._clusterAndPropertyRows.push(clusterRow);
                    currentElementHeadingRow.insertChild(clusterRow);
                    clusters[clusterId] = true;
                }
                var clusterMember = Row.upsert({
                    uid: Row.buildClusterMemberUid(_this, element, propertyGroupDescriptor, addressableName),
                    element: element,
                    component: component,
                    timeline: timeline,
                    parent: clusterRow,
                    children: [],
                    property: propertyGroupDescriptor,
                    cluster: propertyGroupDescriptor.cluster,
                }, {});
                _this._clusterAndPropertyRows.push(clusterMember);
                clusterMember.rehydrate();
                clusterRow.insertChild(clusterMember);
            }
            else {
                // Properties represented as a single row, like 'opacity'
                var propertyRow = Row.upsert({
                    uid: Row.buildPropertyUid(_this, element, addressableName),
                    element: element,
                    component: component,
                    timeline: timeline,
                    parent: currentElementHeadingRow,
                    children: [],
                    property: propertyGroupDescriptor,
                    cluster: null,
                }, {});
                _this._clusterAndPropertyRows.push(propertyRow);
                propertyRow.rehydrate();
                currentElementHeadingRow.insertChild(propertyRow);
            }
        });
        existingRows.forEach(function (row) { return row.sweep(); });
    };
    Element.prototype.visitAll = function (iteratee) {
        Element.visitAll(this, iteratee);
    };
    Element.prototype.visitDescendants = function (iteratee) {
        Element.visitDescendants(this, iteratee);
    };
    Element.prototype.getAllChildren = function () {
        return this.children || [];
    };
    Element.prototype.rehydrateChildren = function (_a) {
        var maxRehydrationDepth = _a.maxRehydrationDepth;
        var node = this.getStaticTemplateNode();
        if (typeof node.elementName === 'object') {
            return;
        }
        if (node && node.children) {
            for (var i = 0; i < node.children.length; i++) {
                var child = node.children[i];
                var element = Element.upsertElementFromVirtualElement(this.component, // component
                child, // staticTemplateNode
                this, // parent element
                i, // index in parent
                "".concat(this.getGraphAddress(), ".").concat(i));
                // If our node is replacing an existing one, we can grab its properties
                if (child.__replacee) {
                    var replaceeHaikuId = child.__replacee.attributes && child.__replacee.attributes[HAIKU_ID_ATTRIBUTE];
                    if (replaceeHaikuId) {
                        var replaceeElement = Element.findByComponentAndHaikuId(this.component, replaceeHaikuId);
                        if (replaceeElement) {
                            // This ensures that the timeline displays correct JIT sub-element rows even after a design merge
                            element._visibleProperties = replaceeElement._visibleProperties;
                        }
                    }
                    // Don't forget to clean up to avoid possible weird side effects
                    delete child.__replacee;
                }
                element.rehydrate({ maxRehydrationDepth: maxRehydrationDepth });
            }
        }
    };
    Element.prototype.rehydrate = function (_a) {
        var maxRehydrationDepth = _a.maxRehydrationDepth;
        if (this.getDepthAmongElements() <= maxRehydrationDepth ||
            (experimentIsEnabled(Experiment.ShowSubElementsInJitMenu) &&
                this.hasInternalPropertiesDefinedCached())) {
            this.rehydrateChildren({ maxRehydrationDepth: maxRehydrationDepth });
        }
    };
    /**
     * @description Returns true/false whether this element contains any elements
     * that have any keyframes defined, without relying on the presence of hydrated
     * models for any of those elements (it uses the raw template).
     */
    Element.prototype.hasInternalPropertiesDefined = function () {
        var selectors = {};
        var node = this.getStaticTemplateNode();
        Template.visitWithoutDescendingIntoSubcomponents(node, function (subnode) {
            if (node === subnode) {
                return;
            }
            var selector = TimelineProperty.getSelectorForComponentId(subnode.attributes[HAIKU_ID_ATTRIBUTE]);
            selectors[selector] = subnode;
        });
        if (Object.keys(selectors).length < 1) {
            return false;
        }
        var bytecode = this.component.getReifiedBytecode();
        if (!bytecode || !bytecode.timelines) {
            return false;
        }
        for (var timelineName in bytecode.timelines) {
            for (var selector in bytecode.timelines[timelineName]) {
                var subnode = selectors[selector];
                if (!subnode) {
                    continue;
                }
                for (var propertyName in bytecode.timelines[timelineName][selector]) {
                    var keyframesObject = bytecode.timelines[timelineName][selector][propertyName];
                    if (Property.areAnyKeyframesDefined(subnode.elementName, propertyName, keyframesObject)) {
                        return true;
                    }
                }
            }
        }
        // If we got this far, we've found no evidence that any internal node has a property
        return false;
    };
    Element.prototype.hasInternalPropertiesDefinedCached = function () {
        var _this = this;
        return this.cache.fetch('hasInternalPropertiesDefinedCached', function () {
            return _this.hasInternalPropertiesDefined();
        });
    };
    Element.prototype.getDepthAmongElements = function () {
        var depth = 0;
        var parent = this.parent;
        while (parent) {
            depth += 1;
            parent = parent.parent;
        }
        return depth;
    };
    Element.prototype.getBuiltinAddressables = function () {
        var builtinAddressables = {};
        // This assigns so-called 'cluster' properties if any are deemed such
        Property.assignDOMSchemaProperties(builtinAddressables, this);
        return builtinAddressables;
    };
    Element.prototype.getComponentAddressables = function () {
        var componentAddressables = {};
        // If this is a component, then add any of our componentAddressables states as builtinAddressables
        if (this.isComponent()) {
            var node = this.getLiveRenderedNode();
            if (node && node.elementName && node.elementName.states) {
                for (var name_3 in node.elementName.states) {
                    var state = node.elementName.states[name_3];
                    componentAddressables[name_3] = {
                        name: name_3,
                        type: 'state',
                        prefix: name_3,
                        suffix: undefined,
                        fallback: state.value,
                        typedef: state.type,
                        mock: state.mock,
                    };
                }
            }
        }
        return componentAddressables;
    };
    Element.prototype.getCompleteAddressableProperties = function () {
        var builtinAddressables = this.getBuiltinAddressables();
        var componentAddressables = this.getComponentAddressables();
        var returnedAddressables = {};
        for (var key1 in builtinAddressables) {
            returnedAddressables[key1] = builtinAddressables[key1];
        }
        for (var key2 in componentAddressables) {
            returnedAddressables[key2] = componentAddressables[key2];
        }
        return returnedAddressables;
    };
    // options: [
    //   {
    //     label: 'hi',
    //     options: [
    //       {
    //         value: '123',
    //         label: 'hello'
    //       }
    //     ]
    //   }
    // ]
    Element.prototype.getJITPropertyOptions = function () {
        var _this = this;
        if (this.isNonRenderedComponent()) {
            return [];
        }
        var exclusions = this.getExcludedAddressableProperties();
        // Because of bad code, I have to explicitly collect addressable properties for
        // sub-elements that wouldn't be shown in the JIT menu otherwise
        if (this.getDepthAmongElements() > 1) {
            var complete = this.getCompleteAddressableProperties();
            for (var key in complete) {
                if (!this._visibleProperties[key]) {
                    exclusions[key] = complete[key];
                }
            }
        }
        var grouped = {};
        for (var propertyName in exclusions) {
            var propertyObj = exclusions[propertyName];
            if (!Property.includeInJIT(propertyName, this, propertyObj, null)) {
                continue;
            }
            var prefix = propertyObj.prefix;
            var suffix = propertyObj.suffix;
            if (!grouped[prefix]) {
                grouped[prefix] = {
                    element: this,
                    prefix: prefix,
                    suffix: suffix,
                    label: Property.humanizePropertyNamePart(prefix),
                };
            }
            if (suffix) {
                if (!grouped[prefix].options) {
                    grouped[prefix].options = [];
                }
                grouped[prefix].options.push({
                    element: this,
                    prefix: prefix,
                    suffix: suffix,
                    label: Property.humanizePropertyNamePart(suffix),
                    value: propertyObj.name,
                });
            }
            else {
                grouped[prefix].value = propertyObj.name;
            }
        }
        if (experimentIsEnabled(Experiment.ShowSubElementsInJitMenu)) {
            // Expose properties of our sub-element in the timeline
            if (!this.isRootElement() && !this.isComponent()) {
                if (this.children && this.children.length > 0) {
                    this.children.forEach(function (child) {
                        var name = child.getSafeDomFriendlyName();
                        // Exclude elements that are either 'useless' or should be
                        // represented elsewhere in the displayed element tree,
                        // or which don't warrant display at all (text nodes)
                        if (!Property.BUILTIN_DOM_SCHEMAS[name] ||
                            child.isTextNode()) {
                            return false;
                        }
                        // Don't include useless children, and collapse sets of useless
                        // children into a single node, to keep the menu as simple as we can
                        var insert = _this.grabNextUsefulMenuInsert(child);
                        if (insert) {
                            var key = insert.key, label = insert.label, options = insert.options, element = insert.element;
                            grouped[key] = {
                                type: 'element',
                                element: element,
                                // Alpha ordering HACK; see groupedOptionsObjectToList
                                prefix: "zzzzz_element_".concat(label),
                                label: "\u2039\u203A ".concat(label),
                                options: options,
                            };
                        }
                    });
                }
            }
        }
        var list = this.groupedOptionsObjectToList(grouped);
        return list;
    };
    Element.prototype.grabNextUsefulMenuInsert = function (child) {
        if (child.isTextNode()) {
            return null;
        }
        var options = child.getJITPropertyOptions();
        if (options.length === 1 && options[0].type === 'element') {
            return this.grabNextUsefulMenuInsert(options[0].element);
        }
        var key = child.getPrimaryKey();
        var label = child.getFriendlyLabel();
        return {
            key: key,
            label: label,
            options: options,
            element: child,
        };
    };
    Element.prototype.eachAddressableProperty = function (iteratee) {
        var addressableProperties = this.getDisplayedAddressableProperties();
        for (var propertyName in addressableProperties) {
            if (addressableProperties[propertyName]) {
                iteratee(addressableProperties[propertyName], propertyName);
            }
        }
    };
    Element.prototype.groupedOptionsObjectToList = function (grouped) {
        var options = Object.values(grouped).sort(function (a, b) {
            var ap = a.prefix.toLowerCase();
            var bp = b.prefix.toLowerCase();
            if (ap < bp) {
                return -1;
            }
            if (ap > bp) {
                return 1;
            }
            return 0;
        });
        return options;
    };
    Element.prototype.getFriendlyLabel = function () {
        var node = this.getStaticTemplateNode();
        return Element.getFriendlyLabel(node);
    };
    Element.prototype.getJITPropertyOptionsAsMenuItems = function () {
        var options = this.getJITPropertyOptions();
        return this.optionsToItems(options);
    };
    Element.prototype.optionsToItems = function (options) {
        var _this = this;
        return options.map(function (option) {
            var item = {
                label: option.label,
            };
            if (option.options) {
                item.submenu = _this.optionsToItems(option.options);
            }
            else {
                item.onClick = function () {
                    // "showing" the addressable property means to add it to our whitelist,
                    // which results in the Timeline UI displaying it even if not in the
                    // hardcoded list of always-public properties
                    option.element.showAddressableProperty(option.value);
                };
            }
            return item;
        });
    };
    Element.prototype.getExcludedAddressableProperties = function () {
        return this.getCollatedAddressableProperties().excluded;
    };
    Element.prototype.getDisplayedAddressableProperties = function () {
        return this.getCollatedAddressableProperties().filtered;
    };
    Element.prototype.getExplicitlyVisibleAddressableProperties = function () {
        var complete = this.getCompleteAddressableProperties();
        var filtered = {};
        for (var propertyName in complete) {
            if (this._visibleProperties[propertyName]) {
                filtered[propertyName] = complete[propertyName];
            }
        }
        return filtered;
    };
    Element.prototype.getCollatedAddressableProperties = function () {
        var complete = this.getCompleteAddressableProperties();
        // The ones to display in the timeline
        var filtered = {};
        // The ones to exclude from the timeline, but show in the JIT menu
        var excluded = {};
        for (var propertyName in complete) {
            var propertyObject = complete[propertyName];
            Property.buildFilterObject(filtered, this, // hostElement
            propertyName, propertyObject);
            // Make sure to list any exclusions we did
            if (!filtered[propertyName]) {
                excluded[propertyName] = propertyObject;
            }
        }
        return {
            filtered: filtered,
            excluded: excluded,
        };
    };
    Element.prototype.showAddressableProperty = function (propertyName) {
        this._visibleProperties[propertyName] = true;
        this.rehydrateRows();
        var row = this.getPropertyRowByPropertyName(propertyName);
        if (row) {
            if (row.isWithinCollapsedRow()) {
                row.parent.expand(this.component.project.getMetadata());
            }
            row.select(this.component.project.getMetadata());
        }
        this.emit('update', 'jit-property-added');
    };
    Element.prototype.hideAddressableProperty = function (propertyName) {
        this._visibleProperties[propertyName] = false;
        this.emit('update', 'jit-property-removed');
    };
    Element.prototype.isRootElement = function () {
        return !this.parent;
    };
    Element.prototype.getBoxPolygonPointsTransformed = function () {
        var points = this.getBoxPointsTransformed();
        return Element.pointsToPolygonPoints(points);
    };
    Element.prototype.doesOverlapWithBox = function (box) {
        var theirPoints = Element.boxToCornersAsPolygonPoints(box);
        var ourPoints = this.getBoxPolygonPointsTransformed();
        return polygonOverlap(theirPoints, ourPoints);
    };
    /**
     * DANGER
     * The methods below rely on the player having rendered the component;
     * race conditions abound
     */
    Element.prototype.getLiveRenderedNode = function () {
        // We query our "host" instance to get our wrapper node that it "hosts"
        // Note the difference from the target instance
        var instance = this.getCoreHostComponentInstance();
        // FIXME: Handle race when component instance isn't present
        return instance ? instance.findElementsByHaikuId(this.getComponentId())[0] : null;
    };
    Element.prototype.getHaikuElement = function () {
        return HaikuElement.findOrCreateByNode(this.getLiveRenderedNode());
    };
    Element.prototype.getParentSvgElement = function () {
        // tslint:disable-next-line:no-this-assignment
        var currElem = this;
        while (currElem) {
            if (currElem.getNameString() === 'svg') {
                return currElem;
            }
            currElem = currElem.parent;
        }
        return null;
    };
    Element.prototype.getUngroupables = function () {
        var haikuElement = this.getHaikuElement();
        switch (haikuElement.tagName) {
            case 'svg':
            case 'div':
                var ungroupables_1 = [];
                this.getHaikuElement().visit(function (descendantHaikuElement) {
                    var eligibleChildren = descendantHaikuElement.children.filter(function (element) { return element.tagName !== 'defs' && element.target && (haikuElement.tagName === 'div' || typeof element.target.getBBox === 'function'); });
                    if (eligibleChildren.length > 1) {
                        ungroupables_1.push.apply(ungroupables_1, eligibleChildren);
                        return false;
                    }
                }, function (node) { return node.tagName !== 'defs'; });
                return ungroupables_1;
            default:
                return [];
        }
    };
    Element.prototype.doesContainUngroupableContent = function () {
        return this.getUngroupables().length > 1;
    };
    Element.prototype.ungroup = function (metadata, cb) {
        if (cb === void 0) { cb = function () { }; }
        var nodes = [];
        this.ungroupWrapper(nodes);
        switch (this.getStaticTemplateNode().elementName) {
            case 'svg':
                this.ungroupSvg(nodes);
                break;
            case 'div':
                this.ungroupDiv(nodes);
                break;
            default:
                logger.warn("[element] ignoring nonsense request to ungroup ".concat(this.getStaticTemplateNode().elementName));
        }
        return this.component.ungroupElements(this.getComponentId(), nodes, metadata, cb);
    };
    Element.prototype.ungroupWrapper = function (nodes) {
        var _a;
        var haikuElement = this.getHaikuElement();
        var baseStyles = haikuElement.attributes.style;
        if (!baseStyles) {
            return;
        }
        var style = {};
        Object.keys(baseStyles).forEach(function (styleName) {
            switch (styleName) {
                case 'background':
                case 'backgroundColor':
                    style[styleName] = baseStyles[styleName];
            }
        });
        if (Object.keys(style).length === 0) {
            // We didn't find any styles that would justify ungrouping the wrapper.
            return;
        }
        // Upsert the wrapper div the styles on this node "imply".
        var attributes = Object.assign((_a = {
                width: haikuElement.layout.size.x,
                height: haikuElement.layout.size.y
            },
            _a[HAIKU_SOURCE_ATTRIBUTE] = haikuElement.attributes[HAIKU_SOURCE_ATTRIBUTE],
            _a), { style: style });
        var layoutMatrix = this.getOriginOffsetComposedMatrix();
        var originX = haikuElement.layout.size.x / 2;
        var originY = haikuElement.layout.size.y / 2;
        layoutMatrix[12] += originX * layoutMatrix[0] + originY * layoutMatrix[4];
        layoutMatrix[13] += originX * layoutMatrix[1] + originY * layoutMatrix[5];
        composedTransformsToTimelineProperties(attributes, [layoutMatrix]);
        nodes.push(Template.cleanMana({
            elementName: 'svg',
            attributes: attributes,
            children: [{
                    elementName: 'rect',
                    attributes: {
                        width: haikuElement.layout.size.x,
                        height: haikuElement.layout.size.y,
                        fill: 'none',
                        stroke: 'none',
                    },
                }],
        }, { resetIds: true }));
    };
    Element.prototype.ungroupDiv = function (nodes) {
        this.getUngroupables().forEach(function (haikuElement) {
            var _a;
            var layoutMatrix = Layout3D.multiplyArrayOfMatrices(
            // Under unknown conditions, some elements lack a layout.matrix,
            // which causes a crash during ungroup; hence this filter
            haikuElement.layoutAncestryMatrices.reverse().filter(function (m) { return !!m; }));
            var layout = haikuElement.layout;
            var attributes = (_a = {
                    width: layout.size.x,
                    height: layout.size.y
                },
                _a[HAIKU_TITLE_ATTRIBUTE] = haikuElement.attributes[HAIKU_TITLE_ATTRIBUTE],
                _a[HAIKU_SOURCE_ATTRIBUTE] = haikuElement.attributes[HAIKU_SOURCE_ATTRIBUTE],
                _a['origin.x'] = layout.origin.x,
                _a['origin.y'] = layout.origin.y,
                _a['haiku-transclude'] = haikuElement.getComponentId(),
                _a);
            composedTransformsToTimelineProperties(attributes, [layoutMatrix]);
            // Make sure we have something here, so we can add to it.
            if (!attributes['translation.x']) {
                attributes['translation.x'] = 0;
            }
            if (!attributes['translation.y']) {
                attributes['translation.y'] = 0;
            }
            // Add our origin offset directly to the derived translation.
            var originX = layout.size.x * layout.origin.x;
            var originY = layout.size.y * layout.origin.y;
            // Ensure SVGs have overflow: visible.
            if (haikuElement.tagName === 'svg') {
                attributes.style = { overflow: 'visible' };
                // (1 of 3) opacity is "special". Make sure it is preserved.
                if (haikuElement.layout.opacity !== 1) {
                    attributes.opacity = haikuElement.layout.opacity;
                }
            }
            attributes['translation.x'] += originX * layoutMatrix[0] + originY * layoutMatrix[4];
            attributes['translation.y'] += originX * layoutMatrix[1] + originY * layoutMatrix[5];
            nodes.push({
                // Important: ensure we can serialize the node mana if we encounter a component.
                // #FIXME: Why isn't haikuElement.isComponent() correct, and why is the component pseudo tag name 'div'?
                elementName: typeof haikuElement.type !== 'string' ? '__component__' : haikuElement.tagName,
                attributes: attributes,
                children: [],
            });
        });
    };
    Element.prototype.ungroupSvg = function (nodes) {
        var _this = this;
        var defs = [];
        var extraNodes = [];
        var svgElement = this.getHaikuElement();
        var ungroupables = this.getUngroupables();
        var bytecode = this.component.getReifiedBytecode();
        // First isolate defs 'n' friends.
        svgElement.visit(function (descendantHaikuElement) {
            if (descendantHaikuElement.tagName === 'style' && descendantHaikuElement.memory && descendantHaikuElement.memory.children) {
                var styleNode = Template.cleanMana(lodash.cloneDeep(descendantHaikuElement.node), { resetIds: true });
                styleNode.children = [descendantHaikuElement.memory.children[0]];
                extraNodes.push(styleNode);
            }
            else if ((descendantHaikuElement.parent && descendantHaikuElement.parent.tagName === 'defs') ||
                DEFABLE_TAG_NAMES[descendantHaikuElement.tagName]) {
                defs.push(descendantHaikuElement.node);
            }
        });
        ungroupables.forEach(function (descendantHaikuElement) {
            var _a, _b;
            var mergedAttributes = {};
            var parent = descendantHaikuElement.parent;
            while (parent && (parent.node.elementName === 'g' || parent.node.elementName === 'svg')) {
                for (var propertyName in bytecode.timelines[_this.component.getCurrentTimelineName()]["haiku:".concat(parent.componentId)]) {
                    if (!propertyName.startsWith('style') && !SVG_ONLY_ATTRIBUTES[propertyName] && !mergedAttributes.hasOwnProperty(propertyName)) {
                        mergedAttributes[propertyName] = parent.componentId;
                    }
                }
                parent = parent.parent;
            }
            var attributes = Object.keys(mergedAttributes).reduce(function (accumulator, propertyName) {
                // (2 of 3) opacity is "special". Make sure it is preserved.
                if (!LAYOUT_3D_SCHEMA.hasOwnProperty(propertyName) || propertyName === 'opacity') {
                    accumulator[propertyName] = _this.component.getComputedPropertyValue(descendantHaikuElement.node, mergedAttributes[propertyName], _this.component.getCurrentTimelineName(), _this.component.getCurrentTimelineTime(), propertyName, undefined);
                }
                return accumulator;
            }, {});
            // (3 of 3) opacity is "special". Make sure it is preserved.
            if (typeof descendantHaikuElement.opacity === 'number' && descendantHaikuElement.opacity !== 1) {
                attributes.opacity = descendantHaikuElement.opacity;
            }
            // Note the implementation details of HaikuElement#target, which actually returns
            // the most recently added target - one of a list of possible DOM targets shared by each
            // render node
            var boundingBox = descendantHaikuElement.target.getBBox();
            // The fallbacks here ensure nonzero width/height by any means necessary. SVG getBBox() (and DOM cousins)
            // all fail to account for stroke, clipping masks, etc.
            if (boundingBox.width < 1) {
                boundingBox.width = Math.max(descendantHaikuElement.attributes['stroke-width'] || attributes['stroke-width'] || 1, 1);
            }
            if (boundingBox.height < 1) {
                boundingBox.height = Math.max(descendantHaikuElement.attributes['stroke-width'] || attributes['stroke-width'] || 1, 1);
            }
            var originX = boundingBox.width / 2;
            var originY = boundingBox.height / 2;
            var layoutMatrix = descendantHaikuElement.layoutMatrix;
            layoutMatrix[12] += (boundingBox.x + originX) * layoutMatrix[0] + (boundingBox.y + originY) * layoutMatrix[4];
            layoutMatrix[13] += (boundingBox.x + originX) * layoutMatrix[1] + (boundingBox.y + originY) * layoutMatrix[5];
            var layoutAncestryMatrices = descendantHaikuElement.layoutAncestryMatrices;
            if (layoutAncestryMatrices[layoutAncestryMatrices.length - 1] !== layoutMatrix) {
                layoutAncestryMatrices.push(layoutMatrix);
            }
            descendantHaikuElement.visit(function (subHaikuElement) {
                // Clean out the computed layout so we can hoist it to the parent SVG element.
                delete subHaikuElement.node.layout;
            });
            var parentAttributes = (_a = {
                    width: boundingBox.width,
                    height: boundingBox.height,
                    // Important: in case we have borders that spill outside the bounding box, allow SVG overflow so nothing
                    // is clipped.
                    style: {
                        overflow: 'visible',
                    }
                },
                _a[HAIKU_SOURCE_ATTRIBUTE] = "".concat(svgElement.attributes[HAIKU_SOURCE_ATTRIBUTE], "#").concat(descendantHaikuElement.id),
                _a[HAIKU_TITLE_ATTRIBUTE] = descendantHaikuElement[HAIKU_TITLE_ATTRIBUTE] || descendantHaikuElement.title || descendantHaikuElement.id,
                _a);
            composedTransformsToTimelineProperties(parentAttributes, layoutAncestryMatrices);
            // The following ensures that width/height receivers we might encounter inside an SVG (rect, image, use, etc.)
            // won't lose their sizing.
            if (descendantHaikuElement.layout) {
                if (descendantHaikuElement.layout.sizeAbsolute.x > 0) {
                    descendantHaikuElement.attributes.width = descendantHaikuElement.layout.sizeAbsolute.x;
                }
                if (descendantHaikuElement.layout.sizeAbsolute.y) {
                    descendantHaikuElement.attributes.height = descendantHaikuElement.layout.sizeAbsolute.y;
                }
            }
            // In this very special mana construct, we:
            //   - Offset the translation of the ungrouped SVG element by the render-time bounding box. This allows us
            //     to bypass otherwise necessary recomputation of things like path vertices in a new coordinate system.
            //   - Transclude the children of our descendant node to ensure any existing timeline properties are
            //     preserved.
            var node = Template.cleanMana({
                elementName: 'svg',
                attributes: parentAttributes,
                children: [{
                        elementName: 'g',
                        attributes: Object.assign(attributes, {
                            transform: "translate(".concat(-MathUtils.rounded(boundingBox.x), " ").concat(-MathUtils.rounded(boundingBox.y), ")"),
                        }),
                        children: [Object.assign({}, descendantHaikuElement.node, {
                                attributes: Object.assign({
                                    'haiku-transclude': descendantHaikuElement.getComponentId(),
                                }, descendantHaikuElement.attributes),
                                children: [],
                            })],
                    }],
            }, { resetIds: true });
            if (defs.length > 0) {
                node.children.unshift(Template.cleanMana({
                    elementName: 'defs',
                    attributes: {},
                    children: defs.map(Template.reuseHotMana),
                }, 
                // Note: by resetting IDs here, we willfully destroy any animations that are inside defs. Since this is an atypical
                // construct which can only be achieved by editing bytecode directly today, it's "acceptable".
                { resetIds: true }));
            }
            (_b = node.children).unshift.apply(_b, extraNodes.map(Template.reuseHotMana));
            nodes.push(node);
        });
    };
    Element.prototype.getAttribute = function (key) {
        var node = this.getLiveRenderedNode();
        return node && node.attributes && node.attributes[key];
    };
    Element.prototype.toXMLString = function () {
        return Template.manaToHtml('', this.getLiveRenderedNode() || EMPTY_ELEMENT);
    };
    Element.prototype.toJSONString = function () {
        return Template.manaToJson(this.getLiveRenderedNode() || EMPTY_ELEMENT, null, 2);
    };
    /**
     * @method dump
     * @description When debugging, use this to log a concise shorthand of this entity.
     */
    Element.prototype.dump = function () {
        var str = "".concat(this.getNameString(), ":").concat(this.getTitle(), ":").concat(this.getComponentId());
        if (this.isHovered()) {
            str += ' {h}';
        }
        if (this.isSelected()) {
            str += ' {s}';
        }
        return str;
    };
    return Element;
}(BaseModel));
Element.DEFAULT_OPTIONS = {
    required: {
        component: true,
        uid: true,
        address: true,
        componentId: true,
    },
};
BaseModel.extend(Element);
Element.directlySelected = null;
Element.cache = {
    domNodes: {},
    eventListeners: {},
};
Element.HIGHER_ORDER_EVENTS = [
    { label: 'Hover', value: 'hover' },
    { label: 'Unhover', value: 'unhover' },
];
Element.COMPONENT_EVENTS = [
    { label: 'Will Mount', value: 'component:will-mount' },
    { label: 'Did Mount', value: 'component:did-mount' },
    { label: 'Will Unmount', value: 'component:will-unmount' },
    { label: 'Did Initialize', value: 'component:did-initialize' },
    { label: 'Frame', value: 'frame' },
];
Element.nodeIsGrouper = function (node) {
    return (node.elementName === 'svg' ||
        node.elementName === 'g' ||
        node.elementName === 'div');
};
Element.unselectAllElements = function (criteria, metadata) {
    Element.where(criteria).forEach(function (element) { return element.unselect(metadata); });
    Element.directlySelected = null;
};
Element.hoverOffAllElements = function (criteria, metadata) {
    Element.where(criteria).forEach(function (element) { return element.hoverOff(metadata); });
};
Element.clearCaches = function clearCaches() {
    Element.cache = {
        domNodes: {},
        eventListeners: {},
    };
};
Element.findDomNode = function findDomNode(haikuId, element) {
    // Allow headless, e.g. in tests
    if (!element) {
        return null;
    }
    if (Element.cache.domNodes[haikuId]) {
        return Element.cache.domNodes[haikuId];
    }
    var selector = '[' + HAIKU_ID_ATTRIBUTE + '="' + haikuId + '"]';
    var found = element.querySelector(selector);
    Element.cache.domNodes[haikuId] = found;
    return found;
};
Element.findRoots = function (criteria) {
    return Element.where(criteria).filter(function (element) {
        return !element.parent;
    });
};
/**
 * Visit all elements in the given element's family, in depth-first order.
 * The element passed is the first visit.
 */
Element.visitAll = function (element, visitor) {
    visitor(element);
    Element.visitDescendants(element, visitor);
};
/**
 * Visit the descendants of the given element in depth-first order.
 */
Element.visitDescendants = function (element, visitor) {
    if (!element.children) {
        return void (0);
    }
    element.children.forEach(function (child) {
        visitor(child);
        Element.visitDescendants(child, visitor);
    });
};
Element.getRotationIn360 = function (radians) {
    if (radians < 0) {
        radians += (Math.PI * 2);
    }
    var rotationDegrees = ~~(radians * 180 / Math.PI);
    if (rotationDegrees > 360) {
        rotationDegrees = rotationDegrees % 360;
    }
    return rotationDegrees;
};
Element.boxToCornersAsPolygonPoints = function (_a) {
    var x = _a.x, y = _a.y, width = _a.width, height = _a.height;
    return [
        [x, y], [x + width, y],
        [x + width, y + height], [x, y + height],
    ];
};
Element.pointsToPolygonPoints = function (points) {
    return points.map(function (point) {
        return [point.x, point.y];
    });
};
Element.distanceBetweenPoints = function (p1, p2, zoomFactor) {
    var distance = Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
    if (zoomFactor) {
        distance *= zoomFactor;
    }
    return distance;
};
Element.buildPrimaryKeyFromComponentParentIdAndStaticTemplateNode = function (component, parentId, indexInParent, staticTemplateNode) {
    var uid;
    if (typeof staticTemplateNode === 'string') {
        uid = "".concat(parentId, "/text:").concat(indexInParent);
    }
    else {
        uid = (staticTemplateNode.attributes && staticTemplateNode.attributes[HAIKU_ID_ATTRIBUTE]) || Math.random();
    }
    // Elements have to be created uniquely in the scope of their host component
    // or else we'll get collision lookups due to the fact that this is all a singleton system
    uid = Element.buildUidFromComponentAndHaikuId(component, uid);
    return uid;
};
Element.buildUidFromComponentAndDomElement = function (component, $el) {
    return "".concat(component.getPrimaryKey(), "::").concat($el.getAttribute(HAIKU_ID_ATTRIBUTE));
};
Element.buildUidFromComponentAndHaikuId = function (component, haikuId) {
    return "".concat(component.getPrimaryKey(), "::").concat(haikuId);
};
Element.findByComponentAndHaikuId = function (component, haikuId) {
    return Element.findById(Element.buildUidFromComponentAndHaikuId(component, haikuId));
};
Element.findHoveredElement = function (component) {
    return Element.where({ component: component, _isHovered: true })[0];
};
Element.makeUid = function (component, parent, index, staticTemplateNode) {
    var parentHaikuId = (parent &&
        parent.attributes &&
        parent.attributes[HAIKU_ID_ATTRIBUTE]);
    if (!parent) {
        parent = (parentHaikuId &&
            Element.findById(Element.buildUidFromComponentAndHaikuId(component, parentHaikuId)));
    }
    var uid = Element.buildPrimaryKeyFromComponentParentIdAndStaticTemplateNode(component, parentHaikuId, index, staticTemplateNode);
    return uid;
};
Element.getFriendlyLabel = function (node) {
    if (!node || typeof node !== 'object') {
        return '';
    }
    var id = node.attributes && node.attributes.id;
    var title = node.attributes && node.attributes[HAIKU_TITLE_ATTRIBUTE];
    var name = (typeof node.elementName === 'string' && node.elementName) ? node.elementName : 'div';
    if (Element.FRIENDLY_NAME_SUBSTITUTES[name]) {
        name = Element.FRIENDLY_NAME_SUBSTITUTES[name];
    }
    if (id && !title) {
        return cleanHaikuId(id);
    }
    var out = '';
    if (typeof id === 'string') {
        out += "".concat(id, " ");
    }
    if (typeof title === 'string') {
        out += "".concat(title, " ");
    }
    if (out.length === 0 && typeof name === 'string') {
        out += "".concat(name);
    }
    return cleanHaikuId(out);
};
Element.upsertElementFromVirtualElement = function (component, staticTemplateNode, parent, index, address) {
    if (!component.project) {
        throw new Error('component argument must have a `project` defined');
    }
    if (!component.project.getPlatform()) {
        throw new Error('component project must be able to return a platform object');
    }
    if (!component.project.getMetadata()) {
        throw new Error('component proct must be able to return a metadata object');
    }
    var uid = Element.makeUid(component, parent, index, staticTemplateNode);
    var metadata = component.project.getMetadata();
    var componentId = (typeof staticTemplateNode === 'string')
        ? uid
        : staticTemplateNode.attributes[HAIKU_ID_ATTRIBUTE];
    var element = Element.upsert({
        uid: uid,
        componentId: componentId,
        index: index,
        address: address,
        component: component,
        parent: parent,
        children: [], // We *must* unset this or else stale elements will be left, messing up rehydration
    }, metadata);
    if (parent) {
        parent.insertChild(element);
    }
    return element;
};
Element.querySelectorAll = function (selector, mana) {
    return cssQueryTree(mana, selector, {
        name: 'elementName',
        attributes: 'attributes',
        children: 'children',
    });
};
Element.FRIENDLY_NAME_SUBSTITUTES = {
    g: 'group',
    tspan: 'Text Span',
};
// If elementName is bytecode (i.e. a nested component) return a fallback name
// used for a bunch of lookups, otherwise return the given string element name
Element.safeElementName = function (mana) {
    if (!mana || typeof mana !== 'object') {
        return 'div';
    }
    // If bytecode, the fallback name is div
    if (mana.elementName && typeof mana.elementName === 'object') {
        return 'div'; // TODO: How will this bite us?
    }
    return mana.elementName;
};
Element.deselectAllOtherElements = function (criteria, target, metadata) {
    Element.where(Object.assign({ _isSelected: true }, criteria)).forEach(function (element) {
        if (element.getComponentId() !== target.getComponentId()) {
            element.unselect(metadata, true);
        }
    });
};
module.exports = Element;
// Down here to avoid Node circular dependency stub objects. #FIXME
var Bytecode = require('./Bytecode');
var MathUtils = require('./MathUtils');
var Property = require('./Property');
var Row = require('./Row');
var Template = require('./Template');
var TimelineProperty = require('./TimelineProperty');
var ElementSelectionProxy = require('./ElementSelectionProxy');
//# sourceMappingURL=Element.js.map