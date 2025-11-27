import functionBodyStringToFunctionBodyAST from './functionBodyStringToFunctionBodyAST'
import paramsToFunctionASTParams from './paramsToFunctionASTParams'
import wrapInHaikuInject from './wrapInHaikuInject'

export default function RFOToFunctionAST(rfo: any, key?: any) {
  const type = rfo.type || 'FunctionExpression'
  let ast: any
  switch (type) {
    case 'FunctionExpression':
      ast = {
        type: 'FunctionExpression',
        id: ((rfo.name && { type: 'Identifier', name: rfo.name }) || undefined),
        params: paramsToFunctionASTParams(rfo.params),
        body: functionBodyStringToFunctionBodyAST(rfo.body),
      }
      break
    case 'ArrowFunctionExpression':
      ast = { type: 'ArrowFunctionExpression', params: paramsToFunctionASTParams(rfo.params), body: functionBodyStringToFunctionBodyAST(rfo.body) }
      break
  }
  if (rfo.injectee) return wrapInHaikuInject(ast)
  return ast
}

export { RFOToFunctionAST }
