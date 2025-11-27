import camelcase from 'camelcase'
import BaseModel from './BaseModel'
import Expression from './Expression'

const ReservedWords = require('@haiku/core/lib/reflection/ReservedWords').default

export default class State extends (BaseModel as any) {}

;(State as any).DEFAULT_OPTIONS = { required: {} }
;(BaseModel as any).extend(State)

function nextAvailableWordIfReserved(word: string): string {
  if (ReservedWords.isReserved(word))
    return nextAvailableWordIfReserved(`_${word}`)
  return word
}

;(State as any).isNumeric = (n: any) => !isNaN(Number.parseFloat(n)) && isFinite(n)
;(State as any).safeJsonStringify = (thing: any) => {
  try { return JSON.stringify(thing) }
  catch (exception) {
    if (thing && thing.toString)
      return thing.toString(); return `${thing}`
  }
}
;(State as any).buildStateNameFromElementPropertyName = (n: number, states: Record<string, any>, elementNode: any, propertyName: string, originalName?: string) => {
  let stateName = originalName as string
  const elementName = elementNode && elementNode.elementName
  if (!stateName) {
    if (elementName === 'path' && propertyName === 'd')
      stateName = 'pathInstructions'
  }
  if (!stateName) { stateName = camelcase(propertyName) }
  stateName = `${stateName.split(/\W+/g).join('_')}${(n && `_${n}`) || ''}`
  stateName = nextAvailableWordIfReserved(stateName)
  if (!states[stateName])
    return stateName
  return (State as any).buildStateNameFromElementPropertyName(n + 1, states, elementNode, propertyName, originalName)
}

;(State as any).areStatesEquivalent = (s1: any, s2: any) => {
  if (!s1 && !s2)
    return true
  if (s1 && !s2)
    return false
  if (!s1 && s2)
    return false
  for (const k1 in s1) {
    if (s2[k1] === undefined)
      return false
  }
  for (const k2 in s2) {
    if (s1[k2] === undefined)
      return false
  }
  return true
}

;(State as any).deduceTypeOfValue = (stateValue: any) => {
  if (Array.isArray(stateValue))
    return 'array'
  if ((State as any).isNumeric(stateValue))
    return 'number'
  if (stateValue && typeof stateValue === 'object')
    return 'object'
  if (stateValue === null || stateValue === undefined)
    return 'any'
  if (typeof stateValue === 'string')
    return 'string'
  return typeof stateValue
}

;(State as any).deduceType = (stateValueDescriptor: any) => {
  if (stateValueDescriptor.type)
    return stateValueDescriptor.type
  return (State as any).deduceTypeOfValue(stateValueDescriptor.value)
}

;(State as any).assignDescriptor = (out: any, stateValueDescriptor: any) => {
  if (stateValueDescriptor.setter)
    out.set = stateValueDescriptor.setter
  if (stateValueDescriptor.getter)
    out.get = stateValueDescriptor.getter
  if (stateValueDescriptor.set)
    out.set = stateValueDescriptor.set
  if (stateValueDescriptor.get)
    out.get = stateValueDescriptor.get
  if (stateValueDescriptor.type)
    out.type = stateValueDescriptor.type
  if (stateValueDescriptor.access)
    out.access = stateValueDescriptor.access
  if (stateValueDescriptor.mock !== undefined)
    out.mock = stateValueDescriptor.mock
  if (stateValueDescriptor.value !== undefined)
    out.value = stateValueDescriptor.value
  return out
}

;(State as any).autoStringify = (stateValueDescriptor: any) => { const deducedType = (State as any).deduceType(stateValueDescriptor); return (State as any).stringifyFromType(stateValueDescriptor.value, deducedType) }
;(State as any).stringifyFromType = (stateValue: any, knownType: string) => {
  if (typeof stateValue === 'string')
    return stateValue
  switch (knownType) {
    case 'array': return (State as any).safeJsonStringify(stateValue)
    case 'object': return (State as any).safeJsonStringify(stateValue)
    default:
      if (stateValue && stateValue.toString)
        return stateValue.toString()
      if (stateValue === null)
        return ''
      if (stateValue === undefined)
        return ''
      return `${stateValue}`
  }
}

;(State as any).recast = (stateValueDescriptor: any) => {
  const clonedValueDescriptor = (State as any).assignDescriptor({}, stateValueDescriptor)
  clonedValueDescriptor.value = Expression.parseValue(clonedValueDescriptor.value)
  clonedValueDescriptor.mock = Expression.parseValue(clonedValueDescriptor.mock)
  clonedValueDescriptor.type = (State as any).deduceType(clonedValueDescriptor)
  return clonedValueDescriptor
}

export { State }
