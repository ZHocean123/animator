import _ from 'lodash'
import matchesRequire from './matchesRequire'

export default function upsertRequire(ast: any, identifierName: string, modulePath: string) {
  const match = _.find(ast.program.body, stmt => matchesRequire(stmt, identifierName, modulePath))
  if (match)
    return null
  ast.program.body.unshift({
    type: 'VariableDeclaration',
    kind: 'var',
    declarations: [{
      type: 'VariableDeclarator',
      id: { type: 'Identifier', name: identifierName },
      init: {
        type: 'CallExpression',
        callee: { type: 'Identifier', name: 'require' },
        arguments: [{ type: 'StringLiteral', value: modulePath, extra: { raw: JSON.stringify(modulePath) } }],
      },
    }],
  })
}
