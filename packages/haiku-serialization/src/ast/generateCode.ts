import generator from '@babel/generator'

export default function generateCode(ast: any, options?: any, code?: string) {
  const output = (generator as any)(ast, options || { retainLines: true, comments: true }, code || '')
  return output.code
}
