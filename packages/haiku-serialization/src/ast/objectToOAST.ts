import { LAYOUT_3D_SCHEMA } from '@haiku/core/lib/HaikuComponent'
import expressionToOASTComponent from './expressionToOASTComponent'

function canUseShorthand(obj: any, keyChain: string[]): boolean {
  if (keyChain.length !== 4 || keyChain[0] !== 'timelines')
    return false
  const keys = Object.keys(obj)
  return (
    keys.length === 1 && keys[0] === '0'
    && typeof obj[0] === 'object' && typeof obj[0].value !== 'object'
    && (((LAYOUT_3D_SCHEMA as any)[keyChain[3]]) || !obj[0].edited)
  )
}

export default function objectToOAST(obj: any, keyChain: string[] = []): any {
  if (canUseShorthand(obj, keyChain)) {
    return expressionToOASTComponent(obj['0'].value)
  }
  const oast: any = { type: 'ObjectExpression', properties: [] }
  for (const key in obj) {
    if (key === undefined)
      continue
    const keyexp = expressionToOASTComponent(key)
    keyChain.push(key as any)
    const valueexp = expressionToOASTComponent(obj[key], key as any, keyChain)
    keyChain.pop()
    oast.properties.push({ type: 'ObjectProperty', key: keyexp, value: valueexp })
  }
  return oast
}

export { objectToOAST }
