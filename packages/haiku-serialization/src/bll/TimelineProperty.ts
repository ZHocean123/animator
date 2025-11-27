import { getFallback } from '@haiku/core/lib/HaikuComponent'
import logger from '../utils/LoggerInstance'

const TimelineProperty: any = {}

TimelineProperty.getSelectorForComponentId = (componentId: string) => `haiku:${componentId}`

TimelineProperty.addProperty = (
  timelinesObject: any,
  timelineName: string,
  componentId: string,
  elementName: string | any,
  outputName: string,
  startTime: number | string,
  startValue: any,
  curve?: string,
  endTime?: number | string,
  endValue?: any,
) => {
  const segmentsBase = TimelineProperty.findOrCreatePropertySegmentsBase(timelinesObject, timelineName, componentId, outputName)
  if (!segmentsBase[0] || segmentsBase[0].value === undefined) {
    segmentsBase[0] = {}
    segmentsBase[0].value = TimelineProperty.getFallbackValue(elementName, outputName, startValue)
  }
  const st = Number.parseInt(String(startTime), 10)
  const startSeg = segmentsBase[st] || {}
  startSeg.value = startValue
  if (curve)
    startSeg.curve = curve
  startSeg.edited = true
  segmentsBase[st] = startSeg
  if (endTime !== undefined) {
    const et = Number.parseInt(String(endTime), 10)
    const endSeg = segmentsBase[et] || {}
    endSeg.value = endValue
    endSeg.edited = true
    segmentsBase[et] = endSeg
  }
  return [startValue, endValue]
}

TimelineProperty.getFallbackValue = (elementName: any, outputName: string, valueAssignedInThisOperation?: any) => {
  if (typeof elementName === 'object') {
    if (outputName in elementName.states)
      return elementName.states[outputName].value
    elementName = 'div'
  }
  const fallback = getFallback(elementName, outputName)
  if (fallback !== undefined)
    return fallback
  return valueAssignedInThisOperation
}

TimelineProperty.getBaselineValue = (
  componentId: string,
  elementName: string,
  propertyName: string,
  timelineName: string,
  timelineTime: number,
  fallbackValue: any,
  bytecode: any,
  hostInstance: any,
) => {
  const ms = TimelineProperty.getBaselineKeyframeStart(componentId, elementName, timelineName, propertyName, timelineTime, bytecode)
  return TimelineProperty.getComputedValue(componentId, elementName, propertyName, timelineName, ms, fallbackValue, bytecode, hostInstance)
}

TimelineProperty.getBaselineCurve = (
  componentId: string,
  elementName: string,
  propertyName: string,
  timelineName: string,
  timelineTime: number,
  fallbackValue: any,
  bytecode: any,
  hostInstance: any,
  states: any,
) => {
  const ms = TimelineProperty.getAssignedBaselineKeyframeStart(componentId, elementName, timelineName, propertyName, timelineTime, bytecode)
  return TimelineProperty.getComputedCurve(componentId, elementName, propertyName, timelineName, ms, fallbackValue, bytecode, hostInstance, states)
}

TimelineProperty.getComputedCurve = (
  componentId: string,
  elementName: string,
  propertyName: string,
  timelineName: string,
  timelineTime: number,
  fallbackValue: any,
  bytecode: any,
  hostInstance: any,
  states: any,
) => {
  if (!bytecode || !bytecode.timelines)
    return
  return TimelineProperty.getPropertyCurveAtTime(bytecode.timelines, timelineName, componentId, elementName, propertyName, timelineTime, hostInstance, states)
}

TimelineProperty.getPropertyCurveAtTime = (
  timelinesObject: any,
  timelineName: string,
  componentId: string,
  elementName: string,
  outputName: string,
  time: number,
  hostInstance: any,
  states: any,
) => {
  const propertiesGroup = TimelineProperty.getPropertiesBase(timelinesObject, timelineName, componentId)
  if (!propertiesGroup || !propertiesGroup[outputName] || !propertiesGroup[outputName][time])
    return
  return propertiesGroup[outputName][time].curve
}

TimelineProperty.getComputedValue = (
  componentId: string,
  elementName: string,
  propertyName: string,
  timelineName: string,
  timelineTime: number,
  fallbackValue: any,
  bytecode: any,
  hostInstance: any,
) => {
  if (!bytecode || !bytecode.timelines)
    return fallbackValue
  const value = TimelineProperty.getPropertyValueAtTime(bytecode.timelines, timelineName, componentId, elementName, propertyName, timelineTime, hostInstance)
  return (value === undefined) ? fallbackValue : value
}

TimelineProperty.getPropertyValueAtTime = (
  timelinesObject: any,
  timelineName: string,
  componentId: string,
  elementName: string,
  outputName: string,
  time: number,
  hostInstance: any,
) => {
  const propertiesGroup = TimelineProperty.getPropertiesBase(timelinesObject, timelineName, componentId)
  if (propertiesGroup) {
    try {
      if (hostInstance) {
        const { computedValue } = hostInstance.grabValue(
          timelineName,
          componentId,
          hostInstance.findElementsByHaikuId(componentId)[0],
          outputName,
          propertiesGroup[outputName],
          time,
          !hostInstance.shouldPerformFullFlush(),
          true,
        )
        if (computedValue !== undefined && computedValue !== null)
          return computedValue
      }
      else {
        logger.warn(`[timeline property] host instance and value builder may be required to compute a value for ${outputName}`)
      }
    }
    catch (exception: any) {
      logger.warn(`[timeline property] unable to compute dynamic value for ${timelineName} ${componentId} ${outputName} ${time} [${exception.message}]`)
    }
  }
  return TimelineProperty.getFallbackValue(elementName, outputName)
}

