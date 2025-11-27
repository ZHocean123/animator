import { parse } from '@babel/parser'

export default function functionBodyStringToFunctionBodyAST(body?: string) {
  const nodes: any[] = []
  let innerComments: any = null
  if (body) {
    const ast = parse(body, { allowReturnOutsideFunction: true })
    if ((ast as any).program.innerComments)
      innerComments = (ast as any).program.innerComments
    nodes.push(...(ast as any).program.body)
  }
  const block: any = { type: 'BlockStatement', body: nodes }
  if (innerComments)
    block.innerComments = innerComments
  return block
}

export { functionBodyStringToFunctionBodyAST }
