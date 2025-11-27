import reifyRO from '@haiku/core/lib/reflection/reifyRO'
import OASTToRO from './OASTToRO'

export default function reifyOAST(oast: any, referenceEvaluator?: any, skipFunctionReification?: boolean) {
  const ro = OASTToRO(oast)
  return (reifyRO as any).default ? (reifyRO as any).default(ro, referenceEvaluator, skipFunctionReification) : (reifyRO as any)(ro, referenceEvaluator, skipFunctionReification)
}

export { reifyOAST }
