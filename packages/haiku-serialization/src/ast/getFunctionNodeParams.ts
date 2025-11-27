import objectPatternNodeToObject from './objectPatternNodeToObject'

const unknowns = 0

export default function getFunctionNodeParams(node: any) {
  const params: any[] = []
  for (let i = 0; i < node.params.length; i++) {
    const pnode = node.params[i]
    if (pnode.type === 'Identifier') {
      params[i] = pnode.name
    } else if (pnode.type === 'ObjectPattern') {
      params[i] = objectPatternNodeToObject({}, pnode)
    } else {
      params[i] = `__unknown_${unknowns}__`
    }
  }
  return params
}
