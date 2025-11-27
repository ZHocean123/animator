import enhance from '@haiku/core/lib/reflection/enhance'
import expressionToRO from '@haiku/core/lib/reflection/expressionToRO'
import reifyRO from '@haiku/core/lib/reflection/reifyRO'
import { convertManaLayout, xmlToMana } from 'haiku-common'
import lodash from 'lodash'
import clone from 'lodash.clone'
import cloneDeepWith from 'lodash.clonedeepwith'
import merge from 'lodash.merge'
import logger from '../utils/LoggerInstance'
import BaseModel from './BaseModel'

const HAIKU_ID_ATTRIBUTE = 'haiku-id'
const HAIKU_TITLE_ATTRIBUTE = 'haiku-title'
const DEFAULT_TIMELINE_NAME = 'Default'
const DEFAULT_TIMELINE_TIME = 0
const DEFAULT_ROOT_NODE_NAME = 'div'
const FALLBACK_TEMPLATE = `<${DEFAULT_ROOT_NODE_NAME}></${DEFAULT_ROOT_NODE_NAME}>`
const DEFAULT_CONTEXT_SIZE = { width: 550, height: 400 }
const DO_REIFY_FUNCTIONS = true
const DEFAULT_CURVE = 'easeInOutQuad'

function isEmpty(val: any) { return val === undefined }
function referenceEvaluatorMissing(arg: any) { logger.warn('[bytecode] reference evaluator is not implemented'); return arg }
function ensureManaChildrenArray(mana: any) {
  const previous = mana.children; const children: any[] = []; mana.children = children; if (previous)
    mana.children.push(previous); return mana
}

class Bytecode extends BaseModel {}
;(Bytecode as any).DEFAULT_OPTIONS = { required: {} }
;(BaseModel as any).extend(Bytecode)

