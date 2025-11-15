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
var imageSize = require('image-size');
var BaseModel = require('./BaseModel');
var MODPATH = '@haiku/core/components/controls/Image/code/main/code';
var BYTECODE = require(MODPATH);
/**
 * @class ImageComponent
 */
var ImageComponent = /** @class */ (function (_super) {
    __extends(ImageComponent, _super);
    function ImageComponent(props, opts) {
        var _this = _super.call(this, props, opts) || this;
        _this.modpath = MODPATH;
        _this.identifier = 'image';
        return _this;
    }
    ImageComponent.prototype.getTitle = function () {
        var parts = this.relpath.split(path.sep);
        var last = parts[parts.length - 1];
        var basename = path.basename(last, path.extname(last));
        return basename;
    };
    ImageComponent.prototype.getAbspath = function () {
        return path.join(this.project.getFolder(), this.relpath);
    };
    ImageComponent.prototype.getLocalHref = function () {
        return "web+haikuroot://".concat(path.normalize(this.relpath));
    };
    ImageComponent.prototype.queryImageSize = function (cb) {
        return imageSize(this.getAbspath(), cb);
    };
    ImageComponent.prototype.getReifiedBytecode = function () {
        return BYTECODE;
    };
    ImageComponent.prototype.doesMatchOrHostComponent = function (other, cb) {
        // Stub. There's not a case where the user is directly editing the image component's definition.
        return cb(null, false);
    };
    return ImageComponent;
}(BaseModel));
ImageComponent.DEFAULT_OPTIONS = {
    required: {
        project: true,
        relpath: true,
    },
};
BaseModel.extend(ImageComponent);
module.exports = ImageComponent;
//# sourceMappingURL=ImageComponent.js.map