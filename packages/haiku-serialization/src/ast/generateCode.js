import { generate } from '@babel/generator'

function generateCode(ast, options, code) {
  const output = generate(ast, options || {
    retainLines: true,
    comments: true,
  }, code || '')

  return output.code
}

export default generateCode
