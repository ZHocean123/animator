import OASTToRO from './OASTToRO.js';
import reifyRO from '@haiku/core/reflection/reifyRO';

function reifyOAST (oast, referenceEvaluator, skipFunctionReification) {
  const ro = OASTToRO(oast);
  return reifyRO(ro, referenceEvaluator, skipFunctionReification);
}

export default reifyOAST;
