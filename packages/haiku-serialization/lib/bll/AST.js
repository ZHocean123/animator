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
var prettier = require('prettier');
var BaseModel = require('./BaseModel');
var expressionToRO = require('@haiku/core/lib/reflection/expressionToRO').default;
var bytecodeObjectToAST = require('./../ast/bytecodeObjectToAST');
var normalizeBytecodeAST = require('./../ast/normalizeBytecodeAST');
var parseCode = require('./../ast/parseCode');
var _a = require('haiku-common/lib/experiments'), Experiment = _a.Experiment, experimentIsEnabled = _a.experimentIsEnabled;
var HAIKU_SOURCE_ATTRIBUTE = 'haiku-source';
var HAIKU_VAR_ATTRIBUTE = 'haiku-var';
/**
 * @class AST
 * @description
 *  Holds a copy of a File's AST in memory and makes manipulation calls
 *  more convenient. Includes static helper methods for AST manpulation.
 */
var AST = /** @class */ (function (_super) {
    __extends(AST, _super);
    function AST(props, opts) {
        var _this = _super.call(this, props, opts) || this;
        // To contain the actual AST object from our associated file
        _this.obj = {};
        return _this;
    }
    AST.prototype.updateWithBytecode = function (bytecode, previousSourceCodeString) {
        // Grab imports before we strip the __reference property
        var imports = AST.findImportsFromTemplate(this.file, bytecode.template);
        var ro = AST.normalizeBytecode(bytecode);
        var _a = grabExtraMatterFromSourceCode(previousSourceCodeString), frontMatterNodes = _a.frontMatterNodes, backMatterNodes = _a.backMatterNodes;
        var ast = bytecodeObjectToAST(ro, imports, frontMatterNodes, backMatterNodes);
        normalizeBytecodeAST(ast);
        // Merge instead of replacing wholesale in case we have any pointers
        for (var k1 in this.obj) {
            delete this.obj[k1];
        }
        for (var k2 in ast) {
            this.obj[k2] = ast[k2];
        }
        return this.obj;
    };
    AST.prototype.updateWithBytecodeAndReturnCode = function (bytecode, previousSourceCodeString) {
        this.updateWithBytecode(bytecode, previousSourceCodeString);
        return this.toCode();
    };
    AST.prototype.toCode = function () {
        var _this = this;
        // Prettier doesn't expose a public API that would allow us to "cheat" elegantly, but…
        return prettier.format(
        // …as long as we pass in some nonempty string…
        '()=>{}', {
            // …we can bypass an extra AST parse step from generated code and return our AST direcetly.
            parser: function () { return _this.obj; },
        });
    };
    return AST;
}(BaseModel));
AST.DEFAULT_OPTIONS = {
    required: {
        file: true,
    },
};
BaseModel.extend(AST);
var grabExtraMatterFromSourceCode = function (code) {
    var out = {
        frontMatterNodes: [],
        backMatterNodes: [],
    };
    if (!experimentIsEnabled(Experiment.PreserveFrontMatterInCode) ||
        !code) {
        return out;
    }
    try {
        var ast = parseCode(code);
        if (ast instanceof Error) {
            return out;
        }
        if (!ast || !ast.program || !ast.program.body) {
            return out;
        }
        var nodesCollection_1 = out.frontMatterNodes;
        ast.program.body.forEach(function (node) {
            if (isAutoGenImportNode(node)) {
                return;
            }
            if (isModuleExportsNode(node)) {
                nodesCollection_1 = out.backMatterNodes;
                return;
            }
            nodesCollection_1.push(node);
        });
        return out;
    }
    catch (exception) {
        console.warn('[AST]', exception);
        return out;
    }
};
var isAutoGenImportNode = function (node) {
    // Assumes the form `var Foo = require('bar')`
    return (node.type === 'VariableDeclaration' &&
        node.declarations &&
        node.declarations[0] &&
        node.declarations[0].type === 'VariableDeclarator' &&
        node.declarations[0].init.type === 'CallExpression' &&
        node.declarations[0].init.callee.type === 'Identifier' &&
        node.declarations[0].init.callee.name === 'require' &&
        node.declarations[0].init.arguments &&
        doesRequireCalleeArgIndicateAutoGenImport(node.declarations[0].init.arguments[0]));
};
var doesRequireCalleeArgIndicateAutoGenImport = function (node) {
    return (node &&
        typeof node.value === 'string' &&
        isImportSourceViaAutoGen(node.value));
};
var isImportSourceViaAutoGen = function (source) {
    return (source === '@haiku/core' || // var Haiku = require('@haiku/core'); the core lib
        source.match(/^@haiku\/core\/components/) || // var Text = require('@haiku/core/components/controls/Text');
        source.match(/\/code\.js$/) // var  Foo = require("../foo/code.js"); subcomponents
    );
};
var isModuleExportsNode = function (node) {
    // Assumes the form `module.exports = {...}`
    return (node.type === 'ExpressionStatement' &&
        node.expression.type === 'AssignmentExpression' &&
        node.expression.left.type === 'MemberExpression' &&
        node.expression.left.object.name === 'module' &&
        node.expression.left.property.name === 'exports' &&
        node.expression.right.type === 'ObjectExpression');
};
AST.normalizeBytecode = function (bytecode) {
    var safe = AST.safeBytecode(bytecode);
    var decycled = Bytecode.decycle(safe, { doCleanMana: false });
    // Strip off `__max` and other cruft editor/core may have added
    Bytecode.cleanBytecode(decycled);
    Template.cleanTemplate(decycled.template);
    return expressionToRO(decycled);
};
AST.findImportsFromTemplate = function (hostfile, template) {
    // We'll build a mapping from source path to identifier name
    var imports = {};
    // This assumes that the module paths have been normalized and relativized
    Template.visitWithoutDescendingIntoSubcomponents(template, function (node, parent, index, depth, address) {
        if (node && node.elementName && typeof node.elementName === 'object') {
            var source = void 0;
            var identifier = void 0;
            // If we're loading from in-memory then this should be present
            if (node.elementName.__reference) {
                var reference = ModuleWrapper.parseReference(node.elementName.__reference);
                if (reference) {
                    source = reference.source;
                    identifier = reference.identifier;
                }
            }
            else {
                // But if we just reloaded from disk via require, it'll be the bytecode object
                // and we have to do a bit of hackery in case the element was a primitive
                source = node.attributes && node.attributes[HAIKU_SOURCE_ATTRIBUTE];
                identifier = node.attributes && node.attributes[HAIKU_VAR_ATTRIBUTE];
            }
            if (source && identifier) {
                // In case these weren't set (see above), set them so downstream codegen works :/
                node.elementName.__reference = ModuleWrapper.buildReference(ModuleWrapper.REF_TYPES.COMPONENT, // type
                Template.normalizePath("./".concat(hostfile.relpath)), // host
                Template.normalizePathOfPossiblyExternalModule(source), identifier);
                // While the source string we store as an attribute is always with respect to the project
                // folder, the actual import path we need to write to the file is relative to this module
                var importSourcePath = hostfile.getImportPathTo(source);
                imports[importSourcePath] = identifier;
            }
        }
    });
    return imports;
};
AST.safeBytecode = function (bytecode) {
    var safe = {};
    // We're dealing with a chunk of bytecode that has been rendered, so we need to fix
    // the template object which has been mutated, and return it to its serializable form
    for (var key in bytecode) {
        if (key === 'template') {
            safe[key] = Template.manaWithOnlyStandardProps(bytecode[key], true, function (__reference) {
                var ref = ModuleWrapper.parseReference(__reference);
                if (ref && ref.identifier) {
                    return ref.identifier;
                }
                return __reference;
            });
        }
        else {
            safe[key] = bytecode[key];
        }
    }
    return safe;
};
AST.parseFile = function (folder, relpath, contents, cb) {
    var ast = parseCode(contents);
    if (ast instanceof Error) {
        return cb(ast);
    }
    return cb(null, ast);
};
module.exports = AST;
// Down here to avoid Node circular dependency stub objects. #FIXME
var Bytecode = require('./Bytecode');
var ModuleWrapper = require('./ModuleWrapper');
var Template = require('./Template');
//# sourceMappingURL=AST.js.map