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
var clone = import { clone } from 'lodash-es';
var cloneDeepWith = import { cloneDeepWith } from 'lodash-es';
var merge = import { merge } from 'lodash-es';
var BaseModel = require('./BaseModel');
var enhance = require("@haiku/core/lib/reflection/enhance.js").default;
var xmlToMana = require('haiku-common/lib/layout/xmlUtils').xmlToMana;
var convertManaLayout = require('haiku-common/lib/layout/convertManaLayout').default;
var expressionToRO = require("@haiku/core/lib/reflection/expressionToRO.js").default;
var reifyRO = require("@haiku/core/lib/reflection/reifyRO.js").default;
var logger = require('haiku-serialization/src/utils/LoggerInstance');
var HAIKU_ID_ATTRIBUTE = 'haiku-id';
var HAIKU_TITLE_ATTRIBUTE = 'haiku-title';
var DEFAULT_TIMELINE_NAME = 'Default';
var DEFAULT_TIMELINE_TIME = 0;
var DEFAULT_ROOT_NODE_NAME = 'div';
var FALLBACK_TEMPLATE = '<' + DEFAULT_ROOT_NODE_NAME + '></' + DEFAULT_ROOT_NODE_NAME + '>';
var DEFAULT_CONTEXT_SIZE = { width: 550, height: 400 };
var DO_REIFY_FUNCTIONS = true;
var DEFAULT_CURVE = 'easeInOutQuad';
function isEmpty(val) {
    return val === undefined;
}
// TODO: There might be cases where somebody's added a keyframe value whose intent
// is to be a reference, i.e. a variable referencing something defined in closure.
// We can possibly handle that in the future in some cases...
function referenceEvaluatorMissing(arg) {
    logger.warn('[bytecode] reference evaluator is not implemented');
    return arg;
}
function ensureManaChildrenArray(mana) {
    var previous = mana.children;
    var children = [];
    mana.children = children;
    if (previous) {
        mana.children.push(previous);
    }
    return mana;
}
/**
 * @class Bytecode
 * @description
 *  Collection of static class methods for bytecode manipulation.
 */
var Bytecode = /** @class */ (function (_super) {
    __extends(Bytecode, _super);
    function Bytecode() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return Bytecode;
}(BaseModel));
Bytecode.DEFAULT_OPTIONS = {
    required: {},
};
BaseModel.extend(Bytecode);
/**
 * @method areBytecodesIsomorphic
 * @description Determine whether two bytecode objects are isomorphic, i.e.
 * effectively represent the same scene graph structure and addressable properties.
 * @returns {Boolean}
 */
