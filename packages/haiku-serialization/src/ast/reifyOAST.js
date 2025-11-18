/**
 * 将OAST转换为实际对象
 * @param {Object} oast - OAST对象
 * @param {Function} referenceEvaluator - 引用评估函数
 * @param {boolean} skipFunctionReification - 是否跳过函数具体化
 * @returns {*} 具体化后的对象
 */

import OASTToRO from './OASTToRO.js';
import {reifyRO} from '@haiku/core/lib/reflection/reifyRO.js';

function reifyOAST(oast, referenceEvaluator, skipFunctionReification) {
  const ro = OASTToRO(oast);
  return reifyRO(ro, referenceEvaluator, skipFunctionReification);
}

export default reifyOAST;
