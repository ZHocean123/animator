/**
 * 将对象模式节点转换为对象
 * @param {Object} node - 对象模式节点
 * @returns {Object} 转换后的对象
 */

function patternPropertyNodeValueToValue(node) {
  if(node.type === 'Identifier') {
    // { a } => { a: 'a' }
    return node.name;
  }

  if(node.type === 'ObjectPattern') {
    return objectPatternNodeToObject({}, node);
  }

  if(node.type === 'ArrayPattern') {
    const arr = [];

    for(let i = 0; i < node.elements.length; i++) {
      arr[i] = patternPropertyNodeValueToValue(node.elements[i]);
    }

    return arr;
  }
}

function objectPatternNodeToObject(out, node) {
  for(let i = 0; i < node.properties.length; i++) {
    const prop = node.properties[i];

    const key = prop.key.name;

    const value = patternPropertyNodeValueToValue(prop.value);

    out[key] = value;
  }

  return out;
}

export default objectPatternNodeToObject;
