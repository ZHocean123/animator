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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
var lodash = require('lodash');
var Experiment = {
    OrderedActionStack: 'OrderedActionStack',
};
var experimentIsEnabled = function (experiment) {
    return experiment === Experiment.OrderedActionStack ? false : false;
};
var BaseModel = require('./BaseModel');
var Lock = require('./Lock');
var logger = require('./../utils/LoggerInstance');
// No-op callback for arbitrary fire-and-forget actions
var TIMER_TIMEOUT = 64;
var PROPERTY_GROUP_ACCUMULATION_TIME = 500;
var MAX_UNDOABLES_LEN = 50;
// Undoables that always require a full bytecode snapshot to be undone.
var SNAPSHOTTED_UNDOABLES = {
    groupElements: true,
    ungroupElements: true,
    popBytecodeSnapshot: true,
    updateKeyframesAndTypes: true,
};
var ACCUMULATORS = {
    updateKeyframes: function (params, match) {
        var updates1 = match.params[2];
        var updates2 = params[2];
        for (var timelineName in updates2) {
            if (!updates1[timelineName]) {
                updates1[timelineName] = {};
            }
            for (var componentId in updates2[timelineName]) {
                if (!updates1[timelineName][componentId]) {
                    updates1[timelineName][componentId] = {};
                }
                for (var propertyName in updates2[timelineName][componentId]) {
                    if (!updates1[timelineName][componentId][propertyName]) {
                        updates1[timelineName][componentId][propertyName] = {};
                    }
                    for (var keyframeMs in updates2[timelineName][componentId][propertyName]) {
                        updates1[timelineName][componentId][propertyName][keyframeMs] = updates2[timelineName][componentId][propertyName][keyframeMs];
                    }
                }
            }
        }
    },
};
var INVERTER_ACCUMULATORS = {
    updateKeyframes: function (baseInverter, newInverter) {
        var basis1 = baseInverter.params[1];
        var basis2 = newInverter.params[1];
        for (var timelineName in basis2) {
            if (!basis1[timelineName]) {
                basis1[timelineName] = {};
            }
            for (var componentId in basis2[timelineName]) {
                if (!basis1[timelineName][componentId]) {
                    basis1[timelineName][componentId] = {};
                }
                for (var propertyName in basis2[timelineName][componentId]) {
                    if (!basis1[timelineName][componentId][propertyName]) {
                        basis1[timelineName][componentId][propertyName] = {};
                    }
                    for (var keyframeMs in basis2[timelineName][componentId][propertyName]) {
                        if (basis1[timelineName][componentId][propertyName][keyframeMs] !== undefined) {
                            continue;
                        }
                        basis1[timelineName][componentId][propertyName][keyframeMs] = basis2[timelineName][componentId][propertyName][keyframeMs];
                    }
                }
            }
        }
    },
};
var shouldAccumulate = function (method, params) { return ACCUMULATORS[method] && !params[params.length - 2].cursor; };
/**
 * @class ActionStack
 * @description
 *   Manages queue of actions for a host Project object.
 *   Encapsulates...:
 *     - enqueuing actions and preserving order
 *     - batching together rapid requests
 *     - handling undo/redo
 *
 *   Use caution when changing this.
 *
 *   If you change anything here, keep in mind the following constraints:
 *     - rapid actions on stage (like dragging) need to be instantaneous
 *     - snapshotting data (e.g. for undo) should not cause perceptible lag or jank
 *     - actions should be equivalent across processes (or we'll get crashes)
 */
