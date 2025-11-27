function propMap(obj: Record<string, any>) {
  const properties: any[] = []
  for (const key in obj) {
    properties.push({
      type: 'ObjectProperty',
      key: { type: 'StringLiteral', value: key, extra: { raw: `"${key}"` } },
      value: paramToFunctionASTParam(obj[key]),
    })
  }
  return properties
}

function paramToFunctionASTParam(param: any): any {
  if (typeof param === 'string')
    return { type: 'Identifier', name: param }
  if (Array.isArray(param))
    return { type: 'ArrayPattern', elements: param.map(paramToFunctionASTParam) }
  if (param && typeof param === 'object')
    return { type: 'ObjectPattern', properties: propMap(param) }
}

export default function paramsToFunctionASTParams(params?: any[]): any[] {
  if (!params || params.length < 1)
    return []
  return params.map(paramToFunctionASTParam)
}

export { paramsToFunctionASTParams }
