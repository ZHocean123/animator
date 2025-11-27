import { tokenizeDirective } from '@haiku/core/lib/reflection/Tokenizer'
import BaseModel from './BaseModel'

export default class Expression extends (BaseModel as any) {}

;(Expression as any).DEFAULT_OPTIONS = { required: {} }
;(BaseModel as any).extend(Expression)

;(Expression as any).EXPR_SIGNS = { RET: 'return', EQ: '=' }
;(Expression as any).retToEq = (str: string) => {
  if (str.substring(0, 7) === (`${(Expression as any).EXPR_SIGNS.RET} `)) { str = str.slice(7); str = `${(Expression as any).EXPR_SIGNS.EQ} ${str}` } return str
}

function textContentNormalizer(value: any) {
  if (typeof value === 'string')
    return value
  if (typeof value === 'number')
    return value
  if (value === null || value === undefined)
    return ''
  return `${value}`
}
function booleanNormalizer(value: any) {
  return !!value
}
function numericNormalizer(value: any) {
  return Number(value)
}
function pxUnitRequiredNormalizer(value: any) {
  return `${value}px`
}

;(Expression as any).VALUE_NORMALIZERS = {
  'content': textContentNormalizer,
  'shown': booleanNormalizer,
  'opacity': numericNormalizer,
  'offset.x': numericNormalizer,
  'offset.y': numericNormalizer,
  'offset.z': numericNormalizer,
  'origin.x': numericNormalizer,
  'origin.y': numericNormalizer,
  'origin.z': numericNormalizer,
  'translation.x': numericNormalizer,
  'translation.y': numericNormalizer,
  'translation.z': numericNormalizer,
  'rotation.x': numericNormalizer,
  'rotation.y': numericNormalizer,
  'rotation.z': numericNormalizer,
  'scale.x': numericNormalizer,
  'scale.y': numericNormalizer,
  'scale.z': numericNormalizer,
  'shear.xy': numericNormalizer,
  'shear.xz': numericNormalizer,
  'shear.yz': numericNormalizer,
  'sizeMode.x': numericNormalizer,
  'sizeMode.y': numericNormalizer,
  'sizeMode.z': numericNormalizer,
  'sizeProportional.x': numericNormalizer,
  'sizeProportional.y': numericNormalizer,
  'sizeProportional.z': numericNormalizer,
  'sizeDifferential.x': numericNormalizer,
  'sizeDifferential.y': numericNormalizer,
  'sizeDifferential.z': numericNormalizer,
  'sizeAbsolute.x': numericNormalizer,
  'sizeAbsolute.y': numericNormalizer,
  'sizeAbsolute.z': numericNormalizer,
  'style.perspective': pxUnitRequiredNormalizer,
}

;(Expression as any).isUnitToken = (str: any) => ((Expression as any).isPxUnit(str) || (Expression as any).isRadiansUnit(str) || (Expression as any).isDegreesUnit(str))
;(Expression as any).normalizeTokensWithNumericFirstToken = (tokens: any[], orig: any) => {
  if (tokens.length < 2)
    return tokens[0]; if (tokens.length > 2)
    return orig; if ((Expression as any).isUnitToken(tokens[1]))
    return tokens[0]; return orig
}
;(Expression as any).normalizeParsedValue = (parsedValue: any, propertyName?: string) => {
  if (Number.isNaN(parsedValue))
    return 1; if (typeof parsedValue === 'number' && !isFinite(parsedValue))
    return 1; if ((Expression as any).VALUE_NORMALIZERS[propertyName as any])
    return (Expression as any).VALUE_NORMALIZERS[propertyName as any](parsedValue); return parsedValue
}
;(Expression as any).isRadiansUnit = (unit: string) => unit === 'rad' || unit === 'rads' || unit === 'radians'
;(Expression as any).isDegreesUnit = (unit: string) => unit === 'deg' || unit === 'degs' || unit === 'degrees' || unit === '°'
;(Expression as any).isPxUnit = (unit: string) => unit === 'px' || unit === 'pixels'

function rotationTokenHandler(tokens: any[], raw: string) {
  if (tokens.length < 1)
    return 1; const num = (Expression as any).normalizeParsedValue(Number(tokens[0])); const unit = tokens[1]; if (typeof unit !== 'string')
    return num; if ((Expression as any).isRadiansUnit(unit))
    return num; if ((Expression as any).isDegreesUnit(unit))
    return num * (Math.PI / 180); return num
}
function pxTokenHandler(tokens: any[], raw: string) {
  if (tokens.length < 1)
    return 1; const num = (Expression as any).normalizeParsedValue(Number(tokens[0])); return num
}

;(Expression as any).TOKEN_HANDLERS = {
  'rotation.x': rotationTokenHandler,
  'rotation.y': rotationTokenHandler,
  'rotation.z': rotationTokenHandler,
  'translation.x': pxTokenHandler,
  'translation.y': pxTokenHandler,
  'translation.z': pxTokenHandler,
  'sizeAbsolute.x': pxTokenHandler,
  'sizeAbsolute.y': pxTokenHandler,
  'width': pxTokenHandler,
  'height': pxTokenHandler,
}

function isPlainObject(obj: any) { return (obj && obj.constructor === Object && Object.prototype.toString.call(obj) === '[object Object]') }

;(Expression as any).parseValue = (userInput: any, propertyName?: string) => {
  if (typeof userInput !== 'string')
    return (Expression as any).normalizeParsedValue(userInput, propertyName)
  if (userInput.trim() === 'undefined')
    return undefined
  if (userInput.trim() === 'null')
    return null
  const parsedInput = (Expression as any).flexibleJsonParse(userInput)
  if (typeof parsedInput === 'function')
    return (Expression as any).normalizeParsedValue(userInput)
  if (parsedInput && !Array.isArray(parsedInput) && typeof parsedInput === 'object') {
    if (isPlainObject(parsedInput))
      return (Expression as any).normalizeParsedValue(parsedInput); return (Expression as any).normalizeParsedValue(userInput)
  }
  if (parsedInput !== undefined)
    return (Expression as any).normalizeParsedValue(parsedInput, propertyName)
  try {
    const inputAsTokens = tokenizeDirective(userInput).map(({ value }: any) => value)
    if ((Expression as any).TOKEN_HANDLERS[propertyName as any])
      return (Expression as any).normalizeParsedValue((Expression as any).TOKEN_HANDLERS[propertyName as any](inputAsTokens, userInput))
    if (typeof inputAsTokens[0] === 'number')
      return (Expression as any).normalizeParsedValue((Expression as any).normalizeTokensWithNumericFirstToken(inputAsTokens, userInput), propertyName)
  }
  catch (exception) { return (Expression as any).normalizeParsedValue(userInput) }
  return (Expression as any).normalizeParsedValue(userInput)
}

;(Expression as any).safeJsonParse = (str: string) => {
  try { return JSON.parse(str) }
  catch { return undefined }
}
;(Expression as any).flexibleJsonParse = (str: string) => {
  const body = `\nreturn ${str.trim()};\n`; try { const fn = new Function(body); const out = fn(); return out }
  catch {} return (Expression as any).safeJsonParse(str)
}
;(Expression as any).buildStateInjectorFunction = (stateName: string) => ({ __function: { params: [stateName], body: `return ${stateName};`, injectee: true } })

export { Expression }
