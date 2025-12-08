function computeUnaryExpression (node) {
  return Number(node.operator + node.argument.value);
}

export default computeUnaryExpression;
