import _ from 'lodash'
import matchesRequire from './matchesRequire'
import traverseAST from './traverseAST'

export default function removeRequire(ast: any, identifierName: string, modulePath: string) {
  let identCount = 0
  traverseAST(ast, (node) => {
    if (node.type === 'Identifier' && node.name === identifierName) {
      identCount += 1
    }
  })
  if (identCount > 1)
    return
  ast.program.body = _.filter(ast.program.body, stmt => !matchesRequire(stmt, identifierName, modulePath))
}
