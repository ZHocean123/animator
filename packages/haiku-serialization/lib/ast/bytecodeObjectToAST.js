var objectToOAST = require('./objectToOAST');
function buildRequireStatement(identifier, modpath) {
    return {
        type: 'VariableDeclaration',
        kind: 'var',
        declarations: [{
                type: 'VariableDeclarator',
                id: {
                    type: 'Identifier',
                    name: identifier,
                },
                init: {
                    type: 'CallExpression',
                    callee: {
                        type: 'Identifier',
                        name: 'require',
                    },
                    arguments: [{
                            type: 'StringLiteral',
                            value: modpath,
                            extra: {
                                raw: JSON.stringify(modpath),
                            },
                        }],
                },
            }],
    };
}
function buildRequireStatementsFromImports(imports) {
    var statements = [buildRequireStatement('Haiku', '@haiku/core')];
    for (var modpath in imports) {
        var identifier = imports[modpath];
        statements.push(buildRequireStatement(identifier, modpath));
    }
    return statements;
}
module.exports = function bytecodeObjectToAST(bytecode, imports, frontMatterNodes, backMatterNodes) {
    if (imports === void 0) { imports = {}; }
    if (frontMatterNodes === void 0) { frontMatterNodes = []; }
    if (backMatterNodes === void 0) { backMatterNodes = []; }
    var oast = objectToOAST(bytecode);
    var ast = {
        type: 'File',
        comments: [],
        program: {
            type: 'Program',
            directives: [],
            sourceType: 'module',
            interpreter: null,
            body: buildRequireStatementsFromImports(imports)
                .concat(frontMatterNodes)
                .concat([
                {
                    type: 'ExpressionStatement',
                    expression: {
                        type: 'AssignmentExpression',
                        operator: '=',
                        left: {
                            type: 'MemberExpression',
                            object: {
                                type: 'Identifier',
                                name: 'module',
                            },
                            property: {
                                type: 'Identifier',
                                name: 'exports',
                            },
                        },
                        right: oast,
                    },
                },
            ])
                .concat(backMatterNodes),
        },
    };
    return ast;
};
//# sourceMappingURL=bytecodeObjectToAST.js.map