export function computeUnaryExpression(operator: string, argument: any) {
  switch (operator) {
    case '+': return +argument
    case '-': return -argument
    case '!': return !argument
    case '~': return ~argument
    case 'typeof': return typeof argument
    case 'void': return void argument
    case 'delete':
      try {
        argument = null
        return undefined
      }
      catch { return false }
    default: return undefined
  }
}

export default computeUnaryExpression