var ActionStack = /** @class */ (function (_super) {
    __extends(ActionStack, _super);
    function ActionStack(props, opts) {
        var _this = _super.call(this, props, opts) || this;
        _this.resetData();
        _this.processActions();
        return _this;
    }
    /**
     * @method reset
     * @description Because Creator and Master are long-lived, there needs to be
     * a mechanism to explicitly clear the in-memory content when the project is
     * closed and then reopened again, otherwise it will have stale data from
     * the previous project editing session.
     */
    ActionStack.prototype.resetData = function () {
        this.stopped = false;
        this.undoables = [];
        this.redoables = [];
        this.actions = [];
        this.accumulatorTimeouts = {};
        this.accumulatedInverters = {};
        // A hashmap from aliases to action stack indices, used to implement remote request ordering. Remote updates may be
        // received out of order, so Project#updateHook attaches an action stack index to each request sent out to other
        // processes. This ensures that even if requests per remote process are received out of order, we process them in
        // order.
        this.actionStackIndices = {
            glass: 0,
            timeline: 0,
            creator: 0,
            master: 0,
        };
    };
    ActionStack.prototype.stop = function () {
        this.stopped = true;
    };
    ActionStack.prototype.processActions = function () {
        var _this = this;
        var action = this.actions[0];
        if (!action) {
            return (this.stopped)
                ? null
                : setTimeout(function () { return _this.processActions(); }, TIMER_TIMEOUT);
        }
        // Psuedo-debounce fast actions to avoid stuttering on stage
        delete this.accumulatorTimeouts[action.method];
        if (shouldAccumulate(action.method, action.params)) {
            // We may want to wait longer for more updates to accumulate
            if (action.timestamp &&
                (Date.now() - action.timestamp) < PROPERTY_GROUP_ACCUMULATION_TIME) {
                // Early return is important here so we don't transmit the action yet.
                this.accumulatorTimeouts[action.method] = setTimeout(function () { return _this.processActions(); }, TIMER_TIMEOUT);
                return;
            }
        }
        // Since we're going to process now, we can remove from the queue
        this.shiftAndProcessLatestAction();
    };
    ActionStack.prototype.forceAccumulation = function () {
        for (var method in this.accumulatorTimeouts) {
            clearTimeout(this.accumulatorTimeouts[method]);
            delete this.accumulatorTimeouts[method];
            this.shiftAndProcessLatestAction();
        }
    };
    ActionStack.prototype.shiftAndProcessLatestAction = function () {
        var action = this.actions.shift();
        if (action) {
            this.processAction(action);
        }
        else {
            this.processActions();
        }
    };
    ActionStack.prototype.processAction = function (action) {
        var _this = this;
        var method = action.method, params = action.params, before = action.before;
        // If requested, notify the caller right before we resolve the action
        if (before) {
            before();
        }
        // Resume the queue after we've finished handling the action.
        return this.emit('next', method, params, function () { return _this.processActions(); });
    };
    ActionStack.prototype.enqueueAction = function (method, params, before) {
        if (shouldAccumulate(method, params)) {
            for (var i = this.actions.length - 1; i >= 0; i--) {
                // Find the most recent action that meets our criteria, and merge our payload with it
                var action = this.actions[i];
                if (action.method === method &&
                    action.params[0] === params[0] && // folder
                    action.params[1] === params[1] // relpath
                ) {
                    ACCUMULATORS[method](params, action);
                    action.timestamp = Date.now();
                    return;
                }
            }
        }
        // If we got here, we shouldn't have merged action contents, and need a new queue entry
        this.actions.push({
            timestamp: Date.now(),
            method: method,
            params: params,
            before: before,
        });
        // If not an accumulator method, invoke it immediately
        if (this.actions.length < 2 &&
            !shouldAccumulate(method, params)) {
            this.shiftAndProcessLatestAction();
        }
    };
    ActionStack.prototype.addDoable = function (doable, stack) {
        stack.push(doable);
        if (stack.length > MAX_UNDOABLES_LEN) {
            stack.shift();
        }
        this.project.emit('update', 'updateMenu');
    };
    ActionStack.prototype.addUndoable = function (undoable, ac) {
        // TODO: reimplement this.undoables as a Map<ActiveComponent, Undoable[]>
        this.addDoable(Object.assign(undoable, { ac: ac }), this.undoables);
    };
    ActionStack.prototype.addRedoable = function (redoable, ac) {
        // TODO: reimplement this.redoables as a Map<ActiveComponent, Undoable[]>
        this.addDoable(Object.assign(redoable, { ac: ac }), this.redoables);
    };
    ActionStack.prototype.popDoable = function (stack, ac) {
        // If no active component context, just use the top of the stack.
        if (!ac) {
            return stack.pop();
        }
        // If the top item on the stack has no active component context,
        // pop it. We assume that it represents a project-level change.
        var last = stack[stack.length - 1];
        if (last && !last.ac) {
            return stack.pop();
        }
        // Pop the stack entry that belongs to the active component context.
        // (Like a text editor, our undo/redo is context-specific to the file.)
        for (var i = stack.length - 1; i >= 0; i--) {
            var entry = stack[i];
            if (entry.ac === ac) {
                return stack.splice(i, 1)[0];
            }
        }
        // If we have an active component, but haven't found any entries in
        // the stack to match it, then we should do nothing since the top of
        // the stack may contain a doable for another component, which would
        // be a surprising change for the user given the current context.
        return null;
    };
    ActionStack.prototype.popUndoable = function (ac) {
        return this.popDoable(this.undoables, ac);
    };
    ActionStack.prototype.popRedoable = function (ac) {
        return this.popDoable(this.redoables, ac);
    };
    ActionStack.prototype.getUndoables = function () {
        return this.undoables;
    };
    ActionStack.prototype.getRedoables = function () {
        return this.redoables;
    };
    ActionStack.prototype.buildMethodInverterAction = function (ac, method, params, metadata, when, output) {
        if (ActionStack.METHOD_INVERTERS[method] &&
            ActionStack.METHOD_INVERTERS[method][when]) {
            var inversion = ActionStack.METHOD_INVERTERS[method][when].call(this, ac, params.slice(1), // Exclude the ActiveComponent 'relpath'
            output);
            if (inversion) {
                var relpath = params[0];
                inversion.params.unshift(relpath);
                inversion.params.push(metadata);
                if (when === 'before' && INVERTER_ACCUMULATORS[method]) {
                    if (this.accumulatedInverters[method]) {
                        INVERTER_ACCUMULATORS[method](this.accumulatedInverters[method], inversion);
                    }
                    else {
                        this.accumulatedInverters[method] = inversion;
                    }
                }
            }
            return inversion;
        }
        return null;
    };
    ActionStack.prototype.shouldOrderRemoteUpdate = function (metadata) {
        return experimentIsEnabled(Experiment.OrderedActionStack) &&
            metadata.hasOwnProperty('actionStackIndex') &&
            this.project.isRemoteRequest(metadata);
    };
    ActionStack.prototype.advanceActionStackIndexForMetadata = function (metadata) {
        this.actionStackIndices[metadata.from]++;
    };
    ActionStack.prototype.orderedAction = function (method, metadata, cb) {
        var _this = this;
        if (this.shouldOrderRemoteUpdate(metadata)) {
            if (this.actionStackIndices[metadata.from] !== metadata.actionStackIndex) {
                logger.info("[action stack] received out-of-order ".concat(method, "; deferring until other actions complete"));
                logger.info("[action stack] requested index: ".concat(metadata.actionStackIndex));
                logger.info("[action stack] current index: ".concat(this.actionStackIndices[metadata.from]));
                return setTimeout(function () {
                    _this.orderedAction(method, metadata, cb);
                }, TIMER_TIMEOUT);
            }
            this.advanceActionStackIndexForMetadata(metadata);
            return cb();
        }
        return cb();
    };
    ActionStack.prototype.handleActionInitiation = function (method, params, metadata, continuation) {
        var _this = this;
        if (this.project.isRemoteRequest(metadata)) {
            // If we're receiving an action whose originator (not us) modified its
            // undo/redo stack, we need to make sure we do that action as well
            if (metadata.cursor === ActionStack.CURSOR_MODES.redo) {
                this.popUndoable(this.project.getCurrentActiveComponent());
            }
            else if (metadata.cursor === ActionStack.CURSOR_MODES.undo) {
                this.popRedoable(this.project.getCurrentActiveComponent());
            }
        }
        // No component needed nor available if the method called is in the Project scope
        var ac = (typeof params[0] === 'string')
            ? this.project.findActiveComponentBySourceIfPresent(params[0]) // relpath
            : null;
        // The callback will fire immediately before the action is transmitted
        // This callback is named handleActionResolution
        var finish = function (inverter) { return _this.orderedAction(method, metadata, function () { return continuation(function (err, out) {
            if (err) {
                return;
            }
            if (!inverter) {
                inverter = _this.buildMethodInverterAction(ac, method, params, metadata, 'after', out);
            }
            else {
                delete _this.accumulatedInverters[method];
            }
            var did = false;
            if (inverter) {
                // Note that we use the cursor mode we snapshotted when the method was initiated
                if (
                // No cursor mode is equivalent to the default cursor mode
                !metadata.cursor) {
                    did = true;
                    // Reset the redo stack.
                    _this.redoables.length = 0;
                    _this.addUndoable(inverter, ac);
                }
                else if (metadata.cursor === ActionStack.CURSOR_MODES.undo) {
                    did = true;
                    _this.addUndoable(inverter, ac);
                }
                else if (metadata.cursor === ActionStack.CURSOR_MODES.redo) {
                    did = true;
                    _this.addRedoable(inverter, ac);
                }
                if (did) {
                    logger.info("[action stack] inversion :::", metadata.cursor, inverter.method, 
                    // inverter.params, // Big/circular objects cause total process lockup
                    _this.getUndoables().length, '<~u|r~>', _this.getRedoables().length);
                }
            }
        }); }); };
        if (SNAPSHOTTED_UNDOABLES[method]) {
            return ac.pushBytecodeSnapshot(function () { return finish({
                method: ac.popBytecodeSnapshot.name,
                params: [
                    params[0], // relpath
                    metadata,
                ],
            }); });
        }
        return finish(this.buildMethodInverterAction(ac, method, params, metadata, 'before'));
    };
    ActionStack.prototype.undo = function (options, metadata, cb) {
        var _this = this;
        this.forceAccumulation();
        if (this.getUndoables().length < 1) {
            return cb();
        }
        logger.info("[action stack] undo (us=".concat(this.getUndoables().length, ")"));
        return Lock.request(Lock.LOCKS.ActionStackUndoRedo, false, function (release) {
            var undoable = _this.popUndoable(_this.project.getCurrentActiveComponent());
            if (!undoable) {
                release();
                return cb();
            }
            var method = undoable.method, params = undoable.params, ac = undoable.ac;
            if (!ac) {
                release();
                return cb();
            }
            var metadata = lodash.assign({}, params.pop(), { cursor: 'redo', from: _this.project.getAlias() });
            params.push(metadata);
            // We need to slice off the 'relpath' parameter (sorry)
            return ac[method].apply(ac, __spreadArray(__spreadArray([], params.slice(1), false), [function (err, out) {
                    release();
                    return cb(err, out);
                }], false));
        });
    };
    ActionStack.prototype.redo = function (options, metadata, cb) {
        var _this = this;
        this.forceAccumulation();
        if (this.getRedoables().length < 1) {
            return cb();
        }
        logger.info("[action stack] redo (rs=".concat(this.getRedoables().length, ")"));
        return Lock.request(Lock.LOCKS.ActionStackUndoRedo, false, function (release) {
            var redoable = _this.popRedoable(_this.project.getCurrentActiveComponent());
            if (!redoable) {
                release();
                return cb();
            }
            var method = redoable.method, params = redoable.params, ac = redoable.ac;
            if (!ac) {
                release();
                return cb();
            }
            var metadata = lodash.assign({}, params.pop(), { cursor: 'undo', from: _this.project.getAlias() });
            params.push(metadata);
            // We need to slice off the 'relpath' parameter (sorry)
            return ac[method].apply(ac, __spreadArray(__spreadArray([], params.slice(1), false), [function (err, out) {
                    release();
                    return cb(err, out);
                }], false));
        });
    };
    return ActionStack;
}(BaseModel));
ActionStack.DEFAULT_OPTIONS = {
    required: {
        uid: true,
        project: true,
    },
};
BaseModel.extend(ActionStack);
/**
 * Translate the parameters of a method into the method signature of
 * a command that would perfectly invert the method.
 * These functions are called with the Project object as the this-binding.
 * Returning falsy indicates that the method cannot be inverted (undone).
 * These are called _before_ the method is invoked, so you can access the data
 * in the ActiveComponent object prior to the data mutation.
 */
