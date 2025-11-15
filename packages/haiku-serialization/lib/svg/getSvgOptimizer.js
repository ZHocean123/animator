var Svgo = require('svgo');
var customPlugins = require('./plugins');
var singleton;
var plugins = [
    'removeMetadata',
    'removeTitle',
    'removeDesc',
    'removeUselessDefs',
    'removeEmptyAttrs',
    'removeUselessStrokeAndFill',
    'removeNonInheritableGroupAttrs',
    'moveElemsAttrsToGroup',
    'removeEmptyContainers',
    'removeEmptyText',
    'removeViewBox',
    'convertStyleToAttrs',
    customPlugins,
];
module.exports = function () {
    if (!singleton) {
        singleton = new Svgo({
            full: true,
            floatPrecision: 3,
            plugins: plugins,
        });
    }
    return singleton;
};
//# sourceMappingURL=getSvgOptimizer.js.map