let OASTToRO = require('./OASTToRO');
let reifyRO = require("@haiku/core/lib/reflection/reifyRO.js").default;

function reifyOAST (oast, referenceEvaluator, skipFunctionReification) {
  const ro = OASTToRO(oast);
  return reifyRO(ro, referenceEvaluator, skipFunctionReification);
}

module.exports = reifyOAST;
