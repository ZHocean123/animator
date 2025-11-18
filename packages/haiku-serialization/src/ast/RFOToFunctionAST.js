/**
 * 将RFO转换为函数AST
 * @param {Object} rfo - RFO对象
 * @param {string} key - 键名
 * @returns {Object} 函数AST节点
 */

import paramsToFunctionASTParams from './paramsToFunctionASTParams.js';
import functionBodyStringToFunctionBodyAST from './functionBodyStringToFunctionBodyAST.js';
import wrapInHaikuInject from './wrapInHaikuInject.js';

function RFOToFunctionAST(rfo, key) {
  const type = rfo.type || 'FunctionExpression';
  let ast;
  switch(type) {
    case 'FunctionExpression':
      ast = {
        type: 'FunctionExpression',
        id: ((rfo.name && {type: 'Identifier', name: rfo.name}) || undefined),
        params: paramsToFunctionASTParams(rfo.params),
        body: functionBodyStringToFunctionBodyAST(rfo.body),
      };
      break;
    case 'ArrowFunctionExpression':
      ast = {
        type: 'ArrowFunctionExpression',
        params: paramsToFunctionASTParams(rfo.params),
        body: functionBodyStringToFunctionBodyAST(rfo.body),
      };
      break;
  }

  // If the function was labeled as an injectee, that means it's an 'expression'
  // function that must be wrapped in a Haiku.inject to work properly at runtime
  if(rfo.injectee) {
    return wrapInHaikuInject(ast);
  }

  return ast;
}

export default RFOToFunctionAST;
