import generateCode from './generateCode'
import parseCode from './parseCode'
import traverseAST from './traverseAST'

export default function remapSource(source: string, remapper?: (dep: string) => string) {
  if (!remapper) return source
  const ast = parseCode(source)
  traverseAST(ast, (node: any) => {
    if (node.type === 'ImportDeclaration') {
      if (node.source && node.source.type === 'StringLiteral') node.source.value = remapper(node.source.value)
    } else if (node.type === 'CallExpression') {
      if (node.callee && node.callee.type === 'Identifier' && node.callee.name === 'require') {
        const dep = node.arguments[0]
        if (dep && dep.type === 'StringLiteral') dep.value = remapper(dep.value)
        else if (dep.type === 'TemplateLiteral') {
          const part = dep.quasis[0]
          if (part && part.value) part.value.raw = remapper(part.value.raw)
        }
      }
    }
  })
  const transformed = generateCode(ast as any)
  return transformed
}

export { remapSource }
