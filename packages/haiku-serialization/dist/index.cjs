//#region rolldown:runtime
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function() {
	return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __copyProps = (to, from, except, desc) => {
	if (from && typeof from === "object" || typeof from === "function") {
		for (var keys$1 = __getOwnPropNames(from), i$1 = 0, n = keys$1.length, key; i$1 < n; i$1++) {
			key = keys$1[i$1];
			if (!__hasOwnProp.call(to, key) && key !== except) {
				__defProp(to, key, {
					get: ((k) => from[k]).bind(null, key),
					enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
				});
			}
		}
	}
	return to;
};
var __reExport = (target, mod, secondTarget, symbols) => {
	if (symbols) {
		__defProp(target, Symbol.toStringTag, { value: "Module" });
		secondTarget && __defProp(secondTarget, Symbol.toStringTag, { value: "Module" });
	}
	__copyProps(target, mod, "default"), secondTarget && __copyProps(secondTarget, mod, "default");
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", {
	value: mod,
	enumerable: true
}) : target, mod));

//#endregion

//#region src/ast/parseCode.js
var require_parseCode = /* @__PURE__ */ __commonJS({ "src/ast/parseCode.js": ((exports, module) => {
	const { parse: parse$3 } = require("@babel/parser");
	function parseCode$3(code, options) {
		try {
			return parse$3(code, options || { sourceType: "module" });
		} catch (exception) {
			return exception;
		}
	}
	module.exports = parseCode$3;
}) });

//#endregion
//#region src/ast/wrapInHaikuInject.js
var require_wrapInHaikuInject = /* @__PURE__ */ __commonJS({ "src/ast/wrapInHaikuInject.js": ((exports, module) => {
	const { toText } = require("@haiku/core/lib/reflection/JavaScriptIdentifier");
	module.exports = function wrapInHaikuInject$3(node) {
		return {
			type: "CallExpression",
			callee: {
				type: "MemberExpression",
				object: {
					type: "Identifier",
					name: "Haiku"
				},
				property: {
					type: "Identifier",
					name: "inject"
				}
			},
			arguments: [node].concat(node.params.map((param) => {
				const value = toText(param.name);
				return {
					type: "StringLiteral",
					value,
					extra: { raw: JSON.stringify(value) }
				};
			}))
		};
	};
}) });

//#endregion
//#region src/ast/functionToASTExpression.js
var require_functionToASTExpression = /* @__PURE__ */ __commonJS({ "src/ast/functionToASTExpression.js": ((exports, module) => {
	const parseCode$2 = require_parseCode();
	const wrapInHaikuInject$2 = require_wrapInHaikuInject();
	function functionToASTExpression$1(fn) {
		const expr = parseCode$2(`(\n${fn.toString().trim()}\n)`).program.body[0].expression;
		if (fn.injectee) return wrapInHaikuInject$2(expr);
		return expr;
	}
	module.exports = functionToASTExpression$1;
}) });

//#endregion
//#region src/ast/functionBodyStringToFunctionBodyAST.js
var require_functionBodyStringToFunctionBodyAST = /* @__PURE__ */ __commonJS({ "src/ast/functionBodyStringToFunctionBodyAST.js": ((exports, module) => {
	const { parse: parse$2 } = require("@babel/parser");
	function functionBodyStringToFunctionBodyAST$1(body) {
		const nodes = [];
		let innerComments = null;
		if (body) {
			const ast = parse$2(body, { allowReturnOutsideFunction: true });
			if (ast.program.innerComments) innerComments = ast.program.innerComments;
			nodes.push(...ast.program.body);
		}
		const block = {
			type: "BlockStatement",
			body: nodes
		};
		if (innerComments) block.innerComments = innerComments;
		return block;
	}
	module.exports = functionBodyStringToFunctionBodyAST$1;
}) });

//#endregion
//#region src/ast/paramsToFunctionASTParams.js
var require_paramsToFunctionASTParams = /* @__PURE__ */ __commonJS({ "src/ast/paramsToFunctionASTParams.js": ((exports, module) => {
	function propMap(obj) {
		const properties = [];
		for (const key in obj) properties.push({
			type: "ObjectProperty",
			key: {
				type: "StringLiteral",
				value: key,
				extra: { raw: `"${key}"` }
			},
			value: paramToFunctionASTParam(obj[key])
		});
		return properties;
	}
	function paramToFunctionASTParam(param) {
		if (typeof param === "string") return {
			type: "Identifier",
			name: param
		};
		if (Array.isArray(param)) return {
			type: "ArrayPattern",
			elements: param.map(paramToFunctionASTParam)
		};
		if (param && typeof param === "object") return {
			type: "ObjectPattern",
			properties: propMap(param)
		};
	}
	function paramsToFunctionASTParams$1(params) {
		if (!params || params.length < 1) return [];
		return params.map(paramToFunctionASTParam);
	}
	module.exports = paramsToFunctionASTParams$1;
}) });

//#endregion
//#region src/ast/RFOToFunctionAST.js
var require_RFOToFunctionAST = /* @__PURE__ */ __commonJS({ "src/ast/RFOToFunctionAST.js": ((exports, module) => {
	const functionBodyStringToFunctionBodyAST = require_functionBodyStringToFunctionBodyAST();
	const paramsToFunctionASTParams = require_paramsToFunctionASTParams();
	const wrapInHaikuInject$1 = require_wrapInHaikuInject();
	function RFOToFunctionAST$1(rfo, key) {
		const type = rfo.type || "FunctionExpression";
		let ast;
		switch (type) {
			case "FunctionExpression":
				ast = {
					type: "FunctionExpression",
					id: rfo.name && {
						type: "Identifier",
						name: rfo.name
					} || void 0,
					params: paramsToFunctionASTParams(rfo.params),
					body: functionBodyStringToFunctionBodyAST(rfo.body)
				};
				break;
			case "ArrowFunctionExpression":
				ast = {
					type: "ArrowFunctionExpression",
					params: paramsToFunctionASTParams(rfo.params),
					body: functionBodyStringToFunctionBodyAST(rfo.body)
				};
				break;
		}
		if (rfo.injectee) return wrapInHaikuInject$1(ast);
		return ast;
	}
	module.exports = RFOToFunctionAST$1;
}) });

//#endregion
//#region src/ast/expressionToOASTComponent.js
var require_expressionToOASTComponent = /* @__PURE__ */ __commonJS({ "src/ast/expressionToOASTComponent.js": ((exports, module) => {
	function expressionToOASTComponent$1(exp, key, keyChain) {
		if (exp === void 0 || exp === null) return { type: "NullLiteral" };
		if (exp === true || exp === false) return {
			type: "BooleanLiteral",
			value: exp
		};
		if (typeof exp === "string") return {
			type: "StringLiteral",
			value: exp,
			extra: { raw: JSON.stringify(exp) }
		};
		if (typeof exp === "number") return {
			type: "NumericLiteral",
			value: exp,
			extra: { raw: exp.toString() }
		};
		if (Array.isArray(exp)) {
			const elements = [];
			for (let i$1 = 0; i$1 < exp.length; i$1++) elements.push(expressionToOASTComponent$1(exp[i$1], i$1));
			return {
				type: "ArrayExpression",
				elements
			};
		}
		if (exp.__function) return RFOToFunctionAST(exp.__function, key);
		if (exp.__value) return expressionToOASTComponent$1(exp.__value, key, keyChain);
		if (exp.__reference) return {
			type: "Identifier",
			name: exp.__reference
		};
		if (typeof exp === "object") return objectToOAST$2(exp, keyChain);
		if (typeof exp === "function") return functionToASTExpression(exp);
		throw new Error(`Unable to compile expression ${exp}`);
	}
	module.exports = expressionToOASTComponent$1;
	let functionToASTExpression = require_functionToASTExpression();
	let objectToOAST$2 = require_objectToOAST();
	let RFOToFunctionAST = require_RFOToFunctionAST();
}) });

//#endregion
//#region src/ast/objectToOAST.js
var require_objectToOAST = /* @__PURE__ */ __commonJS({ "src/ast/objectToOAST.js": ((exports, module) => {
	const { LAYOUT_3D_SCHEMA: LAYOUT_3D_SCHEMA$2 } = require("@haiku/core/lib/HaikuComponent");
	/**
	* We can emit a "shorthand" for bytecode timeline properties at serialization time like so:
	*   {"sizeAbsolute.x": {"0": {"value": 550}}} ->
	*   {"sizeAbsolute.x": 550}
	*
	* The inputs are carefully checked to evaluate if we're in a safe context to perform this shortening, essentially
	* confirming that we are looking at an object exactly like this (and in the expected place).
	*/
	function canUseShorthand(obj, keyChain) {
		if (keyChain.length !== 4 || keyChain[0] !== "timelines") return false;
		const keys$1 = Object.keys(obj);
		return keys$1.length === 1 && keys$1[0] === "0" && typeof obj[0] === "object" && typeof obj[0].value !== "object" && (LAYOUT_3D_SCHEMA$2[keyChain[3]] || !obj[0].edited);
	}
	function objectToOAST$1(obj, keyChain = []) {
		if (canUseShorthand(obj, keyChain)) return expressionToOASTComponent(obj["0"].value);
		const oast = {
			type: "ObjectExpression",
			properties: []
		};
		for (const key in obj) {
			if (key === void 0) continue;
			const keyexp = expressionToOASTComponent(key);
			keyChain.push(key);
			const valueexp = expressionToOASTComponent(obj[key], key, keyChain);
			keyChain.pop();
			oast.properties.push({
				type: "ObjectProperty",
				key: keyexp,
				value: valueexp
			});
		}
		return oast;
	}
	module.exports = objectToOAST$1;
	const expressionToOASTComponent = require_expressionToOASTComponent();
}) });

//#endregion
//#region src/ast/bytecodeObjectToAST.js
var require_bytecodeObjectToAST = /* @__PURE__ */ __commonJS({ "src/ast/bytecodeObjectToAST.js": ((exports, module) => {
	const objectToOAST = require_objectToOAST();
	function buildRequireStatement(identifier, modpath) {
		return {
			type: "VariableDeclaration",
			kind: "var",
			declarations: [{
				type: "VariableDeclarator",
				id: {
					type: "Identifier",
					name: identifier
				},
				init: {
					type: "CallExpression",
					callee: {
						type: "Identifier",
						name: "require"
					},
					arguments: [{
						type: "StringLiteral",
						value: modpath,
						extra: { raw: JSON.stringify(modpath) }
					}]
				}
			}]
		};
	}
	function buildRequireStatementsFromImports(imports) {
		const statements = [buildRequireStatement("Haiku", "@haiku/core")];
		for (const modpath in imports) {
			const identifier = imports[modpath];
			statements.push(buildRequireStatement(identifier, modpath));
		}
		return statements;
	}
	module.exports = function bytecodeObjectToAST$1(bytecode, imports = {}, frontMatterNodes = [], backMatterNodes = []) {
		const oast = objectToOAST(bytecode);
		return {
			type: "File",
			comments: [],
			program: {
				type: "Program",
				directives: [],
				sourceType: "module",
				interpreter: null,
				body: buildRequireStatementsFromImports(imports).concat(frontMatterNodes).concat([{
					type: "ExpressionStatement",
					expression: {
						type: "AssignmentExpression",
						operator: "=",
						left: {
							type: "MemberExpression",
							object: {
								type: "Identifier",
								name: "module"
							},
							property: {
								type: "Identifier",
								name: "exports"
							}
						},
						right: oast
					}
				}]).concat(backMatterNodes)
			}
		};
	};
}) });

//#endregion
//#region src/ast/computeUnaryExpression.js
var require_computeUnaryExpression = /* @__PURE__ */ __commonJS({ "src/ast/computeUnaryExpression.js": ((exports, module) => {
	function computeUnaryExpression$1(node) {
		return Number(node.operator + node.argument.value);
	}
	module.exports = computeUnaryExpression$1;
}) });

//#endregion
//#region src/ast/generateCode.js
var require_generateCode = /* @__PURE__ */ __commonJS({ "src/ast/generateCode.js": ((exports, module) => {
	const generate = require("@babel/generator").default;
	function generateCode$2(ast, options, code) {
		return generate(ast, options || {
			retainLines: true,
			comments: true
		}, code || "").code;
	}
	module.exports = generateCode$2;
}) });

//#endregion
//#region src/ast/getFunctionNodeBody.js
var require_getFunctionNodeBody = /* @__PURE__ */ __commonJS({ "src/ast/getFunctionNodeBody.js": ((exports, module) => {
	const generateCode$1 = require_generateCode();
	function getFunctionNodeBody$1(node) {
		const lines = [];
		for (let i$1 = 0; i$1 < node.body.body.length; i$1++) lines.push(generateCode$1(node.body.body[i$1]));
		return lines.join("\n");
	}
	module.exports = getFunctionNodeBody$1;
}) });

//#endregion
//#region src/ast/getFunctionNodeName.js
var require_getFunctionNodeName = /* @__PURE__ */ __commonJS({ "src/ast/getFunctionNodeName.js": ((exports, module) => {
	function getFunctionNodeName$1(node) {
		return node.id && node.id.name || node.key && node.key.name || node.name && node.name.value;
	}
	module.exports = getFunctionNodeName$1;
}) });

//#endregion
//#region src/ast/objectPatternNodeToObject.js
var require_objectPatternNodeToObject = /* @__PURE__ */ __commonJS({ "src/ast/objectPatternNodeToObject.js": ((exports, module) => {
	function patternPropertyNodeValueToValue(node) {
		if (node.type === "Identifier") return node.name;
		if (node.type === "ObjectPattern") return objectPatternNodeToObject$1({}, node);
		if (node.type === "ArrayPattern") {
			const arr$1 = [];
			for (let i$1 = 0; i$1 < node.elements.length; i$1++) arr$1[i$1] = patternPropertyNodeValueToValue(node.elements[i$1]);
			return arr$1;
		}
	}
	function objectPatternNodeToObject$1(out$1, node) {
		for (let i$1 = 0; i$1 < node.properties.length; i$1++) {
			const prop = node.properties[i$1];
			const key = prop.key.name;
			out$1[key] = patternPropertyNodeValueToValue(prop.value);
		}
		return out$1;
	}
	module.exports = objectPatternNodeToObject$1;
}) });

//#endregion
//#region src/ast/getFunctionNodeParams.js
var require_getFunctionNodeParams = /* @__PURE__ */ __commonJS({ "src/ast/getFunctionNodeParams.js": ((exports, module) => {
	const objectPatternNodeToObject = require_objectPatternNodeToObject();
	const unknowns = 0;
	function getFunctionNodeParams$1(node) {
		const params = [];
		for (let i$1 = 0; i$1 < node.params.length; i$1++) {
			const pnode = node.params[i$1];
			if (pnode.type === "Identifier") params[i$1] = pnode.name;
			else if (pnode.type === "ObjectPattern") params[i$1] = objectPatternNodeToObject({}, pnode);
			else params[i$1] = `__unknown_${unknowns}__`;
		}
		return params;
	}
	module.exports = getFunctionNodeParams$1;
}) });

//#endregion
//#region src/ast/isFunctionNode.js
var require_isFunctionNode = /* @__PURE__ */ __commonJS({ "src/ast/isFunctionNode.js": ((exports, module) => {
	const FUNCTION_NODE_TYPES = {
		FunctionExpression: true,
		ClassMethod: true,
		ArrowFunctionExpression: true,
		ObjectMethod: true
	};
	function isFunctionNode$1(node) {
		return node.type in FUNCTION_NODE_TYPES;
	}
	module.exports = isFunctionNode$1;
}) });

//#endregion
//#region src/ast/matchesRequire.js
var require_matchesRequire = /* @__PURE__ */ __commonJS({ "src/ast/matchesRequire.js": ((exports, module) => {
	/**
	* @function matchesRequire
	* @description Checks if a given AST statment is in the format of a typical require
	* statement. i.e. `var ident = require(modulePath);`
	*/
	module.exports = function matchesRequire$2(stmt, identifierName, modulePath) {
		return stmt.type === "VariableDeclaration" && stmt.declarations.length === 1 && stmt.declarations[0].id.type === "Identifier" && stmt.declarations[0].id.name === identifierName && stmt.declarations[0].init.type === "CallExpression" && stmt.declarations[0].init.callee.type === "Identifier" && stmt.declarations[0].init.callee.name === "require" && stmt.declarations[0].init.arguments.length === 1 && stmt.declarations[0].init.arguments[0].type === "StringLiteral" && stmt.declarations[0].init.arguments[0].value === modulePath;
	};
}) });

//#endregion
//#region src/ast/traverseAST.js
var require_traverseAST = /* @__PURE__ */ __commonJS({ "src/ast/traverseAST.js": ((exports, module) => {
	const traverse = require("@babel/traverse").default;
	function traverseAST$3(ast, iterator) {
		traverse(ast, { enter(path$20) {
			iterator(path$20.node, path$20.parent);
		} });
	}
	module.exports = traverseAST$3;
}) });

//#endregion
//#region src/ast/removeRequire.js
var require_removeRequire = /* @__PURE__ */ __commonJS({ "src/ast/removeRequire.js": ((exports, module) => {
	const _$1 = require("lodash");
	const matchesRequire$1 = require_matchesRequire();
	const traverseAST$2 = require_traverseAST();
	/**
	* @function removeRequire
	* @description Given an AST, an identifier name, and a module path,
	* Remove any matching require statements (including their variable declarations)
	* from the AST. This should mutate the AST in place.
	*/
	module.exports = function removeRequire$1(ast, identifierName, modulePath) {
		let identCount = 0;
		traverseAST$2(ast, (node) => {
			if (node.type === "Identifier" && node.name === identifierName) identCount += 1;
		});
		if (identCount > 1) return;
		ast.program.body = _$1.filter(ast.program.body, (stmt) => !matchesRequire$1(stmt, identifierName, modulePath));
	};
}) });

//#endregion
//#region src/ast/upsertRequire.js
var require_upsertRequire = /* @__PURE__ */ __commonJS({ "src/ast/upsertRequire.js": ((exports, module) => {
	const _ = require("lodash");
	const matchesRequire = require_matchesRequire();
	/**
	* @function upsertRequire
	* @description Given an AST object, an identifier name, and a module path,
	* _upsert_ a require statement at the top of the AST such that the output form would be:
	* var {identifierName} = require({modulePath}).
	* This should mutate the AST in place.
	*/
	module.exports = function upsertRequire$1(ast, identifierName, modulePath) {
		if (_.find(ast.program.body, (stmt) => matchesRequire(stmt, identifierName, modulePath))) return null;
		ast.program.body.unshift({
			type: "VariableDeclaration",
			kind: "var",
			declarations: [{
				type: "VariableDeclarator",
				id: {
					type: "Identifier",
					name: identifierName
				},
				init: {
					type: "CallExpression",
					callee: {
						type: "Identifier",
						name: "require"
					},
					arguments: [{
						type: "StringLiteral",
						value: modulePath,
						extra: { raw: JSON.stringify(modulePath) }
					}]
				}
			}]
		});
	};
}) });

//#endregion
//#region src/ast/normalizeBytecodeAST.js
var require_normalizeBytecodeAST = /* @__PURE__ */ __commonJS({ "src/ast/normalizeBytecodeAST.js": ((exports, module) => {
	const removeRequire = require_removeRequire();
	const traverseAST$1 = require_traverseAST();
	const upsertRequire = require_upsertRequire();
	const wrapInHaikuInject = require_wrapInHaikuInject();
	/**
	* @function normalizeBytecodeAST
	* @description Given an AST of a bytecode file, normalize it so that it
	* uses all of the up-to-date constructs expected for the output file.
	*/
	module.exports = function normalizeBytecodeAST$1(ast) {
		removeRequire(ast, "Haiku", "@haiku/player");
		upsertRequire(ast, "Haiku", "@haiku/core");
		ast.program.body.forEach((node) => {
			if (node.leadingComments) node.leadingComments.splice(0);
			if (node.trailingComments) node.trailingComments.splice(0);
		});
		traverseAST$1(ast, (node) => {
			if (node.type === "ObjectProperty") {
				if (node.value.type === "ArrowFunctionExpression") node.value.type = "FunctionExpression";
				if (node.value.type === "FunctionExpression") {
					if (node.key && (node.key.name === "value" || node.key.value === "value")) _convertFunctionToHaikuInjectFormat(node.value, node);
				}
			}
		});
	};
	function _uniqParams(params) {
		const ids = {};
		params.forEach((param) => {
			ids[param.name || param.value] = param;
		});
		const out$1 = [];
		for (const name in ids) out$1.push(ids[name]);
		return out$1;
	}
	function _convertFunctionToHaikuInjectFormat(node, parent) {
		const params = [];
		node.params.forEach((param) => {
			if (param.type === "Identifier") params.push(param);
			else if (param.type === "ObjectPattern") param.properties.forEach((property) => {
				if (property.key.type === "Identifier") params.push(property.key);
			});
		});
		node.params = _uniqParams(params);
		parent.value = wrapInHaikuInject(node);
	}
}) });

//#endregion
//#region src/ast/OASTToRO.js
var require_OASTToRO = /* @__PURE__ */ __commonJS({ "src/ast/OASTToRO.js": ((exports, module) => {
	const computeUnaryExpression = require_computeUnaryExpression();
	const getFunctionNodeBody = require_getFunctionNodeBody();
	const getFunctionNodeName = require_getFunctionNodeName();
	const getFunctionNodeParams = require_getFunctionNodeParams();
	const isFunctionNode = require_isFunctionNode();
	function OASTToRO$1(oast) {
		if (oast.type === "ObjectExpression") {
			const oout = {};
			for (let i$1 = 0; i$1 < oast.properties.length; i$1++) {
				const onode = oast.properties[i$1];
				const key = onode.key.name || onode.key.value;
				oout[key] = OASTToRO$1(onode.value);
			}
			return { __value: oout };
		}
		if (oast.type === "ArrayExpression") {
			const aout = [];
			for (let j = 0; j < oast.elements.length; j++) {
				const anode = oast.elements[j];
				aout[j] = OASTToRO$1(anode);
			}
			return { __value: aout };
		}
		if (oast.type === "Identifier") return { __reference: oast.name };
		if (isFunctionNode(oast)) return { __function: {
			type: oast.type,
			kind: oast.kind,
			name: getFunctionNodeName(oast),
			params: getFunctionNodeParams(oast),
			body: getFunctionNodeBody(oast)
		} };
		if (oast.type === "NullLiteral") return null;
		if (oast.type === "UnaryExpression") return { __value: computeUnaryExpression(oast) };
		if (oast.type === "CallExpression") {
			if (oast.callee && oast.callee.type === "MemberExpression") {
				if (oast.callee.object.name === "Haiku" && oast.callee.property.name === "inject") {
					if (oast.arguments[0]) {
						const rfo = OASTToRO$1(oast.arguments[0]);
						if (rfo && rfo.__function) rfo.__function.injectee = true;
						return rfo;
					}
				}
			}
		}
		return { __value: oast.value };
	}
	module.exports = OASTToRO$1;
}) });

//#endregion
//#region src/utils/HaikuHomeDir.js
var require_HaikuHomeDir = /* @__PURE__ */ __commonJS({ "src/utils/HaikuHomeDir.js": ((exports, module) => {
	const os$3 = require("node:os");
	const path$19 = require("node:path");
	const async$2 = require("async");
	const fse$8 = require("fs-extra");
	const out = {};
	let didTakeTourCache = null;
	const HOMEDIR_PATH = path$19.join(os$3.homedir(), ".haiku");
	out.HOMEDIR_PATH = HOMEDIR_PATH;
	out.HOMEDIR_AUTH_PATH = path$19.join(HOMEDIR_PATH, "auth");
	out.HOMEDIR_PROJECTS_PATH = path$19.join(HOMEDIR_PATH, "projects");
	out.HOMEDIR_LOGS_PATH = path$19.join(HOMEDIR_PATH, "logs");
	out.HOMEDIR_MODEL_STORAGE_PATH = path$19.join(HOMEDIR_PATH, "model-storage");
	out.HOMEDIR_CRASH_REPORTS_PATH = path$19.join(HOMEDIR_PATH, "crash-reports");
	out.HOMEDIR_MANIFEST_PATH = path$19.join(HOMEDIR_PATH, "manifest.json");
	out.HOMEDIR_TOUR_PATH = path$19.join(HOMEDIR_PATH, "tour.json");
	out.HOMEDIR_SKETCH_DIALOG_PATH = path$19.join(HOMEDIR_PATH, "sketch-dialog");
	out.didTakeTour = () => {
		if (didTakeTourCache === null) didTakeTourCache = fse$8.existsSync(out.HOMEDIR_TOUR_PATH);
		return didTakeTourCache;
	};
	out.createTourFile = () => {
		didTakeTourCache = true;
		return fse$8.ensureFileSync(out.HOMEDIR_TOUR_PATH);
	};
	out.didAskedForSketch = () => {
		return fse$8.existsSync(out.HOMEDIR_SKETCH_DIALOG_PATH);
	};
	out.createSketchDialogFile = () => {
		return fse$8.ensureFileSync(out.HOMEDIR_SKETCH_DIALOG_PATH);
	};
	function isDir(abspath) {
		try {
			return fse$8.lstatSync(abspath).isDirectory();
		} catch (exception) {
			logger$21.warn(exception);
			return false;
		}
	}
	out.enumerateAllProjectsByOrganization = (cb) => {
		return fse$8.readdir(out.HOMEDIR_PROJECTS_PATH, (err, orgEntries) => {
			if (err) return err;
			const organizations = {};
			return async$2.each(orgEntries, (orgEntry, nextOrgEntry) => {
				const orgAbspath = path$19.join(out.HOMEDIR_PROJECTS_PATH, orgEntry);
				if (!isDir(orgAbspath)) return nextOrgEntry();
				if (orgEntry[0] === ".") return nextOrgEntry();
				organizations[orgEntry] = [];
				return fse$8.readdir(orgAbspath, (err$1, projEntries) => {
					if (err$1) return nextOrgEntry();
					if (!projEntries) return nextOrgEntry();
					projEntries.forEach((projEntry) => {
						const projAbspath = path$19.join(orgAbspath, projEntry);
						if (!isDir(projAbspath)) return;
						if (projEntry[0] === ".") return;
						if (projEntry[0] === "~") return;
						if (projEntry.match(/\.bak/)) return;
						organizations[orgEntry].push({
							project: projEntry,
							abspath: projAbspath
						});
					});
					return nextOrgEntry();
				});
			}, (err$1) => {
				if (err$1) return cb(err$1);
				return cb(null, organizations);
			});
		});
	};
	module.exports = out;
	const logger$21 = require_LoggerInstance();
}) });

//#endregion
//#region ../../node_modules/.pnpm/fast-safe-stringify@2.1.1/node_modules/fast-safe-stringify/index.js
var require_fast_safe_stringify = /* @__PURE__ */ __commonJS({ "../../node_modules/.pnpm/fast-safe-stringify@2.1.1/node_modules/fast-safe-stringify/index.js": ((exports, module) => {
	module.exports = stringify;
	stringify.default = stringify;
	stringify.stable = deterministicStringify;
	stringify.stableStringify = deterministicStringify;
	var LIMIT_REPLACE_NODE = "[...]";
	var CIRCULAR_REPLACE_NODE = "[Circular]";
	var arr = [];
	var replacerStack = [];
	function defaultOptions() {
		return {
			depthLimit: Number.MAX_SAFE_INTEGER,
			edgesLimit: Number.MAX_SAFE_INTEGER
		};
	}
	function stringify(obj, replacer, spacer, options) {
		if (typeof options === "undefined") options = defaultOptions();
		decirc(obj, "", 0, [], void 0, 0, options);
		var res;
		try {
			if (replacerStack.length === 0) res = JSON.stringify(obj, replacer, spacer);
			else res = JSON.stringify(obj, replaceGetterValues(replacer), spacer);
		} catch (_$2) {
			return JSON.stringify("[unable to serialize, circular reference is too complex to analyze]");
		} finally {
			while (arr.length !== 0) {
				var part = arr.pop();
				if (part.length === 4) Object.defineProperty(part[0], part[1], part[3]);
				else part[0][part[1]] = part[2];
			}
		}
		return res;
	}
	function setReplace(replace, val, k, parent) {
		var propertyDescriptor = Object.getOwnPropertyDescriptor(parent, k);
		if (propertyDescriptor.get !== void 0) if (propertyDescriptor.configurable) {
			Object.defineProperty(parent, k, { value: replace });
			arr.push([
				parent,
				k,
				val,
				propertyDescriptor
			]);
		} else replacerStack.push([
			val,
			k,
			replace
		]);
		else {
			parent[k] = replace;
			arr.push([
				parent,
				k,
				val
			]);
		}
	}
	function decirc(val, k, edgeIndex, stack, parent, depth, options) {
		depth += 1;
		var i$1;
		if (typeof val === "object" && val !== null) {
			for (i$1 = 0; i$1 < stack.length; i$1++) if (stack[i$1] === val) {
				setReplace(CIRCULAR_REPLACE_NODE, val, k, parent);
				return;
			}
			if (typeof options.depthLimit !== "undefined" && depth > options.depthLimit) {
				setReplace(LIMIT_REPLACE_NODE, val, k, parent);
				return;
			}
			if (typeof options.edgesLimit !== "undefined" && edgeIndex + 1 > options.edgesLimit) {
				setReplace(LIMIT_REPLACE_NODE, val, k, parent);
				return;
			}
			stack.push(val);
			if (Array.isArray(val)) for (i$1 = 0; i$1 < val.length; i$1++) decirc(val[i$1], i$1, i$1, stack, val, depth, options);
			else {
				var keys$1 = Object.keys(val);
				for (i$1 = 0; i$1 < keys$1.length; i$1++) {
					var key = keys$1[i$1];
					decirc(val[key], key, i$1, stack, val, depth, options);
				}
			}
			stack.pop();
		}
	}
	function compareFunction(a, b) {
		if (a < b) return -1;
		if (a > b) return 1;
		return 0;
	}
	function deterministicStringify(obj, replacer, spacer, options) {
		if (typeof options === "undefined") options = defaultOptions();
		var tmp = deterministicDecirc(obj, "", 0, [], void 0, 0, options) || obj;
		var res;
		try {
			if (replacerStack.length === 0) res = JSON.stringify(tmp, replacer, spacer);
			else res = JSON.stringify(tmp, replaceGetterValues(replacer), spacer);
		} catch (_$2) {
			return JSON.stringify("[unable to serialize, circular reference is too complex to analyze]");
		} finally {
			while (arr.length !== 0) {
				var part = arr.pop();
				if (part.length === 4) Object.defineProperty(part[0], part[1], part[3]);
				else part[0][part[1]] = part[2];
			}
		}
		return res;
	}
	function deterministicDecirc(val, k, edgeIndex, stack, parent, depth, options) {
		depth += 1;
		var i$1;
		if (typeof val === "object" && val !== null) {
			for (i$1 = 0; i$1 < stack.length; i$1++) if (stack[i$1] === val) {
				setReplace(CIRCULAR_REPLACE_NODE, val, k, parent);
				return;
			}
			try {
				if (typeof val.toJSON === "function") return;
			} catch (_$2) {
				return;
			}
			if (typeof options.depthLimit !== "undefined" && depth > options.depthLimit) {
				setReplace(LIMIT_REPLACE_NODE, val, k, parent);
				return;
			}
			if (typeof options.edgesLimit !== "undefined" && edgeIndex + 1 > options.edgesLimit) {
				setReplace(LIMIT_REPLACE_NODE, val, k, parent);
				return;
			}
			stack.push(val);
			if (Array.isArray(val)) for (i$1 = 0; i$1 < val.length; i$1++) deterministicDecirc(val[i$1], i$1, i$1, stack, val, depth, options);
			else {
				var tmp = {};
				var keys$1 = Object.keys(val).sort(compareFunction);
				for (i$1 = 0; i$1 < keys$1.length; i$1++) {
					var key = keys$1[i$1];
					deterministicDecirc(val[key], key, i$1, stack, val, depth, options);
					tmp[key] = val[key];
				}
				if (typeof parent !== "undefined") {
					arr.push([
						parent,
						k,
						val
					]);
					parent[k] = tmp;
				} else return tmp;
			}
			stack.pop();
		}
	}
	function replaceGetterValues(replacer) {
		replacer = typeof replacer !== "undefined" ? replacer : function(k, v) {
			return v;
		};
		return function(key, val) {
			if (replacerStack.length > 0) for (var i$1 = 0; i$1 < replacerStack.length; i$1++) {
				var part = replacerStack[i$1];
				if (part[1] === key && part[0] === val) {
					val = part[2];
					replacerStack.splice(i$1, 1);
					break;
				}
			}
			return replacer.call(this, key, val);
		};
	}
}) });

//#endregion
//#region src/utils/Logger.js
var require_Logger = /* @__PURE__ */ __commonJS({ "src/utils/Logger.js": ((exports, module) => {
	const EventEmitter$6 = require("node:events");
	const path$18 = require("node:path");
	const jsonStringify = require_fast_safe_stringify();
	const { isProduction, isWindows: isWindows$2 } = require("haiku-common");
	const winston = require("winston");
	require("colors");
	function formatJsonLogToString(message) {
		if (message.noFormat) return message.message;
		if (Array.isArray(message.message)) message.message = message.message.map((message$1) => {
			if (typeof message$1 === "string") return message$1;
			return jsonStringify(message$1);
		}).join(" ");
		return `${message.timestamp}|${message.view.padEnd(8)}|${message.level}${message.tag ? `|${message.tag}` : ""}${message.durationMs ? `|d=${message.durationMs}` : ""}|${message.message}`;
	}
	/**
	* Control log message format output
	*/
	const haikuFormat = winston.format.printf((info, opts) => {
		return formatJsonLogToString(info);
	});
	const ignoreDoNotWriteToFile = winston.format((info, opts) => {
		if (info.doNotLogOnFile) return false;
		return info;
	});
	const DEFAULTS = {
		maxsize: 1e6,
		maxFiles: 1,
		colorize: true
	};
	var Logger$2 = class extends EventEmitter$6 {
		constructor(folder, relpath, options = {}) {
			super(options);
			const config = Object.assign({}, DEFAULTS, options);
			const transports = [];
			if (folder && relpath) {
				const filename = path$18.join(folder, relpath);
				transports.push(new winston.transports.File({
					filename,
					tailable: true,
					maxsize: config.maxsize,
					maxFiles: config.maxFiles,
					colorize: config.colorize,
					level: "info",
					json: false,
					format: winston.format.combine(ignoreDoNotWriteToFile(), haikuFormat)
				}));
			}
			if (!isProduction() && !isWindows$2()) transports.push(new winston.transports.Console({ format: winston.format.combine(haikuFormat) }));
			this.logger = winston.createLogger({
				format: winston.format.combine(winston.format.timestamp()),
				transports
			});
			this.view = "?";
		}
		raw(jsonMessage) {
			this.logger.log(jsonMessage);
		}
		info(...args) {
			this.logger.info(args, { view: this.view });
		}
		traceInfo(tag, message, attachedObject) {
			this.logger.info(message, {
				view: this.view,
				tag,
				attachedObject
			});
		}
		debug(...args) {
			this.logger.debug(args, { view: this.view });
		}
		warn(...args) {
			this.logger.warn(args, { view: this.view });
		}
		error(...args) {
			this.logger.error(args, { view: this.view });
		}
		/**
		* Methods not supported by winston fall back to console
		*/
		assert(...args) {
			console.assert(...args);
		}
		count(...args) {
			console.count(...args);
		}
		countReset(...args) {
			console.countReset(...args);
		}
		dir(...args) {
			console.dir(...args);
		}
		dirxml(...args) {
			console.dirxml(...args);
		}
		exception(...args) {
			console.exception(...args);
		}
		group(...args) {
			console.group(...args);
		}
		groupCollapsed(...args) {
			console.groupCollapsed(...args);
		}
		groupEnd(...args) {
			console.groupEnd(...args);
		}
		profileEnd(...args) {
			console.profileEnd(...args);
		}
		select(...args) {
			console.select(...args);
		}
		table(...args) {
			console.table(...args);
		}
		time(...args) {
			this.logger.profile(args, { view: this.view });
		}
		timeLog(...args) {
			console.timeLog(...args);
		}
		timeEnd(...args) {
			this.logger.profile(args, { view: this.view });
		}
		trace(...args) {
			console.trace(...args);
		}
	};
	module.exports = {
		Logger: Logger$2,
		formatJsonLogToString
	};
}) });

//#endregion
//#region src/utils/LoggerInstance.js
var require_LoggerInstance = /* @__PURE__ */ __commonJS({ "src/utils/LoggerInstance.js": ((exports, module) => {
	const fs$3 = require("haiku-fs-extra");
	const { HOMEDIR_LOGS_PATH } = require_HaikuHomeDir();
	const { Logger: Logger$1 } = require_Logger();
	fs$3.mkdirpSync(HOMEDIR_LOGS_PATH);
	const logger$20 = new Logger$1(HOMEDIR_LOGS_PATH, "haiku-debug.log");
	module.exports = logger$20;
}) });

//#endregion
//#region src/ast/parseExpression.js
var require_parseExpression = /* @__PURE__ */ __commonJS({ "src/ast/parseExpression.js": ((exports, module) => {
	const Parser = require("cst").Parser;
	const walk = require("estree-walker").walk;
	const fsm = require("fuzzy-string-matching");
	const uniq = require("lodash").uniq;
	const FORBIDDEN_EXPRESSION_TOKENS = require("@haiku/core/lib/HaikuComponent").default.FORBIDDEN_EXPRESSION_TOKENS;
	const logger$19 = require_LoggerInstance();
	const PARSER = new Parser({
		sourceType: "script",
		strictMode: true
	});
	const MATCH_WEIGHTS = {
		INJECTABLES: .5,
		KEYWORDS: .5,
		DECLARATIONS: .5
	};
	function wrap(exprWithourWrap) {
		return `(function(){"use strict";\n${exprWithourWrap}\n})`;
	}
	function unwrap(exprWithWrap) {
		return exprWithWrap.slice(26, exprWithWrap.length - 3);
	}
	function getSegsList(list, node) {
		if (node.type === "Identifier") {
			list.push(node);
			return list;
		}
		if (node.type === "MemberExpression") {
			getSegsList(list, node.object);
			list.push(node.property);
			return list;
		}
	}
	function isTokenStreamInvalid(tokens$2, options) {
		if (tokens$2.length < 1) return { annotation: "Expression is has no content" };
		if (tokens$2.length === 1 && tokens$2[0].type === "Keyword" && tokens$2[0].value === "return") return { annotation: "Expression is incomplete" };
		if (options.skipForbiddensCheck) return false;
		let foundReturn = false;
		let foundForbiddenToken = false;
		let otherWarning = false;
		for (let i$1 = 0; i$1 < tokens$2.length; i$1++) {
			const token$2 = tokens$2[i$1];
			const parent = tokens$2[i$1 - 1];
			const grandparent = tokens$2[i$1 - 2];
			if (token$2.type === "Keyword") {
				if (token$2.value === "return") foundReturn = true;
			}
			if (token$2.type === "Identifier" || token$2.type === "Keyword") {
				if (token$2.value === "random") {
					if (parent && parent.value === ".") {
						if (grandparent && grandparent.value === "Math") {
							otherWarning = "Instead of Math.random(), use $helpers.rand()";
							break;
						}
					}
				}
				if (token$2.value === "now") {
					if (parent && parent.value === ".") {
						if (grandparent && grandparent.value === "Date") {
							otherWarning = "Instead of Date.now(), use $helpers.now()";
							break;
						}
					}
				}
				if (FORBIDDEN_EXPRESSION_TOKENS[token$2.value]) {
					foundForbiddenToken = token$2;
					break;
				}
			}
		}
		if (otherWarning) return { annotation: otherWarning };
		if (foundForbiddenToken) return { annotation: `${foundForbiddenToken.type} "${foundForbiddenToken.value}" is not allowed in expressions` };
		if (!foundReturn) return { annotation: "Expression must have a return statement" };
		return false;
	}
	function smushKeys(out$1, base, obj, depth, minDepth, maxDepth) {
		for (const key in obj) {
			const sub = base ? `${base}.${key}` : key;
			if (depth >= minDepth && depth <= maxDepth) out$1.push(sub);
			smushKeys(out$1, sub, obj[key], depth + 1, minDepth, maxDepth);
		}
		return out$1;
	}
	function populateCompletions(target, injectables, keywords, declarations) {
		const segs = getSegsList([], target);
		if (segs.length < 1) return [];
		const completions = /* @__PURE__ */ new Set();
		const chain = segs.map((identifierNode) => identifierNode.name).join(".");
		if (segs.length === 1) {
			for (const declarationKey in declarations) if (fsm(segs[0].name, declarationKey) > MATCH_WEIGHTS.DECLARATIONS) completions.add(declarationKey);
			for (const keywordKey in keywords) if (!FORBIDDEN_EXPRESSION_TOKENS[keywordKey]) {
				if (fsm(segs[0].name, keywordKey) > MATCH_WEIGHTS.KEYWORDS) completions.add(keywordKey);
			}
		}
		const found = {};
		findMatches(found, segs, 0, injectables);
		smushKeys([], null, found, 0, segs.length - 1, segs.length).forEach((smushed) => {
			completions.add(smushed);
		});
		if (completions.size === 1 && completions.has(chain)) return [];
		const nChain = chain.toLowerCase();
		return Array.from(completions).sort((a, b) => {
			const na = a.toLowerCase();
			const nb = b.toLowerCase();
			if (a === chain) return -1;
			if (b === chain) return 1;
			if (na.startsWith(nChain)) return -1;
			if (nb.startsWith(nChain)) return 1;
			if (na < nb) return -1;
			if (na > nb) return 1;
			return 0;
		}).map(dataizeCompletion);
	}
	function findMatches(found, segs, idx, base) {
		if (Array.isArray(base)) return found;
		if (!base || typeof base !== "object") return found;
		const name = segs[idx] && segs[idx].name;
		const prev = segs[idx - 1] && segs[idx - 1].name;
		if (!name && !prev) return found;
		if (!name && prev) {
			for (const k4 in base) if (!found[k4]) found[k4] = {};
			return found;
		}
		if (!name) return found;
		if (name === "$") {
			for (const k1 in base) if (k1[0] === "$") {
				if (!found[k1]) found[k1] = {};
			}
			return found;
		}
		if (name.length < 5) {
			const lcname = name.toLowerCase();
			for (const k2 in base) if (k2.slice(0, lcname.length).toLowerCase() === lcname) {
				if (!found[k2]) found[k2] = {};
				findMatches(found[k2], segs, idx + 1, base[k2]);
			}
			return found;
		}
		for (const k3 in base) {
			if (fsm(name, k3) < MATCH_WEIGHTS.INJECTABLES) continue;
			if (!found[k3]) found[k3] = {};
			findMatches(found[k3], segs, idx + 1, base[k3]);
		}
		return found;
	}
	function dataizeCompletion(completion) {
		return { name: completion };
	}
	function chooseTarget(candidate, existing) {
		if (!existing) return candidate;
		if (existing.type === "Identifier" && candidate.type === "MemberExpression") return candidate;
		if (existing.type === "MemberExpression" && candidate.type === "Identifier") return existing;
		return candidate;
	}
	/**
	* @function parseExpression
	* @description Given an expression string, parse it and return a summary about it, including
	* tokens, params, as well as any warnings/errors that need to be displayed to the coder.
	*/
	function parseExpression(expr, injectables, keywords, state, cursor, options) {
		if (!options) options = {};
		try {
			const warnings = [];
			const cst = PARSER._parseAst(expr);
			let tokens$2 = PARSER._processTokens(cst, expr);
			tokens$2 = tokens$2.slice(8);
			tokens$2.splice(tokens$2.length - 4);
			const candidates = [];
			const declarations = {};
			const references = [];
			walk(cst, { enter: function enter(node) {
				if (cursor) {
					if (!node.sourceCode && node.loc) {
						if (node.loc.start.line === node.loc.end.line) {
							if (node.loc.start.line === cursor.line) {
								if (node.loc.start.column <= cursor.ch && node.loc.end.column >= cursor.ch) {
									if (node.type === "MemberExpression" || node.type === "Identifier") candidates.push(node);
								}
							}
						}
					}
				}
				if (node.type === "VariableDeclaration") for (let i$1 = 0; i$1 < node.declarations.length; i$1++) {
					const declarator = node.declarations[i$1];
					if (declarator.id.type === "Identifier") declarations[declarator.id.name] = true;
					else if (declarator.id.type === "ObjectPattern") for (let j = 0; j < declarator.id.properties.length; j++) declarations[declarator.id.properties[j].key.name] = true;
				}
				if (node.type === "Identifier" && node.name) references.push(node);
			} });
			let target = null;
			for (let i$1 = 0; i$1 < candidates.length; i$1++) target = chooseTarget(candidates[i$1], target);
			for (let j = references.length - 1; j > -1; j--) if (declarations[references[j].name]) references.splice(j, 1);
			let params = [];
			if (references.length > 0) references.forEach((reference) => {
				if (FORBIDDEN_EXPRESSION_TOKENS[reference.name]) return null;
				if (!injectables[reference.name]) return null;
				params.push(reference.name);
			});
			params = uniq(params);
			let completions;
			if (target && (target.type === "Identifier" || target.type === "MemberExpression")) completions = populateCompletions(target, injectables, keywords, declarations);
			else completions = [];
			const tokenInvalidity = isTokenStreamInvalid(tokens$2, options);
			if (tokenInvalidity) warnings.push(tokenInvalidity);
			return {
				cst,
				tokens: tokens$2,
				declarations,
				references,
				params,
				warnings,
				completions,
				target,
				source: expr
			};
		} catch (error) {
			logger$19.warn("[parse expression]", error.message);
			return { error };
		}
	}
	parseExpression.wrap = wrap;
	parseExpression.unwrap = unwrap;
	module.exports = parseExpression;
}) });

//#endregion
//#region src/ast/reifyOAST.js
var require_reifyOAST = /* @__PURE__ */ __commonJS({ "src/ast/reifyOAST.js": ((exports, module) => {
	const OASTToRO = require_OASTToRO();
	const reifyRO$2 = require("@haiku/core/lib/reflection/reifyRO").default;
	function reifyOAST(oast, referenceEvaluator, skipFunctionReification) {
		return reifyRO$2(OASTToRO(oast), referenceEvaluator, skipFunctionReification);
	}
	module.exports = reifyOAST;
}) });

//#endregion
//#region src/ast/remapSource.js
var require_remapSource = /* @__PURE__ */ __commonJS({ "src/ast/remapSource.js": ((exports, module) => {
	const generateCode = require_generateCode();
	const parseCode$1 = require_parseCode();
	const traverseAST = require_traverseAST();
	function remapSource$1(source, remapper) {
		if (!remapper) return source;
		const ast = parseCode$1(source);
		traverseAST(ast, (node) => {
			if (node.type === "ImportDeclaration") {
				if (node.source && node.source.type === "StringLiteral") node.source.value = remapper(node.source.value);
			} else if (node.type === "CallExpression") {
				if (node.callee && node.callee.type === "Identifier" && node.callee.name === "require") {
					const dep = node.arguments[0];
					if (dep && dep.type === "StringLiteral") dep.value = remapper(dep.value);
					else if (dep.type === "TemplateLiteral") {
						const part = dep.quasis[0];
						if (part && part.value) part.value.raw = remapper(part.value.raw);
					}
				}
			}
		});
		return generateCode(ast);
	}
	module.exports = remapSource$1;
}) });

//#endregion
//#region src/utils/CryptoUtils.js
var require_CryptoUtils = /* @__PURE__ */ __commonJS({ "src/utils/CryptoUtils.js": ((exports, module) => {
	const CryptoJs = require("crypto-js");
	const realSha256 = require("crypto-js/sha256");
	function aesDecrypt(str, passcode) {
		return CryptoJs.AES.decrypt(str, passcode).toString(CryptoJs.enc.Utf8);
	}
	function aesEncrypt(str, passcode) {
		return CryptoJs.AES.encrypt(str, passcode).toString();
	}
	function safeJsonStringify(objToStringify, maybeReplacer, maybeSpacing) {
		try {
			return JSON.stringify(objToStringify, maybeReplacer, maybeSpacing);
		} catch (exception) {
			return null;
		}
	}
	function sha256(input) {
		const jsonStr = safeJsonStringify(input);
		if (!jsonStr) return null;
		return realSha256(jsonStr).toString();
	}
	module.exports = {
		aesEncrypt,
		aesDecrypt,
		sha256
	};
}) });

//#endregion
//#region src/utils/EmitterManager.js
var require_EmitterManager = /* @__PURE__ */ __commonJS({ "src/utils/EmitterManager.js": ((exports, module) => {
	const { EventEmitter: EventEmitter$5 } = require("node:events");
	if (process.env.NODE_ENV === "staging" || process.env.NODE_ENV === "production") EventEmitter$5.prototype._maxListeners = Infinity;
	else EventEmitter$5.prototype._maxListeners = 500;
	/**
	* @class EmitterManager
	* @description For classes that are both emitters and which listen to emitters.
	* Intended to help manage large arrays of event emitters and abstract some complexity.
	*/
	var EmitterManager$2 = class {
		constructor() {
			this._emitters = [];
		}
		addEmitterListener(eventEmitter, eventName, eventHandler, options) {
			this._emitters.push([
				eventEmitter,
				eventName,
				eventHandler
			]);
			if (eventEmitter.on) eventEmitter.on(eventName, eventHandler);
			else if (eventEmitter.addEventListener) eventEmitter.addEventListener(eventName, eventHandler, options);
		}
		addEmitterListenerIfNotAlreadyRegistered(eventEmitter, eventName, eventHandler) {
			if (!eventEmitter._emitterManagerListenersRegistered) eventEmitter._emitterManagerListenersRegistered = {};
			if (!eventEmitter._emitterManagerListenersRegistered[eventName]) {
				eventEmitter._emitterManagerListenersRegistered[eventName] = eventHandler;
				this.addEmitterListener(eventEmitter, eventName, eventHandler);
			}
		}
		removeEmitterListeners() {
			this._emitters.forEach((tuple) => {
				tuple[0].removeListener(tuple[1], tuple[2]);
			});
		}
	};
	EmitterManager$2.extend = (instance) => {
		const emitterManager = new EmitterManager$2();
		Object.getOwnPropertyNames(EmitterManager$2.prototype).forEach((propertyName) => {
			if (propertyName === "constructor") return;
			const foundProperty = emitterManager[propertyName];
			if (typeof foundProperty === "function") instance[propertyName] = foundProperty.bind(emitterManager);
		});
		return instance;
	};
	module.exports = EmitterManager$2;
}) });

//#endregion
//#region src/bll/Cache.js
var require_Cache = /* @__PURE__ */ __commonJS({ "src/bll/Cache.js": ((exports, module) => {
	var Cache$3 = class {
		constructor(data = {}) {
			this.data = data;
		}
		reset(data = {}) {
			this.data = data;
		}
		clear() {
			this.data = {};
		}
		get(key) {
			return this.data[key];
		}
		set(key, value) {
			this.data[key] = value;
		}
		unset(key) {
			this.data[key] = void 0;
		}
		fetch(key, provider, postproc) {
			const found = this.get(key);
			if (found !== void 0) return postproc ? postproc(found) : found;
			const given = provider();
			this.set(key, given);
			return postproc ? postproc(given) : given;
		}
		async(key, provider, cb, postproc) {
			const found = this.get(key);
			if (found !== void 0) return cb(null, postproc ? postproc(found) : found);
			return provider((err, given) => {
				if (err) return cb(err);
				this.set(key, given);
				return cb(null, postproc ? postproc(given) : given);
			});
		}
	};
	module.exports = Cache$3;
}) });

//#endregion
//#region src/bll/storage/DiskStorage.js
var require_DiskStorage = /* @__PURE__ */ __commonJS({ "src/bll/storage/DiskStorage.js": ((exports, module) => {
	const path$17 = require("node:path");
	const fse$7 = require("haiku-fs-extra");
	const { HOMEDIR_MODEL_STORAGE_PATH } = require_HaikuHomeDir();
	fse$7.mkdirpSync(HOMEDIR_MODEL_STORAGE_PATH);
	var DiskStorage$2 = class {
		store(key, pojo) {
			fse$7.writeJsonSync(path$17.join(HOMEDIR_MODEL_STORAGE_PATH, `${key}.json`), pojo, { spaces: 2 });
			return pojo;
		}
		unstore(key) {
			return fse$7.readJsonSync(path$17.join(HOMEDIR_MODEL_STORAGE_PATH, `${key}.json`));
		}
	};
	module.exports = DiskStorage$2;
}) });

//#endregion
//#region src/bll/storage/MemoryStorage.js
var require_MemoryStorage = /* @__PURE__ */ __commonJS({ "src/bll/storage/MemoryStorage.js": ((exports, module) => {
	var MemoryStorage$2 = class MemoryStorage$2 {
		store(key, pojo) {
			MemoryStorage$2.data[key] = pojo;
			return pojo;
		}
		unstore(key) {
			return MemoryStorage$2.data[key];
		}
	};
	MemoryStorage$2.data = {};
	module.exports = MemoryStorage$2;
}) });

//#endregion
//#region src/bll/BaseModel.js
var require_BaseModel = /* @__PURE__ */ __commonJS({ "src/bll/BaseModel.js": ((exports, module) => {
	const { EventEmitter: EventEmitter$4 } = require("node:events");
	const lodash$6 = require("lodash");
	const CryptoUtils$3 = require_CryptoUtils();
	const EmitterManager$1 = require_EmitterManager();
	const logger$18 = require_LoggerInstance();
	const Cache$2 = require_Cache();
	const DiskStorage$1 = require_DiskStorage();
	const MemoryStorage$1 = require_MemoryStorage();
	const expressionToRO$4 = require("@haiku/core/lib/reflection/expressionToRO").default;
	const reifyRO$1 = require("@haiku/core/lib/reflection/reifyRO").default;
	const SYNC_DEBOUNCE_TIME = 100;
	/**
	* @class BaseModel
	* @description
	*  Base model class from which all entities in haiku-serializationbll inherit.
	*  (Note: This author does not care if we call these models "BLL" entities or not;
	*  the point is that these are extremely useful; call them 'Snogglegorks' if you want.)
	*
	*  Here's what BaseModel provides:
	*    - Upsert functionality (reuse objects with the same uid)
	*     - Event emitter API for cross-entity communication
	*    - Model collection querying (Model.where, Model.find, etc.)
	*    - Built-in caching API
	*    - Handles object creation/destruction and updating the collection
	*
	*  Every instance of a subclass of BaseModel has a uid which is used to determine whether
	*  to create a new instance or return an existing instance when MyClass.upsert({}) is called.
	*  It's up to the caller to provide a uid appropriate to the model.
	*
	*  Author's note:
	*
	*  This collection of models has begun with some mixed responsibilities, including:
	*    - Dealing with view-related logic (view-model layer)
	*    - Serialization and writing to disk (DAL)
	*    - Communication transport app views (transport layer)
	*    - App business logic (BLL)
	*
	*  But keep in mind we can refactor these models to fit those divisions as we go. #TODO
	*  (Keep in mind that ALL of this logic used to live buried deep in a quagmire
	*  of tangled React-specific UI logic that had become almost impossible to work with.)
	*/
	var BaseModel$26 = class BaseModel$26 extends EventEmitter$4 {
		constructor(props, opts) {
			super();
			EmitterManager$1.extend(this);
			if (!this.constructor.extended) throw new Error(`You must call BaseModel.extend(${this.constructor.name})`);
			if (!this.options) this.options = {};
			this.setOptions(opts);
			if (!this.options.validationOff) {
				if (this.options.required) {
					for (const requirement in this.options.required) if (props[requirement] === void 0) throw new Error(`Property '${requirement}' is required`);
				}
			}
			this.__sync = false;
			this.syncDebounced = lodash$6.debounce(() => {
				this.sync();
			}, SYNC_DEBOUNCE_TIME);
			this.parent = null;
			this.children = [];
			this.cache = new Cache$2();
			this.assign(props);
			if (!this.getPrimaryKey()) this.setPrimaryKey(this.generateUniqueId());
			this.__storage = "mem";
			this.__updated = Date.now();
			this.__checked = Date.now() - 1;
			this.__initialized = Date.now();
			this.__marked = false;
			this.__destroyed = null;
			this._updateReceivers = {};
			if (this.afterInitialize) this.afterInitialize();
			this.__sync = true;
			this.constructor.add(this);
		}
		/**
		* This method returns a teardown function that decommissions the update receiver provided in its second argument as
		* a callback.
		*
		* IMPORTANT: Always call the teardown function when the entity is expected not to go out of scope but the update
		* receiver is.
		*
		* @param source
		* @param cb
		* @returns {function()}
		*/
		registerUpdateReceiver(source, cb) {
			if (typeof cb !== "function") return () => {};
			this._updateReceivers[source] = cb;
			return () => {
				delete this._updateReceivers[source];
			};
		}
		notifyUpdateReceivers(what) {
			Object.keys(this._updateReceivers).forEach((receiver) => {
				this._updateReceivers[receiver](what);
			});
		}
		emit(...args) {
			super.emit.call(this, ...args);
			this.constructor.emit(args[0], this, ...args.slice(1));
		}
		mark() {
			this.__marked = true;
			return true;
		}
		sweep() {
			if (this.__marked) {
				this.destroy();
				return true;
			}
			return false;
		}
		generateUniqueId() {
			return lodash$6.uniqueId(this.constructor.name);
		}
		forceUpdate() {
			this.setUpdateTimestamp();
			this.cache.clear();
			return this;
		}
		setUpdateTimestamp() {
			this.__updated = Date.now();
			return this;
		}
		getUpdateTimestamp() {
			return this.__updated;
		}
		getClassName() {
			return this.constructor.name;
		}
		getPrimaryKeyShort() {
			const parts = this.getPrimaryKey().split(":");
			return parts[parts.length - 1];
		}
		getPrimaryKey() {
			return this[this.constructor.config.primaryKey];
		}
		getKeySHA() {
			return CryptoUtils$3.sha256(`${this.getClassName()}-${this.getPrimaryKey()}`);
		}
		toString() {
			return this.getPrimaryKey();
		}
		setPrimaryKey(value) {
			this[this.constructor.config.primaryKey] = value;
			return this;
		}
		setOptions(opts) {
			Object.assign(this.options, this.constructor.DEFAULT_OPTIONS, opts);
		}
		assign(props) {
			if (props) {
				for (const key in props) if (props[key] !== void 0) this.set(key, props[key]);
			}
			this.cache.clear();
			this.setUpdateTimestamp();
			return this;
		}
		set(key, value) {
			this[key] = value;
			this.syncDebounced();
		}
		destroy() {
			this.removeFromParent();
			this.constructor.remove(this);
			this.constructor.clearCaches();
			this.__destroyed = Date.now();
			this.syncDebounced();
		}
		isDestroyed() {
			return !!this.__destroyed;
		}
		hasAll(criteria) {
			if (!criteria) return true;
			for (const key in criteria) if (criteria[key] !== this[key]) return false;
			return true;
		}
		hasAny(criteria) {
			for (const key in criteria) if (criteria[key] === this[key]) return true;
			return false;
		}
		insertChild(entity) {
			const found = [];
			this.children.forEach((child, index) => {
				if (child && (child === entity || child.getPrimaryKey() === entity.getPrimaryKey())) found.push({
					child,
					index
				});
			});
			if (found.length > 0) found.forEach(({ child, index }) => {
				this.children.splice(index, 1, entity);
				if (child !== entity) child.destroy();
			});
			else this.children.push(entity);
			entity.parent = this;
		}
		removeChild(entity) {
			if (!this.children) return;
			for (let i$1 = this.children.length - 1; i$1 >= 0; i$1--) if (this.children[i$1] === entity || this.children[i$1].getPrimaryKey() === entity.getPrimaryKey()) this.children.splice(i$1, 1);
		}
		removeFromParent() {
			if (this.parent) this.parent.removeChild(this);
		}
		/**
		* @method off
		* @description Synonymous with removeListener; removes an event listener
		* @param channel {String} Channel to subscribe to
		* @param fn {Function} Handler function to remove
		*/
		off(channel, fn) {
			return this.removeListener(channel, fn);
		}
		assertStorable() {
			if (!this.constructor.toPOJO) throw new Error(`BaseModel subclass must implement 'toPOJO'`);
			if (!this.constructor.fromPOJO) throw new Error(`BaseModel subclass must implement 'fromPOJO'`);
			if (!BaseModel$26.storage) throw new Error(`BaseModel has no 'storage' configured`);
			if (!this.getStorage()) throw new Error(`BaseModel has no '${this.getStorageType()} storage' configured`);
		}
		getStorageType() {
			return this.__storage;
		}
		setStorageType(type) {
			if (!BaseModel$26.storage[type]) throw new Error(`BaseModel has no storage module '${type}'`);
			this.__storage = type;
		}
		getStorageModule() {
			return BaseModel$26.storage[this.getStorageType()];
		}
		store() {
			this.assertStorable();
			const pojo = this.constructor.toPOJO(this);
			const key = `${this.getClassName()}-${this.getKeySHA()}`;
			return this.getStorageModule().store(key, pojo);
		}
		unstore() {
			this.assertStorable();
			const key = `${this.getClassName()}-${this.getKeySHA()}`;
			const pojo = this.getStorageModule().unstore(key);
			if (pojo) this.constructor.fromPOJO(pojo);
		}
		sync() {
			if (!BaseModel$26.__sync || !this.__sync || !this.synchronize) return;
			this.synchronize(Object.assign(this.getWireReadyPayload(), {
				name: "remote-model:receive-sync",
				syncIntent: this.isDestroyed() ? BaseModel$26.SYNC_INTENTS.destroy : BaseModel$26.SYNC_INTENTS.upsert
			}));
		}
		getWireReadyPayload() {
			return {
				className: this.getClassName(),
				primaryKey: this.getPrimaryKey(),
				objectAttributes: this.getWireReadyObjectAttributes()
			};
		}
		getWireReadyObjectAttributes() {
			return BaseModel$26.getWireReadyObjectAttributes(this, true, true);
		}
	};
	BaseModel$26.SYNC_INTENTS = {
		upsert: "upsert",
		destroy: "destroy"
	};
	BaseModel$26.__sync = false;
	BaseModel$26.receiveSync = ({ syncIntent, className, primaryKey, objectAttributes }) => {
		if (!BaseModel$26.__sync) {
			logger$18.warn(`BaseModel sync not ready to ${syncIntent} ${className} ${primaryKey}`);
			return;
		}
		if (!BaseModel$26.SYNC_INTENTS[syncIntent]) throw new Error(`BaseModel sync intent invalid; cannot receive`);
		let instance;
		switch (syncIntent) {
			case BaseModel$26.SYNC_INTENTS.upsert:
				instance = BaseModel$26.upsertFromWireObjectAttributes({
					className,
					primaryKey,
					objectAttributes
				});
				if (instance) instance.emit("local-model:handle-sync", { syncIntent });
				else logger$18.warn(`BaseModel sync could not ${syncIntent} ${className} ${primaryKey}`);
				break;
			case BaseModel$26.SYNC_INTENTS.destroy:
				instance = BaseModel$26.instanceFromModelSpec({
					className,
					primaryKey
				});
				if (instance) {
					instance.destroy();
					instance.emit("local-model:handle-sync", { syncIntent });
				} else logger$18.warn(`BaseModel sync could not ${syncIntent} ${className} ${primaryKey}`);
				break;
		}
	};
	BaseModel$26.upsertFromWireObjectAttributes = ({ className, primaryKey, objectAttributes }) => {
		const klass = BaseModel$26.getModelClassByClassName(className);
		if (!klass) return;
		const upsertSpec = {};
		for (const attrKey in objectAttributes) {
			const attrVal = objectAttributes[attrKey];
			if (attrVal && attrVal.__model) {
				upsertSpec[attrKey] = BaseModel$26.instanceFromModelSpec(attrVal.__model);
				continue;
			}
			upsertSpec[attrKey] = reifyRO$1(attrVal);
		}
		upsertSpec[klass.config.primaryKey] = primaryKey;
		return klass.upsert(upsertSpec, { validationOff: true });
	};
	BaseModel$26.instanceFromModelSpec = ({ className, primaryKey }) => {
		const klass = BaseModel$26.getModelClassByClassName(className);
		return klass && klass.findById(primaryKey);
	};
	BaseModel$26.getWireReadyObjectAttributes = (obj, isBase = false, goDeep = false) => {
		if (typeof obj === "boolean" || typeof obj === "number" || typeof obj === "string" || typeof obj === "function" || !obj) return expressionToRO$4(obj);
		if (goDeep) {
			if (Array.isArray(obj)) return obj.map(BaseModel$26.getWireReadyObjectAttributes);
			const out$1 = {};
			for (const key in obj) if (obj.hasOwnProperty(key)) {
				if (!RESERVED_PROPERTY_KEYS[key] && obj.constructor.config.primaryKey !== key) {
					const result = BaseModel$26.getWireReadyObjectAttributes(obj[key], false, false);
					if (result !== void 0) out$1[key] = result;
				}
			}
			return out$1;
		}
		if (obj instanceof BaseModel$26 && !goDeep) return { __model: {
			className: obj.getClassName(),
			primaryKey: obj.getPrimaryKey()
		} };
	};
	const RESERVED_PROPERTY_KEYS = {
		__checked: true,
		__destroyed: true,
		__initialized: true,
		__marked: true,
		__proxy: true,
		__storage: true,
		__sync: true,
		__updated: true,
		_events: true,
		_eventsCount: true,
		_maxListeners: true,
		_updateReceivers: true,
		addEmitterListener: true,
		addEmitterListenerIfNotAlreadyRegistered: true,
		cache: true,
		children: true,
		options: true,
		parent: true,
		removeEmitterListeners: true,
		synchronize: true,
		sync: true,
		syncDebounced: true,
		uid: true
	};
	BaseModel$26.DEFAULT_OPTIONS = {};
	BaseModel$26.storage = {
		mem: new MemoryStorage$1(),
		disk: new DiskStorage$1()
	};
	BaseModel$26.extensions = [];
	BaseModel$26.extend = function extend(klass, opts) {
		if (!klass.extended) {
			createCollection(klass, opts);
			klass.emitter = new EventEmitter$4();
			klass.emit = klass.emitter.emit.bind(klass.emitter);
			klass.on = klass.emitter.on.bind(klass.emitter);
			lodash$6.defaults(klass.DEFAULT_OPTIONS, BaseModel$26.DEFAULT_OPTIONS);
			klass.extended = true;
			BaseModel$26.extensions.push(klass);
		}
	};
	const KNOWN_MODEL_CLASSES = {};
	BaseModel$26.getModelClassByClassName = (className) => {
		return KNOWN_MODEL_CLASSES[className];
	};
	function createCollection(klass, opts) {
		KNOWN_MODEL_CLASSES[klass.name] = klass;
		klass.config = { primaryKey: "uid" };
		Object.assign(klass.config, opts);
		const arrayCollection = [];
		const hashmapCollection = {};
		klass.idx = (instance) => {
			for (let i$1 = 0; i$1 < arrayCollection.length; i$1++) if (arrayCollection[i$1] === instance) return i$1;
			return -1;
		};
		klass.setInstancePrimaryKey = (instance, primaryKey) => {
			if (klass.has(instance)) {
				delete hashmapCollection[instance.getPrimaryKey()];
				instance.setPrimaryKey(primaryKey);
				hashmapCollection[instance.getPrimaryKey()] = instance;
			}
		};
		klass.get = (instance) => {
			return hashmapCollection[instance.getPrimaryKey()] || null;
		};
		klass.has = (instance) => hashmapCollection[instance.getPrimaryKey()] !== void 0;
		klass.add = (instance) => {
			if (!klass.has(instance)) {
				arrayCollection.push(instance);
				hashmapCollection[instance.getPrimaryKey()] = instance;
			}
		};
		klass.remove = (instance) => {
			const idx = klass.idx(instance);
			if (idx !== -1) arrayCollection.splice(idx, 1);
			delete hashmapCollection[instance.getPrimaryKey()];
		};
		klass.all = () => arrayCollection;
		klass.count = () => klass.all().length;
		klass.filter = (iteratee) => klass.all().filter(iteratee);
		klass.where = (criteria) => {
			return klass.filter((instance) => instance.hasAll(criteria));
		};
		klass.any = (criteria) => {
			return klass.filter((instance) => instance.hasAll(criteria));
		};
		klass.find = (criteria) => {
			const found = klass.where(criteria);
			return found && found[0];
		};
		klass.findById = (id$1) => hashmapCollection[id$1];
		klass.create = (props, opts$1) => new klass(props, opts$1);
		klass.upsert = (props, opts$1) => {
			klass.clearCaches();
			const primaryKey = props[klass.config.primaryKey];
			const found = klass.findById(primaryKey);
			if (found) {
				found.assign(props);
				found.setOptions(opts$1);
				found.__initialized = Date.now();
				found.__marked = false;
				if (found.afterInitialize) found.afterInitialize();
				return found;
			}
			return klass.create(props, opts$1);
		};
		klass.clearCaches = () => {
			arrayCollection.forEach((item) => {
				item.cache.clear();
			});
		};
		klass.sweep = () => {
			arrayCollection.forEach((item) => {
				item.sweep();
			});
		};
		klass.purge = () => {
			while (arrayCollection.length > 0) arrayCollection[0].destroy();
		};
	}
	module.exports = BaseModel$26;
}) });

//#endregion
//#region src/bll/Lock.js
var require_Lock = /* @__PURE__ */ __commonJS({ "src/bll/Lock.js": ((exports, module) => {
	const { EventEmitter: EventEmitter$3 } = require("node:events");
	const ACTIVE_LOCKS = {};
	const LOCKS = {
		ActiveComponentWork: "ActiveComponentWork",
		ActiveComponentReload: "ActiveComponentReload",
		FilePerformComponentWork: "FilePerformComponentWork",
		FileReadWrite: (abspath) => {
			return `FileReadWrite:${abspath}`;
		},
		ProjectMethodHandler: "ProjectMethodHandler",
		ActionStackUndoRedo: "ActionStackUndoRedo",
		SetCurrentActiveComponent: "SetCurrentActiveComponent"
	};
	const emitter = new EventEmitter$3();
	function request$1(key, emit, cb) {
		if (!key) throw new Error("Lock key must be truthy");
		if (ACTIVE_LOCKS[key]) return setTimeout(() => request$1(key, emit, cb), 0);
		ACTIVE_LOCKS[key] = true;
		if (emit) emitter.emit("lock-on", key);
		const release = () => {
			if (emit) emitter.emit("lock-off", key);
			ACTIVE_LOCKS[key] = false;
		};
		return cb(release);
	}
	function awaitFree(keys$1, cb) {
		let anyLocked = false;
		keys$1.forEach((key) => {
			if (ACTIVE_LOCKS[key]) anyLocked = true;
		});
		if (anyLocked) return setTimeout(() => awaitFree(keys$1, cb), 100);
		return cb();
	}
	const awaitAllLocksFree = (cb) => awaitFree(Object.keys(ACTIVE_LOCKS), cb);
	function awaitAllLocksFreeExcept(keys$1, cb) {
		return awaitFree(Object.keys(ACTIVE_LOCKS).filter((key) => !keys$1.includes(key)), cb);
	}
	module.exports = {
		request: request$1,
		emitter,
		awaitFree,
		awaitAllLocksFree,
		awaitAllLocksFreeExcept,
		LOCKS,
		ACTIVE_LOCKS
	};
}) });

//#endregion
//#region src/bll/ActionStack.js
var require_ActionStack = /* @__PURE__ */ __commonJS({ "src/bll/ActionStack.js": ((exports, module) => {
	const { Experiment: Experiment$7, experimentIsEnabled: experimentIsEnabled$7 } = require("haiku-common");
	const lodash$5 = require("lodash");
	const logger$17 = require_LoggerInstance();
	const BaseModel$25 = require_BaseModel();
	const Lock$5 = require_Lock();
	const TIMER_TIMEOUT = 64;
	const PROPERTY_GROUP_ACCUMULATION_TIME = 500;
	const MAX_UNDOABLES_LEN = 50;
	const SNAPSHOTTED_UNDOABLES = {
		groupElements: true,
		ungroupElements: true,
		popBytecodeSnapshot: true,
		updateKeyframesAndTypes: true
	};
	const ACCUMULATORS = { updateKeyframes: (params, match) => {
		const updates1 = match.params[2];
		const updates2 = params[2];
		for (const timelineName in updates2) {
			if (!updates1[timelineName]) updates1[timelineName] = {};
			for (const componentId in updates2[timelineName]) {
				if (!updates1[timelineName][componentId]) updates1[timelineName][componentId] = {};
				for (const propertyName in updates2[timelineName][componentId]) {
					if (!updates1[timelineName][componentId][propertyName]) updates1[timelineName][componentId][propertyName] = {};
					for (const keyframeMs in updates2[timelineName][componentId][propertyName]) updates1[timelineName][componentId][propertyName][keyframeMs] = updates2[timelineName][componentId][propertyName][keyframeMs];
				}
			}
		}
	} };
	const INVERTER_ACCUMULATORS = { updateKeyframes: (baseInverter, newInverter) => {
		const basis1 = baseInverter.params[1];
		const basis2 = newInverter.params[1];
		for (const timelineName in basis2) {
			if (!basis1[timelineName]) basis1[timelineName] = {};
			for (const componentId in basis2[timelineName]) {
				if (!basis1[timelineName][componentId]) basis1[timelineName][componentId] = {};
				for (const propertyName in basis2[timelineName][componentId]) {
					if (!basis1[timelineName][componentId][propertyName]) basis1[timelineName][componentId][propertyName] = {};
					for (const keyframeMs in basis2[timelineName][componentId][propertyName]) {
						if (basis1[timelineName][componentId][propertyName][keyframeMs] !== void 0) continue;
						basis1[timelineName][componentId][propertyName][keyframeMs] = basis2[timelineName][componentId][propertyName][keyframeMs];
					}
				}
			}
		}
	} };
	const shouldAccumulate = (method, params) => ACCUMULATORS[method] && !params[params.length - 2].cursor;
	/**
	* @class ActionStack
	* @description
	*   Manages queue of actions for a host Project object.
	*   Encapsulates...:
	*     - enqueuing actions and preserving order
	*     - batching together rapid requests
	*     - handling undo/redo
	*
	*   Use caution when changing this.
	*
	*   If you change anything here, keep in mind the following constraints:
	*     - rapid actions on stage (like dragging) need to be instantaneous
	*     - snapshotting data (e.g. for undo) should not cause perceptible lag or jank
	*     - actions should be equivalent across processes (or we'll get crashes)
	*/
	var ActionStack$2 = class ActionStack$2 extends BaseModel$25 {
		constructor(props, opts) {
			super(props, opts);
			this.resetData();
			this.processActions();
		}
		/**
		* @method reset
		* @description Because Creator and Master are long-lived, there needs to be
		* a mechanism to explicitly clear the in-memory content when the project is
		* closed and then reopened again, otherwise it will have stale data from
		* the previous project editing session.
		*/
		resetData() {
			this.stopped = false;
			this.undoables = [];
			this.redoables = [];
			this.actions = [];
			this.accumulatorTimeouts = {};
			this.accumulatedInverters = {};
			this.actionStackIndices = {
				glass: 0,
				timeline: 0,
				creator: 0,
				master: 0
			};
		}
		stop() {
			this.stopped = true;
		}
		processActions() {
			const action = this.actions[0];
			if (!action) return this.stopped ? null : setTimeout(() => this.processActions(), TIMER_TIMEOUT);
			delete this.accumulatorTimeouts[action.method];
			if (shouldAccumulate(action.method, action.params)) {
				if (action.timestamp && Date.now() - action.timestamp < PROPERTY_GROUP_ACCUMULATION_TIME) {
					this.accumulatorTimeouts[action.method] = setTimeout(() => this.processActions(), TIMER_TIMEOUT);
					return;
				}
			}
			this.shiftAndProcessLatestAction();
		}
		forceAccumulation() {
			for (const method in this.accumulatorTimeouts) {
				clearTimeout(this.accumulatorTimeouts[method]);
				delete this.accumulatorTimeouts[method];
				this.shiftAndProcessLatestAction();
			}
		}
		shiftAndProcessLatestAction() {
			const action = this.actions.shift();
			if (action) this.processAction(action);
			else this.processActions();
		}
		processAction(action) {
			const { method, params, before } = action;
			if (before) before();
			return this.emit("next", method, params, () => this.processActions());
		}
		enqueueAction(method, params, before) {
			if (shouldAccumulate(method, params)) for (let i$1 = this.actions.length - 1; i$1 >= 0; i$1--) {
				const action = this.actions[i$1];
				if (action.method === method && action.params[0] === params[0] && action.params[1] === params[1]) {
					ACCUMULATORS[method](params, action);
					action.timestamp = Date.now();
					return;
				}
			}
			this.actions.push({
				timestamp: Date.now(),
				method,
				params,
				before
			});
			if (this.actions.length < 2 && !shouldAccumulate(method, params)) this.shiftAndProcessLatestAction();
		}
		addDoable(doable, stack) {
			stack.push(doable);
			if (stack.length > MAX_UNDOABLES_LEN) stack.shift();
			this.project.emit("update", "updateMenu");
		}
		addUndoable(undoable, ac) {
			this.addDoable(Object.assign(undoable, { ac }), this.undoables);
		}
		addRedoable(redoable, ac) {
			this.addDoable(Object.assign(redoable, { ac }), this.redoables);
		}
		popDoable(stack, ac) {
			if (!ac) return stack.pop();
			const last = stack[stack.length - 1];
			if (last && !last.ac) return stack.pop();
			for (let i$1 = stack.length - 1; i$1 >= 0; i$1--) if (stack[i$1].ac === ac) return stack.splice(i$1, 1)[0];
			return null;
		}
		popUndoable(ac) {
			return this.popDoable(this.undoables, ac);
		}
		popRedoable(ac) {
			return this.popDoable(this.redoables, ac);
		}
		getUndoables() {
			return this.undoables;
		}
		getRedoables() {
			return this.redoables;
		}
		buildMethodInverterAction(ac, method, params, metadata, when, output) {
			if (ActionStack$2.METHOD_INVERTERS[method] && ActionStack$2.METHOD_INVERTERS[method][when]) {
				const inversion = ActionStack$2.METHOD_INVERTERS[method][when].call(this, ac, params.slice(1), output);
				if (inversion) {
					const [relpath] = params;
					inversion.params.unshift(relpath);
					inversion.params.push(metadata);
					if (when === "before" && INVERTER_ACCUMULATORS[method]) if (this.accumulatedInverters[method]) INVERTER_ACCUMULATORS[method](this.accumulatedInverters[method], inversion);
					else this.accumulatedInverters[method] = inversion;
				}
				return inversion;
			}
			return null;
		}
		shouldOrderRemoteUpdate(metadata) {
			return experimentIsEnabled$7(Experiment$7.OrderedActionStack) && metadata.hasOwnProperty("actionStackIndex") && this.project.isRemoteRequest(metadata);
		}
		advanceActionStackIndexForMetadata(metadata) {
			this.actionStackIndices[metadata.from]++;
		}
		orderedAction(method, metadata, cb) {
			if (this.shouldOrderRemoteUpdate(metadata)) {
				if (this.actionStackIndices[metadata.from] !== metadata.actionStackIndex) {
					logger$17.info(`[action stack] received out-of-order ${method}; deferring until other actions complete`);
					logger$17.info(`[action stack] requested index: ${metadata.actionStackIndex}`);
					logger$17.info(`[action stack] current index: ${this.actionStackIndices[metadata.from]}`);
					return setTimeout(() => {
						this.orderedAction(method, metadata, cb);
					}, TIMER_TIMEOUT);
				}
				this.advanceActionStackIndexForMetadata(metadata);
				return cb();
			}
			return cb();
		}
		handleActionInitiation(method, params, metadata, continuation) {
			if (this.project.isRemoteRequest(metadata)) {
				if (metadata.cursor === ActionStack$2.CURSOR_MODES.redo) this.popUndoable(this.project.getCurrentActiveComponent());
				else if (metadata.cursor === ActionStack$2.CURSOR_MODES.undo) this.popRedoable(this.project.getCurrentActiveComponent());
			}
			const ac = typeof params[0] === "string" ? this.project.findActiveComponentBySourceIfPresent(params[0]) : null;
			const finish = (inverter) => this.orderedAction(method, metadata, () => continuation((err, out$1) => {
				if (err) return;
				if (!inverter) inverter = this.buildMethodInverterAction(ac, method, params, metadata, "after", out$1);
				else delete this.accumulatedInverters[method];
				let did = false;
				if (inverter) {
					if (!metadata.cursor) {
						did = true;
						this.redoables.length = 0;
						this.addUndoable(inverter, ac);
					} else if (metadata.cursor === ActionStack$2.CURSOR_MODES.undo) {
						did = true;
						this.addUndoable(inverter, ac);
					} else if (metadata.cursor === ActionStack$2.CURSOR_MODES.redo) {
						did = true;
						this.addRedoable(inverter, ac);
					}
					if (did) logger$17.info(`[action stack] inversion :::`, metadata.cursor, inverter.method, this.getUndoables().length, "<~u|r~>", this.getRedoables().length);
				}
			}));
			if (SNAPSHOTTED_UNDOABLES[method]) return ac.pushBytecodeSnapshot(() => finish({
				method: ac.popBytecodeSnapshot.name,
				params: [params[0], metadata]
			}));
			return finish(this.buildMethodInverterAction(ac, method, params, metadata, "before"));
		}
		undo(options, metadata, cb) {
			this.forceAccumulation();
			if (this.getUndoables().length < 1) return cb();
			logger$17.info(`[action stack] undo (us=${this.getUndoables().length})`);
			return Lock$5.request(Lock$5.LOCKS.ActionStackUndoRedo, false, (release) => {
				const undoable = this.popUndoable(this.project.getCurrentActiveComponent());
				if (!undoable) {
					release();
					return cb();
				}
				const { method, params, ac } = undoable;
				if (!ac) {
					release();
					return cb();
				}
				const metadata$1 = lodash$5.assign({}, params.pop(), {
					cursor: "redo",
					from: this.project.getAlias()
				});
				params.push(metadata$1);
				return ac[method](...params.slice(1), (err, out$1) => {
					release();
					return cb(err, out$1);
				});
			});
		}
		redo(options, metadata, cb) {
			this.forceAccumulation();
			if (this.getRedoables().length < 1) return cb();
			logger$17.info(`[action stack] redo (rs=${this.getRedoables().length})`);
			return Lock$5.request(Lock$5.LOCKS.ActionStackUndoRedo, false, (release) => {
				const redoable = this.popRedoable(this.project.getCurrentActiveComponent());
				if (!redoable) {
					release();
					return cb();
				}
				const { method, params, ac } = redoable;
				if (!ac) {
					release();
					return cb();
				}
				const metadata$1 = lodash$5.assign({}, params.pop(), {
					cursor: "undo",
					from: this.project.getAlias()
				});
				params.push(metadata$1);
				return ac[method](...params.slice(1), (err, out$1) => {
					release();
					return cb(err, out$1);
				});
			});
		}
	};
	ActionStack$2.DEFAULT_OPTIONS = { required: {
		uid: true,
		project: true
	} };
	BaseModel$25.extend(ActionStack$2);
	/**
	* Translate the parameters of a method into the method signature of
	* a command that would perfectly invert the method.
	* These functions are called with the Project object as the this-binding.
	* Returning falsy indicates that the method cannot be inverted (undone).
	* These are called _before_ the method is invoked, so you can access the data
	* in the ActiveComponent object prior to the data mutation.
	*/
	ActionStack$2.METHOD_INVERTERS = {
		conglomerateComponent: { before: (ac, [componentIds, name, size, translation, coords, propertiesSerial, options]) => ({
			method: ac.unconglomerateComponent.name,
			params: [
				componentIds,
				name,
				size,
				translation,
				coords,
				propertiesSerial,
				options
			]
		}) },
		unconglomerateComponent: { before: (ac, [componentIds, name, size, translation, coords, propertiesSerial, options]) => ({
			method: ac.conglomerateComponent.name,
			params: [
				componentIds,
				name,
				size,
				translation,
				coords,
				propertiesSerial,
				options
			]
		}) },
		updateKeyframes: { before: (ac, [keyframeUpdates]) => {
			const previousUpdates = ac.snapshotKeyframeUpdates(keyframeUpdates);
			return {
				method: ac.updateKeyframes.name,
				params: [previousUpdates, {}]
			};
		} },
		moveKeyframes: { before: (ac, [keyframeMoves]) => {
			const previousMoves = ac.snapshotKeyframeMoves(keyframeMoves);
			return {
				method: ac.moveKeyframes.name,
				params: [previousMoves]
			};
		} },
		instantiateComponent: { after: (ac, [modpath, coords], output) => {
			if (output) return {
				method: ac.deleteComponents.name,
				params: [[output.attributes["haiku-id"]]]
			};
		} },
		deleteComponents: { before: (ac, [haikuIds]) => ({
			method: ac.pasteThings.name,
			params: [haikuIds.map((haikuId) => ac.findElementByComponentId(haikuId)).filter((element) => !!element).map((element) => element.clip()), { skipHashPadding: true }]
		}) },
		pasteThings: { after: (ac, _$2, { haikuIds }) => {
			return {
				method: ac.deleteComponents.name,
				params: [haikuIds]
			};
		} },
		changeKeyframeValue: { before: (ac, [componentId, timelineName, propertyName, keyframeMs, newValue]) => {
			const oldValue = ac.getKeyframeValue(componentId, timelineName, keyframeMs, propertyName);
			return {
				method: ac.changeKeyframeValue.name,
				params: [
					componentId,
					timelineName,
					propertyName,
					keyframeMs,
					oldValue
				]
			};
		} },
		changeSegmentCurve: { before: (ac, [componentId, timelineName, propertyName, keyframeMs, newCurve]) => {
			const oldCurve = ac.getKeyframeCurve(componentId, timelineName, keyframeMs, propertyName);
			return {
				method: ac.changeSegmentCurve.name,
				params: [
					componentId,
					timelineName,
					propertyName,
					keyframeMs,
					oldCurve
				]
			};
		} },
		createKeyframe: { before: (ac, [componentId, timelineName, elementName, propertyName, keyframeStartMs, keyframeValue, keyframeCurve, keyframeEndMs, keyframeEndValue]) => {
			const oldValue = ac.getKeyframeValue(componentId, timelineName, keyframeStartMs, propertyName);
			const oldCurve = ac.getKeyframeCurve(componentId, timelineName, keyframeStartMs, propertyName);
			if (oldValue !== void 0) return {
				method: ac.createKeyframe.name,
				params: [
					componentId,
					timelineName,
					elementName,
					propertyName,
					keyframeStartMs,
					oldValue,
					oldCurve,
					null,
					null,
					null
				]
			};
			return {
				method: ac.deleteKeyframe.name,
				params: [
					componentId,
					timelineName,
					propertyName,
					keyframeStartMs
				]
			};
		} },
		deleteKeyframe: { before: (ac, [componentId, timelineName, propertyName, keyframeMs]) => {
			const elementName = ac.getSafeElementNameOfComponentId(componentId);
			const oldValue = ac.getKeyframeValue(componentId, timelineName, keyframeMs, propertyName);
			const oldCurve = ac.getKeyframeCurve(componentId, timelineName, keyframeMs, propertyName);
			return {
				method: ac.createKeyframe.name,
				params: [
					componentId,
					timelineName,
					elementName,
					propertyName,
					keyframeMs,
					oldValue,
					oldCurve,
					null,
					null,
					null
				]
			};
		} },
		joinKeyframes: { before: (ac, [componentId, timelineName, elementName, propertyName, keyframeMsLeft, keyframeMsRight, newCurve]) => {
			return {
				method: ac.splitSegment.name,
				params: [
					componentId,
					timelineName,
					elementName,
					propertyName,
					keyframeMsLeft
				]
			};
		} },
		splitSegment: { before: (ac, [componentId, timelineName, elementName, propertyName, keyframeMs]) => {
			const oldCurve = ac.getKeyframeCurve(componentId, timelineName, keyframeMs, propertyName);
			return {
				method: ac.joinKeyframes.name,
				params: [
					componentId,
					timelineName,
					elementName,
					propertyName,
					keyframeMs,
					null,
					oldCurve
				]
			};
		} },
		upsertStateValue: { before: (ac, [stateName, stateDescriptor]) => {
			const previousDescriptor = lodash$5.clone(ac.getStateDescriptor(stateName));
			if (!previousDescriptor) return {
				method: ac.deleteStateValue.name,
				params: [stateName]
			};
			return {
				method: ac.upsertStateValue.name,
				params: [stateName, previousDescriptor]
			};
		} },
		deleteStateValue: { before: (ac, [stateName]) => {
			const previousDescriptor = lodash$5.clone(ac.getStateDescriptor(stateName));
			return {
				method: ac.upsertStateValue.name,
				params: [stateName, previousDescriptor]
			};
		} },
		zMoveToFront: { before: (ac, [componentId, timelineName, timelineTime]) => {
			const moves = ac.gatherZIndexKeyframeMoves(timelineName);
			return {
				method: ac.moveKeyframes.name,
				params: [moves]
			};
		} },
		zMoveForward: { before: (ac, [componentId, timelineName, timelineTime]) => {
			const moves = ac.gatherZIndexKeyframeMoves(timelineName);
			return {
				method: ac.moveKeyframes.name,
				params: [moves]
			};
		} },
		zMoveBackward: { before: (ac, [componentId, timelineName, timelineTime]) => {
			const moves = ac.gatherZIndexKeyframeMoves(timelineName);
			return {
				method: ac.moveKeyframes.name,
				params: [moves]
			};
		} },
		zMoveToBack: { before: (ac, [componentId, timelineName, timelineTime]) => {
			const moves = ac.gatherZIndexKeyframeMoves(timelineName);
			return {
				method: ac.moveKeyframes.name,
				params: [moves]
			};
		} },
		zShiftIndices: { before: (ac, [componentId, timelineName, timelineTime, newIndex]) => {
			const moves = ac.gatherZIndexKeyframeMoves(timelineName);
			return {
				method: ac.moveKeyframes.name,
				params: [moves]
			};
		} },
		setTitleForComponent: { after: (ac, [componentId], oldTitle) => ({
			method: ac.setTitleForComponent.name,
			params: [componentId, oldTitle]
		}) }
	};
	ActionStack$2.CURSOR_MODES = {
		undo: "undo",
		redo: "redo"
	};
	ActionStack$2.toPOJO = (instance) => {
		return {
			uid: instance.uid,
			stopped: instance.stopped,
			undoables: instance.undoables,
			redoables: instance.redoables,
			actions: instance.actions
		};
	};
	ActionStack$2.fromPOJO = (pojo) => {
		return ActionStack$2.upsert(pojo, {});
	};
	module.exports = ActionStack$2;
}) });

//#endregion
//#region src/utils/ensureTrailingSlash.js
var require_ensureTrailingSlash = /* @__PURE__ */ __commonJS({ "src/utils/ensureTrailingSlash.js": ((exports, module) => {
	module.exports = (str) => {
		return str[str.length - 1] === "/" ? str : `${str}/`;
	};
}) });

//#endregion
//#region src/bll/helpers/toTitleCase.js
var require_toTitleCase = /* @__PURE__ */ __commonJS({ "src/bll/helpers/toTitleCase.js": ((exports, module) => {
	module.exports = function toTitleCase$4(str) {
		return `${str}`.split(/[^A-Z0-9]/i).join(" ").replace(/\w\S*/g, (txt) => {
			return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
		});
	};
}) });

//#endregion
//#region src/bll/TransformCache.js
var require_TransformCache = /* @__PURE__ */ __commonJS({ "src/bll/TransformCache.js": ((exports, module) => {
	var TransformCache$3 = class {
		constructor(host) {
			this.host = host;
			this.cache = {};
		}
		/**
		* @method set
		* @description
		*   Tracks the current transform, allowing values to be recalled on demand.
		*
		*   Use-case:
		*      - shift-dragging an element needs to keep track of the element's
		*        position at the moment of mouse-click, then until the next
		*        drag begins. In order to do this, the pre-drag position
		*        of that element needs to be tracked. Other drawing tool
		*        logic should be able to piggyback on this
		*      - alt-dragging to duplicate an element
		*/
		set(key) {
			const transform = this.host.getComputedLayout();
			if (this.host.getOriginOffsetComposedMatrix) transform.originOffsetComposedMatrix = this.host.getOriginOffsetComposedMatrix();
			this.cache[key] = transform;
		}
		get(key) {
			return this.cache[key];
		}
	};
	module.exports = TransformCache$3;
}) });

//#endregion
//#region ../../node_modules/.pnpm/lodash.clone@4.5.0/node_modules/lodash.clone/index.js
var require_lodash = /* @__PURE__ */ __commonJS({ "../../node_modules/.pnpm/lodash.clone@4.5.0/node_modules/lodash.clone/index.js": ((exports, module) => {
	/**
	* lodash (Custom Build) <https://lodash.com/>
	* Build: `lodash modularize exports="npm" -o ./`
	* Copyright jQuery Foundation and other contributors <https://jquery.org/>
	* Released under MIT license <https://lodash.com/license>
	* Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
	* Copyright Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
	*/
	/** Used as the size to enable large array optimizations. */
	var LARGE_ARRAY_SIZE = 200;
	/** Used to stand-in for `undefined` hash values. */
	var HASH_UNDEFINED = "__lodash_hash_undefined__";
	/** Used as references for various `Number` constants. */
	var MAX_SAFE_INTEGER$1 = 9007199254740991;
	/** `Object#toString` result references. */
	var argsTag = "[object Arguments]", arrayTag = "[object Array]", boolTag = "[object Boolean]", dateTag = "[object Date]", errorTag = "[object Error]", funcTag = "[object Function]", genTag = "[object GeneratorFunction]", mapTag = "[object Map]", numberTag = "[object Number]", objectTag = "[object Object]", promiseTag = "[object Promise]", regexpTag = "[object RegExp]", setTag = "[object Set]", stringTag = "[object String]", symbolTag = "[object Symbol]", weakMapTag = "[object WeakMap]";
	var arrayBufferTag = "[object ArrayBuffer]", dataViewTag = "[object DataView]", float32Tag = "[object Float32Array]", float64Tag = "[object Float64Array]", int8Tag = "[object Int8Array]", int16Tag = "[object Int16Array]", int32Tag = "[object Int32Array]", uint8Tag = "[object Uint8Array]", uint8ClampedTag = "[object Uint8ClampedArray]", uint16Tag = "[object Uint16Array]", uint32Tag = "[object Uint32Array]";
	/**
	* Used to match `RegExp`
	* [syntax characters](http://ecma-international.org/ecma-262/7.0/#sec-patterns).
	*/
	var reRegExpChar = /[\\^$.*+?()[\]{}|]/g;
	/** Used to match `RegExp` flags from their coerced string values. */
	var reFlags = /\w*$/;
	/** Used to detect host constructors (Safari). */
	var reIsHostCtor = /^\[object .+?Constructor\]$/;
	/** Used to detect unsigned integer values. */
	var reIsUint = /^(?:0|[1-9]\d*)$/;
	/** Used to identify `toStringTag` values supported by `_.clone`. */
	var cloneableTags = {};
	cloneableTags[argsTag] = cloneableTags[arrayTag] = cloneableTags[arrayBufferTag] = cloneableTags[dataViewTag] = cloneableTags[boolTag] = cloneableTags[dateTag] = cloneableTags[float32Tag] = cloneableTags[float64Tag] = cloneableTags[int8Tag] = cloneableTags[int16Tag] = cloneableTags[int32Tag] = cloneableTags[mapTag] = cloneableTags[numberTag] = cloneableTags[objectTag] = cloneableTags[regexpTag] = cloneableTags[setTag] = cloneableTags[stringTag] = cloneableTags[symbolTag] = cloneableTags[uint8Tag] = cloneableTags[uint8ClampedTag] = cloneableTags[uint16Tag] = cloneableTags[uint32Tag] = true;
	cloneableTags[errorTag] = cloneableTags[funcTag] = cloneableTags[weakMapTag] = false;
	/** Detect free variable `global` from Node.js. */
	var freeGlobal = typeof global == "object" && global && global.Object === Object && global;
	/** Detect free variable `self`. */
	var freeSelf = typeof self == "object" && self && self.Object === Object && self;
	/** Used as a reference to the global object. */
	var root = freeGlobal || freeSelf || Function("return this")();
	/** Detect free variable `exports`. */
	var freeExports = typeof exports == "object" && exports && !exports.nodeType && exports;
	/** Detect free variable `module`. */
	var freeModule = freeExports && typeof module == "object" && module && !module.nodeType && module;
	/** Detect the popular CommonJS extension `module.exports`. */
	var moduleExports = freeModule && freeModule.exports === freeExports;
	/**
	* Adds the key-value `pair` to `map`.
	*
	* @private
	* @param {Object} map The map to modify.
	* @param {Array} pair The key-value pair to add.
	* @returns {Object} Returns `map`.
	*/
	function addMapEntry(map, pair) {
		map.set(pair[0], pair[1]);
		return map;
	}
	/**
	* Adds `value` to `set`.
	*
	* @private
	* @param {Object} set The set to modify.
	* @param {*} value The value to add.
	* @returns {Object} Returns `set`.
	*/
	function addSetEntry(set, value) {
		set.add(value);
		return set;
	}
	/**
	* A specialized version of `_.forEach` for arrays without support for
	* iteratee shorthands.
	*
	* @private
	* @param {Array} [array] The array to iterate over.
	* @param {Function} iteratee The function invoked per iteration.
	* @returns {Array} Returns `array`.
	*/
	function arrayEach(array, iteratee) {
		var index = -1, length = array ? array.length : 0;
		while (++index < length) if (iteratee(array[index], index, array) === false) break;
		return array;
	}
	/**
	* Appends the elements of `values` to `array`.
	*
	* @private
	* @param {Array} array The array to modify.
	* @param {Array} values The values to append.
	* @returns {Array} Returns `array`.
	*/
	function arrayPush(array, values) {
		var index = -1, length = values.length, offset = array.length;
		while (++index < length) array[offset + index] = values[index];
		return array;
	}
	/**
	* A specialized version of `_.reduce` for arrays without support for
	* iteratee shorthands.
	*
	* @private
	* @param {Array} [array] The array to iterate over.
	* @param {Function} iteratee The function invoked per iteration.
	* @param {*} [accumulator] The initial value.
	* @param {boolean} [initAccum] Specify using the first element of `array` as
	*  the initial value.
	* @returns {*} Returns the accumulated value.
	*/
	function arrayReduce(array, iteratee, accumulator, initAccum) {
		var index = -1, length = array ? array.length : 0;
		if (initAccum && length) accumulator = array[++index];
		while (++index < length) accumulator = iteratee(accumulator, array[index], index, array);
		return accumulator;
	}
	/**
	* The base implementation of `_.times` without support for iteratee shorthands
	* or max array length checks.
	*
	* @private
	* @param {number} n The number of times to invoke `iteratee`.
	* @param {Function} iteratee The function invoked per iteration.
	* @returns {Array} Returns the array of results.
	*/
	function baseTimes(n, iteratee) {
		var index = -1, result = Array(n);
		while (++index < n) result[index] = iteratee(index);
		return result;
	}
	/**
	* Gets the value at `key` of `object`.
	*
	* @private
	* @param {Object} [object] The object to query.
	* @param {string} key The key of the property to get.
	* @returns {*} Returns the property value.
	*/
	function getValue(object, key) {
		return object == null ? void 0 : object[key];
	}
	/**
	* Checks if `value` is a host object in IE < 9.
	*
	* @private
	* @param {*} value The value to check.
	* @returns {boolean} Returns `true` if `value` is a host object, else `false`.
	*/
	function isHostObject(value) {
		var result = false;
		if (value != null && typeof value.toString != "function") try {
			result = !!(value + "");
		} catch (e) {}
		return result;
	}
	/**
	* Converts `map` to its key-value pairs.
	*
	* @private
	* @param {Object} map The map to convert.
	* @returns {Array} Returns the key-value pairs.
	*/
	function mapToArray(map) {
		var index = -1, result = Array(map.size);
		map.forEach(function(value, key) {
			result[++index] = [key, value];
		});
		return result;
	}
	/**
	* Creates a unary function that invokes `func` with its argument transformed.
	*
	* @private
	* @param {Function} func The function to wrap.
	* @param {Function} transform The argument transform.
	* @returns {Function} Returns the new function.
	*/
	function overArg(func, transform) {
		return function(arg) {
			return func(transform(arg));
		};
	}
	/**
	* Converts `set` to an array of its values.
	*
	* @private
	* @param {Object} set The set to convert.
	* @returns {Array} Returns the values.
	*/
	function setToArray(set) {
		var index = -1, result = Array(set.size);
		set.forEach(function(value) {
			result[++index] = value;
		});
		return result;
	}
	/** Used for built-in method references. */
	var arrayProto = Array.prototype, funcProto = Function.prototype, objectProto = Object.prototype;
	/** Used to detect overreaching core-js shims. */
	var coreJsData = root["__core-js_shared__"];
	/** Used to detect methods masquerading as native. */
	var maskSrcKey = function() {
		var uid = /[^.]+$/.exec(coreJsData && coreJsData.keys && coreJsData.keys.IE_PROTO || "");
		return uid ? "Symbol(src)_1." + uid : "";
	}();
	/** Used to resolve the decompiled source of functions. */
	var funcToString = funcProto.toString;
	/** Used to check objects for own properties. */
	var hasOwnProperty = objectProto.hasOwnProperty;
	/**
	* Used to resolve the
	* [`toStringTag`](http://ecma-international.org/ecma-262/7.0/#sec-object.prototype.tostring)
	* of values.
	*/
	var objectToString = objectProto.toString;
	/** Used to detect if a method is native. */
	var reIsNative = RegExp("^" + funcToString.call(hasOwnProperty).replace(reRegExpChar, "\\$&").replace(/hasOwnProperty|(function).*?(?=\\\()| for .+?(?=\\\])/g, "$1.*?") + "$");
	/** Built-in value references. */
	var Buffer$8 = moduleExports ? root.Buffer : void 0, Symbol$1 = root.Symbol, Uint8Array$1 = root.Uint8Array, getPrototype = overArg(Object.getPrototypeOf, Object), objectCreate = Object.create, propertyIsEnumerable = objectProto.propertyIsEnumerable, splice = arrayProto.splice;
	var nativeGetSymbols = Object.getOwnPropertySymbols, nativeIsBuffer = Buffer$8 ? Buffer$8.isBuffer : void 0, nativeKeys = overArg(Object.keys, Object);
	var DataView = getNative(root, "DataView"), Map$1 = getNative(root, "Map"), Promise$1 = getNative(root, "Promise"), Set$1 = getNative(root, "Set"), WeakMap = getNative(root, "WeakMap"), nativeCreate = getNative(Object, "create");
	/** Used to detect maps, sets, and weakmaps. */
	var dataViewCtorString = toSource(DataView), mapCtorString = toSource(Map$1), promiseCtorString = toSource(Promise$1), setCtorString = toSource(Set$1), weakMapCtorString = toSource(WeakMap);
	/** Used to convert symbols to primitives and strings. */
	var symbolProto = Symbol$1 ? Symbol$1.prototype : void 0, symbolValueOf = symbolProto ? symbolProto.valueOf : void 0;
	/**
	* Creates a hash object.
	*
	* @private
	* @constructor
	* @param {Array} [entries] The key-value pairs to cache.
	*/
	function Hash(entries) {
		var index = -1, length = entries ? entries.length : 0;
		this.clear();
		while (++index < length) {
			var entry = entries[index];
			this.set(entry[0], entry[1]);
		}
	}
	/**
	* Removes all key-value entries from the hash.
	*
	* @private
	* @name clear
	* @memberOf Hash
	*/
	function hashClear() {
		this.__data__ = nativeCreate ? nativeCreate(null) : {};
	}
	/**
	* Removes `key` and its value from the hash.
	*
	* @private
	* @name delete
	* @memberOf Hash
	* @param {Object} hash The hash to modify.
	* @param {string} key The key of the value to remove.
	* @returns {boolean} Returns `true` if the entry was removed, else `false`.
	*/
	function hashDelete(key) {
		return this.has(key) && delete this.__data__[key];
	}
	/**
	* Gets the hash value for `key`.
	*
	* @private
	* @name get
	* @memberOf Hash
	* @param {string} key The key of the value to get.
	* @returns {*} Returns the entry value.
	*/
	function hashGet(key) {
		var data = this.__data__;
		if (nativeCreate) {
			var result = data[key];
			return result === HASH_UNDEFINED ? void 0 : result;
		}
		return hasOwnProperty.call(data, key) ? data[key] : void 0;
	}
	/**
	* Checks if a hash value for `key` exists.
	*
	* @private
	* @name has
	* @memberOf Hash
	* @param {string} key The key of the entry to check.
	* @returns {boolean} Returns `true` if an entry for `key` exists, else `false`.
	*/
	function hashHas(key) {
		var data = this.__data__;
		return nativeCreate ? data[key] !== void 0 : hasOwnProperty.call(data, key);
	}
	/**
	* Sets the hash `key` to `value`.
	*
	* @private
	* @name set
	* @memberOf Hash
	* @param {string} key The key of the value to set.
	* @param {*} value The value to set.
	* @returns {Object} Returns the hash instance.
	*/
	function hashSet(key, value) {
		var data = this.__data__;
		data[key] = nativeCreate && value === void 0 ? HASH_UNDEFINED : value;
		return this;
	}
	Hash.prototype.clear = hashClear;
	Hash.prototype["delete"] = hashDelete;
	Hash.prototype.get = hashGet;
	Hash.prototype.has = hashHas;
	Hash.prototype.set = hashSet;
	/**
	* Creates an list cache object.
	*
	* @private
	* @constructor
	* @param {Array} [entries] The key-value pairs to cache.
	*/
	function ListCache(entries) {
		var index = -1, length = entries ? entries.length : 0;
		this.clear();
		while (++index < length) {
			var entry = entries[index];
			this.set(entry[0], entry[1]);
		}
	}
	/**
	* Removes all key-value entries from the list cache.
	*
	* @private
	* @name clear
	* @memberOf ListCache
	*/
	function listCacheClear() {
		this.__data__ = [];
	}
	/**
	* Removes `key` and its value from the list cache.
	*
	* @private
	* @name delete
	* @memberOf ListCache
	* @param {string} key The key of the value to remove.
	* @returns {boolean} Returns `true` if the entry was removed, else `false`.
	*/
	function listCacheDelete(key) {
		var data = this.__data__, index = assocIndexOf(data, key);
		if (index < 0) return false;
		if (index == data.length - 1) data.pop();
		else splice.call(data, index, 1);
		return true;
	}
	/**
	* Gets the list cache value for `key`.
	*
	* @private
	* @name get
	* @memberOf ListCache
	* @param {string} key The key of the value to get.
	* @returns {*} Returns the entry value.
	*/
	function listCacheGet(key) {
		var data = this.__data__, index = assocIndexOf(data, key);
		return index < 0 ? void 0 : data[index][1];
	}
	/**
	* Checks if a list cache value for `key` exists.
	*
	* @private
	* @name has
	* @memberOf ListCache
	* @param {string} key The key of the entry to check.
	* @returns {boolean} Returns `true` if an entry for `key` exists, else `false`.
	*/
	function listCacheHas(key) {
		return assocIndexOf(this.__data__, key) > -1;
	}
	/**
	* Sets the list cache `key` to `value`.
	*
	* @private
	* @name set
	* @memberOf ListCache
	* @param {string} key The key of the value to set.
	* @param {*} value The value to set.
	* @returns {Object} Returns the list cache instance.
	*/
	function listCacheSet(key, value) {
		var data = this.__data__, index = assocIndexOf(data, key);
		if (index < 0) data.push([key, value]);
		else data[index][1] = value;
		return this;
	}
	ListCache.prototype.clear = listCacheClear;
	ListCache.prototype["delete"] = listCacheDelete;
	ListCache.prototype.get = listCacheGet;
	ListCache.prototype.has = listCacheHas;
	ListCache.prototype.set = listCacheSet;
	/**
	* Creates a map cache object to store key-value pairs.
	*
	* @private
	* @constructor
	* @param {Array} [entries] The key-value pairs to cache.
	*/
	function MapCache(entries) {
		var index = -1, length = entries ? entries.length : 0;
		this.clear();
		while (++index < length) {
			var entry = entries[index];
			this.set(entry[0], entry[1]);
		}
	}
	/**
	* Removes all key-value entries from the map.
	*
	* @private
	* @name clear
	* @memberOf MapCache
	*/
	function mapCacheClear() {
		this.__data__ = {
			"hash": new Hash(),
			"map": new (Map$1 || ListCache)(),
			"string": new Hash()
		};
	}
	/**
	* Removes `key` and its value from the map.
	*
	* @private
	* @name delete
	* @memberOf MapCache
	* @param {string} key The key of the value to remove.
	* @returns {boolean} Returns `true` if the entry was removed, else `false`.
	*/
	function mapCacheDelete(key) {
		return getMapData(this, key)["delete"](key);
	}
	/**
	* Gets the map value for `key`.
	*
	* @private
	* @name get
	* @memberOf MapCache
	* @param {string} key The key of the value to get.
	* @returns {*} Returns the entry value.
	*/
	function mapCacheGet(key) {
		return getMapData(this, key).get(key);
	}
	/**
	* Checks if a map value for `key` exists.
	*
	* @private
	* @name has
	* @memberOf MapCache
	* @param {string} key The key of the entry to check.
	* @returns {boolean} Returns `true` if an entry for `key` exists, else `false`.
	*/
	function mapCacheHas(key) {
		return getMapData(this, key).has(key);
	}
	/**
	* Sets the map `key` to `value`.
	*
	* @private
	* @name set
	* @memberOf MapCache
	* @param {string} key The key of the value to set.
	* @param {*} value The value to set.
	* @returns {Object} Returns the map cache instance.
	*/
	function mapCacheSet(key, value) {
		getMapData(this, key).set(key, value);
		return this;
	}
	MapCache.prototype.clear = mapCacheClear;
	MapCache.prototype["delete"] = mapCacheDelete;
	MapCache.prototype.get = mapCacheGet;
	MapCache.prototype.has = mapCacheHas;
	MapCache.prototype.set = mapCacheSet;
	/**
	* Creates a stack cache object to store key-value pairs.
	*
	* @private
	* @constructor
	* @param {Array} [entries] The key-value pairs to cache.
	*/
	function Stack(entries) {
		this.__data__ = new ListCache(entries);
	}
	/**
	* Removes all key-value entries from the stack.
	*
	* @private
	* @name clear
	* @memberOf Stack
	*/
	function stackClear() {
		this.__data__ = new ListCache();
	}
	/**
	* Removes `key` and its value from the stack.
	*
	* @private
	* @name delete
	* @memberOf Stack
	* @param {string} key The key of the value to remove.
	* @returns {boolean} Returns `true` if the entry was removed, else `false`.
	*/
	function stackDelete(key) {
		return this.__data__["delete"](key);
	}
	/**
	* Gets the stack value for `key`.
	*
	* @private
	* @name get
	* @memberOf Stack
	* @param {string} key The key of the value to get.
	* @returns {*} Returns the entry value.
	*/
	function stackGet(key) {
		return this.__data__.get(key);
	}
	/**
	* Checks if a stack value for `key` exists.
	*
	* @private
	* @name has
	* @memberOf Stack
	* @param {string} key The key of the entry to check.
	* @returns {boolean} Returns `true` if an entry for `key` exists, else `false`.
	*/
	function stackHas(key) {
		return this.__data__.has(key);
	}
	/**
	* Sets the stack `key` to `value`.
	*
	* @private
	* @name set
	* @memberOf Stack
	* @param {string} key The key of the value to set.
	* @param {*} value The value to set.
	* @returns {Object} Returns the stack cache instance.
	*/
	function stackSet(key, value) {
		var cache = this.__data__;
		if (cache instanceof ListCache) {
			var pairs = cache.__data__;
			if (!Map$1 || pairs.length < LARGE_ARRAY_SIZE - 1) {
				pairs.push([key, value]);
				return this;
			}
			cache = this.__data__ = new MapCache(pairs);
		}
		cache.set(key, value);
		return this;
	}
	Stack.prototype.clear = stackClear;
	Stack.prototype["delete"] = stackDelete;
	Stack.prototype.get = stackGet;
	Stack.prototype.has = stackHas;
	Stack.prototype.set = stackSet;
	/**
	* Creates an array of the enumerable property names of the array-like `value`.
	*
	* @private
	* @param {*} value The value to query.
	* @param {boolean} inherited Specify returning inherited property names.
	* @returns {Array} Returns the array of property names.
	*/
	function arrayLikeKeys(value, inherited) {
		var result = isArray(value) || isArguments(value) ? baseTimes(value.length, String) : [];
		var length = result.length, skipIndexes = !!length;
		for (var key in value) if ((inherited || hasOwnProperty.call(value, key)) && !(skipIndexes && (key == "length" || isIndex(key, length)))) result.push(key);
		return result;
	}
	/**
	* Assigns `value` to `key` of `object` if the existing value is not equivalent
	* using [`SameValueZero`](http://ecma-international.org/ecma-262/7.0/#sec-samevaluezero)
	* for equality comparisons.
	*
	* @private
	* @param {Object} object The object to modify.
	* @param {string} key The key of the property to assign.
	* @param {*} value The value to assign.
	*/
	function assignValue(object, key, value) {
		var objValue = object[key];
		if (!(hasOwnProperty.call(object, key) && eq$1(objValue, value)) || value === void 0 && !(key in object)) object[key] = value;
	}
	/**
	* Gets the index at which the `key` is found in `array` of key-value pairs.
	*
	* @private
	* @param {Array} array The array to inspect.
	* @param {*} key The key to search for.
	* @returns {number} Returns the index of the matched value, else `-1`.
	*/
	function assocIndexOf(array, key) {
		var length = array.length;
		while (length--) if (eq$1(array[length][0], key)) return length;
		return -1;
	}
	/**
	* The base implementation of `_.assign` without support for multiple sources
	* or `customizer` functions.
	*
	* @private
	* @param {Object} object The destination object.
	* @param {Object} source The source object.
	* @returns {Object} Returns `object`.
	*/
	function baseAssign(object, source) {
		return object && copyObject(source, keys(source), object);
	}
	/**
	* The base implementation of `_.clone` and `_.cloneDeep` which tracks
	* traversed objects.
	*
	* @private
	* @param {*} value The value to clone.
	* @param {boolean} [isDeep] Specify a deep clone.
	* @param {boolean} [isFull] Specify a clone including symbols.
	* @param {Function} [customizer] The function to customize cloning.
	* @param {string} [key] The key of `value`.
	* @param {Object} [object] The parent object of `value`.
	* @param {Object} [stack] Tracks traversed objects and their clone counterparts.
	* @returns {*} Returns the cloned value.
	*/
	function baseClone(value, isDeep, isFull, customizer, key, object, stack) {
		var result;
		if (customizer) result = object ? customizer(value, key, object, stack) : customizer(value);
		if (result !== void 0) return result;
		if (!isObject$1(value)) return value;
		var isArr = isArray(value);
		if (isArr) {
			result = initCloneArray(value);
			if (!isDeep) return copyArray(value, result);
		} else {
			var tag = getTag(value), isFunc = tag == funcTag || tag == genTag;
			if (isBuffer(value)) return cloneBuffer(value, isDeep);
			if (tag == objectTag || tag == argsTag || isFunc && !object) {
				if (isHostObject(value)) return object ? value : {};
				result = initCloneObject(isFunc ? {} : value);
				if (!isDeep) return copySymbols(value, baseAssign(result, value));
			} else {
				if (!cloneableTags[tag]) return object ? value : {};
				result = initCloneByTag(value, tag, baseClone, isDeep);
			}
		}
		stack || (stack = new Stack());
		var stacked = stack.get(value);
		if (stacked) return stacked;
		stack.set(value, result);
		if (!isArr) var props = isFull ? getAllKeys(value) : keys(value);
		arrayEach(props || value, function(subValue, key$1) {
			if (props) {
				key$1 = subValue;
				subValue = value[key$1];
			}
			assignValue(result, key$1, baseClone(subValue, isDeep, isFull, customizer, key$1, value, stack));
		});
		return result;
	}
	/**
	* The base implementation of `_.create` without support for assigning
	* properties to the created object.
	*
	* @private
	* @param {Object} prototype The object to inherit from.
	* @returns {Object} Returns the new object.
	*/
	function baseCreate(proto) {
		return isObject$1(proto) ? objectCreate(proto) : {};
	}
	/**
	* The base implementation of `getAllKeys` and `getAllKeysIn` which uses
	* `keysFunc` and `symbolsFunc` to get the enumerable property names and
	* symbols of `object`.
	*
	* @private
	* @param {Object} object The object to query.
	* @param {Function} keysFunc The function to get the keys of `object`.
	* @param {Function} symbolsFunc The function to get the symbols of `object`.
	* @returns {Array} Returns the array of property names and symbols.
	*/
	function baseGetAllKeys(object, keysFunc, symbolsFunc) {
		var result = keysFunc(object);
		return isArray(object) ? result : arrayPush(result, symbolsFunc(object));
	}
	/**
	* The base implementation of `getTag`.
	*
	* @private
	* @param {*} value The value to query.
	* @returns {string} Returns the `toStringTag`.
	*/
	function baseGetTag(value) {
		return objectToString.call(value);
	}
	/**
	* The base implementation of `_.isNative` without bad shim checks.
	*
	* @private
	* @param {*} value The value to check.
	* @returns {boolean} Returns `true` if `value` is a native function,
	*  else `false`.
	*/
	function baseIsNative(value) {
		if (!isObject$1(value) || isMasked(value)) return false;
		return (isFunction(value) || isHostObject(value) ? reIsNative : reIsHostCtor).test(toSource(value));
	}
	/**
	* The base implementation of `_.keys` which doesn't treat sparse arrays as dense.
	*
	* @private
	* @param {Object} object The object to query.
	* @returns {Array} Returns the array of property names.
	*/
	function baseKeys(object) {
		if (!isPrototype(object)) return nativeKeys(object);
		var result = [];
		for (var key in Object(object)) if (hasOwnProperty.call(object, key) && key != "constructor") result.push(key);
		return result;
	}
	/**
	* Creates a clone of  `buffer`.
	*
	* @private
	* @param {Buffer} buffer The buffer to clone.
	* @param {boolean} [isDeep] Specify a deep clone.
	* @returns {Buffer} Returns the cloned buffer.
	*/
	function cloneBuffer(buffer$1, isDeep) {
		if (isDeep) return buffer$1.slice();
		var result = new buffer$1.constructor(buffer$1.length);
		buffer$1.copy(result);
		return result;
	}
	/**
	* Creates a clone of `arrayBuffer`.
	*
	* @private
	* @param {ArrayBuffer} arrayBuffer The array buffer to clone.
	* @returns {ArrayBuffer} Returns the cloned array buffer.
	*/
	function cloneArrayBuffer(arrayBuffer) {
		var result = new arrayBuffer.constructor(arrayBuffer.byteLength);
		new Uint8Array$1(result).set(new Uint8Array$1(arrayBuffer));
		return result;
	}
	/**
	* Creates a clone of `dataView`.
	*
	* @private
	* @param {Object} dataView The data view to clone.
	* @param {boolean} [isDeep] Specify a deep clone.
	* @returns {Object} Returns the cloned data view.
	*/
	function cloneDataView(dataView, isDeep) {
		var buffer$1 = isDeep ? cloneArrayBuffer(dataView.buffer) : dataView.buffer;
		return new dataView.constructor(buffer$1, dataView.byteOffset, dataView.byteLength);
	}
	/**
	* Creates a clone of `map`.
	*
	* @private
	* @param {Object} map The map to clone.
	* @param {Function} cloneFunc The function to clone values.
	* @param {boolean} [isDeep] Specify a deep clone.
	* @returns {Object} Returns the cloned map.
	*/
	function cloneMap(map, isDeep, cloneFunc) {
		return arrayReduce(isDeep ? cloneFunc(mapToArray(map), true) : mapToArray(map), addMapEntry, new map.constructor());
	}
	/**
	* Creates a clone of `regexp`.
	*
	* @private
	* @param {Object} regexp The regexp to clone.
	* @returns {Object} Returns the cloned regexp.
	*/
	function cloneRegExp(regexp) {
		var result = new regexp.constructor(regexp.source, reFlags.exec(regexp));
		result.lastIndex = regexp.lastIndex;
		return result;
	}
	/**
	* Creates a clone of `set`.
	*
	* @private
	* @param {Object} set The set to clone.
	* @param {Function} cloneFunc The function to clone values.
	* @param {boolean} [isDeep] Specify a deep clone.
	* @returns {Object} Returns the cloned set.
	*/
	function cloneSet(set, isDeep, cloneFunc) {
		return arrayReduce(isDeep ? cloneFunc(setToArray(set), true) : setToArray(set), addSetEntry, new set.constructor());
	}
	/**
	* Creates a clone of the `symbol` object.
	*
	* @private
	* @param {Object} symbol The symbol object to clone.
	* @returns {Object} Returns the cloned symbol object.
	*/
	function cloneSymbol(symbol) {
		return symbolValueOf ? Object(symbolValueOf.call(symbol)) : {};
	}
	/**
	* Creates a clone of `typedArray`.
	*
	* @private
	* @param {Object} typedArray The typed array to clone.
	* @param {boolean} [isDeep] Specify a deep clone.
	* @returns {Object} Returns the cloned typed array.
	*/
	function cloneTypedArray(typedArray, isDeep) {
		var buffer$1 = isDeep ? cloneArrayBuffer(typedArray.buffer) : typedArray.buffer;
		return new typedArray.constructor(buffer$1, typedArray.byteOffset, typedArray.length);
	}
	/**
	* Copies the values of `source` to `array`.
	*
	* @private
	* @param {Array} source The array to copy values from.
	* @param {Array} [array=[]] The array to copy values to.
	* @returns {Array} Returns `array`.
	*/
	function copyArray(source, array) {
		var index = -1, length = source.length;
		array || (array = Array(length));
		while (++index < length) array[index] = source[index];
		return array;
	}
	/**
	* Copies properties of `source` to `object`.
	*
	* @private
	* @param {Object} source The object to copy properties from.
	* @param {Array} props The property identifiers to copy.
	* @param {Object} [object={}] The object to copy properties to.
	* @param {Function} [customizer] The function to customize copied values.
	* @returns {Object} Returns `object`.
	*/
	function copyObject(source, props, object, customizer) {
		object || (object = {});
		var index = -1, length = props.length;
		while (++index < length) {
			var key = props[index];
			var newValue = customizer ? customizer(object[key], source[key], key, object, source) : void 0;
			assignValue(object, key, newValue === void 0 ? source[key] : newValue);
		}
		return object;
	}
	/**
	* Copies own symbol properties of `source` to `object`.
	*
	* @private
	* @param {Object} source The object to copy symbols from.
	* @param {Object} [object={}] The object to copy symbols to.
	* @returns {Object} Returns `object`.
	*/
	function copySymbols(source, object) {
		return copyObject(source, getSymbols(source), object);
	}
	/**
	* Creates an array of own enumerable property names and symbols of `object`.
	*
	* @private
	* @param {Object} object The object to query.
	* @returns {Array} Returns the array of property names and symbols.
	*/
	function getAllKeys(object) {
		return baseGetAllKeys(object, keys, getSymbols);
	}
	/**
	* Gets the data for `map`.
	*
	* @private
	* @param {Object} map The map to query.
	* @param {string} key The reference key.
	* @returns {*} Returns the map data.
	*/
	function getMapData(map, key) {
		var data = map.__data__;
		return isKeyable(key) ? data[typeof key == "string" ? "string" : "hash"] : data.map;
	}
	/**
	* Gets the native function at `key` of `object`.
	*
	* @private
	* @param {Object} object The object to query.
	* @param {string} key The key of the method to get.
	* @returns {*} Returns the function if it's native, else `undefined`.
	*/
	function getNative(object, key) {
		var value = getValue(object, key);
		return baseIsNative(value) ? value : void 0;
	}
	/**
	* Creates an array of the own enumerable symbol properties of `object`.
	*
	* @private
	* @param {Object} object The object to query.
	* @returns {Array} Returns the array of symbols.
	*/
	var getSymbols = nativeGetSymbols ? overArg(nativeGetSymbols, Object) : stubArray;
	/**
	* Gets the `toStringTag` of `value`.
	*
	* @private
	* @param {*} value The value to query.
	* @returns {string} Returns the `toStringTag`.
	*/
	var getTag = baseGetTag;
	if (DataView && getTag(new DataView(/* @__PURE__ */ new ArrayBuffer(1))) != dataViewTag || Map$1 && getTag(new Map$1()) != mapTag || Promise$1 && getTag(Promise$1.resolve()) != promiseTag || Set$1 && getTag(new Set$1()) != setTag || WeakMap && getTag(new WeakMap()) != weakMapTag) getTag = function(value) {
		var result = objectToString.call(value), Ctor = result == objectTag ? value.constructor : void 0, ctorString = Ctor ? toSource(Ctor) : void 0;
		if (ctorString) switch (ctorString) {
			case dataViewCtorString: return dataViewTag;
			case mapCtorString: return mapTag;
			case promiseCtorString: return promiseTag;
			case setCtorString: return setTag;
			case weakMapCtorString: return weakMapTag;
		}
		return result;
	};
	/**
	* Initializes an array clone.
	*
	* @private
	* @param {Array} array The array to clone.
	* @returns {Array} Returns the initialized clone.
	*/
	function initCloneArray(array) {
		var length = array.length, result = array.constructor(length);
		if (length && typeof array[0] == "string" && hasOwnProperty.call(array, "index")) {
			result.index = array.index;
			result.input = array.input;
		}
		return result;
	}
	/**
	* Initializes an object clone.
	*
	* @private
	* @param {Object} object The object to clone.
	* @returns {Object} Returns the initialized clone.
	*/
	function initCloneObject(object) {
		return typeof object.constructor == "function" && !isPrototype(object) ? baseCreate(getPrototype(object)) : {};
	}
	/**
	* Initializes an object clone based on its `toStringTag`.
	*
	* **Note:** This function only supports cloning values with tags of
	* `Boolean`, `Date`, `Error`, `Number`, `RegExp`, or `String`.
	*
	* @private
	* @param {Object} object The object to clone.
	* @param {string} tag The `toStringTag` of the object to clone.
	* @param {Function} cloneFunc The function to clone values.
	* @param {boolean} [isDeep] Specify a deep clone.
	* @returns {Object} Returns the initialized clone.
	*/
	function initCloneByTag(object, tag, cloneFunc, isDeep) {
		var Ctor = object.constructor;
		switch (tag) {
			case arrayBufferTag: return cloneArrayBuffer(object);
			case boolTag:
			case dateTag: return new Ctor(+object);
			case dataViewTag: return cloneDataView(object, isDeep);
			case float32Tag:
			case float64Tag:
			case int8Tag:
			case int16Tag:
			case int32Tag:
			case uint8Tag:
			case uint8ClampedTag:
			case uint16Tag:
			case uint32Tag: return cloneTypedArray(object, isDeep);
			case mapTag: return cloneMap(object, isDeep, cloneFunc);
			case numberTag:
			case stringTag: return new Ctor(object);
			case regexpTag: return cloneRegExp(object);
			case setTag: return cloneSet(object, isDeep, cloneFunc);
			case symbolTag: return cloneSymbol(object);
		}
	}
	/**
	* Checks if `value` is a valid array-like index.
	*
	* @private
	* @param {*} value The value to check.
	* @param {number} [length=MAX_SAFE_INTEGER] The upper bounds of a valid index.
	* @returns {boolean} Returns `true` if `value` is a valid index, else `false`.
	*/
	function isIndex(value, length) {
		length = length == null ? MAX_SAFE_INTEGER$1 : length;
		return !!length && (typeof value == "number" || reIsUint.test(value)) && value > -1 && value % 1 == 0 && value < length;
	}
	/**
	* Checks if `value` is suitable for use as unique object key.
	*
	* @private
	* @param {*} value The value to check.
	* @returns {boolean} Returns `true` if `value` is suitable, else `false`.
	*/
	function isKeyable(value) {
		var type = typeof value;
		return type == "string" || type == "number" || type == "symbol" || type == "boolean" ? value !== "__proto__" : value === null;
	}
	/**
	* Checks if `func` has its source masked.
	*
	* @private
	* @param {Function} func The function to check.
	* @returns {boolean} Returns `true` if `func` is masked, else `false`.
	*/
	function isMasked(func) {
		return !!maskSrcKey && maskSrcKey in func;
	}
	/**
	* Checks if `value` is likely a prototype object.
	*
	* @private
	* @param {*} value The value to check.
	* @returns {boolean} Returns `true` if `value` is a prototype, else `false`.
	*/
	function isPrototype(value) {
		var Ctor = value && value.constructor;
		return value === (typeof Ctor == "function" && Ctor.prototype || objectProto);
	}
	/**
	* Converts `func` to its source code.
	*
	* @private
	* @param {Function} func The function to process.
	* @returns {string} Returns the source code.
	*/
	function toSource(func) {
		if (func != null) {
			try {
				return funcToString.call(func);
			} catch (e) {}
			try {
				return func + "";
			} catch (e) {}
		}
		return "";
	}
	/**
	* Creates a shallow clone of `value`.
	*
	* **Note:** This method is loosely based on the
	* [structured clone algorithm](https://mdn.io/Structured_clone_algorithm)
	* and supports cloning arrays, array buffers, booleans, date objects, maps,
	* numbers, `Object` objects, regexes, sets, strings, symbols, and typed
	* arrays. The own enumerable properties of `arguments` objects are cloned
	* as plain objects. An empty object is returned for uncloneable values such
	* as error objects, functions, DOM nodes, and WeakMaps.
	*
	* @static
	* @memberOf _
	* @since 0.1.0
	* @category Lang
	* @param {*} value The value to clone.
	* @returns {*} Returns the cloned value.
	* @see _.cloneDeep
	* @example
	*
	* var objects = [{ 'a': 1 }, { 'b': 2 }];
	*
	* var shallow = _.clone(objects);
	* console.log(shallow[0] === objects[0]);
	* // => true
	*/
	function clone$2(value) {
		return baseClone(value, false, true);
	}
	/**
	* Performs a
	* [`SameValueZero`](http://ecma-international.org/ecma-262/7.0/#sec-samevaluezero)
	* comparison between two values to determine if they are equivalent.
	*
	* @static
	* @memberOf _
	* @since 4.0.0
	* @category Lang
	* @param {*} value The value to compare.
	* @param {*} other The other value to compare.
	* @returns {boolean} Returns `true` if the values are equivalent, else `false`.
	* @example
	*
	* var object = { 'a': 1 };
	* var other = { 'a': 1 };
	*
	* _.eq(object, object);
	* // => true
	*
	* _.eq(object, other);
	* // => false
	*
	* _.eq('a', 'a');
	* // => true
	*
	* _.eq('a', Object('a'));
	* // => false
	*
	* _.eq(NaN, NaN);
	* // => true
	*/
	function eq$1(value, other) {
		return value === other || value !== value && other !== other;
	}
	/**
	* Checks if `value` is likely an `arguments` object.
	*
	* @static
	* @memberOf _
	* @since 0.1.0
	* @category Lang
	* @param {*} value The value to check.
	* @returns {boolean} Returns `true` if `value` is an `arguments` object,
	*  else `false`.
	* @example
	*
	* _.isArguments(function() { return arguments; }());
	* // => true
	*
	* _.isArguments([1, 2, 3]);
	* // => false
	*/
	function isArguments(value) {
		return isArrayLikeObject(value) && hasOwnProperty.call(value, "callee") && (!propertyIsEnumerable.call(value, "callee") || objectToString.call(value) == argsTag);
	}
	/**
	* Checks if `value` is classified as an `Array` object.
	*
	* @static
	* @memberOf _
	* @since 0.1.0
	* @category Lang
	* @param {*} value The value to check.
	* @returns {boolean} Returns `true` if `value` is an array, else `false`.
	* @example
	*
	* _.isArray([1, 2, 3]);
	* // => true
	*
	* _.isArray(document.body.children);
	* // => false
	*
	* _.isArray('abc');
	* // => false
	*
	* _.isArray(_.noop);
	* // => false
	*/
	var isArray = Array.isArray;
	/**
	* Checks if `value` is array-like. A value is considered array-like if it's
	* not a function and has a `value.length` that's an integer greater than or
	* equal to `0` and less than or equal to `Number.MAX_SAFE_INTEGER`.
	*
	* @static
	* @memberOf _
	* @since 4.0.0
	* @category Lang
	* @param {*} value The value to check.
	* @returns {boolean} Returns `true` if `value` is array-like, else `false`.
	* @example
	*
	* _.isArrayLike([1, 2, 3]);
	* // => true
	*
	* _.isArrayLike(document.body.children);
	* // => true
	*
	* _.isArrayLike('abc');
	* // => true
	*
	* _.isArrayLike(_.noop);
	* // => false
	*/
	function isArrayLike(value) {
		return value != null && isLength(value.length) && !isFunction(value);
	}
	/**
	* This method is like `_.isArrayLike` except that it also checks if `value`
	* is an object.
	*
	* @static
	* @memberOf _
	* @since 4.0.0
	* @category Lang
	* @param {*} value The value to check.
	* @returns {boolean} Returns `true` if `value` is an array-like object,
	*  else `false`.
	* @example
	*
	* _.isArrayLikeObject([1, 2, 3]);
	* // => true
	*
	* _.isArrayLikeObject(document.body.children);
	* // => true
	*
	* _.isArrayLikeObject('abc');
	* // => false
	*
	* _.isArrayLikeObject(_.noop);
	* // => false
	*/
	function isArrayLikeObject(value) {
		return isObjectLike(value) && isArrayLike(value);
	}
	/**
	* Checks if `value` is a buffer.
	*
	* @static
	* @memberOf _
	* @since 4.3.0
	* @category Lang
	* @param {*} value The value to check.
	* @returns {boolean} Returns `true` if `value` is a buffer, else `false`.
	* @example
	*
	* _.isBuffer(new Buffer(2));
	* // => true
	*
	* _.isBuffer(new Uint8Array(2));
	* // => false
	*/
	var isBuffer = nativeIsBuffer || stubFalse;
	/**
	* Checks if `value` is classified as a `Function` object.
	*
	* @static
	* @memberOf _
	* @since 0.1.0
	* @category Lang
	* @param {*} value The value to check.
	* @returns {boolean} Returns `true` if `value` is a function, else `false`.
	* @example
	*
	* _.isFunction(_);
	* // => true
	*
	* _.isFunction(/abc/);
	* // => false
	*/
	function isFunction(value) {
		var tag = isObject$1(value) ? objectToString.call(value) : "";
		return tag == funcTag || tag == genTag;
	}
	/**
	* Checks if `value` is a valid array-like length.
	*
	* **Note:** This method is loosely based on
	* [`ToLength`](http://ecma-international.org/ecma-262/7.0/#sec-tolength).
	*
	* @static
	* @memberOf _
	* @since 4.0.0
	* @category Lang
	* @param {*} value The value to check.
	* @returns {boolean} Returns `true` if `value` is a valid length, else `false`.
	* @example
	*
	* _.isLength(3);
	* // => true
	*
	* _.isLength(Number.MIN_VALUE);
	* // => false
	*
	* _.isLength(Infinity);
	* // => false
	*
	* _.isLength('3');
	* // => false
	*/
	function isLength(value) {
		return typeof value == "number" && value > -1 && value % 1 == 0 && value <= MAX_SAFE_INTEGER$1;
	}
	/**
	* Checks if `value` is the
	* [language type](http://www.ecma-international.org/ecma-262/7.0/#sec-ecmascript-language-types)
	* of `Object`. (e.g. arrays, functions, objects, regexes, `new Number(0)`, and `new String('')`)
	*
	* @static
	* @memberOf _
	* @since 0.1.0
	* @category Lang
	* @param {*} value The value to check.
	* @returns {boolean} Returns `true` if `value` is an object, else `false`.
	* @example
	*
	* _.isObject({});
	* // => true
	*
	* _.isObject([1, 2, 3]);
	* // => true
	*
	* _.isObject(_.noop);
	* // => true
	*
	* _.isObject(null);
	* // => false
	*/
	function isObject$1(value) {
		var type = typeof value;
		return !!value && (type == "object" || type == "function");
	}
	/**
	* Checks if `value` is object-like. A value is object-like if it's not `null`
	* and has a `typeof` result of "object".
	*
	* @static
	* @memberOf _
	* @since 4.0.0
	* @category Lang
	* @param {*} value The value to check.
	* @returns {boolean} Returns `true` if `value` is object-like, else `false`.
	* @example
	*
	* _.isObjectLike({});
	* // => true
	*
	* _.isObjectLike([1, 2, 3]);
	* // => true
	*
	* _.isObjectLike(_.noop);
	* // => false
	*
	* _.isObjectLike(null);
	* // => false
	*/
	function isObjectLike(value) {
		return !!value && typeof value == "object";
	}
	/**
	* Creates an array of the own enumerable property names of `object`.
	*
	* **Note:** Non-object values are coerced to objects. See the
	* [ES spec](http://ecma-international.org/ecma-262/7.0/#sec-object.keys)
	* for more details.
	*
	* @static
	* @since 0.1.0
	* @memberOf _
	* @category Object
	* @param {Object} object The object to query.
	* @returns {Array} Returns the array of property names.
	* @example
	*
	* function Foo() {
	*   this.a = 1;
	*   this.b = 2;
	* }
	*
	* Foo.prototype.c = 3;
	*
	* _.keys(new Foo);
	* // => ['a', 'b'] (iteration order is not guaranteed)
	*
	* _.keys('hi');
	* // => ['0', '1']
	*/
	function keys(object) {
		return isArrayLike(object) ? arrayLikeKeys(object) : baseKeys(object);
	}
	/**
	* This method returns a new empty array.
	*
	* @static
	* @memberOf _
	* @since 4.13.0
	* @category Util
	* @returns {Array} Returns the new empty array.
	* @example
	*
	* var arrays = _.times(2, _.stubArray);
	*
	* console.log(arrays);
	* // => [[], []]
	*
	* console.log(arrays[0] === arrays[1]);
	* // => false
	*/
	function stubArray() {
		return [];
	}
	/**
	* This method returns `false`.
	*
	* @static
	* @memberOf _
	* @since 4.13.0
	* @category Util
	* @returns {boolean} Returns `false`.
	* @example
	*
	* _.times(2, _.stubFalse);
	* // => [false, false]
	*/
	function stubFalse() {
		return false;
	}
	module.exports = clone$2;
}) });

//#endregion
//#region src/utils/overrideModulesLoaded.js
var require_overrideModulesLoaded = /* @__PURE__ */ __commonJS({ "src/utils/overrideModulesLoaded.js": ((exports, module) => {
	const path$16 = require("node:path");
	const nodehook = require("node-hook");
	const remapSource = require_remapSource();
	module.exports = (cb, remapParams, iterator) => {
		nodehook.hook(".js", (source, filename) => {
			if (path$16.basename(filename) !== "code.js") return source;
			const updated = remapSource(source, remapParams);
			if (iterator) iterator(filename, updated, source);
			return updated;
		});
		return cb(() => nodehook.unhook(".js"));
	};
}) });

//#endregion
//#region src/bll/Template.js
var require_Template = /* @__PURE__ */ __commonJS({ "src/bll/Template.js": ((exports, module) => {
	const path$15 = require("node:path");
	const { ATTRS_HYPH_TO_CAMEL } = require("@haiku/core/lib/HaikuComponent");
	const find = require("lodash.find");
	const merge$1 = require("lodash.merge");
	const pascalcase$1 = require("pascalcase");
	const SVGPoints = require("@haiku/core/lib/helpers/SVGPoints").default;
	const { visitManaTree } = require("@haiku/core/lib/HaikuNode");
	const { default: convertManaLayout$1 } = require("haiku-common");
	const { manaToXml } = require("haiku-common");
	const assign = require("lodash.assign");
	const defaults = require("lodash.defaults");
	const CryptoUtils$2 = require_CryptoUtils();
	const BaseModel$24 = require_BaseModel();
	const GROUP_DELIMITER = ".";
	const MERGE_STRATEGIES = {
		assign: "assign",
		defaults: "defaults"
	};
	const ROOT_LOCATOR = "0";
	const HAIKU_ID_ATTRIBUTE$4 = "haiku-id";
	const HAIKU_SOURCE_ATTRIBUTE$5 = "haiku-source";
	const HAIKU_TITLE_ATTRIBUTE$4 = "haiku-title";
	const HAIKU_SELECTOR_PREFIX = "haiku";
	const REF_MATCHER_RE = /^url\(#(.*)\)$/;
	const TEMPLATE_METADATA_ATTRIBUTES = {
		"version": true,
		"encoding": true,
		"standalone": true,
		"xmlns": true,
		"xmlns:xlink": true,
		"lang": true,
		"charset": true,
		"content": true,
		"http-equiv": true,
		"scheme": true,
		"identifier": true,
		"haiku-id": true,
		"haiku-var": true,
		"haiku-title": true,
		"haiku-source": true,
		"haiku-transclude": true,
		"haiku-locked": true
	};
	const SELECTOR_ATTRIBUTES = {
		id: "id",
		class: "class",
		className: "class",
		name: "name",
		type: "type"
	};
	function isSerializedFunction(object) {
		return object && !!object.__function;
	}
	function extractReferenceIdFromUrlReference(stringValue) {
		const matches = REF_MATCHER_RE.exec(stringValue);
		if (matches) return matches[1];
		return null;
	}
	/**
	* @class Template
	* @description
	*  Collection of static class methods for logic related to a component's template ("mana").
	*/
	var Template$9 = class extends BaseModel$24 {};
	Template$9.DEFAULT_OPTIONS = { required: {} };
	BaseModel$24.extend(Template$9);
	Template$9.prepareManaAndBuildTimelinesObject = (mana, hash, timelineName, timelineTime, { doHashWork, title }) => {
		if (doHashWork) {
			Template$9.fixFragmentIdentifierReferences(mana, hash);
			Template$9.ensureTitleAndUidifyTree(mana, path$15.posix.normalize(mana.attributes[HAIKU_SOURCE_ATTRIBUTE$5] || ""), hash, { title });
		}
		Template$9.ensureTopLevelDisplayAttributes(mana);
		convertManaLayout$1(mana);
		return Template$9.hoistTreeAttributes(mana, timelineName, timelineTime);
	};
	Template$9.normalizePath = (str) => {
		if (str[0] === ".") return `./${path$15.normalize(str)}`;
		return path$15.normalize(str);
	};
	Template$9.normalizePathOfPossiblyExternalModule = (str) => {
		if (str[0] === "@") return path$15.normalize(str);
		return Template$9.normalizePath(`./${str}`);
	};
	Template$9.mirrorHaikuUids = (fromNode, toNode) => {
		if (!toNode.attributes) toNode.attributes = {};
		toNode.attributes[HAIKU_ID_ATTRIBUTE$4] = fromNode.attributes[HAIKU_ID_ATTRIBUTE$4];
		if (!fromNode.children || fromNode.children.length < 1) return;
		if (!toNode.children || toNode.children.length < 1) return;
		if (fromNode.children.length !== toNode.children.length) return;
		for (let i$1 = 0; i$1 < fromNode.children.length; i$1++) {
			const fromNodeChild = fromNode.children[i$1];
			const toNodeChild = toNode.children[i$1];
			if (typeof fromNodeChild === "string") continue;
			if (fromNodeChild.elementName !== toNodeChild.elementName) continue;
			Template$9.mirrorHaikuUids(fromNodeChild, toNodeChild);
		}
	};
	Template$9.manaWithOnlyMinimalProps = (mana, referenceSerializer, includeChildren = true) => {
		if (mana && typeof mana === "object") {
			const out$1 = {};
			out$1.elementName = mana.elementName;
			if (typeof mana.elementName === "object") out$1.elementName = { __reference: referenceSerializer(out$1.elementName.__reference) };
			if (mana.attributes) {
				out$1.attributes = {};
				if (mana.attributes[HAIKU_ID_ATTRIBUTE$4]) out$1.attributes[HAIKU_ID_ATTRIBUTE$4] = mana.attributes[HAIKU_ID_ATTRIBUTE$4];
				if (mana.attributes[HAIKU_SOURCE_ATTRIBUTE$5]) out$1.attributes[HAIKU_SOURCE_ATTRIBUTE$5] = mana.attributes[HAIKU_SOURCE_ATTRIBUTE$5];
			}
			if (includeChildren && typeof mana.elementName !== "object" && mana.children) out$1.children = mana.children.filter((child) => {
				return child && typeof child !== "string";
			}).map((child) => {
				return Template$9.manaWithOnlyMinimalProps(child, referenceSerializer, false);
			});
			else out$1.children = [];
			return out$1;
		}
		if (typeof mana === "string") return mana;
	};
	Template$9.manaWithOnlyStandardProps = (mana, doOmitSubcomponentBytecode = true, referenceSerializer) => {
		if (mana && typeof mana === "object") {
			const out$1 = {};
			out$1.elementName = mana.elementName;
			if (typeof mana.elementName === "object") {
				if (doOmitSubcomponentBytecode) out$1.elementName = { __reference: referenceSerializer ? referenceSerializer(out$1.elementName.__reference) : out$1.elementName.__reference };
			}
			if (mana.attributes) {
				out$1.attributes = {};
				for (const key1 in TEMPLATE_METADATA_ATTRIBUTES) if (mana.attributes[key1]) out$1.attributes[key1] = mana.attributes[key1];
				for (const key2 in SELECTOR_ATTRIBUTES) if (mana.attributes[key2]) out$1.attributes[key2] = mana.attributes[key2];
			}
			if (typeof mana.elementName !== "object") out$1.children = mana.children && mana.children.filter((child) => {
				return child && typeof child !== "string";
			}).map((child) => {
				return Template$9.manaWithOnlyStandardProps(child, doOmitSubcomponentBytecode, referenceSerializer);
			});
			else out$1.children = [];
			return out$1;
		}
		if (typeof mana === "string") return mana;
	};
	Template$9.manaTreeToDepthFirstArray = function manaTreeToDepthFirstArray(arr$1, mana) {
		if (!mana || typeof mana === "string") return arr$1;
		arr$1.push(mana);
		for (let i$1 = 0; i$1 < mana.children.length; i$1++) {
			const child = mana.children[i$1];
			Template$9.manaTreeToDepthFirstArray(arr$1, child);
		}
		return arr$1;
	};
	/**
	* @function _hoistTreeAttributes
	* @description Given a mana tree, move all of its control attributes (that is, things that affect its
	* behavior that the user can control) into a timeline object.
	*/
	Template$9.hoistTreeAttributes = (mana, timelineName, timelineTime) => {
		const elementsByHaikuId = Template$9.getAllElementsByHaikuId(mana);
		const timelineStructure = {};
		timelineStructure[timelineName] = {};
		const theTimelineObj = timelineStructure[timelineName];
		for (const haikuId in elementsByHaikuId) {
			const node = elementsByHaikuId[haikuId];
			Template$9.hoistNodeAttributes(node, haikuId, theTimelineObj, timelineName, timelineTime, "assign");
		}
		return timelineStructure;
	};
	Template$9.getControlAttributes = (attributes) => {
		const out$1 = {};
		for (const key in attributes) {
			if (SELECTOR_ATTRIBUTES[key]) continue;
			if (TEMPLATE_METADATA_ATTRIBUTES[key]) continue;
			out$1[key] = attributes[key];
		}
		return out$1;
	};
	Template$9.hoistNodeAttributes = (manaNode, haikuId, timelineObj, timelineName, timelineTime, mergeStrategy) => {
		const controlAttributes = Template$9.getControlAttributes(manaNode.attributes);
		if (manaNode.children && manaNode.children.length === 1 && typeof manaNode.children[0] === "string") {
			controlAttributes.content = manaNode.children[0];
			manaNode.children = [];
		}
		const defaultAttributes = {};
		if (Object.keys(defaultAttributes).length > 0 || Object.keys(controlAttributes).length > 0) {
			const haikuIdSelector = Template$9.buildHaikuIdSelector(haikuId);
			if (!timelineObj[haikuIdSelector]) timelineObj[haikuIdSelector] = {};
			const timelineGroup = timelineObj[haikuIdSelector];
			Template$9.insertAttributesIntoTimelineGroup(timelineGroup, timelineTime, defaultAttributes, mergeStrategy);
			Template$9.insertAttributesIntoTimelineGroup(timelineGroup, timelineTime, controlAttributes, mergeStrategy);
		}
		for (const attrKey in manaNode.attributes) if (attrKey in controlAttributes) delete manaNode.attributes[attrKey];
	};
	Template$9.createHaikuId = (node, fqa, source, context) => {
		const base = `${context}|${source}|${fqa}`;
		const sha = CryptoUtils$2.sha256(base).slice(0, 16);
		const label = Element$5.getFriendlyLabel(node);
		if (label) return `${label} ${sha}`.replace(/\s+/g, "-");
		return sha;
	};
	Template$9.buildHaikuIdSelector = (haikuId) => {
		return `${HAIKU_SELECTOR_PREFIX}:${haikuId}`;
	};
	Template$9.isHaikuIdSelector = (selector) => {
		return selector && selector.slice(0, 5) === HAIKU_SELECTOR_PREFIX && selector[5] === ":";
	};
	Template$9.haikuSelectorToHaikuId = (selector) => {
		return selector.split(":")[1];
	};
	Template$9.getHash = (str, len = 6) => {
		return CryptoUtils$2.sha256(str).slice(0, len);
	};
	Template$9.getAllElementsByHaikuId = (mana) => {
		const elements = {};
		visitManaTree(ROOT_LOCATOR, mana, (elementName, attributes, children, node) => {
			if (attributes && attributes[HAIKU_ID_ATTRIBUTE$4]) elements[attributes[HAIKU_ID_ATTRIBUTE$4]] = node;
		});
		return elements;
	};
	Template$9.fixManaSourceAttribute = function fixManaSourceAttribute(mana, relpath) {
		if (!mana.attributes[HAIKU_SOURCE_ATTRIBUTE$5]) mana.attributes[HAIKU_SOURCE_ATTRIBUTE$5] = path$15.posix.normalize(relpath);
	};
	/**
	* @function _fixTreeIdReferences
	* @description Fixes all id attributes in the tree that have an entry in the given references table.
	* This is used to predictably convert all ids in a tree into a known set of randomized ids
	* @param mana {object} - Mana tree object
	* @param references {object} - Dict that maps old ids to new ids
	* @return {object} The mutated mana object
	*/
	Template$9.fixTreeIdReferences = (mana, references) => {
		if (Object.keys(references).length < 1) return mana;
		visitManaTree(ROOT_LOCATOR, mana, (elementName, attributes) => {
			if (!attributes) return;
			for (const id$1 in references) {
				const fixed = references[id$1];
				if (attributes.id === id$1) attributes.id = fixed;
			}
		});
		return mana;
	};
	/**
	* @function fixFragmentIdentifierReferenceValue
	* @description Given a key, value, and some randomization, determine whether the given key/value attribute pair
	* warrants replacing with a randomized value, and if so, return a specification object of what to change
	* @param key {String} - The name of the attribute
	* @param value {String} - The value of the attribute
	* @param randomizer {String} - Seeded randomization string to use to modify the ids
	* @returns {object | undefined}
	*/
	Template$9.fixFragmentIdentifierReferenceValue = function fixFragmentIdentifierReferenceValue(key, value, randomizer) {
		if (typeof value !== "string") return;
		const trimmed = value.trim();
		if (trimmed.length < 1) return;
		const urlId = extractReferenceIdFromUrlReference(trimmed);
		if (urlId && urlId.length > 0) return {
			originalId: urlId,
			updatedId: `${urlId}-${randomizer}`,
			updatedValue: `url(#${urlId}-${randomizer})`
		};
		if (key === "xlink:href" || key === "href") {
			if (trimmed[0] === "#") {
				const xlinkId = trimmed.slice(1);
				return {
					originalId: xlinkId,
					updatedId: `${xlinkId}-${randomizer}`,
					updatedValue: `#${xlinkId}-${randomizer}`
				};
			}
		}
	};
	Template$9.fixKeyframeValue = function fixKeyframeValue(elementNode, propertyName, keyframeValue) {
		const elementName = elementNode && elementNode.elementName;
		if (elementName === "path" && propertyName === "d") return SVGPoints.pathToPoints(keyframeValue);
		if ((elementName === "polygon" || elementName === "polyline") && propertyName === "points") return SVGPoints.polyPointsStringToPoints(keyframeValue);
		return keyframeValue;
	};
	Template$9.fixFragmentIdentifierReferences = function fixFragmentIdentifierReferences(mana, randomizer) {
		const references = {};
		visitManaTree(ROOT_LOCATOR, mana, (elementName, attributes, children, node) => {
			if (!attributes) return;
			for (const key in attributes) {
				const value = attributes[key];
				const fix = Template$9.fixFragmentIdentifierReferenceValue(key, value, randomizer);
				if (fix === void 0) continue;
				references[fix.originalId] = fix.updatedId;
				attributes[key] = fix.updatedValue;
			}
		});
		Template$9.fixTreeIdReferences(mana, references);
		return mana;
	};
	Template$9.visitTemplate = function visitTemplate(template, parent, iteratee) {
		if (template) {
			iteratee(template, parent);
			if (template.children) for (let i$1 = 0; i$1 < template.children.length; i$1++) {
				const child = template.children[i$1];
				if (!child || typeof child === "string") continue;
				Template$9.visitTemplate(child, template, iteratee);
			}
		}
	};
	Template$9.visitManaTreeSpecial = function visitManaTreeSpecial(address, hash, mana, iteratee) {
		address += `:[${hash}]${Element$5.safeElementName(mana)}(${mana.attributes && mana.attributes.id ? `#${mana.attributes.id}` : ""})`;
		iteratee(mana, address);
		if (!mana.children || mana.children.length < 1) return;
		for (let i$1 = 0; i$1 < mana.children.length; i$1++) {
			const child = mana.children[i$1];
			if (child && typeof child === "object") Template$9.visitManaTreeSpecial(address, `${hash}-${i$1}`, child, iteratee);
		}
	};
	/**
	* Visit all nodes in the given tree, beginning with the root node, in depth-first order
	*/
	Template$9.visit = (node, visitor, index = 0, depth = 0, address = "0") => {
		if (node) {
			visitor(node, null, index, depth, address);
			if (!node.children) return;
			for (let i$1 = 0; i$1 < node.children.length; i$1++) {
				const child = node.children[i$1];
				if (typeof child === "string") continue;
				Template$9.visit(child, visitor, i$1, depth + 1, `${address}.${i$1}`);
			}
		}
	};
	Template$9.inspectNodeName = (node) => {
		let name;
		if (!node) name = "void";
		else if (!node.elementName) name = "none";
		else if (typeof node.elementName === "string") name = node.elementName;
		else if (node.elementName.__reference) name = `ref(${node.elementName.__reference})`;
		else name = "unknown";
		return name;
	};
	Template$9.inspectAttribute = (val) => {
		try {
			return JSON.stringify(val);
		} catch (e) {
			return "!err!";
		}
	};
	Template$9.inspectNodeAttributes = (node) => {
		let attrs = "";
		if (!node) attrs = "void";
		else if (!node.attributes) attrs = "none";
		else if (typeof node.attributes === "object") for (const key in node.attributes) attrs += `${key}=${Template$9.inspectAttribute(node.attributes[key])} `;
		else attrs = "unknown";
		return attrs;
	};
	Template$9.inspect = (mana) => {
		let out$1 = "";
		Template$9.visit(mana, (node, parent, index, depth, address) => {
			const name = Template$9.inspectNodeName(node);
			const attrs = Template$9.inspectNodeAttributes(node);
			out$1 += `${address} <${name} ${attrs}>\n`;
		});
		return out$1;
	};
	Template$9.visitWithoutDescendingIntoSubcomponents = (node, visitor, index = 0, depth = 0, address = "0") => {
		if (node) {
			visitor(node, null, index, depth, address);
			if (typeof node.elementName === "string") {
				if (node.children) for (let i$1 = 0; i$1 < node.children.length; i$1++) {
					const child = node.children[i$1];
					if (typeof child === "string") continue;
					Template$9.visitWithoutDescendingIntoSubcomponents(child, visitor, i$1, depth + 1, `${address}.${i$1}`);
				}
			}
		}
	};
	Template$9.visitNodes = (node, parent, index, visitor) => {
		if (node) {
			visitor(node, parent, index);
			if (!node.children) return;
			for (let i$1 = 0; i$1 < node.children.length; i$1++) {
				const child = node.children[i$1];
				if (typeof child === "string") continue;
				Template$9.visitNodes(child, node, i$1, visitor);
			}
		}
	};
	Template$9.ensureTopLevelDisplayAttributes = function ensureTopLevelDisplayAttributes(mana) {
		merge$1(mana.attributes, { style: {
			position: "absolute",
			margin: "0",
			padding: "0",
			border: "0"
		} });
		if (Element$5.safeElementName(mana) === "svg") merge$1(mana.attributes, {
			"version": "1.1",
			"xmlns": "http://www.w3.org/2000/svg",
			"xmlns:xlink": "http://www.w3.org/1999/xlink"
		});
	};
	/**
	* @function ensureTitleAndUidifyTree
	* @param mana {Object} - A mana tree
	* @param source {String} - Relpath to the source file of this tree (usually an SVG file)
	* @param context {String} - Flexible context string for collision avoidance (usually folder + relpath)
	* @param hash {String} - Digest of previous content, used as a seed for number generation
	* @param options {Object}
	*/
	Template$9.ensureTitleAndUidifyTree = (mana, source, context, hash, options) => {
		if (!options) options = {};
		if (!mana.attributes) mana.attributes = {};
		if (options.title) mana.attributes[HAIKU_TITLE_ATTRIBUTE$4] = options.title;
		if (!mana.attributes[HAIKU_TITLE_ATTRIBUTE$4]) {
			let title;
			if (mana.attributes[HAIKU_SOURCE_ATTRIBUTE$5]) title = path$15.basename(mana.attributes[HAIKU_SOURCE_ATTRIBUTE$5], path$15.extname(mana.attributes[HAIKU_SOURCE_ATTRIBUTE$5]));
			if (!title) {
				if (mana.children) {
					const el = find(mana.children, { elementName: "title" });
					if (el && el.children && typeof el.children[0] === "string") title = el.children[0];
				}
			}
			if (!title) {
				if (source && source.length > 1) {
					title = path$15.basename(source, path$15.extname(source));
					title = title.replace("Bytecode", "");
				}
			}
			if (!title) title = pascalcase$1(Element$5.safeElementName(mana) || "node");
			mana.attributes[HAIKU_TITLE_ATTRIBUTE$4] = title;
		}
		Template$9.visitManaTreeSpecial("*", hash, mana, (node, fqa) => {
			if (typeof node !== "object") return;
			if (!node.attributes) node.attributes = {};
			if (!node.attributes[HAIKU_ID_ATTRIBUTE$4] || options.forceAssignId) {
				const haikuId = Template$9.createHaikuId(node, fqa, source, context);
				node.attributes[HAIKU_ID_ATTRIBUTE$4] = haikuId;
			}
			if (node.attributes.id && options.idRandomizer) node.attributes.id += `-${options.idRandomizer}`;
		});
	};
	Template$9.ensureRootDisplayAttributes = (mana) => {
		merge$1(mana.attributes, { style: {
			position: "relative",
			width: "550px",
			height: "400px",
			margin: "0",
			padding: "0",
			border: "0"
		} });
		if (Element$5.safeElementName(mana) === "svg") merge$1(mana.attributes, {
			"version": "1.1",
			"xmlns": "http://www.w3.org/2000/svg",
			"xmlns:xlink": "http://www.w3.org/1999/xlink"
		});
	};
	Template$9.cleanTemplate = (mana) => {};
	/**
	* @method areTemplatesEquivalent
	* @description Determines whether two template objects have the same structure
	* Note: This check compares element names and children (recursively), but not attributes!
	* @returns {boolean}
	*/
	Template$9.areTemplatesEquivalent = (t1, t2) => {
		if (!t1 && !t2) return true;
		if (t1 && !t2) return false;
		if (!t1 && t2) return false;
		if (t1.elementName !== t2.elementName) return false;
		if (!t1.children && !t2.children) return true;
		if (t1.children && !t2.children) return false;
		if (!t1.children && t2.children) return false;
		if (t1.children.length !== t2.children.length) return false;
		for (let i$1 = 0; i$1 < t1.children.length; i$1++) {
			const c1 = t1.children[i$1];
			const c2 = t2.children[i$1];
			if (!Template$9.areTemplatesEquivalent(c1, c2)) return false;
		}
		return true;
	};
	Template$9.allSourceNodes = function allSourceNodes(rootLocator, mana, iteratee) {
		visitManaTree(rootLocator, mana, (elementName, attributes, children, node, locator, parent, index) => {
			if (attributes && attributes[HAIKU_SOURCE_ATTRIBUTE$5]) iteratee(node, attributes[HAIKU_SOURCE_ATTRIBUTE$5], parent, index);
		});
	};
	Template$9.visitManaTree = (mana, iteratee) => {
		return visitManaTree(ROOT_LOCATOR, mana, iteratee);
	};
	Template$9.reuseHotMana = (mana) => {
		return Template$9.clone({}, mana, (copy, original) => {
			if (original.layout && original.layout.computed && original.layout.computed.matrix) copy.attributes.transform = `matrix3d(${original.layout.computed.matrix.join(",")})`;
		});
	};
	Template$9.clone = (out$1, mana, worker) => {
		if (!mana || typeof mana !== "object") return mana;
		out$1.elementName = mana.elementName;
		if (mana.attributes) {
			out$1.attributes = {};
			for (const key in mana.attributes) {
				const prop = mana.attributes[key];
				if (prop && typeof prop === "object") {
					out$1.attributes[key] = {};
					for (const subkey in prop) out$1.attributes[key][subkey] = prop[subkey];
				} else out$1.attributes[key] = prop;
			}
		}
		if (worker) worker(out$1, mana);
		if (mana.children) {
			out$1.children = [];
			for (let i$1 = 0; i$1 < mana.children.length; i$1++) out$1.children[i$1] = Template$9.clone({}, mana.children[i$1], worker);
		}
		return out$1;
	};
	Template$9.insertAttributesIntoTimelineGroup = (timelineGroup, timelineTime, givenAttributes, mergeStrategy) => {
		for (const attributeName in givenAttributes) {
			const attributeValue = givenAttributes[attributeName];
			if (attributeValue && typeof attributeValue === "object") for (const subKey in attributeValue) {
				const subVal = attributeValue[subKey];
				const fullName = attributeName + GROUP_DELIMITER + subKey;
				Template$9.mergeOne(timelineGroup, fullName, subVal, timelineTime, mergeStrategy);
			}
			else Template$9.mergeOne(timelineGroup, attributeName, attributeValue, timelineTime, mergeStrategy);
		}
	};
	Template$9.mergeOne = (timelineGroup, nameOrig, attributeValue, timelineTime, mergeStrategy) => {
		const nameFinal = ATTRS_HYPH_TO_CAMEL[nameOrig] || nameOrig;
		if (!timelineGroup[nameFinal]) {
			timelineGroup[nameFinal] = timelineGroup[nameOrig] || {};
			if (nameOrig !== nameFinal) delete timelineGroup[nameOrig];
		}
		if (!timelineGroup[nameFinal][timelineTime]) timelineGroup[nameFinal][timelineTime] = {};
		Template$9.mergeAppliedValue(nameFinal, timelineGroup[nameFinal][timelineTime], attributeValue, mergeStrategy);
	};
	function isObject(value) {
		return value !== null && typeof value === "object" && !Array.isArray(value);
	}
	Template$9.mergeAppliedValue = (name, valueDescriptor, incomingValue, mergeStrategy) => {
		if (isObject(valueDescriptor.value) && isObject(incomingValue) && !isSerializedFunction(valueDescriptor.value) && !isSerializedFunction(incomingValue)) switch (mergeStrategy) {
			case MERGE_STRATEGIES.assign:
				assign(valueDescriptor.value, incomingValue);
				break;
			case MERGE_STRATEGIES.defaults:
				defaults(valueDescriptor.value, incomingValue);
				break;
			default: throw new Error("Merge strategy provided is missing or invalid");
		}
		else switch (mergeStrategy) {
			case MERGE_STRATEGIES.assign:
				valueDescriptor.value = incomingValue;
				break;
			case MERGE_STRATEGIES.defaults:
				if (valueDescriptor.value === void 0) valueDescriptor.value = incomingValue;
				break;
			default: throw new Error("Merge strategy provided is missing or invalid");
		}
	};
	Template$9.manaToJson = (mana, replacer, spacing) => {
		const out$1 = Template$9.cleanMana(mana);
		return JSON.stringify(out$1, replacer || null, spacing || 2);
	};
	Template$9.cleanMana = (mana, { resetIds = false, suppressSubcomponents = true } = {}) => {
		const out$1 = {};
		if (!mana) return null;
		if (typeof mana === "string") return mana;
		if (mana.elementName && typeof mana.elementName === "object" && mana.elementName !== null) if (suppressSubcomponents) out$1.elementName = "div";
		else out$1.elementName = Bytecode$7.decycle(mana.elementName, {
			cleanManaOptions: {
				resetIds,
				suppressSubcomponents
			},
			doCleanMana: true
		});
		else out$1.elementName = mana.elementName;
		out$1.attributes = mana.attributes;
		if (resetIds) delete out$1.attributes[HAIKU_ID_ATTRIBUTE$4];
		out$1.children = mana.children && mana.children.map((childMana) => Template$9.cleanMana(childMana, {
			resetIds,
			suppressSubcomponents
		}));
		return out$1;
	};
	Template$9.manaToHtml = (out$1, object, mapping, options) => {
		return manaToXml(out$1, object, mapping, options);
	};
	Template$9.getStackingInfo = (bytecode, staticTemplateManaNode, timelineName, timelineTime) => {
		return staticTemplateManaNode.children.filter((child) => child && typeof child !== "string").map((child, index) => {
			const haikuId = child.attributes[HAIKU_ID_ATTRIBUTE$4];
			return {
				haikuId,
				zIndex: Number.parseInt(Template$9.getPropertyValue(bytecode, haikuId, timelineName, timelineTime, "style.zIndex"), 10) || void 0,
				index
			};
		}).sort((a, b) => {
			if (a.zIndex !== void 0 && b.zIndex !== void 0) return a.zIndex - b.zIndex;
			if (a.zIndex === void 0 ^ b.zIndex === void 0) return a.zIndex === void 0 ? 1 : -1;
			return a.index - b.index;
		}).reduce((accumulator, { zIndex, haikuId }, currentIndex) => {
			if (currentIndex === 0) return [{
				zIndex: Math.max(zIndex || 1, 1),
				haikuId
			}];
			const nextZ = accumulator[accumulator.length - 1].zIndex + 1;
			accumulator.push({
				zIndex: zIndex === void 0 ? nextZ : Math.max(zIndex, nextZ),
				haikuId
			});
			return accumulator;
		}, []);
	};
	Template$9.getPropertyValue = (bytecode, componentId, timelineName, timelineTime, propertyName) => {
		if (!bytecode) return;
		if (!bytecode.timelines) return;
		if (!bytecode.timelines[timelineName]) return;
		if (!bytecode.timelines[timelineName][`haiku:${componentId}`]) return;
		if (!bytecode.timelines[timelineName][`haiku:${componentId}`][propertyName]) return;
		if (!bytecode.timelines[timelineName][`haiku:${componentId}`][propertyName][timelineTime]) return;
		return bytecode.timelines[timelineName][`haiku:${componentId}`][propertyName][timelineTime].value;
	};
	module.exports = Template$9;
	const Bytecode$7 = require_Bytecode();
	const Element$5 = require_Element();
}) });

//#endregion
//#region src/bll/ModuleWrapper.js
var require_ModuleWrapper = /* @__PURE__ */ __commonJS({ "src/bll/ModuleWrapper.js": ((exports, module) => {
	const fs$2 = require("node:fs");
	const path$14 = require("node:path");
	const logger$16 = require_LoggerInstance();
	const overrideModulesLoaded$1 = require_overrideModulesLoaded();
	const BaseModel$23 = require_BaseModel();
	const Lock$4 = require_Lock();
	const HAIKU_SOURCE_ATTRIBUTE$4 = "haiku-source";
	const HAIKU_VAR_ATTRIBUTE$2 = "haiku-var";
	const CANONICAL_CORE_SOURCE_CODE_PATH = path$14.dirname(require.resolve("@haiku/core"));
	const REPLACEMENT_MODULES = {
		"haiku.ai/player/dom": path$14.join(CANONICAL_CORE_SOURCE_CODE_PATH, "dom"),
		"haiku.ai/player/dom/index": path$14.join(CANONICAL_CORE_SOURCE_CODE_PATH, "dom"),
		"haiku.ai/player/dom/react": path$14.join(CANONICAL_CORE_SOURCE_CODE_PATH, "dom", "react"),
		"@haiku/player": CANONICAL_CORE_SOURCE_CODE_PATH,
		"@haiku/player/dom": path$14.join(CANONICAL_CORE_SOURCE_CODE_PATH, "dom"),
		"@haiku/player/dom/index": path$14.join(CANONICAL_CORE_SOURCE_CODE_PATH, "dom"),
		"@haiku/player/dom/react": path$14.join(CANONICAL_CORE_SOURCE_CODE_PATH, "dom", "react"),
		"@haiku/core": CANONICAL_CORE_SOURCE_CODE_PATH,
		"@haiku/core/dom": path$14.join(CANONICAL_CORE_SOURCE_CODE_PATH, "dom"),
		"@haiku/core/dom/index": path$14.join(CANONICAL_CORE_SOURCE_CODE_PATH, "dom"),
		"@haiku/core/dom/react": path$14.join(CANONICAL_CORE_SOURCE_CODE_PATH, "dom", "react")
	};
	const CORE_VERSION = require(path$14.join(CANONICAL_CORE_SOURCE_CODE_PATH, "package.json")).version;
	const MODULE_CACHE_HOT = {};
	const MODULE_CACHE_COLD = {};
	const Module = require("node:module");
	const haikuCore = require("@haiku/core");
	const originalRequire = Module.prototype.require;
	MODULE_CACHE_COLD["@haiku/core"] = haikuCore;
	Module.prototype.require = function(request$2) {
		if (MODULE_CACHE_COLD[request$2]) return MODULE_CACHE_COLD[request$2];
		if (MODULE_CACHE_HOT[request$2]) return MODULE_CACHE_HOT[request$2];
		return originalRequire.apply(this, arguments);
	};
	/**
	* @class Mod
	* @description
	*  Abstraction over an in-memory JavaScript module which we may want to...
	*    - Hot-reload at runtime and seamlessly replace
	*    - Hot-update and then write back to disk, via File
	*  Handles reloading the module using require(...) += a few useful config
	*  settings through which you can specify the exact require behavior.
	*
	*  Also has static functions and other utilities for module pathing within
	*  the host project folder, used extensively throughout the app.
	*
	*  Also contains a variety of useful constants related to module pathing.
	*/
	var ModuleWrapper$7 = class ModuleWrapper$7 extends BaseModel$23 {
		constructor(props, opts) {
			super(props, opts);
			this.exp = null;
			this._hasLoadedAtLeastOnce = false;
			this._projectConfig = null;
		}
		hasLoadedAtLeastOnce() {
			return this._hasLoadedAtLeastOnce;
		}
		clearInMemoryExport() {
			this.exp = null;
		}
		fetchInMemoryExport() {
			return this.exp;
		}
		isolatedClearCache() {
			ModuleWrapper$7.clearRequireCache(path$14.dirname(this.getAbspath()));
			ModuleWrapper$7.clearHotCache();
		}
		basicReload(cb) {
			if (this.exp) return cb(null, this.exp);
			return this.reload(cb);
		}
		getFolder() {
			return this.file.folder;
		}
		getModpath() {
			return this.file.relpath;
		}
		getAbspath() {
			if (this.isExternalModule) return require.resolve(this.getModpath());
			let abspath = path$14.normalize(this.file.getAbspath());
			if (abspath.slice(0, 5) === "/var/") abspath = `/private${abspath}`;
			return abspath;
		}
		load() {
			overrideModulesLoaded$1((stop) => {
				this.isolatedClearCache();
				this.exp = require(this.getAbspath());
				this._hasLoadedAtLeastOnce = true;
				this.update(this.exp, () => {
					stop();
				});
			}, ModuleWrapper$7.getHaikuKnownImportMatch);
		}
		reload(cb) {
			return Lock$4.request(Lock$4.LOCKS.FileReadWrite(this.getAbspath()), false, (release) => {
				try {
					this.load();
				} catch (exception) {
					logger$16.warn(`[module wrapper] cannot load ${this.getAbspath()}`);
					logger$16.warn(exception);
					this.exp = {};
					this._hasLoadedAtLeastOnce = true;
					return this.update(this.exp, () => {
						if (!this.isExternalModule) {
							logger$16.warn(`[module wrapper] ***forcing flush content of ${this.getAbspath()}***`);
							this.file.maybeFlushContentForceSync();
						}
						release();
						return cb(null, this.exp);
					});
				}
				release();
				return cb(null, this.exp);
			});
		}
		moduleAsMana(hostComponentRelpath, identifier, title, cb) {
			return this.basicReload((err, exp) => {
				if (err) return cb(err);
				if (!exp) return cb(null, null);
				let source;
				if (this.isExternalModule) source = Template$8.normalizePath(this.getModpath());
				else {
					const relpath = path$14.relative(this.getFolder(), this.getAbspath());
					source = Template$8.normalizePath(`./${relpath}`);
				}
				exp.__reference = ModuleWrapper$7.buildReference(ModuleWrapper$7.REF_TYPES.COMPONENT, Template$8.normalizePath(`./${hostComponentRelpath}`), Template$8.normalizePathOfPossiblyExternalModule(source), identifier);
				return cb(null, {
					elementName: exp,
					attributes: {
						[HAIKU_SOURCE_ATTRIBUTE$4]: source,
						[HAIKU_VAR_ATTRIBUTE$2]: identifier,
						"haiku-title": title
					},
					children: []
				});
			});
		}
		update(bytecode, cb) {
			if (this.isExternalModule) return cb();
			this.exp = Bytecode$6.reinitialize(this.file.folder, path$14.normalize(this.file.relpath), bytecode, { title: this.component && this.component.getTitle() });
			MODULE_CACHE_HOT[this.getAbspath()] = this.exp;
			MODULE_CACHE_HOT[this.getModpath()] = this.exp;
			MODULE_CACHE_HOT[this.file.getAbspath()] = this.exp;
			return cb();
		}
	};
	ModuleWrapper$7.DEFAULT_OPTIONS = { required: {
		file: true,
		component: true
	} };
	BaseModel$23.extend(ModuleWrapper$7);
	ModuleWrapper$7.buildReference = (type, host, source, identifier) => {
		return JSON.stringify({
			type,
			host,
			source,
			identifier
		});
	};
	ModuleWrapper$7.isValidReference = (__reference) => {
		if (!__reference) return false;
		if (typeof __reference !== "string") return false;
		const ref = ModuleWrapper$7.parseReference(__reference);
		if (!ref) return false;
		return ref.type && ref.host && ref.source && ref.identifier;
	};
	ModuleWrapper$7.parseReference = (__reference) => {
		if (typeof __reference !== "string") return null;
		try {
			return JSON.parse(__reference);
		} catch (exception) {
			logger$16.warn("[module wrapper]", exception);
			return null;
		}
	};
	/**
	* @function modulePathToIdentifierName
	* @description Convert a module path into an identifier name for the module.
	*/
	ModuleWrapper$7.modulePathToIdentifierName = (modulepath) => {
		return (path$14.dirname(modulepath) + path$14.sep + path$14.basename(modulepath, path$14.extname(modulepath))).split(path$14.sep).map((part) => {
			return part.replace(/\W+/g, "_");
		}).join("_").slice(1);
	};
	ModuleWrapper$7.getScenenameFromRelpath = (relpath) => {
		return path$14.normalize(relpath).split(path$14.sep)[1];
	};
	/**
	* @function getHaikuKnownImportMatch
	* @description Convert a known import path to an application local installation
	*/
	ModuleWrapper$7.getHaikuKnownImportMatch = (importPath) => {
		const normalizedPath = importPath.trim().toLowerCase();
		if (normalizedPath in REPLACEMENT_MODULES) return REPLACEMENT_MODULES[normalizedPath];
		return importPath.replace(/^@haiku\/player/, REPLACEMENT_MODULES["@haiku/player"]).replace(/^@haiku\/core/, REPLACEMENT_MODULES["@haiku/core"]);
	};
	ModuleWrapper$7.clearHotCache = () => {
		const cleared = {};
		for (const key in MODULE_CACHE_HOT) {
			cleared[key] = true;
			MODULE_CACHE_HOT[key] = null;
		}
		logger$16.info(`[module wrapper] cleared hot cache`, cleared);
	};
	ModuleWrapper$7.clearRequireCache = (dirname) => {
		const cleared = {};
		for (const key in require.cache) if (dirname) {
			if (key.includes(dirname)) {
				cleared[key] = true;
				delete require.cache[key];
			}
		} else if (!key.match(/node_modules/)) {
			cleared[key] = true;
			delete require.cache[key];
		}
		logger$16.info(`[module wrapper] cleared require cache`, cleared);
	};
	ModuleWrapper$7.doesRelpathLookLikeLocalComponent = (relpath) => {
		const parts = path$14.normalize(relpath).split(path$14.sep);
		return path$14.basename(relpath) === "code.js" && parts[0] === "code" && parts.length === 3;
	};
	ModuleWrapper$7.doesRelpathLookLikeSVGDesign = (relpath) => {
		return path$14.extname(relpath) === ".svg";
	};
	ModuleWrapper$7.doesRelpathLookLikeInstalledComponent = (relpath) => {
		return path$14.normalize(relpath).split(path$14.sep)[0] === "@haiku";
	};
	/**
	* Enable loading module from string.
	* Heavily based on https://github.com/floatdrop/require-from-string
	*/
	ModuleWrapper$7.requireFromString = (code, filename, opts) => {
		if (typeof filename === "object") {
			opts = filename;
			filename = void 0;
		}
		opts = opts || {};
		filename = filename || "";
		if (typeof code !== "string") throw new TypeError(`code must be a string, not ${typeof code}`);
		const m = new Module(filename, module.parent);
		m.paths = [].concat(path$14.dirname(filename), Module._nodeModulePaths(__dirname));
		m.filename = filename;
		m.id = filename;
		m._compile(code, filename);
		return m.exports;
	};
	/**
	* Enable loading module from file.
	*/
	ModuleWrapper$7.requireFromFile = (filename) => {
		const contents = fs$2.readFileSync(filename).toString();
		return ModuleWrapper$7.requireFromString(contents, filename);
	};
	/**
	* Test load bytecode by requiring it. Used to check if currently editing file can be required.
	*/
	ModuleWrapper$7.testLoadBytecode = (contents, absPath) => {
		let loadedBytecode = null;
		overrideModulesLoaded$1((stop) => {
			loadedBytecode = ModuleWrapper$7.requireFromString(contents, absPath);
			stop();
		}, ModuleWrapper$7.getHaikuKnownImportMatch);
		return loadedBytecode;
	};
	ModuleWrapper$7.REF_TYPES = { COMPONENT: "component" };
	ModuleWrapper$7.CORE_VERSION = CORE_VERSION;
	module.exports = ModuleWrapper$7;
	const Bytecode$6 = require_Bytecode();
	const Template$8 = require_Template();
}) });

//#endregion
//#region src/bll/Expression.js
var require_Expression = /* @__PURE__ */ __commonJS({ "src/bll/Expression.js": ((exports, module) => {
	const { tokenizeDirective } = require("@haiku/core/lib/reflection/Tokenizer");
	const BaseModel$22 = require_BaseModel();
	/**
	* @class Expression
	* @description
	*  Collection of static class methods for Expression-related logic.
	*/
	var Expression$3 = class extends BaseModel$22 {};
	Expression$3.DEFAULT_OPTIONS = { required: {} };
	BaseModel$22.extend(Expression$3);
	Expression$3.EXPR_SIGNS = {
		RET: "return",
		EQ: "="
	};
	Expression$3.retToEq = (str) => {
		if (str.substring(0, 7) === `${Expression$3.EXPR_SIGNS.RET} `) {
			str = str.slice(7);
			str = `${Expression$3.EXPR_SIGNS.EQ} ${str}`;
		}
		return str;
	};
	function textContentNormalizer(value) {
		if (typeof value === "string") return value;
		if (typeof value === "number") return value;
		if (value === null || value === void 0) return "";
		return `${value}`;
	}
	function booleanNormalizer(value) {
		return !!value;
	}
	function numericNormalizer(value) {
		return Number(value);
	}
	function pxUnitRequiredNormalizer(value) {
		return `${value}px`;
	}
	Expression$3.VALUE_NORMALIZERS = {
		"content": textContentNormalizer,
		"shown": booleanNormalizer,
		"opacity": numericNormalizer,
		"offset.x": numericNormalizer,
		"offset.y": numericNormalizer,
		"offset.z": numericNormalizer,
		"origin.x": numericNormalizer,
		"origin.y": numericNormalizer,
		"origin.z": numericNormalizer,
		"translation.x": numericNormalizer,
		"translation.y": numericNormalizer,
		"translation.z": numericNormalizer,
		"rotation.x": numericNormalizer,
		"rotation.y": numericNormalizer,
		"rotation.z": numericNormalizer,
		"scale.x": numericNormalizer,
		"scale.y": numericNormalizer,
		"scale.z": numericNormalizer,
		"shear.xy": numericNormalizer,
		"shear.xz": numericNormalizer,
		"shear.yz": numericNormalizer,
		"sizeMode.x": numericNormalizer,
		"sizeMode.y": numericNormalizer,
		"sizeMode.z": numericNormalizer,
		"sizeProportional.x": numericNormalizer,
		"sizeProportional.y": numericNormalizer,
		"sizeProportional.z": numericNormalizer,
		"sizeDifferential.x": numericNormalizer,
		"sizeDifferential.y": numericNormalizer,
		"sizeDifferential.z": numericNormalizer,
		"sizeAbsolute.x": numericNormalizer,
		"sizeAbsolute.y": numericNormalizer,
		"sizeAbsolute.z": numericNormalizer,
		"style.perspective": pxUnitRequiredNormalizer
	};
	Expression$3.isUnitToken = (str) => {
		return Expression$3.isPxUnit(str) || Expression$3.isRadiansUnit(str) || Expression$3.isDegreesUnit(str);
	};
	Expression$3.normalizeTokensWithNumericFirstToken = (tokens$2, orig) => {
		if (tokens$2.length < 2) return tokens$2[0];
		if (tokens$2.length > 2) return orig;
		if (Expression$3.isUnitToken(tokens$2[1])) return tokens$2[0];
		return orig;
	};
	Expression$3.normalizeParsedValue = (parsedValue, propertyName) => {
		if (Number.isNaN(parsedValue)) return 1;
		if (typeof parsedValue === "number" && !isFinite(parsedValue)) return 1;
		if (Expression$3.VALUE_NORMALIZERS[propertyName]) return Expression$3.VALUE_NORMALIZERS[propertyName](parsedValue);
		return parsedValue;
	};
	Expression$3.isRadiansUnit = (unit) => {
		return unit === "rad" || unit === "rads" || unit === "radians";
	};
	Expression$3.isDegreesUnit = (unit) => {
		return unit === "deg" || unit === "degs" || unit === "degrees" || unit === "°";
	};
	Expression$3.isPxUnit = (unit) => {
		return unit === "px" || unit === "pixels";
	};
	function rotationTokenHandler(tokens$2, raw) {
		if (tokens$2.length < 1) return 1;
		const num = Expression$3.normalizeParsedValue(Number(tokens$2[0]));
		const unit = tokens$2[1];
		if (typeof unit !== "string") return num;
		if (Expression$3.isRadiansUnit(unit)) return num;
		if (Expression$3.isDegreesUnit(unit)) return num * (Math.PI / 180);
		return num;
	}
	function pxTokenHandler(tokens$2, raw) {
		if (tokens$2.length < 1) return 1;
		return Expression$3.normalizeParsedValue(Number(tokens$2[0]));
	}
	Expression$3.TOKEN_HANDLERS = {
		"rotation.x": rotationTokenHandler,
		"rotation.y": rotationTokenHandler,
		"rotation.z": rotationTokenHandler,
		"translation.x": pxTokenHandler,
		"translation.y": pxTokenHandler,
		"translation.z": pxTokenHandler,
		"sizeAbsolute.x": pxTokenHandler,
		"sizeAbsolute.y": pxTokenHandler,
		"width": pxTokenHandler,
		"height": pxTokenHandler
	};
	function isPlainObject(obj) {
		return obj.constructor === Object && Object.prototype.toString.call(obj) === "[object Object]";
	}
	Expression$3.parseValue = (userInput, propertyName) => {
		if (typeof userInput !== "string") return Expression$3.normalizeParsedValue(userInput, propertyName);
		if (userInput.trim() === "undefined") return;
		if (userInput.trim() === "null") return null;
		const parsedInput = Expression$3.flexibleJsonParse(userInput);
		if (typeof parsedInput === "function") return Expression$3.normalizeParsedValue(userInput);
		if (parsedInput && !Array.isArray(parsedInput) && typeof parsedInput === "object") {
			if (isPlainObject(parsedInput)) return Expression$3.normalizeParsedValue(parsedInput);
			return Expression$3.normalizeParsedValue(userInput);
		}
		if (parsedInput !== void 0) return Expression$3.normalizeParsedValue(parsedInput, propertyName);
		try {
			const inputAsTokens = tokenizeDirective(userInput).map(({ value }) => value);
			if (Expression$3.TOKEN_HANDLERS[propertyName]) return Expression$3.normalizeParsedValue(Expression$3.TOKEN_HANDLERS[propertyName](inputAsTokens, userInput));
			if (typeof inputAsTokens[0] === "number") return Expression$3.normalizeParsedValue(Expression$3.normalizeTokensWithNumericFirstToken(inputAsTokens, userInput), propertyName);
		} catch (exception) {
			return Expression$3.normalizeParsedValue(userInput);
		}
		return Expression$3.normalizeParsedValue(userInput);
	};
	Expression$3.safeJsonParse = (str) => {
		try {
			return JSON.parse(str);
		} catch (exception) {
			return;
		}
	};
	/**
	* @description Allow the user to enter strings like [{a: 123}] which aren't valid JSON
	* but which the JavaScript engine is able to parse.
	*/
	Expression$3.flexibleJsonParse = (str) => {
		const body = `\nreturn ${str.trim()};\n`;
		try {
			return new Function(body)();
		} catch (exception) {}
		return Expression$3.safeJsonParse(str);
	};
	Expression$3.buildStateInjectorFunction = (stateName) => {
		return { __function: {
			params: [stateName],
			body: `return ${stateName};`,
			injectee: true
		} };
	};
	module.exports = Expression$3;
}) });

//#endregion
//#region src/bll/State.js
var require_State = /* @__PURE__ */ __commonJS({ "src/bll/State.js": ((exports, module) => {
	const camelcase = require("camelcase");
	const ReservedWords = require("@haiku/core/lib/reflection/ReservedWords").default;
	const BaseModel$21 = require_BaseModel();
	/**
	* @class State
	* @description
	*  Collection of static class methods for logic related to states.
	*/
	var State$2 = class extends BaseModel$21 {};
	State$2.DEFAULT_OPTIONS = { required: {} };
	BaseModel$21.extend(State$2);
	function nextAvailableWordIfReserved(word) {
		if (ReservedWords.isReserved(word)) return nextAvailableWordIfReserved(`_${word}`);
		return word;
	}
	State$2.isNumeric = (n) => {
		return !isNaN(Number.parseFloat(n)) && isFinite(n);
	};
	State$2.safeJsonStringify = (thing) => {
		try {
			return JSON.stringify(thing);
		} catch (exception) {
			if (thing && thing.toString) return thing.toString();
			return `${thing}`;
		}
	};
	State$2.buildStateNameFromElementPropertyName = (n, states, elementNode, propertyName, originalName) => {
		let stateName = originalName;
		const elementName = elementNode && elementNode.elementName;
		if (!stateName) {
			if (elementName === "path" && propertyName === "d") stateName = "pathInstructions";
		}
		if (!stateName) stateName = camelcase(propertyName);
		stateName = `${stateName.split(/\W+/g).join("_")}${n && `_${n}` || ""}`;
		stateName = nextAvailableWordIfReserved(stateName);
		if (!states[stateName]) return stateName;
		return State$2.buildStateNameFromElementPropertyName(n + 1, states, elementNode, propertyName, originalName);
	};
	/**
	* @method areStatesEquivalent
	* @description Determines whether two state objects have the same properties
	* @returns {boolean}
	*/
	State$2.areStatesEquivalent = (s1, s2) => {
		if (!s1 && !s2) return true;
		if (s1 && !s2) return false;
		if (!s1 && s2) return false;
		for (const k1 in s1) if (s2[k1] === void 0) return false;
		for (const k2 in s2) if (s1[k2] === void 0) return false;
		return true;
	};
	State$2.deduceTypeOfValue = (stateValue) => {
		if (Array.isArray(stateValue)) return "array";
		if (State$2.isNumeric(stateValue)) return "number";
		if (stateValue && typeof stateValue === "object") return "object";
		if (stateValue === null || stateValue === void 0) return "any";
		if (typeof stateValue === "string") return "string";
		return typeof stateValue;
	};
	State$2.deduceType = (stateValueDescriptor) => {
		if (stateValueDescriptor.type) return stateValueDescriptor.type;
		return State$2.deduceTypeOfValue(stateValueDescriptor.value);
	};
	State$2.assignDescriptor = (out$1, stateValueDescriptor) => {
		if (stateValueDescriptor.setter) out$1.set = stateValueDescriptor.setter;
		if (stateValueDescriptor.getter) out$1.get = stateValueDescriptor.getter;
		if (stateValueDescriptor.set) out$1.set = stateValueDescriptor.set;
		if (stateValueDescriptor.get) out$1.get = stateValueDescriptor.get;
		if (stateValueDescriptor.type) out$1.type = stateValueDescriptor.type;
		if (stateValueDescriptor.access) out$1.access = stateValueDescriptor.access;
		if (stateValueDescriptor.mock !== void 0) out$1.mock = stateValueDescriptor.mock;
		if (stateValueDescriptor.value !== void 0) out$1.value = stateValueDescriptor.value;
		return out$1;
	};
	State$2.autoStringify = (stateValueDescriptor) => {
		const deducedType = State$2.deduceType(stateValueDescriptor);
		return State$2.stringifyFromType(stateValueDescriptor.value, deducedType);
	};
	State$2.stringifyFromType = (stateValue, knownType) => {
		if (typeof stateValue === "string") return stateValue;
		switch (knownType) {
			case "array": return State$2.safeJsonStringify(stateValue);
			case "object": return State$2.safeJsonStringify(stateValue);
			default:
				if (stateValue && stateValue.toString) return stateValue.toString();
				if (stateValue === null) return "";
				if (stateValue === void 0) return "";
				return `${stateValue}`;
		}
	};
	State$2.recast = (stateValueDescriptor) => {
		const clonedValueDescriptor = State$2.assignDescriptor({}, stateValueDescriptor);
		clonedValueDescriptor.value = Expression$2.parseValue(clonedValueDescriptor.value);
		clonedValueDescriptor.mock = Expression$2.parseValue(clonedValueDescriptor.mock);
		clonedValueDescriptor.type = State$2.deduceType(clonedValueDescriptor);
		return clonedValueDescriptor;
	};
	module.exports = State$2;
	const Expression$2 = require_Expression();
}) });

//#endregion
//#region src/bll/TimelineProperty.js
var require_TimelineProperty = /* @__PURE__ */ __commonJS({ "src/bll/TimelineProperty.js": ((exports, module) => {
	const { getFallback: getFallback$1 } = require("@haiku/core/lib/HaikuComponent");
	const logger$15 = require_LoggerInstance();
	const TimelineProperty$7 = {};
	TimelineProperty$7.getSelectorForComponentId = (componentId) => {
		return `haiku:${componentId}`;
	};
	TimelineProperty$7.addProperty = (timelinesObject, timelineName, componentId, elementName, outputName, startTime, startValue, curve, endTime, endValue) => {
		const segmentsBase = TimelineProperty$7.findOrCreatePropertySegmentsBase(timelinesObject, timelineName, componentId, outputName);
		if (!segmentsBase[0] || segmentsBase[0].value === void 0) {
			segmentsBase[0] = {};
			segmentsBase[0].value = TimelineProperty$7.getFallbackValue(elementName, outputName, startValue);
		}
		const st = Number.parseInt(startTime, 10);
		const startSeg = segmentsBase[st] || {};
		startSeg.value = startValue;
		if (curve) startSeg.curve = curve;
		startSeg.edited = true;
		segmentsBase[st] = startSeg;
		if (endTime) {
			const et = Number.parseInt(endTime, 10);
			const endSeg = segmentsBase[et] || {};
			endSeg.value = endValue;
			endSeg.edited = true;
			segmentsBase[et] = endSeg;
		}
		return [startValue, endValue];
	};
	TimelineProperty$7.getFallbackValue = (elementName, outputName, valueAssignedInThisOperation) => {
		if (typeof elementName === "object") {
			if (outputName in elementName.states) return elementName.states[outputName].value;
			elementName = "div";
		}
		const fallback = getFallback$1(elementName, outputName);
		if (fallback !== void 0) return fallback;
		return valueAssignedInThisOperation;
	};
	TimelineProperty$7.getBaselineValue = (componentId, elementName, propertyName, timelineName, timelineTime, fallbackValue, bytecode, hostInstance) => {
		const ms = TimelineProperty$7.getBaselineKeyframeStart(componentId, elementName, timelineName, propertyName, timelineTime, bytecode);
		return TimelineProperty$7.getComputedValue(componentId, elementName, propertyName, timelineName, ms, fallbackValue, bytecode, hostInstance);
	};
	TimelineProperty$7.getBaselineCurve = (componentId, elementName, propertyName, timelineName, timelineTime, fallbackValue, bytecode, hostInstance, states) => {
		const ms = TimelineProperty$7.getAssignedBaselineKeyframeStart(componentId, elementName, timelineName, propertyName, timelineTime, bytecode);
		return TimelineProperty$7.getComputedCurve(componentId, elementName, propertyName, timelineName, ms, fallbackValue, bytecode, hostInstance, states);
	};
	TimelineProperty$7.getComputedCurve = (componentId, elementName, propertyName, timelineName, timelineTime, fallbackValue, bytecode, hostInstance, states) => {
		if (!bytecode) return;
		if (!bytecode.timelines) return;
		return TimelineProperty$7.getPropertyCurveAtTime(bytecode.timelines, timelineName, componentId, elementName, propertyName, timelineTime, hostInstance, states);
	};
	TimelineProperty$7.getPropertyCurveAtTime = (timelinesObject, timelineName, componentId, elementName, outputName, time, hostInstance, states) => {
		const propertiesGroup = TimelineProperty$7.getPropertiesBase(timelinesObject, timelineName, componentId);
		if (!propertiesGroup) return;
		if (!propertiesGroup[outputName]) return;
		if (!propertiesGroup[outputName][time]) return;
		return propertiesGroup[outputName][time].curve;
	};
	TimelineProperty$7.getComputedValue = (componentId, elementName, propertyName, timelineName, timelineTime, fallbackValue, bytecode, hostInstance) => {
		if (!bytecode) return fallbackValue;
		if (!bytecode.timelines) return fallbackValue;
		const value = TimelineProperty$7.getPropertyValueAtTime(bytecode.timelines, timelineName, componentId, elementName, propertyName, timelineTime, hostInstance);
		return value === void 0 ? fallbackValue : value;
	};
	TimelineProperty$7.getPropertyValueAtTime = (timelinesObject, timelineName, componentId, elementName, outputName, time, hostInstance) => {
		const propertiesGroup = TimelineProperty$7.getPropertiesBase(timelinesObject, timelineName, componentId);
		if (propertiesGroup) try {
			if (hostInstance) {
				const { computedValue } = hostInstance.grabValue(timelineName, componentId, hostInstance.findElementsByHaikuId(componentId)[0], outputName, propertiesGroup[outputName], time, !hostInstance.shouldPerformFullFlush(), true);
				if (computedValue !== void 0 && computedValue !== null) return computedValue;
			} else logger$15.warn(`[timeline property] host instance and value builder may be required to compute a value for ${outputName}`);
		} catch (exception) {
			logger$15.warn(`[timeline property] unable to compute dynamic value for ${timelineName} ${componentId} ${outputName} ${time} [${exception.message}]`);
		}
		return TimelineProperty$7.getFallbackValue(elementName, outputName);
	};
	TimelineProperty$7.addPropertyGroup = (timelinesObject, timelineName, componentId, elementName, deltaGroup, startTime) => {
		for (const outputName in deltaGroup) {
			const outputVal = deltaGroup[outputName];
			TimelineProperty$7.addProperty(timelinesObject, timelineName, componentId, elementName, outputName, startTime, outputVal);
		}
		return timelinesObject;
	};
	/**
	* @function getPropertySegmentsBase
	* @description Return an object that contains all values for the given property output name.
	* e.g. { 0: { ... }, 100: { ... } }
	*/
	TimelineProperty$7.getPropertySegmentsBase = (timelinesObject, timelineName, componentId, outputName) => {
		const selector = TimelineProperty$7.getSelectorForComponentId(componentId);
		if (!timelinesObject) return null;
		if (!timelinesObject[timelineName]) return null;
		if (!timelinesObject[timelineName][selector]) return null;
		return timelinesObject[timelineName][selector][outputName];
	};
	/**
	* @function getPropertiesBase
	* @description Return an object that contains all values for the given property output name.
	* e.g. { position.x: { ... }, position.y: { ... } }
	*/
	TimelineProperty$7.getPropertiesBase = (timelinesObject, timelineName, componentId) => {
		const selector = TimelineProperty$7.getSelectorForComponentId(componentId);
		if (!timelinesObject) return null;
		if (!timelinesObject[timelineName]) return null;
		return timelinesObject[timelineName][selector];
	};
	TimelineProperty$7.findOrCreatePropertySegmentsBase = (timelinesObject, timelineName, componentId, outputName) => {
		const selector = TimelineProperty$7.getSelectorForComponentId(componentId);
		if (!timelinesObject[timelineName]) timelinesObject[timelineName] = {};
		if (!timelinesObject[timelineName][selector]) timelinesObject[timelineName][selector] = {};
		if (!timelinesObject[timelineName][selector][outputName]) timelinesObject[timelineName][selector][outputName] = {};
		return timelinesObject[timelineName][selector][outputName];
	};
	TimelineProperty$7.getValueGroup = (componentId, timelineName, propertyName, bytecode) => {
		const selector = TimelineProperty$7.getSelectorForComponentId(componentId);
		if (!bytecode) return null;
		if (!bytecode.timelines) return null;
		if (!bytecode.timelines[timelineName]) return null;
		if (!bytecode.timelines[timelineName][selector]) return null;
		return bytecode.timelines[timelineName][selector][propertyName];
	};
	TimelineProperty$7.mergeProperties = (oldGroup, newGroup) => {
		for (const newPropName in newGroup) oldGroup[newPropName] = newGroup[newPropName];
	};
	TimelineProperty$7.getBaselineKeyframeStart = (componentId, elementName, timelineName, propertyName, timelineTime, bytecode) => {
		let keyframeStart = 0;
		const valueGroup = TimelineProperty$7.getValueGroup(componentId, timelineName, propertyName, bytecode);
		if (!valueGroup) return keyframeStart;
		Object.keys(valueGroup).map((ms) => {
			return Number.parseInt(ms, 10);
		}).forEach((ms, index) => {
			if (ms < timelineTime && ms > keyframeStart) keyframeStart = ms;
		});
		return keyframeStart;
	};
	TimelineProperty$7.getAssignedBaselineKeyframeStart = (componentId, elementName, timelineName, propertyName, timelineTime, bytecode) => {
		let keyframeStart = 0;
		const valueGroup = TimelineProperty$7.getValueGroup(componentId, timelineName, propertyName, bytecode);
		if (!valueGroup) return keyframeStart;
		Object.keys(valueGroup).map((ms) => {
			return Number.parseInt(ms, 10);
		}).forEach((ms, index) => {
			if (ms <= timelineTime && ms > keyframeStart) keyframeStart = ms;
		});
		return keyframeStart;
	};
	TimelineProperty$7.getAssignedBaselineValueObject = (componentId, elementName, propertyName, timelineName, timelineTime, bytecode) => {
		const ms = TimelineProperty$7.getAssignedBaselineKeyframeStart(componentId, elementName, timelineName, propertyName, timelineTime, bytecode);
		const keyframeGroup = TimelineProperty$7.getPropertySegmentsBase(bytecode.timelines, timelineName, componentId, propertyName);
		return keyframeGroup && keyframeGroup[ms];
	};
	TimelineProperty$7.getAssignedValueObject = (componentId, elementName, propertyName, timelineName, timelineTime, bytecode) => {
		const keyframeGroup = TimelineProperty$7.getPropertySegmentsBase(bytecode.timelines, timelineName, componentId, propertyName);
		return keyframeGroup && keyframeGroup[timelineTime];
	};
	module.exports = TimelineProperty$7;
}) });

//#endregion
//#region src/bll/Bytecode.js
var require_Bytecode = /* @__PURE__ */ __commonJS({ "src/bll/Bytecode.js": ((exports, module) => {
	const lodash$4 = require("lodash");
	const clone$1 = require_lodash();
	const cloneDeepWith = require("lodash.clonedeepwith");
	const merge = require("lodash.merge");
	const BaseModel$20 = require_BaseModel();
	const enhance = require("@haiku/core/lib/reflection/enhance").default;
	const { xmlToMana: xmlToMana$1, default: convertManaLayout } = require("haiku-common");
	const expressionToRO$3 = require("@haiku/core/lib/reflection/expressionToRO").default;
	const reifyRO = require("@haiku/core/lib/reflection/reifyRO").default;
	const logger$14 = require_LoggerInstance();
	const HAIKU_ID_ATTRIBUTE$3 = "haiku-id";
	const HAIKU_TITLE_ATTRIBUTE$3 = "haiku-title";
	const DEFAULT_TIMELINE_NAME$1 = "Default";
	const DEFAULT_TIMELINE_TIME$1 = 0;
	const DEFAULT_ROOT_NODE_NAME = "div";
	const FALLBACK_TEMPLATE = `<${DEFAULT_ROOT_NODE_NAME}></${DEFAULT_ROOT_NODE_NAME}>`;
	const DEFAULT_CONTEXT_SIZE$1 = {
		width: 550,
		height: 400
	};
	const DEFAULT_CURVE = "easeInOutQuad";
	function isEmpty(val) {
		return val === void 0;
	}
	function referenceEvaluatorMissing(arg) {
		logger$14.warn("[bytecode] reference evaluator is not implemented");
		return arg;
	}
	function ensureManaChildrenArray(mana) {
		const previous = mana.children;
		mana.children = [];
		if (previous) mana.children.push(previous);
		return mana;
	}
	/**
	* @class Bytecode
	* @description
	*  Collection of static class methods for bytecode manipulation.
	*/
	var Bytecode$5 = class extends BaseModel$20 {};
	Bytecode$5.DEFAULT_OPTIONS = { required: {} };
	BaseModel$20.extend(Bytecode$5);
	/**
	* @method areBytecodesIsomorphic
	* @description Determine whether two bytecode objects are isomorphic, i.e.
	* effectively represent the same scene graph structure and addressable properties.
	* @returns {boolean}
	*/
	Bytecode$5.areBytecodesIsomorphic = (b1, b2) => {
		const areStates = State$1.areStatesEquivalent(b1.states, b2.states);
		const areTemplates = Template$7.areTemplatesEquivalent(b1.template, b2.template);
		return areStates && areTemplates;
	};
	Bytecode$5.cleanBytecode = (bytecode) => {
		const elementsByHaikuId = Template$7.getAllElementsByHaikuId(bytecode.template);
		for (const timelineName in bytecode.timelines) {
			const timelineObject = bytecode.timelines[timelineName];
			for (const timelineSelector in timelineObject) if (Template$7.isHaikuIdSelector(timelineSelector)) {
				if (!elementsByHaikuId[Template$7.haikuSelectorToHaikuId(timelineSelector)]) delete timelineObject[timelineSelector];
			} else if (timelineSelector[0] === "_" && timelineSelector[1] === "_") delete timelineObject[timelineSelector];
		}
		if (bytecode.eventHandlers) {
			for (const eventSelector in bytecode.eventHandlers) if (Template$7.isHaikuIdSelector(eventSelector)) {
				if (!elementsByHaikuId[Template$7.haikuSelectorToHaikuId(eventSelector)]) delete bytecode.eventHandlers[eventSelector];
			}
		}
	};
	Bytecode$5.getAppliedStatesForNode = (out$1, bytecode, node) => {
		const allExprParams = [];
		const selectorsInvolved = {};
		Template$7.visit(node, (node$1) => {
			if (node$1 && node$1.attributes) selectorsInvolved[`haiku:${node$1.attributes[HAIKU_ID_ATTRIBUTE$3]}`] = true;
		});
		for (const timelineName in bytecode.timelines) for (const selector in bytecode.timelines[timelineName]) {
			if (!selectorsInvolved[selector]) continue;
			for (const propertyName in bytecode.timelines[timelineName][selector]) for (const keyframeMs in bytecode.timelines[timelineName][selector][propertyName]) {
				const keyframeObj = bytecode.timelines[timelineName][selector][propertyName][keyframeMs];
				if (typeof keyframeObj.value === "function") {
					enhance(keyframeObj.value);
					allExprParams.push.apply(allExprParams, keyframeObj.value.specification.params);
				}
			}
		}
		const uniqStateNames = {};
		allExprParams.forEach((paramName) => {
			if (typeof paramName === "string") uniqStateNames[paramName] = true;
		});
		for (const stateName in bytecode.states) {
			if (!uniqStateNames[stateName]) continue;
			const stateDescriptor = bytecode.states[stateName];
			out$1[stateName] = lodash$4.clone(stateDescriptor);
		}
		return out$1;
	};
	Bytecode$5.getAppliedHelpersForNode = (out$1, bytecode, element) => {
		Template$7.visit(element, (node) => {
			for (const helperName in bytecode.helpers) out$1[helperName] = bytecode.helpers[helperName];
		});
		return out$1;
	};
	Bytecode$5.getAppliedTimelinesForNode = (out$1, bytecode, element) => {
		Template$7.visit(element, (node) => {
			for (const timelineName in bytecode.timelines) for (const timelineSelector in bytecode.timelines[timelineName]) {
				const haikuId = Template$7.haikuSelectorToHaikuId(timelineSelector);
				if (node && node.attributes && node.attributes[HAIKU_ID_ATTRIBUTE$3] === haikuId) {
					if (!out$1[timelineName]) out$1[timelineName] = {};
					out$1[timelineName][timelineSelector] = bytecode.timelines[timelineName][timelineSelector];
				}
			}
		});
		return out$1;
	};
	Bytecode$5.getAppliedEventHandlersForNode = (out$1, bytecode, element) => {
		Template$7.visit(element, (node) => {
			for (const eventSelector in bytecode.eventHandlers) {
				const haikuId = Template$7.haikuSelectorToHaikuId(eventSelector);
				if (node && node.attributes && node.attributes[HAIKU_ID_ATTRIBUTE$3] === haikuId) out$1[eventSelector] = bytecode.eventHandlers[eventSelector];
			}
		});
		return out$1;
	};
	Bytecode$5.padIds = (bytecode, padderFunction) => {
		const fixedReferences = {};
		const templateNodes = [];
		Template$7.visit(bytecode.template, (node) => {
			if (node && node.attributes) templateNodes.push(node);
		});
		templateNodes.forEach((node) => {
			const haikuId = node.attributes[HAIKU_ID_ATTRIBUTE$3];
			if (haikuId) {
				fixedReferences[haikuId] = padderFunction(haikuId);
				node.attributes[HAIKU_ID_ATTRIBUTE$3] = fixedReferences[haikuId];
			}
			const domId = node.attributes.id;
			if (domId) {
				const fixedDomId = padderFunction(domId);
				fixedReferences[`url(#${domId})`] = `url(#${fixedDomId})`;
				fixedReferences[`#${domId}`] = `#${fixedDomId}`;
				node.attributes.id = fixedDomId;
				if (!node.attributes[HAIKU_TITLE_ATTRIBUTE$3]) node.attributes[HAIKU_TITLE_ATTRIBUTE$3] = domId;
			}
		});
		for (const originalReference in fixedReferences) {
			const updatedReference = fixedReferences[originalReference];
			if (bytecode.eventHandlers) transferReferences(bytecode.eventHandlers, originalReference, updatedReference);
			if (bytecode.timelines) for (const timelineName in bytecode.timelines) {
				const timelineObject = bytecode.timelines[timelineName];
				transferReferences(timelineObject, originalReference, updatedReference);
				for (const timelineSelector in timelineObject) for (const propertyName in timelineObject[timelineSelector]) {
					if (propertyName === "content") continue;
					for (const keyframeMs in timelineObject[timelineSelector][propertyName]) {
						const fixedValue = fixedReferences[timelineObject[timelineSelector][propertyName][keyframeMs].value];
						if (fixedValue) timelineObject[timelineSelector][propertyName][keyframeMs].value = fixedValue;
					}
				}
			}
		}
		templateNodes.forEach((node) => {
			for (const attrKey in node.attributes) {
				if (ATTRS_TO_EXCLUDE_FROM_ID_PADDING[attrKey]) continue;
				const attrVal = node.attributes[attrKey];
				if (typeof attrVal !== "string") continue;
				if (fixedReferences[attrVal.trim()]) node.attributes[attrKey] = fixedReferences[attrVal.trim()];
			}
		});
	};
	const ATTRS_TO_EXCLUDE_FROM_ID_PADDING = {
		"haiku-title": true,
		"haiku-source": true,
		"haiku-var": true
	};
	function transferReferences(obj, originalReference, updatedReference) {
		if (obj[`#${originalReference}`]) {
			obj[`#${updatedReference}`] = obj[`#${originalReference}`];
			delete obj[`#${originalReference}`];
		} else if (obj[`haiku:${originalReference}`]) {
			obj[`haiku:${updatedReference}`] = obj[`haiku:${originalReference}`];
			delete obj[`haiku:${originalReference}`];
		}
	}
	/**
	* @method mergeBytecode
	* @description Given two bytecode objects assumed to be from the same design source
	* (effectively have the same structure and properties), merge their contents together,
	* incorporating default state changes etc.
	*/
	Bytecode$5.mergeBytecode = (b1, b2) => {
		if (!b1.metadata) b1.metadata = {};
		Object.assign(b1.metadata, b2.metadata || {});
		if (!b1.options) b1.options = {};
		Object.assign(b1.options, b2.options || {});
		if (!b1.helpers) b1.helpers = {};
		Object.assign(b1.helpers, b2.helpers || {});
		Bytecode$5.mergeBytecodeControlStructures(b1, b2);
		b1.template = Template$7.clone({}, b2.template);
		return b1;
	};
	Bytecode$5.mergeBytecodeStates = (b1, b2) => {
		if (b2.states && !b1.states) b1.states = {};
		if (b2.states) for (const stateKey in b2.states) {
			const previousState = b1.states[stateKey];
			if (!previousState || previousState && !previousState.edited) b1.states[stateKey] = b2.states[stateKey];
		}
	};
	Bytecode$5.mergeBytecodeEventHandlers = (b1, b2) => {
		if (b2.eventHandlers && !b1.eventHandlers) b1.eventHandlers = {};
		if (b2.eventHandlers) for (const eventSelector in b2.eventHandlers) for (const eventName in b2.eventHandlers[eventSelector]) {
			const previousEventHandler = b1.eventHandlers[eventSelector] && b1.eventHandlers[eventSelector][eventName];
			if (!previousEventHandler || previousEventHandler && !previousEventHandler.edited) {
				if (!b1.eventHandlers[eventSelector]) b1.eventHandlers[eventSelector] = {};
				b1.eventHandlers[eventSelector][eventName] = b2.eventHandlers[eventSelector][eventName];
			}
		}
	};
	Bytecode$5.mergeTimelines = (t1, t2, doMergeValueFn) => {
		const changesMade = [];
		if (!t1 || !t2) return changesMade;
		for (const timelineName in t2) for (const timelineSelector in t2[timelineName]) for (const propertyName in t2[timelineName][timelineSelector]) for (const keyframeMs in t2[timelineName][timelineSelector][propertyName]) {
			const previousKeyframe = t1[timelineName] && t1[timelineName][timelineSelector] && t1[timelineName][timelineSelector][propertyName] && t1[timelineName][timelineSelector][propertyName][keyframeMs];
			if (!previousKeyframe || previousKeyframe && !previousKeyframe.edited) {
				if (!t1[timelineName]) t1[timelineName] = {};
				if (!t1[timelineName][timelineSelector]) t1[timelineName][timelineSelector] = {};
				if (!t1[timelineName][timelineSelector][propertyName]) t1[timelineName][timelineSelector][propertyName] = {};
				if (!t1[timelineName][timelineSelector][propertyName][keyframeMs]) t1[timelineName][timelineSelector][propertyName][keyframeMs] = {};
				const targetObj = t1[timelineName][timelineSelector][propertyName][keyframeMs];
				const sourceObj = t2[timelineName][timelineSelector][propertyName][keyframeMs];
				if (sourceObj && sourceObj.curve !== void 0) targetObj.curve = sourceObj.curve;
				if (sourceObj && sourceObj.edited !== void 0) targetObj.edited = sourceObj.edited;
				if (sourceObj && sourceObj.value !== void 0) {
					if (targetObj.value !== sourceObj.value) if (doMergeValueFn) {
						if (doMergeValueFn(propertyName, targetObj.value, sourceObj.value)) {
							changesMade.push({
								timelineName,
								timelineSelector,
								propertyName,
								keyframeMs,
								value: sourceObj.value
							});
							targetObj.value = sourceObj.value;
						}
					} else {
						changesMade.push({
							timelineName,
							timelineSelector,
							propertyName,
							keyframeMs,
							value: sourceObj.value
						});
						targetObj.value = sourceObj.value;
					}
				}
			}
		}
		return changesMade;
	};
	Bytecode$5.mergeBytecodeControlStructures = (b1, b2) => {
		Bytecode$5.mergeBytecodeStates(b1, b2);
		Bytecode$5.mergeBytecodeEventHandlers(b1, b2);
		if (b2.timelines && !b1.timelines) b1.timelines = {};
		return Bytecode$5.mergeTimelines(b1.timelines, b2.timelines);
	};
	Bytecode$5.pasteBytecode = (destination, pasted) => {
		if (pasted.states) {
			if (!destination.states) destination.states = {};
			for (const stateKey in pasted.states) destination.states[stateKey] = pasted.states[stateKey];
		}
		if (pasted.eventHandlers) {
			if (!destination.eventHandlers) destination.eventHandlers = {};
			for (const eventSelector in pasted.eventHandlers) for (const eventName in pasted.eventHandlers[eventSelector]) {
				if (!destination.eventHandlers[eventSelector]) destination.eventHandlers[eventSelector] = {};
				destination.eventHandlers[eventSelector][eventName] = pasted.eventHandlers[eventSelector][eventName];
			}
		}
		if (pasted.timelines) {
			if (!destination.timelines) destination.timelines = {};
			for (const timelineName in pasted.timelines) for (const timelineSelector in pasted.timelines[timelineName]) for (const propertyName in pasted.timelines[timelineName][timelineSelector]) for (const keyframeMs in pasted.timelines[timelineName][timelineSelector][propertyName]) {
				if (!destination.timelines[timelineName]) destination.timelines[timelineName] = {};
				if (!destination.timelines[timelineName][timelineSelector]) destination.timelines[timelineName][timelineSelector] = {};
				if (!destination.timelines[timelineName][timelineSelector][propertyName]) destination.timelines[timelineName][timelineSelector][propertyName] = {};
				destination.timelines[timelineName][timelineSelector][propertyName][keyframeMs] = pasted.timelines[timelineName][timelineSelector][propertyName][keyframeMs];
			}
		}
		if (pasted.template) {
			if (!destination.template) destination.template = {
				elementName: "div",
				attributes: {},
				children: []
			};
			if (!destination.template.children) destination.template.children = [];
			destination.template.children.unshift(pasted.template);
		}
		return destination;
	};
	Bytecode$5.applyOverrides = (overrides, timelinesObject, timelineName, timelineSelector, timelineTime) => {
		if (overrides && Object.keys(overrides).length > 0) {
			if (!timelinesObject[timelineName]) timelinesObject[timelineName] = {};
			if (!timelinesObject[timelineName][timelineSelector]) timelinesObject[timelineName][timelineSelector] = {};
			for (const propertyName in overrides) {
				if (!timelinesObject[timelineName][timelineSelector][propertyName]) timelinesObject[timelineName][timelineSelector][propertyName] = {};
				if (!timelinesObject[timelineName][timelineSelector][propertyName][timelineTime]) timelinesObject[timelineName][timelineSelector][propertyName][timelineTime] = {};
				if (!timelinesObject[timelineName][timelineSelector][propertyName][timelineTime].edited) timelinesObject[timelineName][timelineSelector][propertyName][timelineTime].value = overrides[propertyName];
			}
		}
	};
	Bytecode$5.extractOverrides = (bytecode) => {
		const overrides = {};
		if (bytecode.states) for (const stateName in bytecode.states) overrides[stateName] = bytecode.states[stateName].value;
		return overrides;
	};
	Bytecode$5.clone = (bytecode) => {
		return Bytecode$5.mergeBytecode({}, bytecode);
	};
	Bytecode$5.snapshot = (bytecode) => {
		return cloneDeepWith(bytecode, (value) => {
			if (typeof value === "function") return value;
		});
	};
	Bytecode$5.decycle = (reified, { cleanManaOptions = {}, doCleanMana }) => {
		const decycled = {};
		if (!reified) {
			logger$14.warn(`Decycle received falsy bytecode`);
			return decycled;
		}
		if (reified.metadata) decycled.metadata = reified.metadata;
		if (reified.options) decycled.options = reified.options;
		if (reified.settings) decycled.settings = reified.settings;
		if (reified.properties) decycled.properties = reified.properties;
		if (reified.states) decycled.states = reified.states;
		if (reified.helpers) decycled.helpers = reified.helpers;
		if (reified.eventHandlers) {
			decycled.eventHandlers = {};
			for (const componentId in reified.eventHandlers) {
				decycled.eventHandlers[componentId] = {};
				for (const eventListenerName in reified.eventHandlers[componentId]) {
					const handlerToAssign = reified.eventHandlers[componentId][eventListenerName].handler;
					decycled.eventHandlers[componentId][eventListenerName] = { handler: handlerToAssign };
				}
			}
		}
		if (reified.timelines) decycled.timelines = reified.timelines;
		if (reified.template) if (doCleanMana) decycled.template = Template$7.cleanMana(reified.template, cleanManaOptions);
		else decycled.template = reified.template;
		return decycled;
	};
	/**
	* @method reinitialize
	* @description Make sure the in-memory bytecode object has all of the correct settings,
	* attributes, and structure. This ought to get called if the bytecode has just been
	* ingested from somewhere and you need to make sure it is right.
	*/
	Bytecode$5.reinitialize = (folder, relpath, bytecode = {}, config = {}) => {
		let mana;
		if (typeof bytecode.template === "string") mana = xmlToMana$1(bytecode.template || FALLBACK_TEMPLATE);
		else if (typeof bytecode.template === "object") mana = bytecode.template || xmlToMana$1(FALLBACK_TEMPLATE);
		else mana = {
			elementName: "div",
			attributes: {},
			children: []
		};
		bytecode.template = mana;
		if (!Array.isArray(bytecode.template.children)) ensureManaChildrenArray(bytecode.template);
		if (!bytecode.template.attributes) bytecode.template.attributes = {};
		Template$7.ensureTopLevelDisplayAttributes(bytecode.template);
		if (!bytecode.template.elementName) bytecode.template.elementName = "div";
		Template$7.ensureRootDisplayAttributes(bytecode.template);
		if (!bytecode.options) bytecode.options = {};
		if (!bytecode.timelines) bytecode.timelines = {};
		if (!bytecode.timelines[DEFAULT_TIMELINE_NAME$1]) bytecode.timelines[DEFAULT_TIMELINE_NAME$1] = {};
		for (const timelineName in bytecode.timelines) for (const selector in bytecode.timelines[timelineName]) for (const property in bytecode.timelines[timelineName][selector]) if (typeof bytecode.timelines[timelineName][selector][property] !== "object") bytecode.timelines[timelineName][selector][property] = { [DEFAULT_TIMELINE_TIME$1]: { value: bytecode.timelines[timelineName][selector][property] } };
		convertManaLayout(bytecode.template);
		Bytecode$5.writeMetadata(bytecode, lodash$4.assign({}, config, {
			uuid: "HAIKU_SHARE_UUID",
			root: "HAIKU_CDN_PROJECT_ROOT",
			type: "haiku",
			relpath
		}));
		Template$7.ensureTitleAndUidifyTree(bytecode.template, Template$7.normalizePath(relpath), Template$7.normalizePath(relpath), "0", { title: config.title });
		const contextHaikuId = bytecode.template.attributes[HAIKU_ID_ATTRIBUTE$3];
		const scenename = ModuleWrapper$6.getScenenameFromRelpath(relpath);
		Bytecode$5.upsertDefaultProperties(bytecode, contextHaikuId, {
			"style.WebkitTapHighlightColor": "rgba(0,0,0,0)",
			"style.position": "relative",
			"style.overflowX": scenename === "main" ? "hidden" : "visible",
			"style.overflowY": scenename === "main" ? "hidden" : "visible",
			"sizeAbsolute.x": DEFAULT_CONTEXT_SIZE$1.width,
			"sizeAbsolute.y": DEFAULT_CONTEXT_SIZE$1.height,
			"sizeMode.x": 1,
			"sizeMode.y": 1,
			"sizeMode.z": 1
		}, "assign");
		bytecode.template.children.forEach((child) => {
			const childId = child.attributes && child.attributes[HAIKU_ID_ATTRIBUTE$3];
			if (childId) {
				const selector = Template$7.buildHaikuIdSelector(childId);
				Bytecode$5.ensureDefinedKeyframeProperty(bytecode, DEFAULT_TIMELINE_NAME$1, selector, "translation.x", DEFAULT_TIMELINE_TIME$1, 0);
				Bytecode$5.ensureDefinedKeyframeProperty(bytecode, DEFAULT_TIMELINE_NAME$1, selector, "translation.y", DEFAULT_TIMELINE_TIME$1, 0);
			}
		});
		return bytecode;
	};
	Bytecode$5.ensureDefinedKeyframeProperty = (bytecode, timelineName, selector, propertyName, keyframeMs, propertyValue) => {
		if (!bytecode.timelines[timelineName]) bytecode.timelines[timelineName] = {};
		if (!bytecode.timelines[timelineName][selector]) bytecode.timelines[timelineName][selector] = {};
		if (!bytecode.timelines[timelineName][selector][propertyName]) bytecode.timelines[timelineName][selector][propertyName] = {};
		if (!bytecode.timelines[timelineName][selector][propertyName][keyframeMs]) bytecode.timelines[timelineName][selector][propertyName][keyframeMs] = {};
		if (bytecode.timelines[timelineName][selector][propertyName][keyframeMs].value === void 0) bytecode.timelines[timelineName][selector][propertyName][keyframeMs].value = propertyValue;
	};
	Bytecode$5.upsertDefaultProperties = (bytecode, componentId, propertiesToMerge, strategy) => {
		if (!strategy) strategy = "merge";
		const haikuSelector = `haiku:${componentId}`;
		if (!bytecode.timelines.Default[haikuSelector]) bytecode.timelines.Default[haikuSelector] = {};
		const defaultTimeline = bytecode.timelines.Default[haikuSelector];
		for (const propName in propertiesToMerge) {
			if (!defaultTimeline.hasOwnProperty(propName)) defaultTimeline[propName] = {};
			if (!defaultTimeline[propName][DEFAULT_TIMELINE_TIME$1]) defaultTimeline[propName][DEFAULT_TIMELINE_TIME$1] = {};
			switch (strategy) {
				case "merge":
					defaultTimeline[propName][DEFAULT_TIMELINE_TIME$1].value = propertiesToMerge[propName];
					break;
				case "assign":
					if (defaultTimeline[propName][DEFAULT_TIMELINE_TIME$1].value === void 0) defaultTimeline[propName][DEFAULT_TIMELINE_TIME$1].value = propertiesToMerge[propName];
					break;
			}
		}
	};
	Bytecode$5.batchUpsertEventHandlers = (bytecode, selectorName, serializedEvents) => {
		if (!bytecode.eventHandlers) bytecode.eventHandlers = {};
		if (!Object.keys(serializedEvents).length) {
			delete bytecode.eventHandlers[selectorName];
			return;
		}
		bytecode.eventHandlers[selectorName] = {};
		Object.entries(serializedEvents).forEach(([event, handlerDescriptor]) => {
			bytecode.eventHandlers[selectorName][event] = {};
			if (handlerDescriptor.handler !== void 0) bytecode.eventHandlers[selectorName][event].handler = Bytecode$5.unserializeValue(handlerDescriptor.handler);
		});
		return bytecode;
	};
	Bytecode$5.changeKeyframeValue = (bytecode, componentId, timelineName, propertyName, keyframeMs, newValue) => {
		const property = Bytecode$5.ensureTimelineProperty(bytecode, timelineName, componentId, propertyName);
		property[keyframeMs].value = Bytecode$5.unserializeValue(newValue);
		property[keyframeMs].edited = true;
		return property;
	};
	Bytecode$5.changePlaybackSpeed = (bytecode, framesPerSecond) => {
		if (!bytecode.options) bytecode.options = {};
		bytecode.options.fps = Math.round(Number.parseInt(framesPerSecond, 10));
		if (bytecode.options.fps > 60) bytecode.options.fps = 60;
	};
	Bytecode$5.changeSegmentCurve = (bytecode, componentId, timelineName, propertyName, keyframeMs, newCurve) => {
		const property = Bytecode$5.ensureTimelineProperty(bytecode, timelineName, componentId, propertyName);
		if (!property[keyframeMs]) property[keyframeMs] = {};
		property[keyframeMs].curve = Bytecode$5.unserializeValue(newCurve);
		property[keyframeMs].edited = true;
		return property;
	};
	Bytecode$5.componentIdToSelector = (componentId) => {
		if (componentId.slice(0, false)) return componentId;
		return `haiku:${componentId}`;
	};
	Bytecode$5.createKeyframe = (bytecode, componentId, timelineName, elementName, propertyName, keyframeStartMs, keyframeValueGiven, keyframeCurve, keyframeEndMs, keyframeEndValue, hostInstance, inputValues) => {
		const property = Bytecode$5.ensureTimelineProperty(bytecode, timelineName, componentId, propertyName);
		const precedingValue = TimelineProperty$6.getPropertyValueAtTime(bytecode.timelines, timelineName, componentId, elementName, propertyName, keyframeStartMs - 1, hostInstance, inputValues);
		const currentValue = TimelineProperty$6.getPropertyValueAtTime(bytecode.timelines, timelineName, componentId, elementName, propertyName, keyframeStartMs, hostInstance, inputValues);
		const precedingAssignedValueObject = TimelineProperty$6.getAssignedBaselineValueObject(componentId, elementName, propertyName, timelineName, keyframeStartMs - 1, bytecode);
		const precedingAssignedValue = precedingAssignedValueObject && precedingAssignedValueObject.value;
		const currentAssignedValueObject = TimelineProperty$6.getAssignedBaselineValueObject(componentId, elementName, propertyName, timelineName, keyframeStartMs, bytecode);
		const currentAssignedValue = currentAssignedValueObject && currentAssignedValueObject.value;
		if (!property[keyframeStartMs]) property[keyframeStartMs] = {};
		let keyframeValue = keyframeValueGiven;
		if (isEmpty(keyframeValue)) keyframeValue = currentAssignedValue;
		if (isEmpty(keyframeValue)) keyframeValue = precedingAssignedValue;
		if (isEmpty(keyframeValue)) keyframeValue = currentValue;
		if (isEmpty(keyframeValue)) keyframeValue = precedingValue;
		keyframeValue = Bytecode$5.unserializeValue(keyframeValue);
		property[keyframeStartMs].value = keyframeValue;
		if (keyframeCurve !== void 0 && keyframeCurve !== null) property[keyframeStartMs].curve = Bytecode$5.unserializeValue(keyframeCurve);
		property[keyframeStartMs].edited = true;
		if (keyframeEndMs !== void 0 && keyframeEndMs !== null) {
			if (!property[keyframeEndMs]) property[keyframeEndMs] = {};
			property[keyframeEndMs].value = Bytecode$5.unserializeValue(keyframeEndValue || keyframeValue);
			property[keyframeEndMs].edited = true;
		}
		return property[keyframeStartMs];
	};
	Bytecode$5.createTimeline = (bytecode, timelineName, timelineDescriptor) => {
		const timeline = Bytecode$5.ensureTimeline(bytecode, timelineName);
		if (timelineDescriptor) merge(timeline, Bytecode$5.unserializeValue(timelineDescriptor));
		return timeline;
	};
	Bytecode$5.deleteKeyframe = (bytecode, componentId, timelineName, propertyName, keyframeMs) => {
		const property = Bytecode$5.ensureTimelineProperty(bytecode, timelineName, componentId, propertyName);
		const mss = Bytecode$5.getSortedKeyframeKeys(property);
		const list = mss.map((ms, i$1) => {
			const prev$1 = mss[i$1 - 1];
			const next$1 = mss[i$1 + 1];
			return {
				edited: property[ms].edited,
				curve: property[ms].curve,
				value: property[ms].value,
				index: i$1,
				start: ms,
				end: next$1 !== void 0 ? next$1 : ms,
				first: prev$1 === void 0,
				last: next$1 === void 0
			};
		});
		const curr = list.filter((item) => item.start === keyframeMs)[0];
		if (!curr) return property;
		const prev = list[curr.index - 1];
		const next = list[curr.index + 1];
		delete property[keyframeMs];
		if (prev && !next) {
			property[prev.start] = {};
			property[prev.start].value = prev.value;
			if (prev.edited) property[prev.start].edited = true;
		}
	};
	Bytecode$5.deleteStateValue = (bytecode, stateName) => {
		if (bytecode.states) delete bytecode.states[stateName];
		return bytecode;
	};
	Bytecode$5.deleteTimeline = (bytecode, timelineName) => {
		if (bytecode.timelines) delete bytecode.timelines[timelineName];
		return bytecode.timelines;
	};
	Bytecode$5.duplicateTimeline = (bytecode, timelineName) => {
		const duplicate = clone$1(Bytecode$5.ensureTimeline(bytecode, timelineName));
		const newName = `${timelineName} copy`;
		Bytecode$5.createTimeline(bytecode, newName, duplicate);
		return newName;
	};
	Bytecode$5.ensureTimeline = (bytecode, timelineName) => {
		if (!bytecode.timelines) bytecode.timelines = {};
		if (!bytecode.timelines[timelineName]) bytecode.timelines[timelineName] = {};
		return bytecode.timelines[timelineName];
	};
	Bytecode$5.ensureTimelineGroup = (bytecode, timelineName, componentId) => {
		const timeline = Bytecode$5.ensureTimeline(bytecode, timelineName);
		const selector = Bytecode$5.componentIdToSelector(componentId);
		if (!timeline[selector]) timeline[selector] = {};
		return timeline[selector];
	};
	Bytecode$5.ensureTimelineProperty = (bytecode, timelineName, componentId, propertyName) => {
		const group = Bytecode$5.ensureTimelineGroup(bytecode, timelineName, componentId);
		if (!group[propertyName]) group[propertyName] = {};
		return group[propertyName];
	};
	Bytecode$5.getSortedKeyframeKeys = (property) => {
		if (!property) return [];
		return Object.keys(property).map((ms) => Number.parseInt(ms, 10)).sort((a, b) => a - b);
	};
	Bytecode$5.joinKeyframes = (bytecode, componentId, timelineName, elementName, propertyName, keyframeMsLeft, keyframeMsRight, newCurve) => {
		const property = Bytecode$5.ensureTimelineProperty(bytecode, timelineName, componentId, propertyName);
		if (property[keyframeMsLeft]) {
			property[keyframeMsLeft].curve = Bytecode$5.unserializeValue(newCurve);
			property[keyframeMsLeft].edited = true;
		}
		return property;
	};
	Bytecode$5.moveKeyframes = (bytecode, keyframeMoves) => {
		for (const timelineName in keyframeMoves) for (const componentId in keyframeMoves[timelineName]) for (const propertyName in keyframeMoves[timelineName][componentId]) {
			const keyframeMove = Bytecode$5.unserializeValue(keyframeMoves[timelineName][componentId][propertyName]);
			const propertyObject = Bytecode$5.ensureTimelineProperty(bytecode, timelineName, componentId, propertyName);
			for (const oldMs in propertyObject) delete propertyObject[oldMs];
			for (const newMs in keyframeMove) {
				propertyObject[newMs] = keyframeMove[newMs];
				propertyObject[newMs].edited = true;
			}
		}
	};
	Bytecode$5.readAllEventHandlers = (bytecode) => {
		if (!bytecode.eventHandlers) bytecode.eventHandlers = {};
		return bytecode.eventHandlers;
	};
	Bytecode$5.readAllStateValues = (bytecode) => {
		if (!bytecode.states) bytecode.states = {};
		return bytecode.states;
	};
	Bytecode$5.renameTimeline = (bytecode, timelineNameOld, timelineNameNew) => {
		const old = Bytecode$5.ensureTimeline(bytecode, timelineNameOld);
		if (timelineNameOld === timelineNameNew) return old;
		if (bytecode.timelines[timelineNameNew]) return old;
		bytecode.timelines[timelineNameNew] = old;
		delete bytecode.timelines[timelineNameOld];
		return old;
	};
	Bytecode$5.serializeValue = (value) => {
		return expressionToRO$3(value);
	};
	Bytecode$5.unserializeValue = (value, referenceEvaluator = referenceEvaluatorMissing) => {
		return reifyRO(value, referenceEvaluator, false);
	};
	Bytecode$5.splitSegment = (bytecode, componentId, timelineName, elementName, propertyName, keyframeMs) => {
		const property = Bytecode$5.ensureTimelineProperty(bytecode, timelineName, componentId, propertyName);
		if (property[keyframeMs]) {
			const orig = property[keyframeMs];
			property[keyframeMs] = { value: orig.value };
			if (orig.edited) property[keyframeMs].edited = true;
		}
		return property;
	};
	Bytecode$5.upsertEventHandler = (bytecode, selectorName, eventName, handlerDescriptor) => {
		if (!bytecode.eventHandlers) bytecode.eventHandlers = {};
		if (!bytecode.eventHandlers[selectorName]) bytecode.eventHandlers[selectorName] = {};
		if (!bytecode.eventHandlers[selectorName][eventName]) bytecode.eventHandlers[selectorName][eventName] = {};
		if (handlerDescriptor.handler !== void 0) bytecode.eventHandlers[selectorName][eventName].handler = Bytecode$5.unserializeValue(handlerDescriptor.handler);
		bytecode.eventHandlers[selectorName][eventName].edited = true;
		return bytecode;
	};
	Bytecode$5.upsertStateValue = (bytecode, stateName, stateDescriptor) => {
		if (!bytecode.states) bytecode.states = {};
		if (!bytecode.states[stateName]) bytecode.states[stateName] = {};
		if (stateDescriptor.type !== void 0) bytecode.states[stateName].type = stateDescriptor.type;
		if (stateDescriptor.value !== void 0) bytecode.states[stateName].value = stateDescriptor.value;
		if (stateDescriptor.access !== void 0) bytecode.states[stateName].access = stateDescriptor.access;
		if (stateDescriptor.mock !== void 0) bytecode.states[stateName].mock = stateDescriptor.mock;
		if (stateDescriptor.get !== void 0) bytecode.states[stateName].get = Bytecode$5.unserializeValue(stateDescriptor.get);
		if (stateDescriptor.set !== void 0) bytecode.states[stateName].set = Bytecode$5.unserializeValue(stateDescriptor.set);
		bytecode.states[stateName].edited = true;
		return bytecode;
	};
	Bytecode$5.writeMetadata = (bytecode, metadata) => {
		if (!bytecode.metadata) bytecode.metadata = {};
		if (metadata) {
			for (const key in metadata) if (metadata[key] !== void 0 && metadata[key] !== null) bytecode.metadata[key] = metadata[key];
		}
	};
	Bytecode$5.upsertPropertyValue = (bytecode, componentId, timelineName, timelineTime, propertiesToMerge, strategy) => {
		if (!strategy) strategy = "merge";
		const haikuSelector = `haiku:${componentId}`;
		if (!bytecode.timelines[timelineName][haikuSelector]) bytecode.timelines[timelineName][haikuSelector] = {};
		const defaultTimeline = bytecode.timelines[timelineName][haikuSelector];
		for (const propName in propertiesToMerge) {
			if (!defaultTimeline[propName]) defaultTimeline[propName] = {};
			if (!defaultTimeline[propName][timelineTime]) defaultTimeline[propName][timelineTime] = {};
			switch (strategy) {
				case "merge":
					defaultTimeline[propName][timelineTime].value = propertiesToMerge[propName];
					break;
				case "assign":
					if (defaultTimeline[propName][timelineTime].value === void 0) defaultTimeline[propName][timelineTime].value = propertiesToMerge[propName];
					break;
			}
		}
	};
	Bytecode$5.replaceTimelinePropertyGroups = (bytecodeObject, timelineName, timelineSelector, propertyGroup) => {
		if (!bytecodeObject.timelines[timelineName]) bytecodeObject.timelines[timelineName] = {};
		if (!bytecodeObject.timelines[timelineName][timelineSelector]) bytecodeObject.timelines[timelineName][timelineSelector] = {};
		Object.assign(bytecodeObject.timelines[timelineName][timelineSelector], propertyGroup);
	};
	Bytecode$5.getNormalizedRelpath = (bc) => {
		const r = bc && bc.metadata && bc.metadata.relpath;
		if (r) return Template$7.normalizePath(r);
	};
	Bytecode$5.isBytecodeSame = (a, b) => {
		if (!a || !b) return false;
		if (a === b) return true;
		const relpathA = Bytecode$5.getNormalizedRelpath(a);
		const relpathB = Bytecode$5.getNormalizedRelpath(b);
		if (relpathA && relpathB) return relpathA === relpathB;
		return false;
	};
	Bytecode$5.doesMatchOrHostBytecode = (ours, theirs, seen = {}) => {
		seen[Bytecode$5.getNormalizedRelpath(ours)] = true;
		if (Bytecode$5.isBytecodeSame(ours, theirs)) return true;
		let answer = false;
		Template$7.visit(ours.template, (node) => {
			if (answer) return;
			if (typeof node.elementName === "object") {
				const relpath = Bytecode$5.getNormalizedRelpath(node.elementName);
				if (seen[relpath]) return;
				seen[relpath] = true;
				if (Bytecode$5.doesMatchOrHostBytecode(node.elementName, theirs, seen)) answer = true;
			}
		});
		return answer;
	};
	Bytecode$5.addDefaultCurveIfNecessary = (bytecode, timelineName, selector, newKeyframeTime, propertyName, componentId, elementName) => {
		const property = bytecode.timelines[timelineName][selector][propertyName];
		if (property) {
			const orderedKeyframes = Object.keys(property).map(Number).sort((a, b) => a - b);
			const lastKeyframe = orderedKeyframes.filter((time) => time < newKeyframeTime).pop();
			const nextKeyframe = orderedKeyframes.filter((time) => time > newKeyframeTime).shift();
			if (lastKeyframe !== void 0 && property[lastKeyframe].curve === void 0 && property[lastKeyframe].value !== property[newKeyframeTime].value) Bytecode$5.joinKeyframes(bytecode, componentId, timelineName, elementName, propertyName, lastKeyframe, newKeyframeTime, DEFAULT_CURVE);
			if (nextKeyframe && property[newKeyframeTime].curve === void 0 && property[nextKeyframe].value !== property[newKeyframeTime].value) Bytecode$5.joinKeyframes(bytecode, componentId, timelineName, elementName, propertyName, newKeyframeTime, nextKeyframe, DEFAULT_CURVE);
		}
	};
	module.exports = Bytecode$5;
	const ModuleWrapper$6 = require_ModuleWrapper();
	const State$1 = require_State();
	const Template$7 = require_Template();
	const TimelineProperty$6 = require_TimelineProperty();
}) });

//#endregion
//#region src/utils/fileManipulation.js
var require_fileManipulation = /* @__PURE__ */ __commonJS({ "src/utils/fileManipulation.js": ((exports, module) => {
	const { exec: exec$1 } = require("node:child_process");
	const fs$1 = require("node:fs");
	const https$1 = require("node:https");
	const RESERVED_CHAR_REPLACEMENT = "-";
	const FILENAME_RESERVED_REGEX = /[<>:"/\\|?*\x00-\x1F]/g;
	const WINDOWS_NAMES_RESERVED_REGEX = /^(con|prn|aux|nul|com\d|lpt\d)$/i;
	module.exports = {
		download(url$2, downloadPath, onProgress, shouldCancel) {
			const file = fs$1.createWriteStream(downloadPath);
			return new Promise((resolve, reject) => {
				const request$2 = https$1.get(url$2, (response) => {
					const contentLenght = Number.parseInt(response.headers["content-length"], 10);
					let progress = 0;
					response.pipe(file);
					response.on("data", (data) => {
						if (typeof shouldCancel === "function" && shouldCancel()) {
							request$2.abort();
							file.close();
							reject(/* @__PURE__ */ new Error("Download cancelled"));
						}
						progress += data.length;
						onProgress(progress * 100 / contentLenght);
					});
					response.on("error", (error) => {
						fs$1.unlink(downloadPath);
						reject(error);
					});
					file.on("finish", () => {
						file.close(resolve);
					});
				});
			});
		},
		unzip(zipPath, destination) {
			const unzipCommand = `/usr/bin/unzip -o -qq ${JSON.stringify(zipPath)} -d ${JSON.stringify(destination)}`;
			return new Promise((resolve, reject) => {
				exec$1(unzipCommand, {}, (err) => {
					err ? reject(err) : resolve(true);
				});
			});
		},
		ditto(src$1, dest) {
			const dittoComand = `/usr/bin/ditto ${JSON.stringify(src$1)} ${JSON.stringify(dest)}`;
			return new Promise((resolve, reject) => {
				exec$1(dittoComand, {}, (err) => {
					err ? reject(err) : resolve(true);
				});
			});
		},
		sanitize(name) {
			if (typeof name !== "string") return "";
			return name.replace(FILENAME_RESERVED_REGEX, RESERVED_CHAR_REPLACEMENT).replace(WINDOWS_NAMES_RESERVED_REGEX, RESERVED_CHAR_REPLACEMENT);
		},
		stringifyPath(filePath) {
			if (typeof filePath !== "string") return "";
			return filePath.replace(/\\/g, "\\\\");
		}
	};
}) });

//#endregion
//#region src/utils/mixpanel.js
var require_mixpanel = /* @__PURE__ */ __commonJS({ "src/utils/mixpanel.js": ((exports, module) => {
	const os$2 = require("node:os");
	const Mixpanel$2 = require("mixpanel");
	const logger$13 = require_LoggerInstance();
	const tokens$1 = {
		development: "53f3639f564804dcb710fd18511d1c0b",
		production: "6f31d4f99cf71024ce27c3e404a79a61"
	};
	const token$1 = process.env.NODE_ENV === "production" ? tokens$1.production : tokens$1.development;
	const mixpanel$2 = Mixpanel$2.init(token$1, { protocol: "https" });
	mixpanel$2.token = token$1;
	const defaultPayload$1 = {
		app: "haiku",
		arch: os$2.arch(),
		platform: os$2.platform(),
		type: os$2.type(),
		process: typeof window === "undefined" ? "renderer" : "main",
		node_env: process.env.NODE_ENV,
		release_environment: process.env.NODE_ENV,
		release_branch: process.env.HAIKU_RELEASE_BRANCH,
		release_platform: process.env.HAIKU_RELEASE_PLATFORM,
		release_version: process.env.HAIKU_RELEASE_VERSION,
		distinct_id: void 0
	};
	mixpanel$2.mergeToPayload = function mergeToPayload(keepPayload) {
		return Object.assign(defaultPayload$1, keepPayload);
	};
	function _getPayload$1(eventName, eventPayload) {
		return Object.assign({}, defaultPayload$1, eventPayload);
	}
	function _safeStringify$1(obj) {
		try {
			return JSON.stringify(obj);
		} catch (exception) {
			return null;
		}
	}
	mixpanel$2.haikuTrack = function haikuTrack(eventName, eventPayload) {
		const finalPayload = _getPayload$1(eventName, eventPayload);
		logger$13.info("[mixpanel]", eventName);
		return mixpanel$2.track(eventName, finalPayload);
	};
	const trackedEvents$1 = {};
	mixpanel$2.haikuTrackOnce = function haikuTrackOnce(eventName, eventPayload) {
		const payloadString = _safeStringify$1(_getPayload$1(eventName, eventPayload));
		if (payloadString) {
			if (!trackedEvents$1[payloadString]) {
				trackedEvents$1[payloadString] = true;
				mixpanel$2.haikuTrack(eventName, eventPayload);
			}
		}
	};
	module.exports = mixpanel$2;
}) });

//#endregion
//#region src/utils/randomAlphabetical.js
var require_randomAlphabetical = /* @__PURE__ */ __commonJS({ "src/utils/randomAlphabetical.js": ((exports, module) => {
	const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
	function randomAlphabetical$2(len) {
		let text = "";
		for (let i$1 = 0; i$1 < len; i$1++) text += possible.charAt(Math.floor(Math.random() * 52));
		return text;
	}
	module.exports = randomAlphabetical$2;
}) });

//#endregion
//#region src/bll/Figma.js
var require_Figma = /* @__PURE__ */ __commonJS({ "src/bll/Figma.js": ((exports, module) => {
	const path$13 = require("node:path");
	const { URL, URLSearchParams } = require("node:url");
	const { inkstone } = require("@haiku/sdk-inkstone");
	const fse$6 = require("haiku-fs-extra");
	const request = require("request");
	const { sanitize } = require_fileManipulation();
	const logger$12 = require_LoggerInstance();
	const mixpanel$1 = require_mixpanel();
	const randomAlphabetical$1 = require_randomAlphabetical();
	const API_BASE = "https://api.figma.com/v1/";
	const FIGMA_URL = "https://www.figma.com/";
	const FIGMA_CLIENT_ID = process.env.FIGMA_CLIENT_ID || "tmhDo4V12I3fEiQ9OG8EHh";
	const IS_FIGMA_FILE_RE = /\.figma$/;
	const IS_FIGMA_FOLDER_RE = /\.figma\.contents/;
	const FIGMA_DEFAULT_FILENAME = "Untitled";
	const VALID_TYPES = {
		SLICE: "SLICE",
		GROUP: "GROUP",
		FRAME: "FRAME",
		COMPONENT: "COMPONENT"
	};
	const FOLDERS = {
		[VALID_TYPES.SLICE]: "slices/",
		[VALID_TYPES.GROUP]: "groups/",
		[VALID_TYPES.COMPONENT]: "groups/",
		[VALID_TYPES.FRAME]: "frames/"
	};
	const MAX_ITEMS_TO_IMPORT = 100;
	const PRIORITY_TO_IMPORT = [
		VALID_TYPES.SLICE,
		VALID_TYPES.GROUP,
		VALID_TYPES.FRAME,
		VALID_TYPES.COMPONENT
	];
	const uniqueNameResolver = {};
	const PHONY_FIGMA_FILE$1 = "phony-haiku-helper-file.svg";
	/**
	* @class Figma
	* @description
	*  Collection of static class methods and constants related to Figma assets.
	*/
	var Figma$3 = class Figma$3 {
		constructor({ token: token$2, requestLib = request }) {
			this._token = token$2;
			this._requestLib = requestLib;
		}
		set token(token$2) {
			this._token = token$2;
		}
		get token() {
			return this._token;
		}
		/**
		* Imports SVGs from a Figma url in the given path
		* @param {object} params
		* @param {string} params.url
		* @param {string} params.projectFolder
		* @returns {Promise}
		*/
		importSVG({ url: url$2, projectFolder }) {
			const { id: id$1 } = Figma$3.parseProjectURL(url$2);
			let assetBaseFolder;
			logger$12.info(`[figma] about to import document with id ${id$1}`);
			mixpanel$1.haikuTrack("creator:figma:fileImport:start");
			return new Promise((resolve, reject) => {
				this.fetchDocument(id$1).then((rawDocument) => {
					const document$1 = JSON.parse(rawDocument);
					assetBaseFolder = `${path$13.join(projectFolder, "designs", `${id$1}-${document$1.name}.figma`)}.contents`;
					this.createFolders(assetBaseFolder);
					return document$1;
				}).then((document$1) => this.findInstantiableElements(document$1, id$1)).then((elements) => this.sortElementsByPriorityToImport(elements)).then((elements) => this.getSVGLinks(elements, id$1)).then((elements) => this.getSVGContents(elements)).then((elements) => this.writeSVGInDisk(elements, assetBaseFolder)).then((elements) => {
					mixpanel$1.haikuTrack("creator:figma:fileImport:success");
					resolve(elements.length);
				}).catch(reject);
			});
		}
		/**
		* Fetch document info from the Figma API
		* @param {string} id
		* @returns {Promise}
		*/
		fetchDocument(id$1) {
			const uri = `${API_BASE}files/${id$1}`;
			return this.request({ uri });
		}
		/**
		* Create necessary folders
		* @param {string} assetBaseFolder
		*/
		createFolders(assetBaseFolder) {
			return new Promise((resolve, reject) => {
				try {
					fse$6.emptyDirSync(assetBaseFolder);
					const sliceFolder = path$13.join(assetBaseFolder, FOLDERS[VALID_TYPES.SLICE]);
					fse$6.mkdirpSync(sliceFolder);
					const groupFolder = path$13.join(assetBaseFolder, FOLDERS[VALID_TYPES.GROUP]);
					fse$6.mkdirpSync(groupFolder);
					const frameFolder = path$13.join(assetBaseFolder, FOLDERS[VALID_TYPES.FRAME]);
					fse$6.mkdirpSync(frameFolder);
					fse$6.ensureFileSync(path$13.join(sliceFolder, PHONY_FIGMA_FILE$1));
					resolve(true);
				} catch (error) {
					reject(error);
				}
			});
		}
		/**
		* Write an array of elements containing SVG info into disk
		* @param {Array} elements
		* @param {string} assetBaseFolder
		* @returns {Promise}
		*/
		writeSVGInDisk(elements, assetBaseFolder) {
			logger$12.info("[figma] writing SVGs in disk");
			return Promise.all(elements.map((element) => {
				if (element) {
					const folder = FOLDERS[element.type] || FOLDERS.SLICE;
					const svgPath = path$13.join(assetBaseFolder, folder, `${sanitize(element.name)}.svg`);
					return fse$6.writeFile(svgPath, element.svg || "<svg version=\"1.1\" xmlns=\"http://www.w3.org/2000/svg\"></svg>");
				}
			}));
		}
		/**
		* Maps an array of elements with URLs pointing to SVG resources to elements
		* with actual SVG markup as a string property
		* @param {Array} elements
		*/
		getSVGContents(elements) {
			logger$12.info("[figma] downloading SVGs from cloud");
			const requests = elements.map((element) => {
				return new Promise((resolve, reject) => {
					this.request({
						uri: element.svgURL,
						auth: false
					}).then((svg) => {
						resolve(Object.assign(element, { svg }));
					}).catch((error) => {
						logger$12.error(`[figma] failed to import slice or group: ${JSON.stringify(element)}`, error);
						resolve();
					});
				});
			});
			return Promise.all(requests);
		}
		/**
		* Maps an array of elements into an array of elements with links to their
		* SVG representation in the cloud via the Figma API
		* @param {Array} elements
		* @param {string} id
		* @returns {Promise}
		*/
		getSVGLinks(elements, id$1) {
			return new Promise((resolve, reject) => {
				let ids = elements.map((element) => element.id);
				if (ids.length === 0) return reject({
					status: 424,
					err: "It looks like the Figma document you imported doesn't have any groups or slices. Try adding some and re-syncing."
				});
				if (ids.length > MAX_ITEMS_TO_IMPORT) ids = ids.slice(0, MAX_ITEMS_TO_IMPORT);
				const uri = `${API_BASE}images/${id$1}?${new URLSearchParams([
					["format", "svg"],
					["ids", ids],
					["svg_include_id", true]
				]).toString()}`;
				this.request({ uri }).then((SVGLinks) => {
					const { images } = JSON.parse(SVGLinks);
					resolve(elements.map((element) => {
						return Object.assign(element, { svgURL: images[element.id] });
					}));
				}).catch(reject);
			});
		}
		sortElementsByPriorityToImport(arr$1) {
			return arr$1.sort((a, b) => PRIORITY_TO_IMPORT.indexOf(a.type) - PRIORITY_TO_IMPORT.indexOf(b.type));
		}
		findItems(arr$1, fileId) {
			const result = [];
			for (const item of arr$1) {
				if (VALID_TYPES[item.type] || item.exportSettings && item.exportSettings.length > 0) result.push({
					id: item.id,
					name: Figma$3.getUniqueName(fileId, item.name),
					type: item.type
				});
				if (item.children) result.push(...this.findItems(item.children, fileId));
			}
			return result;
		}
		findInstantiableElements(file, fileId) {
			uniqueNameResolver[fileId] = {};
			return this.findItems(file.document.children, fileId);
		}
		request({ uri, auth = true }) {
			const headers = auth ? { Authorization: `Bearer ${this.token}` } : {};
			return new Promise((resolve, reject) => {
				this._requestLib({
					uri,
					headers
				}, (error, response, body) => {
					if (error || response.statusCode !== 200) try {
						reject(JSON.parse(body));
					} catch (e) {
						reject({
							status: 500,
							err: "There was an error connecting with Figma."
						});
					}
					else resolve(body);
				});
			});
		}
		/**
		* Parse a Figma URL and return the name and the id of the file it references
		* @param {string} rawURL must be a string in the format 'protocol://host/id/name
		* @returns {object} an object containing the id and the name in the URL
		*/
		static parseProjectURL(rawURL) {
			logger$12.info(`[figma] parsing project URL: ${rawURL}`);
			try {
				const [_$2, __, id$1, name] = new URL(rawURL).pathname.split("/");
				if (!id$1) return null;
				return {
					id: id$1,
					name: name || FIGMA_DEFAULT_FILENAME
				};
			} catch (e) {
				return null;
			}
		}
		/**
		* Build a link to a Figma file based on the ID and the name
		* @param {string} fileID
		* @param {string} fileName
		* @returns {string}
		*/
		static buildFigmaLink(fileID, fileName = "") {
			return `${FIGMA_URL}file/${fileID}/${fileName}`;
		}
		/**
		* Build a OAuth link
		* @returns {string}
		*/
		static buildAuthenticationLink() {
			const state = randomAlphabetical$1(15);
			return {
				url: `${FIGMA_URL}oauth?client_id=${FIGMA_CLIENT_ID}&redirect_uri=${`haiku://oauth/figma&scope=file_read&state=${state}&response_type=code`}`,
				state
			};
		}
		/**
		* Request inkstone for a Figma access token
		* @param {object} params
		* @param {string} params.code
		* @param {string} params.state
		* @param {string} params.stateCheck
		*/
		static getAccessToken({ code, state, stateCheck }) {
			return new Promise((resolve, reject) => {
				if (state !== stateCheck) reject({
					status: 403,
					err: "Invalid state code"
				});
				inkstone.integrations.getFigmaAccessToken(code, (error, response) => {
					error ? reject(error) : resolve(response);
				});
			});
		}
		/**
		* Checks if a path points to a Figma file
		* @param {string} path
		* @returns {boolean}
		*/
		static isFigmaFile(path$20) {
			return !!path$20 && path$20.match(IS_FIGMA_FILE_RE);
		}
		/**
		* Checks if a path points to a Figma folder
		* @param {string} path
		* @returns {boolean}
		*/
		static isFigmaFolder(path$20) {
			return !!path$20 && path$20.match(IS_FIGMA_FOLDER_RE);
		}
		/**
		* Tries to find an ID from a Figma path
		* @param {string} relpath
		* @returns {string|boolean}
		*/
		static findIDFromPath(relpath) {
			const match = path$13.basename(relpath).match(/(\w+)-/);
			return match && match[1];
		}
		/**
		* Tries to find the asset name from a Figma path
		* @param {string} relpath
		* @returns {string}
		*/
		static findDisplayNameFromPath(relpath) {
			const match = path$13.basename(relpath).match(/(\w+)-([\w-]+)\./);
			return match ? match[2] : FIGMA_DEFAULT_FILENAME;
		}
		static buildFigmaLinkFromPath(relpath) {
			const id$1 = Figma$3.findIDFromPath(relpath);
			return Figma$3.buildFigmaLink(id$1);
		}
		/**
		* Using uniqueNameResolver hashmap, retrieve a unique name for this Figma sync. This allows duplicate names on slices
		* while still allowing us to fetch and write out SVG contents async.
		* @param {string} fileId
		* @param {string} name
		* @returns {string}
		*/
		static getUniqueName(fileId, name) {
			if (!uniqueNameResolver[fileId]) uniqueNameResolver[fileId] = {};
			if (!uniqueNameResolver[fileId].hasOwnProperty(name)) {
				uniqueNameResolver[fileId][name] = 0;
				return name;
			}
			return `${name} Copy ${++uniqueNameResolver[fileId][name]}`;
		}
	};
	module.exports = {
		Figma: Figma$3,
		PHONY_FIGMA_FILE: PHONY_FIGMA_FILE$1,
		FIGMA_DEFAULT_FILENAME,
		MAX_ITEMS_TO_IMPORT
	};
}) });

//#endregion
//#region src/bll/Illustrator.js
var require_Illustrator = /* @__PURE__ */ __commonJS({ "src/bll/Illustrator.js": ((exports, module) => {
	const { execSync: execSync$1 } = require("node:child_process");
	const os$1 = require("node:os");
	const path$12 = require("node:path");
	const { isMac: isMac$2, isWindows: isWindows$1 } = require("haiku-common");
	const fse$5 = require("haiku-fs-extra");
	const uuid = require("uuid");
	const { stringifyPath } = require_fileManipulation();
	const logger$11 = require_LoggerInstance();
	const IS_ILLUSTRATOR_FILE_RE = /\.ai$/;
	const IS_ILLUSTRATOR_FOLDER_RE = /\.ai\.contents/;
	let cachedWindowsInstallPath = null;
	/**
	* This template script runs inside Illustrator and perform the export of the
	* artboards as SVG files.
	*
	* Full documentation of Illustrator scripting can be found [in the official reference][1].
	*
	* note: this script needs to be dinamically defined because the DESTINATION_PATH
	* string changes from import to import.
	*
	* [1]: https://wwwimages2.adobe.com/content/dam/acom/en/devnet/illustrator/pdf/Illustrator_JavaScript_Scripting_Reference_2017.pdf
	*/
	const EXPORTER_SCRIPT = `
  if (app.documents.length > 0) {
    var exportOptions = new ExportOptionsSVG()
    var type = ExportType.SVG
    var dest = 'DESTINATION_PATH'
    var sourcePath = 'SOURCE_PATH'
    var fileSpec = new File(dest)

    // Try open/focus on the file to export
    app.open(new File(sourcePath))

    var srcFile = app.activeDocument.fullName;

    // Export options can be further customized, check out the documentation.
    exportOptions.embedRasterImages = true
    exportOptions.embedAllFonts = false
    exportOptions.cssProperties = SVGCSSPropertyLocation.PRESENTATIONATTRIBUTES
    exportOptions.fontSubsetting = SVGFontSubsetting.None
    exportOptions.fontType = SVGFontType.OUTLINEFONT
    exportOptions.documentEncoding = SVGDocumentEncoding.UTF8
    exportOptions.saveMultipleArtboards = true

    // Export all artboards in the current document
    app.activeDocument.exportFile(fileSpec, type, exportOptions)

    // Unfortunately exporting artboards sets the exported file as the current
    // active document, so we need to close it, and open the original ai file
    app.activeDocument.close(SaveOptions.DONOTSAVECHANGES);
    app.open(srcFile);
  }
`;
	var Illustrator$3 = class Illustrator$3 {
		/**
		* Checks if the file provided looks like an Illustrator file.
		* @param {string} abspath
		* @returns {boolean}
		*/
		static isIllustratorFile(abspath) {
			return abspath.match(IS_ILLUSTRATOR_FILE_RE);
		}
		/**
		* Checks if the folder provided looks like a folder that should contain
		* Illustrator assets.
		* @param {string} abspath
		* @returns {boolean}
		*/
		static isIllustratorFolder(abspath) {
			return !!abspath && abspath.match(IS_ILLUSTRATOR_FOLDER_RE);
		}
		/**
		* Import artboards as SVG files from an Illustrator document
		* @param {string} abspath
		* @returns {boolean}
		*/
		static importSVG({ abspath, tryToOpenFile }) {
			if (!Illustrator$3.isIllustratorFile(abspath)) return false;
			logger$11.info("[illustrator] got", abspath);
			const assetBaseFolder = `${abspath}.contents`;
			const artboardFolder = path$12.join(assetBaseFolder, "artboards/");
			fse$5.emptyDirSync(assetBaseFolder);
			fse$5.mkdirpSync(artboardFolder);
			logger$11.info("[illustrator] running commands");
			const tmpdir = os$1.tmpdir();
			const fileName = `${uuid.v4()}.jsx`;
			const exportScriptPath = path$12.join(tmpdir, fileName);
			const exportScript = EXPORTER_SCRIPT.replace("DESTINATION_PATH", stringifyPath(artboardFolder)).replace("SOURCE_PATH", stringifyPath(abspath));
			fse$5.writeFileSync(exportScriptPath, exportScript);
			if (tryToOpenFile) {
				execSync$1(Illustrator$3.openIllustratorFile(abspath));
				setTimeout(() => Illustrator$3.openIllustratorFile(exportScriptPath), 5e3);
			} else execSync$1(Illustrator$3.openIllustratorFile(exportScriptPath));
			return true;
		}
		static openIllustratorFile(file) {
			if (isMac$2()) return `open -g -b com.adobe.Illustrator ${file}`;
			if (isWindows$1()) return `"${Illustrator$3.getWindowsIllustratorPath()}" "${file}"`;
		}
		static getWindowsIllustratorPath() {
			if (cachedWindowsInstallPath) return cachedWindowsInstallPath;
			let illustratorPath;
			try {
				illustratorPath = execSync$1("reg QUERY \"HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths\" /s").toString().split("\n").find((record) => record.includes("Illustrator") && record.includes("Default")).match(/([a-z]:.+)/gi)[0];
			} catch (error) {
				logger$11.info("[illustrator] error finding Illustrator: ", error);
				return;
			}
			if (!illustratorPath) {
				logger$11.info("[illustrator] unable to find an Illustrator installation");
				return;
			}
			cachedWindowsInstallPath = illustratorPath;
			return illustratorPath;
		}
	};
	module.exports = Illustrator$3;
}) });

//#endregion
//#region src/bll/MathUtils.js
var require_MathUtils = /* @__PURE__ */ __commonJS({ "src/bll/MathUtils.js": ((exports, module) => {
	const pointInPolygon = require("point-in-polygon");
	function isCoordInsideRect(px, py, rect) {
		return rect.left <= px && px <= rect.right && rect.top <= py && py <= rect.bottom;
	}
	function rounded$1(n, d = 3) {
		const powerOfTen = 10 ** d;
		return Math.round(n * powerOfTen) / powerOfTen;
	}
	const basicallyEquals$1 = (n, m) => typeof n === "number" && typeof m === "number" && Math.abs(n - m) < .001;
	function isCoordInsideBoxPoints(px, py, boxPoints) {
		return pointInPolygon([px, py], [
			[boxPoints[0].x, boxPoints[0].y],
			[boxPoints[2].x, boxPoints[2].y],
			[boxPoints[8].x, boxPoints[8].y],
			[boxPoints[6].x, boxPoints[6].y]
		]);
	}
	function modOfIndex(idx, max) {
		return (idx % max + max) % max;
	}
	function roundUp(numToRound, multiple) {
		if (multiple === 0) return numToRound;
		const remainder = Math.abs(numToRound) % multiple;
		if (remainder === 0) return numToRound;
		if (numToRound < 0) return -(Math.abs(numToRound) - remainder);
		return numToRound + multiple - remainder;
	}
	function transformFourVectorByMatrix$1(out$1, v, m) {
		out$1[0] = m[0] * v[0] + m[4] * v[1] + m[8] * v[2] + m[12] * v[3];
		out$1[1] = m[1] * v[0] + m[5] * v[1] + m[9] * v[2] + m[13] * v[3];
		out$1[2] = m[2] * v[0] + m[6] * v[1] + m[10] * v[2] + m[14] * v[3];
		out$1[3] = m[3] * v[0] + m[7] * v[1] + m[11] * v[2] + m[15] * v[3];
	}
	module.exports = {
		basicallyEquals: basicallyEquals$1,
		rounded: rounded$1,
		isCoordInsideRect,
		isCoordInsideBoxPoints,
		modOfIndex,
		roundUp,
		transformFourVectorByMatrix: transformFourVectorByMatrix$1
	};
}) });

//#endregion
//#region src/utils/sketchUtils.js
var require_sketchUtils = /* @__PURE__ */ __commonJS({ "src/utils/sketchUtils.js": ((exports, module) => {
	const { exec } = require("node:child_process");
	const path$11 = require("node:path");
	const { isMac: isMac$1 } = require("haiku-common");
	const logger$10 = require_LoggerInstance();
	const SKETCH_PATH_FINDER = `mdfind "kMDItemKind == 'Application'" | grep Sketch.app`;
	const PARSER_CLI_PATH$1 = "/Contents/Resources/sketchtool/bin/sketchtool";
	let sketchInstalledCache = null;
	module.exports = {
		dumpToPaths(rawDump) {
			logger$10.info("[sketch utils] about to parse Sketch paths", rawDump);
			return rawDump.trim().split("\n").filter(Boolean);
		},
		pathsToInstallationInfo(sketchPaths) {
			const resolvingSketchPaths = sketchPaths.map((sketchPath) => {
				return new Promise((resolve, reject) => {
					exec(`${path$11.join(sketchPath, PARSER_CLI_PATH$1)} --version`, (error, stdout, stderr) => {
						if (error || !stdout || stdout.trim().length === 0 || stderr) return resolve(null);
						const rawBuildNumber = stdout.match(/\((.*?)\)/)[1];
						return resolve({
							sketchPath,
							sketchtoolBuildNumber: Number(rawBuildNumber)
						});
					});
				});
			});
			return Promise.all(resolvingSketchPaths);
		},
		getDumpInfo() {
			return new Promise((resolve, reject) => {
				exec(SKETCH_PATH_FINDER, (error, stdout, stderr) => {
					if (error || !stdout || stdout.trim().length === 0 || stderr) reject(error);
					return resolve(stdout, stderr);
				});
			});
		},
		findBestPath(sketchPaths) {
			const sortedPaths = sketchPaths.filter(Boolean).sort((a, b) => b.sketchtoolBuildNumber - a.sketchtoolBuildNumber);
			return sortedPaths[0] && sortedPaths[0].sketchPath;
		},
		unsetSketchInstalledCache() {
			sketchInstalledCache = null;
		},
		checkIfInstalled() {
			if (isMac$1()) return new Promise((resolve, reject) => {
				if (sketchInstalledCache !== null) return resolve(sketchInstalledCache);
				this.getDumpInfo().then(this.dumpToPaths).then(this.pathsToInstallationInfo).then(this.findBestPath).then((path$20) => {
					sketchInstalledCache = Boolean(path$20);
					resolve(path$20);
				}).catch((error) => {
					logger$10.info("[sketch utils] error finding Sketch: ", error);
					sketchInstalledCache = false;
					resolve(false);
				});
			});
			logger$10.info("[sketch utils] Platform does not support Sketch");
			return new Promise((resolve, reject) => {
				resolve(null);
			});
		}
	};
}) });

//#endregion
//#region src/bll/Sketch.js
var require_Sketch = /* @__PURE__ */ __commonJS({ "src/bll/Sketch.js": ((exports, module) => {
	const { execSync } = require("node:child_process");
	const path$10 = require("node:path");
	const fse$4 = require("haiku-fs-extra");
	const { PNG } = require("pngjs");
	const sketchUtils$1 = require_sketchUtils();
	const logger$9 = require_LoggerInstance();
	const BaseModel$19 = require_BaseModel();
	const LOOKS_LIKE_SLICE = /\.sketch\.contents\/slices\//;
	const LOOKS_LIKE_ARTBOARD = /\.sketch\.contents\/artboards\//;
	const LOOKS_LIKE_PAGE = /\.sketch\.contents\/pages\//;
	const IS_SKETCH_FILE_RE = /\.sketch$/;
	const IS_SKETCH_FOLDER_RE = /\.sketch\.contents/;
	const PARSER_CLI_PATH = "/Contents/Resources/sketchtool/bin/sketchtool";
	const BASE64_BITMAP_RE = /"data:image\/(png|jpe?g|gif);base64,(.*?)"/gi;
	/**
	* @class Sketch
	* @description
	*  Collection of static class methods and constants related to Sketch assets.
	*/
	var Sketch$3 = class extends BaseModel$19 {};
	Sketch$3.INSTALL_PATH = "/Applications/Sketch.app";
	Sketch$3.findAndUpdateInstallPath = () => {
		sketchUtils$1.checkIfInstalled().then((possibleSketchPath) => {
			Sketch$3.INSTALL_PATH = possibleSketchPath || Sketch$3.INSTALL_PATH;
		});
	};
	Sketch$3.DEFAULT_OPTIONS = { required: {} };
	BaseModel$19.extend(Sketch$3);
	Sketch$3.looksLikeSlice = (relpath) => {
		return relpath.match(LOOKS_LIKE_SLICE);
	};
	Sketch$3.looksLikeArtboard = (relpath) => {
		return relpath.match(LOOKS_LIKE_ARTBOARD);
	};
	Sketch$3.looksLikePage = (relpath) => {
		return relpath.match(LOOKS_LIKE_PAGE);
	};
	Sketch$3.isSketchFile = (abspath) => {
		return abspath.match(IS_SKETCH_FILE_RE);
	};
	Sketch$3.isSketchFolder = (abspath) => {
		return !!abspath && abspath.match(IS_SKETCH_FOLDER_RE);
	};
	Sketch$3.exportFolderPath = (sketchRelpath) => {
		const expectedExportFolderName = `${path$10.basename(sketchRelpath, path$10.extname(sketchRelpath))}.sketch.contents`;
		return path$10.join(path$10.dirname(sketchRelpath), expectedExportFolderName);
	};
	Sketch$3.sketchtoolPipeline = (abspath) => {
		const sketchtoolPath = Sketch$3.INSTALL_PATH + PARSER_CLI_PATH;
		if (!Sketch$3.isSketchFile(abspath)) return;
		if (!fse$4.existsSync(sketchtoolPath)) return;
		logger$9.info("[sketchtool] got", abspath);
		const assetBaseFolder = `${abspath}.contents/`;
		fse$4.emptyDirSync(assetBaseFolder);
		const sliceFolder = `${assetBaseFolder}slices/`;
		fse$4.mkdirpSync(sliceFolder);
		const artboardFolder = `${assetBaseFolder}artboards/`;
		fse$4.mkdirpSync(artboardFolder);
		logger$9.info("[sketchtool] running commands");
		execSync(`${sketchtoolPath} export --format=svg --output=${_escapeShell(sliceFolder)} slices ${_escapeShell(abspath)}`);
		execSync(`${sketchtoolPath} export --format=svg --output=${_escapeShell(artboardFolder)} artboards ${_escapeShell(abspath)}`);
		logger$9.info("[sketchtool] fix gamma correction");
		fse$4.walkSync(assetBaseFolder).forEach((outputEntry) => {
			if (path$10.extname(outputEntry) !== ".svg") return;
			const outputContents = fse$4.readFileSync(outputEntry).toString();
			let numImageMatches = 0;
			const updatedContents = outputContents.replace(BASE64_BITMAP_RE, (matchString, imageFormat, base64data) => {
				return matchString.replace(base64data, _processBase64ImageData(base64data, imageFormat, outputEntry, numImageMatches++));
			});
			fse$4.writeFileSync(outputEntry, updatedContents);
		});
		return true;
	};
	function _escapeShell(cmd) {
		return cmd.replace(/(["\s'$`\\])/g, "\\$1");
	}
	function _processBase64ImageData(base64data, imageFormat, fileAbspath, bitmapIndex) {
		if (imageFormat === "png") {
			const imageBufferData = Buffer.from(base64data, "base64");
			const pngInstance = PNG.sync.read(imageBufferData);
			pngInstance.gamma = 1 / 2.2;
			PNG.adjustGamma(pngInstance);
			return PNG.sync.write(pngInstance).toString("base64");
		}
		return base64data;
	}
	module.exports = Sketch$3;
}) });

//#endregion
//#region src/bll/Property.js
var require_Property = /* @__PURE__ */ __commonJS({ "src/bll/Property.js": ((exports, module) => {
	const { getFallback } = require("@haiku/core/lib/HaikuComponent");
	const decamelize$1 = require("decamelize");
	const { Experiment: Experiment$6, experimentIsEnabled: experimentIsEnabled$6 } = require("haiku-common");
	const titlecase$1 = require("titlecase");
	const BaseModel$18 = require_BaseModel();
	function decam(s) {
		return decamelize$1(s).replace(/[\W_]/g, " ");
	}
	/**
	* @class Property
	* @description
	*  Collection of static class methods for dealing with component properties.
	*/
	var Property$6 = class extends BaseModel$18 {};
	Property$6.DEFAULT_OPTIONS = { required: {} };
	BaseModel$18.extend(Property$6);
	Property$6.assignDOMSchemaProperties = (out$1, element) => {
		const schema = Property$6.BUILTIN_DOM_SCHEMAS[element.getSafeDomFriendlyName()] || {};
		for (const name in schema) {
			let propertyGroup = null;
			const nameParts = name.split(".");
			const fallback = getFallback(element.getSafeDomFriendlyName(), name);
			propertyGroup = {
				type: "native",
				name,
				prefix: nameParts[0],
				suffix: nameParts[1],
				fallback,
				typedef: schema[name],
				mock: void 0,
				target: element,
				value: void 0
			};
			if (propertyGroup) {
				if (nameParts[0] && nameParts[1]) propertyGroup.cluster = {
					prefix: nameParts[0],
					name: Property$6.PREFIX_TO_CLUSTER_NAME[nameParts[0]] || nameParts[0]
				};
				out$1[name] = propertyGroup;
			}
		}
	};
	Property$6.doesPropertyGroupContainRotation = (propertyGroup) => {
		return propertyGroup["rotation.x"] || propertyGroup["rotation.y"] || propertyGroup["rotation.z"];
	};
	Property$6.sort = (a, b) => {
		return a.name > b.name;
	};
	Property$6.humanizePropertyName = (propertyName) => {
		if (Property$6.HUMANIZED_PROP_NAMES[propertyName]) return Property$6.HUMANIZED_PROP_NAMES[propertyName];
		return decam(propertyName);
	};
	Property$6.humanizePropertyNamePart = (propertyNamePart) => {
		if (Property$6.PREFIX_TO_CLUSTER_NAME[propertyNamePart]) return Property$6.PREFIX_TO_CLUSTER_NAME[propertyNamePart];
		return titlecase$1(decam(propertyNamePart));
	};
	Property$6.layoutSpecAsProperties = (spec) => {
		return {
			"shown": spec.shown,
			"opacity": spec.opacity,
			"offset.x": spec.offset.x,
			"offset.y": spec.offset.y,
			"offset.z": spec.offset.z,
			"origin.x": spec.origin.x,
			"origin.y": spec.origin.y,
			"origin.z": spec.origin.z,
			"translation.x": spec.translation.x,
			"translation.y": spec.translation.y,
			"translation.z": spec.translation.z,
			"rotation.x": spec.rotation.x,
			"rotation.y": spec.rotation.y,
			"rotation.z": spec.rotation.z,
			"scale.x": spec.scale.x,
			"scale.y": spec.scale.y,
			"scale.z": spec.scale.z,
			"shear.xy": spec.shear.xy,
			"shear.xz": spec.shear.xz,
			"shear.yz": spec.shear.yz,
			"sizeMode.x": spec.sizeMode.x,
			"sizeMode.y": spec.sizeMode.y,
			"sizeMode.z": spec.sizeMode.z,
			"sizeProportional.x": spec.sizeProportional.x,
			"sizeProportional.y": spec.sizeProportional.y,
			"sizeProportional.z": spec.sizeProportional.z,
			"sizeDifferential.x": spec.sizeDifferential.x,
			"sizeDifferential.y": spec.sizeDifferential.y,
			"sizeDifferential.z": spec.sizeDifferential.z,
			"sizeAbsolute.x": spec.sizeAbsolute.x,
			"sizeAbsolute.y": spec.sizeAbsolute.y,
			"sizeAbsolute.z": spec.sizeAbsolute.z
		};
	};
	/**
	* Used for rendering human-friendly cluster property headings in the Timeline UI
	*/
	Property$6.PREFIX_TO_CLUSTER_NAME = {
		mount: "Mount",
		offset: "Offset",
		origin: "Origin",
		translation: "Position",
		rotation: "Rotation",
		scale: "Scale",
		shear: "Shear",
		sizeMode: "Sizing Mode",
		sizeProportional: "Size %",
		sizeDifferential: "Size +/-",
		sizeAbsolute: "Size",
		overflow: "Overflow",
		style: "Style"
	};
	/**
	* Used for rendering human-friendly property labels in the Timeline UI
	*/
	Property$6.HUMANIZED_PROP_NAMES = {
		"rotation.z": "Rotation Z",
		"rotation.y": "Rotation Y",
		"rotation.x": "Rotation X",
		"shear.xy": "Shear X / Y",
		"shear.xz": "Shear X / Z",
		"shear.yz": "Shear Y / Z",
		"translation.x": "Position X",
		"translation.y": "Position Y",
		"translation.z": "Position Z",
		"sizeAbsolute.x": "Size X",
		"sizeAbsolute.y": "Size Y",
		"style.overflowX": "Overflow X",
		"style.overflowY": "Overflow Y",
		"origin.x": "Origin X",
		"origin.y": "Origin Y"
	};
	/**
	* Pruned-down enumeration of properties that can be applied to various DOM element types.
	* Unlike the property enumerations in @haiku/core, this dictionary only holds properties
	* that are usable in Haiku Desktop. Additional display precedence rules may effect whether
	* these ultimately display in the Timeline UI, but this is the foundation.
	*/
	Property$6.BUILTIN_DOM_SCHEMAS = {
		div: {
			"sizeAbsolute.x": "number",
			"sizeAbsolute.y": "number",
			"playback": "any",
			"controlFlow.placeholder": "any",
			"controlFlow.repeat": "any",
			"controlFlow.if": "any",
			"opacity": "number",
			"translation.x": "number",
			"translation.y": "number",
			"translation.z": "number",
			"rotation.x": "number",
			"rotation.y": "number",
			"rotation.z": "number",
			"scale.x": "number",
			"scale.y": "number",
			"origin.x": "number",
			"origin.y": "number",
			"shear.xy": "number",
			"shear.xz": "number",
			"shear.yz": "number",
			"style.background": "string",
			"style.backgroundColor": "string",
			"style.border": "string",
			"style.borderBottom": "string",
			"style.borderLeft": "string",
			"style.borderRight": "string",
			"style.borderTop": "string",
			"style.color": "string",
			"style.cursor": "string",
			"style.fontFamily": "string",
			"style.fontSize": "string",
			"style.fontStyle": "string",
			"style.fontWeight": "string",
			"style.overflowY": "string",
			"style.overflowX": "string",
			"style.textTransform": "string",
			"style.pointerEvents": "string",
			"style.perspective": "string",
			"style.transformStyle": "string",
			"style.verticalAlign": "string",
			"style.zIndex": "number",
			"style.WebkitTapHighlightColor": "string"
		},
		svg: {
			"controlFlow.placeholder": "any",
			"controlFlow.repeat": "any",
			"controlFlow.if": "any",
			"opacity": "number",
			"translation.x": "number",
			"translation.y": "number",
			"translation.z": "number",
			"rotation.x": "number",
			"rotation.y": "number",
			"rotation.z": "number",
			"scale.x": "number",
			"scale.y": "number",
			"shear.xy": "number",
			"shear.xz": "number",
			"shear.yz": "number",
			"origin.x": "number",
			"origin.y": "number",
			"style.border": "string",
			"style.borderBottom": "string",
			"style.borderLeft": "string",
			"style.borderRight": "string",
			"style.borderTop": "string",
			"style.color": "string",
			"style.cursor": "string",
			"style.pointerEvents": "string",
			"style.zIndex": "number",
			"style.WebkitTapHighlightColor": "string"
		},
		g: {},
		circle: {
			r: "string",
			cx: "string",
			cy: "string",
			stroke: "string",
			strokeDasharray: "string",
			strokeDashoffset: "number",
			strokeWidth: "string",
			strokeOpacity: "string",
			fill: "string",
			fillRule: "string",
			fillOpacity: "string"
		},
		ellipse: {
			rx: "string",
			ry: "string",
			cx: "string",
			cy: "string",
			stroke: "string",
			strokeDasharray: "string",
			strokeDashoffset: "number",
			strokeWidth: "string",
			strokeOpacity: "string",
			fill: "string",
			fillRule: "string",
			fillOpacity: "string"
		},
		rect: {
			rx: "string",
			ry: "string",
			stroke: "string",
			strokeDasharray: "string",
			strokeDashoffset: "number",
			strokeWidth: "string",
			strokeOpacity: "string",
			fill: "string",
			fillRule: "string",
			fillOpacity: "string",
			width: "number",
			height: "number"
		},
		line: {
			x1: "string",
			y1: "string",
			x2: "string",
			y2: "string",
			stroke: "string",
			strokeDasharray: "string",
			strokeDashoffset: "number",
			strokeWidth: "string",
			strokeOpacity: "string"
		},
		polyline: {
			points: "string",
			stroke: "string",
			strokeDasharray: "string",
			strokeDashoffset: "number",
			strokeWidth: "string",
			strokeOpacity: "string",
			fill: "string",
			fillRule: "string",
			fillOpacity: "string"
		},
		polygon: {
			points: "string",
			stroke: "string",
			strokeDasharray: "string",
			strokeDashoffset: "number",
			strokeWidth: "string",
			strokeOpacity: "string",
			fill: "string",
			fillRule: "string",
			fillOpacity: "string"
		},
		path: {
			d: "string",
			stroke: "string",
			strokeDasharray: "string",
			strokeDashoffset: "number",
			strokeWidth: "string",
			strokeOpacity: "string",
			fill: "string",
			fillRule: "string",
			fillOpacity: "string"
		},
		text: {
			x: "string",
			y: "string",
			stroke: "string",
			strokeDasharray: "string",
			strokeDashoffset: "number",
			strokeWidth: "string",
			strokeOpacity: "string",
			fill: "string",
			fillRule: "string",
			fillOpacity: "string",
			fontFamily: "string",
			fontSize: "string",
			fontVariant: "string",
			fontWeight: "string",
			fontStyle: "string",
			alignmentBaseline: "string",
			textAnchor: "string",
			letterSpacing: "string",
			wordSpacing: "string",
			kerning: "string",
			content: "string"
		},
		tspan: {
			x: "string",
			y: "string",
			stroke: "string",
			strokeDasharray: "string",
			strokeDashoffset: "number",
			strokeWidth: "string",
			strokeOpacity: "string",
			fill: "string",
			fillRule: "string",
			fillOpacity: "string",
			fontFamily: "string",
			fontSize: "string",
			fontVariant: "string",
			fontWeight: "string",
			fontStyle: "string",
			alignmentBaseline: "string",
			textAnchor: "string",
			letterSpacing: "string",
			wordSpacing: "string",
			kerning: "string",
			content: "string"
		},
		image: { href: "string" },
		linearGradient: {
			x1: "string",
			y1: "string",
			x2: "string",
			y2: "string"
		},
		stop: {
			stopColor: "string",
			offset: "string"
		}
	};
	/**
	* Enumeration of SVG element types that may contain text content.
	*/
	Property$6.TEXT_FRIENDLY_SVG_ELEMENTS = {
		text: true,
		textpath: true,
		textPath: true,
		tspan: true
	};
	/**
	* Enumeration of HTML element types that may contain text content.
	*/
	Property$6.TEXT_FRIENDLY_HTML_ELEMENTS = {
		tt: true,
		i: true,
		b: true,
		big: true,
		small: true,
		em: true,
		strong: true,
		code: true,
		cite: true,
		abbr: true,
		acronym: true,
		sub: true,
		sup: true,
		span: true,
		address: true,
		div: true,
		a: true,
		object: true,
		p: true,
		h1: true,
		h2: true,
		h3: true,
		h4: true,
		h5: true,
		h6: true,
		pre: true,
		q: true,
		ins: true,
		del: true,
		dt: true,
		dd: true,
		li: true,
		label: true,
		option: true,
		textarea: true,
		fieldset: true,
		legend: true,
		button: true,
		caption: true,
		td: true,
		th: true,
		script: true,
		style: true
	};
	/**
	* A given mana payload can be converted into a componentization-ready bytecode object,
	* and this enum is used to specify attributes that hoist to become private states.
	*/
	Property$6.PRIVATE_PROPERTY_WHEN_HOISTING_TO_STATE = {
		"transform": true,
		"transformOrigin": true,
		"style.position": true,
		"style.display": true,
		"style.transform": true,
		"style.transformOrigin": true
	};
	Property$6.PREPOPULATED_VALUES = {
		"sizeMode.x": 1,
		"sizeMode.y": 1,
		"sizeMode.z": 1,
		"style.border": "0",
		"style.margin": "0",
		"style.padding": "0",
		"style.overflowX": "hidden",
		"style.overflowY": "hidden",
		"style.WebkitTapHighlightColor": "rgba(0,0,0,0)",
		"style.backgroundColor": "rgba(255,255,255,0)",
		"style.zIndex": 0,
		"translation.x": 0,
		"translation.y": 0,
		"translation.z": 0,
		"rotation.x": 0,
		"rotation.y": 0,
		"rotation.z": 0,
		"scale.x": 1,
		"scale.y": 1,
		"scale.z": 1,
		"shear.xy": 0,
		"shear.xz": 0,
		"shear.yz": 0,
		"offset.x": 0,
		"offset.y": 0,
		"offset.z": 0,
		"origin.x": .5,
		"origin.y": .5,
		"origin.z": .5,
		"opacity": 1
	};
	const NEVER = () => false;
	const ALWAYS = () => true;
	const NON_ROOT_ONLY = (name, element) => !element.isRootElement();
	const ROOT_ONLY = (name, element) => element.isRootElement();
	const NON_COMPONENT_ONLY = (name, element) => !element.isComponent();
	const COMPONENT_ONLY = (name, element) => element.isComponent();
	const ROOT_CHILD_ONLY = (name, element, property, keyframes) => element.isVisuallySelectable;
	function IF_EXPLICIT_OR_DEFINED(name, element, property, keyframes) {
		return IF_EXPLICIT(name, element, property, keyframes) || IF_DEFINED(name, element, property, keyframes);
	}
	const IF_EXPLICIT = (name, element, property, keyframes) => !!element._visibleProperties[name];
	function IF_DEFINED(name, element, property, keyframes) {
		return keyframes && Object.values(keyframes).some((keyframe) => keyframe.edited);
	}
	const IF_CHANGED_FROM_PREPOPULATED_VALUE = (name, element, property, keyframes) => wasChangedFromPrepopValue(name, keyframes);
	const IF_IN_SCHEMA = (name, element) => hasInSchema(element.getSafeDomFriendlyName(), name);
	function IF_TEXT_CONTENT_ENABLED(name, element, property, keyframes) {
		return element.children.length < 1 || typeof element.children[0] === "string";
	}
	function wasChangedFromPrepopValue(name, keyframes) {
		if (Property$6.PREPOPULATED_VALUES[name] === void 0) return true;
		if (!keyframes) return false;
		const keys$1 = Object.keys(keyframes);
		return keys$1.length > 1 || keys$1.length === 1 && (!keyframes[0] || keyframes[0].value !== Property$6.PREPOPULATED_VALUES[name]);
	}
	function hasInSchema(elementName, propertyName) {
		return Property$6.BUILTIN_DOM_SCHEMAS[elementName] && Property$6.BUILTIN_DOM_SCHEMAS[elementName][propertyName];
	}
	Property$6.areAnyKeyframesDefined = (elementName, propertyName, keyframesObject) => {
		const mss = Object.keys(keyframesObject);
		if (mss.length > 1) return true;
		if (Number(mss[0]) !== 0) return true;
		return wasChangedFromPrepopValue(propertyName, keyframesObject);
	};
	/**
	* Enumeration of display rules for properties which may be available for direct editing
	* inside the Timeline UI. A rule is an ordered sequence of display tests, which are functions
	* that return true if the property should be displayed in the scenario, or false if not.
	* All tests must evaluate to true in order for the property to be displayed.
	*/
	Property$6.DISPLAY_RULES = {
		"content": {
			jit: [
				NON_ROOT_ONLY,
				IF_IN_SCHEMA,
				IF_TEXT_CONTENT_ENABLED
			],
			add: [
				NON_ROOT_ONLY,
				IF_IN_SCHEMA,
				IF_TEXT_CONTENT_ENABLED
			]
		},
		"controlFlow.if": {
			jit: [NEVER],
			add: [NEVER]
		},
		"controlFlow.repeat": {
			jit: [NEVER],
			add: [NEVER]
		},
		"controlFlow.placeholder": {
			jit: [NON_ROOT_ONLY, NON_COMPONENT_ONLY],
			add: [IF_EXPLICIT_OR_DEFINED],
			keyframe: [ALWAYS]
		},
		"height": {
			jit: [NEVER],
			add: [IF_DEFINED, IF_IN_SCHEMA],
			keyframe: [ALWAYS]
		},
		"opacity": {
			jit: [NEVER],
			add: [ALWAYS],
			keyframe: [ALWAYS]
		},
		"origin.x": {
			jit: [ROOT_CHILD_ONLY],
			add: [ROOT_CHILD_ONLY, IF_CHANGED_FROM_PREPOPULATED_VALUE],
			keyframe: [ALWAYS]
		},
		"origin.y": {
			jit: [ROOT_CHILD_ONLY],
			add: [ROOT_CHILD_ONLY, IF_CHANGED_FROM_PREPOPULATED_VALUE],
			keyframe: [ALWAYS]
		},
		"playback": {
			jit: [NEVER],
			add: [NON_ROOT_ONLY, COMPONENT_ONLY],
			keyframe: [ALWAYS]
		},
		"rotation.x": {
			jit: [ROOT_CHILD_ONLY],
			add: [ROOT_CHILD_ONLY, IF_CHANGED_FROM_PREPOPULATED_VALUE],
			keyframe: [ALWAYS]
		},
		"rotation.y": {
			jit: [ROOT_CHILD_ONLY],
			add: [ROOT_CHILD_ONLY, IF_CHANGED_FROM_PREPOPULATED_VALUE],
			keyframe: [ALWAYS]
		},
		"rotation.z": {
			jit: [ROOT_CHILD_ONLY],
			add: [ROOT_CHILD_ONLY, IF_CHANGED_FROM_PREPOPULATED_VALUE],
			keyframe: [ALWAYS]
		},
		"scale.x": {
			jit: [ROOT_CHILD_ONLY],
			add: [ROOT_CHILD_ONLY, IF_CHANGED_FROM_PREPOPULATED_VALUE],
			keyframe: [ALWAYS]
		},
		"scale.y": {
			jit: [ROOT_CHILD_ONLY],
			add: [ROOT_CHILD_ONLY, IF_CHANGED_FROM_PREPOPULATED_VALUE],
			keyframe: [ALWAYS]
		},
		"scale.z": {
			jit: [NEVER],
			add: [ROOT_CHILD_ONLY, IF_CHANGED_FROM_PREPOPULATED_VALUE],
			keyframe: [ALWAYS]
		},
		"shear.xy": {
			jit: [NEVER],
			add: [ROOT_CHILD_ONLY, IF_CHANGED_FROM_PREPOPULATED_VALUE],
			keyframe: [ALWAYS]
		},
		"shear.xz": {
			jit: [NEVER],
			add: [ROOT_CHILD_ONLY, IF_CHANGED_FROM_PREPOPULATED_VALUE],
			keyframe: [ALWAYS]
		},
		"shear.yz": {
			jit: [NEVER],
			add: [ROOT_CHILD_ONLY, IF_CHANGED_FROM_PREPOPULATED_VALUE],
			keyframe: [ALWAYS]
		},
		"sizeAbsolute.x": {
			jit: [NON_ROOT_ONLY, COMPONENT_ONLY],
			add: [ROOT_ONLY],
			keyframe: [NON_ROOT_ONLY]
		},
		"sizeAbsolute.y": {
			jit: [NON_ROOT_ONLY, COMPONENT_ONLY],
			add: [ROOT_ONLY],
			keyframe: [NON_ROOT_ONLY]
		},
		"sizeAbsolute.z": {
			jit: [NON_ROOT_ONLY, COMPONENT_ONLY],
			add: [ROOT_ONLY],
			keyframe: [NON_ROOT_ONLY]
		},
		"style.background": {
			jit: [ALWAYS],
			add: [NEVER],
			keyframe: [ALWAYS]
		},
		"style.backgroundColor": {
			jit: [ALWAYS],
			add: [IF_CHANGED_FROM_PREPOPULATED_VALUE],
			keyframe: [ALWAYS]
		},
		"style.border": {
			jit: [NEVER],
			add: [IF_CHANGED_FROM_PREPOPULATED_VALUE],
			keyframe: [ALWAYS]
		},
		"style.cursor": {
			jit: [ALWAYS],
			add: [NEVER],
			keyframe: [ALWAYS]
		},
		"style.fontFamily": {
			jit: [ALWAYS],
			add: [NEVER],
			keyframe: [ALWAYS]
		},
		"style.fontSize": {
			jit: [ALWAYS],
			add: [NEVER],
			keyframe: [ALWAYS]
		},
		"style.fontStyle": {
			jit: [ALWAYS],
			add: [NEVER],
			keyframe: [ALWAYS]
		},
		"style.fontWeight": {
			jit: [ALWAYS],
			add: [NEVER],
			keyframe: [ALWAYS]
		},
		"style.margin": {
			jit: [ALWAYS],
			add: [IF_CHANGED_FROM_PREPOPULATED_VALUE],
			keyframe: [ALWAYS]
		},
		"style.overflowX": {
			jit: [ALWAYS],
			add: [IF_CHANGED_FROM_PREPOPULATED_VALUE],
			keyframe: [ALWAYS]
		},
		"style.overflowY": {
			jit: [ALWAYS],
			add: [IF_CHANGED_FROM_PREPOPULATED_VALUE],
			keyframe: [ALWAYS]
		},
		"style.padding": {
			jit: [ALWAYS],
			add: [IF_CHANGED_FROM_PREPOPULATED_VALUE],
			keyframe: [ALWAYS]
		},
		"style.perspective": {
			jit: [ALWAYS],
			add: [NEVER],
			keyframe: [ALWAYS]
		},
		"style.pointerEvents": {
			jit: [ALWAYS],
			add: [NEVER],
			keyframe: [ALWAYS]
		},
		"style.textTransform": {
			jit: [ALWAYS],
			add: [NEVER],
			keyframe: [ALWAYS]
		},
		"style.transformStyle": {
			jit: [ALWAYS],
			add: [NEVER],
			keyframe: [ALWAYS]
		},
		"style.WebkitTapHighlightColor": {
			jit: [NEVER],
			add: [IF_CHANGED_FROM_PREPOPULATED_VALUE],
			keyframe: [ALWAYS]
		},
		"style.verticalAlign": {
			jit: [ALWAYS],
			add: [NEVER],
			keyframe: [ALWAYS]
		},
		"style.zIndex": {
			jit: [NON_ROOT_ONLY],
			add: [NON_ROOT_ONLY],
			keyframe: [ALWAYS]
		},
		"translation.x": {
			jit: [ROOT_CHILD_ONLY],
			add: [ROOT_CHILD_ONLY, IF_CHANGED_FROM_PREPOPULATED_VALUE],
			keyframe: [ALWAYS]
		},
		"translation.y": {
			jit: [ROOT_CHILD_ONLY],
			add: [ROOT_CHILD_ONLY, IF_CHANGED_FROM_PREPOPULATED_VALUE],
			keyframe: [ALWAYS]
		},
		"translation.z": {
			jit: [ROOT_CHILD_ONLY],
			add: [ROOT_CHILD_ONLY, IF_CHANGED_FROM_PREPOPULATED_VALUE],
			keyframe: [ALWAYS]
		},
		"width": {
			jit: [NEVER],
			add: [IF_DEFINED, IF_IN_SCHEMA],
			keyframe: [ALWAYS]
		},
		"alignmentBaseline": {
			jit: [IF_IN_SCHEMA],
			add: [IF_EXPLICIT],
			keyframe: [ALWAYS]
		},
		"cx": {
			jit: [IF_IN_SCHEMA],
			add: [IF_EXPLICIT_OR_DEFINED],
			keyframe: [ALWAYS]
		},
		"cy": {
			jit: [IF_IN_SCHEMA],
			add: [IF_EXPLICIT_OR_DEFINED],
			keyframe: [ALWAYS]
		},
		"d": {
			jit: [IF_IN_SCHEMA],
			add: [IF_EXPLICIT_OR_DEFINED],
			keyframe: [ALWAYS]
		},
		"fill": {
			jit: [IF_IN_SCHEMA],
			add: [IF_EXPLICIT_OR_DEFINED],
			keyframe: [ALWAYS]
		},
		"fillOpacity": {
			jit: [IF_IN_SCHEMA],
			add: [IF_EXPLICIT],
			keyframe: [ALWAYS]
		},
		"fillRule": {
			jit: [IF_IN_SCHEMA],
			add: [IF_EXPLICIT],
			keyframe: [ALWAYS]
		},
		"fontFamily": {
			jit: [IF_IN_SCHEMA],
			add: [IF_EXPLICIT_OR_DEFINED],
			keyframe: [ALWAYS]
		},
		"fontSize": {
			jit: [IF_IN_SCHEMA],
			add: [IF_EXPLICIT],
			keyframe: [ALWAYS]
		},
		"fontStyle": {
			jit: [IF_IN_SCHEMA],
			add: [IF_EXPLICIT],
			keyframe: [ALWAYS]
		},
		"fontVariant": {
			jit: [IF_IN_SCHEMA],
			add: [IF_EXPLICIT],
			keyframe: [ALWAYS]
		},
		"fontWeight": {
			jit: [IF_IN_SCHEMA],
			add: [IF_EXPLICIT],
			keyframe: [ALWAYS]
		},
		"href": {
			jit: [IF_IN_SCHEMA],
			add: [IF_EXPLICIT_OR_DEFINED],
			keyframe: [ALWAYS]
		},
		"kerning": {
			jit: [IF_IN_SCHEMA],
			add: [IF_EXPLICIT],
			keyframe: [ALWAYS]
		},
		"letterSpacing": {
			jit: [IF_IN_SCHEMA],
			add: [IF_EXPLICIT],
			keyframe: [ALWAYS]
		},
		"offset": {
			jit: [IF_IN_SCHEMA],
			add: [IF_EXPLICIT],
			keyframe: [ALWAYS]
		},
		"points": {
			jit: [IF_IN_SCHEMA],
			add: [IF_EXPLICIT_OR_DEFINED],
			keyframe: [ALWAYS]
		},
		"r": {
			jit: [IF_IN_SCHEMA],
			add: [IF_EXPLICIT_OR_DEFINED],
			keyframe: [ALWAYS]
		},
		"rx": {
			jit: [IF_IN_SCHEMA],
			add: [IF_EXPLICIT_OR_DEFINED],
			keyframe: [ALWAYS]
		},
		"ry": {
			jit: [IF_IN_SCHEMA],
			add: [IF_EXPLICIT_OR_DEFINED],
			keyframe: [ALWAYS]
		},
		"stopColor": {
			jit: [IF_IN_SCHEMA],
			add: [IF_EXPLICIT],
			keyframe: [ALWAYS]
		},
		"stroke": {
			jit: [IF_IN_SCHEMA],
			add: [IF_EXPLICIT_OR_DEFINED],
			keyframe: [ALWAYS]
		},
		"strokeDasharray": {
			jit: [IF_IN_SCHEMA],
			add: [IF_EXPLICIT_OR_DEFINED],
			keyframe: [ALWAYS]
		},
		"strokeDashoffset": {
			jit: [IF_IN_SCHEMA],
			add: [IF_EXPLICIT_OR_DEFINED],
			keyframe: [ALWAYS]
		},
		"strokeOpacity": {
			jit: [IF_IN_SCHEMA],
			add: [IF_EXPLICIT],
			keyframe: [ALWAYS]
		},
		"strokeWidth": {
			jit: [IF_IN_SCHEMA],
			add: [IF_EXPLICIT],
			keyframe: [ALWAYS]
		},
		"textAnchor": {
			jit: [IF_IN_SCHEMA],
			add: [IF_EXPLICIT],
			keyframe: [ALWAYS]
		},
		"wordSpacing": {
			jit: [IF_IN_SCHEMA],
			add: [IF_EXPLICIT],
			keyframe: [ALWAYS]
		},
		"x": {
			jit: [IF_IN_SCHEMA],
			add: [IF_EXPLICIT_OR_DEFINED],
			keyframe: [ALWAYS]
		},
		"y": {
			jit: [IF_IN_SCHEMA],
			add: [IF_EXPLICIT_OR_DEFINED],
			keyframe: [ALWAYS]
		},
		"x1": {
			jit: [IF_IN_SCHEMA],
			add: [IF_EXPLICIT_OR_DEFINED],
			keyframe: [ALWAYS]
		},
		"x2": {
			jit: [IF_IN_SCHEMA],
			add: [IF_EXPLICIT_OR_DEFINED],
			keyframe: [ALWAYS]
		},
		"y1": {
			jit: [IF_IN_SCHEMA],
			add: [IF_EXPLICIT_OR_DEFINED],
			keyframe: [ALWAYS]
		},
		"y2": {
			jit: [IF_IN_SCHEMA],
			add: [IF_EXPLICIT_OR_DEFINED]
		}
	};
	Property$6.includeInJIT = (name, element, property, keyframes) => {
		return Property$6.includeInDisplay("jit", name, element, property, keyframes);
	};
	Property$6.includeInAddressables = (name, element, property, keyframes) => {
		return Property$6.includeInDisplay("add", name, element, property, keyframes);
	};
	Property$6.canHaveKeyframes = (name, element, property, keyframes) => {
		return Property$6.includeInDisplay("keyframe", name, element, property, keyframes);
	};
	Property$6.includeInDisplay = (type, name, element, property, keyframes) => {
		const rule = Property$6.DISPLAY_RULES[name];
		return rule && rule[type] && rule[type].every((test) => test(name, element, property, keyframes));
	};
	Property$6.WITH_COLOR_POPUP = new Set([
		"style.stroke",
		"style.fill",
		"style.background",
		"style.backgroundColor",
		"style.borderBottomColor",
		"style.borderColor",
		"style.borderLeftColor",
		"style.borderRightColor",
		"style.borderTopColor",
		"style.floodColor",
		"style.lightingColor",
		"style.stopColor",
		"stroke",
		"fill",
		"floodColor",
		"lightingColor",
		"stopColor",
		"backgroundColor",
		"animateColor",
		"feColor"
	]);
	Property$6.hasColorPopup = (propertyName) => {
		return Property$6.WITH_COLOR_POPUP.has(propertyName);
	};
	const ROTATION_PI = Number(Math.PI.toFixed(2));
	Property$6.WITH_RANGE_POPUP = {
		"opacity": {
			max: 1,
			min: 0,
			step: .1
		},
		"rotation.x": {
			max: ROTATION_PI,
			min: -ROTATION_PI,
			step: .1
		},
		"rotation.y": {
			max: ROTATION_PI,
			min: -ROTATION_PI,
			step: .1
		},
		"rotation.z": {
			max: ROTATION_PI,
			min: -ROTATION_PI,
			step: .1
		}
	};
	Property$6.hasRangePopup = (propertyName) => {
		return Property$6.WITH_RANGE_POPUP[propertyName];
	};
	Property$6.buildFilterObject = (filtered, hostElement, propertyName, propertyObject) => {
		if (hostElement._visibleProperties[propertyName]) {
			filtered[propertyName] = propertyObject;
			return;
		}
		if (propertyObject.type === "state") {
			filtered[propertyName] = propertyObject;
			return;
		}
		if (hostElement.isNonRenderedComponent()) return;
		if (Property$6.includeInAddressables(propertyName, hostElement, propertyObject, hostElement.getPropertyKeyframesObject(propertyName))) filtered[propertyName] = propertyObject;
	};
	module.exports = Property$6;
}) });

//#endregion
//#region src/bll/ElementSelectionProxy.js
var require_ElementSelectionProxy = /* @__PURE__ */ __commonJS({ "src/bll/ElementSelectionProxy.js": ((exports, module) => {
	const path$9 = require("node:path");
	const { default: HaikuElement$1 } = require("@haiku/core/lib/HaikuElement");
	const { default: Layout3D$2 } = require("@haiku/core/lib/Layout3D");
	const { default: composedTransformsToTimelineProperties$1 } = require("haiku-common");
	const { Experiment: Experiment$5, experimentIsEnabled: experimentIsEnabled$5 } = require("haiku-common");
	const { default: invertMatrix } = require("haiku-vendor-legacy/lib/gl-mat4/invert");
	const lodash$3 = require("lodash");
	const logger$8 = require_LoggerInstance();
	const BaseModel$17 = require_BaseModel();
	const { Figma: Figma$2 } = require_Figma();
	const Illustrator$2 = require_Illustrator();
	const { rounded, transformFourVectorByMatrix, basicallyEquals } = require_MathUtils();
	const Sketch$2 = require_Sketch();
	const TransformCache$2 = require_TransformCache();
	const PI_OVER_12 = Math.PI / 12;
	const isNumeric$2 = (n) => !isNaN(Number.parseFloat(n)) && isFinite(n);
	const forceNumeric = (n) => isNaN(n) || !isFinite(n) ? 0 : n;
	const HAIKU_SOURCE_ATTRIBUTE$3 = "haiku-source";
	const HAIKU_TITLE_ATTRIBUTE$2 = "haiku-title";
	const SNAP_THRESHOLD = 10;
	const SNAP_EPSILON = .025;
	/**
	* @class ElementSelectionProxy
	* @description
	*   Represents a set of 0 or more Element instances, providing a singular
	*   way to transform an edit them together, for times when said operations
	*   need to be aware of the entire set.
	*/
	var ElementSelectionProxy$4 = class ElementSelectionProxy$4 extends BaseModel$17 {
		constructor(props, opts) {
			super(props, opts);
			if (!Array.isArray(this.selection)) throw new TypeError("ElementSelectionProxy selection must be an array");
			this.reinitializeLayout();
			this.cacheOrigins();
			this.transformCache = new TransformCache$2(this);
			this.initializeRotationSnap();
		}
		reinitializeLayout() {
			this._proxyBoxPoints = [];
			this._proxyProperties = {};
			Object.assign(this._proxyProperties, ElementSelectionProxy$4.DEFAULT_PROPERTY_VALUES);
			if (!this.hasAnythingInSelection()) return;
			const elements = this.selection.filter((element) => !!element.getLiveRenderedNode());
			if (elements.length < 1) return;
			if (elements.length === 1) {
				this._proxyBoxPoints = elements[0].getBoundingBoxPoints().map((p) => p);
				Object.assign(this._proxyProperties, Property$5.layoutSpecAsProperties(elements[0].getLayoutSpec()), {
					"sizeAbsolute.x": Math.abs(this._proxyBoxPoints[0].x - this._proxyBoxPoints[8].x),
					"sizeAbsolute.y": Math.abs(this._proxyBoxPoints[0].y - this._proxyBoxPoints[8].y)
				});
				return;
			}
			const boxPoints = HaikuElement$1.getBoundingBoxPoints(elements.map((element) => element.getBoxPointsTransformed()).reduce((accumulator, boxPoints$1) => {
				accumulator.push(...boxPoints$1);
				return accumulator;
			}, []));
			const xOffset = boxPoints[0].x;
			const yOffset = boxPoints[0].y;
			boxPoints.forEach(({ x, y }) => {
				this._proxyBoxPoints.push({
					x: x - xOffset,
					y: y - yOffset,
					z: 0
				});
			});
			const width = Math.abs(boxPoints[0].x - boxPoints[8].x);
			const height = Math.abs(boxPoints[0].y - boxPoints[8].y);
			Object.assign(this._proxyProperties, {
				"sizeAbsolute.x": width,
				"sizeAbsolute.y": height,
				"translation.x": boxPoints[0].x + width * ElementSelectionProxy$4.DEFAULT_PROPERTY_VALUES["origin.x"],
				"translation.y": boxPoints[0].y + height * ElementSelectionProxy$4.DEFAULT_PROPERTY_VALUES["origin.y"]
			});
		}
		initializeRotationSnap() {
			this.rotationSnapOffset = null;
			this.rotationSnapStrategy = null;
		}
		hasAnythingInSelection() {
			return this.selection.length > 0;
		}
		hasAnythingInSelectionButNotArtboard() {
			return this.hasAnythingInSelection() && !this.doesSelectionContainArtboard();
		}
		hasMultipleInSelection() {
			return this.selection.length > 1;
		}
		hasNothingInSelection() {
			return !this.hasAnythingInSelection();
		}
		doesSelectionContainArtboard() {
			return !!this.getArtboardElement();
		}
		getArtboardElement() {
			return this.selection.filter((element) => {
				return element.isRootElement();
			})[0];
		}
		doesManageSingleElement() {
			return this.selection.length === 1;
		}
		canRotate() {
			return !this.doesSelectionContainArtboard();
		}
		canControlHandles() {
			return this.hasAnythingInSelection() && (this.doesManageSingleElement() || experimentIsEnabled$5(Experiment$5.AdvancedMultiTransform));
		}
		pushCachedTransform(key) {
			this.transformCache.set(key);
			this.selection.forEach((element) => {
				element.transformCache.set(key);
			});
		}
		cacheOrigins() {
			this._originCache = this.selection.map((elem) => {
				return elem.getOriginTransformed();
			});
			this._originCache.groupOrigin = this.getOriginTransformed();
		}
		isSingleComponentSelected() {
			return this.selection.length === 1 && this.selection[0] && this.selection[0].isComponent();
		}
		canEditComponentFromSelection() {
			return this.isSingleComponentSelected() && this.selection[0].isLocalComponent();
		}
		getSourcePath() {
			if (!this.selection) return;
			if (!this.selection[0]) return;
			const node = this.selection[0].getStaticTemplateNode();
			return node && node.attributes && node.attributes[HAIKU_SOURCE_ATTRIBUTE$3];
		}
		isSelectionFinderOpenable() {
			if (!this.getSourcePath()) return false;
		}
		getAbspath() {
			const folder = this.component.project.getFolder();
			if (this.isSelectionSketchEditable()) return path$9.join(folder, this.getSourcePath(), "..", "..");
			if (this.canEditComponentFromSelection()) {
				const sourcePath = this.getSourcePath();
				const componentFolder = this.component.getSceneCodeFolder();
				const targetPath = path$9.resolve(componentFolder, sourcePath);
				return path$9.dirname(targetPath);
			}
			return folder;
		}
		isSelectionSketchEditable() {
			const sourcePath = this.getSourcePath();
			return !!(sourcePath && Sketch$2.isSketchFolder(sourcePath));
		}
		getSketchAssetPath() {
			const sourcePath = this.getSourcePath();
			return sourcePath && sourcePath.split(/\.sketch\.contents/)[0].concat(".sketch");
		}
		isSelectionFigmaEditable() {
			const sourcePath = this.getSourcePath();
			return !!(sourcePath && Figma$2.isFigmaFolder(sourcePath));
		}
		getFigmaAssetPath() {
			const sourcePath = this.getSourcePath();
			return sourcePath && sourcePath.split(/\.figma\.contents/)[0].concat(".figma");
		}
		getFigmaAssetLink() {
			return Figma$2.buildFigmaLinkFromPath(this.getFigmaAssetPath());
		}
		isSelectionIllustratorEditable() {
			const sourcePath = this.getSourcePath();
			return !!(sourcePath && Illustrator$2.isIllustratorFolder(sourcePath));
		}
		getIllustratorAssetPath() {
			const sourcePath = this.getSourcePath();
			return sourcePath && sourcePath.split(/\.ai\.contents/)[0].concat(".ai");
		}
		canCut() {
			return this.hasAnythingInSelection() && !this.doesSelectionContainArtboard();
		}
		canCopy() {
			return this.hasAnythingInSelection() && !this.doesSelectionContainArtboard();
		}
		canPaste() {
			return this.selection.length < 1;
		}
		canDelete() {
			return this.hasAnythingInSelection() && !this.doesSelectionContainArtboard();
		}
		canBringForward() {
			return this.doesManageSingleElement() && !this.doesSelectionContainArtboard() && !this.selection[0].isAtFront();
		}
		bringForward() {
			return this.selection[0].bringForward();
		}
		canSendBackward() {
			return this.doesManageSingleElement() && !this.doesSelectionContainArtboard() && !this.selection[0].isAtBack();
		}
		sendBackward() {
			return this.selection[0].sendBackward();
		}
		canBringToFront() {
			return this.doesManageSingleElement() && !this.doesSelectionContainArtboard() && !this.selection[0].isAtFront();
		}
		bringToFront() {
			return this.selection[0].bringToFront();
		}
		canSendToBack() {
			return this.doesManageSingleElement() && !this.doesSelectionContainArtboard() && !this.selection[0].isAtBack();
		}
		sendToBack() {
			return this.selection[0].sendToBack();
		}
		canGroup() {
			return !this.doesSelectionContainArtboard() && !this.doesManageSingleElement();
		}
		group(metadata) {
			if (!this.hasAnythingInSelection()) return;
			const componentIds = this.selection.map((element) => {
				return element.getComponentId();
			});
			this.reset();
			const computedLayout = this.getComputedLayout();
			const attributes = {
				"width": computedLayout.size.x,
				"height": computedLayout.size.y,
				[HAIKU_SOURCE_ATTRIBUTE$3]: "<group>",
				[HAIKU_TITLE_ATTRIBUTE$2]: this.component.nextSuggestedGroupName,
				"origin.x": computedLayout.origin.x,
				"origin.y": computedLayout.origin.y,
				"rotation.z": computedLayout.rotation.z
			};
			const boxPoint = this.getBoxPointsTransformed()[0];
			const shimLayout = Layout3D$2.createLayoutSpec();
			shimLayout.rotation.z = -computedLayout.rotation.z;
			shimLayout.origin = computedLayout.origin;
			const shimMatrix = Layout3D$2.computeMatrix(shimLayout, computedLayout.size);
			shimMatrix[12] = -(boxPoint.x * shimMatrix[0] + boxPoint.y * shimMatrix[4]);
			shimMatrix[13] = -(boxPoint.x * shimMatrix[1] + boxPoint.y * shimMatrix[5]);
			const groupMana = {
				elementName: "div",
				attributes,
				children: [{
					elementName: "div",
					attributes: {
						"transform": `matrix3d(${shimMatrix.join(",")})`,
						"origin.x": 0,
						"origin.y": 0,
						"style": { pointerEvents: "none" },
						"children": []
					}
				}]
			};
			return this.component.groupElements(componentIds, groupMana, this.getOriginTransformed(), metadata, () => {});
		}
		canUngroup() {
			return !this.doesSelectionContainArtboard() && this.doesManageSingleElement() && !this.selection[0].isComponent() && this.selection[0].doesContainUngroupableContent();
		}
		ungroup(metadata) {
			return this.selection[0].ungroup(metadata);
		}
		canCopySVG() {
			return this.doesManageSingleElement();
		}
		copySVG() {
			return this.selection[0].toXMLString();
		}
		canHTMLSnapshot() {
			return true;
		}
		getSingleComponentElement() {
			return this.selection[0];
		}
		getSingleComponentElementRelpath() {
			return this.selection[0].getAttribute(HAIKU_SOURCE_ATTRIBUTE$3);
		}
		getConglomerateTranslation() {
			return this.getBoundingBoxPoints()[0];
		}
		getConglomerateSize() {
			const points = this.getBoundingBoxPoints();
			return {
				x: points[2].x - points[0].x,
				y: points[6].y - points[0].y
			};
		}
		getBoundingBoxPoints() {
			return HaikuElement$1.getBoundingBoxPoints(this.selection.map((element) => element.getBoxPointsTransformed()).reduce((accumulator, boxPoints) => {
				accumulator.push(...boxPoints);
				return accumulator;
			}, []));
		}
		getOriginTransformed() {
			return this.cache.fetch("getOriginTransformed", () => {
				const layout = this.getComputedLayout();
				return HaikuElement$1.transformPointInPlace({
					x: layout.size.x * layout.origin.x,
					y: layout.size.y * layout.origin.y,
					z: layout.size.z * layout.origin.z
				}, layout.matrix);
			});
		}
		getBoxPointsCompletelyNotTransformed() {
			const layout = this.getComputedLayout();
			const w = layout.size.x;
			const h = layout.size.y;
			return [
				{
					x: 0,
					y: 0,
					z: 0
				},
				{
					x: w / 2,
					y: 0,
					z: 0
				},
				{
					x: w,
					y: 0,
					z: 0
				},
				{
					x: 0,
					y: h / 2,
					z: 0
				},
				{
					x: w / 2,
					y: h / 2,
					z: 0
				},
				{
					x: w,
					y: h / 2,
					z: 0
				},
				{
					x: 0,
					y: h,
					z: 0
				},
				{
					x: w / 2,
					y: h,
					z: 0
				},
				{
					x: w,
					y: h,
					z: 0
				}
			];
		}
		getLayoutSpec() {
			return {
				shown: true,
				opacity: 1,
				sizeMode: {
					x: 1,
					y: 1,
					z: 1
				},
				sizeProportional: {
					x: 1,
					y: 1,
					z: 1
				},
				sizeDifferential: {
					x: 0,
					y: 0,
					z: 0
				},
				offset: {
					x: this.computePropertyValue("offset.x"),
					y: this.computePropertyValue("offset.y"),
					z: this.computePropertyValue("offset.z")
				},
				origin: {
					x: this.computePropertyValue("origin.x"),
					y: this.computePropertyValue("origin.y"),
					z: this.computePropertyValue("origin.z")
				},
				translation: {
					x: this.computePropertyValue("translation.x"),
					y: this.computePropertyValue("translation.y"),
					z: this.computePropertyValue("translation.z")
				},
				shear: {
					xy: this.computePropertyValue("shear.xy"),
					xz: this.computePropertyValue("shear.xz"),
					yz: this.computePropertyValue("shear.yz")
				},
				rotation: {
					x: this.computePropertyValue("rotation.x"),
					y: this.computePropertyValue("rotation.y"),
					z: this.computePropertyValue("rotation.z")
				},
				scale: {
					x: this.computePropertyValue("scale.x"),
					y: this.computePropertyValue("scale.y"),
					z: 1
				},
				sizeAbsolute: {
					x: this.computePropertyValue("sizeAbsolute.x"),
					y: this.computePropertyValue("sizeAbsolute.y"),
					z: this.computePropertyValue("sizeAbsolute.z")
				}
			};
		}
		isAutoSizeX() {
			if (this.hasNothingInSelection() || this.hasMultipleInSelection()) return false;
			if (this.selection[0].isComponent()) {
				const wrapper = this.selection[0].getHaikuElement();
				const node = wrapper.memory && wrapper.memory.children[0];
				if (node && node.layout) return typeof node.layout.sizeAbsolute.x !== "number";
			}
			return this.selection[0].isAutoSizeX();
		}
		isAutoSizeY() {
			if (this.hasNothingInSelection() || this.hasMultipleInSelection()) return false;
			if (this.selection[0].isComponent()) {
				const wrapper = this.selection[0].getHaikuElement();
				const node = wrapper.memory && wrapper.memory.children[0];
				if (node && node.layout) return typeof node.layout.sizeAbsolute.y !== "number";
			}
			return this.selection[0].isAutoSizeY();
		}
		getComputedLayout() {
			return this.cache.fetch("getComputedLayout", () => {
				const { width, height } = this.component.getContextSize();
				let bounds = {
					left: null,
					top: null,
					right: null,
					bottom: null,
					front: null,
					back: null
				};
				if (this.doesManageSingleElement() && !this.doesSelectionContainArtboard()) bounds = this.selection[0].parent.getHaikuElement().computeContentBounds();
				return HaikuElement$1.computeLayout({ layout: this.getLayoutSpec() }, { layout: { computed: {
					bounds,
					matrix: Layout3D$2.createMatrix(),
					size: {
						x: width,
						y: height,
						z: 0
					}
				} } });
			});
		}
		getBoxPointsTransformed() {
			return this.cache.fetch("getBoxPointsTransformed", () => {
				const points = this._proxyBoxPoints.map((point) => Object.assign({}, point));
				return HaikuElement$1.transformPointsInPlace(points, this.getComputedLayout().matrix);
			});
		}
		getControlsPosition(basisPointIndex, xOffset, yOffset) {
			return this.cache.fetch("getControlsPosition", () => {
				const layout = this.getComputedLayout();
				const orthonormalBasisMatrix = Layout3D$2.computeOrthonormalBasisMatrix(layout.rotation, layout.shear);
				const offset = {
					x: xOffset * Math.sign(layout.scale.x),
					y: yOffset * Math.sign(layout.scale.y),
					z: 0
				};
				HaikuElement$1.transformPointInPlace(offset, orthonormalBasisMatrix);
				const basisPoint = this.getBoxPointsTransformed()[basisPointIndex];
				return {
					x: basisPoint.x + offset.x,
					y: basisPoint.y + offset.y,
					z: basisPoint.z
				};
			});
		}
		getBoundingClientRect() {
			const points = this.getBoxPointsTransformed();
			let left, right, top, bottom, width, height;
			if (!points || !points.length) {
				left = -21;
				right = -20;
				top = -21;
				bottom = -20;
				width = 1;
				height = 1;
			} else {
				left = Math.min(points[0].x, points[2].x, points[6].x, points[8].x);
				right = Math.max(points[0].x, points[2].x, points[6].x, points[8].x);
				top = Math.min(points[0].y, points[2].y, points[6].y, points[8].y);
				bottom = Math.max(points[0].y, points[2].y, points[6].y, points[8].y);
				width = Math.abs(left - right);
				height = Math.abs(bottom - top);
			}
			return {
				left,
				right,
				top,
				bottom,
				width,
				height
			};
		}
		getElement() {
			return this.selection[0];
		}
		computePropertyValue(key) {
			return this._proxyProperties[key];
		}
		applyPropertyValue(key, value) {
			this._proxyProperties[key] = value;
			this.clearAllRelatedCaches();
		}
		applyPropertyDelta(key, delta) {
			this.applyPropertyValue(key, this._proxyProperties[key] + delta);
		}
		reset() {
			const layout = this.getComputedLayout();
			this.applyPropertyValue("sizeAbsolute.x", Math.abs(layout.size.x * layout.scale.x));
			this.applyPropertyValue("sizeAbsolute.y", Math.abs(layout.size.y * layout.scale.y));
			this.applyPropertyValue("scale.x", 1);
			this.applyPropertyValue("scale.y", 1);
		}
		handleMouseDown(mousePosition) {
			this._shouldCaptureMousePosition = true;
		}
		handleMouseUp(mousePosition) {
			ElementSelectionProxy$4.snaps = [];
		}
		findSnapsMatchesAndBreakTies(snapDefinitions, snapLines) {
			const horizWinners = [];
			const vertWinners = [];
			let winningDeltaHoriz;
			let winningDeltaVert;
			snapLines.forEach((snap) => {
				if (this.getComponentIds().includes(snap.elementId)) return;
				snapDefinitions.forEach((def) => {
					if (snap.direction === def.direction && def.bboxEdgePosition > snap.positionWorld - SNAP_THRESHOLD && def.bboxEdgePosition < snap.positionWorld + SNAP_THRESHOLD) {
						const delta = Math.abs(def.bboxEdgePosition - snap.positionWorld);
						if (snap.direction === "HORIZONTAL" && (winningDeltaHoriz === void 0 || delta < winningDeltaHoriz + SNAP_EPSILON)) {
							winningDeltaHoriz = Math.min(delta, winningDeltaHoriz) || delta;
							const newWinner = {
								direction: def.direction,
								positionWorld: snap.positionWorld,
								bboxEdgePosition: def.bboxEdgePosition,
								metadata: Object.assign({}, def.metadata, snap.metadata)
							};
							for (let i$1 = 0; i$1 < horizWinners.length; i$1++) {
								const oldWinner = horizWinners[i$1];
								const oldWinningDelta = Math.abs(oldWinner.bboxEdgePosition - oldWinner.positionWorld);
								if (winningDeltaHoriz + SNAP_EPSILON < oldWinningDelta) {
									horizWinners.splice(i$1, 1);
									i$1--;
								}
							}
							horizWinners.push(newWinner);
						} else if (snap.direction === "VERTICAL" && (winningDeltaVert === void 0 || delta < winningDeltaVert + SNAP_EPSILON)) {
							winningDeltaVert = Math.min(delta, winningDeltaVert) || delta;
							const newWinner = {
								direction: def.direction,
								positionWorld: snap.positionWorld,
								bboxEdgePosition: def.bboxEdgePosition,
								metadata: Object.assign({}, def.metadata, snap.metadata)
							};
							for (let j = 0; j < vertWinners.length; j++) {
								const oldWinner = vertWinners[j];
								const oldWinningDelta = Math.abs(oldWinner.bboxEdgePosition - oldWinner.positionWorld);
								if (winningDeltaVert + SNAP_EPSILON < oldWinningDelta) {
									vertWinners.splice(j, 1);
									j--;
								}
							}
							vertWinners.push(newWinner);
						}
					}
				});
			});
			return [].concat(horizWinners, vertWinners);
		}
		getBboxValueFromEdgeValue(bbox, xEdge, yEdge) {
			if (xEdge !== void 0) {
				if (xEdge === 0) return bbox.left;
				if (xEdge === .5) return bbox.left + bbox.width / 2;
				if (xEdge === 1) return bbox.right;
				throw new Error("Unknown edge value", xEdge);
			} else {
				if (yEdge === 0) return bbox.top;
				if (yEdge === .5) return bbox.top + bbox.height / 2;
				if (yEdge === 1) return bbox.bottom;
				throw new Error("Unknown edge value", yEdge);
			}
		}
		align(xEdge, yEdge, toStage) {
			if (!this.selection || !this.selection.length) return;
			let alignBbox = {};
			if (toStage) {
				const artboard = this.component.getArtboard();
				alignBbox = {
					top: 0,
					left: 0,
					right: artboard._mountWidth,
					bottom: artboard._mountHeight,
					width: artboard._mountWidth,
					height: artboard._mountHeight
				};
			} else alignBbox = this.getBoundingClientRect();
			const edge = xEdge !== void 0 ? xEdge : yEdge;
			const axis = xEdge !== void 0 ? "x" : "y";
			const targetValue = axis === "x" ? this.getBboxValueFromEdgeValue(alignBbox, edge, void 0) : this.getBboxValueFromEdgeValue(alignBbox, void 0, edge);
			const origins = this.selection.map((elem) => {
				return elem.getOriginTransformed();
			});
			const overrides = [];
			for (let i$1 = 0; i$1 < this.selection.length; i$1++) {
				const bbox = this.selection[i$1].getBoundingClientRect();
				const bboxEdgePosition = axis === "x" ? this.getBboxValueFromEdgeValue(bbox, edge, void 0) : this.getBboxValueFromEdgeValue(bbox, void 0, edge);
				overrides[i$1] = overrides[i$1] || {};
				overrides[i$1][axis] = targetValue - (bboxEdgePosition - origins[i$1][axis]);
			}
			this.move(0, 0, overrides);
			this.reinitializeLayout();
		}
		distribute(xEdge, yEdge, toStage) {
			if (!this.selection || this.selection.length < 2) return;
			const axis = xEdge !== void 0 ? "x" : "y";
			this.selection.forEach((elem, i$1) => {
				const points = elem.getBoxPointsTransformed();
				const bbox = {
					top: Math.min.apply(this, points.map((p) => {
						return p.y;
					})),
					right: Math.max.apply(this, points.map((p) => {
						return p.x;
					})),
					bottom: Math.max.apply(this, points.map((p) => {
						return p.y;
					})),
					left: Math.min.apply(this, points.map((p) => {
						return p.x;
					}))
				};
				bbox.width = bbox.right - bbox.left;
				bbox.height = bbox.bottom - bbox.top;
				elem._distributeBbox = bbox;
				elem._distributeOriginalIndex = i$1;
				elem._distributeBoundingEdge = axis === "x" ? this.getBboxValueFromEdgeValue(elem._distributeBbox, xEdge, void 0) : this.getBboxValueFromEdgeValue(elem._distributeBbox, void 0, yEdge);
			});
			const elementsSortedByBoundingEdge = lodash$3.cloneDeep(this.selection).sort((elemA, elemB) => {
				return elemA._distributeBoundingEdge - elemB._distributeBoundingEdge;
			});
			const overrides = [];
			const count = elementsSortedByBoundingEdge.length;
			const origins = this.selection.map((elem) => {
				return elem.getOriginTransformed();
			});
			let min = elementsSortedByBoundingEdge[0]._distributeBoundingEdge;
			let max = elementsSortedByBoundingEdge[count - 1]._distributeBoundingEdge;
			if (toStage) {
				const artboard = this.component.getArtboard();
				if (axis === "x") {
					min = this.getBboxValueFromEdgeValue(elementsSortedByBoundingEdge[0]._distributeBbox, xEdge, void 0) - elementsSortedByBoundingEdge[0]._distributeBbox.left;
					max = artboard._mountWidth - (elementsSortedByBoundingEdge[count - 1]._distributeBbox.right - this.getBboxValueFromEdgeValue(elementsSortedByBoundingEdge[count - 1]._distributeBbox, xEdge, void 0));
				} else {
					min = this.getBboxValueFromEdgeValue(elementsSortedByBoundingEdge[0]._distributeBbox, void 0, yEdge) - elementsSortedByBoundingEdge[0]._distributeBbox.top;
					max = artboard._mountHeight - (elementsSortedByBoundingEdge[count - 1]._distributeBbox.bottom - this.getBboxValueFromEdgeValue(elementsSortedByBoundingEdge[count - 1]._distributeBbox, void 0, yEdge));
				}
			}
			const interval = (max - min) / (count - 1);
			elementsSortedByBoundingEdge.forEach((elem, i$1) => {
				const origIndex = elem._distributeOriginalIndex;
				const targetValue = min + interval * i$1;
				overrides[origIndex] = overrides[origIndex] || {};
				overrides[origIndex][axis] = targetValue - (elem._distributeBoundingEdge - origins[origIndex][axis]);
			});
			this.move(0, 0, overrides);
			this.reinitializeLayout();
		}
		/**
		* @method drag
		* @description Scale, rotate, or translate the elements in the selection
		*/
		drag(dx, dy, mouseCoordsCurrent, mouseCoordsPrevious, lastMouseDownCoord, isAnythingScaling, isAnythingRotating, isOriginPanning, controlActivation, viewportTransform, globals) {
			if (!this.selection || !this.selection.length) return;
			if (this._shouldCaptureMousePosition || globals.isSpecialKeyDown() || this._lastMouseDownPosition === void 0) {
				this._lastMouseDownPosition = mouseCoordsCurrent;
				this._lastBbox = this.getBoundingClientRect();
				this._lastProxyBox = this.getBoxPointsTransformed();
				this._lastOrigin = this.getOriginTransformed();
				this._baseBoxPointsNotTransformed = this.getBoxPointsCompletelyNotTransformed();
				this._lastOrigins = this.selection.map((elem) => {
					return elem.getOriginTransformed();
				});
				this._shouldCaptureMousePosition = false;
			}
			const totalDragDelta = {
				x: mouseCoordsCurrent.x - this._lastMouseDownPosition.x,
				y: mouseCoordsCurrent.y - this._lastMouseDownPosition.y
			};
			if (isOriginPanning) return this.panOrigin(dx, dy);
			if (this.canControlHandles()) {
				if (isAnythingScaling) {
					if (!controlActivation.cmd) return this.scale(dx, dy, controlActivation, mouseCoordsCurrent, mouseCoordsPrevious, viewportTransform, globals);
				} else if (isAnythingRotating) {
					if (controlActivation.cmd) {
						if (this.doesSelectionContainArtboard()) return;
						return this.rotate(dx, dy, mouseCoordsCurrent, mouseCoordsPrevious, controlActivation, globals);
					}
				}
			}
			if (this.doesSelectionContainArtboard()) return;
			const artboard = this.component.getArtboard();
			if (!globals.isCommandKeyDown && experimentIsEnabled$5(Experiment$5.Snapping)) {
				let bbox;
				if (this._lastBbox !== void 0) bbox = ((bbox$1, delta) => {
					const ret = {};
					ret.top = bbox$1.top + delta.y;
					ret.right = bbox$1.right + delta.x;
					ret.bottom = bbox$1.bottom + delta.y;
					ret.left = bbox$1.left + delta.x;
					ret.height = ret.bottom - ret.top;
					ret.width = ret.right - ret.left;
					return ret;
				})(this._lastBbox, totalDragDelta);
				else bbox = this.getBoundingClientRect();
				const snapLines = artboard.getSnapLinesInScreenCoords();
				const overrides = [];
				const origin = addVectors(this._lastOrigin, totalDragDelta);
				const origins = this._lastOrigins.map((o) => {
					return addVectors(o, totalDragDelta);
				});
				origins.groupOrigin = origin;
				const SNAP_DEFINITIONS = [
					{
						name: "TOP",
						direction: "HORIZONTAL",
						bboxEdgePosition: bbox.top
					},
					{
						name: "RIGHT",
						direction: "VERTICAL",
						bboxEdgePosition: bbox.right
					},
					{
						name: "BOTTOM",
						direction: "HORIZONTAL",
						bboxEdgePosition: bbox.bottom
					},
					{
						name: "LEFT",
						direction: "VERTICAL",
						bboxEdgePosition: bbox.left
					},
					{
						name: "VERTICAL_MID",
						direction: "VERTICAL",
						bboxEdgePosition: (bbox.right + bbox.left) / 2
					},
					{
						name: "HORIZONTAL_MID",
						direction: "HORIZONTAL",
						bboxEdgePosition: (bbox.bottom + bbox.top) / 2
					}
				];
				let foundSnaps = this.findSnapsMatchesAndBreakTies(SNAP_DEFINITIONS, snapLines);
				if (globals.isShiftKeyDown) if (Math.abs(mouseCoordsCurrent.x - this._originCache.groupOrigin.x) > Math.abs(mouseCoordsCurrent.y - this._originCache.groupOrigin.y)) {
					foundSnaps = foundSnaps.filter((snap) => {
						return snap.direction === "VERTICAL";
					});
					for (let i$1 = 0; i$1 < this.selection.length; i$1++) {
						overrides[i$1] = overrides[i$1] || {};
						overrides[i$1].y = this._originCache[i$1].y;
						overrides.groupOrigin = overrides.groupOrigin || {};
						overrides.groupOrigin.y = this._originCache.groupOrigin.y;
					}
				} else {
					foundSnaps = foundSnaps.filter((snap) => {
						return snap.direction === "HORIZONTAL";
					});
					for (let j = 0; j < this.selection.length; j++) {
						overrides[j] = overrides[j] || {};
						overrides[j].x = this._originCache[j].x;
						overrides.groupOrigin = overrides.groupOrigin || {};
						overrides.groupOrigin.x = this._originCache.groupOrigin.x;
					}
				}
				foundSnaps.forEach((snap) => {
					const whichAxis = snap.direction === "HORIZONTAL" ? "y" : "x";
					const desiredPosition = snap.positionWorld;
					this.selection.forEach((elem, i$1) => {
						overrides[i$1] = overrides[i$1] || {};
						overrides[i$1][whichAxis] = desiredPosition - (snap.bboxEdgePosition - origins[i$1][whichAxis]);
					});
					overrides.groupOrigin = overrides.groupOrigin || {};
					overrides.groupOrigin[whichAxis] = desiredPosition - (snap.bboxEdgePosition - origins.groupOrigin[whichAxis]);
				});
				ElementSelectionProxy$4.snaps = foundSnaps;
				return this.move(dx, dy, overrides);
			}
			return this.move(dx, dy);
		}
		panOrigin(dx, dy) {
			const computedLayout = this.getComputedLayout();
			const scaledBasisMatrix = Layout3D$2.computeScaledBasisMatrix(computedLayout.rotation, computedLayout.scale, computedLayout.shear);
			const determinant = scaledBasisMatrix[0] * scaledBasisMatrix[5] - scaledBasisMatrix[1] * scaledBasisMatrix[4];
			const deltaX = (scaledBasisMatrix[5] * dx - scaledBasisMatrix[4] * dy) / determinant;
			const deltaY = (-scaledBasisMatrix[1] * dx + scaledBasisMatrix[0] * dy) / determinant;
			const deltaOriginX = rounded(forceNumeric(deltaX / computedLayout.size.x));
			const deltaOriginY = rounded(forceNumeric(deltaY / computedLayout.size.y));
			const { matrix: layoutMatrix } = computedLayout;
			const deltaTranslationX = layoutMatrix[0] * deltaX + layoutMatrix[4] * deltaY;
			const deltaTranslationY = layoutMatrix[1] * deltaX + layoutMatrix[5] * deltaY;
			this.applyPropertyDelta("translation.x", deltaTranslationX);
			this.applyPropertyDelta("translation.y", deltaTranslationY);
			this.applyPropertyDelta("origin.x", deltaOriginX);
			this.applyPropertyDelta("origin.y", deltaOriginY);
			if (!this.doesManageSingleElement()) return;
			const targetElement = this.selection[0];
			const propertyGroupDelta = {
				"translation.x": { value: deltaTranslationX },
				"translation.y": { value: deltaTranslationY },
				"origin.x": { value: deltaOriginX },
				"origin.y": { value: deltaOriginY }
			};
			const propertyGroup = targetElement.computePropertyGroupValueFromGroupDelta(propertyGroupDelta);
			const accumulatedUpdates = {};
			ElementSelectionProxy$4.accumulateKeyframeUpdates(accumulatedUpdates, targetElement, this.component.getCurrentTimelineName(), this.component.getCurrentTimelineTime(), propertyGroup);
			targetElement.component.updateKeyframes(accumulatedUpdates, {}, this.component.project.getMetadata(), () => {
				this.clearAllRelatedCaches();
			});
		}
		clearAllRelatedCaches() {
			if (this.hasAnythingInSelection()) {
				this.cache.clear();
				this.selection.forEach((element) => {
					element.cache.clear();
				});
			}
		}
		move(dx, dy, overrides) {
			const propertyGroupDelta = {};
			if (dx > 0 || dx < 0) propertyGroupDelta["translation.x"] = { value: dx };
			if (dy > 0 || dy < 0) propertyGroupDelta["translation.y"] = { value: dy };
			const accumulatedUpdates = {};
			this.selection.forEach((element, i$1) => {
				const layoutSpec = element.getLayoutSpec();
				const propertyGroup = element.computePropertyGroupValueFromGroupDelta(propertyGroupDelta);
				if (overrides && overrides[i$1] && overrides[i$1].x !== void 0) propertyGroup["translation.x"] = { value: overrides[i$1].x - layoutSpec.offset.x };
				if (overrides && overrides[i$1] && overrides[i$1].y !== void 0) propertyGroup["translation.y"] = { value: overrides[i$1].y - layoutSpec.offset.y };
				ElementSelectionProxy$4.accumulateKeyframeUpdates(accumulatedUpdates, element, element.component.getCurrentTimelineName(), element.component.getCurrentTimelineTime(), propertyGroup);
			});
			this.component.updateKeyframes(accumulatedUpdates, {}, this.component.project.getMetadata(), () => {});
			if (overrides && overrides.groupOrigin && overrides.groupOrigin.x !== void 0) this.applyPropertyValue("translation.x", overrides.groupOrigin.x - this.computePropertyValue("offset.x"));
			else this.applyPropertyDelta("translation.x", dx);
			if (overrides && overrides.groupOrigin && overrides.groupOrigin.y !== void 0) this.applyPropertyValue("translation.y", overrides.groupOrigin.y - this.computePropertyValue("offset.y"));
			else this.applyPropertyDelta("translation.y", dy);
		}
		getActivationPointInRadians(index) {
			switch (index) {
				case 5: return Math.PI * 2;
				case 8: return Math.PI / 4;
				case 7: return Math.PI / 2;
				case 6: return 3 * Math.PI / 4;
				case 3: return Math.PI;
				case 0: return 5 * Math.PI / 4;
				case 1: return 3 * Math.PI / 2;
				case 2: return 7 * Math.PI / 4;
				default: throw new Error(`Cannot retrieve radian value for provided activation point: ${index}`);
			}
		}
		scale(dx, dy, activationPoint, mouseCoordsCurrent, mouseCoordsPrevious, viewportTransform, globals) {
			if (this.doesSelectionContainArtboard()) return this.scaleArtboard(mouseCoordsCurrent, mouseCoordsPrevious, viewportTransform, activationPoint);
			return this.scaleElements(mouseCoordsCurrent, mouseCoordsPrevious, activationPoint, globals);
		}
		translateBoxPointsManual(boxPoints, delta) {
			return boxPoints.map((point) => {
				return {
					x: point.x + delta.x,
					y: point.y + delta.y
				};
			});
		}
		scaleElements(mouseCoordsCurrent, mouseCoordsPrevious, activationPoint, globals) {
			const foundSnaps = [];
			const accumulatedUpdates = {};
			const baseProxyBox = Object.assign({}, this._lastProxyBox);
			const getBaseTransform = () => lodash$3.cloneDeep(this.transformCache.get("CONTROL_ACTIVATION"));
			const baseTransform = getBaseTransform();
			const fixedPoint = activationPoint.alt ? this._lastOrigin : ElementSelectionProxy$4.getFixedPointForScale(baseProxyBox, activationPoint);
			const translatedPoint = ElementSelectionProxy$4.getTranslatedPointForScale(baseProxyBox, activationPoint);
			const totalMouseDelta = {
				x: mouseCoordsCurrent.x - this._lastMouseDownPosition.x,
				y: mouseCoordsCurrent.y - this._lastMouseDownPosition.y,
				z: 0
			};
			let scalePropertyGroup = ElementSelectionProxy$4.computeScalePropertyGroup(baseTransform, fixedPoint, translatedPoint, totalMouseDelta, activationPoint, true);
			const updatedLayout = getBaseTransform();
			updatedLayout.scale.x = scalePropertyGroup["scale.x"].value;
			updatedLayout.scale.y = scalePropertyGroup["scale.y"].value;
			updatedLayout.translation.x = scalePropertyGroup["translation.x"].value;
			updatedLayout.translation.y = scalePropertyGroup["translation.y"].value;
			const transformedPoints = lodash$3.cloneDeep(this._baseBoxPointsNotTransformed);
			ElementSelectionProxy$4.transformPointsByLayoutInPlace(transformedPoints, updatedLayout);
			const axisAlignedBbox = [
				{
					name: "TOP",
					value: Math.min.apply(this, transformedPoints.map((p) => {
						return p.y;
					}))
				},
				{
					name: "RIGHT",
					value: Math.max.apply(this, transformedPoints.map((p) => {
						return p.x;
					}))
				},
				{
					name: "BOTTOM",
					value: Math.max.apply(this, transformedPoints.map((p) => {
						return p.y;
					}))
				},
				{
					name: "LEFT",
					value: Math.min.apply(this, transformedPoints.map((p) => {
						return p.x;
					}))
				}
			];
			const transformedTranslatedPoint = transformedPoints[activationPoint.index];
			const filteredEdges = [];
			let isDraggingEdge = false;
			if (activationPoint.alt) {} else if (activationPoint.shift) {} else if ([
				1,
				3,
				5,
				7
			].includes(activationPoint.index)) {
				for (const edge of axisAlignedBbox) {
					const isHoriz = edge.name === "TOP" || edge.name === "BOTTOM";
					if (isHoriz && isWithinEpsilon(transformedTranslatedPoint.y, edge.value, 10) || !isHoriz && isWithinEpsilon(transformedTranslatedPoint.x, edge.value, 10)) {
						filteredEdges.push(edge);
						break;
					}
				}
				if (filteredEdges.length === 0) {
					isDraggingEdge = true;
					const transformedNeighborPoints = ElementSelectionProxy$4.getNeighborPointsForScaleSnapping(transformedPoints, activationPoint);
					filteredEdges.push(...axisAlignedBbox.filter((edge) => {
						const isHoriz = edge.name === "TOP" || edge.name === "BOTTOM";
						if (isHoriz && (isWithinEpsilon(transformedNeighborPoints[0].y, edge.value) || isWithinEpsilon(transformedNeighborPoints[1].y, edge.value))) return true;
						if (!isHoriz && (isWithinEpsilon(transformedNeighborPoints[0].x, edge.value) || isWithinEpsilon(transformedNeighborPoints[1].x, edge.value))) return true;
						return false;
					}));
				}
			} else filteredEdges.push(...axisAlignedBbox.filter((edge) => {
				const isHoriz = edge.name === "TOP" || edge.name === "BOTTOM";
				if (isHoriz && isWithinEpsilon(transformedTranslatedPoint.y, edge.value, 1)) return true;
				if (!isHoriz && isWithinEpsilon(transformedTranslatedPoint.x, edge.value, 1)) return true;
				return false;
			}));
			const snapDefinitions = filteredEdges.map((edge) => {
				const isHoriz = edge.name === "TOP" || edge.name === "BOTTOM";
				return {
					name: edge.name,
					direction: isHoriz ? "HORIZONTAL" : "VERTICAL",
					bboxEdgePosition: edge.value,
					metadata: {
						offset: edge.value - transformedTranslatedPoint[isHoriz ? "y" : "x"],
						isDraggingEdge
					}
				};
			});
			const artboard = this.component.getArtboard();
			foundSnaps.push(...this.findSnapsMatchesAndBreakTies(snapDefinitions, artboard.getSnapLinesInScreenCoords()));
			foundSnaps.forEach((snap) => {
				if (snap.direction === "HORIZONTAL") {
					totalMouseDelta.y = snap.positionWorld - (snap.metadata.offset || 0) - this._lastProxyBox[activationPoint.index].y;
					if (snap.metadata && snap.metadata.isDraggingEdge) {
						const theta = (this.getActivationPointInRadians(activationPoint.index) + updatedLayout.rotation.z) * 1e4 % 62832 / 1e4;
						totalMouseDelta.x = totalMouseDelta.y / Math.tan(theta) || 0;
					}
				} else {
					totalMouseDelta.x = snap.positionWorld - (snap.metadata.offset || 0) - this._lastProxyBox[activationPoint.index].x;
					if (snap.metadata && snap.metadata.isDraggingEdge) {
						const theta = (this.getActivationPointInRadians(activationPoint.index) + updatedLayout.rotation.z) * 1e4 % 62832 / 1e4;
						totalMouseDelta.y = totalMouseDelta.x * Math.tan(theta) || 0;
					}
				}
			});
			if (foundSnaps.length) {
				Object.assign(baseTransform, getBaseTransform());
				scalePropertyGroup = ElementSelectionProxy$4.computeScalePropertyGroup(baseTransform, fixedPoint, translatedPoint, totalMouseDelta, activationPoint, true);
			}
			const matrixBeforeInverted = new Float32Array(16);
			invertMatrix(matrixBeforeInverted, baseTransform.matrix);
			const { "scale.x": { value: scaleX }, "scale.y": { value: scaleY }, "translation.x": { value: translationX }, "translation.y": { value: translationY } } = scalePropertyGroup;
			this.applyPropertyValue("scale.x", scaleX);
			this.applyPropertyValue("scale.y", scaleY);
			this.applyPropertyValue("translation.x", translationX);
			this.applyPropertyValue("translation.y", translationY);
			const matrixAfter = this.getComputedLayout().matrix;
			let shouldTick = false;
			this.selection.forEach((element) => {
				const layoutSpec = element.transformCache.get("CONTROL_ACTIVATION");
				if (!layoutSpec) return;
				const propertyGroup = {};
				const finalMatrix = Layout3D$2.multiplyArrayOfMatrices([
					layoutSpec.originOffsetComposedMatrix,
					matrixBeforeInverted,
					matrixAfter
				]);
				composedTransformsToTimelineProperties$1(propertyGroup, [finalMatrix], true, element.getLayoutSpec());
				const offsetX = layoutSpec.offset.x;
				const offsetY = layoutSpec.offset.y;
				const offsetZ = layoutSpec.offset.z;
				const originX = layoutSpec.origin.x * layoutSpec.size.x;
				const originY = layoutSpec.origin.y * layoutSpec.size.y;
				const originZ = layoutSpec.origin.z * layoutSpec.size.z;
				propertyGroup["translation.x"] = propertyGroup["translation.x"] || 0;
				propertyGroup["translation.y"] = propertyGroup["translation.y"] || 0;
				propertyGroup["translation.z"] = propertyGroup["translation.z"] || 0;
				propertyGroup["translation.x"] += finalMatrix[0] * originX + finalMatrix[4] * originY + finalMatrix[8] * originZ - offsetX;
				propertyGroup["translation.y"] += finalMatrix[1] * originX + finalMatrix[5] * originY + finalMatrix[9] * originZ - offsetY;
				propertyGroup["translation.z"] += finalMatrix[2] * originX + finalMatrix[6] * originY + finalMatrix[10] * originZ - offsetZ;
				const propertyGroupNorm = Object.keys(propertyGroup).reduce((accumulator, property) => {
					accumulator[property] = { value: propertyGroup[property] };
					return accumulator;
				}, {});
				if (experimentIsEnabled$5(Experiment$5.SizeInsteadOfScaleWhenPossible)) {
					if (element.isComponent()) {
						const addressables = element.getComponentAddressables();
						const baseProxyTransform = getBaseTransform();
						if (addressables.width && addressables.width.typedef === "number") {
							propertyGroupNorm.width = { value: Math.abs(layoutSpec.size.x * scaleX / baseProxyTransform.scale.x) };
							propertyGroupNorm["scale.x"] = { value: Math.sign(propertyGroup["scale.x"] || 1) };
							shouldTick = true;
						}
						if (addressables.height && addressables.height.typedef === "number") {
							propertyGroupNorm.height = { value: Math.abs(layoutSpec.size.y * scaleY / baseProxyTransform.scale.y) };
							propertyGroupNorm["scale.y"] = { value: Math.sign(propertyGroup["scale.y"] || 1) };
							shouldTick = true;
						}
					}
				}
				ElementSelectionProxy$4.accumulateKeyframeUpdates(accumulatedUpdates, element, element.component.getCurrentTimelineName(), element.component.getCurrentTimelineTime(), propertyGroupNorm);
			});
			this.component.updateKeyframes(accumulatedUpdates, {}, this.component.project.getMetadata(), () => {
				if (shouldTick) this.component.tick();
				this.clearAllRelatedCaches();
			});
			ElementSelectionProxy$4.snaps = foundSnaps;
		}
		scaleArtboard(mouseCoordsCurrent, mouseCoordsPrevious, { zoom }, activationPoint) {
			const accumulatedUpdates = {};
			const bytecode = this.component.getReifiedBytecode();
			const element = this.getArtboardElement();
			const timelineName = element.component.getCurrentTimelineName();
			const timelineTime = 0;
			if (!bytecode.timelines[timelineName]) bytecode.timelines[timelineName] = {};
			if (!accumulatedUpdates[timelineName]) accumulatedUpdates[timelineName] = {};
			const dx = (mouseCoordsCurrent.clientX - mouseCoordsPrevious.clientX) * 2 / zoom;
			const dy = (mouseCoordsCurrent.clientY - mouseCoordsPrevious.clientY) * 2 / zoom;
			const { "scale.x": { value: scaleX }, "scale.y": { value: scaleY }, "translation.x": { value: translationX }, "translation.y": { value: translationY } } = ElementSelectionProxy$4.computeScaleInfoForArtboard(element, dx, dy, activationPoint);
			let sizeX = element.computePropertyValue("sizeAbsolute.x");
			let sizeY = element.computePropertyValue("sizeAbsolute.y");
			if (typeof sizeX !== "number" || typeof sizeY !== "number") {
				const computedSize = element.getComputedSize();
				if (typeof sizeX !== "number") sizeX = computedSize.x;
				if (typeof sizeY !== "number") sizeY = computedSize.y;
			}
			const didSizeX = scaleX > 1.000001 || scaleX < .999999;
			const didSizeY = scaleY > 1.000001 || scaleY < .999999;
			if (!didSizeX && !didSizeY) return;
			const finalSize = {};
			if (didSizeX) finalSize["sizeAbsolute.x"] = { value: rounded(scaleX * sizeX) };
			if (didSizeY) finalSize["sizeAbsolute.y"] = { value: rounded(scaleY * sizeY) };
			if (finalSize["sizeAbsolute.x"] && finalSize["sizeAbsolute.x"].value < 5 || finalSize["sizeAbsolute.y"] && finalSize["sizeAbsolute.y"].value < 5) return;
			ElementSelectionProxy$4.accumulateKeyframeUpdates(accumulatedUpdates, element, timelineName, timelineTime, finalSize);
			const elementOffset = {};
			if (didSizeX) elementOffset["translation.x"] = translationX;
			if (didSizeY) elementOffset["translation.y"] = translationY;
			this.component.getTopLevelElementHaikuIds().forEach((haikuId) => {
				const selector = Template$6.buildHaikuIdSelector(haikuId);
				if (!accumulatedUpdates[timelineName][haikuId]) accumulatedUpdates[timelineName][haikuId] = {};
				if (!bytecode.timelines[timelineName][selector]) bytecode.timelines[timelineName][selector] = {};
				for (const propertyName in elementOffset) {
					const offsetValue = elementOffset[propertyName];
					if (!accumulatedUpdates[timelineName][haikuId][propertyName]) accumulatedUpdates[timelineName][haikuId][propertyName] = {};
					if (!bytecode.timelines[timelineName][selector][propertyName]) bytecode.timelines[timelineName][selector][propertyName] = {};
					if (!bytecode.timelines[timelineName][selector][propertyName][0]) bytecode.timelines[timelineName][selector][propertyName][0] = {};
					for (const keyframeMs in bytecode.timelines[timelineName][selector][propertyName]) {
						const existingValue = bytecode.timelines[timelineName][selector][propertyName][keyframeMs].value || 0;
						if (isNumeric$2(existingValue)) {
							const updatedValue = existingValue - offsetValue;
							accumulatedUpdates[timelineName][haikuId][propertyName][keyframeMs] = { value: updatedValue };
						}
					}
				}
			});
			this.component.updateKeyframes(accumulatedUpdates, {}, this.component.project.getMetadata(), () => {
				this.clearAllRelatedCaches();
				this.reinitializeLayout();
			});
		}
		rotate(dx, dy, coordsCurrent, coordsPrevious, activationPoint, globals) {
			const accumulatedUpdates = {};
			const fixedPoint = this.getOriginTransformed();
			const { "rotation.z": { value: rotationZ } } = ElementSelectionProxy$4.computeRotationPropertyGroupDelta(this, this, coordsCurrent, coordsPrevious, globals);
			const rotationGroup = Object.assign({ "rotation.z": { value: 0 } }, ElementSelectionProxy$4.computeRotationPropertyGroup(this, rotationZ, fixedPoint));
			for (const property in rotationGroup) this.applyPropertyValue(property, rotationGroup[property].value);
			this.selection.forEach((element) => {
				ElementSelectionProxy$4.accumulateKeyframeUpdates(accumulatedUpdates, element, element.component.getCurrentTimelineName(), element.component.getCurrentTimelineTime(), Object.assign({ "rotation.z": { value: 0 } }, ElementSelectionProxy$4.computeRotationPropertyGroup(element, rotationZ, fixedPoint)));
			});
			this.component.updateKeyframes(accumulatedUpdates, {}, this.component.project.getMetadata(), () => {
				this.clearAllRelatedCaches();
			});
		}
		pasteClipsAndSelect(clips, metadata, cb) {
			logger$8.info(`[element selection proxy] paste ${this.getComponentIds().join("|")}`);
			this.component.pasteThings(clips, {}, metadata, (err, { haikuIds }) => {
				if (err) return cb(err);
				Element$4.unselectAllElements({ component: this.component }, metadata);
				haikuIds.map((haikuId) => this.component.findElementByComponentId(haikuId)).forEach((element) => {
					if (element) element.selectSoftly(metadata);
				});
				return cb(null);
			});
		}
		duplicateAllAndSelectDuplicates(metadata, cb) {
			const clips = this.selection.map((element) => {
				return element.clip(metadata);
			});
			return this.pasteClipsAndSelect(clips, metadata, cb);
		}
		cut(metadata) {
			logger$8.info(`[element selection proxy] cut ${this.getComponentIds().join("|")}`);
			const pasteables = [];
			this.selection.forEach((element) => {
				if (!element.isRootElement()) pasteables.push(element.copy());
			});
			ElementSelectionProxy$4.trackPasteables(pasteables);
			this.remove(metadata);
		}
		copy(metadata) {
			logger$8.info(`[element selection proxy] copy ${this.getComponentIds().join("|")}`);
			const pasteables = [];
			this.selection.forEach((element) => {
				if (!element.isRootElement()) pasteables.push(element.copy(metadata));
			});
			ElementSelectionProxy$4.trackPasteables(pasteables);
		}
		remove(metadata) {
			logger$8.info(`[element selection proxy] remove ${this.getComponentIds().join("|")}`);
			const componentIdsToRemove = this.selection.filter((element) => !element.isRootElement()).map((element) => element.getComponentId());
			this.component.deleteComponents(componentIdsToRemove, metadata, () => {});
		}
		getComponentIds() {
			return this.selection.map((element) => element.getComponentId());
		}
		/**
		* @method dump
		* @description When debugging, use this to log a concise shorthand of this entity.
		*/
		dump() {
			return this.getPrimaryKey();
		}
	};
	ElementSelectionProxy$4.DEFAULT_OPTIONS = { required: {
		uid: true,
		selection: true,
		component: true
	} };
	BaseModel$17.extend(ElementSelectionProxy$4);
	ElementSelectionProxy$4.DEFAULT_PROPERTY_VALUES = {
		"offset.x": 0,
		"offset.y": 0,
		"offset.z": 0,
		"origin.x": .5,
		"origin.y": .5,
		"origin.z": .5,
		"rotation.x": 0,
		"rotation.y": 0,
		"rotation.z": 0,
		"scale.x": 1,
		"scale.y": 1,
		"scale.z": 1,
		"sizeAbsolute.x": 0,
		"sizeAbsolute.y": 0,
		"sizeAbsolute.z": 0,
		"translation.x": 0,
		"translation.y": 0,
		"translation.z": 0
	};
	ElementSelectionProxy$4.activeAxesFromActivationPoint = (activationPoint) => {
		const activeAxes = new Uint8Array(2);
		if (activationPoint.shift) {
			activeAxes[0] = activeAxes[1] = 1;
			return activeAxes;
		}
		if (activationPoint.index !== 1 && activationPoint.index !== 7) activeAxes[0] = 1;
		if (activationPoint.index !== 3 && activationPoint.index !== 5) activeAxes[1] = 1;
		return activeAxes;
	};
	ElementSelectionProxy$4.isActivationPointLeft = (activationPoint) => activationPoint.index % 3 === 0;
	ElementSelectionProxy$4.isActivationPointTop = (activationPoint) => activationPoint.index < 3;
	ElementSelectionProxy$4.computeScaleInfoForArtboard = (targetElement, dx, dy, activationPoint) => {
		activationPoint.alt = false;
		const boxPoints = targetElement.getBoxPointsTransformed();
		return ElementSelectionProxy$4.computeScalePropertyGroup(targetElement.getComputedLayout(), ElementSelectionProxy$4.getFixedPointForScale(boxPoints, activationPoint), ElementSelectionProxy$4.getTranslatedPointForScale(boxPoints, activationPoint), {
			x: dx,
			y: dy,
			z: 0
		}, activationPoint, true);
	};
	ElementSelectionProxy$4.getFixedPointForScale = (proxyBoxPoints, activationPoint) => {
		switch (activationPoint.index) {
			case 5:
			case 7: return proxyBoxPoints[0];
			case 1: return proxyBoxPoints[6];
			case 3: return proxyBoxPoints[2];
			default: return proxyBoxPoints[8 - activationPoint.index];
		}
	};
	ElementSelectionProxy$4.getNeighborPointsForScaleSnapping = (proxyBoxPoints, activationPoint) => {
		switch (activationPoint.index) {
			case 1: return [proxyBoxPoints[0], proxyBoxPoints[2]];
			case 3: return [proxyBoxPoints[0], proxyBoxPoints[6]];
			case 5: return [proxyBoxPoints[2], proxyBoxPoints[8]];
			case 7: return [proxyBoxPoints[6], proxyBoxPoints[8]];
			default: throw new Error("Snapping behavior for 'center point' scaling is undefined");
		}
	};
	ElementSelectionProxy$4.getTranslatedPointForScale = (proxyBoxPoints, activationPoint) => {
		switch (activationPoint.index) {
			case 5:
			case 7: return proxyBoxPoints[8];
			case 1: return proxyBoxPoints[2];
			case 3: return proxyBoxPoints[6];
			default: return proxyBoxPoints[activationPoint.index];
		}
	};
	ElementSelectionProxy$4.computeScalePropertyGroup = (targetLayout, fixedPointIn, translatedPointIn, deltaIn, activationPoint, applyConstraints) => {
		const fixedPoint = Object.assign({}, fixedPointIn);
		const translatedPoint = Object.assign({}, translatedPointIn);
		const delta = lodash$3.cloneDeep(deltaIn);
		if (targetLayout.scale.x === 0) targetLayout.scale.x = 1e-4;
		if (targetLayout.scale.y === 0) targetLayout.scale.y = 1e-4;
		if (applyConstraints) {
			const scaledBasisMatrix = Layout3D$2.computeScaledBasisMatrix(targetLayout.rotation, targetLayout.scale, targetLayout.shear);
			const scaledBasisMatrixInverted = new Float32Array(16);
			invertMatrix(scaledBasisMatrixInverted, scaledBasisMatrix);
			HaikuElement$1.transformPointInPlace(delta, scaledBasisMatrixInverted);
			const activeAxes = ElementSelectionProxy$4.activeAxesFromActivationPoint(activationPoint);
			delta.x *= activeAxes[0];
			delta.y *= activeAxes[1];
			if (activationPoint.shift) {
				const negativeProportion = ElementSelectionProxy$4.isActivationPointLeft(activationPoint) ^ ElementSelectionProxy$4.isActivationPointTop(activationPoint);
				if (activationPoint.index === 3 || activationPoint.index === 5 || targetLayout.size.x > targetLayout.size.y && activationPoint.index !== 1 && activationPoint.index !== 7) {
					delta.y = delta.x * targetLayout.size.y / targetLayout.size.x;
					if (negativeProportion) delta.y *= -1;
				} else {
					delta.x = delta.y * targetLayout.size.x / targetLayout.size.y;
					if (negativeProportion) delta.x *= -1;
				}
			}
			HaikuElement$1.transformPointInPlace(delta, scaledBasisMatrix);
		}
		const layoutMatrix = targetLayout.matrix;
		const layoutMatrixInverted = new Float32Array(16);
		invertMatrix(layoutMatrixInverted, layoutMatrix);
		HaikuElement$1.transformPointInPlace(fixedPoint, layoutMatrixInverted);
		HaikuElement$1.transformPointInPlace(translatedPoint, layoutMatrixInverted);
		const originX = targetLayout.origin.x * targetLayout.size.x;
		const originY = targetLayout.origin.y * targetLayout.size.y;
		const coefficientMatrix = [
			layoutMatrix[0] * (fixedPoint.x - originX) / targetLayout.scale.x,
			layoutMatrix[1] * (fixedPoint.x - originX) / targetLayout.scale.x,
			layoutMatrix[0] * (translatedPoint.x - originX) / targetLayout.scale.x,
			layoutMatrix[1] * (translatedPoint.x - originX) / targetLayout.scale.x,
			layoutMatrix[4] * (fixedPoint.y - originY) / targetLayout.scale.y,
			layoutMatrix[5] * (fixedPoint.y - originY) / targetLayout.scale.y,
			layoutMatrix[4] * (translatedPoint.y - originY) / targetLayout.scale.y,
			layoutMatrix[5] * (translatedPoint.y - originY) / targetLayout.scale.y,
			1,
			0,
			1,
			0,
			0,
			1,
			0,
			1
		];
		const coefficientMatrixInverted = new Float32Array(16);
		invertMatrix(coefficientMatrixInverted, coefficientMatrix);
		const propertyGroupInitialVector = [
			0,
			0,
			delta.x,
			delta.y
		];
		const propertyGroupFinalVector = new Float32Array(4);
		transformFourVectorByMatrix(propertyGroupFinalVector, propertyGroupInitialVector, coefficientMatrixInverted);
		targetLayout.scale.x += propertyGroupFinalVector[0];
		targetLayout.scale.y += propertyGroupFinalVector[1];
		targetLayout.translation.x += propertyGroupFinalVector[2];
		targetLayout.translation.y += propertyGroupFinalVector[3];
		return {
			"scale.x": { value: rounded(targetLayout.scale.x) },
			"scale.y": { value: rounded(targetLayout.scale.y) },
			"translation.x": { value: rounded(targetLayout.translation.x) },
			"translation.y": { value: rounded(targetLayout.translation.y) }
		};
	};
	ElementSelectionProxy$4.transformPointsByLayoutInPlace = (points, layout) => {
		const matrix = Layout3D$2.computeMatrix(layout, layout.size);
		return points.map((point) => {
			HaikuElement$1.transformPointInPlace(point, matrix);
			return point;
		});
	};
	ElementSelectionProxy$4.computeRotationPropertyGroup = (element, rotationZDelta, fixedPoint) => {
		const layout = Layout3D$2.createLayoutSpec();
		layout.rotation.z = rotationZDelta;
		const matrix = Layout3D$2.computeMatrix(layout, {
			x: 0,
			y: 0,
			z: 0
		});
		const targetOrigin = element.getOriginTransformed();
		const ray = {
			x: targetOrigin.x - fixedPoint.x,
			y: targetOrigin.y - fixedPoint.y,
			z: targetOrigin.z - fixedPoint.z
		};
		HaikuElement$1.transformPointInPlace(ray, matrix);
		const layoutSpec = element.getLayoutSpec();
		const originalRotationMatrix = Layout3D$2.computeOrthonormalBasisMatrix(layoutSpec.rotation, layoutSpec.shear);
		if (layoutSpec.offset.x !== 0 || layoutSpec.offset.y !== 0) {
			ray.x -= layoutSpec.offset.x;
			ray.y -= layoutSpec.offset.y;
		}
		const attributes = {};
		composedTransformsToTimelineProperties$1(attributes, [matrix, originalRotationMatrix], false, layoutSpec);
		return Object.keys(attributes).reduce((accumulator, key) => {
			accumulator[key] = { value: attributes[key] };
			return accumulator;
		}, {
			"translation.x": { value: rounded(fixedPoint.x + ray.x) },
			"translation.y": { value: rounded(fixedPoint.y + ray.y) },
			"translation.z": { value: rounded(fixedPoint.z + ray.z) }
		});
	};
	ElementSelectionProxy$4.normalizeRotationDelta = (delta) => {
		if (Math.abs(delta) > Math.PI) return delta - 2 * Math.PI * Math.sign(delta);
		return delta;
	};
	ElementSelectionProxy$4.computeRotationPropertyGroupDelta = (targetElement, contextElement, coordsCurrent, coordsPrevious, globals) => {
		const x0 = coordsPrevious.x;
		const y0 = coordsPrevious.y;
		const x1 = coordsCurrent.x;
		const y1 = coordsCurrent.y;
		const { x: cx, y: cy } = targetElement.getOriginTransformed();
		const theta1 = Math.atan2(cy - y1, cx - x1);
		const theta0 = Math.atan2(cy - y0, cx - x0);
		const delta = ElementSelectionProxy$4.normalizeRotationDelta(theta1 - theta0);
		if (globals.isShiftKeyDown) {
			const originalRotation = targetElement.computePropertyValue("rotation.z");
			if (!contextElement.rotationSnapOffset) {
				contextElement.rotationSnapStrategy = delta > 0 ? Math.ceil : Math.floor;
				const originalRotationRounded = PI_OVER_12 * contextElement.rotationSnapStrategy(originalRotation / PI_OVER_12);
				contextElement.rotationSnapOffset = PI_OVER_12 * contextElement.rotationSnapStrategy(theta1 / PI_OVER_12);
				return { "rotation.z": { value: originalRotationRounded - originalRotation } };
			}
			const theta1Rounded = PI_OVER_12 * contextElement.rotationSnapStrategy(theta1 / PI_OVER_12);
			const effectiveDelta = theta1Rounded - contextElement.rotationSnapOffset;
			if (effectiveDelta !== 0) contextElement.rotationSnapOffset = theta1Rounded;
			return { "rotation.z": { value: ElementSelectionProxy$4.normalizeRotationDelta(effectiveDelta) } };
		}
		contextElement.initializeRotationSnap();
		return { "rotation.z": { value: rounded(delta) } };
	};
	/**
	* @function accumulateKeyframeUpdates
	*/
	ElementSelectionProxy$4.accumulateKeyframeUpdates = (out$1, element, timelineName, timelineTime, propertyGroup) => {
		if (!out$1[timelineName]) out$1[timelineName] = {};
		const componentId = element.getComponentId();
		if (!out$1[timelineName][componentId]) out$1[timelineName][componentId] = {};
		const currentProperties = TimelineProperty$5.getPropertiesBase(element.component.getReifiedBytecode().timelines, timelineName, componentId) || {};
		for (const propertyName in propertyGroup) {
			if (!currentProperties[propertyName] && basicallyEquals(Property$5.PREPOPULATED_VALUES[propertyName], propertyGroup[propertyName].value)) continue;
			if (currentProperties[propertyName]) {
				const lastKeyframe = Object.keys(currentProperties[propertyName]).map(Number).filter((time) => time <= timelineTime).sort((a, b) => a - b).pop();
				if (lastKeyframe !== void 0 && basicallyEquals(currentProperties[propertyName][lastKeyframe].value, propertyGroup[propertyName].value)) continue;
			}
			if (!out$1[timelineName][componentId][propertyName]) out$1[timelineName][componentId][propertyName] = {};
			out$1[timelineName][componentId][propertyName][timelineTime] = { value: propertyGroup[propertyName].value };
		}
		return out$1;
	};
	function addVectors(v0, v1) {
		return {
			x: v0.x + v1.x,
			y: v0.y + v1.y
		};
	}
	function isWithinEpsilon(v0, v1, override) {
		return v0 < v1 + (override || SNAP_EPSILON) && v0 > v1 - (override || SNAP_EPSILON);
	}
	ElementSelectionProxy$4.snaps = [];
	ElementSelectionProxy$4.fromSelection = (rawSelection, component) => {
		const uid = `${component && component.getPrimaryKey()}+${rawSelection.map((element) => element.getPrimaryKey()).sort().join("+") || "none"}`;
		return ElementSelectionProxy$4.findById(uid) || ElementSelectionProxy$4.upsert(Object.assign({
			uid,
			selection: rawSelection.reduce((accumulator, element) => {
				while (!element.isVisuallySelectable && element.parent) element = element.parent;
				accumulator.push(element);
				return accumulator;
			}, [])
		}, { component }));
	};
	const PASTEABLES = [];
	ElementSelectionProxy$4.trackPasteables = (pasteables) => {
		PASTEABLES.splice(0);
		PASTEABLES.push.apply(PASTEABLES, pasteables);
	};
	ElementSelectionProxy$4.getPasteables = () => {
		return PASTEABLES;
	};
	module.exports = ElementSelectionProxy$4;
	const Element$4 = require_Element();
	const Property$5 = require_Property();
	const Template$6 = require_Template();
	const TimelineProperty$5 = require_TimelineProperty();
}) });

//#endregion
//#region src/bll/Timeline.js
var require_Timeline = /* @__PURE__ */ __commonJS({ "src/bll/Timeline.js": ((exports, module) => {
	const numeral = require("numeral");
	const BaseModel$16 = require_BaseModel();
	const MathUtils$2 = require_MathUtils();
	const { formatSeconds } = require("haiku-ui-common").default;
	const TimelineProperty$4 = require_TimelineProperty();
	const logger$7 = require_LoggerInstance();
	const DURATION_DRAG_INCREASE = 20;
	const DURATION_DRAG_TIMEOUT = 300;
	const DURATION_MOD_TIMEOUT = 100;
	const MINIMUM_ZOOM_THRESHOLD = 3;
	/**
	* @class Timeline
	* @description
	*  Representation of a Timeline of a component.
	*  Provides a convenient way to manage the internals of a timeline without
	*  being concerned with React and all the spaghetti therein.
	*
	*  Allows you to manage:
	*    - Playback settings and state
	*    - Range of frames shown in the Timeline UI, zoom factor, etc.
	*    - Receiving updates to the current time
	*    - Querying for info about the state of the current frame, based on
	*      parameters related to the current zoom factor, offset, etc.
	*/
	var Timeline$4 = class Timeline$4 extends BaseModel$16 {
		constructor(props, opts) {
			super(props, opts);
			this._playing = false;
			this._isLooping = true;
			this._stopwatch = Date.now();
			this._currentFrame = 0;
			this._fps = 60;
			this._lastAuthoritativeFrame = 0;
			this._lastSeek = null;
			this._visibleFrameRange = [0, 60];
			this._timelinePixelWidth = 870;
			this._propertiesPixelWidth = 300;
			this._maxFrame = this._visibleFrameRange[1] * 2;
			this._durationDragStart = 0;
			this._durationTrim = 0;
			this._dragIsAdding = false;
			this._durationInterval = null;
			this._scrollerLeftDragStart = 0;
			this._scrollerRightDragStart = 0;
			this._scrollerBodyDragStart = 0;
			this._scrollbarStart = 0;
			this._scrollbarEnd = 0;
			this._hoveredFrame = 0;
			this._timeDisplayMode = Timeline$4.TIME_DISPLAY_MODE.FRAMES;
			this._scrollLeft = 0;
			this.raf = null;
			this.update = this.update.bind(this);
			this.update();
		}
		rehydrate() {
			this.component.rehydrate();
			return this;
		}
		getName() {
			return this.name;
		}
		isPlaying() {
			return this._playing;
		}
		setRepeat(bool) {
			this._isLooping = bool;
		}
		getRepeat() {
			return Boolean(this._isLooping);
		}
		getTimeDisplayMode() {
			return this._timeDisplayMode;
		}
		setTimeDisplayMode(newMode) {
			this._timeDisplayMode = newMode;
			this.emit("update", "time-display-mode-change");
		}
		toggleTimeDisplayMode() {
			if (this.getTimeDisplayMode() === Timeline$4.TIME_DISPLAY_MODE.FRAMES) this._timeDisplayMode = Timeline$4.TIME_DISPLAY_MODE.SECONDS;
			else this._timeDisplayMode = Timeline$4.TIME_DISPLAY_MODE.FRAMES;
			this.emit("update", "time-display-mode-change");
		}
		getDisplayTime() {
			return this.getTimeDisplayMode() === Timeline$4.TIME_DISPLAY_MODE.FRAMES ? ~~this.getCurrentFrame() : formatSeconds(this.getCurrentFrame() * 1e3 / this.getFPS() / 1e3).replace("0.", ".");
		}
		toggleRepeat() {
			this.setRepeat(!this.getRepeat());
		}
		setAuthoritativeFrame(authoritativeFrame) {
			this._lastAuthoritativeFrame = authoritativeFrame;
			this._stopwatch = Date.now();
			this.updateCurrentFrame(authoritativeFrame);
		}
		getExtrapolatedCurrentFrame() {
			const spanS = (Date.now() - this._stopwatch) / 1e3;
			const spanFrames = Math.round(spanS * this._fps);
			return this._lastAuthoritativeFrame + spanFrames;
		}
		togglePlayback() {
			const frameInfo = this.getFrameInfo();
			if (this.getCurrentFrame() >= frameInfo.maxf) {
				this.seek(frameInfo.fri0);
				this.updateCurrentFrame(frameInfo.fri0);
				this.tryToLeftAlignTickerInVisibleFrameRange(frameInfo.fri0);
			}
			if (this.isPlaying()) this.pause();
			else this.play();
		}
		playbackSkipBack() {
			const frameInfo = this.getFrameInfo();
			this.seekAndPause(frameInfo.fri0);
			this.updateCurrentFrame(frameInfo.fri0);
			this.tryToLeftAlignTickerInVisibleFrameRange(frameInfo.fri0);
		}
		playbackSkipForward() {
			const frameInfo = this.getFrameInfo();
			this.seekAndPause(frameInfo.maxf);
			this.updateCurrentFrame(frameInfo.maxf);
			this.tryToLeftAlignTickerInVisibleFrameRange(frameInfo.maxf);
		}
		play() {
			this._playing = true;
			this._stopwatch = Date.now();
			if (!this.component.project.getEnvoyClient().isInMockMode()) {
				const channel = this.component.project.getEnvoyChannel("timeline");
				if (channel) channel.play(this.getPrimaryKey()).then(() => {
					this.update();
				});
			}
		}
		pause(skipTransmit = false) {
			this._playing = false;
			this._lastSeek = null;
			if (!skipTransmit && !this.component.project.getEnvoyClient().isInMockMode()) {
				const channel = this.component.project.getEnvoyChannel("timeline");
				if (channel) channel.pause(this.getPrimaryKey()).then((finalFrame) => {
					this.setCurrentFrame(finalFrame);
					this.setAuthoritativeFrame(finalFrame);
					this.tryToLeftAlignTickerInVisibleFrameRange(finalFrame);
				});
			}
		}
		seekToTime(time, skipTransmit, forceSeek) {
			const frameInfo = this.getFrameInfo();
			const frame = Math.round(time / frameInfo.mspf);
			return this.seek(frame, skipTransmit, forceSeek);
		}
		seek(newFrame, skipTransmit, forceSeek) {
			if (forceSeek || this.getCurrentFrame() !== newFrame) {
				this.setCurrentFrame(newFrame);
				const id$1 = this.getPrimaryKey();
				const tuple = `${id$1}|${newFrame}`;
				const last = this._lastSeek;
				if (forceSeek || last !== tuple) {
					this._lastSeek = tuple;
					this.setAuthoritativeFrame(newFrame);
					if (!skipTransmit && !this.component.project.getEnvoyClient().isInMockMode()) {
						const timelineChannel = this.component.project.getEnvoyChannel("timeline");
						if (timelineChannel) timelineChannel.seekToFrame(id$1, newFrame);
						else logger$7.warn(`[timeline] envoy timeline channel not open (seekToFrame ${id$1}, ${newFrame})`);
					}
				}
			}
		}
		seekAndPause(newFrame) {
			this.seek(newFrame, true);
			this.pause(true);
			if (!this.component.project.getEnvoyClient().isInMockMode()) {
				const timelineChannel = this.component.project.getEnvoyChannel("timeline");
				if (timelineChannel) timelineChannel.seekToFrameAndPause(this.getPrimaryKey(), newFrame).then((finalFrame) => {
					this.setCurrentFrame(finalFrame);
					this.setAuthoritativeFrame(finalFrame);
					this.tryToLeftAlignTickerInVisibleFrameRange(finalFrame);
				});
				else logger$7.warn(`[timeline] envoy timeline channel not open (seekToFrameAndPause ${this.getPrimaryKey()}, ${newFrame})`);
			}
		}
		update() {
			if (this._playing) {
				const frameInfo = this.getFrameInfo();
				if (frameInfo.maxf < 1) {
					this.seekAndPause(frameInfo.maxf);
					return;
				}
				const extrapolatedFrame = this.getExtrapolatedCurrentFrame();
				this.updateCurrentFrame(extrapolatedFrame);
				if (this.getCurrentFrame() > frameInfo.maxf) {
					this._lastSeek = null;
					if (this.getRepeat()) {
						this.seek(0);
						this._stopwatch = Date.now();
					} else this.seekAndPause(frameInfo.maxf);
				}
				this.tryToLeftAlignTickerInVisibleFrameRange(this.getCurrentFrame());
				this.raf = window.requestAnimationFrame(this.update);
			}
		}
		getFPS() {
			const instance = this.component.$instance;
			if (!instance) return 60;
			return instance.getClock().getFPS();
		}
		getMaxFrame() {
			return this._maxFrame;
		}
		setMaxFrame(maxFrame) {
			this._maxFrame = maxFrame;
			this.cache.unset("frameInfo");
			this.emit("update", "timeline-max-frame-changed");
			return this;
		}
		getCurrentFrame() {
			return this._currentFrame;
		}
		getCurrentTime() {
			const frameInfo = this.getFrameInfo();
			return this.getCurrentFrame() * frameInfo.mspf;
		}
		hoverFrame(hoveredFrame) {
			this._hoveredFrame = hoveredFrame;
			this.emit("update", "timeline-frame-hovered");
			return this;
		}
		getHoveredFrame() {
			return this._hoveredFrame;
		}
		getCurrentMs() {
			const frameInfo = this.getFrameInfo();
			return Math.round(this.getCurrentFrame() * frameInfo.mspf);
		}
		setCurrentFrame(currentFrame) {
			this._currentFrame = currentFrame;
			return this;
		}
		updateCurrentFrame(currentFrame) {
			this.setCurrentFrame(currentFrame);
			const frameInfo = this.getFrameInfo();
			const timelineTime = Math.round(frameInfo.mspf * this._currentFrame);
			const timelineName = this.component.getCurrentTimelineName();
			this.component.$instance.controlTime(timelineName, timelineTime);
			this.emit("update", "timeline-frame");
			return this;
		}
		getDurationDragStart() {
			return this._durationDragStart;
		}
		getDurationTrim() {
			return this._durationTrim;
		}
		setDurationTrim(durationTrim) {
			this._durationTrim = durationTrim;
			this.emit("update", "timeline-duration-trim");
			return this;
		}
		getTimelinePixelWidth() {
			return this._timelinePixelWidth;
		}
		setTimelinePixelWidth(pxWidth) {
			this._timelinePixelWidth = pxWidth;
			this.cache.unset("frameInfo");
			this.emit("update", "timeline-timeline-pixel-width");
			return this;
		}
		setPropertiesPixelWidth(value) {
			this._propertiesPixelWidth = value;
			this.cache.unset("frameInfo");
		}
		getPropertiesPixelWidth() {
			return this._propertiesPixelWidth;
		}
		getVisibleFrameRangeLength() {
			return this.getRightFrameEndpoint() - this.getLeftFrameEndpoint();
		}
		getVisibleFrameRange() {
			return this._visibleFrameRange;
		}
		getLeftFrameEndpoint() {
			return this._visibleFrameRange[0];
		}
		getRightFrameEndpoint() {
			return this._visibleFrameRange[1];
		}
		getDragIsAdding() {
			return this._dragIsAdding;
		}
		getSelectedKeyframes() {
			return Keyframe$4.filter((keyframe) => {
				return keyframe.isSelected();
			});
		}
		hasMultipleSelectedKeyframes() {
			return this.getSelectedKeyframes().length > 1;
		}
		/**
		* // Sorry: These should have been given human-readable names
		* <GAUGE>
		*         <----friW--->
		* fri0    friA        friB        friMax
		* |       |           |           |
		* | | | | | | | | | | | | | | | | |
		*         <-----------> << timelines viewport
		* <------->           | << properties viewport
		*         pxA         pxB
		*                                 |pxMax
		* <SCROLLBAR>
		* |-------------------| << scroller viewport
		*     ====*            << scrollbar
		* <------------------->
		* |sc0                |scL && scRatio
		*     |scA
		*          |scB
		*/
		getFrameInfo() {
			return this.cache.fetch("frameInfo", () => {
				const frameInfo = {};
				frameInfo.fps = this.getFPS();
				frameInfo.mspf = 1e3 / frameInfo.fps;
				frameInfo.maxms = this.component.$instance.getTimeline(this.component.getCurrentTimelineName()).getMaxTime();
				frameInfo.maxf = Timeline$4.millisecondToNearestFrame(frameInfo.maxms, frameInfo.mspf);
				frameInfo.fri0 = 0;
				frameInfo.friA = this.getLeftFrameEndpoint() < frameInfo.fri0 ? frameInfo.fri0 : this.getLeftFrameEndpoint();
				frameInfo.friMax = frameInfo.maxf < this.getMaxFrame() ? this.getMaxFrame() : frameInfo.maxf;
				frameInfo.friMaxVirt = this.getMaxFrame();
				frameInfo.friB = this.getRightFrameEndpoint() > frameInfo.friMaxVirt ? frameInfo.friMaxVirt : this.getRightFrameEndpoint();
				frameInfo.pxpf = this._timelinePixelWidth / Math.abs(this.getRightFrameEndpoint() - this.getLeftFrameEndpoint());
				frameInfo.pxA = frameInfo.friA * frameInfo.pxpf;
				frameInfo.pxB = frameInfo.friB * frameInfo.pxpf;
				frameInfo.pxMax = frameInfo.friMax * frameInfo.pxpf;
				frameInfo.msA = Math.round(frameInfo.friA * frameInfo.mspf);
				frameInfo.msB = Math.round(frameInfo.friB * frameInfo.mspf);
				frameInfo.scL = this._propertiesPixelWidth + this._timelinePixelWidth;
				frameInfo.scRatio = frameInfo.pxMax / frameInfo.scL;
				frameInfo.scA = frameInfo.pxA / frameInfo.scRatio;
				frameInfo.scB = frameInfo.pxB / frameInfo.scRatio;
				return frameInfo;
			});
		}
		getVisibleFrames() {
			const visibleFrames = [];
			const frameInfo = this.getFrameInfo();
			const leftFrame = 0;
			const rightFrame = frameInfo.friMax;
			const leftMostAbsolutePixel = Math.round(leftFrame * frameInfo.pxpf);
			const frameModulus = Timeline$4.getFrameModulus(frameInfo.pxpf);
			for (let i$1 = leftFrame; i$1 <= rightFrame; i$1++) {
				const pixelOffsetLeft = Math.round(i$1 * frameInfo.pxpf);
				visibleFrames.push({
					pixelOffsetLeft,
					frameModulus,
					frameNumber: i$1,
					leftMostAbsolutePixel,
					pixelsPerFrame: frameInfo.pxpf
				});
			}
			return visibleFrames;
		}
		mapVisibleFrames(iteratee) {
			const mappedOutput = [];
			this.getVisibleFrames().forEach(({ pixelOffsetLeft, leftMostAbsolutePixel, frameModulus, frameNumber, pixelsPerFrame }) => {
				const mapOutput = iteratee(frameNumber, pixelOffsetLeft - leftMostAbsolutePixel, pixelsPerFrame, frameModulus);
				if (mapOutput) mappedOutput.push(mapOutput);
			});
			return mappedOutput;
		}
		mapVisibleTimes(iteratee) {
			const mappedOutput = [];
			const frameInfo = this.getFrameInfo();
			const leftFrame = frameInfo.friA;
			const leftMs = 0;
			const rightMs = frameInfo.friMax * frameInfo.mspf;
			const totalMs = rightMs - leftMs;
			const msModulus = Timeline$4.getMillisecondModulus(frameInfo.pxpf);
			let msMarkerTmp = MathUtils$2.roundUp(leftMs, msModulus);
			const msMarkers = [];
			while (msMarkerTmp <= rightMs) {
				msMarkers.push(msMarkerTmp);
				msMarkerTmp += msModulus;
			}
			for (let i$1 = 0; i$1 < msMarkers.length; i$1++) {
				const msMarker = msMarkers[i$1];
				const nearestFrame = Timeline$4.millisecondToNearestFrame(msMarker, frameInfo.mspf);
				if (!Math.floor(nearestFrame * frameInfo.mspf - msMarker)) {
					const frameOffset = nearestFrame - leftFrame;
					const mapOutput = iteratee(msMarker, Math.round(frameOffset * frameInfo.pxpf), totalMs);
					if (mapOutput) mappedOutput.push(mapOutput);
				}
			}
			return mappedOutput;
		}
		dragDurationModifierPosition(dragX) {
			const frameInfo = this.getFrameInfo();
			const dragDelta = dragX - this.getDurationDragStart();
			let frameDelta = Math.round(dragDelta / frameInfo.pxpf);
			if (dragDelta > 0 && this.getDurationTrim() >= 0) {
				if (!this._durationInterval) this._durationInterval = setInterval(() => {
					const currentMax = this.getMaxFrame() ? this.getMaxFrame() : frameInfo.friMax2;
					this.setMaxFrame(currentMax + DURATION_DRAG_INCREASE);
				}, DURATION_DRAG_TIMEOUT);
				this._dragIsAdding = true;
				return;
			}
			if (this._durationInterval) clearInterval(this._durationInterval);
			if (frameInfo.friB + frameDelta <= frameInfo.friMax || -frameDelta >= frameInfo.friB - frameInfo.friA) {
				frameDelta = this.getDurationTrim();
				return;
			}
			this._dragIsAdding = false;
			this.setDurationTrim(frameDelta);
		}
		handleDurationModifierStop() {
			const frameInfo = this.getFrameInfo();
			const currentMax = this.getMaxFrame() ? this.getMaxFrame() : frameInfo.friMax2;
			clearInterval(this._durationInterval);
			this.setMaxFrame(currentMax + this._durationTrim);
			this._dragIsAdding = false;
			this._durationInterval = null;
			setTimeout(() => {
				this._durationDragStart = null;
				this._durationTrim = 0;
			}, DURATION_MOD_TIMEOUT);
		}
		calculateMaxScrollValue() {
			return this.calculateFullTimelineWidth() - this._timelinePixelWidth;
		}
		handleSettingScroll(scrollValue, eventName) {
			if (scrollValue >= 0) {
				const maxScrollValue = this.calculateMaxScrollValue();
				const frameInfo = this.getFrameInfo();
				if (scrollValue >= maxScrollValue) {
					const framesToMove = 40 / frameInfo.pxpf;
					this._scrollLeft = maxScrollValue;
					this.setMaxFrame(this.getMaxFrame() + framesToMove);
				} else {
					const left = Math.round(scrollValue / frameInfo.pxpf);
					const right = left + this._visibleFrameRange[1] - this._visibleFrameRange[0];
					this.setVisibleFrameRange(left, right, false);
					this._scrollLeft = scrollValue;
				}
				this.emit("update", eventName);
			}
		}
		setScrollLeft(scrollValue) {
			this.handleSettingScroll(scrollValue, "timeline-scroll");
		}
		setScrollLeftFromScrollbar(scrollValue) {
			this.handleSettingScroll(scrollValue, "timeline-scroll-from-scrollbar");
		}
		getScrollLeft() {
			return this._scrollLeft;
		}
		mapXCoordToFrame(coord) {
			const frameInfo = this.getFrameInfo();
			return Math.round(coord / frameInfo.pxpf * frameInfo.scRatio);
		}
		zoomBy(scale) {
			const left = this.getLeftFrameEndpoint();
			const right = this.getRightFrameEndpoint();
			this.zoomByLeftAndRightEndpoints(left * scale + left, right * scale + right);
		}
		zoomByLeftAndRightEndpoints(left, right, fromScrollbar = false) {
			let leftTotal = left || this.getLeftFrameEndpoint();
			const rightTotal = right || this.getRightFrameEndpoint();
			const difference = rightTotal - leftTotal;
			const frameInfo = this.getFrameInfo();
			if (difference < MINIMUM_ZOOM_THRESHOLD || difference > this._timelinePixelWidth * 2 || rightTotal < leftTotal) return;
			if (leftTotal < frameInfo.fri0) leftTotal = frameInfo.fri0;
			this.setVisibleFrameRange(leftTotal, rightTotal);
			if (fromScrollbar) {
				const scrollValue = leftTotal * frameInfo.pxpf;
				this.setScrollLeftFromScrollbar(scrollValue);
			}
		}
		updateVisibleFrameRangeByDelta(delta) {
			const l = this.getLeftFrameEndpoint() + delta;
			const r = this.getRightFrameEndpoint() + delta;
			if (l >= 0) this.setVisibleFrameRange(l, r);
		}
		/**
		* @method tryToLeftAlignTickerInVisibleFrameRange
		* @description will left-align the current timeline window (maintaining zoom)
		*/
		tryToLeftAlignTickerInVisibleFrameRange(frame) {
			const pxOffsetLeft = frame * this.getFrameInfo().pxpf;
			if (frame !== void 0 && (pxOffsetLeft > this._scrollLeft + this._timelinePixelWidth || pxOffsetLeft < this._scrollLeft)) this.setScrollLeftFromScrollbar(pxOffsetLeft);
			return this;
		}
		setVisibleFrameRange(l, r, shouldNotifyUpdates = true) {
			this._visibleFrameRange = [l, r];
			if (r > this.getMaxFrame()) this.setMaxFrame(r);
			this.cache.unset("frameInfo");
			if (shouldNotifyUpdates) {
				Keyframe$4.clearAllViewPositions({ component: this.component });
				this.emit("update", "timeline-frame-range");
			}
			return this;
		}
		calculateFullTimelineWidth() {
			return this.getFrameInfo().pxMax + 20;
		}
		updateScrubberPositionByDelta(delta) {
			let currentFrame = this.getCurrentFrame() + delta;
			if (currentFrame <= 0) currentFrame = 0;
			this.component.getCurrentTimeline().seek(currentFrame);
		}
		normalizeMs(ms) {
			const frameInfo = this.getFrameInfo();
			const nearestFrame = Timeline$4.millisecondToNearestFrame(ms, frameInfo.mspf);
			return Math.round(nearestFrame * frameInfo.mspf);
		}
		notifyFrameActionChange() {
			this.emit("update", "timeline-frame-action");
		}
	};
	Timeline$4.DEFAULT_OPTIONS = { required: {
		component: true,
		name: true
	} };
	BaseModel$16.extend(Timeline$4);
	Timeline$4.eachTimelineKeyframeDescriptor = function eachTimelineKeyframeDescriptor(timelines, iteratee) {
		for (const timelineName in timelines) for (const componentSelector in timelines[timelineName]) for (const propertyName in timelines[timelineName][componentSelector]) for (const keyframeMs in timelines[timelineName][componentSelector][propertyName]) iteratee(timelines[timelineName][componentSelector][propertyName][keyframeMs], keyframeMs, propertyName, componentSelector, timelineName);
	};
	Timeline$4.getFrameModulus = (pxpf) => {
		if (pxpf >= 20) return 1;
		if (pxpf >= 15) return 2;
		if (pxpf >= 10) return 5;
		if (pxpf >= 5) return 10;
		if (pxpf === 4) return 15;
		if (pxpf === 3) return 20;
		if (pxpf === 2) return 30;
		return 50;
	};
	Timeline$4.getMillisecondModulus = (pxpf) => {
		if (pxpf >= 20) return 25;
		if (pxpf >= 15) return 50;
		if (pxpf >= 10) return 100;
		if (pxpf >= 5) return 200;
		if (pxpf >= 4) return 250;
		if (pxpf >= 3) return 500;
		if (pxpf >= 2) return 1e3;
		return 5e3;
	};
	Timeline$4.millisecondToNearestFrame = function millisecondToNearestFrame(msValue, mspf) {
		return Math.round(msValue / mspf);
	};
	Timeline$4.UNIT_MAPPING = {
		"translation.x": "px",
		"translation.y": "px",
		"translation.z": "px",
		"rotation.z": "rad",
		"rotation.y": "rad",
		"rotation.x": "rad",
		"scale.x": "",
		"scale.y": "",
		"opacity": "",
		"shown": "",
		"backgroundColor": "",
		"color": "",
		"fill": "",
		"stroke": ""
	};
	Timeline$4.inferUnitOfValue = function inferUnitOfValue(propertyName) {
		const unit = Timeline$4.UNIT_MAPPING[propertyName];
		if (unit) return unit;
		return "";
	};
	Timeline$4.getPropertyValueDescriptor = function getPropertyValueDescriptor(timelineRow, options) {
		const componentId = timelineRow.element.getComponentId();
		const elementName = timelineRow.element.getNameString();
		const propertyName = timelineRow.getPropertyNameString();
		const hostInstance = timelineRow.component.$instance;
		const hostStates = hostInstance && hostInstance.getStates() || {};
		const bytecodeFile = timelineRow.component.fetchActiveBytecodeFile();
		const serializedBytecode = bytecodeFile.getSerializedBytecode();
		const reifiedBytecode = bytecodeFile.getReifiedBytecode();
		const currentTimelineName = options.timelineName ? options.timelineName : timelineRow.component.getCurrentTimelineName();
		const currentTimelineTime = options.timelineTime !== void 0 ? options.timelineTime : timelineRow.component.getCurrentTimelineTime();
		const propertyDescriptor = timelineRow.getDescriptor();
		const fallbackValue = propertyDescriptor.fallback;
		const baselineValue = TimelineProperty$4.getBaselineValue(componentId, elementName, propertyName, currentTimelineName, currentTimelineTime, fallbackValue, reifiedBytecode, hostInstance, hostStates);
		const baselineCurve = TimelineProperty$4.getBaselineCurve(componentId, elementName, propertyName, currentTimelineName, currentTimelineTime, fallbackValue, reifiedBytecode, hostInstance, hostStates);
		const computedValue = TimelineProperty$4.getComputedValue(componentId, elementName, propertyName, currentTimelineName, currentTimelineTime, fallbackValue, reifiedBytecode, hostInstance, hostStates);
		const assignedValueObject = TimelineProperty$4.getAssignedValueObject(componentId, elementName, propertyName, currentTimelineName, currentTimelineTime, serializedBytecode);
		const assignedValue = assignedValueObject && assignedValueObject.value;
		const bookendValueObject = TimelineProperty$4.getAssignedBaselineValueObject(componentId, elementName, propertyName, currentTimelineName, currentTimelineTime, serializedBytecode);
		const bookendValue = bookendValueObject && bookendValueObject.value;
		let prettyValue;
		if (assignedValue !== void 0) {
			if (assignedValue && typeof assignedValue === "object" && assignedValue.__function) {
				let cleanValue = Expression$1.retToEq(assignedValue.__function.body.trim());
				if (cleanValue.length > 6) cleanValue = `${cleanValue.slice(0, 6)}…`;
				prettyValue = {
					text: cleanValue,
					style: { whiteSpace: "nowrap" },
					render: "react"
				};
			}
		}
		if (prettyValue === void 0) {
			if (assignedValue === void 0 && bookendValue !== void 0) {
				if (bookendValue && typeof bookendValue === "object" && bookendValue.__function) prettyValue = {
					text: "⚡",
					style: { fontSize: "11px" },
					render: "react"
				};
			}
		}
		if (prettyValue === void 0) {
			const formattedPrettyValue = typeof computedValue === "number" ? numeral(computedValue || 0).format(options.numFormat || "0,0[.]0") : computedValue;
			prettyValue = { text: isNaN(formattedPrettyValue) ? computedValue : formattedPrettyValue };
		}
		return {
			timelineTime: currentTimelineTime,
			timelineName: currentTimelineName,
			propertyName,
			valueUnit: Timeline$4.inferUnitOfValue(propertyDescriptor.name),
			valueLabel: Property$4.humanizePropertyName(propertyName),
			fallbackValue,
			baselineValue,
			baselineCurve,
			computedValue,
			assignedValue,
			bookendValue,
			prettyValue
		};
	};
	Timeline$4.DEFAULT_NAME = "Default";
	Timeline$4.TIME_DISPLAY_MODE = {
		FRAMES: "frames",
		SECONDS: "seconds"
	};
	module.exports = Timeline$4;
	const Expression$1 = require_Expression();
	const Keyframe$4 = require_Keyframe();
	const Property$4 = require_Property();
}) });

//#endregion
//#region src/bll/Keyframe.js
var require_Keyframe = /* @__PURE__ */ __commonJS({ "src/bll/Keyframe.js": ((exports, module) => {
	const HaikuComponent$1 = require("@haiku/core/lib/HaikuComponent").default;
	const expressionToRO$2 = require("@haiku/core/lib/reflection/expressionToRO").default;
	const Curve = require("@haiku/core/lib/api").Curve;
	const { isDecomposableCurve, getCurveInterpolationPoints } = require("haiku-formats");
	const BaseModel$15 = require_BaseModel();
	/**
	* @class Keyframe
	* @description
	*  Abstraction over the raw representation of keyframes in bytecode.
	*  Helps with the following:
	*    - Managing state changes between keyframes: selected, dragging, etc.
	*    - Makes complicated actions like dragging multiple keyframes easy
	*    - Handling model updates like changing curves, changing the ms time, etc.
	*    - Has some logic for color changes that probably should be moved #FIXME
	*/
	var Keyframe$3 = class Keyframe$3 extends BaseModel$15 {
		constructor(props, opts) {
			super(props, opts);
			this._selected = false;
			this._selectedBody = false;
			this._activated = false;
			this._dragStartPx = null;
			this._dragStartMs = null;
			this._needsMove = false;
			this._hasMouseDown = false;
			this._lastMouseDown = 0;
			this._didHandleDragStop = false;
			this._didHandleContextMenu = false;
			this._mouseDownState = {};
			this._updateReceivers = {};
			this._viewPosition = {};
		}
		activate() {
			if (!this._activated) {
				this._activated = true;
				this.notifyUpdateReceivers("keyframe-activated");
			}
		}
		deactivate() {
			if (this._activated) {
				this._activated = false;
				this.notifyUpdateReceivers("keyframe-deactivated");
			}
		}
		isActive() {
			return this._activated;
		}
		select() {
			if (!this._selected) {
				this._selected = true;
				this.notifyUpdateReceivers("keyframe-selected");
			}
		}
		deselect() {
			if (this._selected) {
				this._selected = false;
				this.notifyUpdateReceivers("keyframe-deselected");
			}
		}
		setBodySelected() {
			if (!this._selectedBody) {
				this._selectedBody = true;
				this.notifyUpdateReceivers("keyframe-body-selected");
			}
		}
		unsetBodySelected() {
			if (this._selectedBody) {
				this._selectedBody = false;
				this.notifyUpdateReceivers("keyframe-body-unselected");
			}
		}
		deselectAndDeactivate() {
			this.unsetBodySelected();
			this.deselect();
			this.deactivate();
		}
		isSelected() {
			return this._selected;
		}
		isSelectedBody() {
			return this._selectedBody;
		}
		delete(metadata) {
			this.row.deleteKeyframe(this, metadata);
			Timeline$3.clearCaches();
			return this;
		}
		dragStart(dragData) {
			this._dragStartMs = this.getMs();
			this._dragStartPx = dragData.x;
			return this;
		}
		dragStop() {
			this._dragStartMs = null;
			this._dragStartPx = null;
			return this;
		}
		drag(pxpf, mspf, dragData, metadata) {
			const pxChange = dragData.lastX - this._dragStartPx;
			const msChange = Math.round(pxChange / pxpf * mspf);
			this.move(msChange, this._dragStartMs, mspf);
			return this;
		}
		move(msChange, msOrig, mspf) {
			const msFinal = msOrig + msChange;
			if (msFinal >= 0) this.moveTo(msFinal, mspf);
			return this;
		}
		moveTo(ms, mspf) {
			if (this.getMs() === ms) return this;
			this.setMs(ms);
			const msMargin = Math.round(mspf);
			if (this.next()) {
				if (this.getMs() >= this.next().getMs() - 1) {
					const nextMs = this.getMs() + msMargin;
					if (nextMs >= 0) this.next().moveTo(nextMs, mspf);
				}
			}
			if (this.prev()) {
				if (this.getMs() <= this.prev().getMs() + 1) {
					const prevMs = this.getMs() - msMargin;
					if (prevMs >= 0) this.prev().moveTo(prevMs, mspf);
				}
			}
			return this;
		}
		createKeyframe(value, ms, metadata) {
			this.row.createKeyframe(value, ms, metadata);
			return this;
		}
		removeCurve(metadata) {
			if (this.next() && this.next().isActive()) {
				this.setCurve(null);
				this.component.splitSegment(this.element.getComponentId(), this.timeline.getName(), this.element.getNameString(), this.row.getPropertyNameString(), this.getMs(), metadata, () => {});
				this.row.emit("update", "keyframe-remove-curve");
			}
			return this;
		}
		addCurve(curveName, metadata) {
			this.setCurve(curveName);
			this.component.joinKeyframes(this.element.getComponentId(), this.timeline.getName(), this.element.getNameString(), this.row.getPropertyNameString(), this.getMs(), null, curveName, metadata, () => {});
			this.row.emit("update", "keyframe-add-curve");
			return this;
		}
		changeCurve(curveName, metadata) {
			this.setCurve(curveName);
			this.component.changeSegmentCurve(this.element.getComponentId(), this.timeline.getName(), this.row.getPropertyNameString(), this.getMs(), curveName, metadata, () => {});
			this.row.emit("update", "keyframe-change-curve");
			return this;
		}
		isTransitionSegment() {
			const curve = this.getCurve();
			return Boolean(curve) && (Boolean(Curve[this.getCurveCapitalized()]) || Array.isArray(curve));
		}
		isConstantSegment() {
			return this.hasNextKeyframe();
		}
		hasConstantBody() {
			return this.next() && !this.getCurve();
		}
		hasCurveBody() {
			return Boolean(this.next() && this.isTransitionSegment());
		}
		/**
		* @method hasDecomposableCurve
		* @description Return if the current curve body is composed of multiple Bezier Curves.
		*/
		hasDecomposableCurve() {
			return this.hasCurveBody() && isDecomposableCurve(this.getCurve());
		}
		/**
		* @method getCurveInterpolationPoints
		* @description Returns the curve descomposed
		*/
		getCurveInterpolationPoints() {
			if (this.isTransitionSegment()) return getCurveInterpolationPoints(this.getCurve());
		}
		isSoloKeyframe() {
			const prev = this.prev();
			if (!prev) return true;
			return !prev.getCurve();
		}
		hasPreviousKeyframe() {
			return !!this.prev();
		}
		hasNextKeyframe() {
			return !!this.next();
		}
		setOrigMs(ms) {
			this.origMs = ms;
		}
		updateOwnMetadata() {
			const ms = this.getMs();
			const newUid = Keyframe$3.getInferredUid(this.row, ms);
			this.setOrigMs(ms);
			Keyframe$3.setInstancePrimaryKey(this, newUid);
		}
		getUniqueKey() {
			return this.getPrimaryKey();
		}
		getViewPosition() {
			return this._viewPosition;
		}
		isWithinCollapsedRow() {
			return this.row.isCollapsed() || this.row.isWithinCollapsedRow();
		}
		getFrame(mspf) {
			return Timeline$3.millisecondToNearestFrame(this.getMs(), mspf);
		}
		getOrigMs() {
			return this.origMs;
		}
		getMs() {
			return this.ms;
		}
		setMs(ms) {
			if (ms < 0) throw new Error("keyframes cannot be less than 0");
			const normalized = this.timeline.normalizeMs(ms);
			const previous = this.getMs();
			this.ms = normalized;
			Timeline$3.clearCaches();
			if (normalized !== previous) {
				this._needsMove = true;
				this.notifyUpdateReceivers("keyframe-ms-set");
				if (this.prev()) this.prev().notifyUpdateReceivers("keyframe-neighbor-move");
				if (this.next()) this.next().notifyUpdateReceivers("keyframe-neighbor-move");
			}
			return this;
		}
		getIndex() {
			return this.index;
		}
		getValue(serialized) {
			if (serialized) return expressionToRO$2(this.value);
			return this.value;
		}
		getSpec(edited, serialized) {
			const spec = { value: this.getValue(serialized) };
			if (edited) spec.edited = true;
			if (this.getCurve()) spec.curve = this.getCurve();
			return spec;
		}
		setCurve(value) {
			this.curve = value;
			return this;
		}
		getCurve() {
			return this.curve;
		}
		isVisible(a, b) {
			if (this.getMs() > b) return false;
			const next = this.next();
			return !next || this.getMs() >= a || next.getMs() >= a;
		}
		isTweenable() {
			if (typeof this.value === "string" || this.value instanceof String) {
				const ourPropertyName = this.row.getPropertyNameString();
				return HaikuComponent$1.PARSERS[ourPropertyName] || this.value == Number.parseFloat(this.value, 10);
			}
			return typeof this.value !== "boolean";
		}
		next() {
			return this._next;
		}
		prev() {
			return this._prev;
		}
		isNextKeyframeSelected() {
			return this.next() && this.next().isSelected();
		}
		getPixelOffsetRight(base, pxpf, mspf) {
			if (base === void 0 || pxpf === void 0 || mspf === void 0) throw new Error(`keyframe pixel offset right params missing`);
			if (this.next()) return (this.next().getFrame(mspf) - base) * pxpf;
			return 0;
		}
		getPixelOffsetLeft(base, pxpf, mspf) {
			if (base === void 0 || pxpf === void 0 || mspf === void 0) throw new Error(`keyframe pixel offset left params missing`);
			return (this.getFrame(mspf) - base) * pxpf;
		}
		storeViewPosition({ rect, offset }) {
			this._viewPosition = {
				left: rect.left + offset,
				right: rect.right + offset
			};
		}
		clearViewPosition() {
			this._viewPosition = {};
		}
		isWithinCollapsedClusterHeadingRow() {
			return this.row && this.row.parent && this.row.parent.isClusterHeading() && this.row.parent.isCollapsed();
		}
		isClusterMember() {
			return this.row && this.row.parent && this.row.parent.isClusterHeading();
		}
		getElementHeadingRow() {
			if (this.row && this.row.parent) {
				if (this.row.parent.isClusterHeading()) return this.row.parent.parent;
				return this.row.parent;
			}
		}
		getClusterHeadingRow() {
			if (this.row && this.row.parent) {
				if (this.row.parent.isClusterHeading()) return this.row.parent;
			}
		}
		getCurveCapitalized() {
			const curve = this.getCurve();
			if (Array.isArray(curve)) return "Custom";
			if (typeof curve !== "string" && !(curve instanceof String)) return "";
			return curve.charAt(0).toUpperCase() + curve.slice(1);
		}
		isWithinCollapsedElementHeadingRow() {
			const elementHeading = this.getElementHeadingRow();
			return elementHeading.isCollapsed() || elementHeading.isWithinCollapsedRow();
		}
		getLeftKeyframeColorState() {
			if (this.isActive()) return "LIGHTEST_PINK";
			if (this.isWithinCollapsedElementHeadingRow()) return "BLUE";
			if (this.isWithinCollapsedClusterHeadingRow()) return "DARK_ROCK";
			return "ROCK";
		}
		getRightKeyframeColorState() {
			if (this.next() && this.next().isActive()) return "LIGHTEST_PINK";
			if (this.isWithinCollapsedElementHeadingRow()) return "BLUE";
			if (this.isWithinCollapsedClusterHeadingRow()) return "DARK_ROCK";
			return "ROCK";
		}
		getCurveColorState() {
			if (this.isSelected() && this.isActive() && this.isCurveSelected()) return "LIGHTEST_PINK";
			if (this.isWithinCollapsedElementHeadingRow()) return "BLUE";
			if (this.isWithinCollapsedClusterHeadingRow()) return "DARK_ROCK";
			return "ROCK";
		}
		isCurveSelected() {
			return this.hasCurveBody() && this.isSelectedBody();
		}
		setMouseDown() {
			this._hasMouseDown = true;
			this._lastMouseDown = Date.now();
		}
		getLastMouseDown() {
			return this._lastMouseDown;
		}
		unsetMouseDown() {
			this._hasMouseDown = false;
		}
		isMouseDown() {
			return this._hasMouseDown;
		}
		setMouseDownState({ wasSelected, wasSelectedBody, wasCurveTargeted }) {
			this._mouseDownState = {
				wasSelected,
				wasSelectedBody,
				wasCurveTargeted
			};
		}
		unsetMouseDownState() {
			this._mouseDownState = {};
		}
		getMouseDownState() {
			return this._mouseDownState;
		}
		setDidHandleDragStop() {
			this._didHandleDragStop = true;
		}
		unsetDidHandleDragStop() {
			this._didHandleDragStop = false;
		}
		didHandleDragStop() {
			return this._didHandleDragStop;
		}
		setDidHandleContextMenu() {
			this._didHandleContextMenu = true;
		}
		unsetDidHandleContextMenu() {
			this._didHandleContextMenu = false;
		}
		didHandleContextMenu() {
			return this._didHandleContextMenu;
		}
		updateActivationStatesAccordingToNeighborStates() {
			const prevKeyframe = this.prev();
			/**
			* o keyframe
			* - constant segment
			* ~ curve segment
			*
			*   |<~this keyframe
			*   |
			*   o
			*   o-o <~ has next only
			*   o~o
			* o-o   <~ has prev only
			* o~o
			* o-o-o <~ has next and prev
			* o~o-o
			* o-o~o
			* o~o~o
			*/
			if (prevKeyframe) {
				if (prevKeyframe.isSelected()) {
					if (prevKeyframe.isSelectedBody()) this.select();
				}
			}
			if (this.isSelected()) this.activate();
			else this.deactivate();
		}
		handleMouseDown({ nativeEvent: { which } }, { isShiftKeyDown, isControlKeyDown, isCommandKeyDown }, { isViaConstantBodyView, isViaTransitionBodyView }) {
			if (isControlKeyDown || which === 3) return this.handleContextMenu({
				isShiftKeyDown,
				isControlKeyDown,
				isCommandKeyDown
			}, {
				isViaConstantBodyView,
				isViaTransitionBodyView
			});
			this.setMouseDown();
			this.unsetDidHandleDragStop();
			const isCurveTargeted = isViaTransitionBodyView || isViaConstantBodyView;
			this.setMouseDownState({
				wasSelected: this.isSelected(),
				wasSelectedBody: this.isSelectedBody(),
				wasCurveTargeted: isCurveTargeted
			});
			if (!isShiftKeyDown && !isCommandKeyDown) {
				if (!this.isSelected()) this.clearOtherKeyframes();
			}
			this.select();
			if (isCurveTargeted) this.setBodySelected();
			this.updateActivationStatesInRow();
		}
		updateActivationStatesInRow() {
			this.row.getKeyframes().forEach((keyframe) => {
				keyframe.updateActivationStatesAccordingToNeighborStates();
			});
		}
		handleMouseUp({ nativeEvent: { which } }, { lastMouseButtonPressed, isShiftKeyDown, isControlKeyDown, isCommandKeyDown }, { isViaConstantBodyView, isViaTransitionBodyView }) {
			if (!this.isMouseDown()) {
				const otherKeyframe = Keyframe$3.where({
					_hasMouseDown: true,
					component: this.component
				})[0];
				if (otherKeyframe && otherKeyframe !== this) otherKeyframe.handleMouseUp({ nativeEvent: { which } }, {
					lastMouseButtonPressed,
					isShiftKeyDown,
					isControlKeyDown,
					isCommandKeyDown
				}, {
					isViaConstantBodyView,
					isViaTransitionBodyView
				});
				return;
			}
			this.unsetMouseDown();
			if (this.didHandleDragStop()) {
				this.unsetDidHandleDragStop();
				return;
			}
			const { wasSelected, wasSelectedBody, wasCurveTargeted } = this.getMouseDownState();
			this.unsetMouseDownState();
			if (!isShiftKeyDown && !isCommandKeyDown) this.clearOtherKeyframes();
			if (isShiftKeyDown || isCommandKeyDown) if (wasCurveTargeted) if (wasSelectedBody) this.unsetBodySelected();
			else this.setBodySelected();
			else if (wasSelected) {
				this.unsetBodySelected();
				this.deselect();
			} else this.select();
			else if (!wasCurveTargeted) this.unsetBodySelected();
			this.updateActivationStatesInRow();
			this.component.dragStopSelectedKeyframes();
		}
		handleContextMenu({ isShiftKeyDown, isCommandKeyDown }, { isViaConstantBodyView, isViaTransitionBodyView }) {
			this.unsetMouseDown();
			this.unsetMouseDownState();
			if (this.didHandleContextMenu()) {
				this.unsetDidHandleContextMenu();
				return;
			}
			this.setDidHandleContextMenu();
			if (this.isWithinCollapsedRow()) return;
			const isCurveTargeted = isViaTransitionBodyView || isViaConstantBodyView;
			if (!isShiftKeyDown && !isCommandKeyDown) {
				if (isCurveTargeted && !this.isNextKeyframeSelected()) this.clearOtherKeyframes();
				if (!this.isSelected()) this.clearOtherKeyframes();
			}
			this.select();
			if (isCurveTargeted) this.setBodySelected();
			this.updateActivationStatesInRow();
			this.component.dragStopSelectedKeyframes();
		}
		handleDragStop(dragData, { wasDrag, lastMouseButtonPressed, isShiftKeyDown, isControlKeyDown, isCommandKeyDown }, { isViaConstantBodyView, isViaTransitionBodyView }) {
			if (!wasDrag) return this.handleMouseUp({ nativeEvent: { which: 1 } }, {
				isShiftKeyDown,
				isControlKeyDown,
				isCommandKeyDown
			}, {
				isViaConstantBodyView,
				isViaTransitionBodyView
			});
			if (this.didHandleDragStop()) {
				this.unsetDidHandleDragStop();
				return;
			}
			this.setDidHandleDragStop();
			this.component.dragStopSelectedKeyframes();
		}
		clearOtherKeyframes() {
			Keyframe$3.where({ component: this.component }).forEach((keyframe) => {
				if (keyframe !== this) keyframe.deselectAndDeactivate();
			});
		}
		/**
		* @method dump
		* @description When debugging, use this to log a concise shorthand of this entity.
		*/
		dump() {
			let str = `${this.row.getPropertyNameString()}[${this.getIndex()}]:${this.getMs()}/${this.getCurve() || "!"}`;
			if (this.isTransitionSegment()) str += " {t}";
			if (this.isConstantSegment()) str += " {c}";
			if (this.isSoloKeyframe()) str += " {s}";
			if (this.prev()) str += " <";
			if (this.next()) str += " >";
			return str;
		}
	};
	Keyframe$3.DEFAULT_OPTIONS = { required: {
		component: true,
		timeline: true,
		element: true,
		row: true,
		ms: true,
		index: true,
		value: true
	} };
	BaseModel$15.extend(Keyframe$3);
	Keyframe$3.deselectAndDeactivateAllKeyframes = (criteria) => {
		Keyframe$3.where(criteria).forEach((keyframe) => {
			keyframe.unsetBodySelected();
			keyframe.deselect();
			keyframe.deactivate();
		});
	};
	Keyframe$3.getInferredUid = (row, ms) => {
		return `${row.getPrimaryKey()}-keyframe-${ms}`;
	};
	Keyframe$3.clearAllViewPositions = (filter) => {
		Keyframe$3.where(filter).forEach((keyframe) => {
			keyframe.clearViewPosition();
		});
	};
	Keyframe$3.buildKeyframeMoves = (criteria, serialized) => {
		const moves = {};
		Keyframe$3.where(Object.assign({ _needsMove: true }, criteria)).forEach((movable) => {
			if (!movable._needsMove) return null;
			const timelineName = movable.timeline.getName();
			const componentId = movable.element.getComponentId();
			const propertyName = movable.row.getPropertyNameString();
			if (!moves[timelineName]) moves[timelineName] = {};
			if (!moves[timelineName][componentId]) moves[timelineName][componentId] = {};
			if (!moves[timelineName][componentId][propertyName]) moves[timelineName][componentId][propertyName] = {};
			Keyframe$3.where(criteria).forEach((partner) => {
				if (partner.timeline.getName() !== timelineName) return null;
				if (partner.element.getComponentId() !== componentId) return null;
				if (partner.row.getPropertyNameString() !== propertyName) return null;
				moves[timelineName][componentId][propertyName][partner.getMs()] = partner.getSpec(true, serialized);
				partner._needsMove = false;
			});
			moves[timelineName][componentId][propertyName][movable.getMs()] = movable.getSpec(true, serialized);
			movable._needsMove = false;
		});
		return moves;
	};
	Keyframe$3.findIntersectingWithArea = ({ component, area, offset, viewCoordinatesProvider }) => {
		return Keyframe$3.where({ component }).filter((keyframe) => {
			const keyframeView = keyframe.getViewPosition();
			if (!keyframeView.left || keyframe.element.isLocked()) return false;
			if (keyframeView.left - offset.horizontal > area.right || area.left > keyframeView.right - offset.horizontal) return false;
			const freshBounds = viewCoordinatesProvider(keyframe);
			return freshBounds && !(freshBounds.top > area.bottom || area.top > freshBounds.bottom);
		}).reduce((acc, keyframe) => {
			return acc.set(keyframe.getUniqueKey(), keyframe);
		}, /* @__PURE__ */ new Map());
	};
	Keyframe$3.marqueeSelect = ({ component, area, offset, viewCoordinatesProvider }) => {
		const selected = Keyframe$3.findIntersectingWithArea({
			component,
			area,
			offset,
			viewCoordinatesProvider
		});
		Keyframe$3.any({
			component,
			_selected: true
		}).forEach((keyframe) => {
			if (!selected.has(keyframe.getUniqueKey())) {
				keyframe.deselect();
				if (keyframe.isConstantSegment() || keyframe.isTransitionSegment()) keyframe.unsetBodySelected();
				keyframe.updateActivationStatesInRow();
			}
		});
		selected.forEach((keyframe) => {
			keyframe.select();
			if (keyframe.isConstantSegment() || keyframe.isTransitionSegment()) keyframe.setBodySelected();
			keyframe.updateActivationStatesInRow();
		});
	};
	Keyframe$3.epandRowsOfSelectedKeyframes = ({ component, from }) => {
		Keyframe$3.any({
			component,
			_selected: true
		}).forEach((keyframe) => {
			if (!keyframe.row._isExpanded) keyframe.row.expand({ from });
		});
	};
	Keyframe$3.groupIsSingleTween = (keyframes) => {
		return keyframes.length === 2 && keyframes[0].next() === keyframes[1] && keyframes[0].hasCurveBody();
	};
	/**
	* @method groupHasBezierEditableCurves
	* @description Determines if every keyframe in a group can be edited via the
	* Bezier Curve editor by the following criteria:
	* @returns boolean
	*
	* - Every keyframe has a curve body
	* - Every curve is the same curve (so they can all be edited with a single editor)
	* - Every curve can be represented via a single Bezier Curve (FIXME: allow chains of curves)
	*/
	Keyframe$3.groupHasBezierEditableCurves = (keyframes) => {
		if (!keyframes || keyframes.length === 0) return false;
		const referenceCurve = keyframes[0].getCurve();
		return keyframes.filter((kf) => kf.hasCurveBody()).every((kf) => kf.getCurve() === referenceCurve && !kf.hasDecomposableCurve());
	};
	module.exports = Keyframe$3;
	const Timeline$3 = require_Timeline();
}) });

//#endregion
//#region src/bll/Row.js
var require_Row = /* @__PURE__ */ __commonJS({ "src/bll/Row.js": ((exports, module) => {
	const { TimelineProperty: TimelineProperty$3 } = require_TimelineProperty();
	const BaseModel$14 = require_BaseModel();
	const NAVIGATION_DIRECTIONS = {
		SAME: 0,
		NEXT: 1,
		PREV: -1
	};
	/**
	* @class Row
	* @description
	*  Abstraction over the concept of a row that appears in the Timeline UI.
	*  In practice this is only used in the Timeline UI for managing the display
	*  of rows.
	*
	*  Things that can be a row:
	*    - A row of a single property
	*    - A row of a complex property's subproperty
	*    - The heading of a set of complex properties
	*    - The heading of an element (or component)
	*
	*  Rows are nested per the groupings mentioned above, so you can call row.children
	*  to get the rows that would be displayed inside/underneath that row in question
	*  (presuming that they are visible per the visibility rules).
	*/
	var Row$3 = class Row$3 extends BaseModel$14 {
		constructor(props, opts) {
			super(props, opts);
			this._isSelected = false;
			this._isFocused = false;
			this._isExpanded = false;
			this._isActive = false;
			this._isHidden = false;
			this._isHovered = false;
			this._wasInitiallyExpanded = false;
		}
		getUniqueKey() {
			return `${this.element.getComponentId()}+${this.element.getComponentId()}-${this.getType()}-${this.getClusterNameString()}-${this.getPropertyNameString()}`;
		}
		deselectOthers(metadata, skipSelectElements = false) {
			Row$3.where({ component: this.component }).forEach((row) => {
				if (row === this) return null;
				row.deselect(metadata, skipSelectElements);
			});
		}
		select(metadata) {
			if (!this._isSelected) {
				this.deselectOthers(metadata, true);
				this._isSelected = true;
				this.emit("update", "row-selected", metadata);
				if (this.isHeading() && this.element && !this.element.isSelected()) this.element.select(metadata);
			}
			return this;
		}
		deselect(metadata, skipSelectElements = false) {
			if (this._isSelected) {
				this._isSelected = false;
				this.emit("update", "row-deselected", metadata);
				if (!skipSelectElements && this.isHeading() && this.element && this.element.isSelected()) this.element.unselect(metadata);
			}
			return this;
		}
		isSelected() {
			return this._isSelected;
		}
		activate() {
			if (!this._isActive) {
				this._isActive = true;
				this.emit("update", "row-activated");
			}
			return this;
		}
		deactivate() {
			if (this._isActive) {
				this._isActive = false;
				this.emit("update", "row-deactivated");
			}
			return this;
		}
		isActive() {
			return this._isActive;
		}
		expand(metadata) {
			if (!this._isExpanded) {
				this._isExpanded = true;
				this.emit("update", "row-expanded", metadata);
			}
			if (this.parent) this.parent.expand(metadata);
			return this;
		}
		collapse(metadata) {
			if (this._isExpanded) {
				this._isExpanded = false;
				this.emit("update", "row-collapsed", metadata);
			}
			return this;
		}
		isCollapsed() {
			if (this.isProperty()) return false;
			return !this._isExpanded;
		}
		isExpanded() {
			if (this.isProperty()) return true;
			return this._isExpanded;
		}
		blurOthers(metadata) {
			Row$3.where({ component: this.component }).forEach((row) => {
				if (row !== this) row.blur(metadata);
			});
		}
		focus(metadata) {
			if (!this._isFocused) {
				this.blurOthers(metadata);
				this._isFocused = true;
				this.emit("update", "row-focused", metadata);
			}
			return this;
		}
		blur(metadata) {
			if (this._isFocused) {
				this._isFocused = false;
				this.emit("update", "row-blurred", metadata);
			}
			return this;
		}
		isFocused() {
			return this._isFocused;
		}
		hide() {
			if (!this._isHidden) {
				this._isHidden = true;
				this.emit("update", "row-hidden");
			}
			return this;
		}
		show() {
			if (this._isHidden) {
				this._isHidden = false;
				this.emit("update", "row-shown");
			}
			return this;
		}
		isHidden() {
			return this._isHidden;
		}
		hover(metadata) {
			if (!this._isHovered) {
				this._isHovered = true;
				this.emit("update", "row-hovered");
			}
			return this;
		}
		isHovered() {
			return this._isHovered;
		}
		hoverAndUnhoverOthers(metadata) {
			Row$3.where({ component: this.component }).forEach((row) => {
				if (row !== this) row.unhover(metadata);
			});
			this.hover(metadata);
		}
		unhover(metadata) {
			if (this._isHovered) {
				this._isHovered = false;
				this.emit("update", "row-unhovered");
			}
			return this;
		}
		expandAndSelect(metadata) {
			if (!this.isExpanded()) this.expand(metadata);
			if (!this.isSelected()) this.select(metadata);
			return this;
		}
		collapseAndDeselect(metadata) {
			if (this.isExpanded()) this.collapse(metadata);
			if (this.isSelected()) this.deselect(metadata);
			return this;
		}
		getBaselineValueAtMillisecond(ms) {
			const { baselineValue } = Timeline$2.getPropertyValueDescriptor(this, {
				timelineTime: ms,
				timelineName: this.timeline.getName()
			});
			return baselineValue;
		}
		getBaselineCurveAtMillisecond(ms) {
			const { baselineCurve } = Timeline$2.getPropertyValueDescriptor(this, {
				timelineTime: ms,
				timelineName: this.timeline.getName()
			});
			return baselineCurve;
		}
		delete() {
			this.children.forEach((child) => {
				child.delete();
			});
			this.destroy();
		}
		visit(visitor) {
			visitor(this);
			this.children.forEach((child) => {
				child.visit(visitor);
			});
		}
		rehydrate() {
			this.rehydrateKeyframes();
			this.emit("update", "row-rehydrated");
			if (this.parent) this.parent.emit("update", "child-row-rehydrated");
		}
		getKeyframesDescriptor() {
			return TimelineProperty$3.getValueGroup(this.element.getComponentId(), this.component.getCurrentTimelineName(), this.getPropertyNameString(), this.component.getReifiedBytecode());
		}
		rehydrateKeyframes() {
			const valueGroup = this.getKeyframesDescriptor();
			if (!valueGroup) return [];
			const keyframesList = Object.keys(valueGroup).map((keyframeKey) => Number.parseInt(keyframeKey, 10)).sort((a, b) => a - b);
			if (keyframesList.length < 1) return [];
			this.getKeyframes().forEach((keyframe) => {
				keyframe.mark();
			});
			for (let i$1 = 0; i$1 < keyframesList.length; i$1++) {
				const mscurr = keyframesList[i$1];
				if (isNaN(mscurr)) continue;
				if (!valueGroup[mscurr] || valueGroup[mscurr].value === void 0) continue;
				const value = valueGroup[mscurr].value;
				let curve = valueGroup[mscurr].curve;
				if (curve === void 0) curve = null;
				const uid = Keyframe$2.getInferredUid(this, mscurr);
				Keyframe$2.upsert({
					uid,
					origMs: mscurr,
					ms: mscurr,
					index: i$1,
					value,
					curve,
					row: this,
					element: this.element,
					timeline: this.timeline,
					component: this.component
				}, {});
			}
			this.getKeyframes().forEach((keyframe) => {
				keyframe.sweep();
			});
			const updatedKeyframes = this.getKeyframes();
			updatedKeyframes.forEach((keyframe, idx) => {
				keyframe._prev = updatedKeyframes[idx - 1];
				keyframe._next = updatedKeyframes[idx + 1];
			});
		}
		createKeyframe(value, ms, metadata) {
			if (this.isClusterHeading()) {
				this.children.forEach((child) => child.createKeyframe(value, ms, metadata));
				return this.expandAndSelect(metadata);
			}
			let valueToAssign;
			if (value === void 0) valueToAssign = this.getBaselineValueAtMillisecond(ms);
			else valueToAssign = value;
			const curveToAssign = this.getBaselineCurveAtMillisecond(ms);
			const parentSVG = this.element.getParentSvgElement();
			let options = {};
			if (parentSVG && this.element !== parentSVG) options = { setElementLockStatus: { [parentSVG.getComponentId()]: true } };
			this.component.createKeyframe(this.element.getComponentId(), this.timeline.getName(), this.element.getNameString(), this.getPropertyNameString(), ms, valueToAssign, curveToAssign, null, null, options, metadata, () => {});
			Timeline$2.clearCaches();
			this.emit("update", "keyframe-create");
			if (this.parent) {
				this.parent.emit("update", "keyframe-create");
				if (this.parent.parent) this.parent.parent.emit("update", "keyframe-create");
			}
		}
		deleteKeyframe(keyframe, metadata) {
			keyframe.destroy();
			this.component.deleteKeyframe(this.element.getComponentId(), this.timeline.getName(), this.getPropertyNameString(), keyframe.getMs(), metadata, () => {});
			Timeline$2.clearCaches();
			this.emit("update", "keyframe-delete");
			if (this.parent) this.parent.emit("update", "keyframe-delete");
		}
		getDescriptor() {
			return this.property;
		}
		getKeyframes() {
			return Keyframe$2.where({ row: this }).sort((a, b) => a.index - b.index);
		}
		getKeyframeByMs(ms) {
			return this.getKeyframes().filter((keyframe) => {
				return keyframe.getMs() === ms;
			})[0];
		}
		mapVisibleKeyframes({ maxDepth = Infinity }, iteratee) {
			if (this.getDepthAmongRows() > maxDepth) return [];
			if (this.isHeading() || this.isClusterHeading()) return [...this.children.map((child) => child.mapVisibleKeyframes({ maxDepth }, iteratee))];
			return this.getKeyframes().map(iteratee);
		}
		isState() {
			return this.property && this.property.type === "state";
		}
		isFirstRowOfPropertyCluster() {
			return this.cluster && this.property && this.getIndexWithinParentRow() === 0;
		}
		isClusterProperty() {
			return this.cluster && !this.property;
		}
		isClusterHeading() {
			return this.cluster && !this.property;
		}
		isCluster() {
			return !!this.cluster;
		}
		isProperty() {
			return !!this.property;
		}
		isPropertyOfName(propertyName) {
			return this.property && this.property.name === propertyName;
		}
		isHeading() {
			return !this.property && !this.cluster;
		}
		getType() {
			if (this.isClusterHeading()) return "cluster-heading";
			if (this.isHeading()) return "element-heading";
			if (this.isProperty()) return "property";
			return "unknown";
		}
		getAddress() {
			let id$1;
			if (this.isHeading()) id$1 = "heading";
			else if (this.isClusterHeading()) id$1 = "cluster-heading";
			else id$1 = this.getPropertyNameString();
			return `${this.element.getGraphAddress()}/${id$1}`;
		}
		getClusterNameString() {
			return this.cluster && this.cluster.name;
		}
		getPropertyNameString() {
			return this.property && this.property.name;
		}
		getClusterValues() {
			return this.children.map((row) => {
				return row.getPropertyValueDescriptor();
			});
		}
		getPropertyValueDescriptor() {
			return Timeline$2.getPropertyValueDescriptor(this, { numFormat: "0,0[.]000" });
		}
		getPropertyId() {
			return `${this.element.getComponentId()}-${this.element.getNameString()}-${this.getPropertyNameString()}`;
		}
		getInputPropertyId() {
			return `property-input-field-box-${this.getPropertyId()}`;
		}
		getPropertyName() {
			return this.property && this.property.name;
		}
		isClusterActivated(item) {
			return false;
		}
		isRootRow() {
			return !this.parent;
		}
		isWithinCollapsedRow() {
			return this.parent && (this.parent.isCollapsed() || this.parent.isWithinCollapsedRow());
		}
		representsStringNode() {
			return typeof this.element.getStaticTemplateNode() === "string";
		}
		clearEntityCaches() {
			if (this.children) this.children.forEach((row) => {
				row.cache.clear();
				row.clearEntityCaches();
			});
			this.getKeyframes().forEach((keyframe) => {
				keyframe.cache.clear();
			});
		}
		getPosition() {
			if (typeof this.position === "number") return this.position;
			return Number.MAX_SAFE_INTEGER;
		}
		setPosition(position) {
			this.position = position;
		}
		getDepthAmongRows() {
			let depth = 0;
			let parent = this.parent;
			while (parent) {
				if (parent.element.hasAddressableProperties) depth += 1;
				parent = parent.parent;
			}
			return depth;
		}
		getDepthAmongElements() {
			return this.element.getDepthAmongElements();
		}
		getAllSiblings() {
			return this.parent && this.parent.children || [];
		}
		getIndexWithinParentRow() {
			const siblings = this.getAllSiblings();
			for (let i$1 = 0; i$1 < siblings.length; i$1++) if (siblings[i$1] === this) return i$1;
			return 0;
		}
		next() {
			return this._next;
		}
		prev() {
			return this._prev;
		}
		shouldBeDisplayed(row) {
			if (this.isHeading()) return true;
			if (this.isCluster()) return true;
			if (Property$3.includeInAddressables(this.getPropertyNameString(), this.element, this.property, this.getKeyframesDescriptor())) {
				this.parent = row;
				return true;
			}
			return false;
		}
		silentlyExpandAllGParents() {
			if (this.isRootRow()) return;
			if (this.element.getNameString() === "g") this._isExpanded = true;
			if (this.parent) this.parent.silentlyExpandAllGParents();
		}
		/**
		* @method dump
		* @description When debugging, use this to log a concise shorthand of this entity.
		*/
		dump() {
			let str = `${this.getType()}.${this.element.getComponentId()}<${this.element.getSafeDomFriendlyName()}>|${this.getDepthAmongRows()}.${this.getIndexWithinParentRow()}`;
			if (this.isCluster()) str += `.${this.cluster.prefix}[]`;
			if (this.isProperty()) str += `.${this.getPropertyName()}`;
			return str;
		}
	};
	Row$3.DEFAULT_OPTIONS = { required: {
		timeline: true,
		element: true,
		component: true
	} };
	BaseModel$14.extend(Row$3);
	Row$3.top = (criteria) => {
		return Row$3.find(Object.assign({ parent: null }, criteria));
	};
	Row$3.findByComponentAndHaikuId = (component, haikuId) => {
		return Row$3.where({ component }).filter((row) => {
			return row.element.getComponentId() === haikuId;
		})[0];
	};
	Row$3.findPropertyRowsByComponentAndParentHaikuId = (component, haikuId) => {
		return Row$3.where({ component }).filter((row) => {
			return row.isProperty() && row.parent && row.parent.element.getComponentId() === haikuId;
		});
	};
	Row$3.cyclicalNav = (criteria, row, navDir) => {
		let target;
		if (navDir === void 0 || navDir === null || navDir === NAVIGATION_DIRECTIONS.SAME) target = row;
		else if (row && navDir === NAVIGATION_DIRECTIONS.NEXT) target = row.next();
		else if (row && navDir === NAVIGATION_DIRECTIONS.PREV) target = row.prev();
		if (target && !target.isProperty()) {
			if (navDir !== void 0 && navDir !== null && navDir !== NAVIGATION_DIRECTIONS.SAME) return Row$3.cyclicalNav(criteria, target, navDir);
		}
		return target;
	};
	Row$3.focusSelectNext = (criteria, navDir, doFocus, metadata) => {
		const selected = Row$3.getSelectedRow(criteria);
		const focused = Row$3.getFocusedRow(criteria);
		if (selected) {
			selected.blur(metadata);
			selected.deselect(metadata);
		}
		if (focused) {
			focused.blur(metadata);
			focused.deselect(metadata);
		}
		const previous = focused || selected;
		const target = previous ? Row$3.cyclicalNav(criteria, previous, navDir) : Row$3.cyclicalNav(criteria, Row$3.findByGlobalPosition(criteria, 0), navDir);
		if (target) {
			target.expand(metadata);
			target.select(metadata);
			if (doFocus) target.focus(metadata);
		}
	};
	Row$3.getSelectedRow = function getSelectedRow(criteria) {
		return Row$3.where(criteria).filter((row) => {
			return row._isSelected;
		})[0];
	};
	Row$3.getFocusedRow = function getFocusedRow(criteria) {
		return Row$3.where(criteria).filter((row) => {
			return row._isFocused;
		})[0];
	};
	/**
	* @function rmap
	* @description Recursively 'map' through all rows, their children, etc.
	*/
	Row$3.rmap = function _rmap(criteria, iteratee) {
		return rmap([Row$3.top(criteria)], iteratee);
	};
	Row$3.rsmap = function _rsmap(criteria, iteratee, indentation) {
		const tree = rsmap([Row$3.top(criteria)], iteratee);
		return tlines([], "", indentation || "    ", tree).join("\n");
	};
	function rmap(rows, iteratee) {
		return rows.map((row) => {
			const out$1 = iteratee(row);
			if (!out$1) throw new Error("rmap iteratee must return an object");
			if (typeof out$1 !== "object") throw new TypeError("rmap iteratee must return an object");
			out$1.children = rmap(row.children, iteratee);
			return out$1;
		});
	}
	function rsmap(rows, iteratee) {
		return rows.map((row) => {
			const out$1 = iteratee(row);
			if (typeof out$1 !== "string") throw new TypeError("rmap iteratee must return a string");
			return {
				text: out$1,
				children: rsmap(row.children, iteratee)
			};
		});
	}
	function tlines(lines, indent, indentation, nodes) {
		nodes.forEach((node) => {
			lines.push(indent + node.text);
			tlines(lines, indent + indentation, indentation, node.children);
		});
		return lines;
	}
	Row$3.dumpHierarchyInfo = (criteria) => {
		return Row$3.rsmap(criteria, (row) => {
			return row.dump();
		});
	};
	Row$3.buildPropertyUid = (component, targetElement, addressableName) => {
		const elementId = `${targetElement.getComponentId()}`;
		return `${component.getPrimaryKey()}::${elementId}-property-${addressableName}`;
	};
	Row$3.buildClusterUid = (component, targetElement, propertyGroupDescriptor) => {
		const elementId = `${targetElement.getComponentId()}`;
		return `${component.getPrimaryKey()}::${elementId}-cluster-${propertyGroupDescriptor.cluster.prefix}`;
	};
	Row$3.buildClusterMemberUid = (component, targetElement, propertyGroupDescriptor, addressableName) => {
		const elementId = `${targetElement.getComponentId()}`;
		return `${component.getPrimaryKey()}::${elementId}-cluster-${propertyGroupDescriptor.cluster.prefix}-property-${addressableName}`;
	};
	Row$3.buildHeadingUid = (component, targetElement) => {
		return `${component.getPrimaryKey()}::${targetElement.getComponentId()}-heading`;
	};
	module.exports = Row$3;
	const Keyframe$2 = require_Keyframe();
	const Property$3 = require_Property();
	const Timeline$2 = require_Timeline();
}) });

//#endregion
//#region src/bll/Element.js
var require_Element = /* @__PURE__ */ __commonJS({ "src/bll/Element.js": ((exports, module) => {
	const lodash$2 = require("lodash");
	const HaikuElement = require("@haiku/core/lib/HaikuElement").default;
	const Layout3D$1 = require("@haiku/core/lib/Layout3D").default;
	const { cssQueryTree } = require("@haiku/core/lib/HaikuNode");
	const { default: composedTransformsToTimelineProperties } = require("haiku-common");
	const functionToRFO = require("@haiku/core/lib/reflection/functionToRFO").default;
	const { LAYOUT_3D_SCHEMA: LAYOUT_3D_SCHEMA$1 } = require("@haiku/core/lib/HaikuComponent");
	const KnownDOMEvents = require("@haiku/core/lib/renderers/dom/Events").default;
	const decamelize = require("decamelize");
	const Matrix$1 = require("gl-matrix");
	const { Experiment: Experiment$4, experimentIsEnabled: experimentIsEnabled$4 } = require("haiku-common");
	const polygonOverlap = require("polygon-overlap");
	const titlecase = require("titlecase");
	const logger$6 = require_LoggerInstance();
	const BaseModel$13 = require_BaseModel();
	const TransformCache$1 = require_TransformCache();
	/**
	* Tag names with no presentational context on their own. These are usually found inside <defs>, but technically don't
	* have to be.
	*/
	const DEFABLE_TAG_NAMES = {
		hatch: true,
		linearGradient: true,
		meshGradient: true,
		pattern: true,
		radialGradient: true,
		solidcolor: true,
		filter: true
	};
	/**
	* Attributes which only show on SVG and shouldn't be copied during ungrouping.
	*/
	const SVG_ONLY_ATTRIBUTES = {
		baseProfile: true,
		contentScriptType: true,
		contentStyleType: true,
		height: true,
		preserveAspectRatio: true,
		version: true,
		viewBox: true,
		xmlns: true,
		width: true
	};
	const HAIKU_ID_ATTRIBUTE$2 = "haiku-id";
	const HAIKU_TITLE_ATTRIBUTE$1 = "haiku-title";
	const HAIKU_LOCKED_ATTRIBUTE$1 = "haiku-locked";
	const HAIKU_SOURCE_ATTRIBUTE$2 = "haiku-source";
	const SYNC_LOCKED_ID_SUFFIX$1 = "#lock";
	const TIMELINE_EVENT_PREFIX = "timeline:";
	const EMPTY_ELEMENT = {
		elementName: "div",
		attributes: {},
		children: []
	};
	function isNumeric$1(n) {
		return !isNaN(Number.parseFloat(n)) && isFinite(n);
	}
	function getAncestry(ancestors, elementInstance) {
		ancestors.unshift(elementInstance);
		if (elementInstance.parent) getAncestry(ancestors, elementInstance.parent);
		return ancestors;
	}
	const cleanHaikuId = (str) => titlecase(decamelize(`${str}`.trim()).replace(/[\W_]/g, " "));
	/**
	* @class Element
	* @description
	*  Model to abstract on-stage elements. This model has logic for:
	*    - Locating elements
	*    - Getting elements' DOM nodes
	*    - Getting position, transformation, and bounding box info about the element
	*    - Changing the element's state, e.g. selected or hovered
	*    - Managing addressable properties for the element in component's context.
	*/
	var Element$3 = class Element$3 extends BaseModel$13 {
		constructor(props, opts) {
			super(props, opts);
			this._isHovered = false;
			this._isSelected = false;
			this._clusterAndPropertyRows = [];
			this._headingRow = null;
			this.transformCache = new TransformCache$1(this);
		}
		$el() {
			const staticTemplateNode = this.getStaticTemplateNode();
			if (typeof staticTemplateNode === "string") return null;
			const haikuId = staticTemplateNode.attributes && staticTemplateNode.attributes[HAIKU_ID_ATTRIBUTE$2];
			return Element$3.findDomNode(haikuId, this.component.getMount().$el());
		}
		afterInitialize() {
			if (!this._visibleProperties) this._visibleProperties = {};
		}
		oneListener($el, uid, type, fn) {
			if (!Element$3.cache.eventListeners[uid]) Element$3.cache.eventListeners[uid] = {};
			if (Element$3.cache.eventListeners[uid][type]) {
				$el.removeEventListener(type, Element$3.cache.eventListeners[uid][type]);
				delete Element$3.cache.eventListeners[uid][type];
			}
			Element$3.cache.eventListeners[uid][type] = fn;
			$el.addEventListener(type, fn);
			return fn;
		}
		hoverOn(metadata, softly = false) {
			if (!this._isHovered) {
				this.cache.clear();
				this._isHovered = true;
				if (!softly) this.emit("update", "element-hovered", metadata);
			}
			return this;
		}
		hoverOnSoftly(metadata) {
			return this.hoverOn(metadata, true);
		}
		hoverOff(metadata, softly = false) {
			if (this._isHovered) {
				this.cache.clear();
				this._isHovered = false;
				if (!softly) this.emit("update", "element-unhovered", metadata);
			}
		}
		hoverOffSoftly(metadata) {
			return this.hoverOff(metadata, true);
		}
		isHovered() {
			return this._isHovered;
		}
		isShimElement() {
			return this.parent && this.parent.getSource() === "<group>";
		}
		select(metadata, softly = false) {
			if (this.isLocked()) return;
			if (!this._isSelected) {
				this._isSelected = true;
				if (softly) this.emit("update", "element-selected-softly", metadata);
				else {
					const row = this.getHeadingRow();
					if (row) row.expandAndSelect(metadata);
					this.emit("update", "element-selected", metadata);
				}
			}
		}
		/**
		* @method selectSoftly
		* @description Like select, but emit a different event and don't select the row.
		* Mainly used for multi-selection in glass-only context.
		*/
		selectSoftly(metadata) {
			return this.select(metadata, true);
		}
		unselect(metadata, softly = false) {
			if (this._isSelected) {
				this._isSelected = false;
				if (softly) this.emit("update", "element-unselected-softly", metadata);
				else {
					const row = this.getHeadingRow();
					if (row && row.isSelected()) row.deselect(metadata);
					this.emit("update", "element-unselected", metadata);
				}
				ElementSelectionProxy$3.purge();
			}
		}
		/**
		* @method unselectSoftly
		* @description Like unselect, but emit a different event and don't select the row.
		* Mainly used for multi-selection in glass-only context.
		*/
		unselectSoftly(metadata) {
			return this.unselect(metadata, true);
		}
		getHeadingRow() {
			return this._headingRow;
		}
		getPropertyRowByPropertyName(propertyName) {
			for (let i$1 = 0; i$1 < this._clusterAndPropertyRows.length; i$1++) {
				const candidateRow = this._clusterAndPropertyRows[i$1];
				if (candidateRow.isPropertyOfName(propertyName)) return candidateRow;
			}
		}
		isSelected() {
			return this._isSelected;
		}
		isLocked() {
			return !!this.getStaticTemplateNode().attributes[HAIKU_LOCKED_ATTRIBUTE$1];
		}
		isLockedViaParents() {
			let p = this;
			while (p) {
				if (p.isLocked()) return true;
				p = p.parent;
			}
			return false;
		}
		toggleLocked(metadata, cb) {
			this.component.setLockedStatusForComponent(this.getComponentId(), !this.getStaticTemplateNode().attributes[HAIKU_LOCKED_ATTRIBUTE$1], metadata, cb);
			this.emit("update", "element-locked-toggle");
		}
		getStaticTemplateNode() {
			return this.component.locateTemplateNodeByComponentId(this.componentId);
		}
		getCoreHostComponentInstance() {
			return this.component.$instance;
		}
		copy() {
			return this.clip();
		}
		clip() {
			return this.buildClipboardPayload();
		}
		getVisibleEvents() {
			return Object.keys(this.getReifiedEventHandlers()).filter((handler) => !this.isTimelineEvent(handler));
		}
		getTimelineEvents() {
			return Object.keys(this.getReifiedEventHandlers()).filter((handler) => this.isTimelineEvent(handler));
		}
		isTimelineEvent(eventName) {
			return eventName.includes(TIMELINE_EVENT_PREFIX);
		}
		hasEventHandlers() {
			return !lodash$2.isEmpty(this.getReifiedEventHandlers());
		}
		hasVisibleEventHandlers() {
			return !lodash$2.isEmpty(this.getVisibleEvents());
		}
		getReifiedEventHandlers() {
			const bytecode = this.component.getReifiedBytecode();
			const selector = `haiku:${this.getComponentId()}`;
			if (!bytecode.eventHandlers) bytecode.eventHandlers = {};
			return bytecode.eventHandlers[selector] || {};
		}
		getReifiedEventHandler(eventName) {
			return this.getReifiedEventHandlers()[eventName];
		}
		getEventHandlerSaveStatus(eventName) {
			if (!this._eventHandlerSaves) this._eventHandlerSaves = {};
			return this._eventHandlerSaves[eventName];
		}
		setEventHandlerSaveStatus(eventName, statusValue) {
			if (!this._eventHandlerSaves) this._eventHandlerSaves = {};
			this._eventHandlerSaves[eventName] = statusValue;
			this.emit("update", "element-event-handler-save-status-update");
			return this;
		}
		getApplicableEventHandlerOptionsList() {
			const options = [];
			const predefined = {};
			Element$3.HIGHER_ORDER_EVENTS.forEach((spec) => {
				predefined[spec.value] = true;
			});
			options.push({
				label: "Favorites",
				options: Element$3.HIGHER_ORDER_EVENTS
			});
			const handlers = this.getReifiedEventHandlers();
			for (const category in KnownDOMEvents) {
				const suboptions = [];
				options.push({
					label: category,
					options: suboptions
				});
				for (const name in KnownDOMEvents[category]) {
					const candidate = KnownDOMEvents[category][name];
					predefined[name] = true;
					if (candidate.menuable || handlers[name]) suboptions.push({
						label: candidate.human || name,
						value: name
					});
				}
			}
			Element$3.COMPONENT_EVENTS.forEach((spec) => {
				predefined[spec.value] = true;
			});
			options.push({
				label: "Component/Lifecycle",
				options: Element$3.COMPONENT_EVENTS
			});
			const customEvents = [];
			for (const name in handlers) if (!this.isTimelineEvent(name) && !predefined[name]) customEvents.push({
				label: name,
				value: name
			});
			options.push({
				label: "Custom Events",
				options: customEvents
			});
			return options;
		}
		/**
		* @method buildClipboardPayload
		* @description Return a serializable payload for this object that represents sufficient
		* information to be able to paste (instantiate with overrides) or delete it if received as
		* part of a pasteThing command.
		*/
		buildClipboardPayload() {
			const originalNode = this.getStaticTemplateNode();
			const clonedNode = lodash$2.cloneDeep(Template$5.manaWithOnlyStandardProps(originalNode, true));
			const clonedBytecode = lodash$2.cloneDeepWith(this.component.fetchActiveBytecodeFile().getReifiedDecycledBytecode(), (value) => {
				if (typeof value === "function" && value.injectee) return functionToRFO(value);
			});
			const eventHandlers = Bytecode$4.getAppliedEventHandlersForNode({}, clonedBytecode, clonedNode);
			Object.keys(eventHandlers).forEach((element) => {
				Object.keys(eventHandlers[element]).forEach((event) => {
					eventHandlers[element][event].handler = functionToRFO(eventHandlers[element][event].handler);
				});
			});
			return {
				kind: "bytecode",
				data: {
					eventHandlers,
					timelines: Bytecode$4.getAppliedTimelinesForNode({}, clonedBytecode, clonedNode),
					template: clonedNode
				}
			};
		}
		getQualifiedBytecode() {
			const bytecode = Bytecode$4.clone(this.component.getReifiedBytecode());
			const template = Template$5.clone({}, Template$5.manaWithOnlyStandardProps(this.getStaticTemplateNode(), false));
			const states = Bytecode$4.getAppliedStatesForNode({}, bytecode, template);
			return {
				helpers: Bytecode$4.getAppliedHelpersForNode({}, bytecode, template),
				states,
				timelines: Bytecode$4.getAppliedTimelinesForNode({}, bytecode, template),
				eventHandlers: Bytecode$4.getAppliedEventHandlersForNode({}, bytecode, template),
				template
			};
		}
		isSyncLocked() {
			const node = this.getStaticTemplateNode();
			if (node && node.attributes && node.attributes[HAIKU_SOURCE_ATTRIBUTE$2]) return node.attributes[HAIKU_SOURCE_ATTRIBUTE$2].endsWith(SYNC_LOCKED_ID_SUFFIX$1);
			return false;
		}
		getStackingInfo() {
			if (!this.parent) return;
			if (!this.parent.getStaticTemplateNode()) return;
			return Template$5.getStackingInfo(this.component.getReifiedBytecode(), this.parent.getStaticTemplateNode(), this.component.getInstantiationTimelineName(), this.component.getInstantiationTimelineTime());
		}
		isAtFront() {
			const stackingInfo = this.getStackingInfo();
			if (!stackingInfo) return true;
			return lodash$2.findIndex(stackingInfo, { haikuId: this.getComponentId() }) === stackingInfo.length - 1;
		}
		isAtBack() {
			const stackingInfo = this.getStackingInfo();
			if (!stackingInfo) return true;
			return lodash$2.findIndex(stackingInfo, { haikuId: this.getComponentId() }) === 0;
		}
		sendToBack() {
			this.component.zMoveToBack(this.getComponentId(), this.component.getCurrentTimelineName(), 0, this.component.project.getMetadata(), (err) => {
				if (err) return;
			});
			this.emit("update", "element-send-to-back");
		}
		bringToFront() {
			this.component.zMoveToFront(this.getComponentId(), this.component.getCurrentTimelineName(), 0, this.component.project.getMetadata(), (err) => {
				if (err) return;
			});
			this.emit("update", "element-bring-to-front");
		}
		bringForward() {
			this.component.zMoveForward(this.getComponentId(), this.component.getCurrentTimelineName(), 0, this.component.project.getMetadata(), (err) => {
				if (err) return;
			});
			this.emit("update", "element-bring-forward");
		}
		sendBackward() {
			this.component.zMoveBackward(this.getComponentId(), this.component.getCurrentTimelineName(), 0, this.component.project.getMetadata(), (err) => {
				if (err) return;
			});
			this.emit("update", "element-send-backward");
		}
		getBoundingClientRect(marginX, marginY) {
			const points = this.getBoxPointsTransformed();
			if (marginX !== void 0 && marginY !== void 0) {
				const mat = Matrix$1.mat2d.create();
				const margin = Matrix$1.vec2.create();
				Matrix$1.vec2.set(margin, -marginX, -marginY);
				Matrix$1.mat2d.translate(mat, mat, margin);
				for (let i$1 = 0; i$1 < points.length; i$1++) {
					const pointInput = Matrix$1.vec2.create();
					const pointOutput = Matrix$1.vec2.create();
					Matrix$1.vec2.set(pointInput, points[i$1].x, points[i$1].y);
					Matrix$1.vec2.transformMat2d(pointOutput, pointInput, mat);
					points[i$1] = {
						x: pointOutput[0],
						y: pointOutput[1]
					};
				}
			}
			const top = Math.min(points[0].y, points[2].y, points[6].y, points[8].y);
			const bottom = Math.max(points[0].y, points[2].y, points[6].y, points[8].y);
			const left = Math.min(points[0].x, points[2].x, points[6].x, points[8].x);
			const right = Math.max(points[0].x, points[2].x, points[6].x, points[8].x);
			const height = Math.abs(bottom - top);
			return {
				top,
				right,
				bottom,
				left,
				width: Math.abs(right - left),
				height
			};
		}
		isAutoSizeX() {
			return typeof this.getLayoutSpec().sizeAbsolute.x !== "number";
		}
		isAutoSizeY() {
			return typeof this.getLayoutSpec().sizeAbsolute.y !== "number";
		}
		getComputedSize() {
			if (this.isTextNode()) return this.parent.getComputedSize();
			return this.getHaikuElement().size;
		}
		getComputedLayout() {
			const targetNode = this.getLiveRenderedNode() || {};
			const parentNode = this.parent && this.parent.getLiveRenderedNode() || {};
			return HaikuElement.computeLayout({
				layout: this.getLayoutSpec(),
				elementName: targetNode.elementName,
				attributes: targetNode.attributes,
				children: targetNode.__memory && targetNode.__memory.children || targetNode.children,
				__memory: targetNode.__memory
			}, {
				layout: { computed: {
					matrix: Layout3D$1.createMatrix(),
					bounds: this.parent && this.parent.getHaikuElement().computeContentBounds() || {},
					size: this.parent && this.parent.getComputedSize() || this.getComputedSize()
				} },
				elementName: parentNode.elementName,
				attributes: parentNode.attributes,
				children: parentNode.children,
				__memory: parentNode.__memory
			});
		}
		getLayoutSpec() {
			const bytecode = this.component.getReifiedBytecode();
			const hostInstance = this.component.$instance;
			if (!hostInstance) return Layout3D$1.createLayoutSpec();
			const componentId = this.getComponentId();
			const elementName = Element$3.safeElementName(this.getStaticTemplateNode());
			const elementNode = hostInstance.findElementsByHaikuId(componentId)[0];
			const timelineName = this.component.getCurrentTimelineName();
			const timelineTime = this.component.getCurrentTimelineTime();
			const propertiesBase = TimelineProperty$2.getPropertiesBase(bytecode.timelines, timelineName, componentId) || {};
			const grabValue = (outputName) => {
				const { computedValue } = hostInstance.grabValue(timelineName, componentId, elementNode, outputName, propertiesBase[outputName], timelineTime, !hostInstance.shouldPerformFullFlush(), true);
				if (computedValue === void 0 || computedValue === null) return TimelineProperty$2.getFallbackValue(elementName, outputName);
				return computedValue;
			};
			return {
				shown: grabValue("shown"),
				opacity: grabValue("opacity"),
				offset: {
					x: grabValue("offset.x"),
					y: grabValue("offset.y"),
					z: grabValue("offset.z")
				},
				origin: {
					x: grabValue("origin.x"),
					y: grabValue("origin.y"),
					z: grabValue("origin.z")
				},
				translation: {
					x: grabValue("translation.x"),
					y: grabValue("translation.y"),
					z: grabValue("translation.z")
				},
				rotation: {
					x: grabValue("rotation.x"),
					y: grabValue("rotation.y"),
					z: grabValue("rotation.z")
				},
				scale: {
					x: grabValue("scale.x"),
					y: grabValue("scale.y"),
					z: grabValue("scale.z")
				},
				shear: {
					xy: grabValue("shear.xy"),
					xz: grabValue("shear.xz"),
					yz: grabValue("shear.yz")
				},
				sizeMode: {
					x: grabValue("sizeMode.x"),
					y: grabValue("sizeMode.y"),
					z: grabValue("sizeMode.z")
				},
				sizeProportional: {
					x: grabValue("sizeProportional.x"),
					y: grabValue("sizeProportional.y"),
					z: grabValue("sizeProportional.z")
				},
				sizeDifferential: {
					x: grabValue("sizeDifferential.x"),
					y: grabValue("sizeDifferential.y"),
					z: grabValue("sizeDifferential.z")
				},
				sizeAbsolute: {
					x: grabValue("sizeAbsolute.x"),
					y: grabValue("sizeAbsolute.y"),
					z: grabValue("sizeAbsolute.z")
				}
			};
		}
		getBoundingBoxPoints() {
			const layout = this.getComputedLayout();
			const w = layout.size.x;
			const h = layout.size.y;
			return [
				{
					x: 0,
					y: 0,
					z: 0
				},
				{
					x: w / 2,
					y: 0,
					z: 0
				},
				{
					x: w,
					y: 0,
					z: 0
				},
				{
					x: 0,
					y: h / 2,
					z: 0
				},
				{
					x: w / 2,
					y: h / 2,
					z: 0
				},
				{
					x: w,
					y: h / 2,
					z: 0
				},
				{
					x: 0,
					y: h,
					z: 0
				},
				{
					x: w / 2,
					y: h,
					z: 0
				},
				{
					x: w,
					y: h,
					z: 0
				}
			];
		}
		getBoxPointsTransformed() {
			return HaikuElement.transformPointsInPlace(this.getBoundingBoxPoints(), this.getOriginOffsetComposedMatrix());
		}
		getOriginNotTransformed() {
			return this.cache.fetch("getOriginNotTransformed", () => {
				const layout = this.getComputedLayout();
				return {
					x: layout.size.x * layout.origin.x,
					y: layout.size.y * layout.origin.y,
					z: layout.size.z * layout.origin.z
				};
			});
		}
		getOriginTransformed() {
			return this.cache.fetch("getOriginTransformed", () => {
				return HaikuElement.transformPointInPlace(this.getOriginNotTransformed(), this.getOriginOffsetComposedMatrix());
			});
		}
		getOriginOffsetComposedMatrix() {
			return this.cache.fetch("getOriginOffsetComposedMatrix", () => {
				return Layout3D$1.multiplyArrayOfMatrices(this.getComputedLayoutAncestry().reverse().map((layout) => layout.matrix));
			});
		}
		getAncestry() {
			const ancestors = [];
			getAncestry(ancestors, this);
			return ancestors;
		}
		getComputedLayoutAncestry() {
			return this.getAncestry().map((ancestor) => {
				return ancestor.getComputedLayout();
			});
		}
		getPropertyKeyframesObject(propertyName) {
			const bytecode = this.component.getReifiedBytecode();
			return TimelineProperty$2.getPropertySegmentsBase(bytecode.timelines, this.component.getCurrentTimelineName(), this.getComponentId(), propertyName);
		}
		computePropertyValue(propertyName, fallbackValue) {
			const bytecode = this.component.getReifiedBytecode();
			const host = this.component.$instance;
			const states = host && host.getStates() || {};
			return TimelineProperty$2.getComputedValue(this.getComponentId(), Element$3.safeElementName(this.getStaticTemplateNode()), propertyName, this.component.getCurrentTimelineName(), this.component.getCurrentTimelineTime(), fallbackValue, bytecode, host, states);
		}
		computePropertyGroupValueFromGroupDelta(propertyGroupDelta) {
			const propertyGroupValue = {};
			for (const propertyName in propertyGroupDelta) {
				const existingPropertyValue = this.computePropertyValue(propertyName, 0);
				const deltaPropertyValue = propertyGroupDelta[propertyName].value;
				if (isNumeric$1(existingPropertyValue) && isNumeric$1(deltaPropertyValue)) propertyGroupValue[propertyName] = { value: MathUtils$1.rounded(existingPropertyValue + deltaPropertyValue) };
				else propertyGroupValue[propertyName] = { value: existingPropertyValue };
			}
			return propertyGroupValue;
		}
		remove() {
			this.destroy();
			const row = this.getHeadingRow();
			if (row) row.delete();
			this.emit("update", "element-removed");
		}
		isRepeater() {
			const rkfs = this.getRepeaterKeyframes();
			return !!(rkfs && Object.keys(rkfs).length > 0);
		}
		getRepeaterKeyframes() {
			return this.getPropertyKeyframesObject("controlFlow.repeat");
		}
		isTextNode() {
			return typeof this.getStaticTemplateNode() === "string";
		}
		isComponent() {
			return !!this.getHostedComponentBytecode();
		}
		isNonRenderedComponent() {
			const bytecode = this.getHostedComponentBytecode();
			if (!bytecode) return false;
			if (!bytecode.metadata) return false;
			return !!bytecode.metadata.nonrendered;
		}
		isExternalComponent() {
			if (!this.isComponent()) return false;
			return !this.isLocalComponent();
		}
		isLocalComponent() {
			if (!this.isComponent()) return false;
			const sourceAttr = this.getSource();
			return sourceAttr && sourceAttr[0] === ".";
		}
		getSource() {
			const node = this.getStaticTemplateNode();
			return node && node.attributes && node.attributes[HAIKU_SOURCE_ATTRIBUTE$2];
		}
		getHostedComponentBytecode() {
			if (this.isTextNode()) return null;
			const node = this.getStaticTemplateNode();
			if (!node) return null;
			const elementName = node.elementName;
			if (!elementName) return null;
			if (typeof elementName !== "object") return null;
			return elementName;
		}
		getTitle() {
			if (this.isTextNode()) return "<text>";
			return this.getStaticTemplateNode().attributes[HAIKU_TITLE_ATTRIBUTE$1] || `<${this.getNameString()}>`;
		}
		setTitle(newTitle, metadata, cb) {
			this.component.setTitleForComponent(this.getComponentId(), newTitle, metadata, cb);
		}
		getNameString() {
			if (this.isTextNode()) return "<text>";
			if (this.isComponent()) return "div";
			const node = this.getStaticTemplateNode();
			if (node) return node.elementName;
			return "div";
		}
		getSafeDomFriendlyName() {
			return this.isComponent() ? "div" : this.getNameString();
		}
		getComponentId() {
			return this.componentId;
		}
		getGraphAddress() {
			return this.address;
		}
		updateTargetingRows(updateEventName) {
			this.getAllRows().forEach((row) => {
				row.emit("update", updateEventName);
			});
		}
		getAllRows() {
			return Row$2.where({
				component: this.component,
				element: this
			});
		}
		get isVisuallySelectable() {
			return this.parent && this.parent.isRootElement();
		}
		get topmostHeadingRow() {
			const headingRow = this.getHeadingRow();
			if (!this.parent) return headingRow;
			if (headingRow) {
				headingRow.parent.silentlyExpandAllGParents();
				return headingRow;
			}
			return this.parent.topmostHeadingRow;
		}
		shouldBeDisplayed() {
			return !this.isTextNode() && !this.isShimElement() && this._clusterAndPropertyRows.length;
		}
		getHostedPropertyRows(doRecurse = false) {
			const rows = [];
			const headingRow = this.getHeadingRow();
			if (headingRow) {
				rows.push(headingRow);
				if (headingRow.children) headingRow.children.forEach((childRow) => {
					if (childRow.isCluster() || childRow.isProperty()) {
						rows.push(childRow);
						if (childRow.children) childRow.children.forEach((grandchildRow) => {
							rows.push(grandchildRow);
						});
					}
				});
			}
			if (doRecurse && experimentIsEnabled$4(Experiment$4.ShowSubElementsInJitMenu)) {
				const deeprows = [];
				this.visitDescendants((descendantElement) => {
					if (!descendantElement.shouldBeDisplayed()) return;
					const currentHeadingRow = descendantElement.topmostHeadingRow || headingRow;
					const subrows = descendantElement.getHostedPropertyRows(false).filter((row) => row.shouldBeDisplayed(currentHeadingRow));
					deeprows.push.apply(deeprows, subrows);
				});
				rows.push.apply(rows, deeprows);
			}
			return rows;
		}
		clearEntityCaches() {
			if (this.children) this.children.forEach((element) => {
				element.cache.clear();
				element.clearEntityCaches();
			});
			this.getAllRows().forEach((row) => {
				row.cache.clear();
				row.clearEntityCaches();
			});
		}
		getFirstNotShimParent(current = this) {
			if (!current.parent || !current.parent.isShimElement()) return current.parent;
			return current.getFirstNotShimParent(current.parent);
		}
		rehydrateRows(options = {}) {
			if (options.superficial || process.env.HAIKU_SUBPROCESS !== "timeline") return;
			const existingRows = this.getAllRows();
			existingRows.forEach((row) => row.mark());
			const element = this;
			const component = this.component;
			const timeline = this.component.getCurrentTimeline();
			const parent = this.getFirstNotShimParent();
			const parentElementHeadingRow = parent && parent.getHeadingRow();
			const currentElementHeadingRow = Row$2.upsert({
				uid: Row$2.buildHeadingUid(component, element),
				parent: parentElementHeadingRow,
				element,
				component,
				timeline,
				children: [],
				property: null,
				cluster: null
			}, {});
			if (parentElementHeadingRow) parentElementHeadingRow.insertChild(currentElementHeadingRow);
			this._headingRow = currentElementHeadingRow;
			this._clusterAndPropertyRows = [];
			const clusters = {};
			this.hasAddressableProperties = false;
			this.eachAddressableProperty((propertyGroupDescriptor, addressableName) => {
				this.hasAddressableProperties = true;
				if (propertyGroupDescriptor.cluster) {
					const clusterId = Row$2.buildClusterUid(this, element, propertyGroupDescriptor);
					let clusterRow;
					if (clusters[clusterId]) clusterRow = Row$2.findById(clusterId);
					else {
						clusterRow = Row$2.upsert({
							uid: clusterId,
							element,
							component,
							timeline,
							parent: currentElementHeadingRow,
							children: [],
							property: null,
							cluster: propertyGroupDescriptor.cluster
						}, {});
						this._clusterAndPropertyRows.push(clusterRow);
						currentElementHeadingRow.insertChild(clusterRow);
						clusters[clusterId] = true;
					}
					const clusterMember = Row$2.upsert({
						uid: Row$2.buildClusterMemberUid(this, element, propertyGroupDescriptor, addressableName),
						element,
						component,
						timeline,
						parent: clusterRow,
						children: [],
						property: propertyGroupDescriptor,
						cluster: propertyGroupDescriptor.cluster
					}, {});
					this._clusterAndPropertyRows.push(clusterMember);
					clusterMember.rehydrate();
					clusterRow.insertChild(clusterMember);
				} else {
					const propertyRow = Row$2.upsert({
						uid: Row$2.buildPropertyUid(this, element, addressableName),
						element,
						component,
						timeline,
						parent: currentElementHeadingRow,
						children: [],
						property: propertyGroupDescriptor,
						cluster: null
					}, {});
					this._clusterAndPropertyRows.push(propertyRow);
					propertyRow.rehydrate();
					currentElementHeadingRow.insertChild(propertyRow);
				}
			});
			existingRows.forEach((row) => row.sweep());
		}
		visitAll(iteratee) {
			Element$3.visitAll(this, iteratee);
		}
		visitDescendants(iteratee) {
			Element$3.visitDescendants(this, iteratee);
		}
		getAllChildren() {
			return this.children || [];
		}
		rehydrateChildren({ maxRehydrationDepth }) {
			const node = this.getStaticTemplateNode();
			if (typeof node.elementName === "object") return;
			if (node && node.children) for (let i$1 = 0; i$1 < node.children.length; i$1++) {
				const child = node.children[i$1];
				const element = Element$3.upsertElementFromVirtualElement(this.component, child, this, i$1, `${this.getGraphAddress()}.${i$1}`);
				if (child.__replacee) {
					const replaceeHaikuId = child.__replacee.attributes && child.__replacee.attributes[HAIKU_ID_ATTRIBUTE$2];
					if (replaceeHaikuId) {
						const replaceeElement = Element$3.findByComponentAndHaikuId(this.component, replaceeHaikuId);
						if (replaceeElement) element._visibleProperties = replaceeElement._visibleProperties;
					}
					delete child.__replacee;
				}
				element.rehydrate({ maxRehydrationDepth });
			}
		}
		rehydrate({ maxRehydrationDepth }) {
			if (this.getDepthAmongElements() <= maxRehydrationDepth || experimentIsEnabled$4(Experiment$4.ShowSubElementsInJitMenu) && this.hasInternalPropertiesDefinedCached()) this.rehydrateChildren({ maxRehydrationDepth });
		}
		/**
		* @description Returns true/false whether this element contains any elements
		* that have any keyframes defined, without relying on the presence of hydrated
		* models for any of those elements (it uses the raw template).
		*/
		hasInternalPropertiesDefined() {
			const selectors = {};
			const node = this.getStaticTemplateNode();
			Template$5.visitWithoutDescendingIntoSubcomponents(node, (subnode) => {
				if (node === subnode) return;
				const selector = TimelineProperty$2.getSelectorForComponentId(subnode.attributes[HAIKU_ID_ATTRIBUTE$2]);
				selectors[selector] = subnode;
			});
			if (Object.keys(selectors).length < 1) return false;
			const bytecode = this.component.getReifiedBytecode();
			if (!bytecode || !bytecode.timelines) return false;
			for (const timelineName in bytecode.timelines) for (const selector in bytecode.timelines[timelineName]) {
				const subnode = selectors[selector];
				if (!subnode) continue;
				for (const propertyName in bytecode.timelines[timelineName][selector]) {
					const keyframesObject = bytecode.timelines[timelineName][selector][propertyName];
					if (Property$2.areAnyKeyframesDefined(subnode.elementName, propertyName, keyframesObject)) return true;
				}
			}
			return false;
		}
		hasInternalPropertiesDefinedCached() {
			return this.cache.fetch("hasInternalPropertiesDefinedCached", () => {
				return this.hasInternalPropertiesDefined();
			});
		}
		getDepthAmongElements() {
			let depth = 0;
			let parent = this.parent;
			while (parent) {
				depth += 1;
				parent = parent.parent;
			}
			return depth;
		}
		getBuiltinAddressables() {
			const builtinAddressables = {};
			Property$2.assignDOMSchemaProperties(builtinAddressables, this);
			return builtinAddressables;
		}
		getComponentAddressables() {
			const componentAddressables = {};
			if (this.isComponent()) {
				const node = this.getLiveRenderedNode();
				if (node && node.elementName && node.elementName.states) for (const name in node.elementName.states) {
					const state = node.elementName.states[name];
					componentAddressables[name] = {
						name,
						type: "state",
						prefix: name,
						suffix: void 0,
						fallback: state.value,
						typedef: state.type,
						mock: state.mock
					};
				}
			}
			return componentAddressables;
		}
		getCompleteAddressableProperties() {
			const builtinAddressables = this.getBuiltinAddressables();
			const componentAddressables = this.getComponentAddressables();
			const returnedAddressables = {};
			for (const key1 in builtinAddressables) returnedAddressables[key1] = builtinAddressables[key1];
			for (const key2 in componentAddressables) returnedAddressables[key2] = componentAddressables[key2];
			return returnedAddressables;
		}
		getJITPropertyOptions() {
			if (this.isNonRenderedComponent()) return [];
			const exclusions = this.getExcludedAddressableProperties();
			if (this.getDepthAmongElements() > 1) {
				const complete = this.getCompleteAddressableProperties();
				for (const key in complete) if (!this._visibleProperties[key]) exclusions[key] = complete[key];
			}
			const grouped = {};
			for (const propertyName in exclusions) {
				const propertyObj = exclusions[propertyName];
				if (!Property$2.includeInJIT(propertyName, this, propertyObj, null)) continue;
				const prefix = propertyObj.prefix;
				const suffix = propertyObj.suffix;
				if (!grouped[prefix]) grouped[prefix] = {
					element: this,
					prefix,
					suffix,
					label: Property$2.humanizePropertyNamePart(prefix)
				};
				if (suffix) {
					if (!grouped[prefix].options) grouped[prefix].options = [];
					grouped[prefix].options.push({
						element: this,
						prefix,
						suffix,
						label: Property$2.humanizePropertyNamePart(suffix),
						value: propertyObj.name
					});
				} else grouped[prefix].value = propertyObj.name;
			}
			if (experimentIsEnabled$4(Experiment$4.ShowSubElementsInJitMenu)) {
				if (!this.isRootElement() && !this.isComponent()) {
					if (this.children && this.children.length > 0) this.children.forEach((child) => {
						const name = child.getSafeDomFriendlyName();
						if (!Property$2.BUILTIN_DOM_SCHEMAS[name] || child.isTextNode()) return false;
						const insert = this.grabNextUsefulMenuInsert(child);
						if (insert) {
							const { key, label, options, element } = insert;
							grouped[key] = {
								type: "element",
								element,
								prefix: `zzzzz_element_${label}`,
								label: `‹› ${label}`,
								options
							};
						}
					});
				}
			}
			return this.groupedOptionsObjectToList(grouped);
		}
		grabNextUsefulMenuInsert(child) {
			if (child.isTextNode()) return null;
			const options = child.getJITPropertyOptions();
			if (options.length === 1 && options[0].type === "element") return this.grabNextUsefulMenuInsert(options[0].element);
			return {
				key: child.getPrimaryKey(),
				label: child.getFriendlyLabel(),
				options,
				element: child
			};
		}
		eachAddressableProperty(iteratee) {
			const addressableProperties = this.getDisplayedAddressableProperties();
			for (const propertyName in addressableProperties) if (addressableProperties[propertyName]) iteratee(addressableProperties[propertyName], propertyName);
		}
		groupedOptionsObjectToList(grouped) {
			return Object.values(grouped).sort((a, b) => {
				const ap = a.prefix.toLowerCase();
				const bp = b.prefix.toLowerCase();
				if (ap < bp) return -1;
				if (ap > bp) return 1;
				return 0;
			});
		}
		getFriendlyLabel() {
			const node = this.getStaticTemplateNode();
			return Element$3.getFriendlyLabel(node);
		}
		getJITPropertyOptionsAsMenuItems() {
			const options = this.getJITPropertyOptions();
			return this.optionsToItems(options);
		}
		optionsToItems(options) {
			return options.map((option) => {
				const item = { label: option.label };
				if (option.options) item.submenu = this.optionsToItems(option.options);
				else item.onClick = () => {
					option.element.showAddressableProperty(option.value);
				};
				return item;
			});
		}
		getExcludedAddressableProperties() {
			return this.getCollatedAddressableProperties().excluded;
		}
		getDisplayedAddressableProperties() {
			return this.getCollatedAddressableProperties().filtered;
		}
		getExplicitlyVisibleAddressableProperties() {
			const complete = this.getCompleteAddressableProperties();
			const filtered = {};
			for (const propertyName in complete) if (this._visibleProperties[propertyName]) filtered[propertyName] = complete[propertyName];
			return filtered;
		}
		getCollatedAddressableProperties() {
			const complete = this.getCompleteAddressableProperties();
			const filtered = {};
			const excluded = {};
			for (const propertyName in complete) {
				const propertyObject = complete[propertyName];
				Property$2.buildFilterObject(filtered, this, propertyName, propertyObject);
				if (!filtered[propertyName]) excluded[propertyName] = propertyObject;
			}
			return {
				filtered,
				excluded
			};
		}
		showAddressableProperty(propertyName) {
			this._visibleProperties[propertyName] = true;
			this.rehydrateRows();
			const row = this.getPropertyRowByPropertyName(propertyName);
			if (row) {
				if (row.isWithinCollapsedRow()) row.parent.expand(this.component.project.getMetadata());
				row.select(this.component.project.getMetadata());
			}
			this.emit("update", "jit-property-added");
		}
		hideAddressableProperty(propertyName) {
			this._visibleProperties[propertyName] = false;
			this.emit("update", "jit-property-removed");
		}
		isRootElement() {
			return !this.parent;
		}
		getBoxPolygonPointsTransformed() {
			const points = this.getBoxPointsTransformed();
			return Element$3.pointsToPolygonPoints(points);
		}
		doesOverlapWithBox(box) {
			return polygonOverlap(Element$3.boxToCornersAsPolygonPoints(box), this.getBoxPolygonPointsTransformed());
		}
		/**
		* DANGER
		* The methods below rely on the player having rendered the component;
		* race conditions abound
		*/
		getLiveRenderedNode() {
			const instance = this.getCoreHostComponentInstance();
			return instance ? instance.findElementsByHaikuId(this.getComponentId())[0] : null;
		}
		getHaikuElement() {
			return HaikuElement.findOrCreateByNode(this.getLiveRenderedNode());
		}
		getParentSvgElement() {
			let currElem = this;
			while (currElem) {
				if (currElem.getNameString() === "svg") return currElem;
				currElem = currElem.parent;
			}
			return null;
		}
		getUngroupables() {
			const haikuElement = this.getHaikuElement();
			switch (haikuElement.tagName) {
				case "svg":
				case "div":
					const ungroupables = [];
					this.getHaikuElement().visit((descendantHaikuElement) => {
						const eligibleChildren = descendantHaikuElement.children.filter((element) => element.tagName !== "defs" && element.target && (haikuElement.tagName === "div" || typeof element.target.getBBox === "function"));
						if (eligibleChildren.length > 1) {
							ungroupables.push(...eligibleChildren);
							return false;
						}
					}, (node) => node.tagName !== "defs");
					return ungroupables;
				default: return [];
			}
		}
		doesContainUngroupableContent() {
			return this.getUngroupables().length > 1;
		}
		ungroup(metadata, cb = () => {}) {
			const nodes = [];
			this.ungroupWrapper(nodes);
			switch (this.getStaticTemplateNode().elementName) {
				case "svg":
					this.ungroupSvg(nodes);
					break;
				case "div":
					this.ungroupDiv(nodes);
					break;
				default: logger$6.warn(`[element] ignoring nonsense request to ungroup ${this.getStaticTemplateNode().elementName}`);
			}
			return this.component.ungroupElements(this.getComponentId(), nodes, metadata, cb);
		}
		ungroupWrapper(nodes) {
			const haikuElement = this.getHaikuElement();
			const baseStyles = haikuElement.attributes.style;
			if (!baseStyles) return;
			const style = {};
			Object.keys(baseStyles).forEach((styleName) => {
				switch (styleName) {
					case "background":
					case "backgroundColor": style[styleName] = baseStyles[styleName];
				}
			});
			if (Object.keys(style).length === 0) return;
			const attributes = Object.assign({
				width: haikuElement.layout.size.x,
				height: haikuElement.layout.size.y,
				[HAIKU_SOURCE_ATTRIBUTE$2]: haikuElement.attributes[HAIKU_SOURCE_ATTRIBUTE$2]
			}, { style });
			const layoutMatrix = this.getOriginOffsetComposedMatrix();
			const originX = haikuElement.layout.size.x / 2;
			const originY = haikuElement.layout.size.y / 2;
			layoutMatrix[12] += originX * layoutMatrix[0] + originY * layoutMatrix[4];
			layoutMatrix[13] += originX * layoutMatrix[1] + originY * layoutMatrix[5];
			composedTransformsToTimelineProperties(attributes, [layoutMatrix]);
			nodes.push(Template$5.cleanMana({
				elementName: "svg",
				attributes,
				children: [{
					elementName: "rect",
					attributes: {
						width: haikuElement.layout.size.x,
						height: haikuElement.layout.size.y,
						fill: "none",
						stroke: "none"
					}
				}]
			}, { resetIds: true }));
		}
		ungroupDiv(nodes) {
			this.getUngroupables().forEach((haikuElement) => {
				const layoutMatrix = Layout3D$1.multiplyArrayOfMatrices(haikuElement.layoutAncestryMatrices.reverse().filter((m) => !!m));
				const layout = haikuElement.layout;
				const attributes = {
					"width": layout.size.x,
					"height": layout.size.y,
					[HAIKU_TITLE_ATTRIBUTE$1]: haikuElement.attributes[HAIKU_TITLE_ATTRIBUTE$1],
					[HAIKU_SOURCE_ATTRIBUTE$2]: haikuElement.attributes[HAIKU_SOURCE_ATTRIBUTE$2],
					"origin.x": layout.origin.x,
					"origin.y": layout.origin.y,
					"haiku-transclude": haikuElement.getComponentId()
				};
				composedTransformsToTimelineProperties(attributes, [layoutMatrix]);
				if (!attributes["translation.x"]) attributes["translation.x"] = 0;
				if (!attributes["translation.y"]) attributes["translation.y"] = 0;
				const originX = layout.size.x * layout.origin.x;
				const originY = layout.size.y * layout.origin.y;
				if (haikuElement.tagName === "svg") {
					attributes.style = { overflow: "visible" };
					if (haikuElement.layout.opacity !== 1) attributes.opacity = haikuElement.layout.opacity;
				}
				attributes["translation.x"] += originX * layoutMatrix[0] + originY * layoutMatrix[4];
				attributes["translation.y"] += originX * layoutMatrix[1] + originY * layoutMatrix[5];
				nodes.push({
					elementName: typeof haikuElement.type !== "string" ? "__component__" : haikuElement.tagName,
					attributes,
					children: []
				});
			});
		}
		ungroupSvg(nodes) {
			const defs = [];
			const extraNodes = [];
			const svgElement = this.getHaikuElement();
			const ungroupables = this.getUngroupables();
			const bytecode = this.component.getReifiedBytecode();
			svgElement.visit((descendantHaikuElement) => {
				if (descendantHaikuElement.tagName === "style" && descendantHaikuElement.memory && descendantHaikuElement.memory.children) {
					const styleNode = Template$5.cleanMana(lodash$2.cloneDeep(descendantHaikuElement.node), { resetIds: true });
					styleNode.children = [descendantHaikuElement.memory.children[0]];
					extraNodes.push(styleNode);
				} else if (descendantHaikuElement.parent && descendantHaikuElement.parent.tagName === "defs" || DEFABLE_TAG_NAMES[descendantHaikuElement.tagName]) defs.push(descendantHaikuElement.node);
			});
			ungroupables.forEach((descendantHaikuElement) => {
				const mergedAttributes = {};
				let parent = descendantHaikuElement.parent;
				while (parent && (parent.node.elementName === "g" || parent.node.elementName === "svg")) {
					for (const propertyName in bytecode.timelines[this.component.getCurrentTimelineName()][`haiku:${parent.componentId}`]) if (!propertyName.startsWith("style") && !SVG_ONLY_ATTRIBUTES[propertyName] && !mergedAttributes.hasOwnProperty(propertyName)) mergedAttributes[propertyName] = parent.componentId;
					parent = parent.parent;
				}
				const attributes = Object.keys(mergedAttributes).reduce((accumulator, propertyName) => {
					if (!LAYOUT_3D_SCHEMA$1.hasOwnProperty(propertyName) || propertyName === "opacity") accumulator[propertyName] = this.component.getComputedPropertyValue(descendantHaikuElement.node, mergedAttributes[propertyName], this.component.getCurrentTimelineName(), this.component.getCurrentTimelineTime(), propertyName, void 0);
					return accumulator;
				}, {});
				if (typeof descendantHaikuElement.opacity === "number" && descendantHaikuElement.opacity !== 1) attributes.opacity = descendantHaikuElement.opacity;
				const boundingBox = descendantHaikuElement.target.getBBox();
				if (boundingBox.width < 1) boundingBox.width = Math.max(descendantHaikuElement.attributes["stroke-width"] || attributes["stroke-width"] || 1, 1);
				if (boundingBox.height < 1) boundingBox.height = Math.max(descendantHaikuElement.attributes["stroke-width"] || attributes["stroke-width"] || 1, 1);
				const originX = boundingBox.width / 2;
				const originY = boundingBox.height / 2;
				const layoutMatrix = descendantHaikuElement.layoutMatrix;
				layoutMatrix[12] += (boundingBox.x + originX) * layoutMatrix[0] + (boundingBox.y + originY) * layoutMatrix[4];
				layoutMatrix[13] += (boundingBox.x + originX) * layoutMatrix[1] + (boundingBox.y + originY) * layoutMatrix[5];
				const layoutAncestryMatrices = descendantHaikuElement.layoutAncestryMatrices;
				if (layoutAncestryMatrices[layoutAncestryMatrices.length - 1] !== layoutMatrix) layoutAncestryMatrices.push(layoutMatrix);
				descendantHaikuElement.visit((subHaikuElement) => {
					delete subHaikuElement.node.layout;
				});
				const parentAttributes = {
					width: boundingBox.width,
					height: boundingBox.height,
					style: { overflow: "visible" },
					[HAIKU_SOURCE_ATTRIBUTE$2]: `${svgElement.attributes[HAIKU_SOURCE_ATTRIBUTE$2]}#${descendantHaikuElement.id}`,
					[HAIKU_TITLE_ATTRIBUTE$1]: descendantHaikuElement[HAIKU_TITLE_ATTRIBUTE$1] || descendantHaikuElement.title || descendantHaikuElement.id
				};
				composedTransformsToTimelineProperties(parentAttributes, layoutAncestryMatrices);
				if (descendantHaikuElement.layout) {
					if (descendantHaikuElement.layout.sizeAbsolute.x > 0) descendantHaikuElement.attributes.width = descendantHaikuElement.layout.sizeAbsolute.x;
					if (descendantHaikuElement.layout.sizeAbsolute.y) descendantHaikuElement.attributes.height = descendantHaikuElement.layout.sizeAbsolute.y;
				}
				const node = Template$5.cleanMana({
					elementName: "svg",
					attributes: parentAttributes,
					children: [{
						elementName: "g",
						attributes: Object.assign(attributes, { transform: `translate(${-MathUtils$1.rounded(boundingBox.x)} ${-MathUtils$1.rounded(boundingBox.y)})` }),
						children: [Object.assign({}, descendantHaikuElement.node, {
							attributes: Object.assign({ "haiku-transclude": descendantHaikuElement.getComponentId() }, descendantHaikuElement.attributes),
							children: []
						})]
					}]
				}, { resetIds: true });
				if (defs.length > 0) node.children.unshift(Template$5.cleanMana({
					elementName: "defs",
					attributes: {},
					children: defs.map(Template$5.reuseHotMana)
				}, { resetIds: true }));
				node.children.unshift(...extraNodes.map(Template$5.reuseHotMana));
				nodes.push(node);
			});
		}
		getAttribute(key) {
			const node = this.getLiveRenderedNode();
			return node && node.attributes && node.attributes[key];
		}
		toXMLString() {
			return Template$5.manaToHtml("", this.getLiveRenderedNode() || EMPTY_ELEMENT);
		}
		toJSONString() {
			return Template$5.manaToJson(this.getLiveRenderedNode() || EMPTY_ELEMENT, null, 2);
		}
		/**
		* @method dump
		* @description When debugging, use this to log a concise shorthand of this entity.
		*/
		dump() {
			let str = `${this.getNameString()}:${this.getTitle()}:${this.getComponentId()}`;
			if (this.isHovered()) str += " {h}";
			if (this.isSelected()) str += " {s}";
			return str;
		}
	};
	Element$3.DEFAULT_OPTIONS = { required: {
		component: true,
		uid: true,
		address: true,
		componentId: true
	} };
	BaseModel$13.extend(Element$3);
	Element$3.directlySelected = null;
	Element$3.cache = {
		domNodes: {},
		eventListeners: {}
	};
	Element$3.HIGHER_ORDER_EVENTS = [{
		label: "Hover",
		value: "hover"
	}, {
		label: "Unhover",
		value: "unhover"
	}];
	Element$3.COMPONENT_EVENTS = [
		{
			label: "Will Mount",
			value: "component:will-mount"
		},
		{
			label: "Did Mount",
			value: "component:did-mount"
		},
		{
			label: "Will Unmount",
			value: "component:will-unmount"
		},
		{
			label: "Did Initialize",
			value: "component:did-initialize"
		},
		{
			label: "Frame",
			value: "frame"
		}
	];
	Element$3.nodeIsGrouper = (node) => {
		return node.elementName === "svg" || node.elementName === "g" || node.elementName === "div";
	};
	Element$3.unselectAllElements = (criteria, metadata) => {
		Element$3.where(criteria).forEach((element) => element.unselect(metadata));
		Element$3.directlySelected = null;
	};
	Element$3.hoverOffAllElements = (criteria, metadata) => {
		Element$3.where(criteria).forEach((element) => element.hoverOff(metadata));
	};
	Element$3.clearCaches = function clearCaches() {
		Element$3.cache = {
			domNodes: {},
			eventListeners: {}
		};
	};
	Element$3.findDomNode = function findDomNode(haikuId, element) {
		if (!element) return null;
		if (Element$3.cache.domNodes[haikuId]) return Element$3.cache.domNodes[haikuId];
		const selector = `[${HAIKU_ID_ATTRIBUTE$2}="${haikuId}"]`;
		const found = element.querySelector(selector);
		Element$3.cache.domNodes[haikuId] = found;
		return found;
	};
	Element$3.findRoots = (criteria) => {
		return Element$3.where(criteria).filter((element) => {
			return !element.parent;
		});
	};
	/**
	* Visit all elements in the given element's family, in depth-first order.
	* The element passed is the first visit.
	*/
	Element$3.visitAll = (element, visitor) => {
		visitor(element);
		Element$3.visitDescendants(element, visitor);
	};
	/**
	* Visit the descendants of the given element in depth-first order.
	*/
	Element$3.visitDescendants = (element, visitor) => {
		if (!element.children) return;
		element.children.forEach((child) => {
			visitor(child);
			Element$3.visitDescendants(child, visitor);
		});
	};
	Element$3.getRotationIn360 = (radians) => {
		if (radians < 0) radians += Math.PI * 2;
		let rotationDegrees = ~~(radians * 180 / Math.PI);
		if (rotationDegrees > 360) rotationDegrees = rotationDegrees % 360;
		return rotationDegrees;
	};
	Element$3.boxToCornersAsPolygonPoints = ({ x, y, width, height }) => {
		return [
			[x, y],
			[x + width, y],
			[x + width, y + height],
			[x, y + height]
		];
	};
	Element$3.pointsToPolygonPoints = (points) => {
		return points.map((point) => {
			return [point.x, point.y];
		});
	};
	Element$3.distanceBetweenPoints = (p1, p2, zoomFactor) => {
		let distance = Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
		if (zoomFactor) distance *= zoomFactor;
		return distance;
	};
	Element$3.buildPrimaryKeyFromComponentParentIdAndStaticTemplateNode = (component, parentId, indexInParent, staticTemplateNode) => {
		let uid;
		if (typeof staticTemplateNode === "string") uid = `${parentId}/text:${indexInParent}`;
		else uid = staticTemplateNode.attributes && staticTemplateNode.attributes[HAIKU_ID_ATTRIBUTE$2] || Math.random();
		uid = Element$3.buildUidFromComponentAndHaikuId(component, uid);
		return uid;
	};
	Element$3.buildUidFromComponentAndDomElement = (component, $el) => {
		return `${component.getPrimaryKey()}::${$el.getAttribute(HAIKU_ID_ATTRIBUTE$2)}`;
	};
	Element$3.buildUidFromComponentAndHaikuId = (component, haikuId) => {
		return `${component.getPrimaryKey()}::${haikuId}`;
	};
	Element$3.findByComponentAndHaikuId = (component, haikuId) => {
		return Element$3.findById(Element$3.buildUidFromComponentAndHaikuId(component, haikuId));
	};
	Element$3.findHoveredElement = (component) => {
		return Element$3.where({
			component,
			_isHovered: true
		})[0];
	};
	Element$3.makeUid = (component, parent, index, staticTemplateNode) => {
		const parentHaikuId = parent && parent.attributes && parent.attributes[HAIKU_ID_ATTRIBUTE$2];
		if (!parent) parent = parentHaikuId && Element$3.findById(Element$3.buildUidFromComponentAndHaikuId(component, parentHaikuId));
		return Element$3.buildPrimaryKeyFromComponentParentIdAndStaticTemplateNode(component, parentHaikuId, index, staticTemplateNode);
	};
	Element$3.getFriendlyLabel = (node) => {
		if (!node || typeof node !== "object") return "";
		const id$1 = node.attributes && node.attributes.id;
		const title = node.attributes && node.attributes[HAIKU_TITLE_ATTRIBUTE$1];
		let name = typeof node.elementName === "string" && node.elementName ? node.elementName : "div";
		if (Element$3.FRIENDLY_NAME_SUBSTITUTES[name]) name = Element$3.FRIENDLY_NAME_SUBSTITUTES[name];
		if (id$1 && !title) return cleanHaikuId(id$1);
		let out$1 = "";
		if (typeof id$1 === "string") out$1 += `${id$1} `;
		if (typeof title === "string") out$1 += `${title} `;
		if (out$1.length === 0 && typeof name === "string") out$1 += `${name}`;
		return cleanHaikuId(out$1);
	};
	Element$3.upsertElementFromVirtualElement = (component, staticTemplateNode, parent, index, address) => {
		if (!component.project) throw new Error("component argument must have a `project` defined");
		if (!component.project.getPlatform()) throw new Error("component project must be able to return a platform object");
		if (!component.project.getMetadata()) throw new Error("component proct must be able to return a metadata object");
		const uid = Element$3.makeUid(component, parent, index, staticTemplateNode);
		const metadata = component.project.getMetadata();
		const componentId = typeof staticTemplateNode === "string" ? uid : staticTemplateNode.attributes[HAIKU_ID_ATTRIBUTE$2];
		const element = Element$3.upsert({
			uid,
			componentId,
			index,
			address,
			component,
			parent,
			children: []
		}, metadata);
		if (parent) parent.insertChild(element);
		return element;
	};
	Element$3.querySelectorAll = (selector, mana) => {
		return cssQueryTree(mana, selector, {
			name: "elementName",
			attributes: "attributes",
			children: "children"
		});
	};
	Element$3.FRIENDLY_NAME_SUBSTITUTES = {
		g: "group",
		tspan: "Text Span"
	};
	Element$3.safeElementName = (mana) => {
		if (!mana || typeof mana !== "object") return "div";
		if (mana.elementName && typeof mana.elementName === "object") return "div";
		return mana.elementName;
	};
	Element$3.deselectAllOtherElements = (criteria, target, metadata) => {
		Element$3.where(Object.assign({ _isSelected: true }, criteria)).forEach((element) => {
			if (element.getComponentId() !== target.getComponentId()) element.unselect(metadata, true);
		});
	};
	module.exports = Element$3;
	const Bytecode$4 = require_Bytecode();
	const ElementSelectionProxy$3 = require_ElementSelectionProxy();
	const MathUtils$1 = require_MathUtils();
	const Property$2 = require_Property();
	const Row$2 = require_Row();
	const Template$5 = require_Template();
	const TimelineProperty$2 = require_TimelineProperty();
}) });

//#endregion
//#region src/bll/Artboard.js
var require_Artboard = /* @__PURE__ */ __commonJS({ "src/bll/Artboard.js": ((exports, module) => {
	const Matrix = require("gl-matrix");
	const BaseModel$12 = require_BaseModel();
	const HAIKU_ID_ATTRIBUTE$1 = "haiku-id";
	/**
	* @class Artboard
	* @description
	*  Abstraction over logic for managing the artboard, including:
	*    - Artboard size and position
	*    - Zooming and panning
	*    - Current drawing tool (future)
	*  And other such concerns. Consider putting Glass-related logic
	*  in here instead of into the Glass React app.
	*/
	var Artboard$2 = class Artboard$2 extends BaseModel$12 {
		constructor(props, opts) {
			super(props, opts);
			if (typeof window !== "undefined") {
				this._containerWidth = window.document.body.clientWidth || 1;
				this._containerHeight = window.document.body.clientHeight || 1;
			} else {
				this._containerWidth = 1;
				this._containerHeight = 1;
			}
			this._mountWidth = Artboard$2.DEFAULT_WIDTH;
			this._mountHeight = Artboard$2.DEFAULT_HEIGHT;
			this._mountX = Artboard$2.DEFAULT_WIDTH / 2;
			this._mountY = Artboard$2.DEFAULT_HEIGHT / 2;
			this._panX = 0;
			this._panY = 0;
			this._originalPanX = 0;
			this._originalPanY = 0;
			this._zoomXY = Artboard$2.DEFAULT_ZOOM;
			this._drawingIsModal = true;
			this.component.on("time:change", (timelineName, timelineTime) => {
				if (!this.component.isCodeReloading()) this.updateMountSize();
			});
			this.project.on("update", (what, arg1, arg2) => {
				if (what === "application-mounted" || what === "reloaded" && arg1 === "hard") this.updateMountSize();
				else if (what === "updateKeyframes") {
					const timelineName = this.component.getCurrentTimelineName();
					const artboardId = this.getElementHaikuId();
					if (arg2 && arg2[timelineName] && arg2[timelineName][artboardId]) this.updateMountSize();
				}
			});
			this.project.on("remote-update", (what) => {
				if (what === "updateKeyframes") this.updateMountSize();
			});
		}
		resetZoomPan() {
			this._panX = 0;
			this._panY = 0;
			this._originalPanX = 0;
			this._originalPanY = 0;
			this._zoomXY = Artboard$2.DEFAULT_ZOOM;
			this.dimensionsChangedHook();
		}
		dimensionsChangedHook() {
			const hc = this.component.$instance;
			const renderer = hc && hc.context && hc.context.renderer;
			if (renderer) {
				if (!renderer.config) renderer.config = {};
				renderer.config.zoom = this.getZoom();
				renderer.config.pan = this.getPan();
			}
			ElementSelectionProxy$2.clearCaches();
			this.emit("update", "dimensions-changed");
		}
		getElementHaikuId() {
			const bytecode = this.component.fetchActiveBytecodeFile().getReifiedBytecode();
			const template = bytecode && bytecode.template;
			return template && template.attributes[HAIKU_ID_ATTRIBUTE$1];
		}
		getElement() {
			const haikuId = this.getElementHaikuId();
			if (!haikuId) return null;
			return Element$2.findByComponentAndHaikuId(this.component, haikuId);
		}
		getArtboardRenderInfo() {
			return {
				pan: {
					x: this._panX,
					y: this._panY
				},
				zoom: {
					x: this._zoomXY,
					y: this._zoomXY
				},
				container: {
					x: 0,
					y: 0,
					w: this._containerWidth,
					h: this._containerHeight
				},
				mount: {
					x: this._mountX,
					y: this._mountY,
					w: this._mountWidth,
					h: this._mountHeight
				}
			};
		}
		getRect() {
			return this.mount.getBoundingClientRect();
		}
		resetContainerDimensions($container) {
			if ($container) {
				const w1 = $container.clientWidth;
				const h1 = $container.clientHeight;
				const w2 = this._mountWidth;
				const h2 = this._mountHeight;
				const mountX = Math.round((w1 - w2) / 2);
				const mountY = Math.round((h1 - h2) / 2);
				const cw = Math.max(w1, w2);
				const ch = Math.max(h1, h2);
				if (cw !== this._containerWidth || ch !== this._containerHeight || mountX !== this._mountX || mountY !== this._mountY) {
					this._containerWidth = cw;
					this._containerHeight = ch;
					this._mountX = mountX;
					this._mountY = mountY;
				}
			}
			this.emit("update", "dimensions-reset");
		}
		updateMountSize($container) {
			const updatedArtboardSize = this.component && this.component.getContextSize();
			if (updatedArtboardSize && updatedArtboardSize.width && updatedArtboardSize.height) {
				this._mountWidth = updatedArtboardSize.width;
				this._mountHeight = updatedArtboardSize.height;
			}
			this.resetContainerDimensions($container);
			this.dimensionsChangedHook();
		}
		zoomIn(factor) {
			this._zoomXY = this._zoomXY * factor;
			this.dimensionsChangedHook();
		}
		zoomOut(factor) {
			this._zoomXY = this._zoomXY / factor;
			this.dimensionsChangedHook();
		}
		performPan(dx, dy) {
			this._panX = this._originalPanX + dx;
			this._panY = this._originalPanY + dy;
			this.dimensionsChangedHook();
		}
		isDrawingModal() {
			return this._drawingIsModal;
		}
		getSize() {
			return {
				x: this.getMountWidth(),
				y: this.getMountHeight()
			};
		}
		getMountX() {
			return this._mountX;
		}
		getMountY() {
			return this._mountY;
		}
		getMountWidth() {
			return this._mountWidth;
		}
		getMountHeight() {
			return this._mountHeight;
		}
		getContainerWidth() {
			return this._containerWidth;
		}
		getContainerHeight() {
			return this._containerHeight;
		}
		snapshotOriginalPan() {
			this._originalPanX = this._panX;
			this._originalPanY = this._panY;
		}
		transformScreenToWorld(screenCoords) {
			const mat = Matrix.mat2d.create();
			const mount = Matrix.vec2.create();
			Matrix.vec2.set(mount, -this._mountX, -this._mountY);
			const mountMat = Matrix.mat2d.create();
			Matrix.mat2d.translate(mountMat, mountMat, mount);
			Matrix.mat2d.multiply(mat, mat, mountMat);
			const screenVec = Matrix.vec2.create();
			Matrix.vec2.set(screenVec, screenCoords.x, screenCoords.y);
			Matrix.vec2.transformMat2d(screenVec, screenVec, mat);
			return {
				x: screenVec[0],
				y: screenVec[1]
			};
		}
		getZoom() {
			return this._zoomXY;
		}
		getPan() {
			return {
				x: this._panX,
				y: this._panY
			};
		}
		getSnapLinesInScreenCoords() {
			const snapLines = [];
			const topWorld = 0;
			const rightWorld = this._mountWidth;
			const bottomWorld = this._mountHeight;
			const leftWorld = 0;
			snapLines.push({
				direction: "HORIZONTAL",
				positionWorld: topWorld,
				elementId: "STAGE_TOP"
			});
			snapLines.push({
				direction: "VERTICAL",
				positionWorld: rightWorld,
				elementId: "STAGE_RIGHT"
			});
			snapLines.push({
				direction: "HORIZONTAL",
				positionWorld: bottomWorld,
				elementId: "STAGE_BOTTOM"
			});
			snapLines.push({
				direction: "VERTICAL",
				positionWorld: leftWorld,
				elementId: "STAGE_LEFT"
			});
			snapLines.push({
				direction: "VERTICAL",
				positionWorld: (leftWorld + rightWorld) / 2,
				elementId: "STAGE_VERTICAL_MID"
			});
			snapLines.push({
				direction: "HORIZONTAL",
				positionWorld: (topWorld + bottomWorld) / 2,
				elementId: "STAGE_HORIZONTAL_MID"
			});
			this.getElement().children.forEach((elem) => {
				if (!elem) return;
				const marginX = (this._containerWidth - this._mountWidth) / 2;
				const marginY = (this._containerHeight - this._mountHeight) / 2;
				const bbox = elem.getBoundingClientRect(-marginX, -marginY);
				snapLines.push({
					direction: "HORIZONTAL",
					positionWorld: this.transformScreenToWorld({
						x: 0,
						y: bbox.top
					}).y,
					elementId: elem.getComponentId()
				});
				snapLines.push({
					direction: "HORIZONTAL",
					positionWorld: this.transformScreenToWorld({
						x: 0,
						y: bbox.bottom
					}).y,
					elementId: elem.getComponentId()
				});
				snapLines.push({
					direction: "HORIZONTAL",
					positionWorld: this.transformScreenToWorld({
						x: 0,
						y: (bbox.bottom + bbox.top) / 2
					}).y,
					elementId: elem.getComponentId()
				});
				snapLines.push({
					direction: "VERTICAL",
					positionWorld: this.transformScreenToWorld({
						x: bbox.left,
						y: 0
					}).x,
					elementId: elem.getComponentId()
				});
				snapLines.push({
					direction: "VERTICAL",
					positionWorld: this.transformScreenToWorld({
						x: bbox.right,
						y: 0
					}).x,
					elementId: elem.getComponentId()
				});
				snapLines.push({
					direction: "VERTICAL",
					positionWorld: this.transformScreenToWorld({
						x: (bbox.right + bbox.left) / 2,
						y: 0
					}).x,
					elementId: elem.getComponentId()
				});
			});
			if (typeof window !== "undefined") window.snapLines = snapLines;
			return snapLines;
		}
	};
	Artboard$2.DEFAULT_OPTIONS = { required: {
		mount: true,
		component: true,
		project: true
	} };
	BaseModel$12.extend(Artboard$2);
	Artboard$2.DEFAULT_WIDTH = 550;
	Artboard$2.DEFAULT_HEIGHT = 400;
	Artboard$2.DEFAULT_ZOOM = 1;
	module.exports = Artboard$2;
	const Element$2 = require_Element();
	const ElementSelectionProxy$2 = require_ElementSelectionProxy();
}) });

//#endregion
//#region src/bll/Asset.js
var require_Asset = /* @__PURE__ */ __commonJS({ "src/bll/Asset.js": ((exports, module) => {
	const path$8 = require("node:path");
	const { Experiment: Experiment$3, experimentIsEnabled: experimentIsEnabled$3, isMac, isWindows } = require("haiku-common");
	const BaseModel$11 = require_BaseModel();
	const { Figma: Figma$1, PHONY_FIGMA_FILE } = require_Figma();
	const toTitleCase$3 = require_toTitleCase();
	const Illustrator$1 = require_Illustrator();
	const Sketch$1 = require_Sketch();
	const PAGES_REGEX = isWindows() ? /\\pages\\/ : /\/pages\//;
	const SLICES_REGEX = isWindows() ? /\\slices\\/ : /\/slices\//;
	const ARTBOARDS_REGEX = isWindows() ? /\\artboards\\/ : /\/artboards\//;
	const GROUPS_REGEX = isWindows() ? /\\groups\\/ : /\/groups\//;
	const FRAMES_REGEX = isWindows() ? /\\frames\\/ : /\/frames\//;
	const MAIN_COMPONENT_NAME = "main";
	/**
	* @class Asset
	* @description
	*  Encapsulates any object that needs to be displayed in the Library UI.
	*  Also abstracts some of the logic for asset nesting/grouping for display.
	*  Includes static methods for common asset-related tasks.
	*/
	var Asset$3 = class Asset$3 extends BaseModel$11 {
		getAbspath() {
			return path$8.join(this.project.getFolder(), this.getRelpath());
		}
		getRelpath() {
			return this.relpath;
		}
		getSceneName() {
			if (!this.isComponent()) return;
			return path$8.normalize(this.relpath).split(path$8.sep)[1];
		}
		getAssetInfo() {
			const parts = this.relpath.split(path$8.sep);
			if (parts.length !== 4) return {
				generator: null,
				relpath: null
			};
			const longSource = path$8.join(parts[0], parts[1], parts[2]);
			const shortSource = path$8.join(parts[0], parts[1]);
			const matchRegexp = isWindows() ? /\.(\w+)\.contents\\/ : /\.(\w+)\.contents\//;
			const match = longSource.match(matchRegexp);
			if (match) return {
				generator: match[1],
				generatorRelpath: shortSource.replace(/\.contents$/, "")
			};
			return {
				generator: null,
				relpath: null
			};
		}
		isDraggable() {
			return this.isComponent() && this.isComponentOtherThanMain() || this.isVector() || this.isImage();
		}
		isComponent() {
			return this.kind === Asset$3.KINDS.COMPONENT;
		}
		isVector() {
			return this.kind === Asset$3.KINDS.VECTOR;
		}
		isImage() {
			return this.kind === Asset$3.KINDS.IMAGE;
		}
		isSketchFile() {
			return this.kind === Asset$3.KINDS.SKETCH;
		}
		isFigmaFile() {
			return this.kind === Asset$3.KINDS.FIGMA;
		}
		isIllustratorFile() {
			return this.kind === Asset$3.KINDS.ILLUSTRATOR;
		}
		isRemoteAsset() {
			return this.proximity === Asset$3.PROXIMITIES.REMOTE;
		}
		isLocalAsset() {
			return this.proximity === Asset$3.PROXIMITIES.LOCAL;
		}
		isLocalComponent() {
			return this.isComponent() && this.isLocalAsset();
		}
		getLocalizedRelpath() {
			if (this.getRelpath()[0] === "@") return this.getRelpath();
			return Template$4.normalizePath(`./${this.getRelpath()}`);
		}
		isOrphanSvg() {
			return this.isVector() && this.parent.isDesignsHostFolder();
		}
		isComponentOtherThanMain() {
			return this.isComponent() && this.relpath !== "code/main/code.js";
		}
		isDesignsHostFolder() {
			return this.relpath === "designs";
		}
		isComponentsHostFolder() {
			return this.relpath === "code";
		}
		addSketchChild(svgAsset) {
			if (svgAsset.isSlice()) {
				this.slicesFolderAsset.insertChild(svgAsset);
				this.unshiftFolderAsset(this.slicesFolderAsset);
			} else if (svgAsset.isArtboard()) {
				this.artboardsFolderAsset.insertChild(svgAsset);
				this.unshiftFolderAsset(this.artboardsFolderAsset);
			} else this.insertChild(svgAsset);
		}
		addFigmaChild(svgAsset) {
			if (svgAsset.isSlice()) {
				this.slicesFolderAsset.insertChild(svgAsset);
				this.unshiftFolderAsset(this.slicesFolderAsset);
			} else if (svgAsset.isGroup()) {
				this.groupsFolderAsset.insertChild(svgAsset);
				this.unshiftFolderAsset(this.groupsFolderAsset);
			} else if (svgAsset.isFrame()) {
				this.framesFolderAsset.insertChild(svgAsset);
				this.unshiftFolderAsset(this.framesFolderAsset);
			}
		}
		addIllustratorChild(svgAsset) {
			this.artboardsFolderAsset.insertChild(svgAsset);
			this.unshiftFolderAsset(this.artboardsFolderAsset);
		}
		addSketchAsset(relpath, dict) {
			const project = this.project;
			const result = Asset$3.findById(path$8.join(project.getFolder(), relpath));
			if (result) {
				this.insertChild(result);
				return result;
			}
			const artboardsFolderAsset = Asset$3.upsert({
				uid: path$8.join(project.getFolder(), "designs", relpath, "artboards"),
				type: Asset$3.TYPES.CONTAINER,
				kind: Asset$3.KINDS.FOLDER,
				proximity: Asset$3.PROXIMITIES.LOCAL,
				project,
				relpath: path$8.join("designs", relpath, "artboards"),
				displayName: "Artboards",
				children: [],
				dtModified: Date.now()
			});
			const slicesFolderAsset = Asset$3.upsert({
				uid: path$8.join(project.getFolder(), "designs", relpath, "slices"),
				type: Asset$3.TYPES.CONTAINER,
				kind: Asset$3.KINDS.FOLDER,
				proximity: Asset$3.PROXIMITIES.LOCAL,
				project,
				relpath: path$8.join("designs", relpath, "slices"),
				displayName: "Slices",
				children: [],
				dtModified: Date.now()
			});
			const sketchAsset = Asset$3.upsert({
				uid: path$8.join(project.getFolder(), relpath),
				type: Asset$3.TYPES.CONTAINER,
				kind: Asset$3.KINDS.SKETCH,
				proximity: Asset$3.PROXIMITIES.LOCAL,
				project,
				relpath,
				displayName: path$8.basename(relpath),
				children: [],
				slicesFolderAsset,
				artboardsFolderAsset,
				dtModified: dict[relpath] && dict[relpath].dtModified || Date.now()
			});
			slicesFolderAsset.parent = artboardsFolderAsset.parent = sketchAsset;
			this.insertChild(sketchAsset);
			return sketchAsset;
		}
		addFigmaAsset(relpath) {
			const project = this.project;
			const result = Asset$3.findById(path$8.join(project.getFolder(), relpath));
			if (result) {
				this.insertChild(result);
				return result;
			}
			const framesFolderAsset = Asset$3.upsert({
				uid: path$8.join(project.getFolder(), "designs", relpath, "frames"),
				type: Asset$3.TYPES.CONTAINER,
				kind: Asset$3.KINDS.FOLDER,
				proximity: Asset$3.PROXIMITIES.LOCAL,
				project,
				relpath: path$8.join("designs", relpath, "frames"),
				displayName: "Frames",
				children: [],
				dtModified: Date.now()
			});
			const groupsFolderAsset = Asset$3.upsert({
				uid: path$8.join(project.getFolder(), "designs", relpath, "groups"),
				type: Asset$3.TYPES.CONTAINER,
				kind: Asset$3.KINDS.FOLDER,
				proximity: Asset$3.PROXIMITIES.LOCAL,
				project,
				relpath: path$8.join("designs", relpath, "groups"),
				displayName: "Groups",
				children: [],
				dtModified: Date.now()
			});
			const slicesFolderAsset = Asset$3.upsert({
				uid: path$8.join(project.getFolder(), "designs", relpath, "slices"),
				type: Asset$3.TYPES.CONTAINER,
				kind: Asset$3.KINDS.FOLDER,
				proximity: Asset$3.PROXIMITIES.LOCAL,
				project,
				relpath: path$8.join("designs", relpath, "slices"),
				displayName: "Slices",
				children: [],
				dtModified: Date.now()
			});
			const figmaAsset = Asset$3.upsert({
				uid: path$8.join(project.getFolder(), relpath),
				type: Asset$3.TYPES.CONTAINER,
				kind: Asset$3.KINDS.FIGMA,
				proximity: Asset$3.PROXIMITIES.LOCAL,
				figmaID: Figma$1.findIDFromPath(relpath),
				project,
				relpath,
				displayName: Figma$1.findDisplayNameFromPath(relpath),
				children: [],
				slicesFolderAsset,
				groupsFolderAsset,
				framesFolderAsset,
				dtModified: Date.now()
			});
			slicesFolderAsset.parent = groupsFolderAsset.parent = figmaAsset;
			this.insertChild(figmaAsset);
			return figmaAsset;
		}
		addIllustratorAsset(relpath, dict) {
			const project = this.project;
			const result = Asset$3.findById(path$8.join(project.getFolder(), relpath));
			if (result) {
				this.insertChild(result);
				return result;
			}
			const artboardsFolderAsset = Asset$3.upsert({
				uid: path$8.join(project.getFolder(), "designs", relpath, "artboards"),
				type: Asset$3.TYPES.CONTAINER,
				kind: Asset$3.KINDS.FOLDER,
				proximity: Asset$3.PROXIMITIES.LOCAL,
				project,
				relpath: path$8.join("designs", relpath, "artboards"),
				displayName: "Artboards",
				children: [],
				dtModified: Date.now()
			});
			const illustratorAsset = Asset$3.upsert({
				uid: path$8.join(project.getFolder(), relpath),
				type: Asset$3.TYPES.CONTAINER,
				kind: Asset$3.KINDS.ILLUSTRATOR,
				project,
				proximity: Asset$3.PROXIMITIES.LOCAL,
				relpath,
				displayName: path$8.basename(relpath),
				children: [],
				artboardsFolderAsset,
				dtModified: dict[relpath] && dict[relpath].dtModified || Date.now()
			});
			artboardsFolderAsset.parent = illustratorAsset;
			this.insertChild(illustratorAsset);
			return illustratorAsset;
		}
		getChildAssets() {
			return this.children;
		}
		isPrimaryAsset() {
			const { primaryAssetPath } = this.project.getNameVariations();
			return path$8.normalize(this.relpath) === primaryAssetPath;
		}
		isDefaultIllustratorAssetPath() {
			const { defaultIllustratorAssetPath } = this.project.getNameVariations();
			return path$8.normalize(this.relpath) === defaultIllustratorAssetPath;
		}
		isSlice() {
			return !!this.relpath.match(SLICES_REGEX);
		}
		isArtboard() {
			return !!this.relpath.match(ARTBOARDS_REGEX);
		}
		isGroup() {
			return !!this.relpath.match(GROUPS_REGEX);
		}
		isFrame() {
			return !!this.relpath.match(FRAMES_REGEX);
		}
		isPhony() {
			return this.relpath.includes(PHONY_FIGMA_FILE);
		}
		isPhonyOrOnlyHasPhonyChildrens() {
			const children = this.getChildAssets();
			return this.isPhony() || children.length === 1 && children[0].isPhony();
		}
		unshiftFolderAsset(folderAsset) {
			const foundAmongChildren = this.children.includes(folderAsset);
			if (folderAsset && !foundAmongChildren) this.children.unshift(folderAsset);
		}
		dump() {
			let str = `${this.relpath}`;
			this.children.forEach((child) => {
				const sublevel = child.dump();
				str += `\n  ${sublevel.split("\n").join("\n  ")}`;
			});
			return str;
		}
	};
	Asset$3.DEFAULT_OPTIONS = { required: {
		uid: true,
		type: true,
		kind: true,
		project: true,
		relpath: true,
		displayName: true,
		children: true,
		dtModified: true
	} };
	BaseModel$11.extend(Asset$3);
	Asset$3.TYPES = {
		CONTAINER: "container",
		FILE: "file",
		HACKY_MESSAGE: "hacky_message"
	};
	Asset$3.KINDS = {
		FOLDER: "folder",
		SKETCH: "sketch",
		FIGMA: "figma",
		ILLUSTRATOR: "ai",
		IMAGE: "image",
		FONT: "font",
		VECTOR: "vector",
		COMPONENT: "component",
		OTHER: "other",
		HACKY_MESSAGE: "hacky_message"
	};
	Asset$3.PROXIMITIES = {
		LOCAL: "local",
		REMOTE: "remote"
	};
	Asset$3.ingestAssets = (project, dict) => {
		Asset$3.purge();
		const componentFolderAsset = Asset$3.upsert({
			uid: path$8.join(project.getFolder(), "code"),
			type: Asset$3.TYPES.CONTAINER,
			kind: Asset$3.KINDS.FOLDER,
			proximity: Asset$3.PROXIMITIES.LOCAL,
			project,
			relpath: "code",
			displayName: "Components",
			children: [],
			dtModified: Date.now()
		});
		const designFolderAsset = Asset$3.upsert({
			uid: path$8.join(project.getFolder(), "designs"),
			type: Asset$3.TYPES.CONTAINER,
			kind: Asset$3.KINDS.FOLDER,
			proximity: Asset$3.PROXIMITIES.LOCAL,
			project,
			relpath: "designs",
			displayName: "Designs",
			children: [],
			dtModified: Date.now()
		});
		const rootAssets = [designFolderAsset];
		rootAssets.unshift(componentFolderAsset);
		for (const relpath in dict) {
			const extname = path$8.extname(relpath).toLowerCase();
			if (isMac() && extname === ".sketch") designFolderAsset.addSketchAsset(relpath, dict);
			else if (extname === ".ai") designFolderAsset.addIllustratorAsset(relpath, dict);
			else if (extname === ".svg") {
				if (relpath.match(PAGES_REGEX)) continue;
				const svgAsset = Asset$3.upsert({
					uid: path$8.join(project.getFolder(), relpath),
					type: Asset$3.TYPES.FILE,
					kind: Asset$3.KINDS.VECTOR,
					proximity: Asset$3.PROXIMITIES.LOCAL,
					project,
					relpath,
					displayName: path$8.basename(relpath, extname),
					children: [],
					dtModified: dict[relpath].dtModified
				});
				const { generator, generatorRelpath } = svgAsset.getAssetInfo();
				switch (generator) {
					case "sketch":
						designFolderAsset.addSketchAsset(generatorRelpath, dict).addSketchChild(svgAsset);
						break;
					case "figma":
						const figmaAsset = designFolderAsset.addFigmaAsset(generatorRelpath);
						if (figmaAsset) figmaAsset.addFigmaChild(svgAsset);
						break;
					case "ai":
						designFolderAsset.addIllustratorAsset(generatorRelpath, dict).addIllustratorChild(svgAsset);
						break;
					default: designFolderAsset.insertChild(svgAsset);
				}
			} else if (path$8.basename(relpath) === "code.js") {
				const namePart = relpath.split(path$8.sep)[1];
				if (namePart !== MAIN_COMPONENT_NAME) componentFolderAsset.insertChild(Asset$3.upsert({
					uid: path$8.join(project.getFolder(), relpath),
					type: Asset$3.TYPES.FILE,
					kind: Asset$3.KINDS.COMPONENT,
					proximity: Asset$3.PROXIMITIES.LOCAL,
					project,
					relpath,
					displayName: toTitleCase$3(namePart),
					children: [],
					dtModified: dict[relpath].dtModified
				}));
				componentFolderAsset.children = sortedChildrenOfComponentFolderAsset(componentFolderAsset);
			} else if (IMAGE_ASSET_EXTNAMES[extname] && experimentIsEnabled$3(Experiment$3.AllowBitmapImages)) {
				const imageAsset = Asset$3.upsert({
					uid: path$8.join(project.getFolder(), relpath),
					type: Asset$3.TYPES.FILE,
					kind: Asset$3.KINDS.IMAGE,
					proximity: Asset$3.PROXIMITIES.LOCAL,
					project,
					relpath,
					displayName: path$8.basename(relpath, extname),
					children: [],
					dtModified: dict[relpath].dtModified
				});
				designFolderAsset.insertChild(imageAsset);
			}
		}
		return rootAssets;
	};
	function sortedChildrenOfComponentFolderAsset(asset) {
		let main;
		const controls = [];
		const components = [];
		asset.children.forEach((child) => {
			if (child.isControl) controls.push(child);
			else if (child.displayName === "Main") main = child;
			else components.push(child);
		});
		const out$1 = [];
		if (main) out$1.push(main);
		return out$1.concat(sortAssetsAlpha(components)).concat(sortAssetsAlpha(controls));
	}
	function sortAssetsAlpha(assets) {
		return assets.sort((a, b) => {
			if (a.displayName < b.displayName) return -1;
			if (a.displayName > b.displayName) return 1;
			return 0;
		});
	}
	Asset$3.isInternalDrop = (dropEvent) => {
		return dropEvent && dropEvent.dataTransfer && !dropEvent.dataTransfer.types.includes("Files");
	};
	Asset$3.isSketchFile = (fileFromDropEvent) => {
		return path$8.extname(fileFromDropEvent.getAsFile().name).toLowerCase() === ".sketch";
	};
	Asset$3.isValidFile = (fileFromDropEvent) => {
		const file = fileFromDropEvent.getAsFile();
		if (!file) return false;
		const abspath = file.name;
		return fileFromDropEvent.type === "image/svg+xml" || Asset$3.isSketchFile(fileFromDropEvent) || Asset$3.isDesignAsset(abspath);
	};
	Asset$3.preventDefaultDrag = (dropEvent) => {
		if (Asset$3.isInternalDrop(dropEvent)) return null;
		return dropEvent.preventDefault();
	};
	const IMAGE_ASSET_EXTNAMES = {
		".png": true,
		".jpg": true,
		".jpeg": true,
		".gif": true
	};
	Asset$3.isImage = (filepath) => {
		return IMAGE_ASSET_EXTNAMES[path$8.extname(filepath).toLowerCase()];
	};
	Asset$3.isDesignAsset = (abspath) => {
		const extname = path$8.extname(abspath).toLowerCase();
		return Sketch$1.isSketchFile(abspath) || Illustrator$1.isIllustratorFile(abspath) || extname === ".svg" || Asset$3.isImage(abspath);
	};
	module.exports = Asset$3;
	const Template$4 = require_Template();
}) });

//#endregion
//#region src/bll/AST.js
var require_AST = /* @__PURE__ */ __commonJS({ "src/bll/AST.js": ((exports, module) => {
	const prettier = require("prettier");
	const BaseModel$10 = require_BaseModel();
	const expressionToRO$1 = require("@haiku/core/lib/reflection/expressionToRO").default;
	const { Experiment: Experiment$2, experimentIsEnabled: experimentIsEnabled$2 } = require("haiku-common");
	const bytecodeObjectToAST = require_bytecodeObjectToAST();
	const normalizeBytecodeAST = require_normalizeBytecodeAST();
	const parseCode = require_parseCode();
	const HAIKU_SOURCE_ATTRIBUTE$1 = "haiku-source";
	const HAIKU_VAR_ATTRIBUTE$1 = "haiku-var";
	/**
	* @class AST
	* @description
	*  Holds a copy of a File's AST in memory and makes manipulation calls
	*  more convenient. Includes static helper methods for AST manpulation.
	*/
	var AST$3 = class AST$3 extends BaseModel$10 {
		constructor(props, opts) {
			super(props, opts);
			this.obj = {};
		}
		updateWithBytecode(bytecode, previousSourceCodeString) {
			const imports = AST$3.findImportsFromTemplate(this.file, bytecode.template);
			const ro = AST$3.normalizeBytecode(bytecode);
			const { frontMatterNodes, backMatterNodes } = grabExtraMatterFromSourceCode(previousSourceCodeString);
			const ast = bytecodeObjectToAST(ro, imports, frontMatterNodes, backMatterNodes);
			normalizeBytecodeAST(ast);
			for (const k1 in this.obj) delete this.obj[k1];
			for (const k2 in ast) this.obj[k2] = ast[k2];
			return this.obj;
		}
		updateWithBytecodeAndReturnCode(bytecode, previousSourceCodeString) {
			this.updateWithBytecode(bytecode, previousSourceCodeString);
			return this.toCode();
		}
		toCode() {
			return prettier.format("()=>{}", { parser: () => this.obj });
		}
	};
	AST$3.DEFAULT_OPTIONS = { required: { file: true } };
	BaseModel$10.extend(AST$3);
	function grabExtraMatterFromSourceCode(code) {
		const out$1 = {
			frontMatterNodes: [],
			backMatterNodes: []
		};
		if (!experimentIsEnabled$2(Experiment$2.PreserveFrontMatterInCode) || !code) return out$1;
		try {
			const ast = parseCode(code);
			if (ast instanceof Error) return out$1;
			if (!ast || !ast.program || !ast.program.body) return out$1;
			let nodesCollection = out$1.frontMatterNodes;
			ast.program.body.forEach((node) => {
				if (isAutoGenImportNode(node)) return;
				if (isModuleExportsNode(node)) {
					nodesCollection = out$1.backMatterNodes;
					return;
				}
				nodesCollection.push(node);
			});
			return out$1;
		} catch (exception) {
			console.warn("[AST]", exception);
			return out$1;
		}
	}
	function isAutoGenImportNode(node) {
		return node.type === "VariableDeclaration" && node.declarations && node.declarations[0] && node.declarations[0].type === "VariableDeclarator" && node.declarations[0].init.type === "CallExpression" && node.declarations[0].init.callee.type === "Identifier" && node.declarations[0].init.callee.name === "require" && node.declarations[0].init.arguments && doesRequireCalleeArgIndicateAutoGenImport(node.declarations[0].init.arguments[0]);
	}
	function doesRequireCalleeArgIndicateAutoGenImport(node) {
		return node && typeof node.value === "string" && isImportSourceViaAutoGen(node.value);
	}
	function isImportSourceViaAutoGen(source) {
		return source === "@haiku/core" || source.match(/^@haiku\/core\/components/) || source.match(/\/code\.js$/);
	}
	function isModuleExportsNode(node) {
		return node.type === "ExpressionStatement" && node.expression.type === "AssignmentExpression" && node.expression.left.type === "MemberExpression" && node.expression.left.object.name === "module" && node.expression.left.property.name === "exports" && node.expression.right.type === "ObjectExpression";
	}
	AST$3.normalizeBytecode = (bytecode) => {
		const safe = AST$3.safeBytecode(bytecode);
		const decycled = Bytecode$3.decycle(safe, { doCleanMana: false });
		Bytecode$3.cleanBytecode(decycled);
		Template$3.cleanTemplate(decycled.template);
		return expressionToRO$1(decycled);
	};
	AST$3.findImportsFromTemplate = (hostfile, template) => {
		const imports = {};
		Template$3.visitWithoutDescendingIntoSubcomponents(template, (node, parent, index, depth, address) => {
			if (node && node.elementName && typeof node.elementName === "object") {
				let source;
				let identifier;
				if (node.elementName.__reference) {
					const reference = ModuleWrapper$5.parseReference(node.elementName.__reference);
					if (reference) {
						source = reference.source;
						identifier = reference.identifier;
					}
				} else {
					source = node.attributes && node.attributes[HAIKU_SOURCE_ATTRIBUTE$1];
					identifier = node.attributes && node.attributes[HAIKU_VAR_ATTRIBUTE$1];
				}
				if (source && identifier) {
					node.elementName.__reference = ModuleWrapper$5.buildReference(ModuleWrapper$5.REF_TYPES.COMPONENT, Template$3.normalizePath(`./${hostfile.relpath}`), Template$3.normalizePathOfPossiblyExternalModule(source), identifier);
					const importSourcePath = hostfile.getImportPathTo(source);
					imports[importSourcePath] = identifier;
				}
			}
		});
		return imports;
	};
	AST$3.safeBytecode = (bytecode) => {
		const safe = {};
		for (const key in bytecode) if (key === "template") safe[key] = Template$3.manaWithOnlyStandardProps(bytecode[key], true, (__reference) => {
			const ref = ModuleWrapper$5.parseReference(__reference);
			if (ref && ref.identifier) return ref.identifier;
			return __reference;
		});
		else safe[key] = bytecode[key];
		return safe;
	};
	AST$3.parseFile = (folder, relpath, contents, cb) => {
		const ast = parseCode(contents);
		if (ast instanceof Error) return cb(ast);
		return cb(null, ast);
	};
	module.exports = AST$3;
	const Bytecode$3 = require_Bytecode();
	const ModuleWrapper$5 = require_ModuleWrapper();
	const Template$3 = require_Template();
}) });

//#endregion
//#region src/svg/plugins/haikuClean.js
var require_haikuClean = /* @__PURE__ */ __commonJS({ "src/svg/plugins/haikuClean.js": ((exports, module) => {
	/**
	* Custom svgo plugin for cleaning Haiku instantiated components.
	* @param item
	* @see {@link https://github.com/svg/svgo/blob/master/docs/how-it-works/en.md}
	*/
	module.exports = {
		type: "perItem",
		fn: (item) => {
			if (item.hasAttr("font-family")) item.attr("font-family").value = "Helvetica, Arial, sans-serif";
		}
	};
}) });

//#endregion
//#region src/svg/plugins/haikuCollapseGroups.js
/**
* Fork of original svgo rule.
* @see {@link https://github.com/svg/svgo/blob/master/plugins/collapseGroups.js}
* TODO: contribute this back to main project and remove this plugin.
* The only change is the addition of ` && !g.hasAttr('filter')` on line 65.
*/
var require_haikuCollapseGroups = /* @__PURE__ */ __commonJS({ "src/svg/plugins/haikuCollapseGroups.js": ((exports) => {
	exports.type = "perItemReverse";
	exports.active = true;
	exports.description = "collapses useless groups";
	const collections = require("svgo/plugins/_collections");
	const attrsInheritable = collections.inheritableAttrs;
	const animationElems = collections.elemsGroups.animation;
	function hasAnimatedAttr(item) {
		return item.isElem(animationElems) && item.hasAttr("attributeName", this) || !item.isEmpty() && item.content.some(hasAnimatedAttr, this);
	}
	exports.fn = function(item) {
		if (item.isElem() && (!item.isElem("switch") || isFeaturedSwitch(item)) && !item.isEmpty()) item.content.forEach((g, i$1) => {
			if (g.isElem("g") && !g.isEmpty()) {
				if (g.hasAttr() && g.content.length === 1) {
					const inner = g.content[0];
					if (inner.isElem() && !inner.hasAttr("id") && !(g.hasAttr("class") && inner.hasAttr("class")) && (!g.hasAttr("clip-path") && !g.hasAttr("mask") || inner.isElem("g") && !g.hasAttr("transform") && !inner.hasAttr("transform") && !g.hasAttr("filter"))) g.eachAttr((attr) => {
						if (g.content.some(hasAnimatedAttr, attr.name)) return;
						if (!inner.hasAttr(attr.name)) inner.addAttr(attr);
						else if (attr.name == "transform") inner.attr(attr.name).value = `${attr.value} ${inner.attr(attr.name).value}`;
						else if (inner.hasAttr(attr.name, "inherit")) inner.attr(attr.name).value = attr.value;
						else if (!attrsInheritable.includes(attr.name) && !inner.hasAttr(attr.name, attr.value)) return;
						g.removeAttr(attr.name);
					});
				}
				if (!g.hasAttr() && !g.content.some((item$1) => {
					return item$1.isElem(animationElems);
				})) item.spliceContent(i$1, 1, g.content);
			} else if (isFeaturedSwitch(g)) item.spliceContent(i$1, 1, g.content);
		});
	};
	function isFeaturedSwitch(elem) {
		return elem.isElem("switch") && !elem.isEmpty() && !elem.content.some((child) => child.hasAttr("systemLanguage") || child.hasAttr("requiredFeatures") || child.hasAttr("requiredExtensions"));
	}
}) });

//#endregion
//#region src/svg/plugins/index.js
var require_plugins = /* @__PURE__ */ __commonJS({ "src/svg/plugins/index.js": ((exports, module) => {
	const haikuClean = require_haikuClean();
	const haikuCollapseGroups = require_haikuCollapseGroups();
	module.exports = {
		haikuClean,
		haikuCollapseGroups
	};
}) });

//#endregion
//#region src/svg/getSvgOptimizer.js
var require_getSvgOptimizer = /* @__PURE__ */ __commonJS({ "src/svg/getSvgOptimizer.js": ((exports, module) => {
	const Svgo = require("svgo");
	const customPlugins = require_plugins();
	let singleton;
	const plugins = [
		"removeMetadata",
		"removeTitle",
		"removeDesc",
		"removeUselessDefs",
		"removeEmptyAttrs",
		"removeUselessStrokeAndFill",
		"removeNonInheritableGroupAttrs",
		"moveElemsAttrsToGroup",
		"removeEmptyContainers",
		"removeEmptyText",
		"removeViewBox",
		"convertStyleToAttrs",
		customPlugins
	];
	module.exports = () => {
		if (!singleton) singleton = new Svgo({
			full: true,
			floatPrecision: 3,
			plugins
		});
		return singleton;
	};
}) });

//#endregion
//#region src/bll/File.js
var require_File = /* @__PURE__ */ __commonJS({ "src/bll/File.js": ((exports, module) => {
	const path$7 = require("node:path");
	const fse$3 = require("fs-extra");
	const { xmlToMana } = require("haiku-common");
	const { debounce } = require("lodash");
	const expressionToRO = require("@haiku/core/lib/reflection/expressionToRO").default;
	const { bootstrapSceneFilesSync } = require("@haiku/sdk-client");
	const getSvgOptimizer$1 = require_getSvgOptimizer();
	const logger$5 = require_LoggerInstance();
	const BaseModel$9 = require_BaseModel();
	const Cache$1 = require_Cache();
	const Lock$3 = require_Lock();
	const DEFAULT_CONTEXT_SIZE = {
		width: 550,
		height: 400
	};
	const DISK_FLUSH_TIMEOUT = 500;
	const AWAIT_CONTENT_FLUSH_TIMEOUT = 0;
	const FILE_TYPES = {
		design: "design",
		code: "code"
	};
	/**
	* @class File
	* @description
	*  Abstraction of Files that are contained in a project.
	*  WARNING: Contains a lot of legacy code which extends its responsibilities
	*  quite a bit further than what you would expect its purview to be.
	*  Worth a refactor. Many methods here belong in ActiveComponent or elsewhere.
	*/
	var File$3 = class File$3 extends BaseModel$9 {
		constructor(props, opts) {
			super(props, opts);
			const scenename = this.project.relpathToSceneName(this.relpath);
			const uid = ActiveComponent$3.buildPrimaryKey(this.project.getFolder(), scenename);
			if (this.project.getAlias() === "master" || this.project.getAlias() === "test") bootstrapSceneFilesSync(this.project.getFolder(), scenename, this.project.userconfig);
			this.component = ActiveComponent$3.upsert({
				uid,
				file: this,
				relpath: this.relpath,
				project: this.project,
				scenename
			});
			this.mod = ModuleWrapper$4.upsert({
				component: this.component,
				uid: this.getAbspath(),
				file: this
			});
			this.ast = AST$2.upsert({
				uid: this.getAbspath(),
				file: this
			});
			this.debouncedFlushContent = debounce(() => {
				this.flushContent();
			}, DISK_FLUSH_TIMEOUT);
			this.pendingRequestedFlush = false;
			this.pendingWrite = false;
		}
		destroy(cleanup = false) {
			this.mod.destroy();
			this.ast.destroy();
			if (cleanup && this.options.doWriteToDisk) fse$3.removeSync(this.getFolder());
			super.destroy();
		}
		afterInitialize() {
			this._numBytecodeUpdates = 0;
		}
		updateInMemoryHotModule(bytecode, cb) {
			this.assertBytecode(bytecode);
			this.dtModified = Date.now();
			this.cache.clear();
			return this.mod.update(bytecode, () => {
				this._numBytecodeUpdates++;
				return cb();
			});
		}
		requestAsyncContentFlush(flushSpec = {}) {
			if (this.options.doWriteToDisk) {
				this.pendingRequestedFlush = true;
				this.debouncedFlushContent();
			}
		}
		awaitNoFurtherContentFlushes(cb) {
			if (this.pendingRequestedFlush || this.pendingWrite) return setTimeout(() => this.awaitNoFurtherContentFlushes(cb), AWAIT_CONTENT_FLUSH_TIMEOUT);
			return cb();
		}
		updateContents(contents) {
			this.contents = contents;
		}
		trackContentsAndGetCode() {
			this.updateContents(this.ast.updateWithBytecodeAndReturnCode(this.mod.fetchInMemoryExport(), this.contents));
			return this.contents;
		}
		flushContent() {
			this.trackContentsAndGetCode();
			this.assertContents(this.contents);
			this.pendingRequestedFlush = false;
			this.pendingWrite = true;
			return this.write((err) => {
				if (err) throw err;
				this.pendingWrite = false;
			});
		}
		flushContentForceSync() {
			this.trackContentsAndGetCode();
			this.writeSync();
		}
		maybeFlushContentForceSync() {
			if (this.options.doWriteToDisk) this.flushContentForceSync();
		}
		assertBytecode(bytecode) {
			if (this._numBytecodeUpdates > 1) {
				if (Object.keys(bytecode).length < 2) throw new Error(`Bytecode object was empty ${this.getAbspath()}`);
			}
		}
		assertContents(contents) {
			if (typeof contents !== "string") throw new TypeError(`Code was invalid ${this.getAbspath()}`);
			if (contents.match(/^\s*$/)) throw new Error(`Code was blank ${this.getAbspath()}`);
		}
		write(cb) {
			if (!this.options.doWriteToDisk) throw new Error("[file] illegal write requested");
			this.assertContents(this.contents);
			this.dtLastWriteStart = Date.now();
			logger$5.info(`[file] async writing ${this.relpath} to disk`);
			return File$3.write(this.folder, this.relpath, this.contents, (err) => {
				this.dtLastWriteEnd = Date.now();
				if (err) {
					logger$5.info(`[file] error writing ${this.relpath} to disk`, err);
					return cb(err);
				}
				return cb();
			});
		}
		writeSync() {
			if (!this.options.doWriteToDisk) throw new Error("[file] illegal write requested");
			this.assertContents(this.contents);
			this.dtLastWriteStart = Date.now();
			logger$5.info(`[file] sync writing ${this.relpath} to disk`);
			const abspath = path$7.join(this.folder, this.relpath);
			fse$3.outputFileSync(abspath, this.contents);
			this.dtLastWriteEnd = Date.now();
		}
		getAbspath() {
			return path$7.join(this.folder, this.relpath);
		}
		getFolder() {
			return path$7.dirname(this.getAbspath());
		}
		isCode() {
			return this.type === FILE_TYPES.code;
		}
		isDesign() {
			return this.type === FILE_TYPES.design;
		}
		getImportPathTo(source) {
			if (source[0] === "@") return source;
			return Template$2.normalizePath(path$7.relative(path$7.dirname(this.relpath), source));
		}
		/**
		* @method getReifiedBytecode
		* @description Return the reified form of the bytecode, that is, with actual functions, references,
		* and instances present as they would be if it were being executed in memory.
		*/
		getReifiedBytecode() {
			return this.mod.fetchInMemoryExport();
		}
		/**
		* @method getReifiedDecycledBytecode
		* @description Similar to getReifiedBytecode but removes internal object pointers/annotations which either cause
		* serialization issues or which have the effect of adding too much metadata to the object. For example, the
		* reified bytecode by itself probably has a template that contains .layout properties, etc.
		*/
		getReifiedDecycledBytecode(cleanManaOptions = {}) {
			const reified = this.getReifiedBytecode();
			return Bytecode$2.decycle(reified, {
				cleanManaOptions,
				doCleanMana: true
			});
		}
		/**
		* @method getSerializedBytecode
		* @description Return the serialized form of the bytecode, that is, with all of its contents converted
		* into a form that can be safely transmitted over the wire. Functions get converted to function specifications,
		* identifiers are replaced with identifier descriptors, etc.
		* Note that this returns a new object; it doesn't serialize the bytecode in place. I.e., you can't
		* mutate the returned object and expect that to affect the live in-memory bytecode, nor the file system.
		*/
		getSerializedBytecode() {
			return this.cache.fetch("getSerializedBytecode", () => {
				const reified = this.getReifiedDecycledBytecode();
				Bytecode$2.cleanBytecode(reified);
				return expressionToRO(reified);
			});
		}
	};
	BaseModel$9.extend(File$3);
	File$3.TYPES = FILE_TYPES;
	File$3.DEFAULT_OPTIONS = {
		doWriteToDisk: false,
		skipDiffLogging: true,
		required: {
			relpath: true,
			folder: true,
			project: true
		}
	};
	File$3.DEFAULT_CONTEXT_SIZE = DEFAULT_CONTEXT_SIZE;
	File$3.cache = new Cache$1();
	File$3.write = (folder, relpath, contents, cb) => {
		const abspath = path$7.join(folder, relpath);
		return Lock$3.request(Lock$3.LOCKS.FileReadWrite(abspath), true, (release) => {
			return fse$3.outputFile(abspath, contents, (err) => {
				release();
				if (err) return cb(err);
				return cb();
			});
		});
	};
	File$3.read = (folder, relpath, cb) => {
		const abspath = path$7.join(folder, relpath);
		return Lock$3.request(Lock$3.LOCKS.FileReadWrite(abspath), false, (release) => {
			return fse$3.readFile(abspath, (err, buffer$1) => {
				release();
				if (err) return cb(err);
				return cb(null, buffer$1.toString());
			});
		});
	};
	File$3.isPathCode = (relpath) => {
		return _isFileCode(relpath);
	};
	File$3.buildManaCacheKey = (folder, relpath) => {
		return `mana:${path$7.join(folder, relpath)}`;
	};
	/**
	* @method readMana
	* @description Given the relative path to an SVG file, read the file into
	* memory, parse the contents, and return the respective 'mana' data object.
	* @param relpath {String} Relative path to SVG design asset within folder
	* @param cb {Function} Callback
	*/
	File$3.readMana = (folder, relpath, cb) => {
		return File$3.cache.async(File$3.buildManaCacheKey(folder, relpath), (done$1) => {
			return File$3.read(folder, relpath, (err, buffer$1) => {
				if (err) return done$1(err);
				const xml = buffer$1.toString();
				const returnUnoptimizedMana = () => {
					const manaFull = xmlToMana(xml);
					if (!manaFull) return done$1(/* @__PURE__ */ new Error(`We couldn't load the contents of ${relpath}`));
					return done$1(null, manaFull);
				};
				return getSvgOptimizer$1().optimize(xml, { path: path$7.join(folder, relpath) }).then((contents) => {
					const manaOptimized = xmlToMana(contents.data);
					if (!manaOptimized) throw new Error(`We couldn't load the contents of ${relpath}`);
					return done$1(null, manaOptimized);
				}).catch((exception) => {
					logger$5.warn(`[file] svgo couldn't parse ${relpath}`, exception);
					return setTimeout(() => {
						return returnUnoptimizedMana();
					});
				});
			});
		}, cb, (mana) => {
			return Template$2.clone({}, mana);
		});
	};
	function _isFileCode(relpath) {
		return path$7.extname(relpath) === ".js";
	}
	module.exports = File$3;
	const ActiveComponent$3 = require_ActiveComponent();
	const AST$2 = require_AST();
	const Bytecode$2 = require_Bytecode();
	const ModuleWrapper$4 = require_ModuleWrapper();
	const Template$2 = require_Template();
}) });

//#endregion
//#region src/bll/ImageComponent.js
var require_ImageComponent = /* @__PURE__ */ __commonJS({ "src/bll/ImageComponent.js": ((exports, module) => {
	const path$6 = require("node:path");
	const imageSize = require("image-size");
	const BaseModel$8 = require_BaseModel();
	const MODPATH$1 = "@haiku/core/components/controls/Image/code/main/code";
	const BYTECODE$1 = require(MODPATH$1);
	/**
	* @class ImageComponent
	*/
	var ImageComponent$2 = class extends BaseModel$8 {
		constructor(props, opts) {
			super(props, opts);
			this.modpath = MODPATH$1;
			this.identifier = "image";
		}
		getTitle() {
			const parts = this.relpath.split(path$6.sep);
			const last = parts[parts.length - 1];
			return path$6.basename(last, path$6.extname(last));
		}
		getAbspath() {
			return path$6.join(this.project.getFolder(), this.relpath);
		}
		getLocalHref() {
			return `web+haikuroot://${path$6.normalize(this.relpath)}`;
		}
		queryImageSize(cb) {
			return imageSize(this.getAbspath(), cb);
		}
		getReifiedBytecode() {
			return BYTECODE$1;
		}
		doesMatchOrHostComponent(other, cb) {
			return cb(null, false);
		}
	};
	ImageComponent$2.DEFAULT_OPTIONS = { required: {
		project: true,
		relpath: true
	} };
	BaseModel$8.extend(ImageComponent$2);
	module.exports = ImageComponent$2;
}) });

//#endregion
//#region src/bll/InstalledComponent.js
var require_InstalledComponent = /* @__PURE__ */ __commonJS({ "src/bll/InstalledComponent.js": ((exports, module) => {
	const path$5 = require("node:path");
	const BaseModel$7 = require_BaseModel();
	/**
	* @class InstalledComponent
	*/
	var InstalledComponent$2 = class extends BaseModel$7 {
		getTitle() {
			const parts = this.modpath.split(path$5.sep);
			if (parts[0] === "@haiku" && parts[1] === "core" && parts[2] === "components") return parts[4];
			return parts.join("_");
		}
		getReifiedBytecode() {
			return null;
		}
		doesMatchOrHostComponent(other, cb) {
			return cb(null, false);
		}
		getIdentifier() {
			return ModuleWrapper$3.modulePathToIdentifierName(this.modpath);
		}
	};
	InstalledComponent$2.DEFAULT_OPTIONS = { required: { modpath: true } };
	BaseModel$7.extend(InstalledComponent$2);
	module.exports = InstalledComponent$2;
	const ModuleWrapper$3 = require_ModuleWrapper();
}) });

//#endregion
//#region src/bll/MountElement.js
var require_MountElement = /* @__PURE__ */ __commonJS({ "src/bll/MountElement.js": ((exports, module) => {
	const BaseModel$6 = require_BaseModel();
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
	var MountElement$2 = class extends BaseModel$6 {
		constructor(props, opts) {
			super(props, opts);
			if (typeof window !== "undefined") {
				this._$el = window.document.createElement("div");
				this._$el.setAttribute("id", this.getRenderId());
				this._$el.setAttribute("class", "haiku-component-mount");
				this._$el.style.position = "absolute";
				this._$el.style.left = 0;
				this._$el.style.top = 0;
				this._$el.style.width = "100%";
				this._$el.style.height = "100%";
				this._$el.style.overflow = "visible";
			} else this._$el = null;
		}
		/**
		* @method $el
		* @description Return the DOM element for this mount.
		*/
		$el() {
			return this._$el;
		}
		/**
		* @method remountInto
		* @description Given a host DOM node, inject our render target DOM node into it
		*/
		remountInto($host) {
			if (!$host) return null;
			const $el = this.$el();
			if ($el) {
				if ($el.parentNode) $el.parentNode.removeChild($el);
				while ($host.firstChild) $host.removeChild($host.firstChild);
				$host.appendChild($el);
			}
		}
		getInnerHTML() {
			if (this.$el()) return this.$el().innerHTML;
			return "<div></div>";
		}
		getBoundingClientRect() {
			if (this.$el()) {
				const rect = this.$el().getBoundingClientRect();
				return {
					width: rect.width,
					height: rect.height,
					top: rect.top,
					bottom: rect.bottom,
					left: rect.left,
					right: rect.right
				};
			}
			return {
				width: 1,
				height: 1,
				bottom: 0,
				top: 0,
				left: 0,
				right: 0
			};
		}
		setClass(klassName) {
			if (this.$el()) this.$el().className = `${klassName}`;
		}
		setOpacity(opacity) {
			if (this.$el()) this.$el().style.opacity = `${opacity}`;
		}
		getRenderId() {
			return `haiku-mount-${this.getPrimaryKey()}`;
		}
		/**
		* @method clear
		* @description Clear all children from this mount DOM element
		*/
		clear() {
			while (this.$el() && this.$el().firstChild) this.$el().removeChild(this.$el().firstChild);
		}
	};
	MountElement$2.DEFAULT_OPTIONS = { required: { component: true } };
	BaseModel$6.extend(MountElement$2);
	module.exports = MountElement$2;
}) });

//#endregion
//#region src/bll/PseudoFile.js
var require_PseudoFile = /* @__PURE__ */ __commonJS({ "src/bll/PseudoFile.js": ((exports, module) => {
	const BaseModel$5 = require_BaseModel();
	/**
	* @class PseudoFile
	*/
	var PseudoFile$2 = class extends BaseModel$5 {};
	PseudoFile$2.DEFAULT_OPTIONS = { required: { relpath: true } };
	BaseModel$5.extend(PseudoFile$2);
	module.exports = PseudoFile$2;
}) });

//#endregion
//#region src/bll/SelectionMarquee.js
var require_SelectionMarquee = /* @__PURE__ */ __commonJS({ "src/bll/SelectionMarquee.js": ((exports, module) => {
	const BaseModel$4 = require_BaseModel();
	/**
	* @class SelectionMarquee
	* @description
	*  Represents the on-stage selection marquee.
	*/
	var SelectionMarquee$2 = class extends BaseModel$4 {
		constructor(props, opts) {
			super(props, opts);
			this._isActive = false;
		}
		startSelection(startPosition) {
			this._isActive = true;
			this._startPosition = startPosition;
		}
		moveSelection(movePosition) {
			this._movePosition = movePosition;
		}
		endSelection() {
			this._isActive = false;
			this._startPosition = null;
			this._movePosition = null;
		}
		isActive() {
			return this._isActive;
		}
		getBox() {
			if (!this._startPosition || !this._movePosition || !this._isActive) return {
				x: 1,
				y: 1,
				width: 1,
				height: 1
			};
			const w = this._movePosition.x - this._startPosition.x;
			const h = this._movePosition.y - this._startPosition.y;
			const x1 = this._startPosition.x;
			const y1 = this._startPosition.y;
			const x2 = x1 + w;
			const y2 = y1 + h;
			return {
				x: Math.min(x1, x2),
				y: Math.min(y1, y2),
				width: Math.abs(w),
				height: Math.abs(h)
			};
		}
	};
	SelectionMarquee$2.DEFAULT_OPTIONS = { required: {
		uid: true,
		component: true,
		artboard: true
	} };
	BaseModel$4.extend(SelectionMarquee$2);
	module.exports = SelectionMarquee$2;
}) });

//#endregion
//#region src/bll/ActiveComponent.js
var require_ActiveComponent = /* @__PURE__ */ __commonJS({ "src/bll/ActiveComponent.js": ((exports, module) => {
	const path$4 = require("node:path");
	const { default: HaikuComponent, clone } = require("@haiku/core/lib/HaikuComponent");
	const { LAYOUT_3D_SCHEMA } = require("@haiku/core/lib/HaikuComponent");
	const { HAIKU_ID_ATTRIBUTE, HAIKU_LOCKED_ATTRIBUTE, HAIKU_TITLE_ATTRIBUTE, HAIKU_VAR_ATTRIBUTE } = require("@haiku/core/lib/HaikuElement");
	const { PlaybackFlag } = require("@haiku/core/lib/HaikuTimeline");
	const async$1 = require("async");
	const jss$1 = require("json-stable-stringify");
	const lodash$1 = require("lodash");
	const pascalcase = require("pascalcase");
	const pretty = require("pretty");
	const HaikuDOMAdapter = require("@haiku/core/lib/adapters/dom").default;
	const { InteractionMode: InteractionMode$1, isPreviewMode } = require("@haiku/core/lib/helpers/interactionModes");
	const { getSortedKeyframes } = require("@haiku/core/lib/helpers/KeyframeUtils");
	const Layout3D = require("@haiku/core/lib/Layout3D");
	const { Experiment: Experiment$1, experimentIsEnabled: experimentIsEnabled$1 } = require("haiku-common");
	const ensureTrailingSlash$1 = require_ensureTrailingSlash();
	const CryptoUtils$1 = require_CryptoUtils();
	const logger$4 = require_LoggerInstance();
	const BaseModel$3 = require_BaseModel();
	const toTitleCase$2 = require_toTitleCase();
	const Lock$2 = require_Lock();
	const SustainedWarningChecker = require("haiku-common").SustainedWarningChecker;
	const KEYFRAME_MOVE_DEBOUNCE_TIME = 100;
	const CHECK_SUSTAINED_WARNINGS_DEBOUNCE_TIME = 1e3;
	const DEFAULT_SCENE_NAME = "main";
	const DEFAULT_INTERACTION_MODE = InteractionMode$1.EDIT;
	const DEFAULT_TIMELINE_NAME = "Default";
	const DEFAULT_TIMELINE_TIME = 0;
	const HAIKU_SOURCE_ATTRIBUTE = "haiku-source";
	const SYNC_LOCKED_ID_SUFFIX = "#lock";
	const SELECTION_WAIT_TIME = 0;
	const SELECTION_PING_TIME = 100;
	const isNumeric = (n) => !isNaN(Number.parseFloat(n)) && isFinite(n);
	function describeHotComponent(componentId, timelineName, timelineTime, propertyGroup) {
		if (Number(timelineTime) !== 0) return null;
		return {
			selector: `haiku:${componentId}`,
			propertyNames: Array.isArray(propertyGroup) ? propertyGroup : Object.keys(propertyGroup),
			timelineName
		};
	}
	function keyframeUpdatesToHotComponentDescriptors(keyframeUpdates) {
		const hotComponentDescriptors = [];
		for (const timelineName in keyframeUpdates) for (const componentId in keyframeUpdates[timelineName]) for (const propertyName in keyframeUpdates[timelineName][componentId]) for (const keyframeMs in keyframeUpdates[timelineName][componentId][propertyName]) {
			const hotComponent = describeHotComponent(componentId, timelineName, keyframeMs, [propertyName]);
			if (hotComponent) hotComponentDescriptors.push(hotComponent);
		}
		return hotComponentDescriptors;
	}
	/**
	* @class ActiveComponent
	* @description
	*  Encapsulates and consolidates code to edit a live in-stage component.
	*  TODO: This should just be called 'Component' or 'LiveComponent' or something, with
	*  only one of them being "active" at a certain point in time.
	*  For now, the logic of who is/isn't active is managed by Project.
	*/
	var ActiveComponent$2 = class ActiveComponent$2 extends BaseModel$3 {
		constructor(props, opts) {
			super(props, opts);
			if (!this.scenename) this.scenename = DEFAULT_SCENE_NAME;
			this.snapshots = [];
			this.mount = MountElement$1.upsert({
				uid: this.getPrimaryKey(),
				component: this,
				project: this.project
			});
			this.mount.on("update", (what) => {
				this.emit("update", what, this.mount);
			});
			this.artboard = Artboard$1.upsert({
				uid: this.getPrimaryKey(),
				component: this,
				project: this.project,
				mount: this.mount
			});
			this.artboard.on("update", (what) => {
				this.emit("update", what, this.artboard);
			});
			this.marquee = SelectionMarquee$1.upsert({
				uid: this.getPrimaryKey(),
				component: this,
				artboard: this.artboard
			});
			this.project.addActiveComponentToRegistry(this);
			this.interactionMode = DEFAULT_INTERACTION_MODE;
			Element$1.on("update", (element, what, metadata) => {
				if (element.component === this) {
					if (what === "element-selected" || what === "element-selected-softly") this.handleElementSelected(element.getComponentId(), metadata);
					else if (what === "element-unselected" || what === "element-unselected-softly") this.handleElementUnselected(element.getComponentId(), metadata);
					else if (what === "element-hovered") this.handleElementHovered(element.getComponentId(), metadata);
					else if (what === "element-unhovered") this.handleElementUnhovered(element.getComponentId(), metadata);
					else if (what === "jit-property-added" || what === "jit-property-removed") this.reload({
						hardReload: true,
						clearCacheOptions: { doClearEntityCaches: true }
					}, {}, () => {});
					this.emit("update", what, element, metadata);
				}
			});
			Row$1.on("update", (row, what) => {
				if (row.component === this) {
					this.emit("update", what, row, this.project.getMetadata());
					if (what === "row-collapsed" || what === "row-expanded") this.cache.unset("displayableRows");
				}
			});
			Keyframe$1.on("update", (keyframe, what) => {
				if (keyframe.component === this) this.emit("update", what, keyframe, this.project.getMetadata());
			});
			this.commitAccumulatedKeyframeMovesDebounced = lodash$1.debounce(this.commitAccumulatedKeyframeMoves.bind(this), KEYFRAME_MOVE_DEBOUNCE_TIME);
		}
		findElementRoot() {
			for (const element of Element$1.findRoots()) if (element.component.uid === this.uid) return element;
			return null;
		}
		queryElements(criteria) {
			if (!criteria) criteria = {};
			criteria.component = this;
			return Element$1.where(criteria);
		}
		findRowByComponentId(haikuId) {
			return Row$1.findByComponentAndHaikuId(this, haikuId);
		}
		findPropertyRowsByParentComponentId(parentHaikuId) {
			return Row$1.findPropertyRowsByComponentAndParentHaikuId(this, parentHaikuId);
		}
		findElementByComponentId(haikuId) {
			return Element$1.findByComponentAndHaikuId(this, haikuId);
		}
		locateTemplateNodeByComponentId(componentId) {
			return this.getTemplateNodesByComponentId()[componentId];
		}
		getTemplateNodesByComponentId() {
			return this.cache.fetch("getTemplateNodesByComponentId", () => {
				const nodes = {};
				const mana = this.getReifiedBytecode().template;
				Template$1.visit(mana, (node) => {
					if (node && node.attributes && node.attributes[HAIKU_ID_ATTRIBUTE]) nodes[node.attributes[HAIKU_ID_ATTRIBUTE]] = node;
				});
				return nodes;
			});
		}
		findTemplateNodeByComponentId(mana, componentId) {
			if (!mana) return;
			if (mana.attributes && mana.attributes[HAIKU_ID_ATTRIBUTE] === componentId) return mana;
			if (Array.isArray(mana.children)) for (let i$1 = 0; i$1 < mana.children.length; i$1++) {
				const maybeChild = this.findTemplateNodeByComponentId(mana.children[i$1], componentId);
				if (maybeChild) return maybeChild;
			}
		}
		findElementByUid(uid) {
			return Element$1.findById(uid);
		}
		getCurrentTimelineName() {
			return Timeline$1.DEFAULT_NAME;
		}
		getCurrentTimelineTime() {
			const canonicalCoreInstance = this.$instance;
			if (!canonicalCoreInstance) return 0;
			const canonicalCoreTimeline = canonicalCoreInstance.getTimeline(this.getCurrentTimelineName());
			if (!canonicalCoreTimeline) return 0;
			return canonicalCoreTimeline.getControlledTime() || 0;
		}
		getCurrentMspf() {
			return 16.666;
		}
		getRelpath() {
			return path$4.join("code", this.getSceneName(), "code.js");
		}
		getLocalizedRelpath() {
			return Template$1.normalizePath(`./${this.getRelpath()}`);
		}
		getSceneCodeFolder() {
			return path$4.join(this.project.getFolder(), "code", this.getSceneName());
		}
		getSceneDomModulePath() {
			return path$4.join("code", this.getSceneName(), "dom.js");
		}
		getRelpathWithRespectToProjectFromPathRelativeToUs(relpathRelativeToUs) {
			return path$4.normalize(path$4.join(this.getSceneCodeFolder(), relpathRelativeToUs)).replace(this.project.getFolder(), "").slice(1);
		}
		setSceneName(scenename) {
			this.scenename = scenename;
			return this;
		}
		setAsCurrentActiveComponent(metadata, cb) {
			this.project.setCurrentActiveComponent(this.getSceneName(), metadata, cb);
		}
		getSceneName() {
			return this.scenename;
		}
		getFriendlySceneName(maybeProjectName) {
			const snakename = this.getSceneName();
			if (snakename === DEFAULT_SCENE_NAME) return `${this.project.getFriendlyName(maybeProjectName)} (Main)`;
			return `${toTitleCase$2(snakename)}`;
		}
		getAbsoluteLottieFilePath() {
			return path$4.join(this.getSceneCodeFolder(), "lottie.json");
		}
		getAbsoluteHaikuStaticFilePath() {
			return path$4.join(this.getSceneCodeFolder(), "static.json");
		}
		fetchActiveBytecodeFile() {
			return this.file;
		}
		tick() {
			if (this.$instance.context && this.$instance.context.tick) this.$instance.context.tick();
		}
		forceFlush() {
			this.$instance.markForFullFlush(true);
			this.tick();
		}
		addHotComponents(hotComponents) {
			hotComponents.forEach((hotComponent) => {
				if (hotComponent) this.$instance.addHotComponent(hotComponent);
			});
		}
		clearCaches(options = {}) {
			this.$instance.clearCaches(options);
			this.fetchRootElement().cache.clear();
			if (options.doClearEntityCaches) this.fetchRootElement().clearEntityCaches();
		}
		getPropertyGroupValueFromPropertyKeys(componentId, timelineName, timelineTime, propertyKeys) {
			const groupValue = {};
			const bytecode = this.getReifiedBytecode();
			if (!bytecode) return groupValue;
			if (!bytecode.timelines) return groupValue;
			if (!bytecode.timelines[timelineName]) return groupValue;
			if (!bytecode.timelines[timelineName][`haiku:${componentId}`]) return groupValue;
			const cluster = bytecode.timelines[timelineName][`haiku:${componentId}`];
			propertyKeys.forEach((propertyKey) => {
				if (!cluster[propertyKey]) return;
				if (!cluster[propertyKey][timelineTime]) return;
				groupValue[propertyKey] = cluster[propertyKey][timelineTime].value;
			});
			return groupValue;
		}
		getMountHTML() {
			return this.getMount().getInnerHTML();
		}
		htmlSnapshot(cb) {
			return cb(null, pretty(this.getMountHTML()).replace(/web\+haikuroot:\/\//g, ensureTrailingSlash$1(this.project.getFolder())));
		}
		setCurrentTimelineFrameValue(frame) {
			this.getCurrentTimeline().seek(frame, true);
		}
		setTimelineTimeValue(timelineTime, forceSeek = false) {
			timelineTime = Math.round(timelineTime);
			if (forceSeek || timelineTime !== this.getCurrentTimelineTime()) {
				Timeline$1.where({ component: this }).forEach((timeline) => {
					timeline.seekToTime(timelineTime, true, forceSeek);
				});
				if (this.$instance.context && this.$instance.context.tick) this.$instance.context.tick(true);
				ElementSelectionProxy$1.all().forEach((proxy) => {
					proxy.clearAllRelatedCaches();
					proxy.reinitializeLayout();
				});
			}
		}
		setTitleForComponent(componentId, newTitle, metadata, cb) {
			this.project.updateHook("setTitleForComponent", this.getRelpath(), componentId, newTitle, metadata, (fire) => {
				return this.performComponentWork((bytecode, mana, done$1) => {
					const templateNode = this.locateTemplateNodeByComponentId(componentId);
					if (!templateNode) return done$1(null, "", "");
					if (newTitle) {
						const oldTitle = templateNode.attributes[HAIKU_TITLE_ATTRIBUTE];
						templateNode.attributes[HAIKU_TITLE_ATTRIBUTE] = newTitle;
						return done$1(null, newTitle, oldTitle);
					}
					return done$1(null, templateNode.attributes[HAIKU_TITLE_ATTRIBUTE], templateNode.attributes[HAIKU_TITLE_ATTRIBUTE]);
				}, (err, newTitle$1, oldTitle) => {
					if (err) return cb(err);
					const element = this.findElementByComponentId(componentId);
					if (element) element.updateTargetingRows("row-set-title");
					fire(null, oldTitle);
					return cb(null, newTitle$1);
				});
			});
		}
		setLockedStatusForComponent(componentId, locked, metadata, cb) {
			this.project.updateHook("setLockedStatusForComponent", this.getRelpath(), componentId, locked, metadata, (fire) => {
				return this.performComponentWork((bytecode, mana, done$1) => {
					const templateNode = this.locateTemplateNodeByComponentId(componentId);
					if (!templateNode) return done$1(null, "", "");
					const oldStatus = templateNode.attributes[HAIKU_LOCKED_ATTRIBUTE];
					templateNode.attributes[HAIKU_LOCKED_ATTRIBUTE] = locked;
					return done$1(null, locked, oldStatus);
				}, (err, locked$1, oldStatus) => {
					if (err) return cb(err);
					const element = this.findElementByComponentId(componentId);
					if (element) element.updateTargetingRows("row-set-locked");
					fire(null, oldStatus);
					return cb(null, locked$1);
				});
			});
		}
		/**
		* @method handleElementSelected
		* @description Hook to call once an element in-memory has been selected.
		* This is responsible for notifying other views about the action, and emitting an event that others can listen to.
		* The metadata arg is important because it has info about who originated the message, allowing us to avoid infinite loop.
		* Note: This gets called automatically by element.select()
		*/
		handleElementSelected(componentId, metadata) {
			metadata.integrity = false;
			this.project.updateHook("selectElement", this.getRelpath(), componentId, metadata, (fire) => fire());
		}
		/**
		* @method handleElementUnselected
		* @description Hook to call once an element in-memory has been unselected.
		* This is responsible for notifying other views about the action, and emitting an event that others can listen to.
		* The metadata arg is important because it has info about who originated the message, allowing us to avoid infinite loop.
		* Note: This gets called automatically by element.unselect()
		*/
		handleElementUnselected(componentId, metadata) {
			metadata.integrity = false;
			this.project.updateHook("unselectElement", this.getRelpath(), componentId, metadata, (fire) => fire());
		}
		handleElementHovered(componentId, metadata) {
			metadata.integrity = false;
			this.project.updateHook("hoverElement", this.getRelpath(), componentId, metadata, (fire) => fire());
		}
		handleElementUnhovered(componentId, metadata) {
			metadata.integrity = false;
			this.project.updateHook("unhoverElement", this.getRelpath(), componentId, metadata, (fire) => fire());
		}
		getTopLevelElementHaikuIds() {
			const template = this.getReifiedBytecode().template;
			return (template && template.children || []).map((child) => {
				return child && child.attributes && child.attributes[HAIKU_ID_ATTRIBUTE];
			}).filter((id$1) => {
				return !!id$1;
			});
		}
		selectElementWithinTime(waitTime, componentId, metadata, cb) {
			const element = Element$1.findByComponentAndHaikuId(this, componentId);
			if (!element) {
				if (waitTime <= 0) return cb();
				return setTimeout(() => {
					return this.selectElementWithinTime(waitTime - SELECTION_PING_TIME, componentId, metadata, cb);
				}, SELECTION_PING_TIME);
			}
			element.select(metadata);
			cb();
		}
		selectAll(options, metadata, cb) {
			return Lock$2.request(Lock$2.LOCKS.ActiveComponentWork, false, (release) => {
				this.getArtboard().getElement().children.forEach((element) => {
					if (element.isLocked()) return;
					element.selectSoftly(metadata);
				});
				release();
				this.project.updateHook("selectAll", this.getRelpath(), options, metadata, (fire) => fire());
				return cb();
			});
		}
		selectElement(componentId, metadata, cb) {
			return this.selectElementWithinTime(SELECTION_WAIT_TIME, componentId, metadata, () => {
				return cb();
			});
		}
		unselectElementWithinTime(waitTime, componentId, metadata, cb) {
			const element = Element$1.findByComponentAndHaikuId(this, componentId);
			if (!element) {
				if (waitTime <= 0) return cb();
				return setTimeout(() => {
					return this.unselectElementWithinTime(waitTime - SELECTION_PING_TIME, componentId, metadata, cb);
				}, SELECTION_PING_TIME);
			}
			element.unselect(metadata);
			return cb();
		}
		unselectElement(componentId, metadata, cb) {
			return this.unselectElementWithinTime(SELECTION_WAIT_TIME, componentId, metadata, () => {
				return cb();
			});
		}
		hoverElement(componentId, metadata, cb) {
			const element = Element$1.findByComponentAndHaikuId(this, componentId);
			if (element) element.hoverOn(metadata);
			return cb();
		}
		unhoverElement(componentId, metadata, cb) {
			const element = Element$1.findByComponentAndHaikuId(this, componentId);
			if (element) element.hoverOff(metadata);
			return cb();
		}
		isPreviewModeActive() {
			return isPreviewMode(this.interactionMode);
		}
		/**
		* @method setInteractionMode
		* @description Changes the current interaction mode and flushes all cachés
		*/
		setInteractionMode(interactionMode, cb) {
			this.interactionMode = interactionMode;
			return this.reload({
				superficial: true,
				clearCacheOptions: { doClearEntityCaches: true }
			}, null, cb);
		}
		/**
		* @method setHotEditingMode
		* @description Changes the current hot-editing mode setting.
		* Used by Glass when playing the component using the "play" button.
		*/
		setHotEditingMode(hotEditingMode) {
			this.$instance.assignConfig({ hotEditingMode });
		}
		getInsertionPointInfo(nonce = 0) {
			const bytecode = this.getReifiedBytecode();
			const mana = bytecode && bytecode.template;
			const index = mana && mana.children && mana.children.length || 0;
			const template = mana && Template$1.manaWithOnlyMinimalProps(mana, () => ({}));
			const source = `${jss$1(template)}-${index}-${nonce}`;
			return {
				template,
				source,
				hash: Template$1.getHash(source, 6)
			};
		}
		getInsertionPointHash() {
			return this.getInsertionPointInfo().hash;
		}
		/**
		* @method doesMatchOrHostComponent
		* @description Detect whether we contain other in our tree or in the subtrees of
		* any components that we host, or whether we are a match for other.
		*/
		doesMatchOrHostComponent(other, cb) {
			if (other === this) return cb(null, true);
			if (Template$1.normalizePath(other.getRelpath()) === Template$1.normalizePath(this.getRelpath())) return cb(null, true);
			return cb(null, Bytecode$1.doesMatchOrHostBytecode(this.getReifiedBytecode(), other.getReifiedBytecode(), void 0));
		}
		/**
		* @method instantiateReference
		* @description Instantiate a component by reference, i.e., using a module path
		* that points to that component using a require()-compatible path.
		* @param identifier {String} Identifier (variable) name to write to the AST
		* @param modpath {String} require()-compatible path to a module
		* @param coords {Object} Coordinates of the instantiatee
		* @param overrides {Object} Overrides to apply to the timeline [unused]
		* @param metadata {Object} Signal metadata
		* @param cb {Function}
		*/
		instantiateReference(subcomponent, identifier, modpath, coords, overrides, metadata, cb) {
			return subcomponent.doesMatchOrHostComponent(this, (err, answer) => {
				if (err) return cb(err);
				if (answer) return cb(/* @__PURE__ */ new Error("You cannot place a component within itself"));
				let fullpath;
				const isExternalModule = modpath[0] !== ".";
				if (!isExternalModule) fullpath = path$4.join(this.project.getFolder(), modpath);
				else fullpath = modpath;
				const file = isExternalModule ? PseudoFile$1.upsert({ relpath: modpath }) : this.project.upsertFile({
					relpath: modpath,
					folder: this.project.getFolder()
				});
				const mod = ModuleWrapper$2.upsert({
					uid: fullpath,
					isExternalModule,
					component: subcomponent,
					file
				});
				const title = subcomponent.getTitle();
				return mod.moduleAsMana(this.getRelpath(), identifier, title, (err$1, manaForWrapperElement) => {
					if (err$1) return cb(err$1);
					if (!manaForWrapperElement) return cb(/* @__PURE__ */ new Error(`Module ${fullpath} could not be imported`));
					this.instantiateManaInBytecode(manaForWrapperElement, this.getReifiedBytecode(), overrides, coords);
					return cb(null, manaForWrapperElement);
				});
			});
		}
		getTitle() {
			return pascalcase(this.getSceneName());
		}
		getAbspath() {
			return path$4.join(this.project.getFolder(), this.getRelpath());
		}
		fetchTimelinePropertyFromComponentElement(mana, propertyName) {
			if (!mana.elementName) return;
			if (!mana.elementName.template) return;
			if (!mana.elementName.template.attributes) return;
			if (!mana.elementName.template.elementName) return;
			return TimelineProperty$1.getComputedValue(mana.elementName.template.attributes[HAIKU_ID_ATTRIBUTE], mana.elementName.template.elementName, propertyName, this.getCurrentTimelineName(), this.getCurrentTimelineTime(), 0, mana.elementName, mana.__memory && mana.__memory.subcomponent, mana.__memory && mana.__memory.subcomponent && mana.__memory.subcomponent.state);
		}
		instantiateManaInBytecode(mana, bytecode, overrides, coords) {
			const { hash } = this.getInsertionPointInfo(0);
			const timelineName = this.getInstantiationTimelineName();
			const timelineTime = this.getInstantiationTimelineTime();
			const timelines = Template$1.prepareManaAndBuildTimelinesObject(mana, hash, timelineName, timelineTime, { doHashWork: true });
			const componentId = mana.attributes[HAIKU_ID_ATTRIBUTE];
			logger$4.info(`[active component (${this.project.getAlias()})] instantiatee (mana) ${componentId} via ${hash}`);
			bytecode.template.children.unshift(mana);
			this.mutateInstantiateeDisplaySettings(componentId, timelines, timelineName, timelineTime, mana, coords);
			Bytecode$1.applyOverrides(overrides, timelines, timelineName, `haiku:${componentId}`, timelineTime);
			Bytecode$1.mergeTimelines(bytecode.timelines, timelines);
			this.zMoveToFrontImpl(bytecode, componentId, timelineName, timelineTime);
			return componentId;
		}
		/**
		* @method instantiateMana
		* @description Given a chunk of 'mana' data, instantiate that 'mana' into
		* our component's template object
		* @param mana {Object} Chunk of 'mana' data to instantiate
		* @param overrides {Object} Overrides to apply to the timeline [unused]
		* @param metadata {Object} Signal metadata
		* @param cb {Function}
		*/
		instantiateMana(mana, bytecode, coords, metadata, cb) {
			this.instantiateManaInBytecode(mana, bytecode, {}, coords);
			return cb(null, mana);
		}
		getInstantiationTimelineName() {
			return Timeline$1.DEFAULT_NAME;
		}
		getInstantiationTimelineTime() {
			return 0;
		}
		getMergeDesignTimelineName() {
			return Timeline$1.DEFAULT_NAME;
		}
		getMergeDesignTimelineTime() {
			return 0;
		}
		createInTransitionInTimelineObject(timelineObj, propertyName, fromTime, fromValue, toTime, toValue, curveName) {
			if (!timelineObj[propertyName]) timelineObj[propertyName] = {};
			if (!timelineObj[propertyName][fromTime]) timelineObj[propertyName][fromTime] = {};
			timelineObj[propertyName][fromTime].value = fromValue;
			if (curveName) timelineObj[propertyName][fromTime].curve = curveName;
			if (!timelineObj[propertyName][toTime]) timelineObj[propertyName][toTime] = {};
			timelineObj[propertyName][toTime].value = toValue;
		}
		mutateInstantiateeDisplaySettings(componentId, timelinesObject, timelineName, timelineTime, templateObject, maybeCoords) {
			const instance = this.$instance;
			if (instance) {
				instance.context.getContainer(true);
				instance.render();
			}
			const insertedTimeline = timelinesObject[this.getCurrentTimelineName()][`haiku:${componentId}`] || {};
			if (timelineTime > 0) this.createInTransitionInTimelineObject(insertedTimeline, "opacity", 0, 0, timelineTime, 1, null);
			if (templateObject.elementName && typeof templateObject.elementName === "object") {
				if (this.fetchTimelinePropertyFromComponentElement(templateObject, "sizeAbsolute.x")) {
					if (!insertedTimeline["sizeAbsolute.x"]) insertedTimeline["sizeAbsolute.x"] = {};
					if (!insertedTimeline["sizeAbsolute.x"][timelineTime]) insertedTimeline["sizeAbsolute.x"][timelineTime] = {};
					insertedTimeline["sizeAbsolute.x"][timelineTime].value = Layout3D.AUTO_SIZING_TOKEN;
					if (!insertedTimeline["sizeMode.x"]) insertedTimeline["sizeMode.x"] = {};
					if (!insertedTimeline["sizeMode.x"][timelineTime]) insertedTimeline["sizeMode.x"][timelineTime] = {};
					insertedTimeline["sizeMode.x"][timelineTime].value = Layout3D.SIZE_ABSOLUTE;
				}
				if (this.fetchTimelinePropertyFromComponentElement(templateObject, "sizeAbsolute.y")) {
					if (!insertedTimeline["sizeAbsolute.y"]) insertedTimeline["sizeAbsolute.y"] = {};
					if (!insertedTimeline["sizeAbsolute.y"][timelineTime]) insertedTimeline["sizeAbsolute.y"][timelineTime] = {};
					insertedTimeline["sizeAbsolute.y"][timelineTime].value = Layout3D.AUTO_SIZING_TOKEN;
					if (!insertedTimeline["sizeMode.y"]) insertedTimeline["sizeMode.y"] = {};
					if (!insertedTimeline["sizeMode.y"][timelineTime]) insertedTimeline["sizeMode.y"][timelineTime] = {};
					insertedTimeline["sizeMode.y"][timelineTime].value = Layout3D.SIZE_ABSOLUTE;
				}
			}
			if (maybeCoords !== void 0 && maybeCoords !== null) {
				const propertyGroup = {};
				const { width, height } = this.getContextSizeActual(timelineName, timelineTime);
				if (maybeCoords && typeof maybeCoords.x === "number") propertyGroup["translation.x"] = maybeCoords.x;
				else propertyGroup["translation.x"] = width / 2;
				if (maybeCoords && typeof maybeCoords.y === "number") propertyGroup["translation.y"] = maybeCoords.y;
				else propertyGroup["translation.y"] = height / 2;
				TimelineProperty$1.addPropertyGroup(timelinesObject, timelineName, componentId, Element$1.safeElementName(templateObject), propertyGroup, timelineTime);
			}
		}
		/**
		* @method unconglomerateComponent
		*/
		unconglomerateComponent(componentIds, name, size, translation, coords, propertiesSerial, options = {}, metadata, cb) {
			Lock$2.request(Lock$2.LOCKS.ActiveComponentWork, false, (release) => this.project.updateHook("unconglomerateComponent", this.getRelpath(), componentIds, name, size, translation, coords, propertiesSerial, options, metadata, (fire) => {
				this.fetchActiveBytecodeFile().updateInMemoryHotModule(this.snapshots.pop(), () => {
					this.project.deleteSceneByName(name, () => {
						release();
						this.moduleSync(() => {
							fire();
							cb();
						});
					});
				});
			}));
		}
		/**
		* @method conglomerateComponent
		* @description Given a list of existing component ids on stage, create a component
		* from them and place the result on the stage
		*/
		conglomerateComponent(componentIds, name, size, translation, coords, propertiesSerial, options = {}, metadata, cb) {
			const properties = Bytecode$1.unserializeValue(propertiesSerial, (ref) => {
				return this.evaluateReference(ref);
			});
			return Lock$2.request(Lock$2.LOCKS.ActiveComponentWork, false, (release) => {
				return this.pushBytecodeSnapshot(() => this.project.updateHook("conglomerateComponent", this.getRelpath(), componentIds, name, size, translation, coords, Bytecode$1.serializeValue(properties), options, metadata, (fire) => {
					const finish = (err, ac) => {
						if (err) {
							release();
							logger$4.error(`[active component (${this.project.getAlias()})]`, err);
							return cb(err);
						}
						return this.reload({
							hardReload: true,
							clearCacheOptions: { doClearEntityCaches: true }
						}, null, () => {
							release();
							fire();
							return cb(null, ac);
						});
					};
					return this.conglomerateComponentActual(componentIds, name, size, translation, coords, properties, options, metadata, finish);
				}));
			});
		}
		conglomerateComponentActual(ids, name, size, translation, coords, properties, options = {}, metadata, cb) {
			let activeComponentToReturn;
			return this.performComponentWork((hostBytecode, hostTemplate, done$1) => {
				return this.project.upsertSceneByName(name, (err, newActiveComponent) => {
					if (err) return done$1(err);
					activeComponentToReturn = newActiveComponent;
					const newBytecode = newActiveComponent.getReifiedBytecode();
					newActiveComponent.upsertProperties(newBytecode, newBytecode.template.attributes[HAIKU_ID_ATTRIBUTE], newActiveComponent.getInstantiationTimelineName(), newActiveComponent.getInstantiationTimelineTime(), lodash$1.assign({
						"sizeAbsolute.x": size.x,
						"sizeAbsolute.y": size.y
					}), "merge");
					ids.forEach((id$1) => {
						const element = this.findElementByComponentId(id$1);
						if (!element) throw new Error(`Cannot relocate element ${id$1}`);
						const elementBytecode = element.getQualifiedBytecode();
						const elementOffset = {
							"translation.x": translation.x,
							"translation.y": translation.y
						};
						const timelineName = this.getCurrentTimelineName();
						const selector = Template$1.buildHaikuIdSelector(elementBytecode.template.attributes[HAIKU_ID_ATTRIBUTE]);
						if (!elementBytecode.timelines[timelineName][selector]) elementBytecode.timelines[timelineName][selector] = {};
						for (const propertyName in elementOffset) {
							const offsetValue = elementOffset[propertyName];
							if (!elementBytecode.timelines[timelineName][selector][propertyName]) elementBytecode.timelines[timelineName][selector][propertyName] = {};
							if (!elementBytecode.timelines[timelineName][selector][propertyName][0]) elementBytecode.timelines[timelineName][selector][propertyName][0] = {};
							for (const keyframeMs in elementBytecode.timelines[timelineName][selector][propertyName]) {
								const existingValue = elementBytecode.timelines[timelineName][selector][propertyName][keyframeMs].value || 0;
								const existingCurve = elementBytecode.timelines[timelineName][selector][propertyName][keyframeMs].curve;
								if (typeof existingValue === "function") continue;
								const updatedValue = isNumeric(existingValue) ? existingValue - offsetValue : offsetValue;
								elementBytecode.timelines[timelineName][selector][propertyName][keyframeMs] = { value: updatedValue };
								if (existingCurve) elementBytecode.timelines[timelineName][selector][propertyName][keyframeMs].curve = existingCurve;
							}
						}
						newActiveComponent.instantiateBytecode(elementBytecode);
						this.deleteElementImpl(hostTemplate, id$1);
					});
					return newActiveComponent.reload({
						hardReload: true,
						clearCacheOptions: { doClearEntityCaches: true }
					}, {}, () => {
						newActiveComponent.handleUpdatedBytecode(newBytecode);
						const relpath = `./${newActiveComponent.getRelpath()}`;
						const identifier = ModuleWrapper$2.modulePathToIdentifierName(relpath);
						if (options.skipInstantiateInHost) return done$1();
						return this.instantiateReference(newActiveComponent, identifier, relpath, coords, properties, metadata, (err$1) => {
							if (err$1) return done$1(err$1);
							const insertion = this.getReifiedBytecode().template.children[0];
							this.upsertProperties(this.getReifiedBytecode(), insertion.attributes[HAIKU_ID_ATTRIBUTE], this.getInstantiationTimelineName(), 0, { playback: PlaybackFlag.LOOP }, "merge");
							return done$1();
						});
					});
				});
			}, (err) => {
				if (err) return cb(err);
				return cb(null, activeComponentToReturn);
			});
		}
		instantiateBytecode(incomingBytecode) {
			const timelineName = this.getInstantiationTimelineName();
			const timelineTime = this.getInstantiationTimelineTime();
			const existingBytecode = this.getReifiedBytecode();
			const existingTemplate = existingBytecode.template;
			const { hash } = this.getInsertionPointInfo(0);
			Bytecode$1.padIds(incomingBytecode, (oldId) => {
				return Template$1.getHash(`${oldId}-${hash}`, 12);
			});
			const componentId = incomingBytecode.template.attributes[HAIKU_ID_ATTRIBUTE];
			logger$4.info(`[active component (${this.project.getAlias()})] instantiatee (bytecode) ${componentId} via ${hash}`);
			existingTemplate.children.unshift(incomingBytecode.template);
			this.mutateInstantiateeDisplaySettings(componentId, incomingBytecode.timelines, timelineName, timelineTime, incomingBytecode.template, null);
			Bytecode$1.mergeBytecodeControlStructures(existingBytecode, incomingBytecode);
		}
		/**
		* @method instantiateComponent
		* @description Given a relative path to an instantiable asset (which could be
		* an SVG or a component module, instantiate that component at the given position.
		* @param relpath {String} Relpath to an instantiable asset
		* @param coords {Object} Optional translation coords of the instantiatee
		* @param metadata {Object} Signal metadata
		* @param cb {Function}
		*/
		instantiateComponent(relpath, coords, metadata, cb) {
			return Lock$2.request(Lock$2.LOCKS.ActiveComponentWork, false, (release) => {
				return this.project.updateHook("instantiateComponent", this.getRelpath(), relpath, coords, metadata, (fire) => {
					const finish = (err, manaForWrapperElement) => {
						if (err) {
							release();
							logger$4.error(`[active component (${this.project.getAlias()})]`, err);
							return cb(err);
						}
						return this.reload({
							hardReload: true,
							clearCacheOptions: { doClearEntityCaches: true }
						}, null, () => {
							release();
							fire(null, manaForWrapperElement);
							cb(null, manaForWrapperElement);
							return this.selectElement(manaForWrapperElement.attributes[HAIKU_ID_ATTRIBUTE], metadata, () => {});
						});
					};
					return this.performComponentWork((bytecode, mana, done$1) => {
						if (ModuleWrapper$2.doesRelpathLookLikeInstalledComponent(relpath)) {
							const installedComponent = InstalledComponent$1.upsert({ modpath: relpath });
							return this.instantiateReference(installedComponent, installedComponent.getIdentifier(), relpath, coords, {
								"origin.x": .5,
								"origin.y": .5
							}, metadata, done$1);
						}
						if (ModuleWrapper$2.doesRelpathLookLikeLocalComponent(relpath)) return this.project.findActiveComponentBySource(relpath, (err, subcomponent) => {
							if (!err && subcomponent) return subcomponent.moduleReload("basicReload", () => {
								const localComponentIdentifier = ModuleWrapper$2.modulePathToIdentifierName(relpath);
								return this.instantiateReference(subcomponent, localComponentIdentifier, relpath, coords, {
									"origin.x": .5,
									"origin.y": .5
								}, metadata, done$1);
							});
							return done$1(/* @__PURE__ */ new Error(`Cannot find component ${relpath}`));
						});
						if (ModuleWrapper$2.doesRelpathLookLikeSVGDesign(relpath)) return File$2.readMana(this.project.getFolder(), relpath, (err, mana$1) => {
							if (err) return done$1(err);
							Template$1.fixManaSourceAttribute(mana$1, relpath);
							return this.instantiateMana(mana$1, bytecode, coords, metadata, done$1);
						});
						if (Asset$2.isImage(relpath)) {
							const imageComponent = ImageComponent$1.upsert({
								project: this.project,
								relpath
							});
							return imageComponent.queryImageSize((err, size) => {
								if (err) return done$1(err);
								const { width, height } = size;
								return this.instantiateReference(imageComponent, imageComponent.identifier, imageComponent.modpath, coords, {
									"origin.x": .5,
									"origin.y": .5,
									"href": imageComponent.getLocalHref(),
									width,
									height
								}, metadata, done$1);
							});
						}
						return done$1(/* @__PURE__ */ new Error(`Problem instantiating ${relpath}`));
					}, finish);
				});
			});
		}
		deleteComponents(componentIds, metadata, cb) {
			return Lock$2.request(Lock$2.LOCKS.ActiveComponentWork, false, (release) => {
				this.project.updateHook("deleteComponents", this.getRelpath(), componentIds, metadata, (fire) => {
					return this.performComponentWork((bytecode, mana, done$1) => {
						componentIds.forEach((componentId) => {
							const element = this.findElementByComponentId(componentId);
							if (element) element.remove();
							this.deleteElementImpl(mana, componentId);
						});
						done$1();
					}, (err) => {
						if (err) {
							release();
							logger$4.error(`[active component (${this.project.getAlias()})]`, err);
							return cb(err);
						}
						return this.reload({
							hardReload: true,
							clearCacheOptions: { doClearEntityCaches: true }
						}, null, () => {
							release();
							fire();
							return cb();
						});
					});
				});
			});
		}
		deleteElementImpl(mana, componentId) {
			Template$1.visitManaTree(mana, (elementName, attributes, children, node, locator, parent, index) => {
				if (!attributes) return null;
				if (!attributes[HAIKU_ID_ATTRIBUTE]) return null;
				if (componentId !== attributes[HAIKU_ID_ATTRIBUTE]) return null;
				if (parent) parent.children.splice(index, 1);
				else {
					mana.elementName = "div";
					mana.attributes = {};
					mana.children = [];
				}
			});
		}
		mergePrimitiveWithOverrides(primitive, overrides, cb) {
			return this.performComponentWork((bytecode, template, done$1) => {
				Template$1.visit(template, (node) => {
					if (node.attributes[HAIKU_SOURCE_ATTRIBUTE] !== primitive.getRequirePath()) return;
					const timelineName = this.getMergeDesignTimelineName();
					const timelineTime = this.getMergeDesignTimelineTime();
					const haikuId = node.attributes[HAIKU_ID_ATTRIBUTE];
					const timelineObj = bytecode.timelines && bytecode.timelines[timelineName] && bytecode.timelines[timelineName][`haiku:${haikuId}`];
					if (timelineObj) for (const propertyName in timelineObj) {
						const keyframeObj = timelineObj[propertyName][timelineTime];
						if (!keyframeObj) continue;
						if (keyframeObj.edited) continue;
						const overrideVal = overrides[propertyName];
						if (overrideVal !== void 0) keyframeObj.value = overrideVal;
					}
				});
				done$1();
			}, cb);
		}
		removeChildContentFromBytecode(bytecode, mana) {
			const removedOutputs = {};
			Template$1.visit(mana, (node, parent, index, depth, address) => {
				if (node === mana) return;
				const haikuId = node.attributes && node.attributes[HAIKU_ID_ATTRIBUTE];
				if (!haikuId) return;
				removedOutputs[haikuId] = {
					treeInfo: {
						index,
						depth,
						address
					},
					templateNode: node,
					eventHandlers: {},
					timelines: {}
				};
				const haikuSelector = `haiku:${haikuId}`;
				if (bytecode.eventHandlers) {
					removedOutputs[haikuId].eventHandlers = bytecode.eventHandlers[haikuSelector];
					delete bytecode.eventHandlers[haikuSelector];
				}
				if (bytecode.timelines) for (const timelineName in bytecode.timelines) {
					removedOutputs[haikuId].timelines[timelineName] = bytecode.timelines[timelineName][haikuSelector];
					delete bytecode.timelines[timelineName][haikuSelector];
				}
			});
			mana.children.splice(0);
			return removedOutputs;
		}
		findEquivalentNode(node, { index, depth, address }, template) {
			let foundNode;
			const ourDomId = node.attributes && node.attributes.id;
			Template$1.visit(template, (desc, parent, theirIndex, theirDepth, theirAddress) => {
				if (foundNode) return;
				const theirDomId = desc.attributes && desc.attributes.id;
				if (address === theirAddress && node.elementName === desc.elementName && ourDomId === theirDomId) foundNode = desc;
			});
			return foundNode;
		}
		mergeRemovedOutputs(bytecode, subtemplate, removals) {
			if (!bytecode.timelines) return;
			for (const haikuId in removals) {
				const { treeInfo, templateNode, timelines } = removals[haikuId];
				const equivalent = this.findEquivalentNode(templateNode, treeInfo, subtemplate);
				if (!equivalent) continue;
				const equivalentId = equivalent.attributes && equivalent.attributes[HAIKU_ID_ATTRIBUTE];
				if (!equivalentId) continue;
				equivalent.__replacee = templateNode;
				const equivalentSelector = `haiku:${equivalentId}`;
				for (const timelineName in bytecode.timelines) {
					if (!timelines[timelineName]) continue;
					if (!bytecode.timelines[timelineName][equivalentSelector]) continue;
					for (const propertyName in timelines[timelineName]) for (const keyframeMs in timelines[timelineName][propertyName]) {
						const sourceObj = timelines[timelineName][propertyName][keyframeMs];
						if (!sourceObj.edited) continue;
						if (!bytecode.timelines[timelineName][equivalentSelector][propertyName]) bytecode.timelines[timelineName][equivalentSelector][propertyName] = {};
						if (!bytecode.timelines[timelineName][equivalentSelector][propertyName][keyframeMs]) bytecode.timelines[timelineName][equivalentSelector][propertyName][keyframeMs] = {};
						const targetObj = bytecode.timelines[timelineName][equivalentSelector][propertyName][keyframeMs];
						if (sourceObj.curve) targetObj.curve = sourceObj.curve;
						if (sourceObj.value !== void 0) targetObj.value = sourceObj.value;
						targetObj.edited = true;
					}
				}
			}
		}
		mergeMana(existingBytecode, manaIncoming, index, { mergeRemovedOutputs = true }) {
			let numMatchingNodes = 0;
			const timelineName = this.getMergeDesignTimelineName();
			const timelineTime = this.getMergeDesignTimelineTime();
			Template$1.visitWithoutDescendingIntoSubcomponents(existingBytecode.template, (existingNode) => {
				if (!existingNode.attributes[HAIKU_SOURCE_ATTRIBUTE] || !manaIncoming.attributes[HAIKU_SOURCE_ATTRIBUTE] || Template$1.normalizePath(existingNode.attributes[HAIKU_SOURCE_ATTRIBUTE]) !== Template$1.normalizePath(manaIncoming.attributes[HAIKU_SOURCE_ATTRIBUTE])) return;
				const safeIncoming = Template$1.clone({}, manaIncoming);
				const removedOutputs = this.removeChildContentFromBytecode(existingBytecode, existingNode);
				const { hash } = this.getInsertionPointInfo(`${index}-${numMatchingNodes++}`);
				const timelinesObject = Template$1.prepareManaAndBuildTimelinesObject(safeIncoming, hash, timelineName, timelineTime, { doHashWork: true });
				const existingSelector = `haiku:${existingNode.attributes[HAIKU_ID_ATTRIBUTE]}`;
				const incomingSelector = `haiku:${safeIncoming.attributes[HAIKU_ID_ATTRIBUTE]}`;
				timelinesObject[timelineName][existingSelector] = timelinesObject[timelineName][incomingSelector];
				delete timelinesObject[timelineName][incomingSelector];
				for (let i$1 = 0; i$1 < safeIncoming.children.length; i$1++) {
					const incomingChild = safeIncoming.children[i$1];
					existingNode.children.push(incomingChild);
				}
				Bytecode$1.mergeTimelines(existingBytecode.timelines, timelinesObject);
				if (mergeRemovedOutputs) this.mergeRemovedOutputs(existingBytecode, existingNode, removedOutputs);
			});
		}
		mergeDesignFiles(designs, cb) {
			return this.performComponentWork((bytecode, template, done$1) => {
				return this.mergeDesignFilesImpl(designs, bytecode, {}, done$1);
			}, cb);
		}
		mergeDesignFilesImpl(designs, bytecode, { mergeRemovedOutputs = true }, cb) {
			const designsAsArray = Object.keys(designs).sort((a, b) => {
				if (a < b) return -1;
				if (a > b) return 1;
				return 0;
			});
			if (!designsAsArray.length) return cb();
			const usedSources = /* @__PURE__ */ new Set();
			Template$1.visitWithoutDescendingIntoSubcomponents(bytecode.template, (existingNode) => {
				if (existingNode.attributes[HAIKU_SOURCE_ATTRIBUTE]) usedSources.add(existingNode.attributes[HAIKU_SOURCE_ATTRIBUTE]);
			});
			return async$1.eachOfSeries(designsAsArray, (relpath, index, next) => {
				if (ModuleWrapper$2.doesRelpathLookLikeSVGDesign(relpath) && usedSources.has(path$4.posix.normalize(relpath))) return File$2.readMana(this.project.getFolder(), relpath, (err, mana) => {
					if (err || !mana) return next();
					Template$1.fixManaSourceAttribute(mana, relpath);
					this.mergeMana(bytecode, mana, index, { mergeRemovedOutputs });
					return next();
				});
				return next();
			}, (err, out$1) => {
				if (err) return cb(err);
				const bytecode$1 = this.getReifiedBytecode();
				this.project.getAllActiveComponents().forEach((ac) => {
					if (!ac.$instance) return;
					ac.$instance.visitGuestHierarchy((instance) => {
						if (this.doesManageCoreInstance(instance)) {
							const safe = ActiveComponent$2.memorySafeBytecode(bytecode$1, instance);
							if (instance.node.__memory && instance.node.__memory.parent) Object.assign(instance.node.__memory.parent.elementName, safe);
							Object.assign(instance.bytecode, safe);
						}
					});
				});
				return cb(null, out$1);
			});
		}
		/**
		* @method pasteThings
		* @description Flexibly paste some content into the component. Usually the thing pasted is going to be a
		* component, but this could theoretically handle any kind of 'pasteable' content.
		* @param pasteablesSerial {Array.<{}>} - Content of the thing to paste into the component.
		* @param options {{skipHashPadding: boolean}} - Optional object containing information about _how_ to paste
		* @param metadata {Object}
		* @param cb {Function}
		*/
		pasteThings(pasteablesSerial, options, metadata, cb) {
			const pasteables = pasteablesSerial.map((pasteableSerial) => Bytecode$1.unserializeValue(pasteableSerial, (ref) => {
				return this.evaluateReference(ref);
			}));
			return Lock$2.request(Lock$2.LOCKS.ActiveComponentWork, false, (release) => {
				return this.project.updateHook("pasteThings", this.getRelpath(), pasteablesSerial, options, metadata, (fire) => {
					return this.performComponentWork((bytecode, mana, done$1) => {
						const haikuIds = [];
						return async$1.eachSeries(pasteables, (pasteable, next) => {
							if (pasteable.kind === "bytecode") {
								const nested = pasteable.data && pasteable.data.template && pasteable.data.template.elementName;
								if (typeof nested === "object") {
									const source = pasteable.data.template.attributes[HAIKU_SOURCE_ATTRIBUTE];
									const identifier = pasteable.data.template.attributes[HAIKU_VAR_ATTRIBUTE];
									const scenename = this.project.relpathToSceneName(source);
									nested.__reference = ModuleWrapper$2.buildReference(ModuleWrapper$2.REF_TYPES.COMPONENT, Template$1.normalizePath(`./${this.getRelpath()}`), Template$1.normalizePathOfPossiblyExternalModule(source), identifier);
									return this.project.findOrCreateActiveComponent(scenename, (err, ac) => {
										if (err) return next(err);
										return ac.moduleReload("basicReload", () => {
											ac.doesMatchOrHostComponent(this, (_$2, answer) => {
												if (!answer) {
													lodash$1.assign(nested, ac.getReifiedBytecode());
													haikuIds.push(this.pasteBytecodeImpl(bytecode, pasteable.data, options));
												}
												return next();
											});
										});
									});
								}
								haikuIds.push(this.pasteBytecodeImpl(bytecode, pasteable.data, options));
								return next();
							}
							logger$4.warn(`[active component (${this.project.getAlias()})] cannot paste ${pasteable.kind}`);
							return next();
						}, (err) => {
							return done$1(err, { haikuIds });
						});
					}, (err, { haikuIds }) => {
						if (err) {
							release();
							logger$4.error(`[active component (${this.project.getAlias()})]`, err);
							return cb(err);
						}
						return this.reload({
							hardReload: true,
							clearCacheOptions: { doClearEntityCaches: true }
						}, null, () => {
							release();
							fire(null, { haikuIds });
							return cb(null, { haikuIds });
						});
					});
				});
			});
		}
		pasteBytecodeImpl(ourBytecode, theirBytecode, { skipHashPadding = false }) {
			theirBytecode = Bytecode$1.clone(theirBytecode);
			if (!skipHashPadding) {
				const { hash } = this.getInsertionPointInfo(0);
				Bytecode$1.padIds(theirBytecode, (oldId) => {
					return `${oldId}-${hash}`;
				});
			}
			const haikuId = theirBytecode.template.attributes["haiku-id"];
			Bytecode$1.pasteBytecode(ourBytecode, theirBytecode);
			logger$4.info(`[active component (${this.project.getAlias()})] pastee (bytecode) ${haikuId}`);
			this.zMoveToFrontImpl(ourBytecode, haikuId, "Default", 0);
			return haikuId;
		}
		evaluateReference(__reference) {
			const modref = ModuleWrapper$2.parseReference(__reference);
			if (modref && modref.type && modref.type === ModuleWrapper$2.REF_TYPES.COMPONENT) {
				const ac = this.project.findActiveComponentBySourceIfPresent(modref.source);
				if (ac) {
					const bytecode = ac.getReifiedBytecode();
					return lodash$1.assign({ __reference }, bytecode);
				}
			}
			return __reference;
		}
		splitSelectedKeyframes(metadata) {
			this.getSelectedKeyframes().forEach((keyframe) => keyframe.removeCurve(metadata));
		}
		deleteSelectedKeyframes(metadata) {
			const keyframes = this.getSelectedKeyframes();
			if (Keyframe$1.groupIsSingleTween(keyframes)) return keyframes[0].removeCurve(metadata);
			keyframes.forEach((keyframe) => {
				if (!keyframe.isTransitionSegment()) {
					const prev = keyframe.prev();
					if (prev && prev.isTransitionSegment()) prev.removeCurve(metadata);
				}
				keyframe.delete(metadata);
			});
		}
		joinSelectedKeyframes(curveName, metadata) {
			this.getSelectedKeyframes().forEach((keyframe) => {
				if (keyframe.next() && keyframe.isSelectedBody()) keyframe.addCurve(curveName, metadata);
			});
		}
		changeCurveOnSelectedKeyframes(curveName, metadata) {
			this.getSelectedKeyframes().forEach((keyframe) => {
				if (keyframe.next() && keyframe.isSelectedBody()) keyframe.changeCurve(curveName, metadata);
			});
		}
		getFirstSelectedCurve() {
			const selectedKeyframeWithCurve = this.getSelectedKeyframes().find((keyframe) => keyframe.isSelectedBody());
			return selectedKeyframeWithCurve ? selectedKeyframeWithCurve.getCurve() : null;
		}
		dragStartSelectedKeyframes(dragData, referenceKeyframe) {
			const keyframes = this.getSelectedKeyframes();
			if (referenceKeyframe && Keyframe$1.groupIsSingleTween(keyframes)) referenceKeyframe.dragStart(dragData);
			else keyframes.forEach((keyframe) => keyframe.dragStart(dragData));
		}
		dragStopSelectedKeyframes() {
			this.getSelectedKeyframes().forEach((keyframe) => keyframe.dragStop());
			this.commitAccumulatedKeyframeMovesDebounced();
		}
		dragSelectedKeyframes(pxpf, mspf, dragData, metadata, referenceKeyframe) {
			const keyframes = this.getSelectedKeyframes();
			if (referenceKeyframe && Keyframe$1.groupIsSingleTween(keyframes)) referenceKeyframe.drag(pxpf, mspf, dragData, metadata);
			else keyframes.forEach((keyframe) => keyframe.drag(pxpf, mspf, dragData, metadata));
		}
		elementHasTransitionOrExpression(elementId) {
			const bytecode = this.getReifiedBytecode();
			const timelineName = this.getCurrentTimelineName();
			const componentId = `haiku:${elementId}`;
			if (componentId in bytecode.timelines[timelineName]) {
				const componentTimeline = bytecode.timelines[timelineName][componentId];
				for (const propertyName in componentTimeline) {
					if (!LAYOUT_3D_SCHEMA[propertyName]) continue;
					const propertyTimeline = componentTimeline[propertyName];
					if (propertyTimeline instanceof Object) {
						const keys$1 = Object.keys(propertyTimeline);
						const values = keys$1.map((key) => propertyTimeline[key].value);
						if (keys$1.length > 1) {
							if (values.some((value) => value !== values[0])) return true;
						}
						if (values.some((value) => typeof value === "function")) return true;
					}
				}
			}
			return false;
		}
		snapshotKeyframeUpdates(keyframeUpdates) {
			const bytecode = this.getReifiedBytecode();
			const updates = {};
			for (const timelineName in keyframeUpdates) {
				updates[timelineName] = {};
				for (const componentId in keyframeUpdates[timelineName]) {
					const selector = Template$1.buildHaikuIdSelector(componentId);
					updates[timelineName][componentId] = {};
					for (const propertyName in keyframeUpdates[timelineName][componentId]) {
						updates[timelineName][componentId][propertyName] = {};
						for (const keyframeMs in keyframeUpdates[timelineName][componentId][propertyName]) {
							if (!bytecode.timelines[timelineName] || !bytecode.timelines[timelineName][selector] || !bytecode.timelines[timelineName][selector][propertyName] || !bytecode.timelines[timelineName][selector][propertyName][keyframeMs]) {
								if (Number(keyframeMs) === 0) {
									const elementName = this.getElementNameOfComponentId(componentId);
									updates[timelineName][componentId][propertyName][keyframeMs] = { value: TimelineProperty$1.getFallbackValue(elementName, propertyName) };
								} else updates[timelineName][componentId][propertyName][keyframeMs] = null;
								continue;
							}
							const keyfVal = typeof bytecode.timelines[timelineName][selector][propertyName][keyframeMs].value === "function" ? bytecode.timelines[timelineName][selector][propertyName][keyframeMs].value : lodash$1.clone(bytecode.timelines[timelineName][selector][propertyName][keyframeMs].value);
							updates[timelineName][componentId][propertyName][keyframeMs] = { value: keyfVal };
						}
					}
				}
			}
			return updates;
		}
		gatherZIndexKeyframeMoves(timelineName) {
			const keyframeMovesDescriptor = { [timelineName]: {} };
			this.getReifiedTemplate().children.forEach((child) => {
				keyframeMovesDescriptor[timelineName][child.attributes[HAIKU_ID_ATTRIBUTE]] = { "style.zIndex": {} };
			});
			return this.snapshotKeyframeMoves(keyframeMovesDescriptor);
		}
		gatherKeyframeMoves(componentId, timelineName, propertyNames) {
			const keyframeMovesDescriptor = {};
			keyframeMovesDescriptor[timelineName] = {};
			keyframeMovesDescriptor[timelineName][componentId] = {};
			propertyNames.forEach((propertyName) => {
				keyframeMovesDescriptor[timelineName][componentId][propertyName] = {};
			});
			return this.snapshotKeyframeMoves(keyframeMovesDescriptor);
		}
		snapshotKeyframeMoves(keyframeMovesDescriptor) {
			const moves = {};
			for (const timelineName in keyframeMovesDescriptor) {
				moves[timelineName] = {};
				for (const componentId in keyframeMovesDescriptor[timelineName]) {
					moves[timelineName][componentId] = {};
					const propertyNames = Object.keys(keyframeMovesDescriptor[timelineName][componentId]);
					const keyframesObj = this.getKeyframesObjectForPropertyNames(timelineName, componentId, propertyNames);
					for (const propertyName in keyframesObj) {
						const propertyObj = keyframesObj[propertyName];
						moves[timelineName][componentId][propertyName] = {};
						for (const keyframeMs in propertyObj) {
							const keyfObj = propertyObj[keyframeMs];
							const keyfVal = typeof keyfObj.value === "function" ? keyfObj.value : lodash$1.clone(keyfObj.value);
							moves[timelineName][componentId][propertyName][keyframeMs] = { value: keyfVal };
							if (keyfObj.curve) moves[timelineName][componentId][propertyName][keyframeMs].curve = keyfObj.curve;
							if (keyfObj.edited) moves[timelineName][componentId][propertyName][keyframeMs].edited = true;
						}
					}
				}
			}
			return moves;
		}
		commitAccumulatedKeyframeMoves() {
			this.moveKeyframes(Keyframe$1.buildKeyframeMoves({ component: this }, true), this.project.getMetadata(), () => {});
		}
		getMount() {
			return this.mount;
		}
		getArtboard() {
			return this.artboard;
		}
		getSelectionMarquee() {
			return this.marquee;
		}
		/** ------------ */
		/** ------------ */
		/** ------------ */
		reload(reloadOptions, instanceConfig, cb) {
			const runReload = (done$1) => {
				if (reloadOptions.hardReload) return this.hardReload(reloadOptions, instanceConfig, done$1);
				return this.softReload(reloadOptions, instanceConfig, done$1);
			};
			if (reloadOptions.skipReloadLock) return runReload(cb);
			return Lock$2.request(Lock$2.LOCKS.ActiveComponentReload, false, (release) => {
				const finish = (err) => {
					release();
					if (err) return cb(err);
					this.emit("update", "reloaded", reloadOptions.hardReload ? "hard" : "soft");
					return cb();
				};
				return runReload(finish);
			});
		}
		softReload(reloadOptions, instanceConfig, cb) {
			if (!reloadOptions.superficial) this.clearCaches(reloadOptions.clearCacheOptions);
			if (experimentIsEnabled$1(Experiment$1.WarnOnUndefinedStateVariables)) this.emitDebouncedCheckSustainedWarning();
			if (!reloadOptions.hardReload) {
				if (reloadOptions.forceFlush) this.forceFlush();
				else if (reloadOptions.hotComponents) this.addHotComponents(reloadOptions.hotComponents);
			}
			return cb();
		}
		hardReload(reloadOptions, instanceConfig, finish) {
			const timelineTimeBeforeReload = this.getCurrentTimelineTime() || 0;
			return async$1.series([
				(cb) => {
					if (this.$instance) this.$instance.context.clock.stop();
					return cb();
				},
				(cb) => {
					if (!reloadOptions.moduleReloadMethod) return cb();
					return this.moduleCreate(reloadOptions.moduleReloadMethod, instanceConfig, cb);
				},
				(cb) => {
					return this.softReload(reloadOptions, instanceConfig, cb);
				},
				(cb) => {
					if (typeof reloadOptions.customRehydrate === "function") reloadOptions.customRehydrate(reloadOptions);
					else this.rehydrate(reloadOptions);
					ElementSelectionProxy$1.clearCaches();
					this.forceFlush();
					this.setTimelineTimeValue(timelineTimeBeforeReload, true);
					if (this.$instance) {
						this.$instance.context.clock.start();
						const timeline = this.$instance.getTimeline(this.getCurrentTimelineName());
						if (timeline) timeline.setPlaying(true);
					}
					this.project.emit("change-authoritative-frame", Math.round(timelineTimeBeforeReload / this.getCurrentMspf()));
					return cb();
				}
			], finish);
		}
		destroy(cleanup = false) {
			if (this.$instance) {
				this.$instance.context.contextUnmount();
				this.$instance.context.getClock().stop();
				this.$instance.context.destroy();
			}
			this.file.destroy(cleanup);
			for (const klass of [
				MountElement$1,
				Artboard$1,
				SelectionMarquee$1,
				Timeline$1,
				Keyframe$1,
				Row$1,
				Element$1,
				ElementSelectionProxy$1
			]) klass.where({ component: this }).forEach((instance) => instance.destroy());
			super.destroy();
		}
		moduleReload(moduleReloadMethod = "basicReload", cb) {
			return this.fetchActiveBytecodeFile().mod[moduleReloadMethod](cb);
		}
		doesManageCoreInstance(instance) {
			if (!instance.getBytecodeRelpath()) return false;
			return path$4.normalize(instance.getBytecodeRelpath()) === path$4.normalize(this.getRelpath());
		}
		moduleCreate(moduleReloadMethod, instanceConfig = {}, cb) {
			return this.moduleReload(moduleReloadMethod, (err) => {
				if (err) return cb(err);
				const bytecode = this.getReifiedBytecode();
				if (this.isProjectActiveComponent()) this.project.getAllActiveComponents().forEach((ac) => {
					if (ac.$instance) {
						ac.$instance.visitGuestHierarchy((instance) => {
							instance.deactivate();
							if (this.doesManageCoreInstance(instance)) {
								const safe = ActiveComponent$2.memorySafeBytecode(bytecode, instance);
								if (instance.node.__memory && instance.node.__memory.parent) Object.assign(instance.node.__memory.parent.elementName, safe);
								Object.assign(instance.bytecode, safe);
							}
							instance.clearCaches({ clearStates: true });
						});
						ac.$instance.context.contextUnmount();
						ac.$instance.context.getClock().stop();
					}
				});
				if (this.$instance) this.$instance.context.destroy();
				const timelineTime = this.getCurrentTimelineTime();
				this.$instance = this.createInstance(bytecode, instanceConfig);
				this.sustainedWarningsChecker = new SustainedWarningChecker(this.$instance);
				this.emitDebouncedCheckSustainedWarning = lodash$1.debounce(() => {
					this.emit("sustained-check:start");
				}, CHECK_SUSTAINED_WARNINGS_DEBOUNCE_TIME, {
					leading: false,
					trailing: true
				});
				this.setTimelineTimeValue(timelineTime, true);
				return cb();
			});
		}
		moduleFindOrCreate(moduleReloadMethod, instanceConfig, cb) {
			if (this.$instance) return cb();
			return this.moduleCreate(moduleReloadMethod, instanceConfig, cb);
		}
		isProjectActiveComponent() {
			return this.project.getCurrentActiveComponent() === this;
		}
		createInstance(bytecode, config) {
			const createdHaikuCoreComponent = HaikuDOMAdapter(bytecode, null, null)(this.getMount().$el(), lodash$1.merge({}, {
				folder: ensureTrailingSlash$1(this.project.getFolder()),
				contextMenu: "disabled",
				overflowX: "visible",
				overflowY: "visible",
				mixpanel: false,
				interactionMode: this.interactionMode,
				hotEditingMode: true,
				clock: { run: false }
			}, config));
			createdHaikuCoreComponent.context.getContainer(true);
			createdHaikuCoreComponent.render();
			createdHaikuCoreComponent.visitGuestHierarchy((instance) => {
				instance.activate();
			});
			return createdHaikuCoreComponent;
		}
		/**
		* @method mountApplication
		* @description Given an *optional* DOM element to mount, load the component and boostrap it inside the mount.
		* If no mount is provided (i.e. in non-DOM contexts) this method can also be used if you just want to reload
		* the data for the component instead of actually displaying it. This is used by the Timeline but also nominally
		* by the Glass.
		*/
		mountApplication($el, instanceConfig, cb) {
			this.getMount().remountInto($el);
			this.codeReloadingOn();
			return this.reload({
				hardReload: true,
				moduleReloadMethod: "basicReload",
				clearCacheOptions: { doClearEntityCaches: true }
			}, instanceConfig, (err) => {
				this.codeReloadingOff();
				if (err) {
					logger$4.error(`[active component (${this.project.getAlias()})]`, err);
					this.emit("error", err);
					if (cb) return cb(err);
					return null;
				}
				this._isMounted = true;
				this.emit("update", "application-mounted");
				if (cb) return cb();
				return null;
			});
		}
		sleepComponentsOn() {
			HaikuComponent.all().forEach((instance) => {
				instance.sleepOn();
			});
		}
		sleepComponentsOff() {
			HaikuComponent.all().forEach((instance) => {
				instance.sleepOff();
			});
		}
		isCodeReloading() {
			return this._isReloadingCode;
		}
		codeReloadingOn() {
			this._isReloadingCode = true;
			this.sleepComponentsOn();
			this.getMount().setOpacity(.2);
		}
		codeReloadingOff() {
			this.getMount().setOpacity(1);
			this.sleepComponentsOff();
			this._isReloadingCode = false;
		}
		/**
		* @method moduleReplace
		* @description The more severe cousin of mountApplication which also displays a message on the view
		* indicating that reloading is occurring. This is really only used in the Glass, where code reload
		* events can interfere with what the user is doing and a UI lock of some kind is required.
		*/
		moduleReplace(cb) {
			return Lock$2.request(Lock$2.LOCKS.ActiveComponentWork, false, (release) => {
				this.codeReloadingOn();
				return this.reload({
					hardReload: true,
					moduleReloadMethod: "reload",
					clearCacheOptions: { doClearEntityCaches: true }
				}, null, (err) => {
					release();
					this.codeReloadingOff();
					if (err) {
						logger$4.error(`[active component (${this.project.getAlias()})]`, err);
						return this.emit("error", err);
					}
					return cb();
				});
			});
		}
		/**
		* @method moduleSync
		* @description Basically identical to `moduleReplace`, but without reloading from disk.
		*/
		moduleSync(cb) {
			return Lock$2.request(Lock$2.LOCKS.ActiveComponentWork, false, (release) => {
				this.codeReloadingOn();
				return this.reload({
					hardReload: true,
					moduleReloadMethod: "basicReload",
					clearCacheOptions: { doClearEntityCaches: true }
				}, null, (err) => {
					release();
					this.codeReloadingOff();
					if (err) {
						logger$4.error(`[active component (${this.project.getAlias()})]`, err);
						return this.emit("error", err);
					}
					this.fetchActiveBytecodeFile().requestAsyncContentFlush();
					return cb();
				});
			});
		}
		fetchRootElement() {
			const staticTemplateNode = this.getReifiedBytecode().template;
			const uid = Element$1.makeUid(this, null, 0, staticTemplateNode);
			const found = Element$1.findById(uid);
			if (found) return found;
			return Element$1.upsertElementFromVirtualElement(this, staticTemplateNode, null, 0, "0");
		}
		pushBytecodeSnapshot(done$1) {
			this.snapshots.push(Bytecode$1.snapshot(this.fetchActiveBytecodeFile().getReifiedDecycledBytecode({ suppressSubcomponents: false })));
			done$1();
		}
		popBytecodeSnapshot(metadata, cb) {
			return this.project.updateHook("popBytecodeSnapshot", this.getRelpath(), metadata, (fire) => {
				this.fetchActiveBytecodeFile().updateInMemoryHotModule(this.snapshots.splice(this.snapshots.length - 2, 1)[0], () => {
					this.moduleSync(() => {
						fire();
						return cb();
					});
				});
			});
		}
		rehydrate(options = {}) {
			BaseModel$3.__sync = false;
			this.cache.unset("displayableRows");
			this.cache.unset("getTemplateNodesByComponentId");
			Timeline$1.upsert({
				uid: this.buildCurrentTimelineUid(),
				folder: this.project.getFolder(),
				name: this.getCurrentTimelineName(),
				component: this
			}, {});
			const root$1 = this.fetchRootElement();
			Keyframe$1.where({ component: this }).forEach((keyframe) => keyframe.mark());
			Row$1.where({ component: this }).forEach((row$1) => row$1.mark());
			Element$1.where({ component: this }).forEach((element) => {
				if (element !== root$1) element.mark();
			});
			root$1.children = [];
			root$1.rehydrate(Object.assign({}, options, { maxRehydrationDepth: 1 }));
			root$1.visitAll((element) => {
				element.rehydrateRows(options);
			});
			Element$1.where({ component: this }).forEach((element) => {
				if (element !== root$1) element.sweep();
			});
			Row$1.where({ component: this }).forEach((row$1) => row$1.sweep());
			Keyframe$1.where({ component: this }).forEach((keyframe) => keyframe.sweep());
			const row = root$1.getAllRows()[0];
			if (row) {
				if (!row._wasInitiallyExpanded) {
					row._isExpanded = true;
					row._wasInitiallyExpanded = true;
				}
			}
			BaseModel$3.__sync = true;
		}
		getReifiedBytecode() {
			return this.fetchActiveBytecodeFile().getReifiedBytecode();
		}
		getSerializedBytecode() {
			return this.fetchActiveBytecodeFile().getSerializedBytecode();
		}
		getBytecodeJSON(replacer, spacing) {
			return jss$1(this.getSerializedBytecode(), replacer, spacing);
		}
		getReifiedTemplate() {
			const reifiedBytecode = this.getReifiedBytecode();
			return reifiedBytecode && reifiedBytecode.template;
		}
		upsertProperties(bytecode, componentId, timelineName, timelineTime, propertiesToMerge, strategy) {
			return Bytecode$1.upsertPropertyValue(bytecode, componentId, timelineName, timelineTime, propertiesToMerge, strategy);
		}
		getComponentId() {
			return this.getArtboard().getElementHaikuId();
		}
		isAutoSizeX() {
			return this.getDeclaredPropertyValue(this.getComponentId(), this.getCurrentTimelineName(), this.getCurrentTimelineTime(), "sizeAbsolute.x") === "auto";
		}
		isAutoSizeY() {
			return this.getDeclaredPropertyValue(this.getComponentId(), this.getCurrentTimelineName(), this.getCurrentTimelineTime(), "sizeAbsolute.y") === "auto";
		}
		getDeclaredPropertyValue(componentId, timelineName, timelineTime, propertyName) {
			const bytecode = this.getReifiedBytecode();
			let propertyValue = Template$1.getPropertyValue(bytecode, componentId, timelineName, timelineTime, propertyName);
			if (propertyValue === void 0 || propertyValue === null) {
				const elementName = this.getElementNameOfComponentId(componentId);
				propertyValue = TimelineProperty$1.getFallbackValue(elementName, propertyName);
			}
			return propertyValue;
		}
		getDeclaredPropertyValues(componentId, timelineName, timelineTime, propertyNames) {
			const out$1 = {};
			propertyNames.forEach((propertyName) => {
				out$1[propertyName] = this.getDeclaredPropertyValue(componentId, timelineName, timelineTime, propertyName);
			});
			return out$1;
		}
		getStateDescriptor(stateName) {
			const states = this.getReifiedBytecode().states;
			return states && states[stateName];
		}
		getComputedPropertyValue(template, componentId, timelineName, timelineTime, propertyName, fallbackValue) {
			const bytecode = this.getReifiedBytecode();
			const element = Template$1.getAllElementsByHaikuId(template)[componentId];
			const host = this.$instance;
			const states = host && host.getStates() || {};
			return TimelineProperty$1.getComputedValue(componentId, Element$1.safeElementName(element), propertyName, timelineName || DEFAULT_TIMELINE_NAME, timelineTime || DEFAULT_TIMELINE_TIME, fallbackValue, bytecode, host, states);
		}
		getContextSize() {
			return this.getContextSizeActual(this.getCurrentTimelineName(), this.getCurrentTimelineTime());
		}
		getContextSizeActual(timelineName, timelineTime) {
			const defaults$1 = {
				width: 1,
				height: 1
			};
			const bytecode = this.getReifiedBytecode();
			if (!bytecode || !bytecode.template || !bytecode.template.attributes) return defaults$1;
			const contextHaikuId = bytecode.template.attributes[HAIKU_ID_ATTRIBUTE];
			if (!contextHaikuId) return defaults$1;
			const contextElementName = Element$1.safeElementName(bytecode.template);
			if (!contextElementName) return defaults$1;
			const modelElement = this.findElementByComponentId(contextHaikuId);
			if (!modelElement || !modelElement.getLiveRenderedNode()) return defaults$1;
			const haikuElement = modelElement.getHaikuElement();
			if (!haikuElement) return defaults$1;
			const host = this.$instance;
			const states = host && host.getStates() || {};
			let contextWidth = TimelineProperty$1.getComputedValue(contextHaikuId, contextElementName, "sizeAbsolute.x", timelineName || DEFAULT_TIMELINE_NAME, timelineTime || DEFAULT_TIMELINE_TIME, 0, bytecode, host, states);
			let contextHeight = TimelineProperty$1.getComputedValue(contextHaikuId, contextElementName, "sizeAbsolute.y", timelineName || DEFAULT_TIMELINE_NAME, timelineTime || DEFAULT_TIMELINE_TIME, 0, bytecode, host, states);
			if (typeof contextWidth !== "number") contextWidth = haikuElement.computeSizeX();
			if (typeof contextHeight !== "number") contextHeight = haikuElement.computeSizeY();
			return {
				width: contextWidth,
				height: contextHeight
			};
		}
		buildCurrentTimelineUid() {
			return `${this.getPrimaryKey()}::${this.getCurrentTimelineName()}`;
		}
		getCurrentTimeline() {
			return Timeline$1.findById(this.buildCurrentTimelineUid());
		}
		getRows() {
			return Row$1.where({ component: this });
		}
		getKeyframes() {
			return Keyframe$1.where({ component: this });
		}
		getElements() {
			return Element$1.where({ component: this });
		}
		getLastTemplateNode() {
			const bytecode = this.getReifiedBytecode();
			return bytecode && bytecode.template && bytecode.template.children && bytecode.template.children[bytecode.template.children.length - 1];
		}
		getFirstTemplateNode() {
			const bytecode = this.getReifiedBytecode();
			return bytecode && bytecode.template && bytecode.template.children && bytecode.template.children[0];
		}
		getLastTemplateNodeHaikuId() {
			const node = this.getLastTemplateNode();
			return node && node.attributes && node.attributes[HAIKU_ID_ATTRIBUTE];
		}
		getFirstTemplateNodeHaikuId() {
			const node = this.getFirstTemplateNode();
			return node && node.attributes && node.attributes[HAIKU_ID_ATTRIBUTE];
		}
		focusSelectNext(navDir, doFocus, metadata) {
			return Row$1.focusSelectNext({ component: this }, navDir, doFocus, metadata);
		}
		getSelectedRows() {
			return Row$1.where({
				component: this,
				_isSelected: true
			});
		}
		getSelectedElements() {
			return Element$1.where({
				component: this,
				_isSelected: true
			});
		}
		getCurrentRows(criteria) {
			if (!criteria) criteria = {};
			criteria.component = this;
			return Row$1.where(criteria);
		}
		getDisplayableRowsGroupedByElementInZOrder() {
			const stack = this.getRawStackingInfo(this.getInstantiationTimelineName(), this.getInstantiationTimelineTime()).reverse();
			const root$1 = this.fetchRootElement();
			const rows = root$1.getHostedPropertyRows(false);
			const all = [].concat(rows);
			const groups = [{
				host: root$1,
				id: root$1.getComponentId(),
				rows
			}].concat(stack.reduce((acc, { haikuId }) => {
				const child = this.findElementByComponentId(haikuId);
				if (child) {
					const rows$1 = child.getHostedPropertyRows(true);
					all.push.apply(all, rows$1);
					acc.push({
						host: child,
						id: child.getComponentId(),
						rows: rows$1
					});
				}
				return acc;
			}, []));
			const first = all[0];
			const last = all[all.length - 1];
			all.forEach((row, index) => {
				const prev = all[index - 1];
				row._prev = null;
				row._next = null;
				if (prev) {
					row._prev = prev;
					prev._next = row;
				}
			});
			first._prev = last;
			last._next = first;
			return groups;
		}
		getSelectedKeyframes() {
			return Keyframe$1.where({
				component: this,
				_selected: true
			});
		}
		/**
		* Returns a boolean indicating if *all* of the selected keyframes
		* are the first non-zero keyframe in their row.
		*
		* @returns Boolean
		*/
		checkIfSelectedKeyframesAreMovableToZero() {
			return this.getSelectedKeyframes().findIndex((keyframe) => !(keyframe.prev() && keyframe.prev().origMs === 0)) === -1;
		}
		getCurrentKeyframes(criteria) {
			if (!criteria) criteria = {};
			criteria.component = this;
			return Keyframe$1.where(criteria);
		}
		getFocusedRow() {
			return Row$1.getFocusedRow({ component: this });
		}
		getSelectedRow() {
			return Row$1.getSelectedRow({ component: this });
		}
		performComponentWork(worker, cb) {
			this.sleepComponentsOn();
			return Lock$2.request(Lock$2.LOCKS.FilePerformComponentWork, false, (release) => {
				const finish = (err, ...result) => {
					release();
					return cb(err, ...result);
				};
				const bytecode = this.getReifiedBytecode();
				return worker(bytecode, bytecode.template, (err, ...result) => {
					if (err) return finish(err);
					this.handleUpdatedBytecode(bytecode);
					this.sleepComponentsOff();
					return finish(null, ...result);
				});
			});
		}
		handleUpdatedBytecode(bytecode) {
			Bytecode$1.cleanBytecode(bytecode);
			Template$1.cleanTemplate(bytecode.template);
			this.fetchActiveBytecodeFile().updateInMemoryHotModule(bytecode, () => {
				this.fetchActiveBytecodeFile().requestAsyncContentFlush();
			});
		}
		performComponentTimelinesWork(worker, finish) {
			return this.performComponentWork((bytecode, mana, done$1) => {
				if (!bytecode) return done$1(/* @__PURE__ */ new Error("Missing bytecode"));
				if (!bytecode.timelines) return done$1(/* @__PURE__ */ new Error("Missing timelines"));
				return worker(bytecode, mana, bytecode.timelines, done$1);
			}, finish);
		}
		getKeyframeValue(componentId, timelineName, timelineTime, propertyName) {
			const bytecode = this.getReifiedBytecode();
			const selector = `haiku:${componentId}`;
			return bytecode && bytecode.timelines && bytecode.timelines[timelineName] && bytecode.timelines[timelineName][selector] && bytecode.timelines[timelineName][selector][propertyName] && bytecode.timelines[timelineName][selector][propertyName][timelineTime] && bytecode.timelines[timelineName][selector][propertyName][timelineTime].value;
		}
		getKeyframeCurve(componentId, timelineName, timelineTime, propertyName) {
			const bytecode = this.getReifiedBytecode();
			const selector = `haiku:${componentId}`;
			return bytecode && bytecode.timelines && bytecode.timelines[timelineName] && bytecode.timelines[timelineName][selector] && bytecode.timelines[timelineName][selector][propertyName] && bytecode.timelines[timelineName][selector][propertyName][timelineTime] && bytecode.timelines[timelineName][selector][propertyName][timelineTime].curve;
		}
		getElementNameOfComponentId(componentId) {
			const element = this.findTemplateNodeByComponentId(this.getReifiedBytecode().template, componentId);
			return element && element.elementName;
		}
		getSafeElementNameOfComponentId(componentId) {
			const element = this.findTemplateNodeByComponentId(this.getReifiedBytecode().template, componentId);
			return element && Element$1.safeElementName(element);
		}
		getTimelineDescriptor(timelineName) {
			const bytecode = this.getReifiedBytecode();
			return bytecode && bytecode.timelines && bytecode.timelines[timelineName];
		}
		getRawStackingInfo(timelineName, timelineTime) {
			const bytecode = this.getReifiedBytecode();
			return Template$1.getStackingInfo(bytecode, bytecode.template, timelineName, timelineTime);
		}
		setZIndicesForStackingInfo(bytecode, timelineName, timelineTime, stackingInfo) {
			stackingInfo.forEach(({ haikuId }, arrayIndex) => {
				this.upsertProperties(bytecode, haikuId, timelineName, timelineTime, { "style.zIndex": arrayIndex + 1 }, "merge");
			});
		}
		grabStackObjectFromStackingInfo(stackingInfo, componentId) {
			for (let index = stackingInfo.length - 1; index >= 0; index--) if (stackingInfo[index].haikuId === componentId) return {
				ourStackObject: stackingInfo.splice(index, 1)[0],
				index
			};
		}
		/**
		* @method writeMetadata
		*/
		writeMetadata(bytecodeMetadata, metadata, cb) {
			return this.project.updateHook("writeMetadata", this.getRelpath(), bytecodeMetadata, metadata, (fire) => {
				return this.performComponentWork((bytecode, mana, done$1) => {
					Bytecode$1.writeMetadata(bytecode, lodash$1.assign({}, bytecodeMetadata, { title: this.getTitle() }));
					done$1();
				}, () => {
					fire();
					cb();
				});
			});
		}
		/**
		* @method readMetadata
		*/
		readMetadata(cb) {
			return cb(null, this.getReifiedBytecode().metadata || {});
		}
		/**
		* @method readAllEventHandlers
		*/
		readAllEventHandlers(metadata, cb) {
			return this.readAllEventHandlersActual(cb);
		}
		readAllEventHandlersActual(cb) {
			const bytecode = this.getSerializedBytecode();
			return cb(null, Bytecode$1.readAllEventHandlers(bytecode));
		}
		/**
		* @method readAllStateValues
		*/
		readAllStateValues(metadata, cb) {
			return this.readAllStateValuesActual(cb);
		}
		readAllStateValuesActual(cb) {
			const bytecode = this.getSerializedBytecode();
			return cb(null, Bytecode$1.readAllStateValues(bytecode));
		}
		/**
		* @method batchUpsertEventHandlers
		*/
		batchUpsertEventHandlers(selectorName, eventsSerial, metadata, cb) {
			const events = Bytecode$1.unserializeValue(eventsSerial, (ref) => {
				return this.evaluateReference(ref);
			});
			return this.project.updateHook("batchUpsertEventHandlers", this.getRelpath(), selectorName, Bytecode$1.serializeValue(events), metadata, (fire) => {
				return this.batchUpsertEventHandlersActual(selectorName, events, (err) => {
					if (err) {
						logger$4.error(`[active component (${this.project.getAlias()})]`, err);
						return cb(err);
					}
					return this.reload({
						hardReload: this.project.isRemoteRequest(metadata),
						clearCacheOptions: { doClearEntityCaches: true }
					}, null, () => {
						fire();
						this.project.broadcastPayload({ name: "event-handlers-updated" });
						return cb();
					});
				});
			});
		}
		batchUpsertEventHandlersActual(selectorName, serializedEvents, cb) {
			return this.performComponentWork((bytecode, mana, done$1) => {
				Bytecode$1.batchUpsertEventHandlers(bytecode, selectorName, serializedEvents);
				done$1();
			}, cb);
		}
		/**
		* @method changeKeyframeValue
		*/
		changeKeyframeValue(componentId, timelineName, propertyName, keyframeMs, newValueSerial, metadata, cb) {
			const newValue = Bytecode$1.unserializeValue(newValueSerial, (ref) => {
				return this.evaluateReference(ref);
			});
			return this.project.updateHook("changeKeyframeValue", this.getRelpath(), componentId, timelineName, propertyName, keyframeMs, Bytecode$1.serializeValue(newValue), metadata, (fire) => {
				return this.changeKeyframeValueActual(componentId, timelineName, propertyName, keyframeMs, newValue, metadata, (err) => {
					if (err) {
						logger$4.error(`[active component (${this.project.getAlias()})]`, err);
						return cb(err);
					}
					return this.reload({
						hardReload: this.project.isRemoteRequest(metadata),
						forceFlush: true,
						clearCacheOptions: { doClearEntityCaches: true }
					}, null, () => {
						fire();
						return cb();
					});
				});
			});
		}
		changeKeyframeValueActual(componentId, timelineName, propertyName, keyframeMs, newValue, metadata, cb) {
			return this.performComponentWork((bytecode, mana, done$1) => {
				Bytecode$1.changeKeyframeValue(bytecode, componentId, timelineName, propertyName, keyframeMs, newValue);
				done$1();
			}, cb);
		}
		/**
		* @method changeSegmentCurve
		*/
		changeSegmentCurve(componentId, timelineName, propertyName, keyframeMs, newCurveSerial, metadata, cb) {
			const newCurve = Bytecode$1.unserializeValue(newCurveSerial, (ref) => {
				return this.evaluateReference(ref);
			});
			return this.project.updateHook("changeSegmentCurve", this.getRelpath(), componentId, timelineName, propertyName, keyframeMs, Bytecode$1.serializeValue(newCurve), metadata, (fire) => {
				return this.changeSegmentCurveActual(componentId, timelineName, propertyName, keyframeMs, newCurve, metadata, (err) => {
					if (err) {
						logger$4.error(`[active component (${this.project.getAlias()})]`, err);
						return cb(err);
					}
					return this.reload({
						hardReload: this.project.isRemoteRequest(metadata),
						forceFlush: true,
						clearCacheOptions: { doClearEntityCaches: true }
					}, null, () => {
						fire();
						return cb();
					});
				});
			});
		}
		changeSegmentCurveActual(componentId, timelineName, propertyName, keyframeMs, newCurve, metadata, cb) {
			return this.performComponentWork((bytecode, mana, done$1) => {
				Bytecode$1.changeSegmentCurve(bytecode, componentId, timelineName, propertyName, keyframeMs, newCurve);
				done$1();
			}, cb);
		}
		/**
		* @method joinKeyframes
		*/
		joinKeyframes(componentId, timelineName, elementName, propertyName, keyframeMsLeft, keyframeMsRight, newCurveSerial, metadata, cb) {
			const newCurve = Bytecode$1.unserializeValue(newCurveSerial, (ref) => {
				return this.evaluateReference(ref);
			});
			return this.project.updateHook("joinKeyframes", this.getRelpath(), componentId, timelineName, elementName, propertyName, keyframeMsLeft, keyframeMsRight, Bytecode$1.serializeValue(newCurve), metadata, (fire) => {
				return this.joinKeyframesActual(componentId, timelineName, elementName, propertyName, keyframeMsLeft, keyframeMsRight, newCurve, metadata, (err) => {
					if (err) {
						logger$4.error(`[active component (${this.project.getAlias()})]`, err);
						return cb(err);
					}
					return this.reload({
						hardReload: true,
						forceFlush: true,
						clearCacheOptions: { doClearEntityCaches: true },
						customRehydrate: () => {
							if (this.project.isRemoteRequest(metadata)) {
								this.rehydrate();
								return;
							}
							const element = this.findElementByComponentId(componentId);
							if (element) {
								const row = element.getPropertyRowByPropertyName(propertyName);
								if (row) {
									const keyframe = row.getKeyframeByMs(keyframeMsLeft);
									if (keyframe) keyframe.setCurve(newCurve);
								}
							}
						}
					}, null, () => {
						fire();
						return cb();
					});
				});
			});
		}
		joinKeyframesActual(componentId, timelineName, elementName, propertyName, keyframeMsLeft, keyframeMsRight, newCurve, metadata, cb) {
			return this.performComponentWork((bytecode, mana, done$1) => {
				Bytecode$1.joinKeyframes(bytecode, componentId, timelineName, elementName, propertyName, keyframeMsLeft, keyframeMsRight, newCurve);
				done$1();
			}, cb);
		}
		/**
		* @method splitSegment
		*/
		splitSegment(componentId, timelineName, elementName, propertyName, keyframeMs, metadata, cb) {
			return this.project.updateHook("splitSegment", this.getRelpath(), componentId, timelineName, elementName, propertyName, keyframeMs, metadata, (fire) => {
				return this.splitSegmentActual(componentId, timelineName, elementName, propertyName, keyframeMs, metadata, (err) => {
					if (err) {
						logger$4.error(`[active component (${this.project.getAlias()})]`, err);
						return cb(err);
					}
					return this.reload({
						hardReload: true,
						forceFlush: true,
						clearCacheOptions: { doClearEntityCaches: true },
						customRehydrate: () => {
							if (this.project.isRemoteRequest(metadata)) {
								this.rehydrate();
								return;
							}
							const element = this.findElementByComponentId(componentId);
							if (element) {
								const row = element.getPropertyRowByPropertyName(propertyName);
								if (row) {
									const keyframe = row.getKeyframeByMs(keyframeMs);
									if (keyframe) keyframe.setCurve(null);
								}
							}
						}
					}, null, () => {
						fire();
						return cb();
					});
				});
			});
		}
		splitSegmentActual(componentId, timelineName, elementName, propertyName, keyframeMs, metadata, cb) {
			return this.performComponentWork((bytecode, mana, done$1) => {
				Bytecode$1.splitSegment(bytecode, componentId, timelineName, elementName, propertyName, keyframeMs);
				done$1();
			}, cb);
		}
		getKeyframesObjectForPropertyNames(timelineName, componentId, propertyNames) {
			const properties = ((this.getReifiedBytecode() || {}).timelines[timelineName] || {})[`haiku:${componentId}`] || {};
			const keyframes = {};
			propertyNames.forEach((propertyName) => {
				keyframes[propertyName] = properties[propertyName];
			});
			return keyframes;
		}
		ensureZerothKeyframe(bytecode, timelineName, componentId, propertyName, fallbackToInitialKeyframeIfProvided = true) {
			const selector = `haiku:${componentId}`;
			if (!bytecode.timelines[timelineName]) bytecode.timelines[timelineName] = {};
			if (!bytecode.timelines[timelineName][selector]) bytecode.timelines[timelineName][selector] = {};
			if (!bytecode.timelines[timelineName][selector][propertyName]) bytecode.timelines[timelineName][selector][propertyName] = {};
			const descriptor = bytecode.timelines[timelineName][selector][propertyName];
			const initialKeyframeMs = getSortedKeyframes(descriptor)[0];
			const initialKeyframeObj = initialKeyframeMs !== void 0 ? descriptor[initialKeyframeMs] : void 0;
			if (!descriptor[0]) descriptor[0] = {};
			if (descriptor[0].value === void 0) if (fallbackToInitialKeyframeIfProvided && initialKeyframeObj) descriptor[0].value = Bytecode$1.unserializeValue(initialKeyframeObj.value, (ref) => this.evaluateReference(ref));
			else {
				const declaredValue = this.getDeclaredPropertyValue(componentId, timelineName, 0, propertyName);
				descriptor[0].value = Bytecode$1.unserializeValue(declaredValue, (ref) => this.evaluateReference(ref));
			}
			if (descriptor[0].value === void 0) descriptor[0].value = 1;
			descriptor[0].edited = true;
		}
		/**
		* @method moveKeyframes
		*/
		moveKeyframes(keyframeMovesSerial, metadata, cb) {
			if (Object.keys(keyframeMovesSerial).length < 1) return cb();
			const keyframeMoves = Bytecode$1.unserializeValue(keyframeMovesSerial, (ref) => {
				return this.evaluateReference(ref);
			});
			return this.project.updateHook("moveKeyframes", this.getRelpath(), Bytecode$1.serializeValue(keyframeMoves), metadata, (fire) => {
				return this.moveKeyframesActual(keyframeMoves, metadata, (err) => {
					if (err) {
						logger$4.error(`[active component (${this.project.getAlias()})]`, err);
						return cb(err);
					}
					return this.reload({
						hardReload: true,
						forceFlush: true,
						clearCacheOptions: { doClearEntityCaches: true },
						customRehydrate: () => {
							if (this.project.isRemoteRequest(metadata)) {
								this.rehydrate();
								return;
							}
							for (const timelineName in keyframeMoves) for (const componentId in keyframeMoves[timelineName]) {
								const element = this.findElementByComponentId(componentId);
								if (!element) continue;
								for (const propertyName in keyframeMoves[timelineName][componentId]) {
									const row = element.getPropertyRowByPropertyName(propertyName);
									if (!row) continue;
									row.getKeyframes().forEach((keyframe) => keyframe.updateOwnMetadata());
									row.rehydrate();
								}
							}
						}
					}, null, () => {
						fire();
						return cb();
					});
				});
			});
		}
		moveKeyframesActual(keyframeMoves, metadata, cb) {
			return this.performComponentWork((bytecode, mana, done$1) => {
				Bytecode$1.moveKeyframes(bytecode, keyframeMoves);
				for (const timelineName in keyframeMoves) for (const componentId in keyframeMoves[timelineName]) for (const propertyName in keyframeMoves[timelineName][componentId]) this.ensureZerothKeyframe(bytecode, timelineName, componentId, propertyName, true);
				Timeline$1.clearCaches();
				done$1();
			}, cb);
		}
		/**
		* @method updateKeyframes
		*/
		updateKeyframes(keyframeUpdatesSerial, options, metadata, cb) {
			const keyframeUpdates = Bytecode$1.unserializeValue(keyframeUpdatesSerial, (ref) => {
				return this.evaluateReference(ref);
			});
			return this.project.updateHook("updateKeyframes", this.getRelpath(), Bytecode$1.serializeValue(keyframeUpdates), options, metadata, (fire) => {
				const unlockedDesigns = {};
				if (options.setElementLockStatus) for (const elID in options.setElementLockStatus) {
					const node = this.findTemplateNodeByComponentId(this.getReifiedBytecode().template, elID);
					if (!node || !node.attributes[HAIKU_SOURCE_ATTRIBUTE]) continue;
					const lockStatus = options.setElementLockStatus[elID];
					if (!lockStatus && node.attributes[HAIKU_SOURCE_ATTRIBUTE].endsWith(SYNC_LOCKED_ID_SUFFIX)) {
						node.attributes[HAIKU_SOURCE_ATTRIBUTE] = node.attributes[HAIKU_SOURCE_ATTRIBUTE].replace(SYNC_LOCKED_ID_SUFFIX, "");
						unlockedDesigns[node.attributes[HAIKU_SOURCE_ATTRIBUTE]] = true;
					} else if (lockStatus && !node.attributes[HAIKU_SOURCE_ATTRIBUTE].endsWith(SYNC_LOCKED_ID_SUFFIX)) node.attributes[HAIKU_SOURCE_ATTRIBUTE] = node.attributes[HAIKU_SOURCE_ATTRIBUTE] + SYNC_LOCKED_ID_SUFFIX;
				}
				return this.updateKeyframesActual(keyframeUpdates, { unlockedDesigns }, metadata, (err) => {
					if (err) {
						logger$4.error(`[active component (${this.project.getAlias()})]`, err);
						return cb(err);
					}
					return this.reload({
						hardReload: this.project.isRemoteRequest(metadata),
						forceFlush: !!metadata.cursor,
						hotComponents: keyframeUpdatesToHotComponentDescriptors(keyframeUpdates),
						clearCacheOptions: { doClearEntityCaches: !!metadata.cursor },
						customRehydrate: () => {
							const componentIds = {};
							for (const timelineName in keyframeUpdates) for (const componentId in keyframeUpdates[timelineName]) {
								if (componentIds[componentId]) continue;
								componentIds[componentId] = true;
								const element = this.findElementByComponentId(componentId);
								if (element) {
									element.rehydrateRows();
									Row$1.where({
										component: this,
										element
									}).forEach((row) => {
										if (experimentIsEnabled$1(Experiment$1.ExpandTimelinePropertiesFromStageChanges)) {
											if (row.property && keyframeUpdates[timelineName][componentId][row.property.name]) row.expand(metadata);
										}
									});
								}
							}
							if (options.setElementLockStatus) for (const elID in options.setElementLockStatus) {
								const element = this.findElementByComponentId(elID);
								Row$1.where({
									component: this,
									element
								}).forEach((row) => {
									row.rehydrate();
								});
							}
						}
					}, null, () => {
						fire();
						this.tick();
						return cb();
					});
				});
			});
		}
		updateKeyframesActual(keyframeUpdates, { unlockedDesigns }, metadata, cb) {
			return this.performComponentWork((bytecode, mana, done$1) => {
				for (const timelineName in keyframeUpdates) {
					if (!bytecode.timelines[timelineName]) bytecode.timelines[timelineName] = {};
					for (const componentId in keyframeUpdates[timelineName]) {
						const selector = Template$1.buildHaikuIdSelector(componentId);
						if (!bytecode.timelines[timelineName][selector]) bytecode.timelines[timelineName][selector] = {};
						for (const propertyName in keyframeUpdates[timelineName][componentId]) {
							if (!bytecode.timelines[timelineName][selector][propertyName]) bytecode.timelines[timelineName][selector][propertyName] = {};
							for (const keyframeMs in keyframeUpdates[timelineName][componentId][propertyName]) {
								const propertyObj = keyframeUpdates[timelineName][componentId][propertyName][keyframeMs];
								if (propertyObj === null) {
									delete bytecode.timelines[timelineName][selector][propertyName][keyframeMs];
									continue;
								}
								if (!bytecode.timelines[timelineName][selector][propertyName][keyframeMs]) bytecode.timelines[timelineName][selector][propertyName][keyframeMs] = {};
								const keyfVal = typeof propertyObj.value === "function" ? propertyObj.value : lodash$1.clone(propertyObj.value);
								bytecode.timelines[timelineName][selector][propertyName][keyframeMs].value = keyfVal;
								this.ensureZerothKeyframe(bytecode, timelineName, componentId, propertyName, false);
								if (experimentIsEnabled$1(Experiment$1.AutoTweenNewKeyframes)) Bytecode$1.addDefaultCurveIfNecessary(bytecode, timelineName, selector, keyframeMs, propertyName, componentId, this.getElementNameOfComponentId(componentId));
							}
						}
					}
				}
				Timeline$1.clearCaches();
				this.mergeDesignFilesImpl(unlockedDesigns, bytecode, { mergeRemovedOutputs: false }, done$1);
			}, cb);
		}
		updateTypesActual(typeUpdates, metadata, cb) {
			return this.performComponentWork((bytecode, mana, done$1) => {
				for (const id$1 in typeUpdates) {
					const node = this.locateTemplateNodeByComponentId(id$1);
					node.elementName = typeUpdates[id$1];
				}
				done$1();
			}, cb);
		}
		updateKeyframesAndTypes(keyframeUpdatesSerial, typeUpdates, options, metadata, cb) {
			const keyframeUpdates = Bytecode$1.unserializeValue(keyframeUpdatesSerial, (ref) => {
				return this.evaluateReference(ref);
			});
			return this.project.updateHook("updateKeyframesAndTypes", this.getRelpath(), Bytecode$1.serializeValue(keyframeUpdates), typeUpdates, options, metadata, (fire) => {
				const unlockedDesigns = {};
				if (options.setElementLockStatus) for (const elID in options.setElementLockStatus) {
					const node = this.findTemplateNodeByComponentId(this.getReifiedBytecode().template, elID);
					if (!node || !node.attributes[HAIKU_SOURCE_ATTRIBUTE]) continue;
					const lockStatus = options.setElementLockStatus[elID];
					if (!lockStatus && node.attributes[HAIKU_SOURCE_ATTRIBUTE].endsWith(SYNC_LOCKED_ID_SUFFIX)) {
						node.attributes[HAIKU_SOURCE_ATTRIBUTE] = node.attributes[HAIKU_SOURCE_ATTRIBUTE].replace(SYNC_LOCKED_ID_SUFFIX, "");
						unlockedDesigns[node.attributes[HAIKU_SOURCE_ATTRIBUTE]] = true;
					} else if (lockStatus && !node.attributes[HAIKU_SOURCE_ATTRIBUTE].endsWith(SYNC_LOCKED_ID_SUFFIX)) node.attributes[HAIKU_SOURCE_ATTRIBUTE] = node.attributes[HAIKU_SOURCE_ATTRIBUTE] + SYNC_LOCKED_ID_SUFFIX;
				}
				return this.updateKeyframesActual(keyframeUpdates, { unlockedDesigns }, metadata, (err) => {
					if (err) {
						logger$4.error(`[active component (${this.project.getAlias()})]`, err);
						return cb(err);
					}
					return this.updateTypesActual(typeUpdates, metadata, (err$1) => {
						if (err$1) {
							logger$4.error(`[active component (${this.project.getAlias()})]`, err$1);
							return cb(err$1);
						}
						return this.reload({
							hardReload: this.project.isRemoteRequest(metadata),
							forceFlush: !!metadata.cursor,
							hotComponents: keyframeUpdatesToHotComponentDescriptors(keyframeUpdates),
							clearCacheOptions: { doClearEntityCaches: !!metadata.cursor },
							customRehydrate: () => {
								const componentIds = {};
								for (const timelineName in keyframeUpdates) for (const componentId in keyframeUpdates[timelineName]) componentIds[componentId] = true;
								for (const id$1 in typeUpdates) componentIds[id$1] = true;
								if (options.setElementLockStatus) for (const elID in options.setElementLockStatus) componentIds[elID] = true;
								for (const id$1 in componentIds) {
									const el = this.findElementByComponentId(id$1);
									if (el) el.rehydrateRows();
								}
							}
						}, null, () => {
							fire();
							return cb();
						});
					});
				});
			});
		}
		/**
		* @method createKeyframe
		*/
		createKeyframe(componentId, timelineName, elementName, propertyName, keyframeStartMs, keyframeValueSerial, keyframeCurveSerial, keyframeEndMs, keyframeEndValueSerial, options, metadata, cb) {
			const keyframeValue = Bytecode$1.unserializeValue(keyframeValueSerial, (ref) => {
				return this.evaluateReference(ref);
			});
			const keyframeCurve = Bytecode$1.unserializeValue(keyframeCurveSerial, (ref) => {
				return this.evaluateReference(ref);
			});
			const keyframeEndValue = Bytecode$1.unserializeValue(keyframeEndValueSerial, (ref) => {
				return this.evaluateReference(ref);
			});
			const element = this.findElementByComponentId(componentId);
			const actualKeyframeStartMs = element && !Property$1.canHaveKeyframes(propertyName, element) ? 0 : keyframeStartMs;
			return this.project.updateHook("createKeyframe", this.getRelpath(), componentId, timelineName, elementName, propertyName, actualKeyframeStartMs, Bytecode$1.serializeValue(keyframeValue), Bytecode$1.serializeValue(keyframeCurve), keyframeEndMs, Bytecode$1.serializeValue(keyframeEndValue), options, metadata, (fire) => {
				const unlockedDesigns = {};
				if (options && options.setElementLockStatus) for (const elID in options.setElementLockStatus) {
					const node = this.findTemplateNodeByComponentId(this.getReifiedBytecode().template, elID);
					if (!node || !node.attributes[HAIKU_SOURCE_ATTRIBUTE]) continue;
					const lockStatus = options.setElementLockStatus[elID];
					if (!lockStatus && node.attributes[HAIKU_SOURCE_ATTRIBUTE].endsWith(SYNC_LOCKED_ID_SUFFIX)) {
						node.attributes[HAIKU_SOURCE_ATTRIBUTE] = node.attributes[HAIKU_SOURCE_ATTRIBUTE].replace(SYNC_LOCKED_ID_SUFFIX, "");
						unlockedDesigns[node.attributes[HAIKU_SOURCE_ATTRIBUTE]] = true;
					} else if (lockStatus && !node.attributes[HAIKU_SOURCE_ATTRIBUTE].endsWith(SYNC_LOCKED_ID_SUFFIX)) node.attributes[HAIKU_SOURCE_ATTRIBUTE] = node.attributes[HAIKU_SOURCE_ATTRIBUTE] + SYNC_LOCKED_ID_SUFFIX;
				}
				return this.createKeyframeActual(componentId, timelineName, elementName, propertyName, actualKeyframeStartMs, keyframeValue, keyframeCurve, keyframeEndMs, keyframeEndValue, metadata, (err) => {
					if (err) {
						logger$4.error(`[active component (${this.project.getAlias()})]`, err);
						return cb(err);
					}
					return this.reload({
						hardReload: true,
						clearCacheOptions: { doClearEntityCaches: true },
						customRehydrate: () => {
							if (this.project.isRemoteRequest(metadata)) {
								this.rehydrate();
								return;
							}
							if (!element) return;
							const row = element.getPropertyRowByPropertyName(propertyName);
							if (!row) return;
							row.getKeyframes().forEach((keyframe) => keyframe.updateOwnMetadata());
							row.rehydrate();
						}
					}, null, () => {
						fire();
						return cb();
					});
				});
			});
		}
		createKeyframeActual(componentId, timelineName, elementName, propertyName, keyframeStartMs, keyframeValue, keyframeCurve, keyframeEndMs, keyframeEndValue, metadata, cb) {
			return this.performComponentWork((bytecode, mana, done$1) => {
				const host = this.$instance;
				const states = host && host.getStates() || {};
				Bytecode$1.createKeyframe(bytecode, componentId, timelineName, elementName, propertyName, keyframeStartMs, keyframeValue, keyframeCurve, keyframeEndMs, keyframeEndValue, host, states);
				this.ensureZerothKeyframe(bytecode, timelineName, componentId, propertyName, false);
				if (experimentIsEnabled$1(Experiment$1.AutoTweenNewKeyframes)) Bytecode$1.addDefaultCurveIfNecessary(bytecode, timelineName, Template$1.buildHaikuIdSelector(componentId), keyframeStartMs, propertyName, componentId, elementName);
				done$1();
			}, cb);
		}
		/**
		* @method deleteKeyframe
		*/
		deleteKeyframe(componentId, timelineName, propertyName, keyframeMs, metadata, cb) {
			return this.project.updateHook("deleteKeyframe", this.getRelpath(), componentId, timelineName, propertyName, keyframeMs, metadata, (fire) => {
				return this.deleteKeyframeActual(componentId, timelineName, propertyName, keyframeMs, metadata, (err) => {
					if (err) {
						logger$4.error(`[active component (${this.project.getAlias()})]`, err);
						return cb(err);
					}
					return this.reload({
						hardReload: true,
						clearCacheOptions: { doClearEntityCaches: true },
						customRehydrate: () => {
							if (this.project.isRemoteRequest(metadata)) {
								this.rehydrate();
								return;
							}
							const element = this.findElementByComponentId(componentId);
							if (!element) return;
							const row = element.getPropertyRowByPropertyName(propertyName);
							if (!row) return;
							row.getKeyframes().forEach((keyframe) => keyframe.updateOwnMetadata());
							row.rehydrate();
						}
					}, null, () => {
						fire();
						return cb();
					});
				});
			});
		}
		deleteKeyframeActual(componentId, timelineName, propertyName, keyframeMs, metadata, cb) {
			return this.performComponentWork((bytecode, mana, done$1) => {
				Bytecode$1.deleteKeyframe(bytecode, componentId, timelineName, propertyName, keyframeMs);
				this.ensureZerothKeyframe(bytecode, timelineName, componentId, propertyName, true);
				done$1();
			}, cb);
		}
		get nextSuggestedGroupName() {
			const reservations = [];
			this.getElements().forEach((element) => {
				const title = element.getTitle();
				if (!title || typeof title !== "string") return;
				const matches = element.getTitle().match(/^group (\d+)$/i);
				if (matches) reservations.push(Number(matches[1]));
			});
			const next = Math.max(...reservations);
			return `Group ${isFinite(next) ? next + 1 : 1}`;
		}
		/**
		* @method groupElements
		*/
		groupElements(componentIds, groupMana, coords, metadata, cb) {
			return this.project.updateHook("groupElements", this.getRelpath(), componentIds, groupMana, coords, metadata, (fire) => {
				return this.groupElementsActual(componentIds, groupMana, coords, metadata, (err, groupComponentId) => {
					if (err) {
						logger$4.error(`[active component (${this.project.getAlias()})]`, err);
						return cb(err);
					}
					return this.reload({
						hardReload: true,
						clearCacheOptions: { doClearEntityCaches: true }
					}, null, () => {
						fire(null, groupComponentId);
						this.findElementByComponentId(groupComponentId).select(metadata);
						return cb();
					});
				});
			});
		}
		groupElementsActual(componentIds, groupManaIn, coords, metadata, cb) {
			const groupMana = lodash$1.cloneDeep(groupManaIn);
			const originalTimeline = this.getTimelineDescriptor(this.getCurrentTimelineName());
			return this.performComponentWork((bytecode, mana, done$1) => {
				const timelineName = this.getInstantiationTimelineName();
				const timelineTime = this.getInstantiationTimelineTime();
				const groupComponentId = this.instantiateManaInBytecode(groupMana, bytecode, {}, coords);
				const nodesToRegroup = [];
				for (let i$1 = mana.children.length - 1; i$1 >= 0; i$1--) {
					const node = mana.children[i$1];
					if (!node.attributes) continue;
					if (componentIds.includes(node.attributes[HAIKU_ID_ATTRIBUTE])) {
						const timelineSelector = `haiku:${node.attributes[HAIKU_ID_ATTRIBUTE]}`;
						nodesToRegroup.push(node);
						mana.children.splice(i$1, 1);
						if (!originalTimeline[timelineSelector]) continue;
						const propertyGroup = Object.keys(originalTimeline[timelineSelector]).reduce((accumulator, propertyName) => {
							if (LAYOUT_3D_SCHEMA[propertyName]) accumulator[propertyName] = { 0: { value: this.getComputedPropertyValue(mana, node.attributes[HAIKU_ID_ATTRIBUTE], timelineName, this.getCurrentTimelineTime(), propertyName, void 0) } };
							return accumulator;
						}, {});
						Bytecode$1.replaceTimelinePropertyGroups(bytecode, timelineName, timelineSelector, propertyGroup);
					}
				}
				groupMana.children[0].children = nodesToRegroup;
				const stackingInfo = Template$1.getStackingInfo(bytecode, mana, timelineName, timelineTime);
				const stackObject = this.grabStackObjectFromStackingInfo(stackingInfo, groupComponentId);
				const ourStackObject = stackObject && stackObject.ourStackObject;
				if (ourStackObject) stackingInfo.push(ourStackObject);
				else logger$4.warn(`[active component] stack object missing at ${timelineName} ${timelineTime}`);
				this.setZIndicesForStackingInfo(bytecode, timelineName, timelineTime, stackingInfo);
				done$1(null, groupComponentId);
			}, cb);
		}
		/**
		* @method ungroupElements
		*/
		ungroupElements(componentId, nodes, metadata, cb) {
			return this.project.updateHook("ungroupElements", this.getRelpath(), componentId, nodes, metadata, (fire) => {
				const clonedNodes = lodash$1.cloneDeep(nodes);
				return this.ungroupElementsActual(componentId, clonedNodes, metadata, (err, ungroupedComponentIds) => {
					if (err) {
						logger$4.error(`[active component (${this.project.getAlias()})]`, err);
						return cb(err);
					}
					return this.reload({
						hardReload: true,
						clearCacheOptions: { doClearEntityCaches: true }
					}, null, () => {
						fire(null, ungroupedComponentIds);
						return cb();
					});
				});
			});
		}
		ungroupElementsActual(componentId, nodes, metadata, cb) {
			return this.performComponentWork((bytecode, mana, done$1) => {
				const updatedComponentIds = nodes.map((node) => {
					const componentId$1 = this.instantiateManaInBytecode(node, bytecode, {}, void 0);
					Template$1.visitManaTree(node, (elementName, attributes, children, componentMana) => {
						if (attributes && attributes["haiku-transclude"]) {
							const originalComponent = this.getTemplateNodesByComponentId()[attributes["haiku-transclude"]];
							if (originalComponent) {
								children.push(...originalComponent.children);
								if (elementName === "__component__") {
									componentMana.elementName = originalComponent.elementName;
									attributes["haiku-var"] = originalComponent.attributes["haiku-var"];
								}
							}
							delete attributes["haiku-transclude"];
						}
					});
					return componentId$1;
				});
				this.deleteElementImpl(mana, componentId);
				done$1(null, updatedComponentIds);
			}, cb);
		}
		/**
		* @method upsertStateValue
		*/
		upsertStateValue(stateName, stateDescriptorSerial, metadata, cb) {
			const stateDescriptor = Bytecode$1.unserializeValue(stateDescriptorSerial, (ref) => {
				return this.evaluateReference(ref);
			});
			return this.project.updateHook("upsertStateValue", this.getRelpath(), stateName, Bytecode$1.serializeValue(stateDescriptor), metadata, (fire) => {
				stateDescriptor.edited = true;
				return this.upsertStateValueActual(stateName, stateDescriptor, metadata, (err) => {
					if (err) {
						logger$4.error(`[active component (${this.project.getAlias()})]`, err);
						return cb(err);
					}
					return this.reload({
						hardReload: this.project.isRemoteRequest(metadata),
						forceFlush: true,
						clearCacheOptions: {
							doClearEntityCaches: true,
							clearStates: true
						}
					}, null, () => {
						fire();
						return cb();
					});
				});
			});
		}
		upsertStateValueActual(stateName, stateDescriptor, metadata, cb) {
			return this.performComponentWork((bytecode, mana, done$1) => {
				Bytecode$1.upsertStateValue(bytecode, stateName, stateDescriptor);
				done$1();
			}, cb);
		}
		/**
		* @method deleteStateValue
		*/
		deleteStateValue(stateName, metadata, cb) {
			return this.project.updateHook("deleteStateValue", this.getRelpath(), stateName, metadata, (fire) => {
				return this.deleteStateValueActual(stateName, metadata, (err) => {
					if (err) {
						logger$4.error(`[active component (${this.project.getAlias()})]`, err);
						return cb(err);
					}
					return this.reload({
						hardReload: this.project.isRemoteRequest(metadata),
						forceFlush: true,
						clearCacheOptions: {
							doClearEntityCaches: true,
							clearStates: true
						}
					}, null, () => {
						fire();
						return cb();
					});
				});
			});
		}
		deleteStateValueActual(stateName, metadata, cb) {
			return this.performComponentWork((bytecode, mana, done$1) => {
				Bytecode$1.deleteStateValue(bytecode, stateName);
				done$1();
			}, cb);
		}
		/**
		* @method zShiftIndices
		*
		* @param {string} componentId ID of the component to change the zIndex value
		* @param {string} timelineName Name of the timeline
		* @param {string} timelineTime Time in which the change should be saved
		* @param {string} newIndex New zIndex value
		* @param {object} metadata
		* @param {function} cb
		*/
		zShiftIndices(componentId, timelineName, timelineTime, newIndex, metadata, cb) {
			return this.project.updateHook("zShiftIndices", this.getRelpath(), componentId, timelineName, timelineTime, newIndex, metadata, (fire) => {
				return this.zShiftIndicesActual(componentId, timelineName, timelineTime, newIndex, metadata, (err, stackingInfo) => {
					if (err) {
						logger$4.error(`[active component (${this.project.getAlias()})]`, err);
						return cb(err);
					}
					return this.reload({
						hardReload: this.project.isRemoteRequest(metadata),
						forceFlush: true,
						clearCacheOptions: { doClearEntityCaches: true }
					}, null, () => {
						fire();
						return cb();
					});
				});
			});
		}
		zShiftIndicesImpl(bytecode, componentId, timelineName, timelineTime, newIndex) {
			const stackingInfo = Template$1.getStackingInfo(bytecode, bytecode.template, timelineName, timelineTime);
			this.grabStackObjectFromStackingInfo(stackingInfo, componentId);
			stackingInfo.splice(newIndex, 0, {
				haikuId: componentId,
				zIndex: newIndex
			});
			this.setZIndicesForStackingInfo(bytecode, timelineName, timelineTime, stackingInfo);
			return stackingInfo;
		}
		zShiftIndicesActual(componentId, timelineName, timelineTime, newIndex, metadata, cb) {
			let stackingInfo;
			return this.performComponentTimelinesWork((bytecode, mana, timelines, done$1) => {
				stackingInfo = this.zShiftIndicesImpl(bytecode, componentId, timelineName, timelineTime, newIndex);
				done$1();
			}, (err) => {
				cb(err, stackingInfo);
			});
		}
		/**
		* @method zMoveToFront
		*/
		zMoveToFront(componentId, timelineName, timelineTime, metadata, cb) {
			return this.project.updateHook("zMoveToFront", this.getRelpath(), componentId, timelineName, timelineTime, metadata, (fire) => {
				return this.zMoveToFrontActual(componentId, timelineName, timelineTime, metadata, (err, stackingInfo) => {
					if (err) {
						logger$4.error(`[active component (${this.project.getAlias()})]`, err);
						return cb(err);
					}
					return this.reload({
						hardReload: this.project.isRemoteRequest(metadata),
						forceFlush: true,
						clearCacheOptions: { doClearEntityCaches: true }
					}, null, () => {
						fire();
						return cb();
					});
				});
			});
		}
		zMoveToFrontImpl(bytecode, componentId, timelineName, timelineTime) {
			const stackingInfo = Template$1.getStackingInfo(bytecode, bytecode.template, timelineName, timelineTime);
			this.grabStackObjectFromStackingInfo(stackingInfo, componentId);
			stackingInfo.push({
				haikuId: componentId,
				zIndex: stackingInfo.length > 0 ? stackingInfo[stackingInfo.length - 1].zIndex + 1 : 1
			});
			this.setZIndicesForStackingInfo(bytecode, timelineName, timelineTime, stackingInfo);
			return stackingInfo;
		}
		zMoveToFrontActual(componentId, timelineName, timelineTime, metadata, cb) {
			let stackingInfo;
			return this.performComponentTimelinesWork((bytecode, mana, timelines, done$1) => {
				stackingInfo = this.zMoveToFrontImpl(bytecode, componentId, timelineName, timelineTime);
				done$1();
			}, (err) => {
				cb(err, stackingInfo);
			});
		}
		/**
		* @method zMoveForward
		*/
		zMoveForward(componentId, timelineName, timelineTime, metadata, cb) {
			return this.project.updateHook("zMoveForward", this.getRelpath(), componentId, timelineName, timelineTime, metadata, (fire) => {
				return this.zMoveForwardActual(componentId, timelineName, timelineTime, metadata, (err, stackingInfo) => {
					if (err) {
						logger$4.error(`[active component (${this.project.getAlias()})]`, err);
						return cb(err);
					}
					return this.reload({
						hardReload: this.project.isRemoteRequest(metadata),
						forceFlush: true,
						clearCacheOptions: { doClearEntityCaches: true }
					}, null, () => {
						fire();
						return cb();
					});
				});
			});
		}
		zMoveForwardActual(componentId, timelineName, timelineTime, metadata, cb) {
			let stackingInfo;
			return this.performComponentTimelinesWork((bytecode, mana, timelines, done$1) => {
				stackingInfo = Template$1.getStackingInfo(bytecode, mana, timelineName, timelineTime);
				const stackObject = this.grabStackObjectFromStackingInfo(stackingInfo, componentId);
				const ourStackObject = stackObject && stackObject.ourStackObject;
				if (ourStackObject) {
					const index = stackObject.index;
					stackingInfo.splice(index + 1, 0, ourStackObject);
				} else logger$4.warn(`[active component] stack object missing at ${timelineName} ${timelineTime}`);
				this.setZIndicesForStackingInfo(bytecode, timelineName, timelineTime, stackingInfo);
				done$1();
			}, (err) => {
				cb(err, stackingInfo);
			});
		}
		/**
		* @method zMoveBackward
		*/
		zMoveBackward(componentId, timelineName, timelineTime, metadata, cb) {
			return this.project.updateHook("zMoveBackward", this.getRelpath(), componentId, timelineName, timelineTime, metadata, (fire) => {
				return this.zMoveBackwardActual(componentId, timelineName, timelineTime, metadata, (err, stackingInfo) => {
					if (err) {
						logger$4.error(`[active component (${this.project.getAlias()})]`, err);
						return cb(err);
					}
					return this.reload({
						hardReload: this.project.isRemoteRequest(metadata),
						forceFlush: true,
						clearCacheOptions: { doClearEntityCaches: true }
					}, null, () => {
						fire();
						return cb();
					});
				});
			});
		}
		zMoveBackwardActual(componentId, timelineName, timelineTime, metadata, cb) {
			let stackingInfo;
			return this.performComponentTimelinesWork((bytecode, mana, timelines, done$1) => {
				stackingInfo = Template$1.getStackingInfo(bytecode, mana, timelineName, timelineTime);
				const stackObject = this.grabStackObjectFromStackingInfo(stackingInfo, componentId);
				const ourStackObject = stackObject && stackObject.ourStackObject;
				if (ourStackObject) {
					const index = stackObject.index;
					stackingInfo.splice(Math.max(index - 1, 0), 0, ourStackObject);
				} else logger$4.warn(`[active component] stack object missing at ${timelineName} ${timelineTime}`);
				this.setZIndicesForStackingInfo(bytecode, timelineName, timelineTime, stackingInfo);
				done$1();
			}, (err) => {
				cb(err, stackingInfo);
			});
		}
		/**
		* @method zMoveToBack
		*/
		zMoveToBack(componentId, timelineName, timelineTime, metadata, cb) {
			return this.project.updateHook("zMoveToBack", this.getRelpath(), componentId, timelineName, timelineTime, metadata, (fire) => {
				return this.zMoveToBackActual(componentId, timelineName, timelineTime, metadata, (err, stackingInfo) => {
					if (err) {
						logger$4.error(`[active component (${this.project.getAlias()})]`, err);
						return cb(err);
					}
					return this.reload({
						hardReload: this.project.isRemoteRequest(metadata),
						forceFlush: true,
						clearCacheOptions: { doClearEntityCaches: true }
					}, null, () => {
						fire();
						return cb();
					});
				});
			});
		}
		zMoveToBackActual(componentId, timelineName, timelineTime, metadata, cb) {
			let stackingInfo;
			return this.performComponentTimelinesWork((bytecode, mana, timelines, done$1) => {
				stackingInfo = Template$1.getStackingInfo(bytecode, mana, timelineName, timelineTime);
				this.grabStackObjectFromStackingInfo(stackingInfo, componentId);
				stackingInfo.unshift({
					haikuId: componentId,
					zIndex: 1
				});
				this.setZIndicesForStackingInfo(bytecode, timelineName, timelineTime, stackingInfo);
				done$1();
			}, (err) => {
				cb(err, stackingInfo);
			});
		}
		/**
		* @method createTimeline
		*/
		createTimeline(timelineName, timelineDescriptorSerial, metadata, cb) {
			const timelineDescriptor = Bytecode$1.unserializeValue(timelineDescriptorSerial, (ref) => {
				return this.evaluateReference(ref);
			});
			return this.project.updateHook("createTimeline", this.getRelpath(), timelineName, Bytecode$1.serializeValue(timelineDescriptor), metadata, (fire) => {
				return this.createTimelineActual(timelineName, timelineDescriptor, metadata, (err) => {
					if (err) {
						logger$4.error(`[active component (${this.project.getAlias()})]`, err);
						return cb(err);
					}
					return this.reload({
						hardReload: this.project.isRemoteRequest(metadata),
						clearCacheOptions: { doClearEntityCaches: true }
					}, null, () => {
						fire();
						return cb();
					});
				});
			});
		}
		createTimelineActual(timelineName, timelineDescriptor, metadata, cb) {
			return this.performComponentWork((bytecode, mana, done$1) => {
				Bytecode$1.createTimeline(bytecode, timelineName, timelineDescriptor);
				done$1();
			}, cb);
		}
		/**
		* @method renameTimeline
		*/
		renameTimeline(timelineNameOld, timelineNameNew, metadata, cb) {
			return this.project.updateHook("renameTimeline", this.getRelpath(), timelineNameOld, timelineNameNew, metadata, (fire) => {
				return this.renameTimelineActual(timelineNameOld, timelineNameNew, metadata, (err) => {
					if (err) {
						logger$4.error(`[active component (${this.project.getAlias()})]`, err);
						return cb(err);
					}
					return this.reload({
						hardReload: this.project.isRemoteRequest(metadata),
						clearCacheOptions: { doClearEntityCaches: true }
					}, null, () => {
						fire();
						return cb();
					});
				});
			});
		}
		renameTimelineActual(timelineNameOld, timelineNameNew, metadata, cb) {
			return this.performComponentWork((bytecode, mana, done$1) => {
				Bytecode$1.renameTimeline(bytecode, timelineNameOld, timelineNameNew);
				done$1();
			}, cb);
		}
		/**
		* @method deleteTimeline
		*/
		deleteTimeline(timelineName, metadata, cb) {
			return this.project.updateHook("deleteTimeline", this.getRelpath(), timelineName, metadata, (fire) => {
				return this.deleteTimelineActual(timelineName, metadata, (err) => {
					if (err) {
						logger$4.error(`[active component (${this.project.getAlias()})]`, err);
						return cb(err);
					}
					return this.reload({
						hardReload: this.project.isRemoteRequest(metadata),
						clearCacheOptions: { doClearEntityCaches: true }
					}, null, () => {
						fire();
						return cb();
					});
				});
			});
		}
		deleteTimelineActual(timelineName, metadata, cb) {
			return this.performComponentWork((bytecode, mana, done$1) => {
				Bytecode$1.deleteTimeline(bytecode, timelineName);
				done$1();
			}, cb);
		}
		/**
		* @method duplicateTimeline
		*/
		duplicateTimeline(timelineName, metadata, cb) {
			return this.project.updateHook("duplicateTimeline", this.getRelpath(), timelineName, metadata, (fire) => {
				return this.duplicateTimelineActual(timelineName, metadata, (err) => {
					if (err) {
						logger$4.error(`[active component (${this.project.getAlias()})]`, err);
						return cb(err);
					}
					return this.reload({
						hardReload: this.project.isRemoteRequest(metadata),
						clearCacheOptions: { doClearEntityCaches: true }
					}, null, () => {
						fire();
						return cb();
					});
				});
			});
		}
		duplicateTimelineActual(timelineName, metadata, cb) {
			return this.performComponentWork((bytecode, mana, done$1) => {
				Bytecode$1.duplicateTimeline(bytecode, timelineName);
				done$1();
			}, cb);
		}
		/**
		* @method changePlaybackSpeed
		*/
		changePlaybackSpeed(framesPerSecond, metadata, cb) {
			return this.project.updateHook("changePlaybackSpeed", this.getRelpath(), framesPerSecond, metadata, (fire) => {
				return this.changePlaybackSpeedActual(framesPerSecond, metadata, (err) => {
					if (err) {
						logger$4.error(`[active component (${this.project.getAlias()})]`, err);
						return cb(err);
					}
					return this.reload({
						hardReload: this.project.isRemoteRequest(metadata),
						clearCacheOptions: { doClearEntityCaches: true }
					}, null, () => {
						fire();
						return cb();
					});
				});
			});
		}
		changePlaybackSpeedActual(framesPerSecond, metadata, cb) {
			return this.performComponentWork((bytecode, mana, done$1) => {
				Bytecode$1.changePlaybackSpeed(bytecode, framesPerSecond);
				done$1();
			}, cb);
		}
		/**
		* @method getNormalizedBytecodeSHA
		* @description Return a SHA256 for the current in-mem bytecode.
		*/
		getNormalizedBytecodeSHA() {
			return CryptoUtils$1.sha256(this.getNormalizedBytecodeJSON());
		}
		getNormalizedBytecode() {
			return AST$1.normalizeBytecode(this.getReifiedBytecode());
		}
		getNormalizedBytecodeJSON() {
			return jss$1(this.getNormalizedBytecode());
		}
		/**
		* @method dump
		* @description Use this to log a concise shorthand of this entity.
		*/
		dump() {
			const relpath = this.getRelpath();
			const aid = this.getArtboard().getElementHaikuId();
			return `${relpath}(${this.getMount().getRenderId()})@${aid}/${this.interactionMode}`;
		}
		checkSustainedWarnings() {
			this.sustainedWarningsChecker.checkAndGetAllSustainedWarnings();
		}
		syncCode(currentEditorContents, metadata, cb) {
			const absPath = this.fetchActiveBytecodeFile().getAbspath();
			return Lock$2.request(Lock$2.LOCKS.FileReadWrite(absPath), false, (release) => {
				return this.project.updateHook("syncCode", this.getRelpath(), currentEditorContents, metadata, (fire) => {
					try {
						const bytecode = ModuleWrapper$2.testLoadBytecode(currentEditorContents, absPath);
						this.fetchActiveBytecodeFile().updateContents(currentEditorContents);
						this.handleUpdatedBytecode(bytecode);
					} catch (requireError) {
						release();
						return cb(requireError);
					}
					release();
					fire();
					return this.moduleSync(cb);
				});
			});
		}
	};
	ActiveComponent$2.DEFAULT_OPTIONS = { required: {
		uid: true,
		file: true,
		project: true,
		relpath: true,
		scenename: true
	} };
	BaseModel$3.extend(ActiveComponent$2);
	ActiveComponent$2.buildPrimaryKey = (folder, scenename) => {
		return `${folder.replace(/\\/g, "/")}::${scenename}`;
	};
	/**
	* Used in multi-component scenarios to avoid interop issues when switching context
	* dealing between multiple component instances that share the same bytecode.
	*/
	ActiveComponent$2.memorySafeBytecode = (bytecode, instance) => {
		const safe = {};
		for (const key in bytecode) if (key === "template") safe[key] = clone(bytecode[key], instance);
		else safe[key] = bytecode[key];
		return safe;
	};
	module.exports = ActiveComponent$2;
	const Artboard$1 = require_Artboard();
	const Asset$2 = require_Asset();
	const AST$1 = require_AST();
	const Bytecode$1 = require_Bytecode();
	const Element$1 = require_Element();
	const ElementSelectionProxy$1 = require_ElementSelectionProxy();
	const File$2 = require_File();
	const ImageComponent$1 = require_ImageComponent();
	const InstalledComponent$1 = require_InstalledComponent();
	const Keyframe$1 = require_Keyframe();
	const ModuleWrapper$2 = require_ModuleWrapper();
	const MountElement$1 = require_MountElement();
	const Property$1 = require_Property();
	const PseudoFile$1 = require_PseudoFile();
	const Row$1 = require_Row();
	const SelectionMarquee$1 = require_SelectionMarquee();
	const Template$1 = require_Template();
	const Timeline$1 = require_Timeline();
	const TimelineProperty$1 = require_TimelineProperty();
}) });

//#endregion
//#region ../../node_modules/.pnpm/semver@5.7.2/node_modules/semver/semver.js
var require_semver = /* @__PURE__ */ __commonJS({ "../../node_modules/.pnpm/semver@5.7.2/node_modules/semver/semver.js": ((exports, module) => {
	exports = module.exports = SemVer;
	var debug;
	/* istanbul ignore next */
	if (typeof process === "object" && process.env && process.env.NODE_DEBUG && /\bsemver\b/i.test(process.env.NODE_DEBUG)) debug = function() {
		var args = Array.prototype.slice.call(arguments, 0);
		args.unshift("SEMVER");
		console.log.apply(console, args);
	};
	else debug = function() {};
	exports.SEMVER_SPEC_VERSION = "2.0.0";
	var MAX_LENGTH = 256;
	var MAX_SAFE_INTEGER = Number.MAX_SAFE_INTEGER || 9007199254740991;
	var MAX_SAFE_COMPONENT_LENGTH = 16;
	var MAX_SAFE_BUILD_LENGTH = MAX_LENGTH - 6;
	var re = exports.re = [];
	var safeRe = exports.safeRe = [];
	var src = exports.src = [];
	var R = 0;
	var LETTERDASHNUMBER = "[a-zA-Z0-9-]";
	var safeRegexReplacements = [
		["\\s", 1],
		["\\d", MAX_LENGTH],
		[LETTERDASHNUMBER, MAX_SAFE_BUILD_LENGTH]
	];
	function makeSafeRe(value) {
		for (var i$1 = 0; i$1 < safeRegexReplacements.length; i$1++) {
			var token$2 = safeRegexReplacements[i$1][0];
			var max = safeRegexReplacements[i$1][1];
			value = value.split(token$2 + "*").join(token$2 + "{0," + max + "}").split(token$2 + "+").join(token$2 + "{1," + max + "}");
		}
		return value;
	}
	var NUMERICIDENTIFIER = R++;
	src[NUMERICIDENTIFIER] = "0|[1-9]\\d*";
	var NUMERICIDENTIFIERLOOSE = R++;
	src[NUMERICIDENTIFIERLOOSE] = "\\d+";
	var NONNUMERICIDENTIFIER = R++;
	src[NONNUMERICIDENTIFIER] = "\\d*[a-zA-Z-]" + LETTERDASHNUMBER + "*";
	var MAINVERSION = R++;
	src[MAINVERSION] = "(" + src[NUMERICIDENTIFIER] + ")\\.(" + src[NUMERICIDENTIFIER] + ")\\.(" + src[NUMERICIDENTIFIER] + ")";
	var MAINVERSIONLOOSE = R++;
	src[MAINVERSIONLOOSE] = "(" + src[NUMERICIDENTIFIERLOOSE] + ")\\.(" + src[NUMERICIDENTIFIERLOOSE] + ")\\.(" + src[NUMERICIDENTIFIERLOOSE] + ")";
	var PRERELEASEIDENTIFIER = R++;
	src[PRERELEASEIDENTIFIER] = "(?:" + src[NUMERICIDENTIFIER] + "|" + src[NONNUMERICIDENTIFIER] + ")";
	var PRERELEASEIDENTIFIERLOOSE = R++;
	src[PRERELEASEIDENTIFIERLOOSE] = "(?:" + src[NUMERICIDENTIFIERLOOSE] + "|" + src[NONNUMERICIDENTIFIER] + ")";
	var PRERELEASE = R++;
	src[PRERELEASE] = "(?:-(" + src[PRERELEASEIDENTIFIER] + "(?:\\." + src[PRERELEASEIDENTIFIER] + ")*))";
	var PRERELEASELOOSE = R++;
	src[PRERELEASELOOSE] = "(?:-?(" + src[PRERELEASEIDENTIFIERLOOSE] + "(?:\\." + src[PRERELEASEIDENTIFIERLOOSE] + ")*))";
	var BUILDIDENTIFIER = R++;
	src[BUILDIDENTIFIER] = LETTERDASHNUMBER + "+";
	var BUILD = R++;
	src[BUILD] = "(?:\\+(" + src[BUILDIDENTIFIER] + "(?:\\." + src[BUILDIDENTIFIER] + ")*))";
	var FULL = R++;
	var FULLPLAIN = "v?" + src[MAINVERSION] + src[PRERELEASE] + "?" + src[BUILD] + "?";
	src[FULL] = "^" + FULLPLAIN + "$";
	var LOOSEPLAIN = "[v=\\s]*" + src[MAINVERSIONLOOSE] + src[PRERELEASELOOSE] + "?" + src[BUILD] + "?";
	var LOOSE = R++;
	src[LOOSE] = "^" + LOOSEPLAIN + "$";
	var GTLT = R++;
	src[GTLT] = "((?:<|>)?=?)";
	var XRANGEIDENTIFIERLOOSE = R++;
	src[XRANGEIDENTIFIERLOOSE] = src[NUMERICIDENTIFIERLOOSE] + "|x|X|\\*";
	var XRANGEIDENTIFIER = R++;
	src[XRANGEIDENTIFIER] = src[NUMERICIDENTIFIER] + "|x|X|\\*";
	var XRANGEPLAIN = R++;
	src[XRANGEPLAIN] = "[v=\\s]*(" + src[XRANGEIDENTIFIER] + ")(?:\\.(" + src[XRANGEIDENTIFIER] + ")(?:\\.(" + src[XRANGEIDENTIFIER] + ")(?:" + src[PRERELEASE] + ")?" + src[BUILD] + "?)?)?";
	var XRANGEPLAINLOOSE = R++;
	src[XRANGEPLAINLOOSE] = "[v=\\s]*(" + src[XRANGEIDENTIFIERLOOSE] + ")(?:\\.(" + src[XRANGEIDENTIFIERLOOSE] + ")(?:\\.(" + src[XRANGEIDENTIFIERLOOSE] + ")(?:" + src[PRERELEASELOOSE] + ")?" + src[BUILD] + "?)?)?";
	var XRANGE = R++;
	src[XRANGE] = "^" + src[GTLT] + "\\s*" + src[XRANGEPLAIN] + "$";
	var XRANGELOOSE = R++;
	src[XRANGELOOSE] = "^" + src[GTLT] + "\\s*" + src[XRANGEPLAINLOOSE] + "$";
	var COERCE = R++;
	src[COERCE] = "(?:^|[^\\d])(\\d{1," + MAX_SAFE_COMPONENT_LENGTH + "})(?:\\.(\\d{1," + MAX_SAFE_COMPONENT_LENGTH + "}))?(?:\\.(\\d{1," + MAX_SAFE_COMPONENT_LENGTH + "}))?(?:$|[^\\d])";
	var LONETILDE = R++;
	src[LONETILDE] = "(?:~>?)";
	var TILDETRIM = R++;
	src[TILDETRIM] = "(\\s*)" + src[LONETILDE] + "\\s+";
	re[TILDETRIM] = new RegExp(src[TILDETRIM], "g");
	safeRe[TILDETRIM] = new RegExp(makeSafeRe(src[TILDETRIM]), "g");
	var tildeTrimReplace = "$1~";
	var TILDE = R++;
	src[TILDE] = "^" + src[LONETILDE] + src[XRANGEPLAIN] + "$";
	var TILDELOOSE = R++;
	src[TILDELOOSE] = "^" + src[LONETILDE] + src[XRANGEPLAINLOOSE] + "$";
	var LONECARET = R++;
	src[LONECARET] = "(?:\\^)";
	var CARETTRIM = R++;
	src[CARETTRIM] = "(\\s*)" + src[LONECARET] + "\\s+";
	re[CARETTRIM] = new RegExp(src[CARETTRIM], "g");
	safeRe[CARETTRIM] = new RegExp(makeSafeRe(src[CARETTRIM]), "g");
	var caretTrimReplace = "$1^";
	var CARET = R++;
	src[CARET] = "^" + src[LONECARET] + src[XRANGEPLAIN] + "$";
	var CARETLOOSE = R++;
	src[CARETLOOSE] = "^" + src[LONECARET] + src[XRANGEPLAINLOOSE] + "$";
	var COMPARATORLOOSE = R++;
	src[COMPARATORLOOSE] = "^" + src[GTLT] + "\\s*(" + LOOSEPLAIN + ")$|^$";
	var COMPARATOR = R++;
	src[COMPARATOR] = "^" + src[GTLT] + "\\s*(" + FULLPLAIN + ")$|^$";
	var COMPARATORTRIM = R++;
	src[COMPARATORTRIM] = "(\\s*)" + src[GTLT] + "\\s*(" + LOOSEPLAIN + "|" + src[XRANGEPLAIN] + ")";
	re[COMPARATORTRIM] = new RegExp(src[COMPARATORTRIM], "g");
	safeRe[COMPARATORTRIM] = new RegExp(makeSafeRe(src[COMPARATORTRIM]), "g");
	var comparatorTrimReplace = "$1$2$3";
	var HYPHENRANGE = R++;
	src[HYPHENRANGE] = "^\\s*(" + src[XRANGEPLAIN] + ")\\s+-\\s+(" + src[XRANGEPLAIN] + ")\\s*$";
	var HYPHENRANGELOOSE = R++;
	src[HYPHENRANGELOOSE] = "^\\s*(" + src[XRANGEPLAINLOOSE] + ")\\s+-\\s+(" + src[XRANGEPLAINLOOSE] + ")\\s*$";
	var STAR = R++;
	src[STAR] = "(<|>)?=?\\s*\\*";
	for (var i = 0; i < R; i++) {
		debug(i, src[i]);
		if (!re[i]) {
			re[i] = new RegExp(src[i]);
			safeRe[i] = new RegExp(makeSafeRe(src[i]));
		}
	}
	exports.parse = parse$1;
	function parse$1(version, options) {
		if (!options || typeof options !== "object") options = {
			loose: !!options,
			includePrerelease: false
		};
		if (version instanceof SemVer) return version;
		if (typeof version !== "string") return null;
		if (version.length > MAX_LENGTH) return null;
		if (!(options.loose ? safeRe[LOOSE] : safeRe[FULL]).test(version)) return null;
		try {
			return new SemVer(version, options);
		} catch (er) {
			return null;
		}
	}
	exports.valid = valid;
	function valid(version, options) {
		var v = parse$1(version, options);
		return v ? v.version : null;
	}
	exports.clean = clean;
	function clean(version, options) {
		var s = parse$1(version.trim().replace(/^[=v]+/, ""), options);
		return s ? s.version : null;
	}
	exports.SemVer = SemVer;
	function SemVer(version, options) {
		if (!options || typeof options !== "object") options = {
			loose: !!options,
			includePrerelease: false
		};
		if (version instanceof SemVer) if (version.loose === options.loose) return version;
		else version = version.version;
		else if (typeof version !== "string") throw new TypeError("Invalid Version: " + version);
		if (version.length > MAX_LENGTH) throw new TypeError("version is longer than " + MAX_LENGTH + " characters");
		if (!(this instanceof SemVer)) return new SemVer(version, options);
		debug("SemVer", version, options);
		this.options = options;
		this.loose = !!options.loose;
		var m = version.trim().match(options.loose ? safeRe[LOOSE] : safeRe[FULL]);
		if (!m) throw new TypeError("Invalid Version: " + version);
		this.raw = version;
		this.major = +m[1];
		this.minor = +m[2];
		this.patch = +m[3];
		if (this.major > MAX_SAFE_INTEGER || this.major < 0) throw new TypeError("Invalid major version");
		if (this.minor > MAX_SAFE_INTEGER || this.minor < 0) throw new TypeError("Invalid minor version");
		if (this.patch > MAX_SAFE_INTEGER || this.patch < 0) throw new TypeError("Invalid patch version");
		if (!m[4]) this.prerelease = [];
		else this.prerelease = m[4].split(".").map(function(id$1) {
			if (/^[0-9]+$/.test(id$1)) {
				var num = +id$1;
				if (num >= 0 && num < MAX_SAFE_INTEGER) return num;
			}
			return id$1;
		});
		this.build = m[5] ? m[5].split(".") : [];
		this.format();
	}
	SemVer.prototype.format = function() {
		this.version = this.major + "." + this.minor + "." + this.patch;
		if (this.prerelease.length) this.version += "-" + this.prerelease.join(".");
		return this.version;
	};
	SemVer.prototype.toString = function() {
		return this.version;
	};
	SemVer.prototype.compare = function(other) {
		debug("SemVer.compare", this.version, this.options, other);
		if (!(other instanceof SemVer)) other = new SemVer(other, this.options);
		return this.compareMain(other) || this.comparePre(other);
	};
	SemVer.prototype.compareMain = function(other) {
		if (!(other instanceof SemVer)) other = new SemVer(other, this.options);
		return compareIdentifiers(this.major, other.major) || compareIdentifiers(this.minor, other.minor) || compareIdentifiers(this.patch, other.patch);
	};
	SemVer.prototype.comparePre = function(other) {
		if (!(other instanceof SemVer)) other = new SemVer(other, this.options);
		if (this.prerelease.length && !other.prerelease.length) return -1;
		else if (!this.prerelease.length && other.prerelease.length) return 1;
		else if (!this.prerelease.length && !other.prerelease.length) return 0;
		var i$1 = 0;
		do {
			var a = this.prerelease[i$1];
			var b = other.prerelease[i$1];
			debug("prerelease compare", i$1, a, b);
			if (a === void 0 && b === void 0) return 0;
			else if (b === void 0) return 1;
			else if (a === void 0) return -1;
			else if (a === b) continue;
			else return compareIdentifiers(a, b);
		} while (++i$1);
	};
	SemVer.prototype.inc = function(release, identifier) {
		switch (release) {
			case "premajor":
				this.prerelease.length = 0;
				this.patch = 0;
				this.minor = 0;
				this.major++;
				this.inc("pre", identifier);
				break;
			case "preminor":
				this.prerelease.length = 0;
				this.patch = 0;
				this.minor++;
				this.inc("pre", identifier);
				break;
			case "prepatch":
				this.prerelease.length = 0;
				this.inc("patch", identifier);
				this.inc("pre", identifier);
				break;
			case "prerelease":
				if (this.prerelease.length === 0) this.inc("patch", identifier);
				this.inc("pre", identifier);
				break;
			case "major":
				if (this.minor !== 0 || this.patch !== 0 || this.prerelease.length === 0) this.major++;
				this.minor = 0;
				this.patch = 0;
				this.prerelease = [];
				break;
			case "minor":
				if (this.patch !== 0 || this.prerelease.length === 0) this.minor++;
				this.patch = 0;
				this.prerelease = [];
				break;
			case "patch":
				if (this.prerelease.length === 0) this.patch++;
				this.prerelease = [];
				break;
			case "pre":
				if (this.prerelease.length === 0) this.prerelease = [0];
				else {
					var i$1 = this.prerelease.length;
					while (--i$1 >= 0) if (typeof this.prerelease[i$1] === "number") {
						this.prerelease[i$1]++;
						i$1 = -2;
					}
					if (i$1 === -1) this.prerelease.push(0);
				}
				if (identifier) if (this.prerelease[0] === identifier) {
					if (isNaN(this.prerelease[1])) this.prerelease = [identifier, 0];
				} else this.prerelease = [identifier, 0];
				break;
			default: throw new Error("invalid increment argument: " + release);
		}
		this.format();
		this.raw = this.version;
		return this;
	};
	exports.inc = inc;
	function inc(version, release, loose, identifier) {
		if (typeof loose === "string") {
			identifier = loose;
			loose = void 0;
		}
		try {
			return new SemVer(version, loose).inc(release, identifier).version;
		} catch (er) {
			return null;
		}
	}
	exports.diff = diff;
	function diff(version1, version2) {
		if (eq(version1, version2)) return null;
		else {
			var v1 = parse$1(version1);
			var v2 = parse$1(version2);
			var prefix = "";
			if (v1.prerelease.length || v2.prerelease.length) {
				prefix = "pre";
				var defaultResult = "prerelease";
			}
			for (var key in v1) if (key === "major" || key === "minor" || key === "patch") {
				if (v1[key] !== v2[key]) return prefix + key;
			}
			return defaultResult;
		}
	}
	exports.compareIdentifiers = compareIdentifiers;
	var numeric = /^[0-9]+$/;
	function compareIdentifiers(a, b) {
		var anum = numeric.test(a);
		var bnum = numeric.test(b);
		if (anum && bnum) {
			a = +a;
			b = +b;
		}
		return a === b ? 0 : anum && !bnum ? -1 : bnum && !anum ? 1 : a < b ? -1 : 1;
	}
	exports.rcompareIdentifiers = rcompareIdentifiers;
	function rcompareIdentifiers(a, b) {
		return compareIdentifiers(b, a);
	}
	exports.major = major;
	function major(a, loose) {
		return new SemVer(a, loose).major;
	}
	exports.minor = minor;
	function minor(a, loose) {
		return new SemVer(a, loose).minor;
	}
	exports.patch = patch;
	function patch(a, loose) {
		return new SemVer(a, loose).patch;
	}
	exports.compare = compare;
	function compare(a, b, loose) {
		return new SemVer(a, loose).compare(new SemVer(b, loose));
	}
	exports.compareLoose = compareLoose;
	function compareLoose(a, b) {
		return compare(a, b, true);
	}
	exports.rcompare = rcompare;
	function rcompare(a, b, loose) {
		return compare(b, a, loose);
	}
	exports.sort = sort;
	function sort(list, loose) {
		return list.sort(function(a, b) {
			return exports.compare(a, b, loose);
		});
	}
	exports.rsort = rsort;
	function rsort(list, loose) {
		return list.sort(function(a, b) {
			return exports.rcompare(a, b, loose);
		});
	}
	exports.gt = gt;
	function gt(a, b, loose) {
		return compare(a, b, loose) > 0;
	}
	exports.lt = lt;
	function lt(a, b, loose) {
		return compare(a, b, loose) < 0;
	}
	exports.eq = eq;
	function eq(a, b, loose) {
		return compare(a, b, loose) === 0;
	}
	exports.neq = neq;
	function neq(a, b, loose) {
		return compare(a, b, loose) !== 0;
	}
	exports.gte = gte;
	function gte(a, b, loose) {
		return compare(a, b, loose) >= 0;
	}
	exports.lte = lte;
	function lte(a, b, loose) {
		return compare(a, b, loose) <= 0;
	}
	exports.cmp = cmp;
	function cmp(a, op, b, loose) {
		switch (op) {
			case "===":
				if (typeof a === "object") a = a.version;
				if (typeof b === "object") b = b.version;
				return a === b;
			case "!==":
				if (typeof a === "object") a = a.version;
				if (typeof b === "object") b = b.version;
				return a !== b;
			case "":
			case "=":
			case "==": return eq(a, b, loose);
			case "!=": return neq(a, b, loose);
			case ">": return gt(a, b, loose);
			case ">=": return gte(a, b, loose);
			case "<": return lt(a, b, loose);
			case "<=": return lte(a, b, loose);
			default: throw new TypeError("Invalid operator: " + op);
		}
	}
	exports.Comparator = Comparator;
	function Comparator(comp, options) {
		if (!options || typeof options !== "object") options = {
			loose: !!options,
			includePrerelease: false
		};
		if (comp instanceof Comparator) if (comp.loose === !!options.loose) return comp;
		else comp = comp.value;
		if (!(this instanceof Comparator)) return new Comparator(comp, options);
		comp = comp.trim().split(/\s+/).join(" ");
		debug("comparator", comp, options);
		this.options = options;
		this.loose = !!options.loose;
		this.parse(comp);
		if (this.semver === ANY) this.value = "";
		else this.value = this.operator + this.semver.version;
		debug("comp", this);
	}
	var ANY = {};
	Comparator.prototype.parse = function(comp) {
		var r = this.options.loose ? safeRe[COMPARATORLOOSE] : safeRe[COMPARATOR];
		var m = comp.match(r);
		if (!m) throw new TypeError("Invalid comparator: " + comp);
		this.operator = m[1];
		if (this.operator === "=") this.operator = "";
		if (!m[2]) this.semver = ANY;
		else this.semver = new SemVer(m[2], this.options.loose);
	};
	Comparator.prototype.toString = function() {
		return this.value;
	};
	Comparator.prototype.test = function(version) {
		debug("Comparator.test", version, this.options.loose);
		if (this.semver === ANY) return true;
		if (typeof version === "string") version = new SemVer(version, this.options);
		return cmp(version, this.operator, this.semver, this.options);
	};
	Comparator.prototype.intersects = function(comp, options) {
		if (!(comp instanceof Comparator)) throw new TypeError("a Comparator is required");
		if (!options || typeof options !== "object") options = {
			loose: !!options,
			includePrerelease: false
		};
		var rangeTmp;
		if (this.operator === "") {
			rangeTmp = new Range(comp.value, options);
			return satisfies(this.value, rangeTmp, options);
		} else if (comp.operator === "") {
			rangeTmp = new Range(this.value, options);
			return satisfies(comp.semver, rangeTmp, options);
		}
		var sameDirectionIncreasing = (this.operator === ">=" || this.operator === ">") && (comp.operator === ">=" || comp.operator === ">");
		var sameDirectionDecreasing = (this.operator === "<=" || this.operator === "<") && (comp.operator === "<=" || comp.operator === "<");
		var sameSemVer = this.semver.version === comp.semver.version;
		var differentDirectionsInclusive = (this.operator === ">=" || this.operator === "<=") && (comp.operator === ">=" || comp.operator === "<=");
		var oppositeDirectionsLessThan = cmp(this.semver, "<", comp.semver, options) && (this.operator === ">=" || this.operator === ">") && (comp.operator === "<=" || comp.operator === "<");
		var oppositeDirectionsGreaterThan = cmp(this.semver, ">", comp.semver, options) && (this.operator === "<=" || this.operator === "<") && (comp.operator === ">=" || comp.operator === ">");
		return sameDirectionIncreasing || sameDirectionDecreasing || sameSemVer && differentDirectionsInclusive || oppositeDirectionsLessThan || oppositeDirectionsGreaterThan;
	};
	exports.Range = Range;
	function Range(range, options) {
		if (!options || typeof options !== "object") options = {
			loose: !!options,
			includePrerelease: false
		};
		if (range instanceof Range) if (range.loose === !!options.loose && range.includePrerelease === !!options.includePrerelease) return range;
		else return new Range(range.raw, options);
		if (range instanceof Comparator) return new Range(range.value, options);
		if (!(this instanceof Range)) return new Range(range, options);
		this.options = options;
		this.loose = !!options.loose;
		this.includePrerelease = !!options.includePrerelease;
		this.raw = range.trim().split(/\s+/).join(" ");
		this.set = this.raw.split("||").map(function(range$1) {
			return this.parseRange(range$1.trim());
		}, this).filter(function(c) {
			return c.length;
		});
		if (!this.set.length) throw new TypeError("Invalid SemVer Range: " + this.raw);
		this.format();
	}
	Range.prototype.format = function() {
		this.range = this.set.map(function(comps) {
			return comps.join(" ").trim();
		}).join("||").trim();
		return this.range;
	};
	Range.prototype.toString = function() {
		return this.range;
	};
	Range.prototype.parseRange = function(range) {
		var loose = this.options.loose;
		var hr = loose ? safeRe[HYPHENRANGELOOSE] : safeRe[HYPHENRANGE];
		range = range.replace(hr, hyphenReplace);
		debug("hyphen replace", range);
		range = range.replace(safeRe[COMPARATORTRIM], comparatorTrimReplace);
		debug("comparator trim", range, safeRe[COMPARATORTRIM]);
		range = range.replace(safeRe[TILDETRIM], tildeTrimReplace);
		range = range.replace(safeRe[CARETTRIM], caretTrimReplace);
		var compRe = loose ? safeRe[COMPARATORLOOSE] : safeRe[COMPARATOR];
		var set = range.split(" ").map(function(comp) {
			return parseComparator(comp, this.options);
		}, this).join(" ").split(/\s+/);
		if (this.options.loose) set = set.filter(function(comp) {
			return !!comp.match(compRe);
		});
		set = set.map(function(comp) {
			return new Comparator(comp, this.options);
		}, this);
		return set;
	};
	Range.prototype.intersects = function(range, options) {
		if (!(range instanceof Range)) throw new TypeError("a Range is required");
		return this.set.some(function(thisComparators) {
			return thisComparators.every(function(thisComparator) {
				return range.set.some(function(rangeComparators) {
					return rangeComparators.every(function(rangeComparator) {
						return thisComparator.intersects(rangeComparator, options);
					});
				});
			});
		});
	};
	exports.toComparators = toComparators;
	function toComparators(range, options) {
		return new Range(range, options).set.map(function(comp) {
			return comp.map(function(c) {
				return c.value;
			}).join(" ").trim().split(" ");
		});
	}
	function parseComparator(comp, options) {
		debug("comp", comp, options);
		comp = replaceCarets(comp, options);
		debug("caret", comp);
		comp = replaceTildes(comp, options);
		debug("tildes", comp);
		comp = replaceXRanges(comp, options);
		debug("xrange", comp);
		comp = replaceStars(comp, options);
		debug("stars", comp);
		return comp;
	}
	function isX(id$1) {
		return !id$1 || id$1.toLowerCase() === "x" || id$1 === "*";
	}
	function replaceTildes(comp, options) {
		return comp.trim().split(/\s+/).map(function(comp$1) {
			return replaceTilde(comp$1, options);
		}).join(" ");
	}
	function replaceTilde(comp, options) {
		var r = options.loose ? safeRe[TILDELOOSE] : safeRe[TILDE];
		return comp.replace(r, function(_$2, M, m, p, pr) {
			debug("tilde", comp, _$2, M, m, p, pr);
			var ret;
			if (isX(M)) ret = "";
			else if (isX(m)) ret = ">=" + M + ".0.0 <" + (+M + 1) + ".0.0";
			else if (isX(p)) ret = ">=" + M + "." + m + ".0 <" + M + "." + (+m + 1) + ".0";
			else if (pr) {
				debug("replaceTilde pr", pr);
				ret = ">=" + M + "." + m + "." + p + "-" + pr + " <" + M + "." + (+m + 1) + ".0";
			} else ret = ">=" + M + "." + m + "." + p + " <" + M + "." + (+m + 1) + ".0";
			debug("tilde return", ret);
			return ret;
		});
	}
	function replaceCarets(comp, options) {
		return comp.trim().split(/\s+/).map(function(comp$1) {
			return replaceCaret(comp$1, options);
		}).join(" ");
	}
	function replaceCaret(comp, options) {
		debug("caret", comp, options);
		var r = options.loose ? safeRe[CARETLOOSE] : safeRe[CARET];
		return comp.replace(r, function(_$2, M, m, p, pr) {
			debug("caret", comp, _$2, M, m, p, pr);
			var ret;
			if (isX(M)) ret = "";
			else if (isX(m)) ret = ">=" + M + ".0.0 <" + (+M + 1) + ".0.0";
			else if (isX(p)) if (M === "0") ret = ">=" + M + "." + m + ".0 <" + M + "." + (+m + 1) + ".0";
			else ret = ">=" + M + "." + m + ".0 <" + (+M + 1) + ".0.0";
			else if (pr) {
				debug("replaceCaret pr", pr);
				if (M === "0") if (m === "0") ret = ">=" + M + "." + m + "." + p + "-" + pr + " <" + M + "." + m + "." + (+p + 1);
				else ret = ">=" + M + "." + m + "." + p + "-" + pr + " <" + M + "." + (+m + 1) + ".0";
				else ret = ">=" + M + "." + m + "." + p + "-" + pr + " <" + (+M + 1) + ".0.0";
			} else {
				debug("no pr");
				if (M === "0") if (m === "0") ret = ">=" + M + "." + m + "." + p + " <" + M + "." + m + "." + (+p + 1);
				else ret = ">=" + M + "." + m + "." + p + " <" + M + "." + (+m + 1) + ".0";
				else ret = ">=" + M + "." + m + "." + p + " <" + (+M + 1) + ".0.0";
			}
			debug("caret return", ret);
			return ret;
		});
	}
	function replaceXRanges(comp, options) {
		debug("replaceXRanges", comp, options);
		return comp.split(/\s+/).map(function(comp$1) {
			return replaceXRange(comp$1, options);
		}).join(" ");
	}
	function replaceXRange(comp, options) {
		comp = comp.trim();
		var r = options.loose ? safeRe[XRANGELOOSE] : safeRe[XRANGE];
		return comp.replace(r, function(ret, gtlt, M, m, p, pr) {
			debug("xRange", comp, ret, gtlt, M, m, p, pr);
			var xM = isX(M);
			var xm = xM || isX(m);
			var xp = xm || isX(p);
			var anyX = xp;
			if (gtlt === "=" && anyX) gtlt = "";
			if (xM) if (gtlt === ">" || gtlt === "<") ret = "<0.0.0";
			else ret = "*";
			else if (gtlt && anyX) {
				if (xm) m = 0;
				p = 0;
				if (gtlt === ">") {
					gtlt = ">=";
					if (xm) {
						M = +M + 1;
						m = 0;
						p = 0;
					} else {
						m = +m + 1;
						p = 0;
					}
				} else if (gtlt === "<=") {
					gtlt = "<";
					if (xm) M = +M + 1;
					else m = +m + 1;
				}
				ret = gtlt + M + "." + m + "." + p;
			} else if (xm) ret = ">=" + M + ".0.0 <" + (+M + 1) + ".0.0";
			else if (xp) ret = ">=" + M + "." + m + ".0 <" + M + "." + (+m + 1) + ".0";
			debug("xRange return", ret);
			return ret;
		});
	}
	function replaceStars(comp, options) {
		debug("replaceStars", comp, options);
		return comp.trim().replace(safeRe[STAR], "");
	}
	function hyphenReplace($0, from, fM, fm, fp, fpr, fb, to, tM, tm, tp, tpr, tb) {
		if (isX(fM)) from = "";
		else if (isX(fm)) from = ">=" + fM + ".0.0";
		else if (isX(fp)) from = ">=" + fM + "." + fm + ".0";
		else from = ">=" + from;
		if (isX(tM)) to = "";
		else if (isX(tm)) to = "<" + (+tM + 1) + ".0.0";
		else if (isX(tp)) to = "<" + tM + "." + (+tm + 1) + ".0";
		else if (tpr) to = "<=" + tM + "." + tm + "." + tp + "-" + tpr;
		else to = "<=" + to;
		return (from + " " + to).trim();
	}
	Range.prototype.test = function(version) {
		if (!version) return false;
		if (typeof version === "string") version = new SemVer(version, this.options);
		for (var i$1 = 0; i$1 < this.set.length; i$1++) if (testSet(this.set[i$1], version, this.options)) return true;
		return false;
	};
	function testSet(set, version, options) {
		for (var i$1 = 0; i$1 < set.length; i$1++) if (!set[i$1].test(version)) return false;
		if (version.prerelease.length && !options.includePrerelease) {
			for (i$1 = 0; i$1 < set.length; i$1++) {
				debug(set[i$1].semver);
				if (set[i$1].semver === ANY) continue;
				if (set[i$1].semver.prerelease.length > 0) {
					var allowed = set[i$1].semver;
					if (allowed.major === version.major && allowed.minor === version.minor && allowed.patch === version.patch) return true;
				}
			}
			return false;
		}
		return true;
	}
	exports.satisfies = satisfies;
	function satisfies(version, range, options) {
		try {
			range = new Range(range, options);
		} catch (er) {
			return false;
		}
		return range.test(version);
	}
	exports.maxSatisfying = maxSatisfying;
	function maxSatisfying(versions, range, options) {
		var max = null;
		var maxSV = null;
		try {
			var rangeObj = new Range(range, options);
		} catch (er) {
			return null;
		}
		versions.forEach(function(v) {
			if (rangeObj.test(v)) {
				if (!max || maxSV.compare(v) === -1) {
					max = v;
					maxSV = new SemVer(max, options);
				}
			}
		});
		return max;
	}
	exports.minSatisfying = minSatisfying;
	function minSatisfying(versions, range, options) {
		var min = null;
		var minSV = null;
		try {
			var rangeObj = new Range(range, options);
		} catch (er) {
			return null;
		}
		versions.forEach(function(v) {
			if (rangeObj.test(v)) {
				if (!min || minSV.compare(v) === 1) {
					min = v;
					minSV = new SemVer(min, options);
				}
			}
		});
		return min;
	}
	exports.minVersion = minVersion;
	function minVersion(range, loose) {
		range = new Range(range, loose);
		var minver = new SemVer("0.0.0");
		if (range.test(minver)) return minver;
		minver = new SemVer("0.0.0-0");
		if (range.test(minver)) return minver;
		minver = null;
		for (var i$1 = 0; i$1 < range.set.length; ++i$1) range.set[i$1].forEach(function(comparator) {
			var compver = new SemVer(comparator.semver.version);
			switch (comparator.operator) {
				case ">":
					if (compver.prerelease.length === 0) compver.patch++;
					else compver.prerelease.push(0);
					compver.raw = compver.format();
				case "":
				case ">=":
					if (!minver || gt(minver, compver)) minver = compver;
					break;
				case "<":
				case "<=": break;
				default: throw new Error("Unexpected operation: " + comparator.operator);
			}
		});
		if (minver && range.test(minver)) return minver;
		return null;
	}
	exports.validRange = validRange;
	function validRange(range, options) {
		try {
			return new Range(range, options).range || "*";
		} catch (er) {
			return null;
		}
	}
	exports.ltr = ltr;
	function ltr(version, range, options) {
		return outside(version, range, "<", options);
	}
	exports.gtr = gtr;
	function gtr(version, range, options) {
		return outside(version, range, ">", options);
	}
	exports.outside = outside;
	function outside(version, range, hilo, options) {
		version = new SemVer(version, options);
		range = new Range(range, options);
		var gtfn, ltefn, ltfn, comp, ecomp;
		switch (hilo) {
			case ">":
				gtfn = gt;
				ltefn = lte;
				ltfn = lt;
				comp = ">";
				ecomp = ">=";
				break;
			case "<":
				gtfn = lt;
				ltefn = gte;
				ltfn = gt;
				comp = "<";
				ecomp = "<=";
				break;
			default: throw new TypeError("Must provide a hilo val of \"<\" or \">\"");
		}
		if (satisfies(version, range, options)) return false;
		for (var i$1 = 0; i$1 < range.set.length; ++i$1) {
			var comparators = range.set[i$1];
			var high = null;
			var low = null;
			comparators.forEach(function(comparator) {
				if (comparator.semver === ANY) comparator = new Comparator(">=0.0.0");
				high = high || comparator;
				low = low || comparator;
				if (gtfn(comparator.semver, high.semver, options)) high = comparator;
				else if (ltfn(comparator.semver, low.semver, options)) low = comparator;
			});
			if (high.operator === comp || high.operator === ecomp) return false;
			if ((!low.operator || low.operator === comp) && ltefn(version, low.semver)) return false;
			else if (low.operator === ecomp && ltfn(version, low.semver)) return false;
		}
		return true;
	}
	exports.prerelease = prerelease;
	function prerelease(version, options) {
		var parsed = parse$1(version, options);
		return parsed && parsed.prerelease.length ? parsed.prerelease : null;
	}
	exports.intersects = intersects;
	function intersects(r1, r2, options) {
		r1 = new Range(r1, options);
		r2 = new Range(r2, options);
		return r1.intersects(r2);
	}
	exports.coerce = coerce;
	function coerce(version) {
		if (version instanceof SemVer) return version;
		if (typeof version !== "string") return null;
		var match = version.match(safeRe[COERCE]);
		if (match == null) return null;
		return parse$1(match[1] + "." + (match[2] || "0") + "." + (match[3] || "0"));
	}
}) });

//#endregion
//#region src/bll/Changelog.js
var require_Changelog = /* @__PURE__ */ __commonJS({ "src/bll/Changelog.js": ((exports, module) => {
	const fs = require("node:fs");
	const path$3 = require("node:path");
	const semver = require_semver();
	const DEFAULT_CHANGELOG_PATH = path$3.join(__dirname, "..", "..", "..", "..", "changelog/public");
	var Changelog$1 = class {
		constructor(lastViewedChangelog = process.env.HAIKU_RELEASE_VERSION, changelogPath = DEFAULT_CHANGELOG_PATH) {
			this.cachedChangelog = null;
			this.lastViewedChangelog = lastViewedChangelog;
			this.changelogPath = changelogPath;
		}
		readSingleChangelog(changelog) {
			return new Promise((resolve, reject) => {
				fs.readFile(path$3.join(this.changelogPath, changelog), "utf8", (err, content) => {
					err ? reject(err) : resolve(JSON.parse(content));
				});
			});
		}
		readChangelogs() {
			const rawChangelogs = fs.readdirSync(this.changelogPath, "utf8").filter((filename) => {
				return filename === "latest.json" || semver.gt(path$3.basename(filename, ".json"), this.lastViewedChangelog || "0.0.0");
			}).sort((a, b) => {
				if (b === "latest.json") return -1;
				if (a === "latest.json") return 1;
				return semver.lt(path$3.basename(a, ".json"), path$3.basename(b, ".json")) ? -1 : 1;
			});
			return Promise.all(rawChangelogs.map((changelogFilename) => this.readSingleChangelog(changelogFilename)));
		}
		getChangelog() {
			return new Promise((resolve, reject) => {
				if (this.cachedChangelog) resolve(this.cachedChangelog);
				else this.readChangelogs().then((changelogs) => {
					const latest = changelogs[changelogs.length - 1];
					const outputSections = {};
					for (const changelog of changelogs) for (const section in changelog.sections) outputSections[section] = [...changelog.sections[section], ...outputSections[section] ? outputSections[section] : []];
					latest.sections = outputSections;
					this.cachedChangelog = latest;
					resolve(latest);
				}).catch((error) => {
					reject(error);
				});
			});
		}
	};
	module.exports = Changelog$1;
}) });

//#endregion
//#region src/bll/FontComponent.js
var require_FontComponent = /* @__PURE__ */ __commonJS({ "src/bll/FontComponent.js": ((exports, module) => {
	const path$2 = require("node:path");
	const BaseModel$2 = require_BaseModel();
	const MODPATH = "@haiku/core/components/controls/Font/code/main/code";
	const BYTECODE = require(MODPATH);
	/**
	* @class FontComponent
	*/
	var FontComponent$1 = class extends BaseModel$2 {
		constructor(props, opts) {
			super(props, opts);
			this.modpath = MODPATH;
			this.identifier = "font";
		}
		getTitle() {
			const parts = this.relpath.split(path$2.sep);
			const last = parts[parts.length - 1];
			return path$2.basename(last, path$2.extname(last));
		}
		getAbspath() {
			return path$2.join(this.project.getFolder(), this.relpath);
		}
		getLocalHref() {
			return `web+haikuroot://${path$2.normalize(this.relpath)}`;
		}
		getReifiedBytecode() {
			return BYTECODE;
		}
		doesMatchOrHostComponent(other, cb) {
			return cb(null, false);
		}
	};
	FontComponent$1.DEFAULT_OPTIONS = { required: {
		project: true,
		relpath: true
	} };
	BaseModel$2.extend(FontComponent$1);
	module.exports = FontComponent$1;
}) });

//#endregion
//#region ../../node_modules/.pnpm/ultron@1.1.1/node_modules/ultron/index.js
var require_ultron = /* @__PURE__ */ __commonJS({ "../../node_modules/.pnpm/ultron@1.1.1/node_modules/ultron/index.js": ((exports, module) => {
	var has = Object.prototype.hasOwnProperty;
	/**
	* An auto incrementing id which we can use to create "unique" Ultron instances
	* so we can track the event emitters that are added through the Ultron
	* interface.
	*
	* @type {Number}
	* @private
	*/
	var id = 0;
	/**
	* Ultron is high-intelligence robot. It gathers intelligence so it can start improving
	* upon his rudimentary design. It will learn from your EventEmitting patterns
	* and exterminate them.
	*
	* @constructor
	* @param {EventEmitter} ee EventEmitter instance we need to wrap.
	* @api public
	*/
	function Ultron$2(ee) {
		if (!(this instanceof Ultron$2)) return new Ultron$2(ee);
		this.id = id++;
		this.ee = ee;
	}
	/**
	* Register a new EventListener for the given event.
	*
	* @param {String} event Name of the event.
	* @param {Functon} fn Callback function.
	* @param {Mixed} context The context of the function.
	* @returns {Ultron}
	* @api public
	*/
	Ultron$2.prototype.on = function on(event, fn, context) {
		fn.__ultron = this.id;
		this.ee.on(event, fn, context);
		return this;
	};
	/**
	* Add an EventListener that's only called once.
	*
	* @param {String} event Name of the event.
	* @param {Function} fn Callback function.
	* @param {Mixed} context The context of the function.
	* @returns {Ultron}
	* @api public
	*/
	Ultron$2.prototype.once = function once(event, fn, context) {
		fn.__ultron = this.id;
		this.ee.once(event, fn, context);
		return this;
	};
	/**
	* Remove the listeners we assigned for the given event.
	*
	* @returns {Ultron}
	* @api public
	*/
	Ultron$2.prototype.remove = function remove() {
		var args = arguments, ee = this.ee, event;
		if (args.length === 1 && "string" === typeof args[0]) args = args[0].split(/[, ]+/);
		else if (!args.length) {
			if (ee.eventNames) args = ee.eventNames();
			else if (ee._events) {
				args = [];
				for (event in ee._events) if (has.call(ee._events, event)) args.push(event);
				if (Object.getOwnPropertySymbols) args = args.concat(Object.getOwnPropertySymbols(ee._events));
			}
		}
		for (var i$1 = 0; i$1 < args.length; i$1++) {
			var listeners = ee.listeners(args[i$1]);
			for (var j = 0; j < listeners.length; j++) {
				event = listeners[j];
				if (event.listener) {
					if (event.listener.__ultron !== this.id) continue;
				} else if (event.__ultron !== this.id) continue;
				ee.removeListener(args[i$1], event);
			}
		}
		return this;
	};
	/**
	* Destroy the Ultron instance, remove all listeners and release all references.
	*
	* @returns {Boolean}
	* @api public
	*/
	Ultron$2.prototype.destroy = function destroy() {
		if (!this.ee) return false;
		this.remove();
		this.ee = null;
		return true;
	};
	module.exports = Ultron$2;
}) });

//#endregion
//#region ../../node_modules/.pnpm/safe-buffer@5.1.2/node_modules/safe-buffer/index.js
var require_safe_buffer = /* @__PURE__ */ __commonJS({ "../../node_modules/.pnpm/safe-buffer@5.1.2/node_modules/safe-buffer/index.js": ((exports, module) => {
	var buffer = require("buffer");
	var Buffer$7 = buffer.Buffer;
	function copyProps(src$1, dst) {
		for (var key in src$1) dst[key] = src$1[key];
	}
	if (Buffer$7.from && Buffer$7.alloc && Buffer$7.allocUnsafe && Buffer$7.allocUnsafeSlow) module.exports = buffer;
	else {
		copyProps(buffer, exports);
		exports.Buffer = SafeBuffer;
	}
	function SafeBuffer(arg, encodingOrOffset, length) {
		return Buffer$7(arg, encodingOrOffset, length);
	}
	copyProps(Buffer$7, SafeBuffer);
	SafeBuffer.from = function(arg, encodingOrOffset, length) {
		if (typeof arg === "number") throw new TypeError("Argument must not be a number");
		return Buffer$7(arg, encodingOrOffset, length);
	};
	SafeBuffer.alloc = function(size, fill, encoding) {
		if (typeof size !== "number") throw new TypeError("Argument must be a number");
		var buf = Buffer$7(size);
		if (fill !== void 0) if (typeof encoding === "string") buf.fill(fill, encoding);
		else buf.fill(fill);
		else buf.fill(0);
		return buf;
	};
	SafeBuffer.allocUnsafe = function(size) {
		if (typeof size !== "number") throw new TypeError("Argument must be a number");
		return Buffer$7(size);
	};
	SafeBuffer.allocUnsafeSlow = function(size) {
		if (typeof size !== "number") throw new TypeError("Argument must be a number");
		return buffer.SlowBuffer(size);
	};
}) });

//#endregion
//#region ../../node_modules/.pnpm/async-limiter@1.0.1/node_modules/async-limiter/index.js
var require_async_limiter = /* @__PURE__ */ __commonJS({ "../../node_modules/.pnpm/async-limiter@1.0.1/node_modules/async-limiter/index.js": ((exports, module) => {
	function Queue(options) {
		if (!(this instanceof Queue)) return new Queue(options);
		options = options || {};
		this.concurrency = options.concurrency || Infinity;
		this.pending = 0;
		this.jobs = [];
		this.cbs = [];
		this._done = done.bind(this);
	}
	[
		"push",
		"unshift",
		"splice"
	].forEach(function(method) {
		Queue.prototype[method] = function() {
			var methodResult = Array.prototype[method].apply(this.jobs, arguments);
			this._run();
			return methodResult;
		};
	});
	Object.defineProperty(Queue.prototype, "length", { get: function() {
		return this.pending + this.jobs.length;
	} });
	Queue.prototype._run = function() {
		if (this.pending === this.concurrency) return;
		if (this.jobs.length) {
			var job = this.jobs.shift();
			this.pending++;
			job(this._done);
			this._run();
		}
		if (this.pending === 0) while (this.cbs.length !== 0) {
			var cb = this.cbs.pop();
			process.nextTick(cb);
		}
	};
	Queue.prototype.onDone = function(cb) {
		if (typeof cb === "function") {
			this.cbs.push(cb);
			this._run();
		}
	};
	function done() {
		this.pending--;
		this._run();
	}
	module.exports = Queue;
}) });

//#endregion
//#region ../../node_modules/.pnpm/ws@3.2.0/node_modules/ws/lib/BufferUtil.js
/*!
* ws: a node.js websocket client
* Copyright(c) 2011 Einar Otto Stangvik <einaros@gmail.com>
* MIT Licensed
*/
var require_BufferUtil = /* @__PURE__ */ __commonJS({ "../../node_modules/.pnpm/ws@3.2.0/node_modules/ws/lib/BufferUtil.js": ((exports, module) => {
	const Buffer$6 = require_safe_buffer().Buffer;
	/**
	* Merges an array of buffers into a new buffer.
	*
	* @param {Buffer[]} list The array of buffers to concat
	* @param {Number} totalLength The total length of buffers in the list
	* @return {Buffer} The resulting buffer
	* @public
	*/
	const concat = (list, totalLength) => {
		const target = Buffer$6.allocUnsafe(totalLength);
		var offset = 0;
		for (var i$1 = 0; i$1 < list.length; i$1++) {
			const buf = list[i$1];
			buf.copy(target, offset);
			offset += buf.length;
		}
		return target;
	};
	try {
		const bufferUtil$3 = require("bufferutil");
		module.exports = Object.assign({ concat }, bufferUtil$3.BufferUtil || bufferUtil$3);
	} catch (e) {
		/**
		* Masks a buffer using the given mask.
		*
		* @param {Buffer} source The buffer to mask
		* @param {Buffer} mask The mask to use
		* @param {Buffer} output The buffer where to store the result
		* @param {Number} offset The offset at which to start writing
		* @param {Number} length The number of bytes to mask.
		* @public
		*/
		const mask = (source, mask$1, output, offset, length) => {
			for (var i$1 = 0; i$1 < length; i$1++) output[offset + i$1] = source[i$1] ^ mask$1[i$1 & 3];
		};
		/**
		* Unmasks a buffer using the given mask.
		*
		* @param {Buffer} buffer The buffer to unmask
		* @param {Buffer} mask The mask to use
		* @public
		*/
		const unmask = (buffer$1, mask$1) => {
			const length = buffer$1.length;
			for (var i$1 = 0; i$1 < length; i$1++) buffer$1[i$1] ^= mask$1[i$1 & 3];
		};
		module.exports = {
			concat,
			mask,
			unmask
		};
	}
}) });

//#endregion
//#region ../../node_modules/.pnpm/ws@3.2.0/node_modules/ws/lib/PerMessageDeflate.js
var require_PerMessageDeflate = /* @__PURE__ */ __commonJS({ "../../node_modules/.pnpm/ws@3.2.0/node_modules/ws/lib/PerMessageDeflate.js": ((exports, module) => {
	const safeBuffer$3 = require_safe_buffer();
	const zlib = require("zlib");
	const Limiter = require_async_limiter();
	const bufferUtil$2 = require_BufferUtil();
	const Buffer$5 = safeBuffer$3.Buffer;
	const TRAILER = Buffer$5.from([
		0,
		0,
		255,
		255
	]);
	const EMPTY_BLOCK = Buffer$5.from([0]);
	let zlibLimiter;
	/**
	* Per-message Deflate implementation.
	*/
	var PerMessageDeflate$4 = class {
		constructor(options, isServer, maxPayload) {
			this._maxPayload = maxPayload | 0;
			this._options = options || {};
			this._threshold = this._options.threshold !== void 0 ? this._options.threshold : 1024;
			this._isServer = !!isServer;
			this._deflate = null;
			this._inflate = null;
			this.params = null;
			if (!zlibLimiter) zlibLimiter = new Limiter({ concurrency: this._options.concurrencyLimit !== void 0 ? this._options.concurrencyLimit : 10 });
		}
		static get extensionName() {
			return "permessage-deflate";
		}
		/**
		* Create extension parameters offer.
		*
		* @return {Object} Extension parameters
		* @public
		*/
		offer() {
			const params = {};
			if (this._options.serverNoContextTakeover) params.server_no_context_takeover = true;
			if (this._options.clientNoContextTakeover) params.client_no_context_takeover = true;
			if (this._options.serverMaxWindowBits) params.server_max_window_bits = this._options.serverMaxWindowBits;
			if (this._options.clientMaxWindowBits) params.client_max_window_bits = this._options.clientMaxWindowBits;
			else if (this._options.clientMaxWindowBits == null) params.client_max_window_bits = true;
			return params;
		}
		/**
		* Accept extension offer.
		*
		* @param {Array} paramsList Extension parameters
		* @return {Object} Accepted configuration
		* @public
		*/
		accept(paramsList) {
			paramsList = this.normalizeParams(paramsList);
			var params;
			if (this._isServer) params = this.acceptAsServer(paramsList);
			else params = this.acceptAsClient(paramsList);
			this.params = params;
			return params;
		}
		/**
		* Releases all resources used by the extension.
		*
		* @public
		*/
		cleanup() {
			if (this._inflate) if (this._inflate.writeInProgress) this._inflate.pendingClose = true;
			else {
				this._inflate.close();
				this._inflate = null;
			}
			if (this._deflate) if (this._deflate.writeInProgress) this._deflate.pendingClose = true;
			else {
				this._deflate.close();
				this._deflate = null;
			}
		}
		/**
		* Accept extension offer from client.
		*
		* @param {Array} paramsList Extension parameters
		* @return {Object} Accepted configuration
		* @private
		*/
		acceptAsServer(paramsList) {
			const accepted = {};
			if (!paramsList.some((params) => {
				if (this._options.serverNoContextTakeover === false && params.server_no_context_takeover || this._options.serverMaxWindowBits === false && params.server_max_window_bits || typeof this._options.serverMaxWindowBits === "number" && typeof params.server_max_window_bits === "number" && this._options.serverMaxWindowBits > params.server_max_window_bits || typeof this._options.clientMaxWindowBits === "number" && !params.client_max_window_bits) return;
				if (this._options.serverNoContextTakeover || params.server_no_context_takeover) accepted.server_no_context_takeover = true;
				if (this._options.clientNoContextTakeover || this._options.clientNoContextTakeover !== false && params.client_no_context_takeover) accepted.client_no_context_takeover = true;
				if (typeof this._options.serverMaxWindowBits === "number") accepted.server_max_window_bits = this._options.serverMaxWindowBits;
				else if (typeof params.server_max_window_bits === "number") accepted.server_max_window_bits = params.server_max_window_bits;
				if (typeof this._options.clientMaxWindowBits === "number") accepted.client_max_window_bits = this._options.clientMaxWindowBits;
				else if (this._options.clientMaxWindowBits !== false && typeof params.client_max_window_bits === "number") accepted.client_max_window_bits = params.client_max_window_bits;
				return true;
			})) throw new Error("Doesn't support the offered configuration");
			return accepted;
		}
		/**
		* Accept extension response from server.
		*
		* @param {Array} paramsList Extension parameters
		* @return {Object} Accepted configuration
		* @private
		*/
		acceptAsClient(paramsList) {
			const params = paramsList[0];
			if (this._options.clientNoContextTakeover != null) {
				if (this._options.clientNoContextTakeover === false && params.client_no_context_takeover) throw new Error("Invalid value for \"client_no_context_takeover\"");
			}
			if (this._options.clientMaxWindowBits != null) {
				if (this._options.clientMaxWindowBits === false && params.client_max_window_bits) throw new Error("Invalid value for \"client_max_window_bits\"");
				if (typeof this._options.clientMaxWindowBits === "number" && (!params.client_max_window_bits || params.client_max_window_bits > this._options.clientMaxWindowBits)) throw new Error("Invalid value for \"client_max_window_bits\"");
			}
			return params;
		}
		/**
		* Normalize extensions parameters.
		*
		* @param {Array} paramsList Extension parameters
		* @return {Array} Normalized extensions parameters
		* @private
		*/
		normalizeParams(paramsList) {
			return paramsList.map((params) => {
				Object.keys(params).forEach((key) => {
					var value = params[key];
					if (value.length > 1) throw new Error(`Multiple extension parameters for ${key}`);
					value = value[0];
					switch (key) {
						case "server_no_context_takeover":
						case "client_no_context_takeover":
							if (value !== true) throw new Error(`invalid extension parameter value for ${key} (${value})`);
							params[key] = true;
							break;
						case "server_max_window_bits":
						case "client_max_window_bits":
							if (typeof value === "string") {
								value = parseInt(value, 10);
								if (Number.isNaN(value) || value < zlib.Z_MIN_WINDOWBITS || value > zlib.Z_MAX_WINDOWBITS) throw new Error(`invalid extension parameter value for ${key} (${value})`);
							}
							if (!this._isServer && value === true) throw new Error(`Missing extension parameter value for ${key}`);
							params[key] = value;
							break;
						default: throw new Error(`Not defined extension parameter (${key})`);
					}
				});
				return params;
			});
		}
		/**
		* Decompress data. Concurrency limited by async-limiter.
		*
		* @param {Buffer} data Compressed data
		* @param {Boolean} fin Specifies whether or not this is the last fragment
		* @param {Function} callback Callback
		* @public
		*/
		decompress(data, fin, callback) {
			zlibLimiter.push((done$1) => {
				this._decompress(data, fin, (err, result) => {
					done$1();
					callback(err, result);
				});
			});
		}
		/**
		* Compress data. Concurrency limited by async-limiter.
		*
		* @param {Buffer} data Data to compress
		* @param {Boolean} fin Specifies whether or not this is the last fragment
		* @param {Function} callback Callback
		* @public
		*/
		compress(data, fin, callback) {
			zlibLimiter.push((done$1) => {
				this._compress(data, fin, (err, result) => {
					done$1();
					callback(err, result);
				});
			});
		}
		/**
		* Decompress data.
		*
		* @param {Buffer} data Compressed data
		* @param {Boolean} fin Specifies whether or not this is the last fragment
		* @param {Function} callback Callback
		* @private
		*/
		_decompress(data, fin, callback) {
			const endpoint = this._isServer ? "client" : "server";
			if (!this._inflate) {
				const key = `${endpoint}_max_window_bits`;
				const windowBits = typeof this.params[key] !== "number" ? zlib.Z_DEFAULT_WINDOWBITS : this.params[key];
				this._inflate = zlib.createInflateRaw({ windowBits });
			}
			this._inflate.writeInProgress = true;
			var totalLength = 0;
			const buffers = [];
			var err;
			const onData = (data$1) => {
				totalLength += data$1.length;
				if (this._maxPayload < 1 || totalLength <= this._maxPayload) return buffers.push(data$1);
				err = /* @__PURE__ */ new Error("max payload size exceeded");
				err.closeCode = 1009;
				this._inflate.reset();
			};
			const onError = (err$1) => {
				cleanup();
				callback(err$1);
			};
			const cleanup = () => {
				if (!this._inflate) return;
				this._inflate.removeListener("error", onError);
				this._inflate.removeListener("data", onData);
				this._inflate.writeInProgress = false;
				if (fin && this.params[`${endpoint}_no_context_takeover`] || this._inflate.pendingClose) {
					this._inflate.close();
					this._inflate = null;
				}
			};
			this._inflate.on("error", onError).on("data", onData);
			this._inflate.write(data);
			if (fin) this._inflate.write(TRAILER);
			this._inflate.flush(() => {
				cleanup();
				if (err) callback(err);
				else callback(null, bufferUtil$2.concat(buffers, totalLength));
			});
		}
		/**
		* Compress data.
		*
		* @param {Buffer} data Data to compress
		* @param {Boolean} fin Specifies whether or not this is the last fragment
		* @param {Function} callback Callback
		* @private
		*/
		_compress(data, fin, callback) {
			if (!data || data.length === 0) {
				process.nextTick(callback, null, EMPTY_BLOCK);
				return;
			}
			const endpoint = this._isServer ? "server" : "client";
			if (!this._deflate) {
				const key = `${endpoint}_max_window_bits`;
				const windowBits = typeof this.params[key] !== "number" ? zlib.Z_DEFAULT_WINDOWBITS : this.params[key];
				this._deflate = zlib.createDeflateRaw({
					memLevel: this._options.memLevel,
					level: this._options.level,
					flush: zlib.Z_SYNC_FLUSH,
					windowBits
				});
			}
			this._deflate.writeInProgress = true;
			var totalLength = 0;
			const buffers = [];
			const onData = (data$1) => {
				totalLength += data$1.length;
				buffers.push(data$1);
			};
			const onError = (err) => {
				cleanup();
				callback(err);
			};
			const cleanup = () => {
				if (!this._deflate) return;
				this._deflate.removeListener("error", onError);
				this._deflate.removeListener("data", onData);
				this._deflate.writeInProgress = false;
				if (fin && this.params[`${endpoint}_no_context_takeover`] || this._deflate.pendingClose) {
					this._deflate.close();
					this._deflate = null;
				}
			};
			this._deflate.on("error", onError).on("data", onData);
			this._deflate.write(data);
			this._deflate.flush(zlib.Z_SYNC_FLUSH, () => {
				cleanup();
				var data$1 = bufferUtil$2.concat(buffers, totalLength);
				if (fin) data$1 = data$1.slice(0, data$1.length - 4);
				callback(null, data$1);
			});
		}
	};
	module.exports = PerMessageDeflate$4;
}) });

//#endregion
//#region ../../node_modules/.pnpm/ws@3.2.0/node_modules/ws/lib/EventTarget.js
var require_EventTarget = /* @__PURE__ */ __commonJS({ "../../node_modules/.pnpm/ws@3.2.0/node_modules/ws/lib/EventTarget.js": ((exports, module) => {
	/**
	* Class representing an event.
	*
	* @private
	*/
	var Event = class {
		/**
		* Create a new `Event`.
		*
		* @param {String} type The name of the event
		* @param {Object} target A reference to the target to which the event was dispatched
		*/
		constructor(type, target) {
			this.target = target;
			this.type = type;
		}
	};
	/**
	* Class representing a message event.
	*
	* @extends Event
	* @private
	*/
	var MessageEvent = class extends Event {
		/**
		* Create a new `MessageEvent`.
		*
		* @param {(String|Buffer|ArrayBuffer|Buffer[])} data The received data
		* @param {WebSocket} target A reference to the target to which the event was dispatched
		*/
		constructor(data, target) {
			super("message", target);
			this.data = data;
		}
	};
	/**
	* Class representing a close event.
	*
	* @extends Event
	* @private
	*/
	var CloseEvent = class extends Event {
		/**
		* Create a new `CloseEvent`.
		*
		* @param {Number} code The status code explaining why the connection is being closed
		* @param {String} reason A human-readable string explaining why the connection is closing
		* @param {WebSocket} target A reference to the target to which the event was dispatched
		*/
		constructor(code, reason, target) {
			super("close", target);
			this.wasClean = code === void 0 || code === 1e3 || code >= 3e3 && code <= 4999;
			this.reason = reason;
			this.code = code;
		}
	};
	/**
	* Class representing an open event.
	*
	* @extends Event
	* @private
	*/
	var OpenEvent = class extends Event {
		/**
		* Create a new `OpenEvent`.
		*
		* @param {WebSocket} target A reference to the target to which the event was dispatched
		*/
		constructor(target) {
			super("open", target);
		}
	};
	/**
	* This provides methods for emulating the `EventTarget` interface. It's not
	* meant to be used directly.
	*
	* @mixin
	*/
	const EventTarget$1 = {
		addEventListener(method, listener) {
			if (typeof listener !== "function") return;
			function onMessage(data) {
				listener.call(this, new MessageEvent(data, this));
			}
			function onClose(code, message) {
				listener.call(this, new CloseEvent(code, message, this));
			}
			function onError(event) {
				event.type = "error";
				event.target = this;
				listener.call(this, event);
			}
			function onOpen() {
				listener.call(this, new OpenEvent(this));
			}
			if (method === "message") {
				onMessage._listener = listener;
				this.on(method, onMessage);
			} else if (method === "close") {
				onClose._listener = listener;
				this.on(method, onClose);
			} else if (method === "error") {
				onError._listener = listener;
				this.on(method, onError);
			} else if (method === "open") {
				onOpen._listener = listener;
				this.on(method, onOpen);
			} else this.on(method, listener);
		},
		removeEventListener(method, listener) {
			const listeners = this.listeners(method);
			for (var i$1 = 0; i$1 < listeners.length; i$1++) if (listeners[i$1] === listener || listeners[i$1]._listener === listener) this.removeListener(method, listeners[i$1]);
		}
	};
	module.exports = EventTarget$1;
}) });

//#endregion
//#region ../../node_modules/.pnpm/ws@3.2.0/node_modules/ws/lib/Extensions.js
var require_Extensions = /* @__PURE__ */ __commonJS({ "../../node_modules/.pnpm/ws@3.2.0/node_modules/ws/lib/Extensions.js": ((exports, module) => {
	/**
	* Parse the `Sec-WebSocket-Extensions` header into an object.
	*
	* @param {String} value field value of the header
	* @return {Object} The parsed object
	* @public
	*/
	const parse = (value) => {
		value = value || "";
		const extensions = {};
		value.split(",").forEach((v) => {
			const params = v.split(";");
			const token$2 = params.shift().trim();
			const paramsList = extensions[token$2] = extensions[token$2] || [];
			const parsedParams = {};
			params.forEach((param) => {
				const parts = param.trim().split("=");
				const key = parts[0];
				var value$1 = parts[1];
				if (value$1 === void 0) value$1 = true;
				else {
					if (value$1[0] === "\"") value$1 = value$1.slice(1);
					if (value$1[value$1.length - 1] === "\"") value$1 = value$1.slice(0, value$1.length - 1);
				}
				(parsedParams[key] = parsedParams[key] || []).push(value$1);
			});
			paramsList.push(parsedParams);
		});
		return extensions;
	};
	/**
	* Serialize a parsed `Sec-WebSocket-Extensions` header to a string.
	*
	* @param {Object} value The object to format
	* @return {String} A string representing the given value
	* @public
	*/
	const format = (value) => {
		return Object.keys(value).map((token$2) => {
			var paramsList = value[token$2];
			if (!Array.isArray(paramsList)) paramsList = [paramsList];
			return paramsList.map((params) => {
				return [token$2].concat(Object.keys(params).map((k) => {
					var p = params[k];
					if (!Array.isArray(p)) p = [p];
					return p.map((v) => v === true ? k : `${k}=${v}`).join("; ");
				})).join("; ");
			}).join(", ");
		}).join(", ");
	};
	module.exports = {
		format,
		parse
	};
}) });

//#endregion
//#region ../../node_modules/.pnpm/ws@3.2.0/node_modules/ws/lib/Constants.js
var require_Constants = /* @__PURE__ */ __commonJS({ "../../node_modules/.pnpm/ws@3.2.0/node_modules/ws/lib/Constants.js": ((exports) => {
	const Buffer$4 = require_safe_buffer().Buffer;
	exports.BINARY_TYPES = [
		"nodebuffer",
		"arraybuffer",
		"fragments"
	];
	exports.GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";
	exports.EMPTY_BUFFER = Buffer$4.alloc(0);
	exports.NOOP = () => {};
}) });

//#endregion
//#region ../../node_modules/.pnpm/ws@3.2.0/node_modules/ws/lib/Validation.js
/*!
* ws: a node.js websocket client
* Copyright(c) 2011 Einar Otto Stangvik <einaros@gmail.com>
* MIT Licensed
*/
var require_Validation = /* @__PURE__ */ __commonJS({ "../../node_modules/.pnpm/ws@3.2.0/node_modules/ws/lib/Validation.js": ((exports, module) => {
	try {
		const isValidUTF8$1 = require("utf-8-validate");
		module.exports = typeof isValidUTF8$1 === "object" ? isValidUTF8$1.Validation.isValidUTF8 : isValidUTF8$1;
	} catch (e) {
		module.exports = () => true;
	}
}) });

//#endregion
//#region ../../node_modules/.pnpm/ws@3.2.0/node_modules/ws/lib/ErrorCodes.js
/*!
* ws: a node.js websocket client
* Copyright(c) 2011 Einar Otto Stangvik <einaros@gmail.com>
* MIT Licensed
*/
var require_ErrorCodes = /* @__PURE__ */ __commonJS({ "../../node_modules/.pnpm/ws@3.2.0/node_modules/ws/lib/ErrorCodes.js": ((exports, module) => {
	module.exports = {
		isValidErrorCode: function(code) {
			return code >= 1e3 && code <= 1013 && code !== 1004 && code !== 1005 && code !== 1006 || code >= 3e3 && code <= 4999;
		},
		1e3: "normal",
		1001: "going away",
		1002: "protocol error",
		1003: "unsupported data",
		1004: "reserved",
		1005: "reserved for extensions",
		1006: "reserved for extensions",
		1007: "inconsistent or invalid data",
		1008: "policy violation",
		1009: "message too big",
		1010: "extension handshake missing",
		1011: "an unexpected condition prevented the request from being fulfilled",
		1012: "service restart",
		1013: "try again later"
	};
}) });

//#endregion
//#region ../../node_modules/.pnpm/ws@3.2.0/node_modules/ws/lib/Receiver.js
/*!
* ws: a node.js websocket client
* Copyright(c) 2011 Einar Otto Stangvik <einaros@gmail.com>
* MIT Licensed
*/
var require_Receiver = /* @__PURE__ */ __commonJS({ "../../node_modules/.pnpm/ws@3.2.0/node_modules/ws/lib/Receiver.js": ((exports, module) => {
	const safeBuffer$2 = require_safe_buffer();
	const PerMessageDeflate$3 = require_PerMessageDeflate();
	const isValidUTF8 = require_Validation();
	const bufferUtil$1 = require_BufferUtil();
	const ErrorCodes$1 = require_ErrorCodes();
	const constants$2 = require_Constants();
	const Buffer$3 = safeBuffer$2.Buffer;
	const GET_INFO = 0;
	const GET_PAYLOAD_LENGTH_16 = 1;
	const GET_PAYLOAD_LENGTH_64 = 2;
	const GET_MASK = 3;
	const GET_DATA = 4;
	const INFLATING = 5;
	/**
	* HyBi Receiver implementation.
	*/
	var Receiver$1 = class {
		/**
		* Creates a Receiver instance.
		*
		* @param {Object} extensions An object containing the negotiated extensions
		* @param {Number} maxPayload The maximum allowed message length
		* @param {String} binaryType The type for binary data
		*/
		constructor(extensions, maxPayload, binaryType) {
			this._binaryType = binaryType || constants$2.BINARY_TYPES[0];
			this._extensions = extensions || {};
			this._maxPayload = maxPayload | 0;
			this._bufferedBytes = 0;
			this._buffers = [];
			this._compressed = false;
			this._payloadLength = 0;
			this._fragmented = 0;
			this._masked = false;
			this._fin = false;
			this._mask = null;
			this._opcode = 0;
			this._totalPayloadLength = 0;
			this._messageLength = 0;
			this._fragments = [];
			this._cleanupCallback = null;
			this._hadError = false;
			this._dead = false;
			this._loop = false;
			this.onmessage = null;
			this.onclose = null;
			this.onerror = null;
			this.onping = null;
			this.onpong = null;
			this._state = GET_INFO;
		}
		/**
		* Consumes bytes from the available buffered data.
		*
		* @param {Number} bytes The number of bytes to consume
		* @return {Buffer} Consumed bytes
		* @private
		*/
		readBuffer(bytes) {
			var offset = 0;
			var dst;
			var l;
			this._bufferedBytes -= bytes;
			if (bytes === this._buffers[0].length) return this._buffers.shift();
			if (bytes < this._buffers[0].length) {
				dst = this._buffers[0].slice(0, bytes);
				this._buffers[0] = this._buffers[0].slice(bytes);
				return dst;
			}
			dst = Buffer$3.allocUnsafe(bytes);
			while (bytes > 0) {
				l = this._buffers[0].length;
				if (bytes >= l) {
					this._buffers[0].copy(dst, offset);
					offset += l;
					this._buffers.shift();
				} else {
					this._buffers[0].copy(dst, offset, 0, bytes);
					this._buffers[0] = this._buffers[0].slice(bytes);
				}
				bytes -= l;
			}
			return dst;
		}
		/**
		* Checks if the number of buffered bytes is bigger or equal than `n` and
		* calls `cleanup` if necessary.
		*
		* @param {Number} n The number of bytes to check against
		* @return {Boolean} `true` if `bufferedBytes >= n`, else `false`
		* @private
		*/
		hasBufferedBytes(n) {
			if (this._bufferedBytes >= n) return true;
			this._loop = false;
			if (this._dead) this.cleanup(this._cleanupCallback);
			return false;
		}
		/**
		* Adds new data to the parser.
		*
		* @public
		*/
		add(data) {
			if (this._dead) return;
			this._bufferedBytes += data.length;
			this._buffers.push(data);
			this.startLoop();
		}
		/**
		* Starts the parsing loop.
		*
		* @private
		*/
		startLoop() {
			this._loop = true;
			while (this._loop) switch (this._state) {
				case GET_INFO:
					this.getInfo();
					break;
				case GET_PAYLOAD_LENGTH_16:
					this.getPayloadLength16();
					break;
				case GET_PAYLOAD_LENGTH_64:
					this.getPayloadLength64();
					break;
				case GET_MASK:
					this.getMask();
					break;
				case GET_DATA:
					this.getData();
					break;
				default: this._loop = false;
			}
		}
		/**
		* Reads the first two bytes of a frame.
		*
		* @private
		*/
		getInfo() {
			if (!this.hasBufferedBytes(2)) return;
			const buf = this.readBuffer(2);
			if ((buf[0] & 48) !== 0) {
				this.error(/* @__PURE__ */ new Error("RSV2 and RSV3 must be clear"), 1002);
				return;
			}
			const compressed = (buf[0] & 64) === 64;
			if (compressed && !this._extensions[PerMessageDeflate$3.extensionName]) {
				this.error(/* @__PURE__ */ new Error("RSV1 must be clear"), 1002);
				return;
			}
			this._fin = (buf[0] & 128) === 128;
			this._opcode = buf[0] & 15;
			this._payloadLength = buf[1] & 127;
			if (this._opcode === 0) {
				if (compressed) {
					this.error(/* @__PURE__ */ new Error("RSV1 must be clear"), 1002);
					return;
				}
				if (!this._fragmented) {
					this.error(/* @__PURE__ */ new Error(`invalid opcode: ${this._opcode}`), 1002);
					return;
				} else this._opcode = this._fragmented;
			} else if (this._opcode === 1 || this._opcode === 2) {
				if (this._fragmented) {
					this.error(/* @__PURE__ */ new Error(`invalid opcode: ${this._opcode}`), 1002);
					return;
				}
				this._compressed = compressed;
			} else if (this._opcode > 7 && this._opcode < 11) {
				if (!this._fin) {
					this.error(/* @__PURE__ */ new Error("FIN must be set"), 1002);
					return;
				}
				if (compressed) {
					this.error(/* @__PURE__ */ new Error("RSV1 must be clear"), 1002);
					return;
				}
				if (this._payloadLength > 125) {
					this.error(/* @__PURE__ */ new Error("invalid payload length"), 1002);
					return;
				}
			} else {
				this.error(/* @__PURE__ */ new Error(`invalid opcode: ${this._opcode}`), 1002);
				return;
			}
			if (!this._fin && !this._fragmented) this._fragmented = this._opcode;
			this._masked = (buf[1] & 128) === 128;
			if (this._payloadLength === 126) this._state = GET_PAYLOAD_LENGTH_16;
			else if (this._payloadLength === 127) this._state = GET_PAYLOAD_LENGTH_64;
			else this.haveLength();
		}
		/**
		* Gets extended payload length (7+16).
		*
		* @private
		*/
		getPayloadLength16() {
			if (!this.hasBufferedBytes(2)) return;
			this._payloadLength = this.readBuffer(2).readUInt16BE(0, true);
			this.haveLength();
		}
		/**
		* Gets extended payload length (7+64).
		*
		* @private
		*/
		getPayloadLength64() {
			if (!this.hasBufferedBytes(8)) return;
			const buf = this.readBuffer(8);
			const num = buf.readUInt32BE(0, true);
			if (num > Math.pow(2, 21) - 1) {
				this.error(/* @__PURE__ */ new Error("max payload size exceeded"), 1009);
				return;
			}
			this._payloadLength = num * Math.pow(2, 32) + buf.readUInt32BE(4, true);
			this.haveLength();
		}
		/**
		* Payload length has been read.
		*
		* @private
		*/
		haveLength() {
			if (this._opcode < 8 && this.maxPayloadExceeded(this._payloadLength)) return;
			if (this._masked) this._state = GET_MASK;
			else this._state = GET_DATA;
		}
		/**
		* Reads mask bytes.
		*
		* @private
		*/
		getMask() {
			if (!this.hasBufferedBytes(4)) return;
			this._mask = this.readBuffer(4);
			this._state = GET_DATA;
		}
		/**
		* Reads data bytes.
		*
		* @private
		*/
		getData() {
			var data = constants$2.EMPTY_BUFFER;
			if (this._payloadLength) {
				if (!this.hasBufferedBytes(this._payloadLength)) return;
				data = this.readBuffer(this._payloadLength);
				if (this._masked) bufferUtil$1.unmask(data, this._mask);
			}
			if (this._opcode > 7) this.controlMessage(data);
			else if (this._compressed) {
				this._state = INFLATING;
				this.decompress(data);
			} else if (this.pushFragment(data)) this.dataMessage();
		}
		/**
		* Decompresses data.
		*
		* @param {Buffer} data Compressed data
		* @private
		*/
		decompress(data) {
			this._extensions[PerMessageDeflate$3.extensionName].decompress(data, this._fin, (err, buf) => {
				if (err) {
					this.error(err, err.closeCode === 1009 ? 1009 : 1007);
					return;
				}
				if (this.pushFragment(buf)) this.dataMessage();
				this.startLoop();
			});
		}
		/**
		* Handles a data message.
		*
		* @private
		*/
		dataMessage() {
			if (this._fin) {
				const messageLength = this._messageLength;
				const fragments = this._fragments;
				this._totalPayloadLength = 0;
				this._messageLength = 0;
				this._fragmented = 0;
				this._fragments = [];
				if (this._opcode === 2) {
					var data;
					if (this._binaryType === "nodebuffer") data = toBuffer(fragments, messageLength);
					else if (this._binaryType === "arraybuffer") data = toArrayBuffer(toBuffer(fragments, messageLength));
					else data = fragments;
					this.onmessage(data);
				} else {
					const buf = toBuffer(fragments, messageLength);
					if (!isValidUTF8(buf)) {
						this.error(/* @__PURE__ */ new Error("invalid utf8 sequence"), 1007);
						return;
					}
					this.onmessage(buf.toString());
				}
			}
			this._state = GET_INFO;
		}
		/**
		* Handles a control message.
		*
		* @param {Buffer} data Data to handle
		* @private
		*/
		controlMessage(data) {
			if (this._opcode === 8) {
				if (data.length === 0) {
					this.onclose(1e3, "");
					this._loop = false;
					this.cleanup(this._cleanupCallback);
				} else if (data.length === 1) this.error(/* @__PURE__ */ new Error("invalid payload length"), 1002);
				else {
					const code = data.readUInt16BE(0, true);
					if (!ErrorCodes$1.isValidErrorCode(code)) {
						this.error(/* @__PURE__ */ new Error(`invalid status code: ${code}`), 1002);
						return;
					}
					const buf = data.slice(2);
					if (!isValidUTF8(buf)) {
						this.error(/* @__PURE__ */ new Error("invalid utf8 sequence"), 1007);
						return;
					}
					this.onclose(code, buf.toString());
					this._loop = false;
					this.cleanup(this._cleanupCallback);
				}
				return;
			}
			if (this._opcode === 9) this.onping(data);
			else this.onpong(data);
			this._state = GET_INFO;
		}
		/**
		* Handles an error.
		*
		* @param {Error} err The error
		* @param {Number} code Close code
		* @private
		*/
		error(err, code) {
			this.onerror(err, code);
			this._hadError = true;
			this._loop = false;
			this.cleanup(this._cleanupCallback);
		}
		/**
		* Checks payload size, disconnects socket when it exceeds `maxPayload`.
		*
		* @param {Number} length Payload length
		* @private
		*/
		maxPayloadExceeded(length) {
			if (length === 0 || this._maxPayload < 1) return false;
			const fullLength = this._totalPayloadLength + length;
			if (fullLength <= this._maxPayload) {
				this._totalPayloadLength = fullLength;
				return false;
			}
			this.error(/* @__PURE__ */ new Error("max payload size exceeded"), 1009);
			return true;
		}
		/**
		* Appends a fragment in the fragments array after checking that the sum of
		* fragment lengths does not exceed `maxPayload`.
		*
		* @param {Buffer} fragment The fragment to add
		* @return {Boolean} `true` if `maxPayload` is not exceeded, else `false`
		* @private
		*/
		pushFragment(fragment) {
			if (fragment.length === 0) return true;
			const totalLength = this._messageLength + fragment.length;
			if (this._maxPayload < 1 || totalLength <= this._maxPayload) {
				this._messageLength = totalLength;
				this._fragments.push(fragment);
				return true;
			}
			this.error(/* @__PURE__ */ new Error("max payload size exceeded"), 1009);
			return false;
		}
		/**
		* Releases resources used by the receiver.
		*
		* @param {Function} cb Callback
		* @public
		*/
		cleanup(cb) {
			this._dead = true;
			if (!this._hadError && (this._loop || this._state === INFLATING)) this._cleanupCallback = cb;
			else {
				this._extensions = null;
				this._fragments = null;
				this._buffers = null;
				this._mask = null;
				this._cleanupCallback = null;
				this.onmessage = null;
				this.onclose = null;
				this.onerror = null;
				this.onping = null;
				this.onpong = null;
				if (cb) cb();
			}
		}
	};
	module.exports = Receiver$1;
	/**
	* Makes a buffer from a list of fragments.
	*
	* @param {Buffer[]} fragments The list of fragments composing the message
	* @param {Number} messageLength The length of the message
	* @return {Buffer}
	* @private
	*/
	function toBuffer(fragments, messageLength) {
		if (fragments.length === 1) return fragments[0];
		if (fragments.length > 1) return bufferUtil$1.concat(fragments, messageLength);
		return constants$2.EMPTY_BUFFER;
	}
	/**
	* Converts a buffer to an `ArrayBuffer`.
	*
	* @param {Buffer} The buffer to convert
	* @return {ArrayBuffer} Converted buffer
	*/
	function toArrayBuffer(buf) {
		if (buf.byteOffset === 0 && buf.byteLength === buf.buffer.byteLength) return buf.buffer;
		return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
	}
}) });

//#endregion
//#region ../../node_modules/.pnpm/ws@3.2.0/node_modules/ws/lib/Sender.js
/*!
* ws: a node.js websocket client
* Copyright(c) 2011 Einar Otto Stangvik <einaros@gmail.com>
* MIT Licensed
*/
var require_Sender = /* @__PURE__ */ __commonJS({ "../../node_modules/.pnpm/ws@3.2.0/node_modules/ws/lib/Sender.js": ((exports, module) => {
	const safeBuffer$1 = require_safe_buffer();
	const crypto$2 = require("crypto");
	const PerMessageDeflate$2 = require_PerMessageDeflate();
	const bufferUtil = require_BufferUtil();
	const ErrorCodes = require_ErrorCodes();
	const Buffer$2 = safeBuffer$1.Buffer;
	/**
	* HyBi Sender implementation.
	*/
	var Sender$1 = class Sender$1 {
		/**
		* Creates a Sender instance.
		*
		* @param {net.Socket} socket The connection socket
		* @param {Object} extensions An object containing the negotiated extensions
		*/
		constructor(socket, extensions) {
			this._extensions = extensions || {};
			this._socket = socket;
			this._firstFragment = true;
			this._compress = false;
			this._bufferedBytes = 0;
			this._deflating = false;
			this._queue = [];
			this.onerror = null;
		}
		/**
		* Frames a piece of data according to the HyBi WebSocket protocol.
		*
		* @param {Buffer} data The data to frame
		* @param {Object} options Options object
		* @param {Number} options.opcode The opcode
		* @param {Boolean} options.readOnly Specifies whether `data` can be modified
		* @param {Boolean} options.fin Specifies whether or not to set the FIN bit
		* @param {Boolean} options.mask Specifies whether or not to mask `data`
		* @param {Boolean} options.rsv1 Specifies whether or not to set the RSV1 bit
		* @return {Buffer[]} The framed data as a list of `Buffer` instances
		* @public
		*/
		static frame(data, options) {
			const merge$2 = data.length < 1024 || options.mask && options.readOnly;
			var offset = options.mask ? 6 : 2;
			var payloadLength = data.length;
			if (data.length >= 65536) {
				offset += 8;
				payloadLength = 127;
			} else if (data.length > 125) {
				offset += 2;
				payloadLength = 126;
			}
			const target = Buffer$2.allocUnsafe(merge$2 ? data.length + offset : offset);
			target[0] = options.fin ? options.opcode | 128 : options.opcode;
			if (options.rsv1) target[0] |= 64;
			if (payloadLength === 126) target.writeUInt16BE(data.length, 2, true);
			else if (payloadLength === 127) {
				target.writeUInt32BE(0, 2, true);
				target.writeUInt32BE(data.length, 6, true);
			}
			if (!options.mask) {
				target[1] = payloadLength;
				if (merge$2) {
					data.copy(target, offset);
					return [target];
				}
				return [target, data];
			}
			const mask = crypto$2.randomBytes(4);
			target[1] = payloadLength | 128;
			target[offset - 4] = mask[0];
			target[offset - 3] = mask[1];
			target[offset - 2] = mask[2];
			target[offset - 1] = mask[3];
			if (merge$2) {
				bufferUtil.mask(data, mask, target, offset, data.length);
				return [target];
			}
			bufferUtil.mask(data, mask, data, 0, data.length);
			return [target, data];
		}
		/**
		* Sends a close message to the other peer.
		*
		* @param {(Number|undefined)} code The status code component of the body
		* @param {String} data The message component of the body
		* @param {Boolean} mask Specifies whether or not to mask the message
		* @param {Function} cb Callback
		* @public
		*/
		close(code, data, mask, cb) {
			if (code !== void 0 && (typeof code !== "number" || !ErrorCodes.isValidErrorCode(code))) throw new Error("first argument must be a valid error code number");
			const buf = Buffer$2.allocUnsafe(2 + (data ? Buffer$2.byteLength(data) : 0));
			buf.writeUInt16BE(code || 1e3, 0, true);
			if (buf.length > 2) buf.write(data, 2);
			if (this._deflating) this.enqueue([
				this.doClose,
				buf,
				mask,
				cb
			]);
			else this.doClose(buf, mask, cb);
		}
		/**
		* Frames and sends a close message.
		*
		* @param {Buffer} data The message to send
		* @param {Boolean} mask Specifies whether or not to mask `data`
		* @param {Function} cb Callback
		* @private
		*/
		doClose(data, mask, cb) {
			this.sendFrame(Sender$1.frame(data, {
				fin: true,
				rsv1: false,
				opcode: 8,
				mask,
				readOnly: false
			}), cb);
		}
		/**
		* Sends a ping message to the other peer.
		*
		* @param {*} data The message to send
		* @param {Boolean} mask Specifies whether or not to mask `data`
		* @public
		*/
		ping(data, mask) {
			var readOnly = true;
			if (!Buffer$2.isBuffer(data)) if (data instanceof ArrayBuffer) data = Buffer$2.from(data);
			else if (ArrayBuffer.isView(data)) data = viewToBuffer(data);
			else {
				data = Buffer$2.from(data);
				readOnly = false;
			}
			if (this._deflating) this.enqueue([
				this.doPing,
				data,
				mask,
				readOnly
			]);
			else this.doPing(data, mask, readOnly);
		}
		/**
		* Frames and sends a ping message.
		*
		* @param {*} data The message to send
		* @param {Boolean} mask Specifies whether or not to mask `data`
		* @param {Boolean} readOnly Specifies whether `data` can be modified
		* @private
		*/
		doPing(data, mask, readOnly) {
			this.sendFrame(Sender$1.frame(data, {
				fin: true,
				rsv1: false,
				opcode: 9,
				mask,
				readOnly
			}));
		}
		/**
		* Sends a pong message to the other peer.
		*
		* @param {*} data The message to send
		* @param {Boolean} mask Specifies whether or not to mask `data`
		* @public
		*/
		pong(data, mask) {
			var readOnly = true;
			if (!Buffer$2.isBuffer(data)) if (data instanceof ArrayBuffer) data = Buffer$2.from(data);
			else if (ArrayBuffer.isView(data)) data = viewToBuffer(data);
			else {
				data = Buffer$2.from(data);
				readOnly = false;
			}
			if (this._deflating) this.enqueue([
				this.doPong,
				data,
				mask,
				readOnly
			]);
			else this.doPong(data, mask, readOnly);
		}
		/**
		* Frames and sends a pong message.
		*
		* @param {*} data The message to send
		* @param {Boolean} mask Specifies whether or not to mask `data`
		* @param {Boolean} readOnly Specifies whether `data` can be modified
		* @private
		*/
		doPong(data, mask, readOnly) {
			this.sendFrame(Sender$1.frame(data, {
				fin: true,
				rsv1: false,
				opcode: 10,
				mask,
				readOnly
			}));
		}
		/**
		* Sends a data message to the other peer.
		*
		* @param {*} data The message to send
		* @param {Object} options Options object
		* @param {Boolean} options.compress Specifies whether or not to compress `data`
		* @param {Boolean} options.binary Specifies whether `data` is binary or text
		* @param {Boolean} options.fin Specifies whether the fragment is the last one
		* @param {Boolean} options.mask Specifies whether or not to mask `data`
		* @param {Function} cb Callback
		* @public
		*/
		send(data, options, cb) {
			var opcode = options.binary ? 2 : 1;
			var rsv1 = options.compress;
			var readOnly = true;
			if (!Buffer$2.isBuffer(data)) if (data instanceof ArrayBuffer) data = Buffer$2.from(data);
			else if (ArrayBuffer.isView(data)) data = viewToBuffer(data);
			else {
				data = Buffer$2.from(data);
				readOnly = false;
			}
			const perMessageDeflate = this._extensions[PerMessageDeflate$2.extensionName];
			if (this._firstFragment) {
				this._firstFragment = false;
				if (rsv1 && perMessageDeflate) rsv1 = data.length >= perMessageDeflate._threshold;
				this._compress = rsv1;
			} else {
				rsv1 = false;
				opcode = 0;
			}
			if (options.fin) this._firstFragment = true;
			if (perMessageDeflate) {
				const opts = {
					fin: options.fin,
					rsv1,
					opcode,
					mask: options.mask,
					readOnly
				};
				if (this._deflating) this.enqueue([
					this.dispatch,
					data,
					this._compress,
					opts,
					cb
				]);
				else this.dispatch(data, this._compress, opts, cb);
			} else this.sendFrame(Sender$1.frame(data, {
				fin: options.fin,
				rsv1: false,
				opcode,
				mask: options.mask,
				readOnly
			}), cb);
		}
		/**
		* Dispatches a data message.
		*
		* @param {Buffer} data The message to send
		* @param {Boolean} compress Specifies whether or not to compress `data`
		* @param {Object} options Options object
		* @param {Number} options.opcode The opcode
		* @param {Boolean} options.readOnly Specifies whether `data` can be modified
		* @param {Boolean} options.fin Specifies whether or not to set the FIN bit
		* @param {Boolean} options.mask Specifies whether or not to mask `data`
		* @param {Boolean} options.rsv1 Specifies whether or not to set the RSV1 bit
		* @param {Function} cb Callback
		* @private
		*/
		dispatch(data, compress, options, cb) {
			if (!compress) {
				this.sendFrame(Sender$1.frame(data, options), cb);
				return;
			}
			const perMessageDeflate = this._extensions[PerMessageDeflate$2.extensionName];
			this._deflating = true;
			perMessageDeflate.compress(data, options.fin, (err, buf) => {
				if (err) {
					if (cb) cb(err);
					else this.onerror(err);
					return;
				}
				options.readOnly = false;
				this.sendFrame(Sender$1.frame(buf, options), cb);
				this._deflating = false;
				this.dequeue();
			});
		}
		/**
		* Executes queued send operations.
		*
		* @private
		*/
		dequeue() {
			while (!this._deflating && this._queue.length) {
				const params = this._queue.shift();
				this._bufferedBytes -= params[1].length;
				params[0].apply(this, params.slice(1));
			}
		}
		/**
		* Enqueues a send operation.
		*
		* @param {Array} params Send operation parameters.
		* @private
		*/
		enqueue(params) {
			this._bufferedBytes += params[1].length;
			this._queue.push(params);
		}
		/**
		* Sends a frame.
		*
		* @param {Buffer[]} list The frame to send
		* @param {Function} cb Callback
		* @private
		*/
		sendFrame(list, cb) {
			if (list.length === 2) {
				this._socket.write(list[0]);
				this._socket.write(list[1], cb);
			} else this._socket.write(list[0], cb);
		}
	};
	module.exports = Sender$1;
	/**
	* Converts an `ArrayBuffer` view into a buffer.
	*
	* @param {(DataView|TypedArray)} view The view to convert
	* @return {Buffer} Converted view
	* @private
	*/
	function viewToBuffer(view) {
		const buf = Buffer$2.from(view.buffer);
		if (view.byteLength !== view.buffer.byteLength) return buf.slice(view.byteOffset, view.byteOffset + view.byteLength);
		return buf;
	}
}) });

//#endregion
//#region ../../node_modules/.pnpm/ws@3.2.0/node_modules/ws/lib/WebSocket.js
/*!
* ws: a node.js websocket client
* Copyright(c) 2011 Einar Otto Stangvik <einaros@gmail.com>
* MIT Licensed
*/
var require_WebSocket = /* @__PURE__ */ __commonJS({ "../../node_modules/.pnpm/ws@3.2.0/node_modules/ws/lib/WebSocket.js": ((exports, module) => {
	const EventEmitter$2 = require("events");
	const crypto$1 = require("crypto");
	const Ultron$1 = require_ultron();
	const https = require("https");
	const http$1 = require("http");
	const url$1 = require("url");
	const PerMessageDeflate$1 = require_PerMessageDeflate();
	const EventTarget = require_EventTarget();
	const Extensions$1 = require_Extensions();
	const constants$1 = require_Constants();
	const Receiver = require_Receiver();
	const Sender = require_Sender();
	const protocolVersions = [8, 13];
	const closeTimeout = 30 * 1e3;
	/**
	* Class representing a WebSocket.
	*
	* @extends EventEmitter
	*/
	var WebSocket$3 = class WebSocket$3 extends EventEmitter$2 {
		/**
		* Create a new `WebSocket`.
		*
		* @param {String} address The URL to which to connect
		* @param {(String|String[])} protocols The subprotocols
		* @param {Object} options Connection options
		*/
		constructor(address, protocols, options) {
			super();
			if (!protocols) protocols = [];
			else if (typeof protocols === "string") protocols = [protocols];
			else if (!Array.isArray(protocols)) {
				options = protocols;
				protocols = [];
			}
			this.readyState = WebSocket$3.CONNECTING;
			this.bytesReceived = 0;
			this.extensions = {};
			this.protocol = "";
			this._binaryType = constants$1.BINARY_TYPES[0];
			this._finalize = this.finalize.bind(this);
			this._finalizeCalled = false;
			this._closeMessage = null;
			this._closeTimer = null;
			this._closeCode = null;
			this._receiver = null;
			this._sender = null;
			this._socket = null;
			this._ultron = null;
			if (Array.isArray(address)) initAsServerClient.call(this, address[0], address[1], options);
			else initAsClient.call(this, address, protocols, options);
		}
		get CONNECTING() {
			return WebSocket$3.CONNECTING;
		}
		get CLOSING() {
			return WebSocket$3.CLOSING;
		}
		get CLOSED() {
			return WebSocket$3.CLOSED;
		}
		get OPEN() {
			return WebSocket$3.OPEN;
		}
		/**
		* @type {Number}
		*/
		get bufferedAmount() {
			var amount = 0;
			if (this._socket) amount = this._socket.bufferSize + this._sender._bufferedBytes;
			return amount;
		}
		/**
		* This deviates from the WHATWG interface since ws doesn't support the required
		* default "blob" type (instead we define a custom "nodebuffer" type).
		*
		* @type {String}
		*/
		get binaryType() {
			return this._binaryType;
		}
		set binaryType(type) {
			if (constants$1.BINARY_TYPES.indexOf(type) < 0) return;
			this._binaryType = type;
			if (this._receiver) this._receiver._binaryType = type;
		}
		/**
		* Set up the socket and the internal resources.
		*
		* @param {net.Socket} socket The network socket between the server and client
		* @param {Buffer} head The first packet of the upgraded stream
		* @private
		*/
		setSocket(socket, head) {
			socket.setTimeout(0);
			socket.setNoDelay();
			this._receiver = new Receiver(this.extensions, this._maxPayload, this.binaryType);
			this._sender = new Sender(socket, this.extensions);
			this._ultron = new Ultron$1(socket);
			this._socket = socket;
			this._ultron.on("close", this._finalize);
			this._ultron.on("error", this._finalize);
			this._ultron.on("end", this._finalize);
			if (head.length > 0) socket.unshift(head);
			this._ultron.on("data", (data) => {
				this.bytesReceived += data.length;
				this._receiver.add(data);
			});
			this._receiver.onmessage = (data) => this.emit("message", data);
			this._receiver.onping = (data) => {
				this.pong(data, !this._isServer, true);
				this.emit("ping", data);
			};
			this._receiver.onpong = (data) => this.emit("pong", data);
			this._receiver.onclose = (code, reason) => {
				this._closeMessage = reason;
				this._closeCode = code;
				this.close(code, reason);
			};
			this._receiver.onerror = (error, code) => {
				this.close(code, "");
				this.emit("error", error);
			};
			this._sender.onerror = (error) => {
				this.close(1002, "");
				this.emit("error", error);
			};
			this.readyState = WebSocket$3.OPEN;
			this.emit("open");
		}
		/**
		* Clean up and release internal resources.
		*
		* @param {(Boolean|Error)} Indicates whether or not an error occurred
		* @private
		*/
		finalize(error) {
			if (this._finalizeCalled) return;
			this.readyState = WebSocket$3.CLOSING;
			this._finalizeCalled = true;
			clearTimeout(this._closeTimer);
			this._closeTimer = null;
			if (error) this._closeCode = 1006;
			if (this._socket) {
				this._ultron.destroy();
				this._socket.on("error", function onerror() {
					this.destroy();
				});
				if (!error) this._socket.end();
				else this._socket.destroy();
				this._socket = null;
				this._ultron = null;
			}
			if (this._sender) this._sender = this._sender.onerror = null;
			if (this._receiver) {
				this._receiver.cleanup(() => this.emitClose());
				this._receiver = null;
			} else this.emitClose();
		}
		/**
		* Emit the `close` event.
		*
		* @private
		*/
		emitClose() {
			this.readyState = WebSocket$3.CLOSED;
			this.emit("close", this._closeCode || 1006, this._closeMessage || "");
			if (this.extensions[PerMessageDeflate$1.extensionName]) this.extensions[PerMessageDeflate$1.extensionName].cleanup();
			this.extensions = null;
			this.removeAllListeners();
			this.on("error", constants$1.NOOP);
		}
		/**
		* Pause the socket stream.
		*
		* @public
		*/
		pause() {
			if (this.readyState !== WebSocket$3.OPEN) throw new Error("not opened");
			this._socket.pause();
		}
		/**
		* Resume the socket stream
		*
		* @public
		*/
		resume() {
			if (this.readyState !== WebSocket$3.OPEN) throw new Error("not opened");
			this._socket.resume();
		}
		/**
		* Start a closing handshake.
		*
		* @param {Number} code Status code explaining why the connection is closing
		* @param {String} data A string explaining why the connection is closing
		* @public
		*/
		close(code, data) {
			if (this.readyState === WebSocket$3.CLOSED) return;
			if (this.readyState === WebSocket$3.CONNECTING) {
				if (this._req && !this._req.aborted) {
					this._req.abort();
					this.emit("error", /* @__PURE__ */ new Error("closed before the connection is established"));
					this.finalize(true);
				}
				return;
			}
			if (this.readyState === WebSocket$3.CLOSING) {
				if (this._closeCode && this._socket) this._socket.end();
				return;
			}
			this.readyState = WebSocket$3.CLOSING;
			this._sender.close(code, data, !this._isServer, (err) => {
				if (err) this.emit("error", err);
				if (this._socket) {
					if (this._closeCode) this._socket.end();
					clearTimeout(this._closeTimer);
					this._closeTimer = setTimeout(this._finalize, closeTimeout, true);
				}
			});
		}
		/**
		* Send a ping message.
		*
		* @param {*} data The message to send
		* @param {Boolean} mask Indicates whether or not to mask `data`
		* @param {Boolean} failSilently Indicates whether or not to throw if `readyState` isn't `OPEN`
		* @public
		*/
		ping(data, mask, failSilently) {
			if (this.readyState !== WebSocket$3.OPEN) {
				if (failSilently) return;
				throw new Error("not opened");
			}
			if (typeof data === "number") data = data.toString();
			if (mask === void 0) mask = !this._isServer;
			this._sender.ping(data || constants$1.EMPTY_BUFFER, mask);
		}
		/**
		* Send a pong message.
		*
		* @param {*} data The message to send
		* @param {Boolean} mask Indicates whether or not to mask `data`
		* @param {Boolean} failSilently Indicates whether or not to throw if `readyState` isn't `OPEN`
		* @public
		*/
		pong(data, mask, failSilently) {
			if (this.readyState !== WebSocket$3.OPEN) {
				if (failSilently) return;
				throw new Error("not opened");
			}
			if (typeof data === "number") data = data.toString();
			if (mask === void 0) mask = !this._isServer;
			this._sender.pong(data || constants$1.EMPTY_BUFFER, mask);
		}
		/**
		* Send a data message.
		*
		* @param {*} data The message to send
		* @param {Object} options Options object
		* @param {Boolean} options.compress Specifies whether or not to compress `data`
		* @param {Boolean} options.binary Specifies whether `data` is binary or text
		* @param {Boolean} options.fin Specifies whether the fragment is the last one
		* @param {Boolean} options.mask Specifies whether or not to mask `data`
		* @param {Function} cb Callback which is executed when data is written out
		* @public
		*/
		send(data, options, cb) {
			if (typeof options === "function") {
				cb = options;
				options = {};
			}
			if (this.readyState !== WebSocket$3.OPEN) {
				if (cb) cb(/* @__PURE__ */ new Error("not opened"));
				else throw new Error("not opened");
				return;
			}
			if (typeof data === "number") data = data.toString();
			const opts = Object.assign({
				binary: typeof data !== "string",
				mask: !this._isServer,
				compress: true,
				fin: true
			}, options);
			if (!this.extensions[PerMessageDeflate$1.extensionName]) opts.compress = false;
			this._sender.send(data || constants$1.EMPTY_BUFFER, opts, cb);
		}
		/**
		* Forcibly close the connection.
		*
		* @public
		*/
		terminate() {
			if (this.readyState === WebSocket$3.CLOSED) return;
			if (this.readyState === WebSocket$3.CONNECTING) {
				if (this._req && !this._req.aborted) {
					this._req.abort();
					this.emit("error", /* @__PURE__ */ new Error("closed before the connection is established"));
					this.finalize(true);
				}
				return;
			}
			this.finalize(true);
		}
	};
	WebSocket$3.CONNECTING = 0;
	WebSocket$3.OPEN = 1;
	WebSocket$3.CLOSING = 2;
	WebSocket$3.CLOSED = 3;
	[
		"open",
		"error",
		"close",
		"message"
	].forEach((method) => {
		Object.defineProperty(WebSocket$3.prototype, `on${method}`, {
			get() {
				const listeners = this.listeners(method);
				for (var i$1 = 0; i$1 < listeners.length; i$1++) if (listeners[i$1]._listener) return listeners[i$1]._listener;
			},
			set(listener) {
				const listeners = this.listeners(method);
				for (var i$1 = 0; i$1 < listeners.length; i$1++) if (listeners[i$1]._listener) this.removeListener(method, listeners[i$1]);
				this.addEventListener(method, listener);
			}
		});
	});
	WebSocket$3.prototype.addEventListener = EventTarget.addEventListener;
	WebSocket$3.prototype.removeEventListener = EventTarget.removeEventListener;
	module.exports = WebSocket$3;
	/**
	* Initialize a WebSocket server client.
	*
	* @param {http.IncomingMessage} req The request object
	* @param {net.Socket} socket The network socket between the server and client
	* @param {Buffer} head The first packet of the upgraded stream
	* @param {Object} options WebSocket attributes
	* @param {Number} options.protocolVersion The WebSocket protocol version
	* @param {Object} options.extensions The negotiated extensions
	* @param {Number} options.maxPayload The maximum allowed message size
	* @param {String} options.protocol The chosen subprotocol
	* @private
	*/
	function initAsServerClient(socket, head, options) {
		this.protocolVersion = options.protocolVersion;
		this._maxPayload = options.maxPayload;
		this.extensions = options.extensions;
		this.protocol = options.protocol;
		this._isServer = true;
		this.setSocket(socket, head);
	}
	/**
	* Initialize a WebSocket client.
	*
	* @param {String} address The URL to which to connect
	* @param {String[]} protocols The list of subprotocols
	* @param {Object} options Connection options
	* @param {String} options.protocol Value of the `Sec-WebSocket-Protocol` header
	* @param {(Boolean|Object)} options.perMessageDeflate Enable/disable permessage-deflate
	* @param {Number} options.handshakeTimeout Timeout in milliseconds for the handshake request
	* @param {String} options.localAddress Local interface to bind for network connections
	* @param {Number} options.protocolVersion Value of the `Sec-WebSocket-Version` header
	* @param {Object} options.headers An object containing request headers
	* @param {String} options.origin Value of the `Origin` or `Sec-WebSocket-Origin` header
	* @param {http.Agent} options.agent Use the specified Agent
	* @param {String} options.host Value of the `Host` header
	* @param {Number} options.family IP address family to use during hostname lookup (4 or 6).
	* @param {Function} options.checkServerIdentity A function to validate the server hostname
	* @param {Boolean} options.rejectUnauthorized Verify or not the server certificate
	* @param {String} options.passphrase The passphrase for the private key or pfx
	* @param {String} options.ciphers The ciphers to use or exclude
	* @param {(String|String[]|Buffer|Buffer[])} options.cert The certificate key
	* @param {(String|String[]|Buffer|Buffer[])} options.key The private key
	* @param {(String|Buffer)} options.pfx The private key, certificate, and CA certs
	* @param {(String|String[]|Buffer|Buffer[])} options.ca Trusted certificates
	* @private
	*/
	function initAsClient(address, protocols, options) {
		options = Object.assign({
			protocolVersion: protocolVersions[1],
			protocol: protocols.join(","),
			perMessageDeflate: true,
			handshakeTimeout: null,
			localAddress: null,
			headers: null,
			family: null,
			origin: null,
			agent: null,
			host: null,
			checkServerIdentity: null,
			rejectUnauthorized: null,
			passphrase: null,
			ciphers: null,
			cert: null,
			key: null,
			pfx: null,
			ca: null
		}, options);
		if (protocolVersions.indexOf(options.protocolVersion) === -1) throw new Error(`unsupported protocol version: ${options.protocolVersion} (supported versions: ${protocolVersions.join(", ")})`);
		this.protocolVersion = options.protocolVersion;
		this._isServer = false;
		this.url = address;
		const serverUrl = url$1.parse(address);
		const isUnixSocket = serverUrl.protocol === "ws+unix:";
		if (!serverUrl.host && (!isUnixSocket || !serverUrl.path)) throw new Error("invalid url");
		const isSecure = serverUrl.protocol === "wss:" || serverUrl.protocol === "https:";
		const key = crypto$1.randomBytes(16).toString("base64");
		const httpObj = isSecure ? https : http$1;
		const extensionsOffer = {};
		var perMessageDeflate;
		if (options.perMessageDeflate) {
			perMessageDeflate = new PerMessageDeflate$1(options.perMessageDeflate !== true ? options.perMessageDeflate : {}, false);
			extensionsOffer[PerMessageDeflate$1.extensionName] = perMessageDeflate.offer();
		}
		const requestOptions = {
			port: serverUrl.port || (isSecure ? 443 : 80),
			host: serverUrl.hostname,
			path: "/",
			headers: {
				"Sec-WebSocket-Version": options.protocolVersion,
				"Sec-WebSocket-Key": key,
				"Connection": "Upgrade",
				"Upgrade": "websocket"
			}
		};
		if (options.headers) Object.assign(requestOptions.headers, options.headers);
		if (Object.keys(extensionsOffer).length) requestOptions.headers["Sec-WebSocket-Extensions"] = Extensions$1.format(extensionsOffer);
		if (options.protocol) requestOptions.headers["Sec-WebSocket-Protocol"] = options.protocol;
		if (options.origin) if (options.protocolVersion < 13) requestOptions.headers["Sec-WebSocket-Origin"] = options.origin;
		else requestOptions.headers.Origin = options.origin;
		if (options.host) requestOptions.headers.Host = options.host;
		if (serverUrl.auth) requestOptions.auth = serverUrl.auth;
		if (options.localAddress) requestOptions.localAddress = options.localAddress;
		if (options.family) requestOptions.family = options.family;
		if (isUnixSocket) {
			const parts = serverUrl.path.split(":");
			requestOptions.socketPath = parts[0];
			requestOptions.path = parts[1];
		} else if (serverUrl.path) if (serverUrl.path.charAt(0) !== "/") requestOptions.path = `/${serverUrl.path}`;
		else requestOptions.path = serverUrl.path;
		var agent = options.agent;
		if (options.rejectUnauthorized != null || options.checkServerIdentity || options.passphrase || options.ciphers || options.cert || options.key || options.pfx || options.ca) {
			if (options.passphrase) requestOptions.passphrase = options.passphrase;
			if (options.ciphers) requestOptions.ciphers = options.ciphers;
			if (options.cert) requestOptions.cert = options.cert;
			if (options.key) requestOptions.key = options.key;
			if (options.pfx) requestOptions.pfx = options.pfx;
			if (options.ca) requestOptions.ca = options.ca;
			if (options.checkServerIdentity) requestOptions.checkServerIdentity = options.checkServerIdentity;
			if (options.rejectUnauthorized != null) requestOptions.rejectUnauthorized = options.rejectUnauthorized;
			if (!agent) agent = new httpObj.Agent(requestOptions);
		}
		if (agent) requestOptions.agent = agent;
		this._req = httpObj.get(requestOptions);
		if (options.handshakeTimeout) this._req.setTimeout(options.handshakeTimeout, () => {
			this._req.abort();
			this.emit("error", /* @__PURE__ */ new Error("opening handshake has timed out"));
			this.finalize(true);
		});
		this._req.on("error", (error) => {
			if (this._req.aborted) return;
			this._req = null;
			this.emit("error", error);
			this.finalize(true);
		});
		this._req.on("response", (res) => {
			if (!this.emit("unexpected-response", this._req, res)) {
				this._req.abort();
				this.emit("error", /* @__PURE__ */ new Error(`unexpected server response (${res.statusCode})`));
				this.finalize(true);
			}
		});
		this._req.on("upgrade", (res, socket, head) => {
			this.emit("headers", res.headers, res);
			if (this.readyState !== WebSocket$3.CONNECTING) return;
			this._req = null;
			const digest = crypto$1.createHash("sha1").update(key + constants$1.GUID, "binary").digest("base64");
			if (res.headers["sec-websocket-accept"] !== digest) {
				socket.destroy();
				this.emit("error", /* @__PURE__ */ new Error("invalid server key"));
				return this.finalize(true);
			}
			const serverProt = res.headers["sec-websocket-protocol"];
			const protList = (options.protocol || "").split(/, */);
			var protError;
			if (!options.protocol && serverProt) protError = "server sent a subprotocol even though none requested";
			else if (options.protocol && !serverProt) protError = "server sent no subprotocol even though requested";
			else if (serverProt && protList.indexOf(serverProt) === -1) protError = "server responded with an invalid protocol";
			if (protError) {
				socket.destroy();
				this.emit("error", new Error(protError));
				return this.finalize(true);
			}
			if (serverProt) this.protocol = serverProt;
			const serverExtensions = Extensions$1.parse(res.headers["sec-websocket-extensions"]);
			if (perMessageDeflate && serverExtensions[PerMessageDeflate$1.extensionName]) {
				try {
					perMessageDeflate.accept(serverExtensions[PerMessageDeflate$1.extensionName]);
				} catch (err) {
					socket.destroy();
					this.emit("error", /* @__PURE__ */ new Error("invalid extension parameter"));
					return this.finalize(true);
				}
				this.extensions[PerMessageDeflate$1.extensionName] = perMessageDeflate;
			}
			this.setSocket(socket, head);
		});
	}
}) });

//#endregion
//#region ../../node_modules/.pnpm/ws@3.2.0/node_modules/ws/lib/WebSocketServer.js
/*!
* ws: a node.js websocket client
* Copyright(c) 2011 Einar Otto Stangvik <einaros@gmail.com>
* MIT Licensed
*/
var require_WebSocketServer = /* @__PURE__ */ __commonJS({ "../../node_modules/.pnpm/ws@3.2.0/node_modules/ws/lib/WebSocketServer.js": ((exports, module) => {
	const safeBuffer = require_safe_buffer();
	const EventEmitter$1 = require("events");
	const crypto = require("crypto");
	const Ultron = require_ultron();
	const http = require("http");
	const url = require("url");
	const PerMessageDeflate = require_PerMessageDeflate();
	const Extensions = require_Extensions();
	const constants = require_Constants();
	const WebSocket$2 = require_WebSocket();
	const Buffer$1 = safeBuffer.Buffer;
	/**
	* Class representing a WebSocket server.
	*
	* @extends EventEmitter
	*/
	var WebSocketServer = class extends EventEmitter$1 {
		/**
		* Create a `WebSocketServer` instance.
		*
		* @param {Object} options Configuration options
		* @param {String} options.host The hostname where to bind the server
		* @param {Number} options.port The port where to bind the server
		* @param {http.Server} options.server A pre-created HTTP/S server to use
		* @param {Function} options.verifyClient An hook to reject connections
		* @param {Function} options.handleProtocols An hook to handle protocols
		* @param {String} options.path Accept only connections matching this path
		* @param {Boolean} options.noServer Enable no server mode
		* @param {Boolean} options.clientTracking Specifies whether or not to track clients
		* @param {(Boolean|Object)} options.perMessageDeflate Enable/disable permessage-deflate
		* @param {Number} options.maxPayload The maximum allowed message size
		* @param {Function} callback A listener for the `listening` event
		*/
		constructor(options, callback) {
			super();
			options = Object.assign({
				maxPayload: 100 * 1024 * 1024,
				perMessageDeflate: false,
				handleProtocols: null,
				clientTracking: true,
				verifyClient: null,
				noServer: false,
				backlog: null,
				server: null,
				host: null,
				path: null,
				port: null
			}, options);
			if (options.port == null && !options.server && !options.noServer) throw new TypeError("missing or invalid options");
			if (options.port != null) {
				this._server = http.createServer((req, res) => {
					const body = http.STATUS_CODES[426];
					res.writeHead(426, {
						"Content-Length": body.length,
						"Content-Type": "text/plain"
					});
					res.end(body);
				});
				this._server.allowHalfOpen = false;
				this._server.listen(options.port, options.host, options.backlog, callback);
			} else if (options.server) this._server = options.server;
			if (this._server) {
				this._ultron = new Ultron(this._server);
				this._ultron.on("listening", () => this.emit("listening"));
				this._ultron.on("error", (err) => this.emit("error", err));
				this._ultron.on("upgrade", (req, socket, head) => {
					this.handleUpgrade(req, socket, head, (client) => {
						this.emit("connection", client, req);
					});
				});
			}
			if (options.clientTracking) this.clients = /* @__PURE__ */ new Set();
			this.options = options;
		}
		/**
		* Close the server.
		*
		* @param {Function} cb Callback
		* @public
		*/
		close(cb) {
			if (this.clients) for (const client of this.clients) client.terminate();
			const server = this._server;
			if (server) {
				this._ultron.destroy();
				this._ultron = this._server = null;
				if (this.options.port != null) return server.close(cb);
			}
			if (cb) cb();
		}
		/**
		* See if a given request should be handled by this server instance.
		*
		* @param {http.IncomingMessage} req Request object to inspect
		* @return {Boolean} `true` if the request is valid, else `false`
		* @public
		*/
		shouldHandle(req) {
			if (this.options.path && url.parse(req.url).pathname !== this.options.path) return false;
			return true;
		}
		/**
		* Handle a HTTP Upgrade request.
		*
		* @param {http.IncomingMessage} req The request object
		* @param {net.Socket} socket The network socket between the server and client
		* @param {Buffer} head The first packet of the upgraded stream
		* @param {Function} cb Callback
		* @public
		*/
		handleUpgrade(req, socket, head, cb) {
			socket.on("error", socketError);
			const version = +req.headers["sec-websocket-version"];
			if (req.method !== "GET" || req.headers.upgrade.toLowerCase() !== "websocket" || !req.headers["sec-websocket-key"] || version !== 8 && version !== 13 || !this.shouldHandle(req)) return abortConnection(socket, 400);
			var protocol = (req.headers["sec-websocket-protocol"] || "").split(/, */);
			if (this.options.handleProtocols) {
				protocol = this.options.handleProtocols(protocol, req);
				if (protocol === false) return abortConnection(socket, 401);
			} else protocol = protocol[0];
			if (this.options.verifyClient) {
				const info = {
					origin: req.headers[`${version === 8 ? "sec-websocket-origin" : "origin"}`],
					secure: !!(req.connection.authorized || req.connection.encrypted),
					req
				};
				if (this.options.verifyClient.length === 2) {
					this.options.verifyClient(info, (verified, code, message) => {
						if (!verified) return abortConnection(socket, code || 401, message);
						this.completeUpgrade(protocol, version, req, socket, head, cb);
					});
					return;
				} else if (!this.options.verifyClient(info)) return abortConnection(socket, 401);
			}
			this.completeUpgrade(protocol, version, req, socket, head, cb);
		}
		/**
		* Upgrade the connection to WebSocket.
		*
		* @param {String} protocol The chosen subprotocol
		* @param {Number} version The WebSocket protocol version
		* @param {http.IncomingMessage} req The request object
		* @param {net.Socket} socket The network socket between the server and client
		* @param {Buffer} head The first packet of the upgraded stream
		* @param {Function} cb Callback
		* @private
		*/
		completeUpgrade(protocol, version, req, socket, head, cb) {
			if (!socket.readable || !socket.writable) return socket.destroy();
			const headers = [
				"HTTP/1.1 101 Switching Protocols",
				"Upgrade: websocket",
				"Connection: Upgrade",
				`Sec-WebSocket-Accept: ${crypto.createHash("sha1").update(req.headers["sec-websocket-key"] + constants.GUID, "binary").digest("base64")}`
			];
			if (protocol) headers.push(`Sec-WebSocket-Protocol: ${protocol}`);
			const offer = Extensions.parse(req.headers["sec-websocket-extensions"]);
			var extensions;
			try {
				extensions = acceptExtensions(this.options, offer);
			} catch (err) {
				return abortConnection(socket, 400);
			}
			const props = Object.keys(extensions);
			if (props.length) {
				const serverExtensions = props.reduce((obj, key) => {
					obj[key] = [extensions[key].params];
					return obj;
				}, {});
				headers.push(`Sec-WebSocket-Extensions: ${Extensions.format(serverExtensions)}`);
			}
			this.emit("headers", headers, req);
			socket.write(headers.concat("", "").join("\r\n"));
			const client = new WebSocket$2([socket, head], null, {
				maxPayload: this.options.maxPayload,
				protocolVersion: version,
				extensions,
				protocol
			});
			if (this.clients) {
				this.clients.add(client);
				client.on("close", () => this.clients.delete(client));
			}
			socket.removeListener("error", socketError);
			cb(client);
		}
	};
	module.exports = WebSocketServer;
	/**
	* Handle premature socket errors.
	*
	* @private
	*/
	function socketError() {
		this.destroy();
	}
	/**
	* Accept WebSocket extensions.
	*
	* @param {Object} options The `WebSocketServer` configuration options
	* @param {Object} offer The parsed value of the `sec-websocket-extensions` header
	* @return {Object} Accepted extensions
	* @private
	*/
	function acceptExtensions(options, offer) {
		const pmd = options.perMessageDeflate;
		const extensions = {};
		if (pmd && offer[PerMessageDeflate.extensionName]) {
			const perMessageDeflate = new PerMessageDeflate(pmd !== true ? pmd : {}, true, options.maxPayload);
			perMessageDeflate.accept(offer[PerMessageDeflate.extensionName]);
			extensions[PerMessageDeflate.extensionName] = perMessageDeflate;
		}
		return extensions;
	}
	/**
	* Close the connection when preconditions are not fulfilled.
	*
	* @param {net.Socket} socket The socket of the upgrade request
	* @param {Number} code The HTTP response status code
	* @param {String} [message] The HTTP response body
	* @private
	*/
	function abortConnection(socket, code, message) {
		if (socket.writable) {
			message = message || http.STATUS_CODES[code];
			socket.write(`HTTP/1.1 ${code} ${http.STATUS_CODES[code]}\r\nConnection: close\r
Content-type: text/html\r
Content-Length: ${Buffer$1.byteLength(message)}\r\n\r
` + message);
		}
		socket.removeListener("error", socketError);
		socket.destroy();
	}
}) });

//#endregion
//#region ../../node_modules/.pnpm/ws@3.2.0/node_modules/ws/index.js
/*!
* ws: a node.js websocket client
* Copyright(c) 2011 Einar Otto Stangvik <einaros@gmail.com>
* MIT Licensed
*/
var require_ws = /* @__PURE__ */ __commonJS({ "../../node_modules/.pnpm/ws@3.2.0/node_modules/ws/index.js": ((exports, module) => {
	const WebSocket$1 = require_WebSocket();
	WebSocket$1.Server = require_WebSocketServer();
	WebSocket$1.Receiver = require_Receiver();
	WebSocket$1.Sender = require_Sender();
	module.exports = WebSocket$1;
}) });

//#endregion
//#region src/bll/Project.js
var require_Project = /* @__PURE__ */ __commonJS({ "src/bll/Project.js": ((exports, module) => {
	const path$1 = require("node:path");
	const { InteractionMode } = require("@haiku/core/lib/helpers/interactionModes");
	const { getSafeProjectName, getProjectNameSafeShort, getDefaultIllustratorAssetPath, getDefaultSketchAssetPath, getReactProjectName, getProjectNameLowerCase, readPackageJson, getAngularSelectorName } = require("@haiku/sdk-client");
	const async = require("async");
	const { Experiment, experimentIsEnabled } = require("haiku-common");
	const fse$2 = require("haiku-fs-extra");
	const { EnvoyClient, EnvoyLogger, GLASS_CHANNEL } = require("haiku-sdk-creator");
	const jss = require("json-stable-stringify");
	const lodash = require("lodash");
	const WebSocket = require_ws();
	const logger$3 = require_LoggerInstance();
	const ActionStack$1 = require_ActionStack();
	const BaseModel$1 = require_BaseModel();
	const toTitleCase$1 = require_toTitleCase();
	const Lock$1 = require_Lock();
	const SILENT_METHODS = {
		hoverElement: true,
		unhoverElement: true
	};
	/**
	* @class Project
	* @description
	*  Representation of an entire project folder, including:
	*    - All File objects tracked therein
	*    - All ActiveComponent objects
	*    - And all descendant model objects of those
	*
	*  This is also where Plumbing websockets and Envoy clients are attached.
	*  This handles transmitting updates to all the other views when updates happen.
	*  It also handles routing remote method calls to the appropriate ActiveComponent.
	*  TODO: A nice next step would be to Envoy-ize all of this.
	*/
	var Project$1 = class Project$1 extends BaseModel$1 {
		constructor(props, opts) {
			super(props, opts);
			this.metadata = {
				from: this.alias,
				alias: this.alias
			};
			this.ensurePlatformHaikuRegistry();
			this.actionStack = new ActionStack$1({
				uid: this.getPrimaryKey(),
				project: this
			});
			this.actionStack.on("next", (method, params, done$1) => {
				logger$3.info(`[project (${this.getAlias()})] sending action: ${method}`);
				this.websocket.action(method, params, (err, out$1) => {
					done$1(err, out$1);
				}, this.getFolder());
			});
			this._didStartWebsocketListeners = false;
			this.connectClients();
			this._activeComponentSceneName = null;
			ActiveComponent$1.on("update", (ac, what, entity) => {
				this.emit("update", what, entity, ac, this.getMetadata());
			});
			/**
			* @type {Array.<{scenename: string, active: boolean}>}
			* @private
			*/
			this._multiComponentTabs = [];
			this.isHandlingMethods = true;
			this.interactionMode = InteractionMode.EDIT;
			this.actionStackIndex = 0;
		}
		teardown() {
			this.stopHandlingMethods();
			this.getEnvoyClient().closeConnection();
			if (this.websocket) this.websocket.disconnect();
			this.actionStack.stop();
		}
		stopHandlingMethods() {
			this.isHandlingMethods = false;
		}
		startHandlingMethods() {
			this.isHandlingMethods = true;
		}
		connectClients() {
			this.startHandlingMethods();
			if (this.websocket) {
				this.websocket.connect();
				if (!this._didStartWebsocketListeners) {
					this.websocket.on("method", this.receiveMethodCall.bind(this));
					this.websocket.on("close", () => logger$3.info(`[project (${this.getAlias()})] websocket closed`));
					this.websocket.on("error", () => logger$3.info(`[project (${this.getAlias()})] websocket error`));
					this._didStartWebsocketListeners = true;
				}
			}
			if (this._envoyClient) {} else {
				const websocketClient = this.WebSocket || typeof window !== "undefined" && window.WebSocket || WebSocket;
				this._envoyClient = new EnvoyClient(Object.assign({
					WebSocket: websocketClient,
					logger: new EnvoyLogger("warn")
				}, this.getEnvoyOptions()));
				this._envoyClient.get("timeline").then((timelineChannel) => {
					this._envoyTimelineChannel = timelineChannel;
					this.emit("envoy:timelineClientReady", this._envoyTimelineChannel);
				});
				this._envoyClient.get(GLASS_CHANNEL).then((glassChannel) => {
					this._envoyGlassChannel = glassChannel;
					this.emit("envoy:glassClientReady", this._envoyGlassChannel);
				});
				this._envoyClient.get("tour").then((tourChannel) => {
					this._envoyTourChannel = tourChannel;
					if (!this._envoyClient.isInMockMode()) this._envoyTourChannel.requestWebviewCoordinates().then(() => {
						this.emit("envoy:tourClientReady", this._envoyTourChannel);
					});
				});
			}
		}
		isIgnoringMethodRequestsForMethod(method) {
			const fileOptions = this.getFileOptions();
			return fileOptions && fileOptions.methodsToIgnore && fileOptions.methodsToIgnore[method];
		}
		receiveMethodCall(method, params, message, cb) {
			if (!this.isHandlingMethods) return cb();
			if (this.isIgnoringMethodRequestsForMethod(method)) return null;
			return this.handleMethodCall(method, params, message, cb);
		}
		handleMethodCall(method, params, message, cb) {
			return Lock$1.request(Lock$1.LOCKS.ProjectMethodHandler, false, (release) => {
				if (typeof params[0] === "string" && typeof ActiveComponent$1.prototype[method] === "function") return this.findActiveComponentBySource(params[0], (findAcError, ac) => {
					if (findAcError) {
						release();
						return cb(findAcError);
					}
					if (!SILENT_METHODS[method]) logger$3.info(`[project (${this.getAlias()})] component handling method ${method}`);
					return ac[method].apply(ac, params.slice(1).concat((err) => {
						release();
						return cb(err);
					}));
				});
				if (typeof this[method] === "function") {
					if (!SILENT_METHODS) logger$3.info(`[project (${this.getAlias()})] project handling method ${method}`);
					return this[method].apply(this, params.concat((err) => {
						release();
						return cb(err);
					}));
				}
				release();
				throw new Error(`Unknown project method ${method}`);
			});
		}
		ensurePlatformHaikuRegistry() {
			if (!this.platform) this.platform = {};
			if (!this.platform.haiku) this.platform.haiku = {};
			if (!this.platform.haiku.registry) this.platform.haiku.registry = {};
		}
		getName() {
			const parts = this.folder.split(path$1.sep);
			return parts[parts.length - 1];
		}
		getNameVariations() {
			return Project$1.getProjectNameVariations(this.getFolder());
		}
		getFriendlyName(maybeProjectName) {
			return maybeProjectName || toTitleCase$1(this.getName());
		}
		getCurrentActiveComponentSceneName() {
			const ac = this.getCurrentActiveComponent();
			return ac && ac.getSceneName();
		}
		getCurrentActiveComponentRelpath() {
			const ac = this.getCurrentActiveComponent();
			return ac && ac.getRelpath();
		}
		getCurrentActiveComponent() {
			if (!this._activeComponentSceneName) return null;
			return this.findActiveComponentBySceneName(this._activeComponentSceneName);
		}
		getAllActiveComponents() {
			return ActiveComponent$1.where({ project: this });
		}
		addActiveComponentToMultiComponentTabs(scenename, active = false) {
			for (const tab of this._multiComponentTabs) if (tab.scenename === scenename) {
				tab.active = active;
				return;
			}
			this._multiComponentTabs.push({
				scenename,
				active
			});
		}
		removeActiveComponentFromMultiComponentTabs(scenename) {
			const index = this._multiComponentTabs.findIndex((tab) => tab.scenename === scenename);
			if (index !== -1) this._multiComponentTabs.splice(index, 1);
		}
		describeSubComponents() {
			return this._multiComponentTabs.map(({ scenename, active }) => {
				return {
					isActive: !!active,
					scenename,
					title: toTitleCase$1(scenename)
				};
			});
		}
		describeUndoState() {
			const ac = this.getCurrentActiveComponent();
			const filter = (doable) => !doable.ac || doable.ac === ac;
			return {
				canUndo: this.actionStack.getUndoables().filter(filter).length > 0,
				canRedo: this.actionStack.getRedoables().filter(filter).length > 0
			};
		}
		describeTopMenu() {
			return {
				subComponents: this.describeSubComponents(),
				undoState: this.describeUndoState()
			};
		}
		getExistingComponentNames() {
			const names = { main: true };
			this._multiComponentTabs.forEach((tab) => {
				names[tab.scenename] = true;
			});
			return names;
		}
		getNextAvailableSceneNameWithPrefix(prefix, num = 0) {
			const full = `${prefix}${num < 2 ? "" : `_${num}`}`;
			if (!this.findActiveComponentBySceneName(full)) return full;
			return this.getNextAvailableSceneNameWithPrefix(prefix, num + 1);
		}
		getMultiComponentTabs() {
			return this._multiComponentTabs;
		}
		getMetadata() {
			return this.metadata;
		}
		getFileOptions() {
			return this.fileOptions;
		}
		getEnvoyOptions() {
			return this.envoyOptions;
		}
		getFolder() {
			return this.folder;
		}
		getAlias() {
			return this.alias;
		}
		buildFileUid(relpath) {
			return path$1.join(this.getFolder(), relpath);
		}
		getEnvoyChannel(name) {
			switch (name) {
				case "timeline": return this._envoyTimelineChannel;
				case "glass": return this._envoyGlassChannel;
				case "tour": return this._envoyTourChannel;
				default: throw new Error("Envoy channel name required");
			}
		}
		getEnvoyClient() {
			return this._envoyClient;
		}
		getPlatform() {
			return this.platform;
		}
		undo(options, metadata, cb) {
			this.actionStack.undo(options, metadata, cb);
		}
		redo(options, metadata, cb) {
			this.actionStack.redo(options, metadata, cb);
		}
		advanceActionStackIndex() {
			this.actionStackIndex++;
		}
		updateHook(...args) {
			const method = args.shift();
			const tx = args.pop();
			const metadata = Object.assign({}, args.pop());
			args.push(metadata);
			delete metadata.actionStackIndex;
			return this.actionStack.handleActionInitiation(method, args, metadata, (handleActionResolution) => tx((err, out$1) => {
				if (experimentIsEnabled(Experiment.IpcIntegrityCheck) && metadata.integrity !== false) {
					const integrity = this.describeIntegrity();
					if (metadata.integrity && this.isRemoteRequest(metadata)) {
						const mismatch = integritiesMismatched(metadata.integrity, integrity);
						if (mismatch) {
							logger$3.error(`
                Integrity mismatch due to ${method} in ${this.getAlias()}:
                  ${metadata.from} (their result):
                    ${mismatch[0]}
                  ${this.getAlias()} (our result):
                    ${mismatch[1]}
              `);
							if (experimentIsEnabled(Experiment.CrashOnIpcIntegrityCheckFailure)) {
								let message = `Unable to update component (${method} in ${this.getAlias()})`;
								if (process.env.NODE_ENV !== "production") message = `CRASH! Stop editing now and open dev tools (Cmd+Option+I). ${message}`;
								throw new Error(message);
							}
						}
					}
					Object.assign(metadata, { integrity });
				}
				if (!this.isRemoteRequest(metadata)) {
					this.emit("update", method, ...args);
					this.actionStack.enqueueAction(method, [this.getFolder()].concat(args), () => {
						metadata.actionStackIndex = this.actionStackIndex;
						this.advanceActionStackIndex();
						handleActionResolution(err, out$1);
					});
				} else {
					this.emit("remote-update", method, ...args);
					handleActionResolution(err, out$1);
				}
			}));
		}
		getWebsocketBroadcastDefaults() {
			return {
				time: Date.now(),
				type: "broadcast",
				folder: this.getFolder(),
				from: this.getMetadata().alias
			};
		}
		broadcastPayload(mainPayload) {
			const fullPayloadWithMetadata = Object.assign(this.getWebsocketBroadcastDefaults(), mainPayload);
			this.websocket.send(fullPayloadWithMetadata);
		}
		upsertFile({ relpath, type }) {
			const spec = Object.assign({}, File$1.DEFAULT_ATTRIBUTES, {
				uid: this.buildFileUid(relpath),
				folder: this.getFolder(),
				dtModified: Date.now(),
				project: this,
				relpath,
				type
			});
			return File$1.upsert(spec, this.getFileOptions());
		}
		isRemoteRequest(metadata) {
			return metadata && metadata.from !== this.getAlias();
		}
		isLocalUpdate(metadata) {
			return metadata && metadata.from === this.getAlias();
		}
		masterHeartbeat(cb) {
			return this.websocket.request({
				folder: this.getFolder(),
				method: "masterHeartbeat",
				params: [this.getFolder()]
			}, cb);
		}
		saveProject(project, saveOptions = {}, cb) {
			return this.websocket.request({
				folder: this.getFolder(),
				method: "saveProject",
				params: [project, saveOptions]
			}, cb);
		}
		setInteractionMode(interactionMode, metadata, cb) {
			const components = ActiveComponent$1.where({ project: this });
			return Lock$1.request(Lock$1.LOCKS.ActiveComponentWork, false, (release) => {
				return async.eachSeries(components, (component, next) => {
					return component.moduleFindOrCreate("basicReload", {}, (err) => {
						if (err) return next(err);
						return component.setInteractionMode(interactionMode, next);
					});
				}, (err) => {
					if (err) {
						release();
						return cb(err);
					}
					this.interactionMode = interactionMode;
					release();
					this.updateHook("setInteractionMode", interactionMode, metadata, (fire) => fire());
					return cb();
				});
			});
		}
		getInteractionMode() {
			return this.interactionMode;
		}
		toggleInteractionMode(metadata, cb) {
			const interactionMode = this.interactionMode === InteractionMode.EDIT ? InteractionMode.LIVE : InteractionMode.EDIT;
			this.setInteractionMode(interactionMode, metadata, cb);
		}
		linkAsset(assetAbspath, cb) {
			return this.websocket.request({
				folder: this.getFolder(),
				method: "linkAsset",
				params: [assetAbspath, this.getFolder()]
			}, cb);
		}
		unlinkAsset(assetRelpath, cb) {
			return this.websocket.request({
				folder: this.getFolder(),
				method: "unlinkAsset",
				params: [assetRelpath, this.getFolder()]
			}, cb);
		}
		bulkLinkAssets(assetAbspaths, cb) {
			return this.websocket.request({
				folder: this.getFolder(),
				method: "bulkLinkAssets",
				params: [assetAbspaths, this.getFolder()]
			}, cb);
		}
		listAssets(cb) {
			return this.websocket.request({
				folder: this.getFolder(),
				method: "listAssets",
				params: [this.getFolder()]
			}, cb);
		}
		readAllStateValues(cb) {
			return this.websocket.method("readAllStateValues", [this.getFolder(), this.getCurrentActiveComponentRelpath()], cb);
		}
		queryImageSize(abspath, cb) {
			return this.websocket.method("queryImageSize", [abspath], cb);
		}
		mergeDesigns(designs, metadata, cb) {
			const ac = this.getCurrentActiveComponent();
			if (!ac) {
				logger$3.warn(`[project] skipping design merge since no component is active`);
				return cb();
			}
			ac.codeReloadingOn();
			return Lock$1.request(Lock$1.LOCKS.ActiveComponentWork, false, (release) => {
				return this.updateHook("mergeDesigns", designs, metadata || this.getMetadata(), (fire) => {
					const components = ActiveComponent$1.where({ project: this });
					return async.eachSeries(components, (component, next) => {
						return component.moduleFindOrCreate("basicReload", {}, (err) => {
							if (err) return next(err);
							return component.mergeDesignFiles(designs, next);
						});
					}, (err) => {
						if (err) {
							ac.codeReloadingOff();
							release();
							logger$3.error(`[project (${this.getAlias()})]`, err);
							return cb(err);
						}
						return ac.reload({
							hardReload: true,
							clearCacheOptions: { doClearEntityCaches: true }
						}, null, () => {
							ac.codeReloadingOff();
							release();
							fire();
							return cb();
						});
					});
				});
			});
		}
		addActiveComponentToRegistry(activeComponent) {
			const activeComponentKey = path$1.join(this.getFolder(), activeComponent.getRelpath());
			this.ensurePlatformHaikuRegistry();
			this.platform.haiku.registry[activeComponentKey] = activeComponent;
			this.addActiveComponentToMultiComponentTabs(activeComponent.getSceneName(), false);
		}
		removeActiveComponentFromRegistry(activeComponent) {
			const activeComponentKey = path$1.join(this.getFolder(), activeComponent.getRelpath());
			this.ensurePlatformHaikuRegistry();
			delete this.platform.haiku.registry[activeComponentKey];
			this.removeActiveComponentFromMultiComponentTabs(activeComponent.getSceneName());
		}
		deleteSceneByName(scenename, cb) {
			const ac = this.findActiveComponentBySceneName(scenename);
			if (!ac) return cb();
			this.removeActiveComponentFromRegistry(ac);
			this.emit("update", "updateMenu");
			ac.destroy(true);
			return cb();
		}
		upsertSceneByName(scenename, cb) {
			const relpath = path$1.join("code", scenename, "code.js");
			return this.upsertComponentBytecodeToModule(relpath, cb);
		}
		findOrCreateActiveComponent(scenename, cb) {
			const ac = this.findActiveComponentBySceneName(scenename);
			if (ac) return cb(null, ac);
			return this.upsertSceneByName(scenename, (err) => {
				if (err) return cb(err);
				return cb(null, this.findActiveComponentBySceneName(scenename));
			});
		}
		setCurrentActiveComponent(scenename, metadata, cb) {
			metadata.integrity = false;
			return Lock$1.request(Lock$1.LOCKS.SetCurrentActiveComponent, false, (release) => {
				this.findOrCreateActiveComponent(scenename, (err, ac) => {
					if (err) {
						release();
						return cb(err);
					}
					this.addActiveComponentToMultiComponentTabs(scenename, true);
					this._multiComponentTabs.forEach((tab) => {
						tab.active = tab.scenename === scenename;
					});
					return Lock$1.awaitAllLocksFreeExcept([Lock$1.LOCKS.SetCurrentActiveComponent, Lock$1.LOCKS.ProjectMethodHandler], () => {
						const currentActiveComponent = this.getCurrentActiveComponent();
						if (currentActiveComponent) currentActiveComponent.emit("update", "componentDeactivating");
						this._activeComponentSceneName = scenename;
						this.updateHook("setCurrentActiveComponent", scenename, metadata || this.getMetadata(), (fire) => {
							fire();
							release();
							return cb(null, ac);
						});
					});
				});
			});
		}
		closeNamedActiveComponent(scenename, metadata, cb) {
			for (let i$1 = this._multiComponentTabs.length - 1; i$1 >= 0; i$1--) {
				const tab = this._multiComponentTabs[i$1];
				if (tab.scenename === scenename) this._multiComponentTabs.splice(i$1, 1);
				else tab.active = false;
			}
			this._activeComponentSceneName = this._multiComponentTabs[0];
			this.updateHook("closeNamedActiveComponent", scenename, metadata || this.getMetadata(), (fire) => fire());
			if (cb) return cb();
		}
		renameComponent(scenenameOld, scenenameNew, metadata, cb) {
			throw new Error("not yet implemented");
		}
		/**
		* Standard import and instantiation of files dropped
		* in Haiku from the user file system by:
		* - Handling the drop event
		* - Filtering files that are not supported
		* - Linking the assets via plumbing
		*/
		linkExternalAssetOnDrop(event, cb) {
			if (Asset$1.isInternalDrop(event)) return cb();
			event.preventDefault();
			const files = Array.from(event.dataTransfer.items).filter(Asset$1.isValidFile).map((item) => item.getAsFile().path);
			return this.websocket.request({
				folder: this.getFolder(),
				method: "bulkLinkAssets",
				params: [files, this.getFolder()]
			}, cb);
		}
		/**
		* @method upsertComponentBytecodeToFile
		* @description Given a relpath and a bytecode object, insert a component file
		* at the given relpath with the given bytecode as its code.js export. If the
		* file already exists, we'll merge the bytecode objects' contents together.
		* The relpath here is the destination of the file to write to within the project
		* @param relpath {String} Relative path to destination code file within project
		* @param cb {Function}
		*/
		upsertComponentBytecodeToModule(relpath, cb) {
			this.upsertActiveComponentInstance(relpath, (err, ac) => {
				if (err) return cb(err);
				return ac.mountApplication(null, {}, (err$1) => {
					if (err$1) return cb(err$1);
					this.emit("active-component:upserted");
					return cb(null, ac);
				});
			});
		}
		relpathToSceneName(relpath) {
			return path$1.normalize(relpath).split(path$1.sep)[1];
		}
		upsertActiveComponentInstance(relpath, cb) {
			const abspath = path$1.join(this.getFolder(), relpath);
			return Lock$1.request(Lock$1.LOCKS.FileReadWrite(abspath), false, (release) => {
				const file = this.upsertFile({
					relpath,
					type: File$1.TYPES.code
				});
				release();
				return cb(null, file.component);
			});
		}
		findActiveComponentBySource(relpath, cb) {
			const scenename = ModuleWrapper$1.getScenenameFromRelpath(relpath);
			return this.findOrCreateActiveComponent(scenename, cb);
		}
		findActiveComponentBySourceIfPresent(relpath) {
			const scenename = ModuleWrapper$1.getScenenameFromRelpath(relpath);
			return this.findActiveComponentBySceneName(scenename);
		}
		findActiveComponentBySceneName(scenename) {
			return ActiveComponent$1.findById(ActiveComponent$1.buildPrimaryKey(this.getFolder(), scenename));
		}
		getPackageJsonPath() {
			return path$1.join(this.getFolder(), "package.json");
		}
		getDefaultComponentInfo() {}
		readPackageJsonSafe(cb) {
			let pkg;
			try {
				pkg = fse$2.readJsonSync(this.getPackageJsonPath(), { throws: false });
			} catch (exception) {
				logger$3.warn(`[project (${this.getAlias()})] package.json error:`, exception);
				pkg = {};
			}
			return cb(pkg);
		}
		writePackageJson(pkg, cb) {
			try {
				fse$2.outputJsonSync(this.getPackageJsonPath(), pkg);
			} catch (exception) {
				return cb(exception);
			}
			return cb();
		}
		readComponentInfo(scenename, cb) {
			return this.readPackageJsonSafe((pkg) => {
				const info = lodash.get(pkg, `haiku.${scenename}`) || {};
				const getMetadata = (cb$1) => {
					const ac = this.findActiveComponentBySceneName(scenename);
					if (!ac) return cb$1({});
					return ac.readMetadata((err, metadata) => {
						if (err) logger$3.warn(`[project (${this.getAlias()})] component metadata error:`, err);
						return cb$1(metadata || {});
					});
				};
				return getMetadata((metadata) => {
					return cb(null, lodash.assign({}, metadata, info));
				});
			});
		}
		getCodeFolderAbspath() {
			return path$1.join(this.getFolder(), "code");
		}
		rehydrate() {
			fse$2.readdirSync(this.getCodeFolderAbspath()).filter((entry) => {
				return entry && entry[0] !== ".";
			}).forEach((scenename) => {
				this.addActiveComponentToMultiComponentTabs(scenename);
			});
		}
		describeIntegrity() {
			const descriptor = {};
			this.getAllActiveComponents().forEach((ac) => {
				const relpath = ac.getRelpath();
				const { hash } = ac.getInsertionPointInfo();
				descriptor[relpath] = { hash };
			});
			return descriptor;
		}
	};
	Project$1.DEFAULT_OPTIONS = { required: {
		uid: true,
		folder: true,
		alias: true,
		userconfig: true,
		websocket: true,
		platform: true,
		fileOptions: true,
		envoyOptions: true
	} };
	BaseModel$1.extend(Project$1);
	module.exports = Project$1;
	Project$1.awaitOneUpdateFromActiveComponent = (activeComponent, channel, fn) => {
		let once = true;
		activeComponent.on("update", (what, a, b, c, d, e, f, g, h) => {
			if (once && what === channel) {
				once = false;
				fn(a, b, c, d, e, f, g, h);
			}
		});
	};
	Project$1.setup = (folder, alias, websocket, platform = {}, userconfig = {}, fileOptions = {}, envoyOptions = {}, cb) => {
		fse$2.mkdirpSync(path$1.join(folder, "code"));
		const project = Project$1.upsert({
			uid: folder,
			folder,
			alias,
			websocket,
			userconfig,
			platform,
			fileOptions,
			envoyOptions
		});
		project.rehydrate();
		return cb(null, project);
	};
	Project$1.getProjectNameVariations = (folder) => {
		const projectHaikuConfig = readPackageJson(folder).haiku;
		return {
			projectNameSafe: getSafeProjectName(projectHaikuConfig.project),
			projectNameSafeShort: getProjectNameSafeShort(projectHaikuConfig.project),
			projectNameLowerCase: getProjectNameLowerCase(projectHaikuConfig.project),
			reactProjectName: getReactProjectName(projectHaikuConfig.project),
			angularSelectorName: getAngularSelectorName(projectHaikuConfig.project),
			primaryAssetPath: getDefaultSketchAssetPath(projectHaikuConfig.project),
			defaultIllustratorAssetPath: getDefaultIllustratorAssetPath(projectHaikuConfig.project)
		};
	};
	function integritiesMismatched(i1, i2) {
		const s1 = jss(Object.keys(i1).reduce((accumulator, key) => {
			if (i2[key]) accumulator[key] = i1[key];
			return accumulator;
		}, {}));
		const s2 = jss(Object.keys(i1).reduce((accumulator, key) => {
			if (i1[key]) accumulator[key] = i2[key];
			return accumulator;
		}, {}));
		if (s1 !== s2) return [s1, s2];
		return false;
	}
	Project$1.PUBLIC_METHODS = {
		setCurrentActiveComponent: true,
		closeNamedActiveComponent: true,
		renameComponent: true
	};
	const ActiveComponent$1 = require_ActiveComponent();
	const Asset$1 = require_Asset();
	const File$1 = require_File();
	const ModuleWrapper$1 = require_ModuleWrapper();
}) });

//#endregion
//#region src/utils/filterWalkFolder.js
var require_filterWalkFolder = /* @__PURE__ */ __commonJS({ "src/utils/filterWalkFolder.js": ((exports, module) => {
	const path = require("node:path");
	const fse$1 = require("haiku-fs-extra");
	module.exports = (dir, filter, done$1) => {
		const items = [];
		return fse$1.walk(dir).on("data", (item) => {
			if (!filter) return items.push(item);
			if (filter(item.path, null, item, path.relative(dir, item.path))) return items.push(item);
		}).on("end", () => done$1(null, items)).on("error", done$1);
	};
}) });

//#endregion
//#region src/utils/Mixpanel.js
var require_Mixpanel = /* @__PURE__ */ __commonJS({ "src/utils/Mixpanel.js": ((exports, module) => {
	const os = require("node:os");
	const Mixpanel$1 = require("mixpanel");
	const logger$2 = require_LoggerInstance();
	const tokens = {
		development: "53f3639f564804dcb710fd18511d1c0b",
		production: "6f31d4f99cf71024ce27c3e404a79a61"
	};
	const token = process.env.NODE_ENV === "production" ? tokens.production : tokens.development;
	const mixpanel = Mixpanel$1.init(token, { protocol: "https" });
	mixpanel.token = token;
	const defaultPayload = {
		app: "haiku",
		arch: os.arch(),
		platform: os.platform(),
		type: os.type(),
		process: typeof window === "undefined" ? "renderer" : "main",
		node_env: process.env.NODE_ENV,
		release_environment: process.env.NODE_ENV,
		release_branch: process.env.HAIKU_RELEASE_BRANCH,
		release_platform: process.env.HAIKU_RELEASE_PLATFORM,
		release_version: process.env.HAIKU_RELEASE_VERSION,
		distinct_id: void 0
	};
	mixpanel.mergeToPayload = function mergeToPayload(keepPayload) {
		return Object.assign(defaultPayload, keepPayload);
	};
	function _getPayload(eventName, eventPayload) {
		return Object.assign({}, defaultPayload, eventPayload);
	}
	function _safeStringify(obj) {
		try {
			return JSON.stringify(obj);
		} catch (exception) {
			return null;
		}
	}
	mixpanel.haikuTrack = function haikuTrack(eventName, eventPayload) {
		const finalPayload = _getPayload(eventName, eventPayload);
		logger$2.info("[mixpanel]", eventName);
		return mixpanel.track(eventName, finalPayload);
	};
	const trackedEvents = {};
	mixpanel.haikuTrackOnce = function haikuTrackOnce(eventName, eventPayload) {
		const payloadString = _safeStringify(_getPayload(eventName, eventPayload));
		if (payloadString) {
			if (!trackedEvents[payloadString]) {
				trackedEvents[payloadString] = true;
				mixpanel.haikuTrack(eventName, eventPayload);
			}
		}
	};
	module.exports = mixpanel;
}) });

//#endregion
//#region src/utils/requestElementCoordinates.js
var require_requestElementCoordinates = /* @__PURE__ */ __commonJS({ "src/utils/requestElementCoordinates.js": ((exports, module) => {
	const { logger: logger$1 } = require_LoggerInstance();
	module.exports = function requestElementCoordinates$1({ currentWebview, requestedWebview, selector, shouldNotifyEnvoy, tourClient }, maxNumberOfTries = 15, currentNumberOfTries = 0) {
		if (currentWebview !== requestedWebview) return;
		if (document.getElementById("js-helper-project-loader")) return setTimeout(() => {
			requestElementCoordinates$1.apply(this, [
				...arguments,
				maxNumberOfTries,
				currentNumberOfTries
			]);
		}, 300);
		logger$1.info(`[${currentWebview}] handleRequestElementCoordinates`, selector, currentWebview);
		const domElement = document.querySelector(selector);
		if (domElement) {
			const { top, left, width, height } = domElement.getBoundingClientRect();
			if (shouldNotifyEnvoy) {
				logger$1.info(`[${currentWebview}] receive element coordinates`, selector, top, left);
				tourClient.receiveElementCoordinates(currentWebview, {
					top,
					left,
					width,
					height
				});
			}
		} else if (maxNumberOfTries >= currentNumberOfTries) setTimeout(() => {
			requestElementCoordinates$1.apply(this, [
				...arguments,
				maxNumberOfTries,
				currentNumberOfTries++
			]);
		}, 300);
		else logger$1.error(`[${currentWebview}] Error fetching ${selector} in webview ${currentWebview}`);
	};
}) });

//#endregion
//#region src/utils/serializeError.js
var require_serializeError = /* @__PURE__ */ __commonJS({ "src/utils/serializeError.js": ((exports, module) => {
	module.exports = function serializeError$2(err) {
		if (!err) return null;
		return {
			name: err.name,
			message: err.message,
			stack: err.stack,
			code: err.code,
			type: err.type
		};
	};
}) });

//#endregion
//#region src/utils/walkFiles.js
var require_walkFiles = /* @__PURE__ */ __commonJS({ "src/utils/walkFiles.js": ((exports, module) => {
	const fse = require("haiku-fs-extra");
	const filterWalkFolder$1 = require_filterWalkFolder();
	module.exports = function walkFiles$1(dir, done$1) {
		return filterWalkFolder$1(dir, fileOnlyFilter, done$1);
	};
	function fileOnlyFilter(abspath, _$2, fileObj, relpath) {
		if (relpath.match(/(^\.|\/\.|node_modules|bower_components|jspm_modules)/)) return false;
		return fse.lstatSync(abspath).isFile();
	}
}) });

//#endregion
//#region src/ws/MockWebsocket.js
var require_MockWebsocket = /* @__PURE__ */ __commonJS({ "src/ws/MockWebsocket.js": ((exports, module) => {
	var MockWebsocket$1 = class {
		constructor(eventEmitter = null) {
			this.eventEmitter = eventEmitter;
		}
		on(eventName, handler) {
			if (this.eventEmitter === null) return;
			this.eventEmitter.on(eventName, (_$2, payload) => {
				handler(payload);
			});
		}
		connect() {}
		disconnect() {}
		send() {}
		method() {}
		request() {}
		action(method, params, cb) {
			return cb();
		}
	};
	module.exports = MockWebsocket$1;
}) });

//#endregion
//#region src/ws/Websocket.js
var require_Websocket = /* @__PURE__ */ __commonJS({ "src/ws/Websocket.js": ((exports, module) => {
	const util = require("node:util");
	const EventEmitter = require("node:events").EventEmitter;
	const logger = require_LoggerInstance();
	const serializeError$1 = require_serializeError();
	const STATES = {
		CONNECTING: 0,
		OPEN: 1,
		CLOSING: 2,
		CLOSED: 3
	};
	function Websocket$1(url$2, folder, clientType, clientAlias, WebSocket$4, token$2) {
		EventEmitter.call(this);
		this.WebSocket = WebSocket$4;
		if (!this.WebSocket && typeof window !== "undefined") this.WebSocket = window.WebSocket;
		if (!url$2) throw new Error("A url is required");
		if (!clientType) throw new Error("A client type is required");
		if (!clientType) throw new Error("A client type is required");
		if (!folder) logger.warn("[websocket] received no folder argument");
		this.url = `${url$2}?type=${clientType}&alias=${clientAlias}`;
		if (folder) this.url += `&folder=${folder}`;
		if (token$2) this.url += `&token=${token$2}`;
		this.folder = folder;
		this.requests = {};
		this.workers = { connection: setInterval(() => {
			if (this._isPermanentlyDisconnected) return null;
			if (this.ws.readyState === STATES.CLOSING || this.ws.readyState === STATES.CLOSED) this.connect();
		}, 1e3) };
		this._isPermanentlyDisconnected = false;
		this.connect();
	}
	util.inherits(Websocket$1, EventEmitter);
	Websocket$1.prototype.disconnect = function disconnect() {
		this._isPermanentlyDisconnected = true;
		this.requests = {};
		if (this.ws) {
			if (this.ws.readyState === STATES.OPEN || this.ws.readyState === STATES.CONNECTING) this.ws.close();
		}
	};
	Websocket$1.prototype.connect = function connect(cb) {
		this._isPermanentlyDisconnected = false;
		const WebSocket$4 = this.WebSocket;
		if (this.ws) {
			if (this.ws.readyState === STATES.CLOSING || this.ws.readyState === STATES.CLOSED) {
				this.ws = new WebSocket$4(this.url);
				this.setupSocket();
			}
		} else {
			this.ws = new WebSocket$4(this.url);
			this.setupSocket();
		}
		if (cb) return this.whenConnected(cb);
	};
	Websocket$1.prototype.setupSocket = function setupSocket() {
		logger.info(`[websocket] connecting to ${this.url} (${this.folder || "?"})`);
		this.ws.onopen = () => {
			logger.info(`[websocket] connection opened (${this.url})`);
			this.emit("open");
		};
		this.ws.onclose = () => {
			logger.info(`[websocket] connection closed (${this.url})`);
			this.ws.readyState = this.WebSocket.CLOSED;
			this.emit("close");
		};
		this.ws.onerror = (error) => {
			if (error && error.message) logger.error(`[websocket] error: ${error}` && error.message);
			else logger.error("[websocket] error: ", error || "Unknown");
			this.emit("error", error);
		};
		this.ws.onmessage = (event) => {
			const message = JSON.parse(event.data);
			if (message.type === "broadcast") return this.emit("broadcast", message);
			if (message.type === "signal") return this.emit("signal", message);
			if (message.type === "relay") return this.emit("relay", message);
			if (this.requests[message.id]) {
				const entry = this.requests[message.id];
				delete this.requests[message.id];
				const callback = entry.callback;
				const error = message.error ? serializeError$1(message.error) : null;
				const result = message.result;
				return callback(error, result);
			}
			if (typeof message.method === "string") return this.emit("method", message.method, message.params || [], message, (error, result) => {
				return this.sendWhenConnected({
					id: message.id,
					folder: message.folder || this.folder,
					result: result !== void 0 ? result : void 0,
					error: error ? serializeError$1(error) : void 0
				});
			});
			return this.emit("message", message);
		};
		return this.ws;
	};
	Websocket$1.prototype.whenConnected = function whenConnected(cb) {
		if (this.ws.readyState === STATES.OPEN) return cb();
		return setTimeout(() => {
			return this.whenConnected(cb);
		}, 100);
	};
	Websocket$1.prototype.sendWhenConnected = function sendWhenConnected(message) {
		if (this.ws.readyState === STATES.OPEN) return this.sendImmediate(message);
		return this.whenConnected(() => {
			return this.sendImmediate(message);
		});
	};
	Websocket$1.prototype.sendImmediate = function sendImmediate(message) {
		if (this.ws.readyState === STATES.OPEN) return this.sendPayload(message);
		logger.warn(`[websocket] connection not open (state: ${this.ws.readyState})!`);
	};
	Websocket$1.prototype.sendPayload = function sendPayload(message) {
		if (typeof message !== "string") {
			if (!message.folder) message.folder = this.folder;
			message = JSON.stringify(message);
		}
		return this.ws.send(message);
	};
	Websocket$1.prototype.send = function send(message) {
		if (!message.folder) message.folder = this.folder;
		if (!message.alias) message.alias = this.alias;
		return this.sendWhenConnected(message);
	};
	Websocket$1.prototype.request = function request$2(message, callback) {
		if (message.id === void 0) message.id = `request-${Math.random()}`;
		let gotResponse = false;
		let timedOut = false;
		let timeoutInstance = null;
		if (message.timeout) timeoutInstance = setTimeout(() => {
			if (!gotResponse) {
				timedOut = true;
				if (typeof message.retry === "number" && message.retry > 0) {
					message.retry -= 1;
					return this.request(message, callback);
				}
				const error = /* @__PURE__ */ new Error("Timed out waiting for response");
				error.code = "ETIMEOUT";
				callback(error);
			}
		}, message.timeout);
		this.requests[message.id] = { callback: (err, a, b, c, d, e, f) => {
			gotResponse = true;
			if (timeoutInstance) clearTimeout(timeoutInstance);
			if (!timedOut) callback(err, a, b, c, d, e, f);
		} };
		return this.send(message);
	};
	Websocket$1.prototype.method = function method(method$1, params, cb) {
		return this.request({
			method: method$1,
			params: params || []
		}, cb);
	};
	Websocket$1.prototype.action = function action(method, params, cb, folder) {
		return this.request({
			type: "action",
			method,
			params: params || [],
			folder
		}, cb);
	};
	module.exports = Websocket$1;
}) });

//#endregion
//#region src/index.js
var import_ActionStack = /* @__PURE__ */ __toESM(require_ActionStack());
var import_ActiveComponent = /* @__PURE__ */ __toESM(require_ActiveComponent());
var import_Artboard = /* @__PURE__ */ __toESM(require_Artboard());
var import_Asset = /* @__PURE__ */ __toESM(require_Asset());
var import_AST = /* @__PURE__ */ __toESM(require_AST());
var import_BaseModel = /* @__PURE__ */ __toESM(require_BaseModel());
var import_Bytecode = /* @__PURE__ */ __toESM(require_Bytecode());
var import_Cache = /* @__PURE__ */ __toESM(require_Cache());
var import_Changelog = /* @__PURE__ */ __toESM(require_Changelog());
var import_Element = /* @__PURE__ */ __toESM(require_Element());
var import_ElementSelectionProxy = /* @__PURE__ */ __toESM(require_ElementSelectionProxy());
var import_Expression = /* @__PURE__ */ __toESM(require_Expression());
var import_Figma = /* @__PURE__ */ __toESM(require_Figma());
var import_File = /* @__PURE__ */ __toESM(require_File());
var import_FontComponent = /* @__PURE__ */ __toESM(require_FontComponent());
var import_toTitleCase = /* @__PURE__ */ __toESM(require_toTitleCase());
var import_Illustrator = /* @__PURE__ */ __toESM(require_Illustrator());
var import_ImageComponent = /* @__PURE__ */ __toESM(require_ImageComponent());
var import_InstalledComponent = /* @__PURE__ */ __toESM(require_InstalledComponent());
var import_Keyframe = /* @__PURE__ */ __toESM(require_Keyframe());
var import_Lock = /* @__PURE__ */ __toESM(require_Lock());
var import_MathUtils = /* @__PURE__ */ __toESM(require_MathUtils());
var import_ModuleWrapper = /* @__PURE__ */ __toESM(require_ModuleWrapper());
var import_MountElement = /* @__PURE__ */ __toESM(require_MountElement());
var import_Project = /* @__PURE__ */ __toESM(require_Project());
var import_Property = /* @__PURE__ */ __toESM(require_Property());
var import_PseudoFile = /* @__PURE__ */ __toESM(require_PseudoFile());
var import_Row = /* @__PURE__ */ __toESM(require_Row());
var import_SelectionMarquee = /* @__PURE__ */ __toESM(require_SelectionMarquee());
var import_Sketch = /* @__PURE__ */ __toESM(require_Sketch());
var import_State = /* @__PURE__ */ __toESM(require_State());
var import_DiskStorage = /* @__PURE__ */ __toESM(require_DiskStorage());
var import_MemoryStorage = /* @__PURE__ */ __toESM(require_MemoryStorage());
var import_Template = /* @__PURE__ */ __toESM(require_Template());
var import_Timeline = /* @__PURE__ */ __toESM(require_Timeline());
var import_TimelineProperty = /* @__PURE__ */ __toESM(require_TimelineProperty());
var import_TransformCache = /* @__PURE__ */ __toESM(require_TransformCache());
var import_getSvgOptimizer = /* @__PURE__ */ __toESM(require_getSvgOptimizer());
var import_CryptoUtils = /* @__PURE__ */ __toESM(require_CryptoUtils());
var import_EmitterManager = /* @__PURE__ */ __toESM(require_EmitterManager());
var import_ensureTrailingSlash = /* @__PURE__ */ __toESM(require_ensureTrailingSlash());
var import_fileManipulation = /* @__PURE__ */ __toESM(require_fileManipulation());
var import_filterWalkFolder = /* @__PURE__ */ __toESM(require_filterWalkFolder());
var import_HaikuHomeDir = /* @__PURE__ */ __toESM(require_HaikuHomeDir());
var import_Logger = /* @__PURE__ */ __toESM(require_Logger());
var import_LoggerInstance = /* @__PURE__ */ __toESM(require_LoggerInstance());
var import_Mixpanel = /* @__PURE__ */ __toESM(require_Mixpanel());
var import_overrideModulesLoaded = /* @__PURE__ */ __toESM(require_overrideModulesLoaded());
var import_randomAlphabetical = /* @__PURE__ */ __toESM(require_randomAlphabetical());
var import_requestElementCoordinates = /* @__PURE__ */ __toESM(require_requestElementCoordinates());
var import_serializeError = /* @__PURE__ */ __toESM(require_serializeError());
var import_sketchUtils = /* @__PURE__ */ __toESM(require_sketchUtils());
var import_walkFiles = /* @__PURE__ */ __toESM(require_walkFiles());
var import_MockWebsocket = /* @__PURE__ */ __toESM(require_MockWebsocket());
var import_Websocket = /* @__PURE__ */ __toESM(require_Websocket());

//#endregion
Object.defineProperty(exports, 'AST', {
  enumerable: true,
  get: function () {
    return import_AST.default;
  }
});
Object.defineProperty(exports, 'ActionStack', {
  enumerable: true,
  get: function () {
    return import_ActionStack.default;
  }
});
Object.defineProperty(exports, 'ActiveComponent', {
  enumerable: true,
  get: function () {
    return import_ActiveComponent.default;
  }
});
Object.defineProperty(exports, 'Artboard', {
  enumerable: true,
  get: function () {
    return import_Artboard.default;
  }
});
Object.defineProperty(exports, 'Asset', {
  enumerable: true,
  get: function () {
    return import_Asset.default;
  }
});
Object.defineProperty(exports, 'BaseModel', {
  enumerable: true,
  get: function () {
    return import_BaseModel.default;
  }
});
Object.defineProperty(exports, 'Bytecode', {
  enumerable: true,
  get: function () {
    return import_Bytecode.default;
  }
});
Object.defineProperty(exports, 'Cache', {
  enumerable: true,
  get: function () {
    return import_Cache.default;
  }
});
Object.defineProperty(exports, 'Changelog', {
  enumerable: true,
  get: function () {
    return import_Changelog.default;
  }
});
Object.defineProperty(exports, 'CryptoUtils', {
  enumerable: true,
  get: function () {
    return import_CryptoUtils.default;
  }
});
Object.defineProperty(exports, 'DiskStorage', {
  enumerable: true,
  get: function () {
    return import_DiskStorage.default;
  }
});
Object.defineProperty(exports, 'Element', {
  enumerable: true,
  get: function () {
    return import_Element.default;
  }
});
Object.defineProperty(exports, 'ElementSelectionProxy', {
  enumerable: true,
  get: function () {
    return import_ElementSelectionProxy.default;
  }
});
Object.defineProperty(exports, 'EmitterManager', {
  enumerable: true,
  get: function () {
    return import_EmitterManager.default;
  }
});
Object.defineProperty(exports, 'Expression', {
  enumerable: true,
  get: function () {
    return import_Expression.default;
  }
});
Object.defineProperty(exports, 'Figma', {
  enumerable: true,
  get: function () {
    return import_Figma.default;
  }
});
Object.defineProperty(exports, 'File', {
  enumerable: true,
  get: function () {
    return import_File.default;
  }
});
Object.defineProperty(exports, 'FontComponent', {
  enumerable: true,
  get: function () {
    return import_FontComponent.default;
  }
});
Object.defineProperty(exports, 'HaikuHomeDir', {
  enumerable: true,
  get: function () {
    return import_HaikuHomeDir.default;
  }
});
Object.defineProperty(exports, 'Illustrator', {
  enumerable: true,
  get: function () {
    return import_Illustrator.default;
  }
});
Object.defineProperty(exports, 'ImageComponent', {
  enumerable: true,
  get: function () {
    return import_ImageComponent.default;
  }
});
Object.defineProperty(exports, 'InstalledComponent', {
  enumerable: true,
  get: function () {
    return import_InstalledComponent.default;
  }
});
Object.defineProperty(exports, 'Keyframe', {
  enumerable: true,
  get: function () {
    return import_Keyframe.default;
  }
});
Object.defineProperty(exports, 'Lock', {
  enumerable: true,
  get: function () {
    return import_Lock.default;
  }
});
Object.defineProperty(exports, 'Logger', {
  enumerable: true,
  get: function () {
    return import_Logger.default;
  }
});
Object.defineProperty(exports, 'LoggerInstance', {
  enumerable: true,
  get: function () {
    return import_LoggerInstance.default;
  }
});
Object.defineProperty(exports, 'MathUtils', {
  enumerable: true,
  get: function () {
    return import_MathUtils.default;
  }
});
Object.defineProperty(exports, 'MemoryStorage', {
  enumerable: true,
  get: function () {
    return import_MemoryStorage.default;
  }
});
Object.defineProperty(exports, 'Mixpanel', {
  enumerable: true,
  get: function () {
    return import_Mixpanel.default;
  }
});
Object.defineProperty(exports, 'MockWebsocket', {
  enumerable: true,
  get: function () {
    return import_MockWebsocket.default;
  }
});
Object.defineProperty(exports, 'ModuleWrapper', {
  enumerable: true,
  get: function () {
    return import_ModuleWrapper.default;
  }
});
Object.defineProperty(exports, 'MountElement', {
  enumerable: true,
  get: function () {
    return import_MountElement.default;
  }
});
Object.defineProperty(exports, 'Project', {
  enumerable: true,
  get: function () {
    return import_Project.default;
  }
});
Object.defineProperty(exports, 'Property', {
  enumerable: true,
  get: function () {
    return import_Property.default;
  }
});
Object.defineProperty(exports, 'PseudoFile', {
  enumerable: true,
  get: function () {
    return import_PseudoFile.default;
  }
});
Object.defineProperty(exports, 'Row', {
  enumerable: true,
  get: function () {
    return import_Row.default;
  }
});
Object.defineProperty(exports, 'SelectionMarquee', {
  enumerable: true,
  get: function () {
    return import_SelectionMarquee.default;
  }
});
Object.defineProperty(exports, 'Sketch', {
  enumerable: true,
  get: function () {
    return import_Sketch.default;
  }
});
Object.defineProperty(exports, 'State', {
  enumerable: true,
  get: function () {
    return import_State.default;
  }
});
Object.defineProperty(exports, 'Template', {
  enumerable: true,
  get: function () {
    return import_Template.default;
  }
});
Object.defineProperty(exports, 'Timeline', {
  enumerable: true,
  get: function () {
    return import_Timeline.default;
  }
});
Object.defineProperty(exports, 'TimelineProperty', {
  enumerable: true,
  get: function () {
    return import_TimelineProperty.default;
  }
});
Object.defineProperty(exports, 'TransformCache', {
  enumerable: true,
  get: function () {
    return import_TransformCache.default;
  }
});
Object.defineProperty(exports, 'Websocket', {
  enumerable: true,
  get: function () {
    return import_Websocket.default;
  }
});
Object.defineProperty(exports, 'ensureTrailingSlash', {
  enumerable: true,
  get: function () {
    return import_ensureTrailingSlash.default;
  }
});
Object.defineProperty(exports, 'fileManipulation', {
  enumerable: true,
  get: function () {
    return import_fileManipulation.default;
  }
});
Object.defineProperty(exports, 'filterWalkFolder', {
  enumerable: true,
  get: function () {
    return import_filterWalkFolder.default;
  }
});
Object.defineProperty(exports, 'getSvgOptimizer', {
  enumerable: true,
  get: function () {
    return import_getSvgOptimizer.default;
  }
});
Object.defineProperty(exports, 'overrideModulesLoaded', {
  enumerable: true,
  get: function () {
    return import_overrideModulesLoaded.default;
  }
});
Object.defineProperty(exports, 'randomAlphabetical', {
  enumerable: true,
  get: function () {
    return import_randomAlphabetical.default;
  }
});
Object.defineProperty(exports, 'requestElementCoordinates', {
  enumerable: true,
  get: function () {
    return import_requestElementCoordinates.default;
  }
});
Object.defineProperty(exports, 'serializeError', {
  enumerable: true,
  get: function () {
    return import_serializeError.default;
  }
});
Object.defineProperty(exports, 'sketchUtils', {
  enumerable: true,
  get: function () {
    return import_sketchUtils.default;
  }
});
Object.defineProperty(exports, 'toTitleCase', {
  enumerable: true,
  get: function () {
    return import_toTitleCase.default;
  }
});
Object.defineProperty(exports, 'walkFiles', {
  enumerable: true,
  get: function () {
    return import_walkFiles.default;
  }
});