import traverseLib from '@babel/traverse'

export default function traverseAST(ast: any, iterator: (node: any, parent: any) => void) {
  (traverseLib as any)(ast, {
    enter(path: any) {
      iterator(path.node, path.parent)
    },
  })
}
