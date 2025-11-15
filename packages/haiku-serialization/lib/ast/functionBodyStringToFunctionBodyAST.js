var parse = require('@babel/parser').parse;
function functionBodyStringToFunctionBodyAST(body) {
    var nodes = [];
    var innerComments = null;
    if (body) {
        var ast = parse(body, {
            allowReturnOutsideFunction: true,
        });
        // Inner comments happens when only comments are existant
        if (ast.program.innerComments) {
            innerComments = ast.program.innerComments;
        }
        nodes.push.apply(nodes, ast.program.body);
    }
    var block = {
        type: 'BlockStatement',
        body: nodes,
    };
    // If have inner comments, set them
    if (innerComments) {
        block.innerComments = innerComments;
    }
    return block;
}
module.exports = functionBodyStringToFunctionBodyAST;
//# sourceMappingURL=functionBodyStringToFunctionBodyAST.js.map