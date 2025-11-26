import type { BytecodeTimelineProperty } from '../api'

const sortNumeric = (a, b) => a - b

export function getSortedKeyframes(propertyGroup: BytecodeTimelineProperty): number[] {
  return Object.keys(propertyGroup).map(Number).sort(sortNumeric)
}
