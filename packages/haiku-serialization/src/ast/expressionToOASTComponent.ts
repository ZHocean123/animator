import functionToASTExpression from './functionToASTExpression'
import objectToOAST from './objectToOAST'
import RFOToFunctionAST from './RFOToFunctionAST'

export default function expressionToOASTComponent(exp: any, key?: any, keyChain?: any): any {
  if (exp === undefined || exp === null)
    return { type: 'NullLiteral' }
  if (exp === true || exp === false)
    return { type: 'BooleanLiteral', value: exp }
  if (typeof exp === 'string')
    return { type: 'StringLiteral', value: exp, extra: { raw: JSON.stringify(exp) } }
  if (typeof exp === 'number')
    return { type: 'NumericLiteral', value: exp, extra: { raw: exp.toString() } }
  if (Array.isArray(exp)) {
    const elements: any[] = []
    for (let i = 0; i < exp.length; i++) elements.push(expressionToOASTComponent(exp[i], i))
    return { type: 'ArrayExpression', elements }
  }
  if ((exp as any).__function)
    return RFOToFunctionAST((exp as any).__function, key)
  if ((exp as any).__value)
    return expressionToOASTComponent((exp as any).__value, key, keyChain)
  if ((exp as any).__reference)
    return { type: 'Identifier', name: (exp as any).__reference }
  if (typeof exp === 'object')
    return objectToOAST(exp, keyChain)
  if (typeof exp === 'function')
    return functionToASTExpression(exp)
  throw new Error(`Unable to compile expression ${exp}`)
}

export { expressionToOASTComponent }
