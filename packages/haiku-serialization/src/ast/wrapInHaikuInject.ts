import { toText } from '@haiku/core/lib/reflection/JavaScriptIdentifier'

export default function wrapInHaikuInject(node: any) {
  return {
    type: 'CallExpression',
    callee: {
      type: 'MemberExpression',
      object: { type: 'Identifier', name: 'Haiku' },
      property: { type: 'Identifier', name: 'inject' },
    },
    arguments: [node].concat(node.params.map((param: any) => {
      const value = toText(param.name)
      return { type: 'StringLiteral', value, extra: { raw: JSON.stringify(value) } }
    })),
  }
}
