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
var BaseModel = require('./BaseModel');
var TimelineProperty = require('haiku-serialization/src/bll/TimelineProperty');
var NAVIGATION_DIRECTIONS = {
    SAME: 0,
    NEXT: +1,
    PREV: -1,
};
/**
 * @class Row
 * @description
 *  Abstraction over the concept of a row that appears in the Timeline UI.
 *  In practice this is only used in the Timeline UI for managing the display
 *  of rows.
 *
 *  Things that can be a row:
 *    - A row of a single property
 *    - A row of a complex property's subproperty
 *    - The heading of a set of complex properties
 *    - The heading of an element (or component)
 *
 *  Rows are nested per the groupings mentioned above, so you can call row.children
 *  to get the rows that would be displayed inside/underneath that row in question
 *  (presuming that they are visible per the visibility rules).
 */
var Row = /** @class */ (function (_super) {
    __extends(Row, _super);
    function Row(props, opts) {
        var _this = _super.call(this, props, opts) || this;
        _this._isSelected = false;
        _this._isFocused = false;
        _this._isExpanded = false;
        _this._isActive = false;
        _this._isHidden = false;
        _this._isHovered = false;
        // Hacky check whether we've already auto-expanded this row
        _this._wasInitiallyExpanded = false;
        return _this;
    }
    Row.prototype.getUniqueKey = function () {
        return "".concat(this.element.getComponentId(), "+").concat(this.element.getComponentId(), "-").concat(this.getType(), "-").concat(this.getClusterNameString(), "-").concat(this.getPropertyNameString());
    };
    Row.prototype.deselectOthers = function (metadata, skipSelectElements) {
        var _this = this;
        if (skipSelectElements === void 0) { skipSelectElements = false; }
        // Deselect all other rows; currently assume only one row selected at a time
        Row.where({ component: this.component }).forEach(function (row) {
            if (row === _this) {
                return null;
            }
            row.deselect(metadata, skipSelectElements);
        });
    };
    Row.prototype.select = function (metadata) {
        if (!this._isSelected) {
            // The purpose of the `true` argument here tells the instruction to
            // deselect the other rows, but not deselect all their respective elements;
            // we need all processes to have a correct record of the actual number of
            // elements which are explicitly selected on stage, otherwise certain behavior,
            // such as the topbar controls, will not behave correctly.
            this.deselectOthers(metadata, true);
            this._isSelected = true;
            this.emit('update', 'row-selected', metadata);
            // Roundabout! Note that elements, when selected, will select their corresponding row
            if (this.isHeading() && this.element && !this.element.isSelected()) {
                this.element.select(metadata);
            }
        }
        return this;
    };
    Row.prototype.deselect = function (metadata, skipSelectElements) {
        if (skipSelectElements === void 0) { skipSelectElements = false; }
        if (this._isSelected) {
            this._isSelected = false;
            this.emit('update', 'row-deselected', metadata);
            // Roundabout! Note that elements, when unselected, will unselect their corresponding row
            if (!skipSelectElements && this.isHeading() && this.element && this.element.isSelected()) {
                this.element.unselect(metadata);
            }
        }
        return this;
    };
    Row.prototype.isSelected = function () {
        return this._isSelected;
    };
    Row.prototype.activate = function () {
        if (!this._isActive) {
            this._isActive = true;
            this.emit('update', 'row-activated');
        }
        return this;
    };
    Row.prototype.deactivate = function () {
        if (this._isActive) {
            this._isActive = false;
            this.emit('update', 'row-deactivated');
        }
        return this;
    };
    Row.prototype.isActive = function () {
        return this._isActive;
    };
    Row.prototype.expand = function (metadata) {
        if (!this._isExpanded) {
            this._isExpanded = true;
            this.emit('update', 'row-expanded', metadata);
        }
        // If we are expanded, we also need our parent to be expanded
        if (this.parent) {
            this.parent.expand(metadata);
        }
        return this;
    };
    Row.prototype.collapse = function (metadata) {
        if (this._isExpanded) {
            this._isExpanded = false;
            this.emit('update', 'row-collapsed', metadata);
        }
        return this;
    };
    Row.prototype.isCollapsed = function () {
        // Something that has no inner contents cannot be 'collapsed'
        if (this.isProperty()) {
            return false;
        }
        return !this._isExpanded;
    };
    Row.prototype.isExpanded = function () {
        // Something that has no inner contents cannot be 'collapsed'
        if (this.isProperty()) {
            return true;
        }
        return this._isExpanded;
    };
    Row.prototype.blurOthers = function (metadata) {
        var _this = this;
        Row.where({ component: this.component }).forEach(function (row) {
            if (row !== _this) {
                row.blur(metadata);
            }
        });
    };
    Row.prototype.focus = function (metadata) {
        if (!this._isFocused) {
            this.blurOthers(metadata);
            this._isFocused = true;
            this.emit('update', 'row-focused', metadata);
        }
        return this;
    };
    Row.prototype.blur = function (metadata) {
        if (this._isFocused) {
            this._isFocused = false;
            this.emit('update', 'row-blurred', metadata);
        }
        return this;
    };
    Row.prototype.isFocused = function () {
        return this._isFocused;
    };
    Row.prototype.hide = function () {
        if (!this._isHidden) {
            this._isHidden = true;
            this.emit('update', 'row-hidden');
        }
        return this;
    };
    Row.prototype.show = function () {
        if (this._isHidden) {
            this._isHidden = false;
            this.emit('update', 'row-shown');
        }
        return this;
    };
    Row.prototype.isHidden = function () {
        return this._isHidden;
    };
    Row.prototype.hover = function (metadata) {
        if (!this._isHovered) {
            this._isHovered = true;
            this.emit('update', 'row-hovered');
        }
        return this;
    };
    Row.prototype.isHovered = function () {
        return this._isHovered;
    };
    Row.prototype.hoverAndUnhoverOthers = function (metadata) {
        var _this = this;
        Row.where({ component: this.component }).forEach(function (row) {
            if (row !== _this) {
                row.unhover(metadata);
            }
        });
        this.hover(metadata);
    };
    Row.prototype.unhover = function (metadata) {
        if (this._isHovered) {
            this._isHovered = false;
            this.emit('update', 'row-unhovered');
        }
        return this;
    };
    Row.prototype.expandAndSelect = function (metadata) {
        if (!this.isExpanded()) {
            this.expand(metadata);
        }
        if (!this.isSelected()) {
            this.select(metadata);
        }
        return this;
    };
    Row.prototype.collapseAndDeselect = function (metadata) {
        if (this.isExpanded()) {
            this.collapse(metadata);
        }
        if (this.isSelected()) {
            this.deselect(metadata);
        }
        return this;
    };
    Row.prototype.getBaselineValueAtMillisecond = function (ms) {
        var baselineValue = Timeline.getPropertyValueDescriptor(this, {
            timelineTime: ms,
            timelineName: this.timeline.getName(),
        }).baselineValue;
        return baselineValue;
    };
    Row.prototype.getBaselineCurveAtMillisecond = function (ms) {
        var baselineCurve = Timeline.getPropertyValueDescriptor(this, {
            timelineTime: ms,
            timelineName: this.timeline.getName(),
        }).baselineCurve;
        return baselineCurve;
    };
    Row.prototype.delete = function () {
        // Deleting a parent row means the children also have to go
        this.children.forEach(function (child) {
            child.delete();
        });
        this.destroy();
    };
    Row.prototype.visit = function (visitor) {
        visitor(this);
        this.children.forEach(function (child) {
            child.visit(visitor);
        });
    };
    Row.prototype.rehydrate = function () {
        this.rehydrateKeyframes();
        this.emit('update', 'row-rehydrated');
        // Need to inform our heading row about the update or else updates to rows within collapsed rows
        // won't see their keyframe updates reflected within the timeline
        if (this.parent) {
            this.parent.emit('update', 'child-row-rehydrated');
        }
    };
    Row.prototype.getKeyframesDescriptor = function () {
        return TimelineProperty.getValueGroup(this.element.getComponentId(), this.component.getCurrentTimelineName(), this.getPropertyNameString(), this.component.getReifiedBytecode());
    };
    Row.prototype.rehydrateKeyframes = function () {
        var valueGroup = this.getKeyframesDescriptor();
        if (!valueGroup) {
            return [];
        }
        var keyframesList = Object.keys(valueGroup)
            .map(function (keyframeKey) { return parseInt(keyframeKey, 10); })
            .sort(function (a, b) { return a - b; });
        if (keyframesList.length < 1) {
            return [];
        }
        this.getKeyframes().forEach(function (keyframe) {
            keyframe.mark();
        });
        for (var i = 0; i < keyframesList.length; i++) {
            var mscurr = keyframesList[i];
            if (isNaN(mscurr)) {
                continue;
            }
            // Unknown why, but sometimes this isn't present and we crash
            if (!valueGroup[mscurr] || valueGroup[mscurr].value === undefined) {
                continue;
            }
            var value = valueGroup[mscurr].value;
            var curve = valueGroup[mscurr].curve;
            // The upsert assumes that undefined means 'leave the previous value', so if we
            // get an undefined curve here, we need to set it explicitly as 'null' to unset
            // the curve from the previous keyframe object that lives at this uid
            if (curve === undefined) {
                curve = null;
            }
            var uid = Keyframe.getInferredUid(this, mscurr);
            Keyframe.upsert({
                // The keyframe's uid is in the context of the row, which is in turn in context of the component
                uid: uid,
                origMs: mscurr,
                ms: mscurr,
                index: i,
                value: value,
                curve: curve,
                row: this,
                element: this.element,
                timeline: this.timeline,
                component: this.component,
            }, {});
        }
        this.getKeyframes().forEach(function (keyframe) {
            keyframe.sweep();
        });
        var updatedKeyframes = this.getKeyframes();
        updatedKeyframes.forEach(function (keyframe, idx) {
            keyframe._prev = updatedKeyframes[idx - 1];
            keyframe._next = updatedKeyframes[idx + 1];
        });
    };
    Row.prototype.createKeyframe = function (value, ms, metadata) {
        var _a;
        // If creating a keyframe on a cluster row, create one for all of the child rows
        if (this.isClusterHeading()) {
            this.children.forEach(function (child) { return child.createKeyframe(value, ms, metadata); });
            return this.expandAndSelect(metadata);
        }
        var valueToAssign;
        // If no value provided, we'll grab a value from existing keyframes here
        if (value === undefined) {
            // Otherwise, grab the value from the previous keyframe known in the sequence
            valueToAssign = this.getBaselineValueAtMillisecond(ms);
        }
        else {
            valueToAssign = value;
        }
        var curveToAssign = this.getBaselineCurveAtMillisecond(ms);
        // Lock sync on deep SVG attributes change
        var parentSVG = this.element.getParentSvgElement();
        var options = {};
        if (parentSVG && this.element !== parentSVG) {
            options = { setElementLockStatus: (_a = {}, _a[parentSVG.getComponentId()] = true, _a) };
        }
        // Update the bytecode directly via ActiveComponent, which updates Timeline UI.
        // Note that createKeyframe handles rehydrating the keyframes with correct indices.
        this.component.createKeyframe(this.element.getComponentId(), this.timeline.getName(), this.element.getNameString(), this.getPropertyNameString(), ms, valueToAssign, curveToAssign, null, // end ms, not used?
        null, // end value, not used?
        options, metadata, function () { });
        // Clear timeline caches; the max frame might have changed.
        Timeline.clearCaches();
        this.emit('update', 'keyframe-create');
        if (this.parent) {
            this.parent.emit('update', 'keyframe-create');
            if (this.parent.parent) {
                this.parent.parent.emit('update', 'keyframe-create');
            }
        }
    };
    Row.prototype.deleteKeyframe = function (keyframe, metadata) {
        keyframe.destroy();
        // Note that component.deleteKeyframe handles rehydrating keyframes with the correct indices
        this.component.deleteKeyframe(this.element.getComponentId(), this.timeline.getName(), this.getPropertyNameString(), keyframe.getMs(), metadata, function () { });
        // Clear timeline caches; the max frame might have changed.
        Timeline.clearCaches();
        this.emit('update', 'keyframe-delete');
        if (this.parent) {
            this.parent.emit('update', 'keyframe-delete');
        }
    };
    Row.prototype.getDescriptor = function () {
        return this.property;
    };
    Row.prototype.getKeyframes = function () {
        return Keyframe.where({ row: this }).sort(function (a, b) { return a.index - b.index; });
    };
    Row.prototype.getKeyframeByMs = function (ms) {
        return this.getKeyframes().filter(function (keyframe) {
            return keyframe.getMs() === ms;
        })[0];
    };
    Row.prototype.mapVisibleKeyframes = function (_a, iteratee) {
        var _b = _a.maxDepth, maxDepth = _b === void 0 ? Infinity : _b;
        // Avoid extra computation by not returning keyframes from too deep in the tree
        if (this.getDepthAmongRows() > maxDepth) {
            return [];
        }
        // If we are a heading row (either a cluster or an element), we have no keyframes,
        // so we instead query our children for the list of keyframes within us
        if (this.isHeading() || this.isClusterHeading()) {
            return __spreadArray([], this.children.map(function (child) { return child.mapVisibleKeyframes({ maxDepth: maxDepth }, iteratee); }), true);
        }
        return this.getKeyframes().map(iteratee);
    };
    Row.prototype.isState = function () {
        return this.property && this.property.type === 'state';
    };
    Row.prototype.isFirstRowOfPropertyCluster = function () {
        return this.cluster && this.property && this.getIndexWithinParentRow() === 0;
    };
    Row.prototype.isClusterProperty = function () {
        return this.cluster && !this.property;
    };
    Row.prototype.isClusterHeading = function () {
        return this.cluster && !this.property;
    };
    Row.prototype.isCluster = function () {
        return !!this.cluster;
    };
    Row.prototype.isProperty = function () {
        return !!this.property;
    };
    Row.prototype.isPropertyOfName = function (propertyName) {
        return (this.property &&
            this.property.name === propertyName);
    };
    Row.prototype.isHeading = function () {
        return !this.property && !this.cluster;
    };
    Row.prototype.getType = function () {
        if (this.isClusterHeading()) {
            return 'cluster-heading';
        }
        if (this.isHeading()) {
            return 'element-heading';
        }
        if (this.isProperty()) {
            return 'property';
        }
        return 'unknown';
    };
    Row.prototype.getAddress = function () {
        var id;
        if (this.isHeading()) {
            id = 'heading';
        }
        else if (this.isClusterHeading()) {
            id = 'cluster-heading';
        }
        else {
            id = this.getPropertyNameString();
        }
        return "".concat(this.element.getGraphAddress(), "/").concat(id);
    };
    Row.prototype.getClusterNameString = function () {
        return this.cluster && this.cluster.name;
    };
    Row.prototype.getPropertyNameString = function () {
        return this.property && this.property.name;
    };
    Row.prototype.getClusterValues = function () {
        return this.children.map(function (row) {
            return row.getPropertyValueDescriptor();
        });
    };
    Row.prototype.getPropertyValueDescriptor = function () {
        return Timeline.getPropertyValueDescriptor(this, { numFormat: '0,0[.]000' });
    };
    Row.prototype.getPropertyId = function () {
        return "".concat(this.element.getComponentId(), "-").concat(this.element.getNameString(), "-").concat(this.getPropertyNameString());
    };
    Row.prototype.getInputPropertyId = function () {
        return "property-input-field-box-".concat(this.getPropertyId());
    };
    // This is a dupe of getPropertyNameString, not sure which is preferred
    Row.prototype.getPropertyName = function () {
        return this.property && this.property.name;
    };
    Row.prototype.isClusterActivated = function (item) {
        return false; // TODO
    };
    Row.prototype.isRootRow = function () {
        return !this.parent;
    };
    Row.prototype.isWithinCollapsedRow = function () {
        return this.parent && (this.parent.isCollapsed() || this.parent.isWithinCollapsedRow());
    };
    Row.prototype.representsStringNode = function () {
        return typeof this.element.getStaticTemplateNode() === 'string';
    };
    Row.prototype.clearEntityCaches = function () {
        if (this.children) {
            this.children.forEach(function (row) {
                row.cache.clear();
                row.clearEntityCaches();
            });
        }
        this.getKeyframes().forEach(function (keyframe) {
            keyframe.cache.clear();
        });
    };
    Row.prototype.getPosition = function () {
        if (typeof this.position === 'number') {
            return this.position;
        }
        return Number.MAX_SAFE_INTEGER;
    };
    Row.prototype.setPosition = function (position) {
        this.position = position;
    };
    Row.prototype.getDepthAmongRows = function () {
        var depth = 0;
        var parent = this.parent;
        while (parent) {
            if (parent.element.hasAddressableProperties) {
                depth += 1;
            }
            parent = parent.parent;
        }
        return depth;
    };
    Row.prototype.getDepthAmongElements = function () {
        return this.element.getDepthAmongElements();
    };
    Row.prototype.getAllSiblings = function () {
        return (this.parent && this.parent.children) || [];
    };
    Row.prototype.getIndexWithinParentRow = function () {
        var siblings = this.getAllSiblings();
        for (var i = 0; i < siblings.length; i++) {
            if (siblings[i] === this) {
                return i;
            }
        }
        return 0;
    };
    Row.prototype.next = function () {
        return this._next;
    };
    Row.prototype.prev = function () {
        return this._prev;
    };
    Row.prototype.shouldBeDisplayed = function (row) {
        if (this.isHeading()) {
            return true;
        }
        if (this.isCluster()) {
            return true;
        }
        if (Property.includeInAddressables(this.getPropertyNameString(), this.element, this.property, this.getKeyframesDescriptor())) {
            this.parent = row;
            return true;
        }
        return false;
    };
    Row.prototype.silentlyExpandAllGParents = function () {
        if (this.isRootRow()) {
            return;
        }
        if (this.element.getNameString() === 'g') {
            this._isExpanded = true;
        }
        if (this.parent) {
            this.parent.silentlyExpandAllGParents();
        }
    };
    /**
     * @method dump
     * @description When debugging, use this to log a concise shorthand of this entity.
     */
    Row.prototype.dump = function () {
        var str = "".concat(this.getType(), ".").concat(this.element.getComponentId(), "<").concat(this.element.getSafeDomFriendlyName(), ">|").concat(this.getDepthAmongRows(), ".").concat(this.getIndexWithinParentRow());
        if (this.isCluster()) {
            str += ".".concat(this.cluster.prefix, "[]");
        }
        if (this.isProperty()) {
            str += ".".concat(this.getPropertyName());
        }
        return str;
    };
    return Row;
}(BaseModel));
Row.DEFAULT_OPTIONS = {
    required: {
        timeline: true, // Timeline
        element: true, // Element
        component: true, // Component
    },
};
BaseModel.extend(Row);
Row.top = function (criteria) {
    return Row.find(Object.assign({ parent: null }, criteria));
};
Row.findByComponentAndHaikuId = function (component, haikuId) {
    return Row.where({ component: component }).filter(function (row) {
        return row.element.getComponentId() === haikuId;
    })[0];
};
Row.findPropertyRowsByComponentAndParentHaikuId = function (component, haikuId) {
    return Row.where({ component: component }).filter(function (row) {
        return row.isProperty() && row.parent && row.parent.element.getComponentId() === haikuId;
    });
};
Row.cyclicalNav = function (criteria, row, navDir) {
    var target;
    if (navDir === undefined || navDir === null || navDir === NAVIGATION_DIRECTIONS.SAME) {
        target = row;
    }
    else if (row && navDir === NAVIGATION_DIRECTIONS.NEXT) {
        target = row.next();
    }
    else if (row && navDir === NAVIGATION_DIRECTIONS.PREV) {
        target = row.prev();
    }
    // Only allow navigating through rows that we can act upon in the timeline
    if (target && !target.isProperty()) {
        // Endless recursion without this check
        if (navDir !== undefined && navDir !== null && navDir !== NAVIGATION_DIRECTIONS.SAME) {
            return Row.cyclicalNav(criteria, target, navDir);
        }
    }
    return target;
};
Row.focusSelectNext = function (criteria, navDir, doFocus, metadata) {
    var selected = Row.getSelectedRow(criteria);
    var focused = Row.getFocusedRow(criteria);
    if (selected) {
        selected.blur(metadata);
        selected.deselect(metadata);
    }
    if (focused) {
        focused.blur(metadata);
        focused.deselect(metadata);
    }
    var previous = focused || selected;
    var target = (previous)
        ? Row.cyclicalNav(criteria, previous, navDir)
        : Row.cyclicalNav(criteria, Row.findByGlobalPosition(criteria, 0), navDir);
    if (target) {
        target.expand(metadata);
        target.select(metadata);
        if (doFocus) {
            target.focus(metadata);
        }
    }
};
Row.getSelectedRow = function getSelectedRow(criteria) {
    return Row.where(criteria).filter(function (row) {
        return row._isSelected;
    })[0];
};
Row.getFocusedRow = function getFocusedRow(criteria) {
    return Row.where(criteria).filter(function (row) {
        return row._isFocused;
    })[0];
};
/**
 * @function rmap
 * @description Recursively 'map' through all rows, their children, etc.
 */
