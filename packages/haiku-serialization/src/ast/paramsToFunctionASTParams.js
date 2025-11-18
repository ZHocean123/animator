/**
 * 将参数转换为函数AST参数
 * @param {Array|Object} params - 参数数组或对象
 * @returns {Array} 转换后的AST参数数组
 */

function propMap(obj) {
  const properties = [];

  for(const key in obj) {
    properties.push({
      type: 'ObjectProperty',
      key: {
        // Safest to cast to string literal, maybe support identifiers in the future?
        type: 'StringLiteral',
        value: key,
        extra: {
          raw: `"${key}"`,
        },
      },
      value: paramToFunctionASTParam(obj[key]),
      // TODO: Are these needed ever?
      // method: false, ?
      // shorthand: true, ?
      // computed: false, ?
      // extra: {} ?
    });
  }

  return properties;
}

function paramToFunctionASTParam(param) {
  if(typeof param === 'string') {
    return {type: 'Identifier', name: param};
  }

  if(Array.isArray(param)) {
    return {
      type: 'ArrayPattern',
      elements: param.map(paramToFunctionASTParam),
    };
  }

  if(param && typeof param === 'object') {
    return {
      type: 'ObjectPattern',
      properties: propMap(param),
    };
  }
}

function paramsToFunctionASTParams(params) {
  if(!params || params.length < 1) {
    return [];
  }
  return params.map(paramToFunctionASTParam);
}

export default paramsToFunctionASTParams;