Bytecode.areBytecodesIsomorphic = function (b1, b2) {
    var areStates = State.areStatesEquivalent(b1.states, b2.states);
    var areTemplates = Template.areTemplatesEquivalent(b1.template, b2.template);
    return areStates && areTemplates;
};
Bytecode.cleanBytecode = function (bytecode) {
    var elementsByHaikuId = Template.getAllElementsByHaikuId(bytecode.template);
    for (var timelineName in bytecode.timelines) {
        var timelineObject = bytecode.timelines[timelineName];
        for (var timelineSelector in timelineObject) {
            if (Template.isHaikuIdSelector(timelineSelector)) {
                var hid = Template.haikuSelectorToHaikuId(timelineSelector);
                if (!elementsByHaikuId[hid]) {
                    delete timelineObject[timelineSelector];
                }
            }
            else {
                // Any property like __max is runtime-only and needs to be stripped
                if (timelineSelector[0] === '_' && timelineSelector[1] === '_') {
                    delete timelineObject[timelineSelector];
                }
            }
        }
    }
    if (bytecode.eventHandlers) {
        for (var eventSelector in bytecode.eventHandlers) {
            if (Template.isHaikuIdSelector(eventSelector)) {
                var hid = Template.haikuSelectorToHaikuId(eventSelector);
                if (!elementsByHaikuId[hid]) {
                    delete bytecode.eventHandlers[eventSelector];
                }
            }
        }
    }
};
Bytecode.getAppliedStatesForNode = function (out, bytecode, node) {
    var allExprParams = [];
    // We'll collect only the selectors that impact the specific node
    var selectorsInvolved = {};
    Template.visit(node, function (node) {
        if (node && node.attributes) {
            selectorsInvolved["haiku:".concat(node.attributes[HAIKU_ID_ATTRIBUTE])] = true;
        }
    });
    for (var timelineName in bytecode.timelines) {
        for (var selector in bytecode.timelines[timelineName]) {
            // Only include states that are used in expressions that affect our
            // node itself or descendant nodes contained within it
            if (!selectorsInvolved[selector]) {
                continue;
            }
            for (var propertyName in bytecode.timelines[timelineName][selector]) {
                for (var keyframeMs in bytecode.timelines[timelineName][selector][propertyName]) {
                    var keyframeObj = bytecode.timelines[timelineName][selector][propertyName][keyframeMs];
                    // States are considered "used" if they are ADI'd as parameters, i.e.,
                    // listed as parameter names in the signature of an expression function
                    if (typeof keyframeObj.value === 'function') {
                        // This adds a .specification object directly to the function
                        // which describes the function as a serializable payload
                        enhance(keyframeObj.value);
                        allExprParams.push.apply(allExprParams, keyframeObj.value.specification.params);
                    }
                }
            }
        }
    }
    var uniqStateNames = {};
    allExprParams.forEach(function (paramName) {
        if (typeof paramName === 'string') { // In case of legacy destructured objects
            uniqStateNames[paramName] = true;
        }
    });
    for (var stateName in bytecode.states) {
        // Filter out states that haven't been explicitly used by this element
        if (!uniqStateNames[stateName]) {
            continue;
        }
        var stateDescriptor = bytecode.states[stateName];
        out[stateName] = lodash.clone(stateDescriptor);
    }
    return out;
};
Bytecode.getAppliedHelpersForNode = function (out, bytecode, element) {
    Template.visit(element, function (node) {
        for (var helperName in bytecode.helpers) {
            // Is it possible for us to detect which states are actually in use by this node?
            // If so, TODO: perhaps only include those applicable states
            var helperFunction = bytecode.helpers[helperName];
            out[helperName] = helperFunction;
        }
    });
    return out;
};
Bytecode.getAppliedTimelinesForNode = function (out, bytecode, element) {
    Template.visit(element, function (node) {
        for (var timelineName in bytecode.timelines) {
            for (var timelineSelector in bytecode.timelines[timelineName]) {
                var haikuId = Template.haikuSelectorToHaikuId(timelineSelector);
                if (node && node.attributes && node.attributes[HAIKU_ID_ATTRIBUTE] === haikuId) {
                    if (!out[timelineName]) {
                        out[timelineName] = {};
                    }
                    out[timelineName][timelineSelector] = bytecode.timelines[timelineName][timelineSelector];
                }
            }
        }
    });
    return out;
};
Bytecode.getAppliedEventHandlersForNode = function (out, bytecode, element) {
    Template.visit(element, function (node) {
        for (var eventSelector in bytecode.eventHandlers) {
            var haikuId = Template.haikuSelectorToHaikuId(eventSelector);
            if (node && node.attributes && node.attributes[HAIKU_ID_ATTRIBUTE] === haikuId) {
                out[eventSelector] = bytecode.eventHandlers[eventSelector];
            }
        }
    });
    return out;
};
Bytecode.padIds = function (bytecode, padderFunction) {
    var fixedReferences = {};
    var templateNodes = [];
    // Apply padding to all identifiers within the template, tracking what changed
    Template.visit(bytecode.template, function (node) {
        if (node && node.attributes) {
            templateNodes.push(node);
        }
    });
    templateNodes.forEach(function (node) {
        var haikuId = node.attributes[HAIKU_ID_ATTRIBUTE];
        if (haikuId) {
            var fixedHaikuId = padderFunction(haikuId);
            fixedReferences[haikuId] = fixedHaikuId;
            node.attributes[HAIKU_ID_ATTRIBUTE] = fixedReferences[haikuId];
        }
        var domId = node.attributes.id;
        if (domId) {
            var fixedDomId = padderFunction(domId);
            fixedReferences["url(#".concat(domId, ")")] = "url(#".concat(fixedDomId, ")"); // filter="url(...)"
            fixedReferences["#".concat(domId)] = "#".concat(fixedDomId); // xlink:href="#path-3-abc123"
            node.attributes.id = fixedDomId;
            // Sketch outputs layer names as element ids, which are usually human friendly.
            // That human friendly element id is used downstream as a label for display, so
            // we need to retain it for display purposes since we've just clobbered it here.
            // #FIXME: In lieu of the refactoring this to build it the right way, this is my hack.
            if (!node.attributes[HAIKU_TITLE_ATTRIBUTE]) {
                node.attributes[HAIKU_TITLE_ATTRIBUTE] = domId;
            }
        }
    });
    for (var originalReference in fixedReferences) {
        var updatedReference = fixedReferences[originalReference];
        if (bytecode.eventHandlers) {
            transferReferences(bytecode.eventHandlers, originalReference, updatedReference);
        }
        if (bytecode.timelines) {
            for (var timelineName in bytecode.timelines) {
                var timelineObject = bytecode.timelines[timelineName];
                transferReferences(timelineObject, originalReference, updatedReference);
                for (var timelineSelector in timelineObject) {
                    for (var propertyName in timelineObject[timelineSelector]) {
                        if (propertyName === 'content') {
                            continue;
                        }
                        // TODO: Only apply to attributes known to use references? Or would that be brittle?
                        //       For example, only filter, stroke, xlink:href...?
                        for (var keyframeMs in timelineObject[timelineSelector][propertyName]) {
                            var propertyValue = timelineObject[timelineSelector][propertyName][keyframeMs].value;
                            var fixedValue = fixedReferences[propertyValue];
                            if (fixedValue) {
                                timelineObject[timelineSelector][propertyName][keyframeMs].value = fixedValue;
                            }
                        }
                    }
                }
            }
        }
    }
    templateNodes.forEach(function (node) {
        for (var attrKey in node.attributes) {
            if (ATTRS_TO_EXCLUDE_FROM_ID_PADDING[attrKey]) {
                continue;
            }
            var attrVal = node.attributes[attrKey];
            if (typeof attrVal !== 'string') {
                continue;
            }
            if (fixedReferences[attrVal.trim()]) {
                node.attributes[attrKey] = fixedReferences[attrVal.trim()];
            }
        }
    });
};
var ATTRS_TO_EXCLUDE_FROM_ID_PADDING = {
    // We often derive the haiku-title from an id="" attribute, which can result in
    // the haiku-title getting clobbered due to a collision in the fixedReferences
    // lookup table
    'haiku-title': true,
    'haiku-source': true,
    'haiku-var': true,
};
function transferReferences(obj, originalReference, updatedReference) {
    if (obj["#".concat(originalReference)]) {
        obj["#".concat(updatedReference)] = obj["#".concat(originalReference)];
        delete obj["#".concat(originalReference)];
    }
    else if (obj["haiku:".concat(originalReference)]) {
        obj["haiku:".concat(updatedReference)] = obj["haiku:".concat(originalReference)];
        delete obj["haiku:".concat(originalReference)];
    }
}
/**
 * @method mergeBytecode
 * @description Given two bytecode objects assumed to be from the same design source
 * (effectively have the same structure and properties), merge their contents together,
 * incorporating default state changes etc.
 */
