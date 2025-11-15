var traverse = require('@babel/traverse').default;
function traverseAST(ast, iterator) {
    traverse(ast, {
        enter: function (path) {
            iterator(path.node, path.parent);
        },
    });
}
module.exports = traverseAST;
//# sourceMappingURL=traverseAST.js.map