;(Bytecode as any).areBytecodesIsomorphic = (b1: any, b2: any) => { const areStates = (State as any).areStatesEquivalent(b1.states, b2.states); const areTemplates = (Template as any).areTemplatesEquivalent(b1.template, b2.template); return areStates && areTemplates }
;(Bytecode as any).cleanBytecode = (bytecode: any) => {
  const elementsByHaikuId = (Template as any).getAllElementsByHaikuId(bytecode.template); for (const timelineName in bytecode.timelines) {
    const timelineObject = bytecode.timelines[timelineName]; for (const timelineSelector in timelineObject) {
      if ((Template as any).isHaikuIdSelector(timelineSelector)) {
        const hid = (Template as any).haikuSelectorToHaikuId(timelineSelector); if (!elementsByHaikuId[hid])
          delete timelineObject[timelineSelector]
      }
      else {
        if (timelineSelector[0] === '_' && timelineSelector[1] === '_')
          delete timelineObject[timelineSelector]
      }
    }
  } if (bytecode.eventHandlers) {
    for (const eventSelector in bytecode.eventHandlers) {
      if ((Template as any).isHaikuIdSelector(eventSelector)) {
        const hid = (Template as any).haikuSelectorToHaikuId(eventSelector); if (!elementsByHaikuId[hid])
          delete bytecode.eventHandlers[eventSelector]
      }
    }
  }
}
;(Bytecode as any).getAppliedStatesForNode = (out: any, bytecode: any, node: any) => {
  const allExprParams: any[] = []; const selectorsInvolved: any = {}; (Template as any).visit(node, (n: any) => {
    if (n && n.attributes)
      selectorsInvolved[`haiku:${n.attributes[HAIKU_ID_ATTRIBUTE]}`] = true
  }); for (const timelineName in bytecode.timelines) {
    for (const selector in bytecode.timelines[timelineName]) {
      if (!selectorsInvolved[selector])
        continue; for (const propertyName in bytecode.timelines[timelineName][selector]) { for (const keyframeMs in bytecode.timelines[timelineName][selector][propertyName]) { const keyframeObj = bytecode.timelines[timelineName][selector][propertyName][keyframeMs]; if (typeof keyframeObj.value === 'function') { enhance(keyframeObj.value); allExprParams.push.apply(allExprParams, keyframeObj.value.specification.params) } } }
    }
  } const uniqStateNames: any = {}; allExprParams.forEach((paramName) => {
    if (typeof paramName === 'string')
      uniqStateNames[paramName] = true
  }); for (const stateName in bytecode.states) {
    if (!uniqStateNames[stateName])
      continue; const stateDescriptor = bytecode.states[stateName]; out[stateName] = lodash.clone(stateDescriptor)
  } return out
}
;(Bytecode as any).getAppliedHelpersForNode = (out: any, bytecode: any, element: any) => { (Template as any).visit(element, (node: any) => { for (const helperName in bytecode.helpers) { const helperFunction = bytecode.helpers[helperName]; out[helperName] = helperFunction } }); return out }
;(Bytecode as any).getAppliedTimelinesForNode = (out: any, bytecode: any, element: any) => {
  (Template as any).visit(element, (node: any) => {
    for (const timelineName in bytecode.timelines) {
      for (const timelineSelector in bytecode.timelines[timelineName]) {
        const haikuId = (Template as any).haikuSelectorToHaikuId(timelineSelector); if (node && node.attributes && node.attributes[HAIKU_ID_ATTRIBUTE] === haikuId) {
          if (!out[timelineName])
            out[timelineName] = {}; out[timelineName][timelineSelector] = bytecode.timelines[timelineName][timelineSelector]
        }
      }
    }
  }); return out
}
;(Bytecode as any).getAppliedEventHandlersForNode = (out: any, bytecode: any, element: any) => {
  (Template as any).visit(element, (node: any) => {
    for (const eventSelector in bytecode.eventHandlers) {
      const haikuId = (Template as any).haikuSelectorToHaikuId(eventSelector); if (node && node.attributes && node.attributes[HAIKU_ID_ATTRIBUTE] === haikuId)
        out[eventSelector] = bytecode.eventHandlers[eventSelector]
    }
  }); return out
}
;(Bytecode as any).padIds = (bytecode: any, padderFunction: (s: string) => string) => {
  const fixedReferences: any = {}; const templateNodes: any[] = []; (Template as any).visit(bytecode.template, (node: any) => {
    if (node && node.attributes)
      templateNodes.push(node)
  }); templateNodes.forEach((node) => {
    const haikuId = node.attributes[HAIKU_ID_ATTRIBUTE]; if (haikuId) { const fixedHaikuId = padderFunction(haikuId); fixedReferences[haikuId] = fixedHaikuId; node.attributes[HAIKU_ID_ATTRIBUTE] = fixedReferences[haikuId] } const domId = node.attributes.id; if (domId) {
      const fixedDomId = padderFunction(domId); fixedReferences[`url(#${domId})`] = `url(#${fixedDomId})`; fixedReferences[`#${domId}`] = `#${fixedDomId}`; node.attributes.id = fixedDomId; if (!node.attributes[HAIKU_TITLE_ATTRIBUTE])
        node.attributes[HAIKU_TITLE_ATTRIBUTE] = domId
    }
  }); for (const originalReference in fixedReferences) {
    const updatedReference = fixedReferences[originalReference]; if (bytecode.eventHandlers)
      transferReferences(bytecode.eventHandlers, originalReference, updatedReference); if (bytecode.timelines) {
      for (const timelineName in bytecode.timelines) {
        const timelineObject = bytecode.timelines[timelineName]; transferReferences(timelineObject, originalReference, updatedReference); for (const timelineSelector in timelineObject) {
          for (const propertyName in timelineObject[timelineSelector]) {
            if (propertyName === 'content')
              continue; for (const keyframeMs in timelineObject[timelineSelector][propertyName]) {
              const propertyValue = timelineObject[timelineSelector][propertyName][keyframeMs].value; const fixedValue = fixedReferences[propertyValue]; if (fixedValue)
                timelineObject[timelineSelector][propertyName][keyframeMs].value = fixedValue
            }
          }
        }
      }
    }
  } templateNodes.forEach((node) => {
    for (const attrKey in node.attributes) {
      if ((ATTRS_TO_EXCLUDE_FROM_ID_PADDING as any)[attrKey])
        continue; const attrVal = node.attributes[attrKey]; if (typeof attrVal !== 'string')
        continue; if (fixedReferences[String(attrVal).trim()])
        node.attributes[attrKey] = fixedReferences[String(attrVal).trim()]
    }
  })
}
const ATTRS_TO_EXCLUDE_FROM_ID_PADDING: Record<string, boolean> = { 'haiku-title': true, 'haiku-source': true, 'haiku-var': true }
function transferReferences(obj: any, originalReference: string, updatedReference: string) {
  if (obj[`#${originalReference}`]) { obj[`#${updatedReference}`] = obj[`#${originalReference}`]; delete obj[`#${originalReference}`] }
  else if (obj[`haiku:${originalReference}`]) { obj[`haiku:${updatedReference}`] = obj[`haiku:${originalReference}`]; delete obj[`haiku:${originalReference}`] }
}
;(Bytecode as any).mergeBytecode = (b1: any, b2: any) => {
  if (!b1.metadata)
    b1.metadata = {}; Object.assign(b1.metadata, b2.metadata || {}); if (!b1.options)
    b1.options = {}; Object.assign(b1.options, b2.options || {}); if (!b1.helpers)
    b1.helpers = {}; Object.assign(b1.helpers, b2.helpers || {}); (Bytecode as any).mergeBytecodeControlStructures(b1, b2); b1.template = (Template as any).clone({}, b2.template); return b1
}
;(Bytecode as any).mergeBytecodeStates = (b1: any, b2: any) => {
  if (b2.states && !b1.states)
    b1.states = {}; if (b2.states) {
    for (const stateKey in b2.states) {
      const previousState = b1.states[stateKey]; if (!previousState || (previousState && !previousState.edited))
        b1.states[stateKey] = b2.states[stateKey]
    }
  }
}
;(Bytecode as any).mergeBytecodeEventHandlers = (b1: any, b2: any) => {
  if (b2.eventHandlers && !b1.eventHandlers)
    b1.eventHandlers = {}; if (b2.eventHandlers) {
    for (const eventSelector in b2.eventHandlers) {
      for (const eventName in b2.eventHandlers[eventSelector]) {
        const previousEventHandler = (b1.eventHandlers[eventSelector] && b1.eventHandlers[eventSelector][eventName]); if (!previousEventHandler || (previousEventHandler && !previousEventHandler.edited)) {
          if (!b1.eventHandlers[eventSelector])
            b1.eventHandlers[eventSelector] = {}; b1.eventHandlers[eventSelector][eventName] = b2.eventHandlers[eventSelector][eventName]
        }
      }
    }
  }
}
;(Bytecode as any).mergeTimelines = (t1: any, t2: any, doMergeValueFn?: any) => {
  const changesMade: any[] = []; if (!t1 || !t2)
    return changesMade; for (const timelineName in t2) {
    for (const timelineSelector in t2[timelineName]) {
      for (const propertyName in t2[timelineName][timelineSelector]) {
        for (const keyframeMs in t2[timelineName][timelineSelector][propertyName]) {
          const previousKeyframe = (t1[timelineName] && t1[timelineName][timelineSelector] && t1[timelineName][timelineSelector][propertyName] && t1[timelineName][timelineSelector][propertyName][keyframeMs]); if (!previousKeyframe || (previousKeyframe && !previousKeyframe.edited)) {
            if (!t1[timelineName])
              t1[timelineName] = {}; if (!t1[timelineName][timelineSelector])
              t1[timelineName][timelineSelector] = {}; if (!t1[timelineName][timelineSelector][propertyName])
              t1[timelineName][timelineSelector][propertyName] = {}; if (!t1[timelineName][timelineSelector][propertyName][keyframeMs])
              t1[timelineName][timelineSelector][propertyName][keyframeMs] = {}; const targetObj = t1[timelineName][timelineSelector][propertyName][keyframeMs]; const sourceObj = t2[timelineName][timelineSelector][propertyName][keyframeMs]; if (sourceObj && sourceObj.curve !== undefined)
              targetObj.curve = sourceObj.curve; if (sourceObj && sourceObj.edited !== undefined)
              targetObj.edited = sourceObj.edited; if (sourceObj && sourceObj.value !== undefined) {
              if (targetObj.value !== sourceObj.value) {
                if (doMergeValueFn) { if (doMergeValueFn(propertyName, targetObj.value, sourceObj.value)) { changesMade.push({ timelineName, timelineSelector, propertyName, keyframeMs, value: sourceObj.value }); targetObj.value = sourceObj.value } }
                else { changesMade.push({ timelineName, timelineSelector, propertyName, keyframeMs, value: sourceObj.value }); targetObj.value = sourceObj.value }
              }
            }
          }
        }
      }
    }
  } return changesMade
}
;(Bytecode as any).mergeBytecodeControlStructures = (b1: any, b2: any) => {
  (Bytecode as any).mergeBytecodeStates(b1, b2); (Bytecode as any).mergeBytecodeEventHandlers(b1, b2); if (b2.timelines && !b1.timelines)
    b1.timelines = {}; return (Bytecode as any).mergeTimelines(b1.timelines, b2.timelines)
}
;(Bytecode as any).pasteBytecode = (destination: any, pasted: any) => {
  if (pasted.states) {
    if (!destination.states)
      destination.states = {}; for (const stateKey in pasted.states) destination.states[stateKey] = pasted.states[stateKey]
  } if (pasted.eventHandlers) {
    if (!destination.eventHandlers)
      destination.eventHandlers = {}; for (const eventSelector in pasted.eventHandlers) {
      for (const eventName in pasted.eventHandlers[eventSelector]) {
        if (!destination.eventHandlers[eventSelector])
          destination.eventHandlers[eventSelector] = {}; destination.eventHandlers[eventSelector][eventName] = pasted.eventHandlers[eventSelector][eventName]
      }
    }
  } if (pasted.timelines) {
    if (!destination.timelines)
      destination.timelines = {}; for (const timelineName in pasted.timelines) {
      for (const timelineSelector in pasted.timelines[timelineName]) {
        for (const propertyName in pasted.timelines[timelineName][timelineSelector]) {
          for (const keyframeMs in pasted.timelines[timelineName][timelineSelector][propertyName]) {
            if (!destination.timelines[timelineName])
              destination.timelines[timelineName] = {}; if (!destination.timelines[timelineName][timelineSelector])
              destination.timelines[timelineName][timelineSelector] = {}; if (!destination.timelines[timelineName][timelineSelector][propertyName])
              destination.timelines[timelineName][timelineSelector][propertyName] = {}; destination.timelines[timelineName][timelineSelector][propertyName][keyframeMs] = pasted.timelines[timelineName][timelineSelector][propertyName][keyframeMs]
          }
        }
      }
    }
  } if (pasted.template) {
    if (!destination.template)
      destination.template = { elementName: 'div', attributes: {}, children: [] }; if (!destination.template.children)
      destination.template.children = []; destination.template.children.unshift(pasted.template)
  } return destination
}
;(Bytecode as any).applyOverrides = (overrides: any, timelinesObject: any, timelineName: string, timelineSelector: string, timelineTime: number) => {
  if (overrides && Object.keys(overrides).length > 0) {
    if (!timelinesObject[timelineName])
      timelinesObject[timelineName] = {}; if (!timelinesObject[timelineName][timelineSelector])
      timelinesObject[timelineName][timelineSelector] = {}; for (const propertyName in overrides) {
      if (!timelinesObject[timelineName][timelineSelector][propertyName])
        timelinesObject[timelineName][timelineSelector][propertyName] = {}; if (!timelinesObject[timelineName][timelineSelector][propertyName][timelineTime])
        timelinesObject[timelineName][timelineSelector][propertyName][timelineTime] = {}; if (!timelinesObject[timelineName][timelineSelector][propertyName][timelineTime].edited)
        timelinesObject[timelineName][timelineSelector][propertyName][timelineTime].value = overrides[propertyName]
    }
  }
}
;(Bytecode as any).extractOverrides = (bytecode: any) => {
  const overrides: any = {}; if (bytecode.states) {
    for (const stateName in bytecode.states) overrides[stateName] = bytecode.states[stateName].value
  } return overrides
}
;(Bytecode as any).clone = (bytecode: any) => { return (Bytecode as any).mergeBytecode({}, bytecode) }
;(Bytecode as any).snapshot = (bytecode: any) => {
  return cloneDeepWith(bytecode, (value: any) => {
    if (typeof value === 'function')
      return value
  })
}
;(Bytecode as any).decycle = (reified: any, { cleanManaOptions = {}, doCleanMana }: any = {}) => {
  const decycled: any = {}; if (!reified) { logger.warn(`Decycle received falsy bytecode`); return decycled } if (reified.metadata)
    decycled.metadata = reified.metadata; if (reified.options)
    decycled.options = reified.options; if (reified.settings)
    decycled.settings = reified.settings; if (reified.properties)
    decycled.properties = reified.properties; if (reified.states)
    decycled.states = reified.states; if (reified.helpers)
    decycled.helpers = reified.helpers; if (reified.eventHandlers) { decycled.eventHandlers = {}; for (const componentId in reified.eventHandlers) { decycled.eventHandlers[componentId] = {}; for (const eventListenerName in reified.eventHandlers[componentId]) { const handlerToAssign = reified.eventHandlers[componentId][eventListenerName].handler; decycled.eventHandlers[componentId][eventListenerName] = { handler: handlerToAssign } } } } if (reified.timelines)
    decycled.timelines = reified.timelines; if (reified.template) {
    if (doCleanMana)
      decycled.template = (Template as any).cleanMana(reified.template, cleanManaOptions); else decycled.template = reified.template
  } return decycled
}
;(Bytecode as any).reinitialize = (folder: string, relpath: string, bytecode: any = {}, config: any = {}) => {
  let mana: any; if (typeof bytecode.template === 'string')
    mana = xmlToMana(bytecode.template || FALLBACK_TEMPLATE); else if (typeof bytecode.template === 'object')
    mana = bytecode.template || xmlToMana(FALLBACK_TEMPLATE); else mana = { elementName: 'div', attributes: {}, children: [] }; bytecode.template = mana; if (!Array.isArray(bytecode.template.children))
    ensureManaChildrenArray(bytecode.template); if (!bytecode.template.attributes)
    bytecode.template.attributes = {}; (Template as any).ensureTopLevelDisplayAttributes(bytecode.template); if (!bytecode.template.elementName)
    bytecode.template.elementName = 'div'; (Template as any).ensureRootDisplayAttributes(bytecode.template); if (!bytecode.options)
    bytecode.options = {}; if (!bytecode.timelines)
    bytecode.timelines = {}; if (!bytecode.timelines[DEFAULT_TIMELINE_NAME])
    bytecode.timelines[DEFAULT_TIMELINE_NAME] = {}; for (const timelineName in bytecode.timelines) { for (const selector in bytecode.timelines[timelineName]) { for (const property in bytecode.timelines[timelineName][selector]) { if (typeof bytecode.timelines[timelineName][selector][property] !== 'object') { bytecode.timelines[timelineName][selector][property] = { [DEFAULT_TIMELINE_TIME]: { value: bytecode.timelines[timelineName][selector][property] } } } } } } convertManaLayout(bytecode.template); (Bytecode as any).writeMetadata(bytecode, lodash.assign({}, config, { uuid: 'HAIKU_SHARE_UUID', root: 'HAIKU_CDN_PROJECT_ROOT', type: 'haiku', relpath })); (Template as any).ensureTitleAndUidifyTree(bytecode.template, (Template as any).normalizePath(relpath), (Template as any).normalizePath(relpath), '0', { title: config.title }); const contextHaikuId = bytecode.template.attributes[HAIKU_ID_ATTRIBUTE]; const scenename = (ModuleWrapper as any).getScenenameFromRelpath(relpath); (Bytecode as any).upsertDefaultProperties(bytecode, contextHaikuId, { 'style.WebkitTapHighlightColor': 'rgba(0,0,0,0)', 'style.position': 'relative', 'style.overflowX': (scenename === 'main') ? 'hidden' : 'visible', 'style.overflowY': (scenename === 'main') ? 'hidden' : 'visible', 'sizeAbsolute.x': DEFAULT_CONTEXT_SIZE.width, 'sizeAbsolute.y': DEFAULT_CONTEXT_SIZE.height, 'sizeMode.x': 1, 'sizeMode.y': 1, 'sizeMode.z': 1 }, 'assign'); bytecode.template.children.forEach((child: any) => { const childId = child.attributes && child.attributes[HAIKU_ID_ATTRIBUTE]; if (childId) { const selector = (Template as any).buildHaikuIdSelector(childId); (Bytecode as any).ensureDefinedKeyframeProperty(bytecode, DEFAULT_TIMELINE_NAME, selector, 'translation.x', DEFAULT_TIMELINE_TIME, 0); (Bytecode as any).ensureDefinedKeyframeProperty(bytecode, DEFAULT_TIMELINE_NAME, selector, 'translation.y', DEFAULT_TIMELINE_TIME, 0) } }); return bytecode
}
;(Bytecode as any).ensureDefinedKeyframeProperty = (bytecode: any, timelineName: string, selector: string, propertyName: string, keyframeMs: number, propertyValue: any) => {
  if (!bytecode.timelines[timelineName])
    bytecode.timelines[timelineName] = {}; if (!bytecode.timelines[timelineName][selector])
    bytecode.timelines[timelineName][selector] = {}; if (!bytecode.timelines[timelineName][selector][propertyName])
    bytecode.timelines[timelineName][selector][propertyName] = {}; if (!bytecode.timelines[timelineName][selector][propertyName][keyframeMs])
    bytecode.timelines[timelineName][selector][propertyName][keyframeMs] = {}; if (bytecode.timelines[timelineName][selector][propertyName][keyframeMs].value === undefined)
    bytecode.timelines[timelineName][selector][propertyName][keyframeMs].value = propertyValue
}
;(Bytecode as any).upsertDefaultProperties = (bytecode: any, componentId: string, propertiesToMerge: any, strategy?: string) => {
  if (!strategy)
    strategy = 'merge'; const haikuSelector = `haiku:${componentId}`; if (!bytecode.timelines.Default[haikuSelector])
    bytecode.timelines.Default[haikuSelector] = {}; const defaultTimeline = bytecode.timelines.Default[haikuSelector]; for (const propName in propertiesToMerge) {
    if (!defaultTimeline.hasOwnProperty(propName))
      defaultTimeline[propName] = {}; if (!defaultTimeline[propName][DEFAULT_TIMELINE_TIME])
      defaultTimeline[propName][DEFAULT_TIMELINE_TIME] = {}; switch (strategy) {
      case 'merge': defaultTimeline[propName][DEFAULT_TIMELINE_TIME].value = propertiesToMerge[propName]; break; case 'assign': if (defaultTimeline[propName][DEFAULT_TIMELINE_TIME].value === undefined)
        defaultTimeline[propName][DEFAULT_TIMELINE_TIME].value = propertiesToMerge[propName]; break
    }
  }
}
;(Bytecode as any).batchUpsertEventHandlers = (bytecode: any, selectorName: string, serializedEvents: any) => {
  if (!bytecode.eventHandlers)
    bytecode.eventHandlers = {}; if (!Object.keys(serializedEvents).length) { delete bytecode.eventHandlers[selectorName]; return } bytecode.eventHandlers[selectorName] = {}; Object.entries(serializedEvents).forEach(([event, handlerDescriptor]: any) => { bytecode.eventHandlers[selectorName][event] = {}; if (handlerDescriptor.handler !== undefined) { bytecode.eventHandlers[selectorName][event].handler = (Bytecode as any).unserializeValue(handlerDescriptor.handler) } }); return bytecode
}
;(Bytecode as any).changeKeyframeValue = (bytecode: any, componentId: string, timelineName: string, propertyName: string, keyframeMs: number, newValue: any) => { const property = (Bytecode as any).ensureTimelineProperty(bytecode, timelineName, componentId, propertyName); property[keyframeMs].value = (Bytecode as any).unserializeValue(newValue); property[keyframeMs].edited = true; return property }
;(Bytecode as any).changePlaybackSpeed = (bytecode: any, framesPerSecond: number) => {
  if (!bytecode.options)
    bytecode.options = {}; bytecode.options.fps = Math.round(Number.parseInt(String(framesPerSecond), 10)); if (bytecode.options.fps > 60)
    bytecode.options.fps = 60
}
;(Bytecode as any).changeSegmentCurve = (bytecode: any, componentId: string, timelineName: string, propertyName: string, keyframeMs: number, newCurve: any) => {
  const property = (Bytecode as any).ensureTimelineProperty(bytecode, timelineName, componentId, propertyName); if (!property[keyframeMs])
    property[keyframeMs] = {}; property[keyframeMs].curve = (Bytecode as any).unserializeValue(newCurve); property[keyframeMs].edited = true; return property
}
;(Bytecode as any).componentIdToSelector = (componentId: string) => {
  if (componentId.slice(0, 6 === 'haiku:'))
    return componentId; return `haiku:${componentId}`
}
;(Bytecode as any).createKeyframe = (bytecode: any, componentId: string, timelineName: string, elementName: any, propertyName: string, keyframeStartMs: number, keyframeValueGiven: any, keyframeCurve: any, keyframeEndMs: number, keyframeEndValue: any, hostInstance: any, inputValues: any) => {
  const property = (Bytecode as any).ensureTimelineProperty(bytecode, timelineName, componentId, propertyName); const precedingValue = (TimelineProperty as any).getPropertyValueAtTime(bytecode.timelines, timelineName, componentId, elementName, propertyName, keyframeStartMs - 1, hostInstance, inputValues); const currentValue = (TimelineProperty as any).getPropertyValueAtTime(bytecode.timelines, timelineName, componentId, elementName, propertyName, keyframeStartMs, hostInstance, inputValues); const precedingAssignedValueObject = (TimelineProperty as any).getAssignedBaselineValueObject(componentId, elementName, propertyName, timelineName, keyframeStartMs - 1, bytecode); const precedingAssignedValue = precedingAssignedValueObject && precedingAssignedValueObject.value; const currentAssignedValueObject = (TimelineProperty as any).getAssignedBaselineValueObject(componentId, elementName, propertyName, timelineName, keyframeStartMs, bytecode); const currentAssignedValue = currentAssignedValueObject && currentAssignedValueObject.value; if (!property[keyframeStartMs])
    property[keyframeStartMs] = {}; let keyframeValue = keyframeValueGiven; if (isEmpty(keyframeValue))
    keyframeValue = currentAssignedValue; if (isEmpty(keyframeValue))
    keyframeValue = precedingAssignedValue; if (isEmpty(keyframeValue))
    keyframeValue = currentValue; if (isEmpty(keyframeValue))
    keyframeValue = precedingValue; keyframeValue = (Bytecode as any).unserializeValue(keyframeValue); property[keyframeStartMs].value = keyframeValue; if (keyframeCurve !== undefined && keyframeCurve !== null)
    property[keyframeStartMs].curve = (Bytecode as any).unserializeValue(keyframeCurve); property[keyframeStartMs].edited = true; if (keyframeEndMs !== undefined && keyframeEndMs !== null) {
    if (!property[keyframeEndMs])
      property[keyframeEndMs] = {}; property[keyframeEndMs].value = (Bytecode as any).unserializeValue(keyframeEndValue || keyframeValue); property[keyframeEndMs].edited = true
  } return property[keyframeStartMs]
}
;(Bytecode as any).createTimeline = (bytecode: any, timelineName: string, timelineDescriptor: any) => {
  const timeline = (Bytecode as any).ensureTimeline(bytecode, timelineName); if (timelineDescriptor)
    merge(timeline, (Bytecode as any).unserializeValue(timelineDescriptor)); return timeline
}
;(Bytecode as any).deleteKeyframe = (bytecode: any, componentId: string, timelineName: string, propertyName: string, keyframeMs: number) => {
  const property = (Bytecode as any).ensureTimelineProperty(bytecode, timelineName, componentId, propertyName); const mss = (Bytecode as any).getSortedKeyframeKeys(property); const list = mss.map((ms, i) => { const prev = mss[i - 1]; const next = mss[i + 1]; return { edited: property[ms].edited, curve: property[ms].curve, value: property[ms].value, index: i, start: ms, end: (next !== undefined) ? next : ms, first: prev === undefined, last: next === undefined } }); const curr = list.filter((item: any) => item.start === keyframeMs)[0]; if (!curr)
    return property; const prev = list[curr.index - 1]; const next = list[curr.index + 1]; delete property[keyframeMs]; if (prev && !next) {
    property[prev.start] = {}; property[prev.start].value = prev.value; if (prev.edited)
      property[prev.start].edited = true
  }
}
;(Bytecode as any).deleteStateValue = (bytecode: any, stateName: string) => {
  if (bytecode.states)
    delete bytecode.states[stateName]; return bytecode
}
;(Bytecode as any).deleteTimeline = (bytecode: any, timelineName: string) => {
  if (bytecode.timelines)
    delete bytecode.timelines[timelineName]; return bytecode.timelines
}
;(Bytecode as any).duplicateTimeline = (bytecode: any, timelineName: string) => { const timeline = (Bytecode as any).ensureTimeline(bytecode, timelineName); const duplicate = clone(timeline); const newName = `${timelineName} copy`; (Bytecode as any).createTimeline(bytecode, newName, duplicate); return newName }
;(Bytecode as any).ensureTimeline = (bytecode: any, timelineName: string) => {
  if (!bytecode.timelines)
    bytecode.timelines = {}; if (!bytecode.timelines[timelineName])
    bytecode.timelines[timelineName] = {}; return bytecode.timelines[timelineName]
}
;(Bytecode as any).ensureTimelineGroup = (bytecode: any, timelineName: string, componentId: string) => {
  const timeline = (Bytecode as any).ensureTimeline(bytecode, timelineName); const selector = (Bytecode as any).componentIdToSelector(componentId); if (!timeline[selector])
    timeline[selector] = {}; return timeline[selector]
}
;(Bytecode as any).ensureTimelineProperty = (bytecode: any, timelineName: string, componentId: string, propertyName: string) => {
  const group = (Bytecode as any).ensureTimelineGroup(bytecode, timelineName, componentId); if (!group[propertyName])
    group[propertyName] = {}; return group[propertyName]
}
;(Bytecode as any).getSortedKeyframeKeys = (property: any) => {
  if (!property)
    return []; return Object.keys(property).map(ms => Number.parseInt(ms, 10)).sort((a, b) => a - b)
}
;(Bytecode as any).joinKeyframes = (bytecode: any, componentId: string, timelineName: string, elementName: any, propertyName: string, keyframeMsLeft: number, keyframeMsRight: number, newCurve: any) => { const property = (Bytecode as any).ensureTimelineProperty(bytecode, timelineName, componentId, propertyName); if (property[keyframeMsLeft]) { property[keyframeMsLeft].curve = (Bytecode as any).unserializeValue(newCurve); property[keyframeMsLeft].edited = true } return property }
;(Bytecode as any).moveKeyframes = (bytecode: any, keyframeMoves: any) => { for (const timelineName in keyframeMoves) { for (const componentId in keyframeMoves[timelineName]) { for (const propertyName in keyframeMoves[timelineName][componentId]) { const keyframeMove = (Bytecode as any).unserializeValue(keyframeMoves[timelineName][componentId][propertyName]); const propertyObject = (Bytecode as any).ensureTimelineProperty(bytecode, timelineName, componentId, propertyName); for (const oldMs in propertyObject) delete propertyObject[oldMs]; for (const newMs in keyframeMove) { propertyObject[newMs] = keyframeMove[newMs]; propertyObject[newMs].edited = true } } } } }
;(Bytecode as any).readAllEventHandlers = (bytecode: any) => {
  if (!bytecode.eventHandlers)
    bytecode.eventHandlers = {}; return bytecode.eventHandlers
}
;(Bytecode as any).readAllStateValues = (bytecode: any) => {
  if (!bytecode.states)
    bytecode.states = {}; return bytecode.states
}
;(Bytecode as any).renameTimeline = (bytecode: any, timelineNameOld: string, timelineNameNew: string) => {
  const old = (Bytecode as any).ensureTimeline(bytecode, timelineNameOld); if (timelineNameOld === timelineNameNew)
    return old; if (bytecode.timelines[timelineNameNew])
    return old; bytecode.timelines[timelineNameNew] = old; delete bytecode.timelines[timelineNameOld]; return old
}
;(Bytecode as any).serializeValue = (value: any) => { return expressionToRO(value) }
;(Bytecode as any).unserializeValue = (value: any, referenceEvaluator: any = referenceEvaluatorMissing) => { const skipFunctions = !DO_REIFY_FUNCTIONS; return reifyRO(value, referenceEvaluator, skipFunctions) }
;(Bytecode as any).splitSegment = (bytecode: any, componentId: string, timelineName: string, elementName: any, propertyName: string, keyframeMs: number) => {
  const property = (Bytecode as any).ensureTimelineProperty(bytecode, timelineName, componentId, propertyName); if (property[keyframeMs]) {
    const orig = property[keyframeMs]; property[keyframeMs] = { value: orig.value }; if (orig.edited)
      property[keyframeMs].edited = true
  } return property
}
;(Bytecode as any).upsertEventHandler = (bytecode: any, selectorName: string, eventName: string, handlerDescriptor: any) => {
  if (!bytecode.eventHandlers)
    bytecode.eventHandlers = {}; if (!bytecode.eventHandlers[selectorName])
    bytecode.eventHandlers[selectorName] = {}; if (!bytecode.eventHandlers[selectorName][eventName])
    bytecode.eventHandlers[selectorName][eventName] = {}; if (handlerDescriptor.handler !== undefined)
    bytecode.eventHandlers[selectorName][eventName].handler = (Bytecode as any).unserializeValue(handlerDescriptor.handler); bytecode.eventHandlers[selectorName][eventName].edited = true; return bytecode
}
;(Bytecode as any).upsertStateValue = (bytecode: any, stateName: string, stateDescriptor: any) => {
  if (!bytecode.states)
    bytecode.states = {}; if (!bytecode.states[stateName])
    bytecode.states[stateName] = {}; if (stateDescriptor.type !== undefined)
    bytecode.states[stateName].type = stateDescriptor.type; if (stateDescriptor.value !== undefined)
    bytecode.states[stateName].value = stateDescriptor.value; if (stateDescriptor.access !== undefined)
    bytecode.states[stateName].access = stateDescriptor.access; if (stateDescriptor.mock !== undefined)
    bytecode.states[stateName].mock = stateDescriptor.mock; if (stateDescriptor.get !== undefined)
    bytecode.states[stateName].get = (Bytecode as any).unserializeValue(stateDescriptor.get); if (stateDescriptor.set !== undefined)
    bytecode.states[stateName].set = (Bytecode as any).unserializeValue(stateDescriptor.set); bytecode.states[stateName].edited = true; return bytecode
}
;(Bytecode as any).writeMetadata = (bytecode: any, metadata: any) => {
  if (!bytecode.metadata)
    bytecode.metadata = {}; if (metadata) {
    for (const key in metadata) {
      if (metadata[key] !== undefined && metadata[key] !== null)
        bytecode.metadata[key] = metadata[key]
    }
  }
}
;(Bytecode as any).upsertPropertyValue = (bytecode: any, componentId: string, timelineName: string, timelineTime: number, propertiesToMerge: any, strategy?: string) => {
  if (!strategy)
    strategy = 'merge'; const haikuSelector = `haiku:${componentId}`; if (!bytecode.timelines[timelineName][haikuSelector])
    bytecode.timelines[timelineName][haikuSelector] = {}; const defaultTimeline = bytecode.timelines[timelineName][haikuSelector]; for (const propName in propertiesToMerge) {
    if (!defaultTimeline[propName])
      defaultTimeline[propName] = {}; if (!defaultTimeline[propName][timelineTime])
      defaultTimeline[propName][timelineTime] = {}; switch (strategy) {
      case 'merge': defaultTimeline[propName][timelineTime].value = propertiesToMerge[propName]; break; case 'assign': if (defaultTimeline[propName][timelineTime].value === undefined)
        defaultTimeline[propName][timelineTime].value = propertiesToMerge[propName]; break
    }
  }
}
;(Bytecode as any).replaceTimelinePropertyGroups = (bytecodeObject: any, timelineName: string, timelineSelector: string, propertyGroup: any) => {
  if (!bytecodeObject.timelines[timelineName])
    bytecodeObject.timelines[timelineName] = {}; if (!bytecodeObject.timelines[timelineName][timelineSelector])
    bytecodeObject.timelines[timelineName][timelineSelector] = {}; Object.assign(bytecodeObject.timelines[timelineName][timelineSelector], propertyGroup)
}
;(Bytecode as any).getNormalizedRelpath = (bc: any) => {
  const r = bc && bc.metadata && bc.metadata.relpath; if (r)
    return (Template as any).normalizePath(r)
}
;(Bytecode as any).isBytecodeSame = (a: any, b: any) => {
  if (!a || !b)
    return false; if (a === b)
    return true; const relpathA = (Bytecode as any).getNormalizedRelpath(a); const relpathB = (Bytecode as any).getNormalizedRelpath(b); if (relpathA && relpathB)
    return relpathA === relpathB; return false
}
;(Bytecode as any).doesMatchOrHostBytecode = (ours: any, theirs: any, seen: any = {}) => {
  seen[(Bytecode as any).getNormalizedRelpath(ours)] = true; if ((Bytecode as any).isBytecodeSame(ours, theirs))
    return true; let answer = false; (Template as any).visit(ours.template, (node: any) => {
    if (answer)
      return; if (typeof node.elementName === 'object') {
      const relpath = (Bytecode as any).getNormalizedRelpath(node.elementName); if (seen[relpath])
        return; seen[relpath] = true; if ((Bytecode as any).doesMatchOrHostBytecode(node.elementName, theirs, seen))
        answer = true
    }
  }); return answer
}
;(Bytecode as any).addDefaultCurveIfNecessary = (bytecode: any, timelineName: string, selector: string, newKeyframeTime: number, propertyName: string, componentId: string, elementName: any) => { const property = bytecode.timelines[timelineName][selector][propertyName]; if (property) { const orderedKeyframes = Object.keys(property).map(Number).sort((a, b) => a - b); const lastKeyframe = orderedKeyframes.filter(time => time < newKeyframeTime).pop(); const nextKeyframe = orderedKeyframes.filter(time => time > newKeyframeTime).shift(); if (lastKeyframe !== undefined && property[lastKeyframe].curve === undefined && property[lastKeyframe].value !== property[newKeyframeTime].value) { (Bytecode as any).joinKeyframes(bytecode, componentId, timelineName, elementName, propertyName, lastKeyframe, newKeyframeTime, DEFAULT_CURVE) } if (nextKeyframe && property[newKeyframeTime].curve === undefined && property[nextKeyframe].value !== property[newKeyframeTime].value) { (Bytecode as any).joinKeyframes(bytecode, componentId, timelineName, elementName, propertyName, newKeyframeTime, nextKeyframe, DEFAULT_CURVE) } } }

export default Bytecode
export { Bytecode }

const ModuleWrapper = require('./ModuleWrapper')
const State = require('./State')
const Template = require('./Template')
const TimelineProperty = require('./TimelineProperty')
