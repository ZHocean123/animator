/**
 * 检查AST语句是否匹配require语句格式
 * @param {Object} stmt - AST语句节点
 * @param {string} identifierName - 标识符名称
 * @param {string} modulePath - 模块路径
 * @returns {boolean} 是否匹配require语句格式
 */
export default function matchesRequire(stmt, identifierName, modulePath) {
  return (stmt.type === 'VariableDeclaration') &&
         (stmt.declarations.length === 1) &&
         (stmt.declarations[0].id.type === 'Identifier') &&
         (stmt.declarations[0].id.name === identifierName) &&
         (stmt.declarations[0].init.type === 'CallExpression') &&
         (stmt.declarations[0].init.callee.type === 'Identifier') &&
         (stmt.declarations[0].init.callee.name === 'require') &&
         (stmt.declarations[0].init.arguments.length === 1) &&
         (stmt.declarations[0].init.arguments[0].type === 'StringLiteral') &&
         (stmt.declarations[0].init.arguments[0].value === modulePath);
}
