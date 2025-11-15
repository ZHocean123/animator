var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
var logger = require('haiku-serialization/src/utils/LoggerInstance');
module.exports = function requestElementCoordinates(_a, maxNumberOfTries, currentNumberOfTries) {
    var _this = this;
    var currentWebview = _a.currentWebview, requestedWebview = _a.requestedWebview, selector = _a.selector, shouldNotifyEnvoy = _a.shouldNotifyEnvoy, tourClient = _a.tourClient;
    if (maxNumberOfTries === void 0) { maxNumberOfTries = 15; }
    if (currentNumberOfTries === void 0) { currentNumberOfTries = 0; }
    if (currentWebview !== requestedWebview) {
        return;
    }
    // if the loading screen is present, wait 300ms and try again
    var loader = document.getElementById('js-helper-project-loader');
    // (deprecated) webview project loader: when the loader transform style is "none", that means it's visible.
    // Current: when the loader is present on the page, that means it's visible.
    if (loader) {
        return setTimeout(function () {
            requestElementCoordinates.apply(_this, __spreadArray(__spreadArray([], arguments, true), [
                maxNumberOfTries,
                currentNumberOfTries,
            ], false));
        }, 300);
    }
    logger.info("[".concat(currentWebview, "] handleRequestElementCoordinates"), selector, currentWebview);
    var domElement = document.querySelector(selector);
    if (domElement) {
        var _b = domElement.getBoundingClientRect(), top_1 = _b.top, left = _b.left, width = _b.width, height = _b.height;
        if (shouldNotifyEnvoy) {
            logger.info("[".concat(currentWebview, "] receive element coordinates"), selector, top_1, left);
            tourClient.receiveElementCoordinates(currentWebview, { top: top_1, left: left, width: width, height: height });
        }
    }
    else {
        // If we didn't find a DOM element, try again in 300ms
        if (maxNumberOfTries >= currentNumberOfTries) {
            setTimeout(function () {
                requestElementCoordinates.apply(_this, __spreadArray(__spreadArray([], arguments, true), [
                    maxNumberOfTries,
                    currentNumberOfTries++,
                ], false));
            }, 300);
        }
        else {
            logger.error("[".concat(currentWebview, "] Error fetching ").concat(selector, " in webview ").concat(currentWebview));
        }
    }
};
//# sourceMappingURL=requestElementCoordinates.js.map