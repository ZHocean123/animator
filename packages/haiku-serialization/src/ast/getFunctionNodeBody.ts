import generateCode from './generateCode'

export default function getFunctionNodeBody(node: any) {
  const lines: string[] = []
  for (let i = 0; i < node.body.body.length; i++) {
    lines.push(generateCode(node.body.body[i]))
  }
  return lines.join('\n')
}
