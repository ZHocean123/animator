import computeUnaryExpression from './computeUnaryExpression'
import getFunctionNodeBody from './getFunctionNodeBody'
import getFunctionNodeName from './getFunctionNodeName'
import getFunctionNodeParams from './getFunctionNodeParams'
import isFunctionNode from './isFunctionNode'

export default function OASTToRO(oast: any): any {
  if (oast.type === 'ObjectExpression') {
    const oout: any = {}
    for (let i = 0; i < oast.properties.length; i++) {
      const onode = oast.properties[i]
      const key = onode.key.name || onode.key.value
      oout[key] = OASTToRO(onode.value)
    }
    return { __value: oout }
  }
  if (oast.type === 'ArrayExpression') {
    const aout: any[] = []
    for (let j = 0; j < oast.elements.length; j++) {
      const anode = oast.elements[j]
      aout[j] = OASTToRO(anode)
    }
    return { __value: aout }
  }
  if (oast.type === 'Identifier') return { __reference: oast.name }
  if (isFunctionNode(oast)) {
    return {
      __function: {
        type: oast.type,
        kind: oast.kind,
        name: getFunctionNodeName(oast),
        params: getFunctionNodeParams(oast),
        body: getFunctionNodeBody(oast),
      },
    }
  }
  if (oast.type === 'NullLiteral') return null
  if (oast.type === 'UnaryExpression') return { __value: computeUnaryExpression(oast) }
  if (oast.type === 'CallExpression') {
    if (oast.callee && oast.callee.type === 'MemberExpression') {
      if (oast.callee.object.name === 'Haiku' && oast.callee.property.name === 'inject') {
        if (oast.arguments[0]) {
          const rfo = OASTToRO(oast.arguments[0])
          if (rfo && rfo.__function) rfo.__function.injectee = true
          return rfo
        }
      }
    }
  }
  return { __value: oast.value }
}

export { OASTToRO }
