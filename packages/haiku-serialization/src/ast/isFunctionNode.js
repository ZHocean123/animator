/**
 * 检查节点是否为函数节点
 * @module isFunctionNode
 */

const FUNCTION_NODE_TYPES = {
  FunctionExpression: true,
  ClassMethod: true,
  ArrowFunctionExpression: true,
  ObjectMethod: true,
};

function isFunctionNode(node) {
  return (node.type in FUNCTION_NODE_TYPES);
}

export default isFunctionNode;