ActionStack.METHOD_INVERTERS = {
    conglomerateComponent: {
        before: function (ac, _a) {
            var componentIds = _a[0], name = _a[1], size = _a[2], translation = _a[3], coords = _a[4], propertiesSerial = _a[5], options = _a[6];
            return ({
                method: ac.unconglomerateComponent.name,
                params: [componentIds, name, size, translation, coords, propertiesSerial, options],
            });
        },
    },
    unconglomerateComponent: {
        before: function (ac, _a) {
            var componentIds = _a[0], name = _a[1], size = _a[2], translation = _a[3], coords = _a[4], propertiesSerial = _a[5], options = _a[6];
            return ({
                method: ac.conglomerateComponent.name,
                params: [componentIds, name, size, translation, coords, propertiesSerial, options],
            });
        },
    },
    updateKeyframes: {
        before: function (ac, _a) {
            var keyframeUpdates = _a[0];
            var previousUpdates = ac.snapshotKeyframeUpdates(keyframeUpdates);
            return {
                method: ac.updateKeyframes.name,
                params: [previousUpdates, {}],
            };
        },
    },
    moveKeyframes: {
        before: function (ac, _a) {
            var keyframeMoves = _a[0];
            var previousMoves = ac.snapshotKeyframeMoves(keyframeMoves);
            return {
                method: ac.moveKeyframes.name,
                params: [previousMoves],
            };
        },
    },
    instantiateComponent: {
        after: function (ac, _a, output) {
            var modpath = _a[0], coords = _a[1];
            if (output) {
                return {
                    method: ac.deleteComponents.name,
                    params: [[output.attributes['haiku-id']]],
                };
            }
        },
    },
    deleteComponents: {
        before: function (ac, _a) {
            var haikuIds = _a[0];
            return ({
                method: ac.pasteThings.name,
                params: [
                    haikuIds.map(function (haikuId) { return ac.findElementByComponentId(haikuId); }).filter(function (element) { return !!element; }).map(function (element) { return element.clip(); }),
                    // Paste the content-as is; don't pad ids or our previous undoable references won't match the new content
                    { skipHashPadding: true },
                ],
            });
        },
    },
    pasteThings: {
        after: function (ac, _, _a) {
            var haikuIds = _a.haikuIds;
            return {
                method: ac.deleteComponents.name,
                params: [haikuIds],
            };
        },
    },
    changeKeyframeValue: {
        before: function (ac, _a) {
            var componentId = _a[0], timelineName = _a[1], propertyName = _a[2], keyframeMs = _a[3], newValue = _a[4];
            var oldValue = ac.getKeyframeValue(componentId, timelineName, keyframeMs, propertyName);
            return {
                method: ac.changeKeyframeValue.name,
                params: [componentId, timelineName, propertyName, keyframeMs, oldValue],
            };
        },
    },
    changeSegmentCurve: {
        before: function (ac, _a) {
            var componentId = _a[0], timelineName = _a[1], propertyName = _a[2], keyframeMs = _a[3], newCurve = _a[4];
            var oldCurve = ac.getKeyframeCurve(componentId, timelineName, keyframeMs, propertyName);
            return {
                method: ac.changeSegmentCurve.name,
                params: [componentId, timelineName, propertyName, keyframeMs, oldCurve],
            };
        },
    },
    createKeyframe: {
        before: function (ac, _a) {
            var componentId = _a[0], timelineName = _a[1], elementName = _a[2], propertyName = _a[3], keyframeStartMs = _a[4], keyframeValue = _a[5], keyframeCurve = _a[6], keyframeEndMs = _a[7], keyframeEndValue = _a[8];
            var oldValue = ac.getKeyframeValue(componentId, timelineName, keyframeStartMs, propertyName);
            var oldCurve = ac.getKeyframeCurve(componentId, timelineName, keyframeStartMs, propertyName);
            if (oldValue !== undefined) {
                return {
                    method: ac.createKeyframe.name,
                    params: [componentId, timelineName, elementName, propertyName, keyframeStartMs, oldValue, oldCurve, null, null, null],
                };
            }
            return {
                method: ac.deleteKeyframe.name,
                params: [componentId, timelineName, propertyName, keyframeStartMs],
            };
        },
    },
    deleteKeyframe: {
        before: function (ac, _a) {
            var componentId = _a[0], timelineName = _a[1], propertyName = _a[2], keyframeMs = _a[3];
            var elementName = ac.getSafeElementNameOfComponentId(componentId);
            var oldValue = ac.getKeyframeValue(componentId, timelineName, keyframeMs, propertyName);
            var oldCurve = ac.getKeyframeCurve(componentId, timelineName, keyframeMs, propertyName);
            return {
                method: ac.createKeyframe.name,
                params: [componentId, timelineName, elementName, propertyName, keyframeMs, oldValue, oldCurve, null, null, null],
            };
        },
    },
    joinKeyframes: {
        before: function (ac, _a) {
            var componentId = _a[0], timelineName = _a[1], elementName = _a[2], propertyName = _a[3], keyframeMsLeft = _a[4], keyframeMsRight = _a[5], newCurve = _a[6];
            return {
                method: ac.splitSegment.name,
                params: [componentId, timelineName, elementName, propertyName, keyframeMsLeft],
            };
        },
    },
    splitSegment: {
        before: function (ac, _a) {
            var componentId = _a[0], timelineName = _a[1], elementName = _a[2], propertyName = _a[3], keyframeMs = _a[4];
            var oldCurve = ac.getKeyframeCurve(componentId, timelineName, keyframeMs, propertyName);
            return {
                method: ac.joinKeyframes.name,
                params: [componentId, timelineName, elementName, propertyName, keyframeMs, null, oldCurve],
            };
        },
    },
    upsertStateValue: {
        before: function (ac, _a) {
            var stateName = _a[0], stateDescriptor = _a[1];
            var previousDescriptor = lodash.clone(ac.getStateDescriptor(stateName));
            if (!previousDescriptor) {
                return {
                    method: ac.deleteStateValue.name,
                    params: [stateName],
                };
            }
            return {
                method: ac.upsertStateValue.name,
                params: [stateName, previousDescriptor],
            };
        },
    },
    deleteStateValue: {
        before: function (ac, _a) {
            var stateName = _a[0];
            var previousDescriptor = lodash.clone(ac.getStateDescriptor(stateName));
            return {
                method: ac.upsertStateValue.name,
                params: [stateName, previousDescriptor],
            };
        },
    },
    zMoveToFront: {
        before: function (ac, _a) {
            var componentId = _a[0], timelineName = _a[1], timelineTime = _a[2];
            var moves = ac.gatherZIndexKeyframeMoves(timelineName);
            return {
                method: ac.moveKeyframes.name,
                params: [moves],
            };
        },
    },
    zMoveForward: {
        before: function (ac, _a) {
            var componentId = _a[0], timelineName = _a[1], timelineTime = _a[2];
            var moves = ac.gatherZIndexKeyframeMoves(timelineName);
            return {
                method: ac.moveKeyframes.name,
                params: [moves],
            };
        },
    },
    zMoveBackward: {
        before: function (ac, _a) {
            var componentId = _a[0], timelineName = _a[1], timelineTime = _a[2];
            var moves = ac.gatherZIndexKeyframeMoves(timelineName);
            return {
                method: ac.moveKeyframes.name,
                params: [moves],
            };
        },
    },
    zMoveToBack: {
        before: function (ac, _a) {
            var componentId = _a[0], timelineName = _a[1], timelineTime = _a[2];
            var moves = ac.gatherZIndexKeyframeMoves(timelineName);
            return {
                method: ac.moveKeyframes.name,
                params: [moves],
            };
        },
    },
    zShiftIndices: {
        before: function (ac, _a) {
            var componentId = _a[0], timelineName = _a[1], timelineTime = _a[2], newIndex = _a[3];
            var moves = ac.gatherZIndexKeyframeMoves(timelineName);
            return {
                method: ac.moveKeyframes.name,
                params: [moves],
            };
        },
    },
    setTitleForComponent: {
        after: function (ac, _a, oldTitle) {
            var componentId = _a[0];
            return ({
                method: ac.setTitleForComponent.name,
                params: [componentId, oldTitle],
            });
        },
    },
    // mergeDesigns: {
    //   before: (ac, [designs]) => {
    //     // Not yet implemented; user should undo within their design tool
    //   }
    // },
    // upsertEventHandler: {
    //   before: (ac, [selectorName, eventName, handlerDescriptor]) => {
    //     // Not yet implemented
    //   }
    // },
    // batchUpsertEventHandlers: {
    //   before: (ac, [selectorName, serializedEvents]) => {
    //     // Not yet implemented
    //   }
    // },
};
ActionStack.CURSOR_MODES = {
    undo: 'undo',
    redo: 'redo',
};
ActionStack.toPOJO = function (instance) {
    return {
        uid: instance.uid,
        stopped: instance.stopped,
        undoables: instance.undoables,
        redoables: instance.redoables,
        actions: instance.actions,
    };
};
ActionStack.fromPOJO = function (pojo) {
    return ActionStack.upsert(pojo, {});
};
module.exports = ActionStack;
//# sourceMappingURL=ActionStack.js.map