Row.rmap = function _rmap(criteria, iteratee) {
    return rmap([Row.top(criteria)], iteratee);
};
Row.rsmap = function _rsmap(criteria, iteratee, indentation) {
    var tree = rsmap([Row.top(criteria)], iteratee);
    return tlines([], '', indentation || '    ', tree).join('\n');
};
function rmap(rows, iteratee) {
    return rows.map(function (row) {
        var out = iteratee(row);
        if (!out) {
            throw new Error('rmap iteratee must return an object');
        }
        if (typeof out !== 'object') {
            throw new Error('rmap iteratee must return an object');
        }
        out.children = rmap(row.children, iteratee);
        return out;
    });
}
function rsmap(rows, iteratee) {
    return rows.map(function (row) {
        var out = iteratee(row);
        if (typeof out !== 'string') {
            throw new Error('rmap iteratee must return a string');
        }
        return {
            text: out,
            children: rsmap(row.children, iteratee),
        };
    });
}
function tlines(lines, indent, indentation, nodes) {
    nodes.forEach(function (node) {
        lines.push(indent + node.text);
        tlines(lines, indent + indentation, indentation, node.children);
    });
    return lines;
}
Row.dumpHierarchyInfo = function (criteria) {
    return Row.rsmap(criteria, function (row) {
        return row.dump();
    });
};
Row.buildPropertyUid = function (component, targetElement, addressableName) {
    var elementId = "".concat(targetElement.getComponentId());
    return "".concat(component.getPrimaryKey(), "::").concat(elementId, "-property-").concat(addressableName);
};
Row.buildClusterUid = function (component, targetElement, propertyGroupDescriptor) {
    var elementId = "".concat(targetElement.getComponentId());
    return "".concat(component.getPrimaryKey(), "::").concat(elementId, "-cluster-").concat(propertyGroupDescriptor.cluster.prefix);
};
Row.buildClusterMemberUid = function (component, targetElement, propertyGroupDescriptor, addressableName) {
    var elementId = "".concat(targetElement.getComponentId());
    return "".concat(component.getPrimaryKey(), "::").concat(elementId, "-cluster-").concat(propertyGroupDescriptor.cluster.prefix, "-property-").concat(addressableName);
};
Row.buildHeadingUid = function (component, targetElement) {
    return "".concat(component.getPrimaryKey(), "::").concat(targetElement.getComponentId(), "-heading");
};
module.exports = Row;
// Down here to avoid Node circular dependency stub objects. #FIXME
var Keyframe = require('./Keyframe');
var Timeline = require('./Timeline');
var Property = require('./Property');
//# sourceMappingURL=Row.js.map