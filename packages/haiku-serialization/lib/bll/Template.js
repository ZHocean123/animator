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
var find = import { find } from 'lodash-es';
var merge = import { merge } from 'lodash-es';
var pascalcase = require('pascalcase');
var ATTRS_HYPH_TO_CAMEL = require('@haiku/core/lib/HaikuComponent').ATTRS_HYPH_TO_CAMEL;
var SVGPoints = require('@haiku/core/lib/helpers/SVGPoints').default;
var convertManaLayout = require('haiku-common/lib/layout/convertManaLayout').default;
var visitManaTree = require('@haiku/core/lib/HaikuNode').visitManaTree;
var manaToXml = require('haiku-common/lib/layout/xmlUtils').manaToXml;
var assign = import { assign } from 'lodash-es';
var defaults = import { defaults } from 'lodash-es';
var BaseModel = require('./BaseModel');
var CryptoUtils = require('./../utils/CryptoUtils');
var GROUP_DELIMITER = '.';
var MERGE_STRATEGIES = {
    assign: 'assign',
    defaults: 'defaults',
};
var ROOT_LOCATOR = '0';
var HAIKU_ID_ATTRIBUTE = 'haiku-id';
var HAIKU_SOURCE_ATTRIBUTE = 'haiku-source';
var HAIKU_TITLE_ATTRIBUTE = 'haiku-title';
var HAIKU_SELECTOR_PREFIX = 'haiku';
var REF_MATCHER_RE = /^url\(#(.*)\)$/;
var TEMPLATE_METADATA_ATTRIBUTES = {
    version: true,
    encoding: true,
    standalone: true,
    xmlns: true,
    'xmlns:xlink': true,
    lang: true,
    charset: true,
    content: true,
    'http-equiv': true,
    scheme: true,
    identifier: true,
    'haiku-id': true,
    'haiku-var': true,
    'haiku-title': true,
    'haiku-source': true,
    'haiku-transclude': true,
    'haiku-locked': true,
};
var SELECTOR_ATTRIBUTES = {
    id: 'id',
    class: 'class',
    className: 'class',
    name: 'name',
    type: 'type',
};
function isSerializedFunction(object) {
    return object && !!object.__function;
}
function extractReferenceIdFromUrlReference(stringValue) {
    var matches = REF_MATCHER_RE.exec(stringValue);
    if (matches) {
        return matches[1];
    }
    return null;
}
/**
 * @class Template
 * @description
 *  Collection of static class methods for logic related to a component's template ("mana").
 */
var Template = /** @class */ (function (_super) {
    __extends(Template, _super);
    function Template() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return Template;
}(BaseModel));
Template.DEFAULT_OPTIONS = {
    required: {},
};
BaseModel.extend(Template);
Template.prepareManaAndBuildTimelinesObject = function (mana, hash, timelineName, timelineTime, _a) {
    var doHashWork = _a.doHashWork, title = _a.title;
    if (doHashWork) {
        // Each url(#whatever) needs to be unique to avoid styling collisions in the DOM
        Template.fixFragmentIdentifierReferences(mana, hash);
        Template.ensureTitleAndUidifyTree(mana, 
        // We shouldn't assume that any node has a haiku-source attribute
        path.posix.normalize(mana.attributes[HAIKU_SOURCE_ATTRIBUTE] || ''), hash, { title: title });
    }
    Template.ensureTopLevelDisplayAttributes(mana);
    convertManaLayout(mana);
    var timelinesObject = Template.hoistTreeAttributes(mana, timelineName, timelineTime);
    return timelinesObject;
};
Template.normalizePath = function (str) {
    if (str[0] === '.') {
        return "./".concat(path.normalize(str));
    }
    return path.normalize(str);
};
Template.normalizePathOfPossiblyExternalModule = function (str) {
    if (str[0] === '@') {
        return path.normalize(str);
    }
    return Template.normalizePath("./".concat(str));
};
Template.mirrorHaikuUids = function (fromNode, toNode) {
    if (!toNode.attributes) {
        toNode.attributes = {};
    }
    // Create (or overwrite) a haiku-id matching the existing tree's node
    toNode.attributes[HAIKU_ID_ATTRIBUTE] = fromNode.attributes[HAIKU_ID_ATTRIBUTE];
    if (!fromNode.children || fromNode.children.length < 1) {
        return void (0);
    }
    if (!toNode.children || toNode.children.length < 1) {
        return void (0);
    }
    // Different number of kids indicates structural change; impossible to do a consistent mirror
    if (fromNode.children.length !== toNode.children.length) {
        return void (0);
    }
    for (var i = 0; i < fromNode.children.length; i++) {
        var fromNodeChild = fromNode.children[i];
        var toNodeChild = toNode.children[i];
        // String children don't have attributes
        if (typeof fromNodeChild === 'string') {
            continue;
        }
        // Different element name indicates structural change; impossible to do a consistent mirror
        if (fromNodeChild.elementName !== toNodeChild.elementName) {
            continue;
        }
        Template.mirrorHaikuUids(fromNodeChild, toNodeChild); // Recursive
    }
};
Template.manaWithOnlyMinimalProps = function (mana, referenceSerializer, includeChildren) {
    if (includeChildren === void 0) { includeChildren = true; }
    if (mana && typeof mana === 'object') {
        var out = {};
        out.elementName = mana.elementName;
        // When the element name is an object, that's a sub-component and we need to
        // swap it out for the reference, which should be a string
        if (typeof mana.elementName === 'object') {
            // When written to the file, we should end up with `elementName: fooBar,...`
            // This assumes that a require() statement gets added to the AST later
            out.elementName = {
                __reference: referenceSerializer(out.elementName.__reference),
            };
        }
        // Note that this mana object is the same object that the core is rendering, and
        // since it has to mutate that template we need to omit any property that will cause
        // hashing differences across processes. Only stable attributes are used here.
        if (mana.attributes) {
            out.attributes = {};
            if (mana.attributes[HAIKU_ID_ATTRIBUTE]) {
                out.attributes[HAIKU_ID_ATTRIBUTE] = mana.attributes[HAIKU_ID_ATTRIBUTE];
            }
            if (mana.attributes[HAIKU_SOURCE_ATTRIBUTE]) {
                out.attributes[HAIKU_SOURCE_ATTRIBUTE] = mana.attributes[HAIKU_SOURCE_ATTRIBUTE];
            }
        }
        // Don't include the children if this node is a component, since those aren't in scope
        if (includeChildren && typeof mana.elementName !== 'object' && mana.children) {
            out.children = mana.children.filter(function (child) {
                // Exclude any empty or content-string elements.
                // This sidesteps the problem where one process shows e.g. children:["BLAH"]
                // but another process shows children:[], which results in unstable hashes
                return child && typeof child !== 'string';
            }).map(function (child) {
                // Skip children of children. This should prevent mergeDesigns-related integrity crashes.
                return Template.manaWithOnlyMinimalProps(child, referenceSerializer, false);
            });
        }
        else {
            out.children = [];
        }
        return out;
    }
    if (typeof mana === 'string') {
        return mana;
    }
};
Template.manaWithOnlyStandardProps = function (mana, doOmitSubcomponentBytecode, referenceSerializer) {
    if (doOmitSubcomponentBytecode === void 0) { doOmitSubcomponentBytecode = true; }
    if (mana && typeof mana === 'object') {
        var out = {};
        out.elementName = mana.elementName;
        if (typeof mana.elementName === 'object') {
            if (doOmitSubcomponentBytecode) {
                // When written to the file, we should end up with `elementName: fooBar,...`
                // This assumes that a require() statement gets added to the AST later
                out.elementName = {
                    __reference: (referenceSerializer)
                        ? referenceSerializer(out.elementName.__reference)
                        : out.elementName.__reference,
                };
            }
        }
        if (mana.attributes) {
            out.attributes = {};
            for (var key1 in TEMPLATE_METADATA_ATTRIBUTES) {
                if (mana.attributes[key1]) {
                    out.attributes[key1] = mana.attributes[key1];
                }
            }
            for (var key2 in SELECTOR_ATTRIBUTES) {
                if (mana.attributes[key2]) {
                    out.attributes[key2] = mana.attributes[key2];
                }
            }
        }
        if (typeof mana.elementName !== 'object') {
            out.children = mana.children && mana.children.filter(function (child) {
                // Exclude any empty or content-string elements.
                // Mana with only standard props is used when generating the AST/code for the
                // component, or for copy/paste, and literal content strings to not belong in the template
                return child && typeof child !== 'string';
            }).map(function (child) {
                return Template.manaWithOnlyStandardProps(child, doOmitSubcomponentBytecode, referenceSerializer);
            });
        }
        else {
            out.children = [];
        }
        return out;
    }
    if (typeof mana === 'string') {
        return mana;
    }
};
Template.manaTreeToDepthFirstArray = function manaTreeToDepthFirstArray(arr, mana) {
    if (!mana || typeof mana === 'string') {
        return arr;
    }
    arr.push(mana);
    for (var i = 0; i < mana.children.length; i++) {
        var child = mana.children[i];
        Template.manaTreeToDepthFirstArray(arr, child);
    }
    return arr;
};
/**
 * @function _hoistTreeAttributes
 * @description Given a mana tree, move all of its control attributes (that is, things that affect its
 * behavior that the user can control) into a timeline object.
 */
Template.hoistTreeAttributes = function (mana, timelineName, timelineTime) {
    var elementsByHaikuId = Template.getAllElementsByHaikuId(mana);
    var timelineStructure = {};
    // We set this on the 'Default' timeline always because an element's properties
    // are interpreted to mean whatever the defaults are supposed to be at time 0.
    timelineStructure[timelineName] = {};
    var theTimelineObj = timelineStructure[timelineName];
    for (var haikuId in elementsByHaikuId) {
        var node = elementsByHaikuId[haikuId];
        Template.hoistNodeAttributes(node, haikuId, theTimelineObj, timelineName, timelineTime, 'assign');
    }
    return timelineStructure;
};
Template.getControlAttributes = function (attributes) {
    var out = {};
    for (var key in attributes) {
        if (SELECTOR_ATTRIBUTES[key]) {
            continue;
        }
        if (TEMPLATE_METADATA_ATTRIBUTES[key]) {
            continue;
        }
        out[key] = attributes[key];
    }
    return out;
};
Template.hoistNodeAttributes = function (manaNode, haikuId, timelineObj, timelineName, timelineTime, mergeStrategy) {
    var controlAttributes = Template.getControlAttributes(manaNode.attributes);
    // Hoist the text content attribute as a property as well, inferring from structure
    if (manaNode.children && manaNode.children.length === 1 && typeof manaNode.children[0] === 'string') {
        // Remove this text node from the actual tree since it's hoisted now
        controlAttributes.content = manaNode.children[0];
        manaNode.children = [];
    }
    // TODO: Use this to populate any default attributes we want to be written into
    // the file explicitly. TODO: This hasn't been used for many months; remove?
    var defaultAttributes = {};
    // Don't create any empty groups
    if (Object.keys(defaultAttributes).length > 0 || Object.keys(controlAttributes).length > 0) {
        var haikuIdSelector = Template.buildHaikuIdSelector(haikuId);
        if (!timelineObj[haikuIdSelector]) {
            timelineObj[haikuIdSelector] = {};
        }
        var timelineGroup = timelineObj[haikuIdSelector];
        Template.insertAttributesIntoTimelineGroup(timelineGroup, timelineTime, defaultAttributes, mergeStrategy);
        Template.insertAttributesIntoTimelineGroup(timelineGroup, timelineTime, controlAttributes, mergeStrategy);
    }
    // Clear off attributes that have been 'hoisted' into the control objects
    for (var attrKey in manaNode.attributes) {
        if (attrKey in controlAttributes) {
            delete manaNode.attributes[attrKey];
        }
    }
};
Template.createHaikuId = function (node, fqa, source, context) {
    var base = "".concat(context, "|").concat(source, "|").concat(fqa);
    var sha = CryptoUtils.sha256(base).slice(0, 16);
    var label = Element.getFriendlyLabel(node);
    // No label could happen if the node is blank or a string
    if (label) {
        return "".concat(label, " ").concat(sha).replace(/\s+/g, '-'); // Hyphenize any whitespace
    }
    return sha;
};
Template.buildHaikuIdSelector = function (haikuId) {
    return "".concat(HAIKU_SELECTOR_PREFIX, ":").concat(haikuId);
};
Template.isHaikuIdSelector = function (selector) {
    return selector && selector.slice(0, 5) === HAIKU_SELECTOR_PREFIX && selector[5] === ':';
};
Template.haikuSelectorToHaikuId = function (selector) {
    return selector.split(':')[1];
};
Template.getHash = function (str, len) {
    if (len === void 0) { len = 6; }
    var hash = CryptoUtils.sha256(str).slice(0, len);
    return hash;
};
Template.getAllElementsByHaikuId = function (mana) {
    var elements = {};
    visitManaTree(ROOT_LOCATOR, mana, function (elementName, attributes, children, node) {
        if (attributes && attributes[HAIKU_ID_ATTRIBUTE]) {
            elements[attributes[HAIKU_ID_ATTRIBUTE]] = node;
        }
    });
    return elements;
};
Template.fixManaSourceAttribute = function fixManaSourceAttribute(mana, relpath) {
    if (!mana.attributes[HAIKU_SOURCE_ATTRIBUTE]) {
        mana.attributes[HAIKU_SOURCE_ATTRIBUTE] = path.posix.normalize(relpath);
    }
};
/**
 * @function _fixTreeIdReferences
 * @description Fixes all id attributes in the tree that have an entry in the given references table.
 * This is used to predictably convert all ids in a tree into a known set of randomized ids
 * @param mana {Object} - Mana tree object
 * @param references {Object} - Dict that maps old ids to new ids
 * @return {Object} The mutated mana object
 */
Template.fixTreeIdReferences = function (mana, references) {
    if (Object.keys(references).length < 1) {
        return mana;
    }
    visitManaTree(ROOT_LOCATOR, mana, function (elementName, attributes) {
        if (!attributes) {
            return void (0);
        }
        for (var id in references) {
            var fixed = references[id];
            if (attributes.id === id) {
                attributes.id = fixed;
            }
        }
    });
    return mana;
};
/**
 * @function fixFragmentIdentifierReferenceValue
 * @description Given a key, value, and some randomization, determine whether the given key/value attribute pair
 * warrants replacing with a randomized value, and if so, return a specification object of what to change
 * @param key {String} - The name of the attribute
 * @param value {String} - The value of the attribute
 * @param randomizer {String} - Seeded randomization string to use to modify the ids
 * @returns {Object|undefined}
 */
Template.fixFragmentIdentifierReferenceValue = function fixFragmentIdentifierReferenceValue(key, value, randomizer) {
    if (typeof value !== 'string') {
        return undefined;
    }
    var trimmed = value.trim();
    // Probably nothing to do if we got an empty string
    if (trimmed.length < 1) {
        return undefined;
    }
    // If this is a URL reference like `url(...)`, try to parse it and return a fix payload if so
    var urlId = extractReferenceIdFromUrlReference(trimmed);
    if (urlId && urlId.length > 0) {
        return {
            originalId: urlId,
            updatedId: urlId + '-' + randomizer,
            updatedValue: 'url(#' + urlId + '-' + randomizer + ')',
        };
    }
    // xlink:hrefs are references to elements in the tree that can affect our style
    if (key === 'xlink:href' || key === 'href') {
        if (trimmed[0] === '#') {
            var xlinkId = trimmed.slice(1);
            return {
                originalId: xlinkId,
                updatedId: xlinkId + '-' + randomizer,
                updatedValue: '#' + xlinkId + '-' + randomizer,
            };
        }
    }
    // If we go this far, we haven't detected anything we need to fix
    return undefined;
};
Template.fixKeyframeValue = function fixKeyframeValue(elementNode, propertyName, keyframeValue) {
    var elementName = elementNode && elementNode.elementName;
    if (elementName === 'path' && propertyName === 'd') {
        return SVGPoints.pathToPoints(keyframeValue);
    }
    if ((elementName === 'polygon' || elementName === 'polyline') && propertyName === 'points') {
        return SVGPoints.polyPointsStringToPoints(keyframeValue);
    }
    return keyframeValue;
};
Template.fixFragmentIdentifierReferences = function fixFragmentIdentifierReferences(mana, randomizer) {
    var references = {};
    visitManaTree(ROOT_LOCATOR, mana, function (elementName, attributes, children, node) {
        if (!attributes) {
            return void (0);
        }
        for (var key in attributes) {
            var value = attributes[key];
            // Add randomization to any url() or xlink:href etc to avoid collisions
            // If this function returns undefined it means there's nothing to change
            var fix = Template.fixFragmentIdentifierReferenceValue(key, value, randomizer);
            if (fix === undefined) {
                continue;
            }
            references[fix.originalId] = fix.updatedId;
            attributes[key] = fix.updatedValue;
        }
    });
    Template.fixTreeIdReferences(mana, references);
    return mana;
};
// Yes, we have a bunch of visitor functions, all of which probably should be consolidated
// into just one utility. This had previously been obscured by the fact that these lived
// as individual helpers scattered into different modules; consolidating them all here
// was a first step. TODO: Please refactor!
Template.visitTemplate = function visitTemplate(template, parent, iteratee) {
    if (template) {
        iteratee(template, parent);
        if (template.children) {
            for (var i = 0; i < template.children.length; i++) {
                var child = template.children[i];
                if (!child || typeof child === 'string') {
                    continue;
                }
                Template.visitTemplate(child, template, iteratee);
            }
        }
    }
};
Template.visitManaTreeSpecial = function visitManaTreeSpecial(address, hash, mana, iteratee) {
    address += ":[".concat(hash, "]").concat(Element.safeElementName(mana), "(").concat((mana.attributes && mana.attributes.id) ? '#' + mana.attributes.id : '', ")");
    iteratee(mana, address);
    if (!mana.children || mana.children.length < 1) {
        return void (0);
    }
    for (var i = 0; i < mana.children.length; i++) {
        var child = mana.children[i];
        if (child && typeof child === 'object') {
            Template.visitManaTreeSpecial(address, hash + '-' + i, child, iteratee);
        }
    }
};
/**
 * Visit all nodes in the given tree, beginning with the root node, in depth-first order
 */
Template.visit = function (node, visitor, index, depth, address) {
    if (index === void 0) { index = 0; }
    if (depth === void 0) { depth = 0; }
    if (address === void 0) { address = '0'; }
    if (node) {
        visitor(node, null, index, depth, address);
        if (!node.children) {
            return;
        }
        for (var i = 0; i < node.children.length; i++) {
            var child = node.children[i];
            if (typeof child === 'string') {
                continue;
            }
            Template.visit(child, visitor, i, depth + 1, "".concat(address, ".").concat(i));
        }
    }
};
Template.inspectNodeName = function (node) {
    var name;
    if (!node) {
        name = 'void';
    }
    else if (!node.elementName) {
        name = 'none';
    }
    else if (typeof node.elementName === 'string') {
        name = node.elementName;
    }
    else if (node.elementName.__reference) {
        name = "ref(".concat(node.elementName.__reference, ")");
    }
    else {
        name = 'unknown';
    }
    return name;
};
Template.inspectAttribute = function (val) {
    try {
        return JSON.stringify(val);
    }
    catch (e) {
        return '!err!';
    }
};
Template.inspectNodeAttributes = function (node) {
    var attrs = '';
    if (!node) {
        attrs = 'void';
    }
    else if (!node.attributes) {
        attrs = 'none';
    }
    else if (typeof node.attributes === 'object') {
        for (var key in node.attributes) {
            attrs += "".concat(key, "=").concat(Template.inspectAttribute(node.attributes[key]), " ");
        }
    }
    else {
        attrs = 'unknown';
    }
    return attrs;
};
Template.inspect = function (mana) {
    var out = '';
    Template.visit(mana, function (node, parent, index, depth, address) {
        var name = Template.inspectNodeName(node);
        var attrs = Template.inspectNodeAttributes(node);
        out += "".concat(address, " <").concat(name, " ").concat(attrs, ">\n");
    });
    return out;
};
Template.visitWithoutDescendingIntoSubcomponents = function (node, visitor, index, depth, address) {
    if (index === void 0) { index = 0; }
    if (depth === void 0) { depth = 0; }
    if (address === void 0) { address = '0'; }
    if (node) {
        visitor(node, null, index, depth, address);
        if (typeof node.elementName === 'string') {
            if (node.children) {
                for (var i = 0; i < node.children.length; i++) {
                    var child = node.children[i];
                    if (typeof child === 'string') {
                        continue;
                    }
                    Template.visitWithoutDescendingIntoSubcomponents(child, visitor, i, depth + 1, "".concat(address, ".").concat(i));
                }
            }
        }
    }
};
Template.visitNodes = function (node, parent, index, visitor) {
    if (node) {
        visitor(node, parent, index);
        if (!node.children) {
            return;
        }
        for (var i = 0; i < node.children.length; i++) {
            var child = node.children[i];
            if (typeof child === 'string') {
                continue;
            }
            Template.visitNodes(child, node, i, visitor);
        }
    }
};
Template.ensureTopLevelDisplayAttributes = function ensureTopLevelDisplayAttributes(mana) {
    merge(mana.attributes, {
        style: {
            position: 'absolute',
            margin: '0',
            padding: '0',
            border: '0',
        },
    });
    // If our context is SVG, ensure it has appropriate SVG attributes
    if (Element.safeElementName(mana) === 'svg') {
        merge(mana.attributes, {
            version: '1.1',
            xmlns: 'http://www.w3.org/2000/svg',
            'xmlns:xlink': 'http://www.w3.org/1999/xlink',
        });
    }
};
/**
 * @function ensureTitleAndUidifyTree
 * @param mana {Object} - A mana tree
 * @param source {String} - Relpath to the source file of this tree (usually an SVG file)
 * @param context {String} - Flexible context string for collision avoidance (usually folder + relpath)
 * @param hash {String} - Digest of previous content, used as a seed for number generation
 * @param options {Object}
 */
Template.ensureTitleAndUidifyTree = function (mana, source, context, hash, options) {
    if (!options) {
        options = {};
    }
    // First ensure the element has a title (this is used to display a human-friendly name in the ui)
    if (!mana.attributes) {
        mana.attributes = {};
    }
    if (options.title) {
        mana.attributes[HAIKU_TITLE_ATTRIBUTE] = options.title;
    }
    if (!mana.attributes[HAIKU_TITLE_ATTRIBUTE]) {
        var title = void 0;
        if (mana.attributes[HAIKU_SOURCE_ATTRIBUTE]) {
            // The file name usually works as a good baseline, e.g. 'FooBar.svg'
            title = path.basename(mana.attributes[HAIKU_SOURCE_ATTRIBUTE], path.extname(mana.attributes[HAIKU_SOURCE_ATTRIBUTE]));
        }
        if (!title) {
            if (mana.children) {
                // Sketch-sourced trees always have a title matching that artboard/slice's name
                var el = find(mana.children, { elementName: 'title' });
                if (el && el.children && typeof el.children[0] === 'string') {
                    title = el.children[0];
                }
            }
        }
        if (!title) {
            if (source && source.length > 1) {
                // The passed in source relpath should work ok
                title = path.basename(source, path.extname(source));
                title = title.replace('Bytecode', ''); // Clean up the name if this is a bytecode-source doc
            }
        }
        if (!title) {
            // Otherwise, fall back to the element name
            title = pascalcase(Element.safeElementName(mana) || 'node');
        }
        mana.attributes[HAIKU_TITLE_ATTRIBUTE] = title;
    }
    // Now make sure all elements in the tree get a predictable identifier assigned. It is critical that
    // the UID generation be based on the existing tree's contents so that this same logic can run
    // in different processes and still give us an identical result, otherwise they will get out of sync
    Template.visitManaTreeSpecial('*', hash, mana, function (node, fqa) {
        if (typeof node !== 'object') {
            return void (0);
        }
        if (!node.attributes) {
            node.attributes = {};
        }
        // For cases like pasting a component, the caller might want to assign a fresh id even though
        // we may already have one assigned to the node, hence the forceAssignId option
        if (!node.attributes[HAIKU_ID_ATTRIBUTE] || options.forceAssignId) {
            var haikuId = Template.createHaikuId(node, fqa, source, context);
            node.attributes[HAIKU_ID_ATTRIBUTE] = haikuId;
        }
        if (node.attributes.id && options.idRandomizer) {
            node.attributes.id += ('-' + options.idRandomizer);
        }
    });
};
Template.ensureRootDisplayAttributes = function (mana) {
    merge(mana.attributes, {
        style: {
            position: 'relative',
            width: '550px', // default artboard size, see haiku-creator
            height: '400px', // default artboard size, see haiku-creator
            margin: '0',
            padding: '0',
            border: '0',
        },
    });
    // If our context is SVG, ensure it has appropriate SVG attributes
    if (Element.safeElementName(mana) === 'svg') {
        merge(mana.attributes, {
            version: '1.1',
            xmlns: 'http://www.w3.org/2000/svg',
            'xmlns:xlink': 'http://www.w3.org/1999/xlink',
        });
    }
};
Template.cleanTemplate = function (mana) {
    // no-op (TODO)
};
/**
 * @method areTemplatesEquivalent
 * @description Determines whether two template objects have the same structure
 * Note: This check compares element names and children (recursively), but not attributes!
 * @returns {Boolean}
 */
Template.areTemplatesEquivalent = function (t1, t2) {
    if (!t1 && !t2) {
        return true;
    }
    if (t1 && !t2) {
        return false;
    }
    if (!t1 && t2) {
        return false;
    }
    if (t1.elementName !== t2.elementName) {
        return false;
    }
    if (!t1.children && !t2.children) {
        return true;
    }
    if (t1.children && !t2.children) {
        return false;
    }
    if (!t1.children && t2.children) {
        return false;
    }
    if (t1.children.length !== t2.children.length) {
        return false;
    }
    for (var i = 0; i < t1.children.length; i++) {
        var c1 = t1.children[i];
        var c2 = t2.children[i];
        if (!Template.areTemplatesEquivalent(c1, c2)) {
            return false;
        }
    }
    return true;
};
Template.allSourceNodes = function allSourceNodes(rootLocator, mana, iteratee) {
    visitManaTree(rootLocator, mana, function (elementName, attributes, children, node, locator, parent, index) {
        if (attributes && attributes[HAIKU_SOURCE_ATTRIBUTE]) {
            iteratee(node, attributes[HAIKU_SOURCE_ATTRIBUTE], parent, index);
        }
    });
};
Template.visitManaTree = function (mana, iteratee) {
    return visitManaTree(ROOT_LOCATOR, mana, iteratee);
};
Template.reuseHotMana = function (mana) {
    var clone = Template.clone({}, mana, function (copy, original) {
        if (original.layout && original.layout.computed && original.layout.computed.matrix) {
            // If we are reusing rendered mana with layout, hoist its computed matrix into the transform attribute.
            // Ingestion will automagically hoist these layout properties up to the timeline.
            copy.attributes.transform = "matrix3d(".concat(original.layout.computed.matrix.join(','), ")");
        }
    });
    return clone;
};
Template.clone = function (out, mana, worker) {
    // No point continuing if null or false;
    // it could also be "text": a string or number
    if (!mana || typeof mana !== 'object') {
        return mana;
    }
    // Note that `elementName` is an object in case of a component instance
    out.elementName = mana.elementName;
    if (mana.attributes) {
        out.attributes = {};
        for (var key in mana.attributes) {
            var prop = mana.attributes[key];
            if (prop && typeof prop === 'object') {
                out.attributes[key] = {};
                for (var subkey in prop) {
                    out.attributes[key][subkey] = prop[subkey];
                }
            }
            else {
                out.attributes[key] = prop;
            }
        }
    }
    if (worker) {
        worker(out, mana);
    }
    if (mana.children) {
        out.children = [];
        for (var i = 0; i < mana.children.length; i++) {
            out.children[i] = Template.clone({}, mana.children[i], worker);
        }
    }
    return out;
};
Template.insertAttributesIntoTimelineGroup = function (timelineGroup, timelineTime, givenAttributes, mergeStrategy) {
    for (var attributeName in givenAttributes) {
        var attributeValue = givenAttributes[attributeName];
        if (attributeValue && typeof attributeValue === 'object') {
            for (var subKey in attributeValue) {
                var subVal = attributeValue[subKey];
                var fullName = attributeName + GROUP_DELIMITER + subKey;
                Template.mergeOne(timelineGroup, fullName, subVal, timelineTime, mergeStrategy);
            }
        }
        else {
            Template.mergeOne(timelineGroup, attributeName, attributeValue, timelineTime, mergeStrategy);
        }
    }
};
Template.mergeOne = function (timelineGroup, nameOrig, attributeValue, timelineTime, mergeStrategy) {
    var nameFinal = ATTRS_HYPH_TO_CAMEL[nameOrig] || nameOrig;
    if (!timelineGroup[nameFinal]) {
        timelineGroup[nameFinal] = timelineGroup[nameOrig] || {};
        // Clear off any legacy hyphen-case properties if we swapped for camel-case
        if (nameOrig !== nameFinal) {
            delete timelineGroup[nameOrig];
        }
    }
    if (!timelineGroup[nameFinal][timelineTime]) {
        timelineGroup[nameFinal][timelineTime] = {};
    }
    Template.mergeAppliedValue(nameFinal, timelineGroup[nameFinal][timelineTime], attributeValue, mergeStrategy);
};
var isObject = function (value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
};
Template.mergeAppliedValue = function (name, valueDescriptor, incomingValue, mergeStrategy) {
    if (isObject(valueDescriptor.value) && isObject(incomingValue) && !isSerializedFunction(valueDescriptor.value) && !isSerializedFunction(incomingValue)) {
        switch (mergeStrategy) {
            case MERGE_STRATEGIES.assign:
                assign(valueDescriptor.value, incomingValue);
                break;
            case MERGE_STRATEGIES.defaults:
                defaults(valueDescriptor.value, incomingValue);
                break;
            default: throw new Error('Merge strategy provided is missing or invalid');
        }
    }
    else {
        switch (mergeStrategy) {
            case MERGE_STRATEGIES.assign:
                valueDescriptor.value = incomingValue;
                break;
            case MERGE_STRATEGIES.defaults:
                if (valueDescriptor.value === undefined) {
                    valueDescriptor.value = incomingValue;
                }
                break;
            default: throw new Error('Merge strategy provided is missing or invalid');
        }
    }
};
Template.manaToJson = function (mana, replacer, spacing) {
    var out = Template.cleanMana(mana);
    return JSON.stringify(out, replacer || null, spacing || 2);
};
Template.cleanMana = function (mana, _a) {
    var _b = _a === void 0 ? {} : _a, _c = _b.resetIds, resetIds = _c === void 0 ? false : _c, _d = _b.suppressSubcomponents, suppressSubcomponents = _d === void 0 ? true : _d;
    var out = {};
    if (!mana) {
        return null;
    }
    if (typeof mana === 'string') {
        return mana;
    }
    // cleanMana is used when producing a decycled (wire-ready) bytecode object during editing.
    // If the bytecode has any subcomponents, which are designated using the .elementName
    // in the same way the React designates components by the .type, then treat the
    // node as a simple <div>.
    if (mana.elementName && typeof mana.elementName === 'object' && mana.elementName !== null) {
        if (suppressSubcomponents) {
            out.elementName = 'div';
        }
        else {
            out.elementName = Bytecode.decycle(mana.elementName, {
                cleanManaOptions: { resetIds: resetIds, suppressSubcomponents: suppressSubcomponents },
                doCleanMana: true,
            });
        }
    }
    else {
        out.elementName = mana.elementName;
    }
    out.attributes = mana.attributes;
    if (resetIds) {
        delete out.attributes[HAIKU_ID_ATTRIBUTE];
    }
    out.children = mana.children && mana.children.map(function (childMana) { return Template.cleanMana(childMana, { resetIds: resetIds, suppressSubcomponents: suppressSubcomponents }); });
    return out;
};
Template.manaToHtml = function (out, object, mapping, options) {
    return manaToXml(out, object, mapping, options);
};
Template.getStackingInfo = function (bytecode, staticTemplateManaNode, timelineName, timelineTime) {
    return staticTemplateManaNode.children
        .filter(function (child) { return child && typeof child !== 'string'; })
        .map(function (child, index) {
        var haikuId = child.attributes[HAIKU_ID_ATTRIBUTE];
        var zIndex = parseInt(Template.getPropertyValue(bytecode, haikuId, timelineName, timelineTime, 'style.zIndex'), 10) || undefined;
        return {
            haikuId: haikuId,
            zIndex: zIndex,
            index: index,
        };
    })
        .sort(function (a, b) {
        // zIndexes should sort normally at the front of the list
        if (a.zIndex !== undefined && b.zIndex !== undefined) {
            return a.zIndex - b.zIndex;
        }
        // Push undefined zIndexes to the end of the list, sorted by original order of appearance.
        if ((a.zIndex === undefined) ^ (b.zIndex === undefined)) {
            return (a.zIndex === undefined) ? 1 : -1;
        }
        return a.index - b.index;
    })
        .reduce(function (accumulator, _a, currentIndex) {
        var zIndex = _a.zIndex, haikuId = _a.haikuId;
        if (currentIndex === 0) {
            return [{
                    zIndex: Math.max(zIndex || 1, 1),
                    haikuId: haikuId,
                }];
        }
        var nextZ = accumulator[accumulator.length - 1].zIndex + 1;
        accumulator.push({
            zIndex: (zIndex === undefined) ? nextZ : Math.max(zIndex, nextZ),
            haikuId: haikuId,
        });
        return accumulator;
    }, []);
};
Template.getPropertyValue = function (bytecode, componentId, timelineName, timelineTime, propertyName) {
    if (!bytecode) {
        return;
    }
    if (!bytecode.timelines) {
        return;
    }
    if (!bytecode.timelines[timelineName]) {
        return;
    }
    if (!bytecode.timelines[timelineName]["haiku:".concat(componentId)]) {
        return;
    }
    if (!bytecode.timelines[timelineName]["haiku:".concat(componentId)][propertyName]) {
        return;
    }
    if (!bytecode.timelines[timelineName]["haiku:".concat(componentId)][propertyName][timelineTime]) {
        return;
    }
    return bytecode.timelines[timelineName]["haiku:".concat(componentId)][propertyName][timelineTime].value;
};
module.exports = Template;
// Down here to avoid Node circular dependency stub objects. #FIXME
var Element = require('./Element');
var Bytecode = require('./Bytecode');
//# sourceMappingURL=Template.js.map