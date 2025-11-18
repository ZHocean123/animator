/**
 * 获取函数节点的名称
 * @param {Object} node - 函数节点
 * @returns {string|undefined} 函数名称
 */

function getFunctionNodeName(node) {
  return (
    (node.id && node.id.name) ||
    (node.key && node.key.name) ||
    (node.name && node.name.value)
  );
}

export default getFunctionNodeName;
