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
var HaikuComponent = require('@haiku/core/lib/HaikuComponent').default;
var expressionToRO = require('@haiku/core/lib/reflection/expressionToRO').default;
var Curve = require('@haiku/core/lib/api').Curve;
var isDecomposableCurve = require('haiku-formats/lib/exporters/curves').isDecomposableCurve;
var getCurveInterpolationPoints = require('haiku-formats/lib/exporters/curves').getCurveInterpolationPoints;
var BaseModel = require('./BaseModel');
/**
 * @class Keyframe
 * @description
 *  Abstraction over the raw representation of keyframes in bytecode.
 *  Helps with the following:
 *    - Managing state changes between keyframes: selected, dragging, etc.
 *    - Makes complicated actions like dragging multiple keyframes easy
 *    - Handling model updates like changing curves, changing the ms time, etc.
 *    - Has some logic for color changes that probably should be moved #FIXME
 */
var Keyframe = /** @class */ (function (_super) {
    __extends(Keyframe, _super);
    function Keyframe(props, opts) {
        var _this = _super.call(this, props, opts) || this;
        _this._selected = false;
        _this._selectedBody = false;
        _this._activated = false;
        _this._dragStartPx = null;
        _this._dragStartMs = null;
        _this._needsMove = false;
        _this._hasMouseDown = false;
        _this._lastMouseDown = 0;
        _this._didHandleDragStop = false;
        _this._didHandleContextMenu = false;
        _this._mouseDownState = {};
        _this._updateReceivers = {};
        _this._viewPosition = {};
        return _this;
    }
    Keyframe.prototype.activate = function () {
        if (!this._activated) {
            this._activated = true;
            this.notifyUpdateReceivers('keyframe-activated');
        }
    };
    Keyframe.prototype.deactivate = function () {
        if (this._activated) {
            this._activated = false;
            this.notifyUpdateReceivers('keyframe-deactivated');
        }
    };
    Keyframe.prototype.isActive = function () {
        return this._activated;
    };
    Keyframe.prototype.select = function () {
        if (!this._selected) {
            this._selected = true;
            this.notifyUpdateReceivers('keyframe-selected');
        }
    };
    Keyframe.prototype.deselect = function () {
        if (this._selected) {
            this._selected = false;
            this.notifyUpdateReceivers('keyframe-deselected');
        }
    };
    Keyframe.prototype.setBodySelected = function () {
        if (!this._selectedBody) {
            this._selectedBody = true;
            this.notifyUpdateReceivers('keyframe-body-selected');
        }
    };
    Keyframe.prototype.unsetBodySelected = function () {
        if (this._selectedBody) {
            this._selectedBody = false;
            this.notifyUpdateReceivers('keyframe-body-unselected');
        }
    };
    Keyframe.prototype.deselectAndDeactivate = function () {
        this.unsetBodySelected();
        this.deselect();
        this.deactivate();
    };
    Keyframe.prototype.isSelected = function () {
        return this._selected;
    };
    Keyframe.prototype.isSelectedBody = function () {
        return this._selectedBody;
    };
    Keyframe.prototype.delete = function (metadata) {
        this.row.deleteKeyframe(this, metadata);
        Timeline.clearCaches();
        return this;
    };
    Keyframe.prototype.dragStart = function (dragData) {
        this._dragStartMs = this.getMs();
        this._dragStartPx = dragData.x;
        return this;
    };
    Keyframe.prototype.dragStop = function () {
        this._dragStartMs = null;
        this._dragStartPx = null;
        return this;
    };
    Keyframe.prototype.drag = function (pxpf, mspf, dragData, metadata) {
        var pxChange = dragData.lastX - this._dragStartPx;
        var msChange = Math.round(pxChange / pxpf * mspf);
        this.move(msChange, this._dragStartMs, mspf);
        return this;
    };
    Keyframe.prototype.move = function (msChange, msOrig, mspf) {
        var msFinal = msOrig + msChange;
        if (msFinal >= 0) {
            this.moveTo(msFinal, mspf);
        }
        return this;
    };
    Keyframe.prototype.moveTo = function (ms, mspf) {
        // No-op the rest of this procedure if we're already at the same keyframe
        if (this.getMs() === ms) {
            return this;
        }
        this.setMs(ms);
        var msMargin = Math.round(mspf);
        if (this.next()) {
            if (this.getMs() >= (this.next().getMs() - 1)) {
                var nextMs = this.getMs() + msMargin;
                if (nextMs >= 0) {
                    this.next().moveTo(nextMs, mspf);
                }
            }
        }
        if (this.prev()) {
            if (this.getMs() <= (this.prev().getMs() + 1)) {
                var prevMs = this.getMs() - msMargin;
                if (prevMs >= 0) {
                    this.prev().moveTo(prevMs, mspf);
                }
            }
        }
        return this;
    };
    Keyframe.prototype.createKeyframe = function (value, ms, metadata) {
        this.row.createKeyframe(value, ms, metadata);
        return this;
    };
    Keyframe.prototype.removeCurve = function (metadata) {
        if (this.next() && this.next().isActive()) {
            this.setCurve(null);
            this.component.splitSegment(this.element.getComponentId(), this.timeline.getName(), this.element.getNameString(), this.row.getPropertyNameString(), this.getMs(), metadata, function () { });
            this.row.emit('update', 'keyframe-remove-curve');
        }
        return this;
    };
    Keyframe.prototype.addCurve = function (curveName, metadata) {
        this.setCurve(curveName);
        this.component.joinKeyframes(this.element.getComponentId(), this.timeline.getName(), this.element.getNameString(), this.row.getPropertyNameString(), this.getMs(), null, curveName, metadata, function () { });
        this.row.emit('update', 'keyframe-add-curve');
        return this;
    };
    Keyframe.prototype.changeCurve = function (curveName, metadata) {
        this.setCurve(curveName);
        this.component.changeSegmentCurve(this.element.getComponentId(), this.timeline.getName(), this.row.getPropertyNameString(), this.getMs(), curveName, metadata, function () { });
        this.row.emit('update', 'keyframe-change-curve');
        return this;
    };
    Keyframe.prototype.isTransitionSegment = function () {
        var curve = this.getCurve();
        return Boolean(curve) && (Boolean(Curve[this.getCurveCapitalized()]) || Array.isArray(curve));
    };
    Keyframe.prototype.isConstantSegment = function () {
        return this.hasNextKeyframe();
    };
    Keyframe.prototype.hasConstantBody = function () {
        return (this.next() &&
            !this.getCurve());
    };
    Keyframe.prototype.hasCurveBody = function () {
        return Boolean(this.next() &&
            this.isTransitionSegment());
    };
    /**
     * @method hasDecomposableCurve
     * @description Return if the current curve body is composed of multiple Bezier Curves.
     */
    Keyframe.prototype.hasDecomposableCurve = function () {
        return this.hasCurveBody() && isDecomposableCurve(this.getCurve());
    };
    /**
     * @method getCurveInterpolationPoints
     * @description Returns the curve descomposed
     */
    Keyframe.prototype.getCurveInterpolationPoints = function () {
        if (this.isTransitionSegment()) {
            return getCurveInterpolationPoints(this.getCurve());
        }
    };
    Keyframe.prototype.isSoloKeyframe = function () {
        var prev = this.prev();
        if (!prev) {
            return true;
        }
        return !prev.getCurve();
    };
    Keyframe.prototype.hasPreviousKeyframe = function () {
        return !!this.prev();
    };
    Keyframe.prototype.hasNextKeyframe = function () {
        return !!this.next();
    };
    Keyframe.prototype.setOrigMs = function (ms) {
        this.origMs = ms;
    };
    Keyframe.prototype.updateOwnMetadata = function () {
        var ms = this.getMs();
        var newUid = Keyframe.getInferredUid(this.row, ms);
        this.setOrigMs(ms);
        Keyframe.setInstancePrimaryKey(this, newUid);
    };
    Keyframe.prototype.getUniqueKey = function () {
        return this.getPrimaryKey();
    };
    Keyframe.prototype.getViewPosition = function () {
        return this._viewPosition;
    };
    Keyframe.prototype.isWithinCollapsedRow = function () {
        return this.row.isCollapsed() || this.row.isWithinCollapsedRow();
    };
    Keyframe.prototype.getFrame = function (mspf) {
        return Timeline.millisecondToNearestFrame(this.getMs(), mspf);
    };
    Keyframe.prototype.getOrigMs = function () {
        return this.origMs;
    };
    Keyframe.prototype.getMs = function () {
        return this.ms;
    };
    Keyframe.prototype.setMs = function (ms) {
        if (ms < 0) {
            throw new Error('keyframes cannot be less than 0');
        }
        // Normalize to a millitime that lines up with a frametime
        var normalized = this.timeline.normalizeMs(ms);
        var previous = this.getMs();
        this.ms = normalized;
        // Clear timeline caches; the max frame might have changed.
        Timeline.clearCaches();
        if (normalized !== previous) {
            // Indicate that we need to be moved. Must set this before calling handleKeyframeMoves
            // otherwise the update might not make it correctly to the serialization layer
            this._needsMove = true;
            this.notifyUpdateReceivers('keyframe-ms-set');
            if (this.prev()) {
                this.prev().notifyUpdateReceivers('keyframe-neighbor-move');
            }
            if (this.next()) {
                this.next().notifyUpdateReceivers('keyframe-neighbor-move');
            }
        }
        return this;
    };
    Keyframe.prototype.getIndex = function () {
        return this.index;
    };
    Keyframe.prototype.getValue = function (serialized) {
        if (serialized) {
            return expressionToRO(this.value);
        }
        return this.value;
    };
    Keyframe.prototype.getSpec = function (edited, serialized) {
        var spec = {
            value: this.getValue(serialized),
        };
        if (edited) {
            spec.edited = true;
        }
        if (this.getCurve()) {
            spec.curve = this.getCurve();
        }
        return spec;
    };
    Keyframe.prototype.setCurve = function (value) {
        this.curve = value;
        return this;
    };
    Keyframe.prototype.getCurve = function () {
        return this.curve;
    };
    Keyframe.prototype.isVisible = function (a, b) {
        if (this.getMs() > b) {
            return false;
        }
        var next = this.next();
        return !next || this.getMs() >= a || next.getMs() >= a;
    };
    Keyframe.prototype.isTweenable = function () {
        if (typeof this.value === 'string' || this.value instanceof String) {
            var ourPropertyName = this.row.getPropertyNameString();
            // Some strings, such as color and path.d, are tweenable because core parses
            // them on the fly into numeric payloads that can be tweened.
            // tslint:disable-next-line:triple-equals
            return HaikuComponent.PARSERS[ourPropertyName] || this.value == parseFloat(this.value, 10);
        }
        return typeof (this.value) !== 'boolean';
    };
    Keyframe.prototype.next = function () {
        return this._next;
    };
    Keyframe.prototype.prev = function () {
        return this._prev;
    };
    Keyframe.prototype.isNextKeyframeSelected = function () {
        return this.next() && this.next().isSelected();
    };
    Keyframe.prototype.getPixelOffsetRight = function (base, pxpf, mspf) {
        if (base === undefined || pxpf === undefined || mspf === undefined) {
            throw new Error("keyframe pixel offset right params missing");
        }
        if (this.next()) {
            return (this.next().getFrame(mspf) - base) * pxpf;
        }
        return 0;
    };
    Keyframe.prototype.getPixelOffsetLeft = function (base, pxpf, mspf) {
        if (base === undefined || pxpf === undefined || mspf === undefined) {
            throw new Error("keyframe pixel offset left params missing");
        }
        return (this.getFrame(mspf) - base) * pxpf;
    };
    Keyframe.prototype.storeViewPosition = function (_a) {
        var rect = _a.rect, offset = _a.offset;
        this._viewPosition = {
            left: rect.left + offset,
            right: rect.right + offset,
        };
    };
    Keyframe.prototype.clearViewPosition = function () {
        this._viewPosition = {};
    };
    Keyframe.prototype.isWithinCollapsedClusterHeadingRow = function () {
        return (this.row &&
            this.row.parent &&
            this.row.parent.isClusterHeading() &&
            this.row.parent.isCollapsed());
    };
    Keyframe.prototype.isClusterMember = function () {
        return (this.row &&
            this.row.parent &&
            this.row.parent.isClusterHeading());
    };
    Keyframe.prototype.getElementHeadingRow = function () {
        if (this.row && this.row.parent) {
            if (this.row.parent.isClusterHeading()) {
                return this.row.parent.parent;
            }
            return this.row.parent;
        }
    };
    Keyframe.prototype.getClusterHeadingRow = function () {
        if (this.row && this.row.parent) {
            if (this.row.parent.isClusterHeading()) {
                return this.row.parent;
            }
        }
    };
    Keyframe.prototype.getCurveCapitalized = function () {
        var curve = this.getCurve();
        if (Array.isArray(curve)) {
            return 'Custom';
        }
        if (typeof curve !== 'string' && !(curve instanceof String)) {
            return '';
        }
        return curve.charAt(0).toUpperCase() + curve.slice(1);
    };
    Keyframe.prototype.isWithinCollapsedElementHeadingRow = function () {
        var elementHeading = this.getElementHeadingRow();
        return elementHeading.isCollapsed() || elementHeading.isWithinCollapsedRow();
    };
    Keyframe.prototype.getLeftKeyframeColorState = function () {
        if (this.isActive()) {
            return 'LIGHTEST_PINK';
        }
        if (this.isWithinCollapsedElementHeadingRow()) {
            return 'BLUE';
        }
        if (this.isWithinCollapsedClusterHeadingRow()) {
            return 'DARK_ROCK';
        }
        return 'ROCK';
    };
    Keyframe.prototype.getRightKeyframeColorState = function () {
        if (this.next() && this.next().isActive()) {
            return 'LIGHTEST_PINK';
        }
        if (this.isWithinCollapsedElementHeadingRow()) {
            return 'BLUE';
        }
        if (this.isWithinCollapsedClusterHeadingRow()) {
            return 'DARK_ROCK';
        }
        return 'ROCK';
    };
    Keyframe.prototype.getCurveColorState = function () {
        if (this.isSelected() && this.isActive() && this.isCurveSelected()) {
            return 'LIGHTEST_PINK';
        }
        if (this.isWithinCollapsedElementHeadingRow()) {
            return 'BLUE';
        }
        if (this.isWithinCollapsedClusterHeadingRow()) {
            return 'DARK_ROCK';
        }
        return 'ROCK';
    };
    Keyframe.prototype.isCurveSelected = function () {
        return (this.hasCurveBody() &&
            this.isSelectedBody());
    };
    Keyframe.prototype.setMouseDown = function () {
        this._hasMouseDown = true;
        this._lastMouseDown = Date.now();
    };
    Keyframe.prototype.getLastMouseDown = function () {
        return this._lastMouseDown;
    };
    Keyframe.prototype.unsetMouseDown = function () {
        this._hasMouseDown = false;
    };
    Keyframe.prototype.isMouseDown = function () {
        return this._hasMouseDown;
    };
    Keyframe.prototype.setMouseDownState = function (_a) {
        var wasSelected = _a.wasSelected, wasSelectedBody = _a.wasSelectedBody, wasCurveTargeted = _a.wasCurveTargeted;
        this._mouseDownState = {
            wasSelected: wasSelected,
            wasSelectedBody: wasSelectedBody,
            wasCurveTargeted: wasCurveTargeted,
        };
    };
    Keyframe.prototype.unsetMouseDownState = function () {
        this._mouseDownState = {};
    };
    Keyframe.prototype.getMouseDownState = function () {
        return this._mouseDownState;
    };
    Keyframe.prototype.setDidHandleDragStop = function () {
        this._didHandleDragStop = true;
    };
    Keyframe.prototype.unsetDidHandleDragStop = function () {
        this._didHandleDragStop = false;
    };
    Keyframe.prototype.didHandleDragStop = function () {
        return this._didHandleDragStop;
    };
    Keyframe.prototype.setDidHandleContextMenu = function () {
        this._didHandleContextMenu = true;
    };
    Keyframe.prototype.unsetDidHandleContextMenu = function () {
        this._didHandleContextMenu = false;
    };
    Keyframe.prototype.didHandleContextMenu = function () {
        return this._didHandleContextMenu;
    };
    Keyframe.prototype.updateActivationStatesAccordingToNeighborStates = function () {
        var prevKeyframe = this.prev();
        /**
         * o keyframe
         * - constant segment
         * ~ curve segment
         *
         *   |<~this keyframe
         *   |
         *   o
         *   o-o <~ has next only
         *   o~o
         * o-o   <~ has prev only
         * o~o
         * o-o-o <~ has next and prev
         * o~o-o
         * o-o~o
         * o~o~o
         */
        if (prevKeyframe) {
            if (prevKeyframe.isSelected()) {
                if (prevKeyframe.isSelectedBody()) {
                    this.select();
                }
            }
        }
        if (this.isSelected()) {
            this.activate();
        }
        else {
            this.deactivate();
        }
    };
    Keyframe.prototype.handleMouseDown = function (_a, _b, _c) {
        var which = _a.nativeEvent.which;
        var isShiftKeyDown = _b.isShiftKeyDown, isControlKeyDown = _b.isControlKeyDown, isCommandKeyDown = _b.isCommandKeyDown;
        var isViaConstantBodyView = _c.isViaConstantBodyView, isViaTransitionBodyView = _c.isViaTransitionBodyView;
        if (isControlKeyDown || which === 3) {
            return this.handleContextMenu({ isShiftKeyDown: isShiftKeyDown, isControlKeyDown: isControlKeyDown, isCommandKeyDown: isCommandKeyDown }, { isViaConstantBodyView: isViaConstantBodyView, isViaTransitionBodyView: isViaTransitionBodyView });
        }
        this.setMouseDown();
        this.unsetDidHandleDragStop();
        var isCurveTargeted = (isViaTransitionBodyView || isViaConstantBodyView);
        // Keeping track of this information so we can do the correct thing on mouse up
        this.setMouseDownState({
            wasSelected: this.isSelected(),
            wasSelectedBody: this.isSelectedBody(),
            wasCurveTargeted: isCurveTargeted,
        });
        // Unless the shift key is down, a direct click normally clear others
        if (!isShiftKeyDown && !isCommandKeyDown) {
            // But only if we're touching an unrelated (unselected) set of keyframes
            if (!this.isSelected()) {
                this.clearOtherKeyframes();
            }
        }
        // Ensure we and neighbors are selected and activated since this may begin a drag
        this.select();
        if (isCurveTargeted) {
            this.setBodySelected();
        }
        // Loop through keyframes in this row left-to-right and update activations
        this.updateActivationStatesInRow();
    };
    Keyframe.prototype.updateActivationStatesInRow = function () {
        this.row.getKeyframes().forEach(function (keyframe) {
            keyframe.updateActivationStatesAccordingToNeighborStates();
        });
    };
    Keyframe.prototype.handleMouseUp = function (_a, _b, _c) {
        var which = _a.nativeEvent.which;
        var lastMouseButtonPressed = _b.lastMouseButtonPressed, isShiftKeyDown = _b.isShiftKeyDown, isControlKeyDown = _b.isControlKeyDown, isCommandKeyDown = _b.isCommandKeyDown;
        var isViaConstantBodyView = _c.isViaConstantBodyView, isViaTransitionBodyView = _c.isViaTransitionBodyView;
        if (!this.isMouseDown()) {
            // We weren't the one who received the initial mouse down
            var otherKeyframe = Keyframe.where({ _hasMouseDown: true, component: this.component })[0];
            if (otherKeyframe && otherKeyframe !== this) {
                otherKeyframe.handleMouseUp({ nativeEvent: { which: which } }, { lastMouseButtonPressed: lastMouseButtonPressed, isShiftKeyDown: isShiftKeyDown, isControlKeyDown: isControlKeyDown, isCommandKeyDown: isCommandKeyDown }, { isViaConstantBodyView: isViaConstantBodyView, isViaTransitionBodyView: isViaTransitionBodyView });
            }
            return;
        }
        this.unsetMouseDown();
        if (this.didHandleDragStop()) {
            this.unsetDidHandleDragStop();
            return;
        }
        var _d = this.getMouseDownState(), wasSelected = _d.wasSelected, wasSelectedBody = _d.wasSelectedBody, wasCurveTargeted = _d.wasCurveTargeted;
        this.unsetMouseDownState();
        if (!isShiftKeyDown && !isCommandKeyDown) {
            // Since mouseup commits the action, we don't check for selection state here
            this.clearOtherKeyframes();
        }
        // If shift is down on mouse up, we deselect current selections
        if (isShiftKeyDown || isCommandKeyDown) {
            if (wasCurveTargeted) {
                if (wasSelectedBody) {
                    this.unsetBodySelected();
                }
                else {
                    this.setBodySelected();
                }
            }
            else {
                if (wasSelected) {
                    this.unsetBodySelected();
                    this.deselect();
                }
                else {
                    this.select();
                }
            }
        }
        else {
            // We've explicitly activated the keyframe as opposed to the whole segment
            if (!wasCurveTargeted) {
                this.unsetBodySelected();
            }
        }
        // Loop through keyframes in this row left-to-right and update activations
        this.updateActivationStatesInRow();
        this.component.dragStopSelectedKeyframes();
    };
    Keyframe.prototype.handleContextMenu = function (_a, _b) {
        var isShiftKeyDown = _a.isShiftKeyDown, isCommandKeyDown = _a.isCommandKeyDown;
        var isViaConstantBodyView = _b.isViaConstantBodyView, isViaTransitionBodyView = _b.isViaTransitionBodyView;
        this.unsetMouseDown();
        this.unsetMouseDownState();
        if (this.didHandleContextMenu()) {
            this.unsetDidHandleContextMenu();
            return;
        }
        this.setDidHandleContextMenu();
        if (this.isWithinCollapsedRow()) {
            return;
        }
        var isCurveTargeted = (isViaTransitionBodyView || isViaConstantBodyView);
        // Unless the shift key is down, a direct click normally clear others
        if (!isShiftKeyDown && !isCommandKeyDown) {
            // But only if we're touching an unrelated (unselected) set of keyframes
            if (isCurveTargeted && !this.isNextKeyframeSelected()) {
                this.clearOtherKeyframes();
            }
            if (!this.isSelected()) {
                this.clearOtherKeyframes();
            }
        }
        // Ensure we and neighbors are selected and activated since this may begin a drag
        this.select();
        if (isCurveTargeted) {
            this.setBodySelected();
        }
        // Loop through keyframes in this row left-to-right and update activations
        this.updateActivationStatesInRow();
        this.component.dragStopSelectedKeyframes();
    };
    Keyframe.prototype.handleDragStop = function (dragData, _a, _b) {
        var wasDrag = _a.wasDrag, lastMouseButtonPressed = _a.lastMouseButtonPressed, isShiftKeyDown = _a.isShiftKeyDown, isControlKeyDown = _a.isControlKeyDown, isCommandKeyDown = _a.isCommandKeyDown;
        var isViaConstantBodyView = _b.isViaConstantBodyView, isViaTransitionBodyView = _b.isViaTransitionBodyView;
        if (!wasDrag) {
            return this.handleMouseUp({ nativeEvent: { which: 1 } }, // Mock
            { isShiftKeyDown: isShiftKeyDown, isControlKeyDown: isControlKeyDown, isCommandKeyDown: isCommandKeyDown }, { isViaConstantBodyView: isViaConstantBodyView, isViaTransitionBodyView: isViaTransitionBodyView });
        }
        if (this.didHandleDragStop()) {
            this.unsetDidHandleDragStop();
            return;
        }
        this.setDidHandleDragStop();
        this.component.dragStopSelectedKeyframes();
    };
    Keyframe.prototype.clearOtherKeyframes = function () {
        var _this = this;
        Keyframe.where({ component: this.component }).forEach(function (keyframe) {
            if (keyframe !== _this) {
                keyframe.deselectAndDeactivate();
            }
        });
    };
    /**
     * @method dump
     * @description When debugging, use this to log a concise shorthand of this entity.
     */
    Keyframe.prototype.dump = function () {
        var str = "".concat(this.row.getPropertyNameString(), "[").concat(this.getIndex(), "]:").concat(this.getMs(), "/").concat(this.getCurve() || '!');
        if (this.isTransitionSegment()) {
            str += ' {t}';
        }
        if (this.isConstantSegment()) {
            str += ' {c}';
        }
        if (this.isSoloKeyframe()) {
            str += ' {s}';
        }
        if (this.prev()) {
            str += ' <';
        }
        if (this.next()) {
            str += ' >';
        }
        return str;
    };
    return Keyframe;
}(BaseModel));
Keyframe.DEFAULT_OPTIONS = {
    required: {
        component: true,
        timeline: true,
        element: true,
        row: true,
        ms: true,
        index: true,
        value: true,
    },
};
BaseModel.extend(Keyframe);
Keyframe.deselectAndDeactivateAllKeyframes = function (criteria) {
    Keyframe.where(criteria).forEach(function (keyframe) {
        keyframe.unsetBodySelected();
        keyframe.deselect();
        keyframe.deactivate();
    });
};
Keyframe.getInferredUid = function (row, ms) {
    return "".concat(row.getPrimaryKey(), "-keyframe-").concat(ms);
};
Keyframe.clearAllViewPositions = function (filter) {
    Keyframe.where(filter).forEach(function (keyframe) {
        keyframe.clearViewPosition();
    });
};
Keyframe.buildKeyframeMoves = function (criteria, serialized) {
    // Keyframes not part of this object will be deleted from the bytecode
    var moves = {};
    var movables = Keyframe.where(Object.assign({ _needsMove: true }, criteria));
    movables.forEach(function (movable) {
        // As an optimization, skip any that we have already moved below in case of dupes
        if (!movable._needsMove) {
            return null;
        }
        var timelineName = movable.timeline.getName();
        var componentId = movable.element.getComponentId();
        var propertyName = movable.row.getPropertyNameString();
        if (!moves[timelineName]) {
            moves[timelineName] = {};
        }
        if (!moves[timelineName][componentId]) {
            moves[timelineName][componentId] = {};
        }
        if (!moves[timelineName][componentId][propertyName]) {
            moves[timelineName][componentId][propertyName] = {};
        }
        // Because the keyframe move action interprets excluded entries as *deletes*, we have to
        // also include all keyframes that are a part of the same timeline/component/property tuple
        Keyframe.where(criteria).forEach(function (partner) {
            if (partner.timeline.getName() !== timelineName) {
                return null;
            }
            if (partner.element.getComponentId() !== componentId) {
                return null;
            }
            if (partner.row.getPropertyNameString() !== propertyName) {
                return null;
            }
            moves[timelineName][componentId][propertyName][partner.getMs()] = partner.getSpec(true, serialized);
            // Since this action resolves the move, exclude it from future calls until set again
            partner._needsMove = false;
        });
        moves[timelineName][componentId][propertyName][movable.getMs()] = movable.getSpec(true, serialized);
        // Since this action resolves the move, exclude it from future calls until set again
        movable._needsMove = false;
    });
    return moves;
};
Keyframe.findIntersectingWithArea = function (_a) {
    var component = _a.component, area = _a.area, offset = _a.offset, viewCoordinatesProvider = _a.viewCoordinatesProvider;
    return Keyframe.where({ component: component })
        .filter(function (keyframe) {
        var keyframeView = keyframe.getViewPosition();
        if (!keyframeView.left || keyframe.element.isLocked()) {
            return false;
        }
        // First, check if the keyframe is contained in the marquee horizontally,
        // we perform this check first because we can't rely on the cached `y` value due
        // to the rows expanding/collapsing. Since we don't have a similar behavior that
        // modifies the `x` position of a keyframe post-render this is a safe filter to
        // avoid performing the expensive `getBoundingClientRect` calculation on all keyframes
        if (keyframeView.left - offset.horizontal > area.right ||
            area.left > keyframeView.right - offset.horizontal) {
            return false;
        }
        var freshBounds = viewCoordinatesProvider(keyframe);
        return freshBounds && !(freshBounds.top > area.bottom ||
            area.top > freshBounds.bottom);
    })
        .reduce(function (acc, keyframe) {
        return acc.set(keyframe.getUniqueKey(), keyframe);
    }, new Map());
};
Keyframe.marqueeSelect = function (_a) {
    var component = _a.component, area = _a.area, offset = _a.offset, viewCoordinatesProvider = _a.viewCoordinatesProvider;
    var selected = Keyframe.findIntersectingWithArea({
        component: component,
        area: area,
        offset: offset,
        viewCoordinatesProvider: viewCoordinatesProvider,
    });
    Keyframe.any({
        component: component,
        _selected: true,
    }).forEach(function (keyframe) {
        if (!selected.has(keyframe.getUniqueKey())) {
            keyframe.deselect();
            if (keyframe.isConstantSegment() || keyframe.isTransitionSegment()) {
                keyframe.unsetBodySelected();
            }
            keyframe.updateActivationStatesInRow();
        }
    });
    selected.forEach(function (keyframe) {
        keyframe.select();
        if (keyframe.isConstantSegment() || keyframe.isTransitionSegment()) {
            keyframe.setBodySelected();
        }
        keyframe.updateActivationStatesInRow();
    });
};
Keyframe.epandRowsOfSelectedKeyframes = function (_a) {
    var component = _a.component, from = _a.from;
    Keyframe.any({
        component: component,
        _selected: true,
    }).forEach(function (keyframe) {
        if (!keyframe.row._isExpanded) {
            keyframe.row.expand({ from: from });
        }
    });
};
Keyframe.groupIsSingleTween = function (keyframes) {
    return keyframes.length === 2 && keyframes[0].next() === keyframes[1] && keyframes[0].hasCurveBody();
};
/**
 * @method groupHasBezierEditableCurves
 * @description Determines if every keyframe in a group can be edited via the
 * Bezier Curve editor by the following criteria:
 * @returns boolean
 *
 * - Every keyframe has a curve body
 * - Every curve is the same curve (so they can all be edited with a single editor)
 * - Every curve can be represented via a single Bezier Curve (FIXME: allow chains of curves)
 */
Keyframe.groupHasBezierEditableCurves = function (keyframes) {
    if (!keyframes || keyframes.length === 0) {
        return false;
    }
    var referenceCurve = keyframes[0].getCurve();
    return keyframes
        .filter(function (kf) { return kf.hasCurveBody(); })
        .every(function (kf) { return kf.getCurve() === referenceCurve && !kf.hasDecomposableCurve(); });
};
module.exports = Keyframe;
// Down here to avoid Node circular dependency stub objects. #FIXME
var Timeline = require('./Timeline');
//# sourceMappingURL=Keyframe.js.map