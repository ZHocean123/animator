import parseCode from './parseCode'
import wrapInHaikuInject from './wrapInHaikuInject'

export default function functionToASTExpression(fn: Function) {
  const str = fn.toString().trim()
  const wrapped = `(\n${str}\n)`
  const ast = parseCode(wrapped)
  const expr = (ast as any).program.body[0].expression
  if ((fn as any).injectee) return wrapInHaikuInject(expr)
  return expr
}

export { functionToASTExpression }
