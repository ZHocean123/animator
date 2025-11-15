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
/**
 * @class MountElement
 * @description
 *  Convenience abstraction over the DOM element on stage into which the
 *  ActiveComponent instance is mounted. Originally, the DOM element was
 *  managed directly by ActiveComponent; this class makes it much more convenient
 *  so ActiveComponent can freely call methods without checking for null or
 *  worrying about whether we even *have* a DOM (we may be running in Node).
 *  It also handles updating the node and handling tricky DOM logic for remounting
 *  when the previous mount has been removed.
 */
var MountElement = /** @class */ (function (_super) {
    __extends(MountElement, _super);
    function MountElement(props, opts) {
        var _this = _super.call(this, props, opts) || this;
        if (typeof window !== 'undefined') {
            _this._$el = window.document.createElement('div');
            _this._$el.setAttribute('id', _this.getRenderId());
            _this._$el.setAttribute('class', 'haiku-component-mount');
            // Fill up the host element container and position correctly at top left
            _this._$el.style.position = 'absolute';
            _this._$el.style.left = 0;
            _this._$el.style.top = 0;
            _this._$el.style.width = '100%';
            _this._$el.style.height = '100%';
            _this._$el.style.overflow = 'visible';
        }
        else {
            _this._$el = null; // Allow headless usage
        }
        return _this;
    }
    /**
     * @method $el
     * @description Return the DOM element for this mount.
     */
    MountElement.prototype.$el = function () {
        return this._$el;
    };
    /**
     * @method remountInto
     * @description Given a host DOM node, inject our render target DOM node into it
     */
    MountElement.prototype.remountInto = function ($host) {
        // The caller may call ac.mountApplication without a node (headless),
        // in which case just skip this
        if (!$host) {
            return null;
        }
        var $el = this.$el();
        // Relatedly, we also might be headless ourselves, in which case, skip
        if ($el) {
            // First clear us out of our existing parent
            if ($el.parentNode) {
                $el.parentNode.removeChild($el);
            }
            // Then clear the given element (just to be safe)
            while ($host.firstChild) {
                $host.removeChild($host.firstChild);
            }
            // Finally, append our element into the host element
            $host.appendChild($el);
        }
    };
    MountElement.prototype.getInnerHTML = function () {
        if (this.$el()) {
            return this.$el().innerHTML;
        }
        // TODO: Is it better to just return null or an empty string here?
        return '<div></div>';
    };
    MountElement.prototype.getBoundingClientRect = function () {
        if (this.$el()) {
            var rect = this.$el().getBoundingClientRect();
            // Wrap in an object so it's serializable
            return {
                width: rect.width,
                height: rect.height,
                top: rect.top,
                bottom: rect.bottom,
                left: rect.left,
                right: rect.right,
            };
        }
        // TODO: Is it better to just return null here?
        // Use 1s instead of 0s to make div-by-zero errors less likely downstream
        return {
            width: 1,
            height: 1,
            bottom: 0,
            top: 0,
            left: 0,
            right: 0,
        };
    };
    MountElement.prototype.setClass = function (klassName) {
        if (this.$el()) {
            this.$el().className = "".concat(klassName);
        }
    };
    MountElement.prototype.setOpacity = function (opacity) {
        if (this.$el()) {
            this.$el().style.opacity = "".concat(opacity);
        }
    };
    MountElement.prototype.getRenderId = function () {
        return "haiku-mount-".concat(this.getPrimaryKey());
    };
    /**
     * @method clear
     * @description Clear all children from this mount DOM element
     */
    MountElement.prototype.clear = function () {
        while (this.$el() && this.$el().firstChild) {
            this.$el().removeChild(this.$el().firstChild);
        }
    };
    return MountElement;
}(BaseModel));
MountElement.DEFAULT_OPTIONS = {
    required: {
        component: true,
    },
};
BaseModel.extend(MountElement);
module.exports = MountElement;
//# sourceMappingURL=MountElement.js.map