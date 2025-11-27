function patternPropertyNodeValueToValue(node: any): any {
  if (node.type === 'Identifier')
    return node.name
  if (node.type === 'ObjectPattern')
    return objectPatternNodeToObject({}, node)
  if (node.type === 'ArrayPattern') {
    const arr: any[] = []
    for (let i = 0; i < node.elements.length; i++) {
      arr[i] = patternPropertyNodeValueToValue(node.elements[i])
    }
    return arr
  }
}

export default function objectPatternNodeToObject(out: any, node: any) {
  for (let i = 0; i < node.properties.length; i++) {
    const prop = node.properties[i]
    const key = prop.key.name
    const value = patternPropertyNodeValueToValue(prop.value)
    out[key] = value
  }
  return out
}

export { objectPatternNodeToObject }
