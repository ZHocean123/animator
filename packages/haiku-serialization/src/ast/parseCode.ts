import { parse } from '@babel/parser'

export default function parseCode(code: string, options?: any) {
  try {
    const parsed = parse(code, options || { sourceType: 'module' })
    return parsed
  }
  catch (exception: any) {
    return exception
  }
}
