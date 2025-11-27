import BaseModel from './BaseModel'

interface DescriptorOpts { timelineTime: number, timelineName: string, numFormat?: string }

export default class Timeline extends (BaseModel as any) {
  static clearCaches() {}

  static millisecondToNearestFrame(ms: number, mspf: number) {
    return Math.round(ms / mspf)
  }

  static getPropertyValueDescriptor(row: any, { timelineTime, timelineName }: DescriptorOpts) {
    const valueGroup = row.getKeyframesDescriptor()
    let baselineValue
    let baselineCurve
    if (valueGroup) {
      const keys = Object.keys(valueGroup).map(k => Number.parseInt(k, 10)).sort((a, b) => a - b)
      let last = 0
      for (let i = 0; i < keys.length; i++) {
        const ms = keys[i]
        if (ms <= timelineTime && ms >= last)
          last = ms
      }
      const descriptor = valueGroup[last]
      if (descriptor) {
        baselineValue = descriptor.value
        baselineCurve = descriptor.curve
      }
    }
    return { baselineValue, baselineCurve }
  }
}

export { Timeline }
