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
var BaseModel = require('./BaseModel');
/**
 * @class InstalledComponent
 */
var InstalledComponent = /** @class */ (function (_super) {
    __extends(InstalledComponent, _super);
    function InstalledComponent() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    InstalledComponent.prototype.getTitle = function () {
        var parts = this.modpath.split(path.sep);
        if (parts[0] === '@haiku' && parts[1] === 'core' && parts[2] === 'components') {
            // @haiku/core/components/controls/HTML, etc
            return parts[4];
        }
        return parts.join('_');
    };
    InstalledComponent.prototype.getReifiedBytecode = function () {
        return null;
    };
    InstalledComponent.prototype.doesMatchOrHostComponent = function (other, cb) {
        return cb(null, false);
    };
    InstalledComponent.prototype.getIdentifier = function () {
        // This identifier is going to be something like HaikuLine or MyOrg_MyName
        return ModuleWrapper.modulePathToIdentifierName(this.modpath);
    };
    return InstalledComponent;
}(BaseModel));
InstalledComponent.DEFAULT_OPTIONS = {
    required: {
        modpath: true,
    },
};
BaseModel.extend(InstalledComponent);
module.exports = InstalledComponent;
var ModuleWrapper = require('./ModuleWrapper');
//# sourceMappingURL=InstalledComponent.js.map