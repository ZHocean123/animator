const FUNCTION_NODE_TYPES: Record<string, boolean> = {
  FunctionExpression: true,
  ClassMethod: true,
  ArrowFunctionExpression: true,
  ObjectMethod: true,
}

function isFunctionNode(node: any): boolean {
  return (node && FUNCTION_NODE_TYPES[(node as any).type]) || false
}

export default isFunctionNode
export { isFunctionNode }