Bytecode.mergeBytecode = function (b1, b2) {
    if (!b1.metadata) {
        b1.metadata = {};
    }
    Object.assign(b1.metadata, b2.metadata || {});
    if (!b1.options) {
        b1.options = {};
    }
    Object.assign(b1.options, b2.options || {});
    if (!b1.helpers) {
        b1.helpers = {};
    }
    Object.assign(b1.helpers, b2.helpers || {});
    Bytecode.mergeBytecodeControlStructures(b1, b2);
    b1.template = Template.clone({}, b2.template);
    return b1;
};
Bytecode.mergeBytecodeStates = function (b1, b2) {
    if (b2.states && !b1.states) {
        b1.states = {};
    }
    if (b2.states) {
        for (var stateKey in b2.states) {
            var previousState = b1.states[stateKey];
            if (!previousState || (previousState && !previousState.edited)) {
                b1.states[stateKey] = b2.states[stateKey];
            }
        }
    }
};
Bytecode.mergeBytecodeEventHandlers = function (b1, b2) {
    if (b2.eventHandlers && !b1.eventHandlers) {
        b1.eventHandlers = {};
    }
    if (b2.eventHandlers) {
        for (var eventSelector in b2.eventHandlers) {
            for (var eventName in b2.eventHandlers[eventSelector]) {
                var previousEventHandler = (b1.eventHandlers[eventSelector] &&
                    b1.eventHandlers[eventSelector][eventName]);
                if (!previousEventHandler || (previousEventHandler && !previousEventHandler.edited)) {
                    if (!b1.eventHandlers[eventSelector]) {
                        b1.eventHandlers[eventSelector] = {};
                    }
                    b1.eventHandlers[eventSelector][eventName] = b2.eventHandlers[eventSelector][eventName];
                }
            }
        }
    }
};
Bytecode.mergeTimelines = function (t1, t2, doMergeValueFn) {
    // Presently used for debugging purposes, but also may be valuable for in-mem undo/redo
    var changesMade = [];
    if (!t1 || !t2) {
        return changesMade;
    }
    for (var timelineName in t2) {
        for (var timelineSelector in t2[timelineName]) {
            for (var propertyName in t2[timelineName][timelineSelector]) {
                for (var keyframeMs in t2[timelineName][timelineSelector][propertyName]) {
                    var previousKeyframe = (t1[timelineName] &&
                        t1[timelineName][timelineSelector] &&
                        t1[timelineName][timelineSelector][propertyName] &&
                        t1[timelineName][timelineSelector][propertyName][keyframeMs]);
                    if (!previousKeyframe || (previousKeyframe && !previousKeyframe.edited)) {
                        if (!t1[timelineName]) {
                            t1[timelineName] = {};
                        }
                        if (!t1[timelineName][timelineSelector]) {
                            t1[timelineName][timelineSelector] = {};
                        }
                        if (!t1[timelineName][timelineSelector][propertyName]) {
                            t1[timelineName][timelineSelector][propertyName] = {};
                        }
                        if (!t1[timelineName][timelineSelector][propertyName][keyframeMs]) {
                            t1[timelineName][timelineSelector][propertyName][keyframeMs] = {};
                        }
                        var targetObj = t1[timelineName][timelineSelector][propertyName][keyframeMs];
                        var sourceObj = t2[timelineName][timelineSelector][propertyName][keyframeMs];
                        if (sourceObj && sourceObj.curve !== undefined) {
                            targetObj.curve = sourceObj.curve;
                        }
                        if (sourceObj && sourceObj.edited !== undefined) {
                            targetObj.edited = sourceObj.edited;
                        }
                        if (sourceObj && sourceObj.value !== undefined) {
                            if (targetObj.value !== sourceObj.value) {
                                if (doMergeValueFn) {
                                    if (doMergeValueFn(propertyName, targetObj.value, sourceObj.value)) {
                                        changesMade.push({ timelineName: timelineName, timelineSelector: timelineSelector, propertyName: propertyName, keyframeMs: keyframeMs, value: sourceObj.value });
                                        targetObj.value = sourceObj.value;
                                    }
                                }
                                else {
                                    changesMade.push({ timelineName: timelineName, timelineSelector: timelineSelector, propertyName: propertyName, keyframeMs: keyframeMs, value: sourceObj.value });
                                    targetObj.value = sourceObj.value;
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    return changesMade;
};
Bytecode.mergeBytecodeControlStructures = function (b1, b2) {
    Bytecode.mergeBytecodeStates(b1, b2);
    Bytecode.mergeBytecodeEventHandlers(b1, b2);
    if (b2.timelines && !b1.timelines) {
        b1.timelines = {};
    }
    return Bytecode.mergeTimelines(b1.timelines, b2.timelines);
};
Bytecode.pasteBytecode = function (destination, pasted) {
    if (pasted.states) {
        if (!destination.states) {
            destination.states = {};
        }
        for (var stateKey in pasted.states) {
            destination.states[stateKey] = pasted.states[stateKey];
        }
    }
    if (pasted.eventHandlers) {
        if (!destination.eventHandlers) {
            destination.eventHandlers = {};
        }
        for (var eventSelector in pasted.eventHandlers) {
            for (var eventName in pasted.eventHandlers[eventSelector]) {
                if (!destination.eventHandlers[eventSelector]) {
                    destination.eventHandlers[eventSelector] = {};
                }
                destination.eventHandlers[eventSelector][eventName] = pasted.eventHandlers[eventSelector][eventName];
            }
        }
    }
    if (pasted.timelines) {
        if (!destination.timelines) {
            destination.timelines = {};
        }
        for (var timelineName in pasted.timelines) {
            for (var timelineSelector in pasted.timelines[timelineName]) {
                for (var propertyName in pasted.timelines[timelineName][timelineSelector]) {
                    for (var keyframeMs in pasted.timelines[timelineName][timelineSelector][propertyName]) {
                        if (!destination.timelines[timelineName]) {
                            destination.timelines[timelineName] = {};
                        }
                        if (!destination.timelines[timelineName][timelineSelector]) {
                            destination.timelines[timelineName][timelineSelector] = {};
                        }
                        if (!destination.timelines[timelineName][timelineSelector][propertyName]) {
                            destination.timelines[timelineName][timelineSelector][propertyName] = {};
                        }
                        destination.timelines[timelineName][timelineSelector][propertyName][keyframeMs] = pasted.timelines[timelineName][timelineSelector][propertyName][keyframeMs];
                    }
                }
            }
        }
    }
    // In case of a paste, we need to add a new child rather than merging into existing elements
    if (pasted.template) {
        if (!destination.template) {
            destination.template = { elementName: 'div', attributes: {}, children: [] };
        }
        if (!destination.template.children) {
            destination.template.children = [];
        }
        // Note that when we paste, we place it at the top of the stack, just like with instantiate
        destination.template.children.unshift(pasted.template);
    }
    return destination;
};
Bytecode.applyOverrides = function (overrides, timelinesObject, timelineName, timelineSelector, timelineTime) {
    if (overrides && Object.keys(overrides).length > 0) {
        if (!timelinesObject[timelineName]) {
            timelinesObject[timelineName] = {};
        }
        if (!timelinesObject[timelineName][timelineSelector]) {
            timelinesObject[timelineName][timelineSelector] = {};
        }
        for (var propertyName in overrides) {
            if (!timelinesObject[timelineName][timelineSelector][propertyName]) {
                timelinesObject[timelineName][timelineSelector][propertyName] = {};
            }
            if (!timelinesObject[timelineName][timelineSelector][propertyName][timelineTime]) {
                timelinesObject[timelineName][timelineSelector][propertyName][timelineTime] = {};
            }
            if (!timelinesObject[timelineName][timelineSelector][propertyName][timelineTime].edited) {
                timelinesObject[timelineName][timelineSelector][propertyName][timelineTime].value = overrides[propertyName];
            }
        }
    }
};
Bytecode.extractOverrides = function (bytecode) {
    var overrides = {};
    if (bytecode.states) {
        for (var stateName in bytecode.states) {
            overrides[stateName] = bytecode.states[stateName].value;
        }
    }
    return overrides;
};
Bytecode.clone = function (bytecode) {
    return Bytecode.mergeBytecode({}, bytecode);
};
Bytecode.snapshot = function (bytecode) {
    return cloneDeepWith(bytecode, function (value) {
        if (typeof value === 'function') {
            return value;
        }
    });
};
Bytecode.decycle = function (reified, _a) {
    var _b = _a.cleanManaOptions, cleanManaOptions = _b === void 0 ? {} : _b, doCleanMana = _a.doCleanMana;
    var decycled = {};
    if (!reified) {
        logger.warn("Decycle received falsy bytecode");
        return decycled;
    }
    if (reified.metadata) {
        decycled.metadata = reified.metadata;
    }
    if (reified.options) {
        decycled.options = reified.options;
    }
    if (reified.settings) {
        decycled.settings = reified.settings;
    }
    if (reified.properties) {
        decycled.properties = reified.properties;
    }
    if (reified.states) {
        decycled.states = reified.states;
    }
    if (reified.helpers) {
        decycled.helpers = reified.helpers;
    }
    if (reified.eventHandlers) {
        decycled.eventHandlers = {};
        for (var componentId in reified.eventHandlers) {
            decycled.eventHandlers[componentId] = {};
            for (var eventListenerName in reified.eventHandlers[componentId]) {
                var handlerToAssign = reified.eventHandlers[componentId][eventListenerName].handler;
                decycled.eventHandlers[componentId][eventListenerName] = {
                    handler: handlerToAssign,
                };
            }
        }
    }
    if (reified.timelines) {
        decycled.timelines = reified.timelines;
    }
    if (reified.template) {
        if (doCleanMana) {
            decycled.template = Template.cleanMana(reified.template, cleanManaOptions);
        }
        else {
            // Cleaning mana will mess with instantiated component modules, which is why
            // doCleanMana is an option
            decycled.template = reified.template;
        }
    }
    return decycled;
};
/**
 * @method reinitialize
 * @description Make sure the in-memory bytecode object has all of the correct settings,
 * attributes, and structure. This ought to get called if the bytecode has just been
 * ingested from somewhere and you need to make sure it is right.
 */
Bytecode.reinitialize = function (folder, relpath, bytecode, config) {
    var _a;
    if (bytecode === void 0) { bytecode = {}; }
    if (config === void 0) { config = {}; }
    var mana;
    if (typeof bytecode.template === 'string') {
        mana = xmlToMana(bytecode.template || FALLBACK_TEMPLATE);
    }
    else if (typeof bytecode.template === 'object') {
        mana = bytecode.template || xmlToMana(FALLBACK_TEMPLATE);
    }
    else {
        // If nothing had been set, what is the risk of just setting it here?
        mana = { elementName: 'div', attributes: {}, children: [] };
    }
    bytecode.template = mana;
    // Since we may be appending a child, make sure the children is an array
    if (!Array.isArray(bytecode.template.children)) {
        ensureManaChildrenArray(bytecode.template);
    }
    // We're about to mutate this, so may as well make sure it's present
    if (!bytecode.template.attributes) {
        bytecode.template.attributes = {};
    }
    Template.ensureTopLevelDisplayAttributes(bytecode.template);
    // Hack...but helps avoid issues downstream if the template part of the bytecode was empty
    if (!bytecode.template.elementName) {
        bytecode.template.elementName = 'div';
    }
    // Ensure the top-level context gets the appropriate display attributes
    Template.ensureRootDisplayAttributes(bytecode.template);
    // Make sure there is an options object (can be used for playback configuration)
    if (!bytecode.options) {
        bytecode.options = {};
    }
    // Make sure there is always a timelines object
    if (!bytecode.timelines) {
        bytecode.timelines = {};
    }
    // And make sure there is always a default timelines object
    if (!bytecode.timelines[DEFAULT_TIMELINE_NAME]) {
        bytecode.timelines[DEFAULT_TIMELINE_NAME] = {};
    }
    // Expand shorthand. This happens during component mounting, but we may need it sooner for our static bytecode
    // manipulation.
    for (var timelineName in bytecode.timelines) {
        for (var selector in bytecode.timelines[timelineName]) {
            // Expand all bytecode properties represented as shorthand.
            for (var property in bytecode.timelines[timelineName][selector]) {
                if (typeof bytecode.timelines[timelineName][selector][property] !== 'object') {
                    bytecode.timelines[timelineName][selector][property] = (_a = {},
                        _a[DEFAULT_TIMELINE_TIME] = {
                            value: bytecode.timelines[timelineName][selector][property],
                        },
                        _a);
                }
            }
        }
    }
    convertManaLayout(bytecode.template);
    // Make sure there is at least a baseline metadata objet
    Bytecode.writeMetadata(bytecode, lodash.assign({}, config, {
        // config: name, organization, project, branch, version, core
        uuid: 'HAIKU_SHARE_UUID', // This magic string is detected+replaced by our cloud services to produce a full share link
        root: 'HAIKU_CDN_PROJECT_ROOT', // This magic string is detected+replaced by our cloud services for automagical CDN hosting
        type: 'haiku',
        relpath: relpath,
    }));
    // Make sure all elements in the tree have a haiku-id assigned
    Template.ensureTitleAndUidifyTree(bytecode.template, Template.normalizePath(relpath), // Fallback for title
    Template.normalizePath(relpath), // Seed string for hash/id generation
    '0', { title: config.title });
    var contextHaikuId = bytecode.template.attributes[HAIKU_ID_ATTRIBUTE];
    var scenename = ModuleWrapper.getScenenameFromRelpath(relpath);
    Bytecode.upsertDefaultProperties(bytecode, contextHaikuId, {
        'style.WebkitTapHighlightColor': 'rgba(0,0,0,0)',
        'style.position': 'relative',
        // Subcomponents overflow is visible since that aligns with user expectation when editing in app.
        // But when publishing the main component, the expectation is that its overflow is hidden on share page.
        'style.overflowX': (scenename === 'main') ? 'hidden' : 'visible',
        'style.overflowY': (scenename === 'main') ? 'hidden' : 'visible',
        'sizeAbsolute.x': DEFAULT_CONTEXT_SIZE.width,
        'sizeAbsolute.y': DEFAULT_CONTEXT_SIZE.height,
        'sizeMode.x': 1,
        'sizeMode.y': 1,
        'sizeMode.z': 1,
    }, 'assign');
    // Make sure every element has an explicit translation; this is sort of a hack that makes sure
    // that when we undo changes to the artboard, all elements on stage have a first value to go back to
    // which we can capture by snapshotting keyframe values before running the operation
    bytecode.template.children.forEach(function (child) {
        var childId = child.attributes && child.attributes[HAIKU_ID_ATTRIBUTE];
        if (childId) {
            var selector = Template.buildHaikuIdSelector(childId);
            Bytecode.ensureDefinedKeyframeProperty(bytecode, DEFAULT_TIMELINE_NAME, selector, 'translation.x', DEFAULT_TIMELINE_TIME, 0);
            Bytecode.ensureDefinedKeyframeProperty(bytecode, DEFAULT_TIMELINE_NAME, selector, 'translation.y', DEFAULT_TIMELINE_TIME, 0);
        }
    });
    return bytecode;
};
Bytecode.ensureDefinedKeyframeProperty = function (bytecode, timelineName, selector, propertyName, keyframeMs, propertyValue) {
    if (!bytecode.timelines[timelineName]) {
        bytecode.timelines[timelineName] = {};
    }
    if (!bytecode.timelines[timelineName][selector]) {
        bytecode.timelines[timelineName][selector] = {};
    }
    if (!bytecode.timelines[timelineName][selector][propertyName]) {
        bytecode.timelines[timelineName][selector][propertyName] = {};
    }
    if (!bytecode.timelines[timelineName][selector][propertyName][keyframeMs]) {
        bytecode.timelines[timelineName][selector][propertyName][keyframeMs] = {};
    }
    if (bytecode.timelines[timelineName][selector][propertyName][keyframeMs].value === undefined) {
        bytecode.timelines[timelineName][selector][propertyName][keyframeMs].value = propertyValue;
    }
};
Bytecode.upsertDefaultProperties = function (bytecode, componentId, propertiesToMerge, strategy) {
    if (!strategy) {
        strategy = 'merge';
    }
    var haikuSelector = "haiku:".concat(componentId);
    if (!bytecode.timelines.Default[haikuSelector]) {
        bytecode.timelines.Default[haikuSelector] = {};
    }
    var defaultTimeline = bytecode.timelines.Default[haikuSelector];
    for (var propName in propertiesToMerge) {
        if (!defaultTimeline.hasOwnProperty(propName)) {
            defaultTimeline[propName] = {};
        }
        if (!defaultTimeline[propName][DEFAULT_TIMELINE_TIME]) {
            defaultTimeline[propName][DEFAULT_TIMELINE_TIME] = {};
        }
        switch (strategy) {
            case 'merge':
                defaultTimeline[propName][DEFAULT_TIMELINE_TIME].value = propertiesToMerge[propName];
                break;
            case 'assign':
                if (defaultTimeline[propName][DEFAULT_TIMELINE_TIME].value === undefined) {
                    defaultTimeline[propName][DEFAULT_TIMELINE_TIME].value = propertiesToMerge[propName];
                }
                break;
        }
    }
};
Bytecode.batchUpsertEventHandlers = function (bytecode, selectorName, serializedEvents) {
    if (!bytecode.eventHandlers) {
        bytecode.eventHandlers = {};
    }
    if (!Object.keys(serializedEvents).length) {
        delete bytecode.eventHandlers[selectorName];
        return;
    }
    bytecode.eventHandlers[selectorName] = {};
    Object.entries(serializedEvents).forEach(function (_a) {
        var event = _a[0], handlerDescriptor = _a[1];
        bytecode.eventHandlers[selectorName][event] = {};
        if (handlerDescriptor.handler !== undefined) {
            bytecode.eventHandlers[selectorName][event].handler = Bytecode.unserializeValue(handlerDescriptor.handler);
        }
    });
    return bytecode;
};
Bytecode.changeKeyframeValue = function (bytecode, componentId, timelineName, propertyName, keyframeMs, newValue) {
    var property = Bytecode.ensureTimelineProperty(bytecode, timelineName, componentId, propertyName);
    property[keyframeMs].value = Bytecode.unserializeValue(newValue);
    property[keyframeMs].edited = true;
    return property;
};
Bytecode.changePlaybackSpeed = function (bytecode, framesPerSecond) {
    if (!bytecode.options) {
        bytecode.options = {};
    }
    bytecode.options.fps = Math.round(parseInt(framesPerSecond, 10));
    if (bytecode.options.fps > 60) {
        bytecode.options.fps = 60;
    }
};
Bytecode.changeSegmentCurve = function (bytecode, componentId, timelineName, propertyName, keyframeMs, newCurve) {
    var property = Bytecode.ensureTimelineProperty(bytecode, timelineName, componentId, propertyName);
    if (!property[keyframeMs]) {
        property[keyframeMs] = {};
    }
    property[keyframeMs].curve = Bytecode.unserializeValue(newCurve); // Curves are usually strings, but can be functions
    property[keyframeMs].edited = true;
    return property;
};
Bytecode.componentIdToSelector = function (componentId) {
    if (componentId.slice(0, 6 === 'haiku:')) {
        return componentId;
    }
    return 'haiku:' + componentId;
};
Bytecode.createKeyframe = function (bytecode, componentId, timelineName, elementName, propertyName, keyframeStartMs, keyframeValueGiven, keyframeCurve, keyframeEndMs, keyframeEndValue, hostInstance, inputValues) {
    var property = Bytecode.ensureTimelineProperty(bytecode, timelineName, componentId, propertyName);
    // These are the *calculated* forms of the value
    var precedingValue = TimelineProperty.getPropertyValueAtTime(bytecode.timelines, timelineName, componentId, elementName, propertyName, keyframeStartMs - 1, hostInstance, inputValues);
    var currentValue = TimelineProperty.getPropertyValueAtTime(bytecode.timelines, timelineName, componentId, elementName, propertyName, keyframeStartMs, hostInstance, inputValues);
    // This is the actually assigned value specification object; we need this in case we have a function
    var precedingAssignedValueObject = TimelineProperty.getAssignedBaselineValueObject(componentId, elementName, propertyName, timelineName, keyframeStartMs - 1, bytecode);
    var precedingAssignedValue = precedingAssignedValueObject && precedingAssignedValueObject.value;
    var currentAssignedValueObject = TimelineProperty.getAssignedBaselineValueObject(componentId, elementName, propertyName, timelineName, keyframeStartMs, bytecode);
    var currentAssignedValue = currentAssignedValueObject && currentAssignedValueObject.value;
    // This is actually an upsert of sorts
    if (!property[keyframeStartMs]) {
        property[keyframeStartMs] = {};
    }
    var keyframeValue = keyframeValueGiven; // <~ Can be (and usually is) undefined, in which case we use a fallback preceding/current
    // Successively attempt to populate the keyframe with various possibilities if the previous ones don't work
    if (isEmpty(keyframeValue)) {
        keyframeValue = currentAssignedValue;
    }
    if (isEmpty(keyframeValue)) {
        keyframeValue = precedingAssignedValue;
    }
    if (isEmpty(keyframeValue)) {
        keyframeValue = currentValue;
    }
    if (isEmpty(keyframeValue)) {
        keyframeValue = precedingValue;
    }
    // Don't forget this in case we got a function e.g. __function: {....} !
    keyframeValue = Bytecode.unserializeValue(keyframeValue);
    property[keyframeStartMs].value = keyframeValue;
    if (keyframeCurve !== undefined && keyframeCurve !== null) {
        property[keyframeStartMs].curve = Bytecode.unserializeValue(keyframeCurve);
    }
    property[keyframeStartMs].edited = true;
    if (keyframeEndMs !== undefined && keyframeEndMs !== null) {
        // This is actually an upsert of sorts
        if (!property[keyframeEndMs]) {
            property[keyframeEndMs] = {};
        }
        property[keyframeEndMs].value = Bytecode.unserializeValue(keyframeEndValue || keyframeValue);
        property[keyframeEndMs].edited = true;
    }
    return property[keyframeStartMs];
};
Bytecode.createTimeline = function (bytecode, timelineName, timelineDescriptor) {
    var timeline = Bytecode.ensureTimeline(bytecode, timelineName);
    if (timelineDescriptor) {
        merge(timeline, Bytecode.unserializeValue(timelineDescriptor));
    }
    return timeline;
};
Bytecode.deleteKeyframe = function (bytecode, componentId, timelineName, propertyName, keyframeMs) {
    var property = Bytecode.ensureTimelineProperty(bytecode, timelineName, componentId, propertyName);
    var mss = Bytecode.getSortedKeyframeKeys(property);
    var list = mss.map(function (ms, i) {
        var prev = mss[i - 1];
        var next = mss[i + 1];
        return {
            edited: property[ms].edited,
            curve: property[ms].curve,
            value: property[ms].value,
            index: i,
            start: ms,
            end: (next !== undefined) ? next : ms,
            first: prev === undefined,
            last: next === undefined,
        };
    });
    var curr = list.filter(function (item) { return item.start === keyframeMs; })[0];
    if (!curr) {
        return property;
    }
    var prev = list[curr.index - 1];
    var next = list[curr.index + 1];
    // First delete our keyframe
    delete property[keyframeMs];
    // Remove the curve from the previous keyframe if it has no subsequent keyframe to attach to
    if (prev && !next) {
        property[prev.start] = {};
        property[prev.start].value = prev.value;
        if (prev.edited) {
            property[prev.start].edited = true;
        }
    }
};
Bytecode.deleteStateValue = function (bytecode, stateName) {
    if (bytecode.states) {
        delete bytecode.states[stateName];
    }
    return bytecode;
};
Bytecode.deleteTimeline = function (bytecode, timelineName) {
    if (bytecode.timelines) {
        delete bytecode.timelines[timelineName];
    }
    return bytecode.timelines;
};
Bytecode.duplicateTimeline = function (bytecode, timelineName) {
    var timeline = Bytecode.ensureTimeline(bytecode, timelineName);
    var duplicate = clone(timeline);
    var newName = timelineName + ' copy';
    Bytecode.createTimeline(bytecode, newName, duplicate); // This does 'unserializeValue' for us
    return newName;
};
Bytecode.ensureTimeline = function (bytecode, timelineName) {
    if (!bytecode.timelines) {
        bytecode.timelines = {};
    }
    if (!bytecode.timelines[timelineName]) {
        bytecode.timelines[timelineName] = {};
    }
    return bytecode.timelines[timelineName];
};
Bytecode.ensureTimelineGroup = function (bytecode, timelineName, componentId) {
    var timeline = Bytecode.ensureTimeline(bytecode, timelineName);
    var selector = Bytecode.componentIdToSelector(componentId);
    if (!timeline[selector]) {
        timeline[selector] = {};
    }
    return timeline[selector];
};
Bytecode.ensureTimelineProperty = function (bytecode, timelineName, componentId, propertyName) {
    var group = Bytecode.ensureTimelineGroup(bytecode, timelineName, componentId);
    if (!group[propertyName]) {
        group[propertyName] = {};
    }
    return group[propertyName];
};
Bytecode.getSortedKeyframeKeys = function (property) {
    if (!property) {
        return [];
    }
    return Object.keys(property).map(function (ms) { return parseInt(ms, 10); }).sort(function (a, b) { return a - b; });
};
// I.e., make a curve out of two separate keyframes
Bytecode.joinKeyframes = function (bytecode, componentId, timelineName, elementName, propertyName, keyframeMsLeft, keyframeMsRight, newCurve) {
    var property = Bytecode.ensureTimelineProperty(bytecode, timelineName, componentId, propertyName);
    // May not be here due to a race condition with large projects
    if (property[keyframeMsLeft]) {
        property[keyframeMsLeft].curve = Bytecode.unserializeValue(newCurve);
        property[keyframeMsLeft].edited = true;
    }
    return property;
};
Bytecode.moveKeyframes = function (bytecode, keyframeMoves) {
    for (var timelineName in keyframeMoves) {
        for (var componentId in keyframeMoves[timelineName]) {
            for (var propertyName in keyframeMoves[timelineName][componentId]) {
                // We might have received this over the wire, so we need to create reified functions out of serialized ones
                var keyframeMove = Bytecode.unserializeValue(keyframeMoves[timelineName][componentId][propertyName]);
                var propertyObject = Bytecode.ensureTimelineProperty(bytecode, timelineName, componentId, propertyName);
                for (var oldMs in propertyObject) {
                    delete propertyObject[oldMs];
                }
                for (var newMs in keyframeMove) {
                    propertyObject[newMs] = keyframeMove[newMs];
                    propertyObject[newMs].edited = true;
                }
            }
        }
    }
};
Bytecode.readAllEventHandlers = function (bytecode) {
    if (!bytecode.eventHandlers) {
        bytecode.eventHandlers = {};
    }
    return bytecode.eventHandlers;
};
Bytecode.readAllStateValues = function (bytecode) {
    if (!bytecode.states) {
        bytecode.states = {};
    }
    return bytecode.states;
};
Bytecode.renameTimeline = function (bytecode, timelineNameOld, timelineNameNew) {
    var old = Bytecode.ensureTimeline(bytecode, timelineNameOld);
    if (timelineNameOld === timelineNameNew) {
        return old;
    }
    if (bytecode.timelines[timelineNameNew]) {
        return old;
    }
    bytecode.timelines[timelineNameNew] = old;
    delete bytecode.timelines[timelineNameOld];
    return old;
};
Bytecode.serializeValue = function (value) {
    return expressionToRO(value);
};
// We may have gotten the serialized form of a value, especially in the case
// of a function expression/formula, so we have to convert its serialized form
// into the reified form, i.e. the 'real' value we want to write to the user's
// code file
Bytecode.unserializeValue = function (value, referenceEvaluator) {
    if (referenceEvaluator === void 0) { referenceEvaluator = referenceEvaluatorMissing; }
    // (The function expects the inverse of the setting)
    var skipFunctions = !DO_REIFY_FUNCTIONS;
    return reifyRO(value, referenceEvaluator, skipFunctions);
};
// aka remove curve
Bytecode.splitSegment = function (bytecode, componentId, timelineName, elementName, propertyName, keyframeMs) {
    var property = Bytecode.ensureTimelineProperty(bytecode, timelineName, componentId, propertyName);
    if (property[keyframeMs]) {
        var orig = property[keyframeMs];
        property[keyframeMs] = { value: orig.value };
        if (orig.edited) {
            property[keyframeMs].edited = true;
        }
    }
    return property;
};
Bytecode.upsertEventHandler = function (bytecode, selectorName, eventName, handlerDescriptor) {
    if (!bytecode.eventHandlers) {
        bytecode.eventHandlers = {};
    }
    if (!bytecode.eventHandlers[selectorName]) {
        bytecode.eventHandlers[selectorName] = {};
    }
    if (!bytecode.eventHandlers[selectorName][eventName]) {
        bytecode.eventHandlers[selectorName][eventName] = {};
    }
    if (handlerDescriptor.handler !== undefined) {
        bytecode.eventHandlers[selectorName][eventName].handler = Bytecode.unserializeValue(handlerDescriptor.handler);
    }
    // The 'edited' flag is used to determine whether a property is overwriteable during a merge.
    // In multi-component, theoretically both designs can be merged and components can be merged.
    bytecode.eventHandlers[selectorName][eventName].edited = true;
    return bytecode;
};
Bytecode.upsertStateValue = function (bytecode, stateName, stateDescriptor) {
    if (!bytecode.states) {
        bytecode.states = {};
    }
    if (!bytecode.states[stateName]) {
        bytecode.states[stateName] = {};
    }
    if (stateDescriptor.type !== undefined) {
        bytecode.states[stateName].type = stateDescriptor.type;
    }
    if (stateDescriptor.value !== undefined) {
        bytecode.states[stateName].value = stateDescriptor.value;
    }
    if (stateDescriptor.access !== undefined) {
        bytecode.states[stateName].access = stateDescriptor.access;
    }
    if (stateDescriptor.mock !== undefined) {
        bytecode.states[stateName].mock = stateDescriptor.mock;
    }
    if (stateDescriptor.get !== undefined) {
        bytecode.states[stateName].get = Bytecode.unserializeValue(stateDescriptor.get);
    }
    if (stateDescriptor.set !== undefined) {
        bytecode.states[stateName].set = Bytecode.unserializeValue(stateDescriptor.set);
    }
    // The 'edited' flag is used to determine whether a property is overwriteable during a merge.
    // In multi-component, theoretically both designs can be merged and components can be merged.
    bytecode.states[stateName].edited = true;
    return bytecode;
};
Bytecode.writeMetadata = function (bytecode, metadata) {
    if (!bytecode.metadata) {
        bytecode.metadata = {};
    }
    if (metadata) {
        for (var key in metadata) {
            if (metadata[key] !== undefined && metadata[key] !== null) {
                bytecode.metadata[key] = metadata[key];
            }
        }
    }
};
Bytecode.upsertPropertyValue = function (bytecode, componentId, timelineName, timelineTime, propertiesToMerge, strategy) {
    if (!strategy) {
        strategy = 'merge';
    }
    var haikuSelector = 'haiku:' + componentId;
    if (!bytecode.timelines[timelineName][haikuSelector]) {
        bytecode.timelines[timelineName][haikuSelector] = {};
    }
    var defaultTimeline = bytecode.timelines[timelineName][haikuSelector];
    for (var propName in propertiesToMerge) {
        if (!defaultTimeline[propName]) {
            defaultTimeline[propName] = {};
        }
        if (!defaultTimeline[propName][timelineTime]) {
            defaultTimeline[propName][timelineTime] = {};
        }
        switch (strategy) {
            case 'merge':
                defaultTimeline[propName][timelineTime].value = propertiesToMerge[propName];
                break;
            case 'assign':
                if (defaultTimeline[propName][timelineTime].value === undefined) {
                    defaultTimeline[propName][timelineTime].value = propertiesToMerge[propName];
                }
                break;
        }
    }
};
Bytecode.replaceTimelinePropertyGroups = function (bytecodeObject, timelineName, timelineSelector, propertyGroup) {
    if (!bytecodeObject.timelines[timelineName]) {
        bytecodeObject.timelines[timelineName] = {};
    }
    if (!bytecodeObject.timelines[timelineName][timelineSelector]) {
        bytecodeObject.timelines[timelineName][timelineSelector] = {};
    }
    Object.assign(bytecodeObject.timelines[timelineName][timelineSelector], propertyGroup);
};
Bytecode.getNormalizedRelpath = function (bc) {
    var r = bc && bc.metadata && bc.metadata.relpath;
    if (r) {
        return Template.normalizePath(r);
    }
};
Bytecode.isBytecodeSame = function (a, b) {
    if (!a || !b) {
        return false;
    }
    if (a === b) {
        return true;
    }
    var relpathA = Bytecode.getNormalizedRelpath(a);
    var relpathB = Bytecode.getNormalizedRelpath(b);
    if (relpathA && relpathB) {
        return relpathA === relpathB;
    }
    return false;
};
Bytecode.doesMatchOrHostBytecode = function (ours, theirs, seen) {
    if (seen === void 0) { seen = {}; }
    seen[Bytecode.getNormalizedRelpath(ours)] = true;
    if (Bytecode.isBytecodeSame(ours, theirs)) {
        return true;
    }
    var answer = false;
    Template.visit(ours.template, function (node) {
        // No need to proceed if we've already found our answer
        if (answer) {
            return;
        }
        if (typeof node.elementName === 'object') {
            var relpath = Bytecode.getNormalizedRelpath(node.elementName);
            if (seen[relpath]) {
                return;
            }
            seen[relpath] = true;
            if (Bytecode.doesMatchOrHostBytecode(node.elementName, theirs, seen)) {
                answer = true;
            }
        }
    });
    return answer;
};
Bytecode.addDefaultCurveIfNecessary = function (bytecode, timelineName, selector, newKeyframeTime, propertyName, componentId, elementName) {
    var property = bytecode.timelines[timelineName][selector][propertyName];
    if (property) {
        var orderedKeyframes = Object.keys(property)
            .map(Number)
            .sort(function (a, b) { return a - b; });
        var lastKeyframe = orderedKeyframes
            .filter(function (time) { return time < newKeyframeTime; })
            .pop();
        var nextKeyframe = orderedKeyframes
            .filter(function (time) { return time > newKeyframeTime; })
            .shift();
        if (lastKeyframe !== undefined &&
            property[lastKeyframe].curve === undefined &&
            property[lastKeyframe].value !== property[newKeyframeTime].value) {
            Bytecode.joinKeyframes(bytecode, componentId, timelineName, elementName, propertyName, lastKeyframe, newKeyframeTime, DEFAULT_CURVE);
        }
        // Also create a default curve on the keyframe we're creating, if there is a keyframe in front of it
        if (nextKeyframe &&
            property[newKeyframeTime].curve === undefined &&
            property[nextKeyframe].value !== property[newKeyframeTime].value) {
            Bytecode.joinKeyframes(bytecode, componentId, timelineName, elementName, propertyName, newKeyframeTime, nextKeyframe, DEFAULT_CURVE);
        }
    }
};
module.exports = Bytecode;
// Down here to avoid Node circular dependency stub objects. #FIXME
var ModuleWrapper = require('./ModuleWrapper');
var State = require('./State');
var Template = require('./Template');
var TimelineProperty = require('./TimelineProperty');
//# sourceMappingURL=Bytecode.js.map