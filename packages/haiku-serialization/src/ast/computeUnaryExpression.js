/**
 * 计算一元表达式
 * @param {Object} node - 一元表达式节点
 * @returns {number} 计算结果
 */

function computeUnaryExpression(node) {
  return Number(node.operator + node.argument.value);
}

export default computeUnaryExpression;
