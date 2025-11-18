/**
 * 获取函数节点的参数
 * @param {Object} node - 函数节点
 * @returns {Array} 参数数组
 */

import objectPatternNodeToObject from './objectPatternNodeToObject.js';

const unknowns = 0;

function getFunctionNodeParams(node) {
  const params = [];

  for(let i = 0; i < node.params.length; i++) {
    const pnode = node.params[i];

    if(pnode.type === 'Identifier') {
      params[i] = pnode.name;
    } else if(pnode.type === 'ObjectPattern') {
      params[i] = objectPatternNodeToObject({}, pnode);
    } else {
      // Not sure what else to do if we get here
      params[i] = '__unknown_' + unknowns + '__';
    }
  }

  return params;
}

export default getFunctionNodeParams;
