/**
 * 获取函数节点的函数体
 * @param {Object} node - 函数节点
 * @returns {string} 函数体代码
 */

import generateCode from './generateCode.js';

function getFunctionNodeBody(node) {
  const lines = [];
  for(let i = 0; i < node.body.body.length; i++) {
    lines.push(generateCode(node.body.body[i]));
  }
  const body = lines.join('\n');
  return body;
}

export default getFunctionNodeBody;
