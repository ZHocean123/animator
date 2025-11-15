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
 * @class SelectionMarquee
 * @description
 *  Represents the on-stage selection marquee.
 */
var SelectionMarquee = /** @class */ (function (_super) {
    __extends(SelectionMarquee, _super);
    function SelectionMarquee(props, opts) {
        var _this = _super.call(this, props, opts) || this;
        // Whether or not our marquee is active, i.e. displayed
        _this._isActive = false;
        return _this;
    }
    SelectionMarquee.prototype.startSelection = function (startPosition) {
        this._isActive = true;
        this._startPosition = startPosition;
    };
    SelectionMarquee.prototype.moveSelection = function (movePosition) {
        this._movePosition = movePosition;
    };
    SelectionMarquee.prototype.endSelection = function () {
        this._isActive = false;
        this._startPosition = null;
        this._movePosition = null;
    };
    SelectionMarquee.prototype.isActive = function () {
        return this._isActive;
    };
    SelectionMarquee.prototype.getBox = function () {
        if (!this._startPosition ||
            !this._movePosition ||
            !this._isActive) {
            return { x: 1, y: 1, width: 1, height: 1 };
        }
        var w = this._movePosition.x - this._startPosition.x;
        var h = this._movePosition.y - this._startPosition.y;
        var x1 = this._startPosition.x;
        var y1 = this._startPosition.y;
        var x2 = x1 + w;
        var y2 = y1 + h;
        // This box gets rendered as a div, so we rearrange the values so x,y
        // is always the box's top-left corner
        var x = Math.min(x1, x2);
        var y = Math.min(y1, y2);
        var width = Math.abs(w);
        var height = Math.abs(h);
        return {
            x: x,
            y: y,
            width: width,
            height: height,
        };
    };
    return SelectionMarquee;
}(BaseModel));
SelectionMarquee.DEFAULT_OPTIONS = {
    required: {
        uid: true,
        component: true,
        artboard: true,
    },
};
BaseModel.extend(SelectionMarquee);
module.exports = SelectionMarquee;
//# sourceMappingURL=SelectionMarquee.js.map