TimelineProperty.addPropertyGroup = (
  timelinesObject: any,
  timelineName: string,
  componentId: string,
  elementName: string,
  deltaGroup: Record<string, any>,
  startTime: number | string,
) => {
  for (const outputName in deltaGroup) {
    const outputVal = (deltaGroup as any)[outputName]
    TimelineProperty.addProperty(timelinesObject, timelineName, componentId, elementName, outputName, startTime, outputVal)
  }
  return timelinesObject
}

TimelineProperty.getPropertySegmentsBase = (
  timelinesObject: any,
  timelineName: string,
  componentId: string,
  outputName: string,
) => {
  const selector = TimelineProperty.getSelectorForComponentId(componentId)
  if (!timelinesObject)
    return null
  if (!timelinesObject[timelineName])
    return null
  if (!timelinesObject[timelineName][selector])
    return null
  return timelinesObject[timelineName][selector][outputName]
}

TimelineProperty.getPropertiesBase = (timelinesObject: any, timelineName: string, componentId: string) => {
  const selector = TimelineProperty.getSelectorForComponentId(componentId)
  if (!timelinesObject)
    return null
  if (!timelinesObject[timelineName])
    return null
  return timelinesObject[timelineName][selector]
}

TimelineProperty.findOrCreatePropertySegmentsBase = (timelinesObject: any, timelineName: string, componentId: string, outputName: string) => {
  const selector = TimelineProperty.getSelectorForComponentId(componentId)
  if (!timelinesObject[timelineName])
    timelinesObject[timelineName] = {}
  if (!timelinesObject[timelineName][selector])
    timelinesObject[timelineName][selector] = {}
  if (!timelinesObject[timelineName][selector][outputName])
    timelinesObject[timelineName][selector][outputName] = {}
  return timelinesObject[timelineName][selector][outputName]
}

TimelineProperty.getValueGroup = (componentId: string, timelineName: string, propertyName: string, bytecode: any) => {
  const selector = TimelineProperty.getSelectorForComponentId(componentId)
  if (!bytecode || !bytecode.timelines)
    return null
  if (!bytecode.timelines[timelineName])
    return null
  if (!bytecode.timelines[timelineName][selector])
    return null
  return bytecode.timelines[timelineName][selector][propertyName]
}

TimelineProperty.mergeProperties = (oldGroup: Record<string, any>, newGroup: Record<string, any>) => {
  for (const newPropName in newGroup) {
    const newProp = (newGroup as any)[newPropName]
    oldGroup[newPropName] = newProp
  }
}

TimelineProperty.getBaselineKeyframeStart = (
  componentId: string,
  elementName: string,
  timelineName: string,
  propertyName: string,
  timelineTime: number,
  bytecode: any,
) => {
  let keyframeStart = 0
  const valueGroup = TimelineProperty.getValueGroup(componentId, timelineName, propertyName, bytecode)
  if (!valueGroup)
    return keyframeStart
  const mss = Object.keys(valueGroup).map(ms => Number.parseInt(ms, 10))
  mss.forEach((ms) => {
    if (ms < timelineTime && ms > keyframeStart)
      keyframeStart = ms
  })
  return keyframeStart
}

TimelineProperty.getAssignedBaselineKeyframeStart = (
  componentId: string,
  elementName: string,
  timelineName: string,
  propertyName: string,
  timelineTime: number,
  bytecode: any,
) => {
  let keyframeStart = 0
  const valueGroup = TimelineProperty.getValueGroup(componentId, timelineName, propertyName, bytecode)
  if (!valueGroup)
    return keyframeStart
  const mss = Object.keys(valueGroup).map(ms => Number.parseInt(ms, 10))
  mss.forEach((ms) => {
    if (ms <= timelineTime && ms > keyframeStart)
      keyframeStart = ms
  })
  return keyframeStart
}

TimelineProperty.getAssignedBaselineValueObject = (
  componentId: string,
  elementName: string,
  propertyName: string,
  timelineName: string,
  timelineTime: number,
  bytecode: any,
) => {
  const ms = TimelineProperty.getAssignedBaselineKeyframeStart(componentId, elementName, timelineName, propertyName, timelineTime, bytecode)
  const keyframeGroup = TimelineProperty.getPropertySegmentsBase(bytecode.timelines, timelineName, componentId, propertyName)
  return keyframeGroup && keyframeGroup[ms]
}

TimelineProperty.getAssignedValueObject = (
  componentId: string,
  elementName: string,
  propertyName: string,
  timelineName: string,
  timelineTime: number,
  bytecode: any,
) => {
  const keyframeGroup = TimelineProperty.getPropertySegmentsBase(bytecode.timelines, timelineName, componentId, propertyName)
  return keyframeGroup && keyframeGroup[timelineTime]
}

export default TimelineProperty
export { TimelineProperty }
