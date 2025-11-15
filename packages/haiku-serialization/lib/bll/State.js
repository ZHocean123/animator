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
var camelcase = require('camelcase');
var ReservedWords = require('@haiku/core/lib/reflection/ReservedWords').default;
var BaseModel = require('./BaseModel');
/**
 * @class State
 * @description
 *  Collection of static class methods for logic related to states.
 */
var State = /** @class */ (function (_super) {
    __extends(State, _super);
    function State() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return State;
}(BaseModel));
State.DEFAULT_OPTIONS = {
    required: {},
};
BaseModel.extend(State);
function nextAvailableWordIfReserved(word) {
    if (ReservedWords.isReserved(word)) {
        return nextAvailableWordIfReserved("_".concat(word));
    }
    return word;
}
State.isNumeric = function (n) {
    return !isNaN(parseFloat(n)) && isFinite(n);
};
State.safeJsonStringify = function (thing) {
    try {
        return JSON.stringify(thing);
    }
    catch (exception) {
        if (thing && thing.toString) {
            return thing.toString();
        }
        return '' + thing + '';
    }
};
State.buildStateNameFromElementPropertyName = function (n, states, elementNode, propertyName, originalName) {
    var stateName = originalName;
    var elementName = elementNode && elementNode.elementName;
    if (!stateName) {
        if (elementName === 'path' && propertyName === 'd') {
            stateName = 'pathInstructions';
        }
    }
    if (!stateName) {
        stateName = camelcase(propertyName);
    }
    stateName = "".concat(stateName.split(/\W+/g).join('_')).concat((n && "_".concat(n)) || '');
    // Some state names may match JavaScript reserved words like in="", which
    // will result in syntax errors when injected into expressions
    stateName = nextAvailableWordIfReserved(stateName);
    if (!states[stateName]) {
        return stateName;
    }
    return State.buildStateNameFromElementPropertyName(n + 1, states, elementNode, propertyName, originalName);
};
/**
 * @method areStatesEquivalent
 * @description Determines whether two state objects have the same properties
 * @returns {Boolean}
 */
State.areStatesEquivalent = function (s1, s2) {
    if (!s1 && !s2) {
        return true;
    }
    if (s1 && !s2) {
        return false;
    }
    if (!s1 && s2) {
        return false;
    }
    for (var k1 in s1) {
        if (s2[k1] === undefined) {
            return false;
        }
    }
    for (var k2 in s2) {
        if (s1[k2] === undefined) {
            return false;
        }
    }
    return true;
};
State.deduceTypeOfValue = function (stateValue) {
    if (Array.isArray(stateValue)) {
        return 'array';
    }
    if (State.isNumeric(stateValue)) {
        return 'number';
    }
    if (stateValue && typeof stateValue === 'object') {
        return 'object';
    }
    if (stateValue === null || stateValue === undefined) {
        return 'any';
    }
    if (typeof stateValue === 'string') {
        return 'string';
    }
    return typeof stateValue;
};
State.deduceType = function (stateValueDescriptor) {
    if (stateValueDescriptor.type) {
        return stateValueDescriptor.type;
    }
    return State.deduceTypeOfValue(stateValueDescriptor.value);
};
State.assignDescriptor = function (out, stateValueDescriptor) {
    if (stateValueDescriptor.setter) {
        out.set = stateValueDescriptor.setter;
    } // Fix legacy naming
    if (stateValueDescriptor.getter) {
        out.get = stateValueDescriptor.getter;
    } // Fix legacy naming
    if (stateValueDescriptor.set) {
        out.set = stateValueDescriptor.set;
    }
    if (stateValueDescriptor.get) {
        out.get = stateValueDescriptor.get;
    }
    if (stateValueDescriptor.type) {
        out.type = stateValueDescriptor.type;
    }
    if (stateValueDescriptor.access) {
        out.access = stateValueDescriptor.access;
    }
    if (stateValueDescriptor.mock !== undefined) {
        out.mock = stateValueDescriptor.mock;
    }
    if (stateValueDescriptor.value !== undefined) {
        out.value = stateValueDescriptor.value;
    }
    return out;
};
State.autoStringify = function (stateValueDescriptor) {
    var deducedType = State.deduceType(stateValueDescriptor);
    return State.stringifyFromType(stateValueDescriptor.value, deducedType);
};
State.stringifyFromType = function (stateValue, knownType) {
    if (typeof stateValue === 'string') {
        return stateValue;
    } // Use string if already a string
    switch (knownType) {
        case 'array':
            return State.safeJsonStringify(stateValue);
        case 'object':
            return State.safeJsonStringify(stateValue);
        default: // booleans, numbers, strings, and empty values
            if (stateValue && stateValue.toString) {
                return stateValue.toString();
            }
            if (stateValue === null) {
                return '';
            }
            if (stateValue === undefined) {
                return '';
            }
            return '' + stateValue + '';
    }
};
State.recast = function (stateValueDescriptor) {
    var clonedValueDescriptor = State.assignDescriptor({}, stateValueDescriptor);
    clonedValueDescriptor.value = Expression.parseValue(clonedValueDescriptor.value);
    clonedValueDescriptor.mock = Expression.parseValue(clonedValueDescriptor.mock);
    clonedValueDescriptor.type = State.deduceType(clonedValueDescriptor);
    return clonedValueDescriptor;
};
module.exports = State;
var Expression = require('./Expression');
//# sourceMappingURL=State.js.map