import path from 'node:path'
import { ATTRS_HYPH_TO_CAMEL } from '@haiku/core/lib/HaikuComponent'
import { visitManaTree } from '@haiku/core/lib/HaikuNode'
import { convertManaLayout, manaToXml } from 'haiku-common'
import assign from 'lodash.assign'
import defaults from 'lodash.defaults'
import find from 'lodash.find'
import merge from 'lodash.merge'
import pascalcase from 'pascalcase'
import CryptoUtils from './../utils/CryptoUtils'
import BaseModel from './BaseModel'

import Bytecode from './Bytecode'
import Element from './Element'

const SVGPoints = require('@haiku/core/lib/helpers/SVGPoints').default

const GROUP_DELIMITER = '.'
const MERGE_STRATEGIES = { assign: 'assign', defaults: 'defaults' }
const ROOT_LOCATOR = '0'
const HAIKU_ID_ATTRIBUTE = 'haiku-id'
const HAIKU_SOURCE_ATTRIBUTE = 'haiku-source'
const HAIKU_TITLE_ATTRIBUTE = 'haiku-title'
const HAIKU_SELECTOR_PREFIX = 'haiku'
const REF_MATCHER_RE = /^url\(#(.*)\)$/
const TEMPLATE_METADATA_ATTRIBUTES: Record<string, boolean> = {
  'version': true,
  'encoding': true,
  'standalone': true,
  'xmlns': true,
  'xmlns:xlink': true,
  'lang': true,
  'charset': true,
  'content': true,
  'http-equiv': true,
  'scheme': true,
  'identifier': true,
  'haiku-id': true,
  'haiku-var': true,
  'haiku-title': true,
  'haiku-source': true,
  'haiku-transclude': true,
  'haiku-locked': true,
}
const SELECTOR_ATTRIBUTES: Record<string, string> = { id: 'id', class: 'class', className: 'class', name: 'name', type: 'type' }

function isSerializedFunction(object: any) { return object && !!object.__function }
function extractReferenceIdFromUrlReference(stringValue: string) { const matches = REF_MATCHER_RE.exec(stringValue); return matches ? matches[1] : null }

class Template extends (BaseModel as any) {}

;(Template as any).DEFAULT_OPTIONS = { required: {} }
;(BaseModel as any).extend(Template)

;(Template as any).prepareManaAndBuildTimelinesObject = (
  mana: any,
  hash: string,
  timelineName: string,
  timelineTime: number,
  { doHashWork, title }: { doHashWork?: boolean, title?: string },
) => {
  if (doHashWork) {
    (Template as any).fixFragmentIdentifierReferences(mana, hash)
    ;(Template as any).ensureTitleAndUidifyTree(path.posix.normalize(mana.attributes[HAIKU_SOURCE_ATTRIBUTE] || ''), hash, mana, { title })
  }
  ;(Template as any).ensureTopLevelDisplayAttributes(mana)
  convertManaLayout(mana)
  const timelinesObject = (Template as any).hoistTreeAttributes(mana, timelineName, timelineTime)
  return timelinesObject
}

;(Template as any).normalizePath = (str: string) => {
  if (str[0] === '.')
    return `./${path.normalize(str)}`; return path.normalize(str)
}
;(Template as any).normalizePathOfPossiblyExternalModule = (str: string) => {
  if (str[0] === '@')
    return path.normalize(str); return (Template as any).normalizePath(`./${str}`)
}

;(Template as any).mirrorHaikuUids = (fromNode: any, toNode: any) => {
  if (!toNode.attributes)
    toNode.attributes = {}
  toNode.attributes[HAIKU_ID_ATTRIBUTE] = fromNode.attributes[HAIKU_ID_ATTRIBUTE]
  if (!fromNode.children || fromNode.children.length < 1)
    return
  if (!toNode.children || toNode.children.length < 1)
    return
  if (fromNode.children.length !== toNode.children.length)
    return
  for (let i = 0; i < fromNode.children.length; i++) {
    const fromNodeChild = fromNode.children[i]
    const toNodeChild = toNode.children[i]
    if (typeof fromNodeChild === 'string')
      continue
    if (fromNodeChild.elementName !== toNodeChild.elementName)
      continue
    (Template as any).mirrorHaikuUids(fromNodeChild, toNodeChild)
  }
}

;(Template as any).manaWithOnlyMinimalProps = (mana: any, referenceSerializer: (s: string) => string, includeChildren = true) => {
  if (mana && typeof mana === 'object') {
    const out: any = {}
    out.elementName = mana.elementName
    if (typeof mana.elementName === 'object') { out.elementName = { __reference: referenceSerializer(out.elementName.__reference) } }
    if (mana.attributes) {
      out.attributes = {}
      if (mana.attributes[HAIKU_ID_ATTRIBUTE])
        out.attributes[HAIKU_ID_ATTRIBUTE] = mana.attributes[HAIKU_ID_ATTRIBUTE]
      if (mana.attributes[HAIKU_SOURCE_ATTRIBUTE])
        out.attributes[HAIKU_SOURCE_ATTRIBUTE] = mana.attributes[HAIKU_SOURCE_ATTRIBUTE]
    }
    if (includeChildren && typeof mana.elementName !== 'object' && mana.children) {
      out.children = mana.children.filter((child: any) => child && typeof child !== 'string').map((child: any) => (Template as any).manaWithOnlyMinimalProps(child, referenceSerializer, false))
    }
    else { out.children = [] }
    return out
  }
  if (typeof mana === 'string')
    return mana
}

;(Template as any).manaWithOnlyStandardProps = (mana: any, doOmitSubcomponentBytecode = true, referenceSerializer?: (s: string) => string) => {
  if (mana && typeof mana === 'object') {
    const out: any = {}
    out.elementName = mana.elementName
    if (typeof mana.elementName === 'object') {
      if (doOmitSubcomponentBytecode) { out.elementName = { __reference: referenceSerializer ? referenceSerializer(out.elementName.__reference) : out.elementName.__reference } }
    }
    if (mana.attributes) {
      out.attributes = {}
      for (const key1 in TEMPLATE_METADATA_ATTRIBUTES) {
        if (mana.attributes[key1])
          out.attributes[key1] = mana.attributes[key1]
      }
      for (const key2 in SELECTOR_ATTRIBUTES) {
        if (mana.attributes[key2])
          out.attributes[key2] = mana.attributes[key2]
      }
    }
    if (typeof mana.elementName !== 'object') {
      out.children = mana.children && mana.children.filter((child: any) => child && typeof child !== 'string').map((child: any) => (Template as any).manaWithOnlyStandardProps(child, doOmitSubcomponentBytecode, referenceSerializer))
    }
    else { out.children = [] }
    return out
  }
  if (typeof mana === 'string')
    return mana
}

;(Template as any).manaTreeToDepthFirstArray = (arr: any[], mana: any) => {
  if (!mana || typeof mana === 'string')
    return arr; arr.push(mana); for (let i = 0; i < mana.children.length; i++) { const child = mana.children[i]; (Template as any).manaTreeToDepthFirstArray(arr, child) } return arr
}

;(Template as any).hoistTreeAttributes = (mana: any, timelineName: string, timelineTime: number) => {
  const elementsByHaikuId = (Template as any).getAllElementsByHaikuId(mana)
  const timelineStructure: any = {}
  timelineStructure[timelineName] = {}
  const theTimelineObj = timelineStructure[timelineName]
  for (const haikuId in elementsByHaikuId) { const node = elementsByHaikuId[haikuId]; (Template as any).hoistNodeAttributes(node, haikuId, theTimelineObj, timelineName, timelineTime, 'assign') }
  return timelineStructure
}

;(Template as any).getControlAttributes = (attributes: any) => {
  const out: any = {}; for (const key in attributes) {
    if (SELECTOR_ATTRIBUTES[key])
      continue; if (TEMPLATE_METADATA_ATTRIBUTES[key])
      continue; out[key] = attributes[key]
  } return out
}

;(Template as any).hoistNodeAttributes = (manaNode: any, haikuId: string, timelineObj: any, timelineName: string, timelineTime: number, mergeStrategy: string) => {
  const controlAttributes = (Template as any).getControlAttributes(manaNode.attributes)
  if (manaNode.children && manaNode.children.length === 1 && typeof manaNode.children[0] === 'string') { controlAttributes.content = manaNode.children[0]; manaNode.children = [] }
  const defaultAttributes: any = {}
  if (Object.keys(defaultAttributes).length > 0 || Object.keys(controlAttributes).length > 0) {
    const haikuIdSelector = (Template as any).buildHaikuIdSelector(haikuId)
    if (!timelineObj[haikuIdSelector])
      timelineObj[haikuIdSelector] = {}
    const timelineGroup = timelineObj[haikuIdSelector]
    (Template as any,
    ).insertAttributesIntoTimelineGroup(timelineGroup, timelineTime, defaultAttributes, mergeStrategy)
    (Template as any).insertAttributesIntoTimelineGroup(timelineGroup, timelineTime, controlAttributes, mergeStrategy)
  }
  for (const attrKey in manaNode.attributes) { if (attrKey in controlAttributes) { delete manaNode.attributes[attrKey] } }
}

;(Template as any).createHaikuId = (node: any, fqa: string, source: string, context: string) => {
  const base = `${context}|${source}|${fqa}`
  const sha = CryptoUtils.sha256(base)!.slice(0, 16)
  const label = Element.getFriendlyLabel(node)
  if (label)
    return `${label} ${sha}`.replace(/\s+/g, '-')
  return sha
}

;(Template as any).buildHaikuIdSelector = (haikuId: string) => `${HAIKU_SELECTOR_PREFIX}:${haikuId}`
;(Template as any).isHaikuIdSelector = (selector: string) => selector && selector.slice(0, 5) === HAIKU_SELECTOR_PREFIX && selector[5] === ':'
;(Template as any).haikuSelectorToHaikuId = (selector: string) => selector.split(':')[1]
;(Template as any).getHash = (str: string, len = 6) => CryptoUtils.sha256(str)!.slice(0, len)

;(Template as any).getAllElementsByHaikuId = (mana: any) => {
  const elements: any = {}; visitManaTree(ROOT_LOCATOR, mana, (elementName: any, attributes: any, children: any, node: any) => {
    if (attributes && attributes[HAIKU_ID_ATTRIBUTE])
      elements[attributes[HAIKU_ID_ATTRIBUTE]] = node
  }); return elements
}

;(Template as any).fixManaSourceAttribute = (mana: any, relpath: string) => {
  if (!mana.attributes[HAIKU_SOURCE_ATTRIBUTE])
    mana.attributes[HAIKU_SOURCE_ATTRIBUTE] = path.posix.normalize(relpath)
}

;(Template as any).fixTreeIdReferences = (mana: any, references: Record<string, string>) => {
  if (Object.keys(references).length < 1)
    return mana; visitManaTree(ROOT_LOCATOR, mana, (elementName: any, attributes: any) => {
    if (!attributes)
      return; for (const id in references) {
      const fixed = references[id]; if (attributes.id === id)
        attributes.id = fixed
    }
  }); return mana
}

;(Template as any).fixFragmentIdentifierReferenceValue = (key: string, value: any, randomizer: string) => {
  if (typeof value !== 'string')
    return undefined
  const trimmed = value.trim()
  if (trimmed.length < 1)
    return undefined
  const urlId = extractReferenceIdFromUrlReference(trimmed)
  if (urlId && urlId.length > 0)
    return { originalId: urlId, updatedId: `${urlId}-${randomizer}`, updatedValue: `url(#${urlId}-${randomizer})` }
  if (key === 'xlink:href' || key === 'href') { if (trimmed[0] === '#') { const xlinkId = trimmed.slice(1); return { originalId: xlinkId, updatedId: `${xlinkId}-${randomizer}`, updatedValue: `#${xlinkId}-${randomizer}` } } }
  return undefined
}

;(Template as any).fixKeyframeValue = (elementNode: any, propertyName: string, keyframeValue: any) => {
  const elementName = elementNode && elementNode.elementName; if (elementName === 'path' && propertyName === 'd')
    return SVGPoints.pathToPoints(keyframeValue); if ((elementName === 'polygon' || elementName === 'polyline') && propertyName === 'points')
    return SVGPoints.polyPointsStringToPoints(keyframeValue); return keyframeValue
}

;(Template as any).fixFragmentIdentifierReferences = (mana: any, randomizer: string) => {
  const references: Record<string, string> = {}; visitManaTree(ROOT_LOCATOR, mana, (elementName: any, attributes: any) => {
    if (!attributes)
      return; for (const key in attributes) {
      const value = attributes[key]; const fix = (Template as any).fixFragmentIdentifierReferenceValue(key, value, randomizer); if (fix === undefined)
        continue; references[fix.originalId] = fix.updatedId; attributes[key] = fix.updatedValue
    }
  }); (Template as any).fixTreeIdReferences(mana, references); return mana
}

;(Template as any).visitTemplate = (template: any, parent: any, iteratee: (template: any, parent: any) => void) => {
  if (template) {
    iteratee(template, parent); if (template.children) {
      for (let i = 0; i < template.children.length; i++) {
        const child = template.children[i]; if (!child || typeof child === 'string')
          continue; (Template as any).visitTemplate(child, template, iteratee)
      }
    }
  }
}
;(Template as any).visitManaTreeSpecial = (address: string, hash: string, mana: any, iteratee: (node: any, address: string) => void) => {
  address += `:[${hash}]${Element.safeElementName(mana)}(${(mana.attributes && mana.attributes.id) ? `#${mana.attributes.id}` : ''})`; iteratee(mana, address); if (!mana.children || mana.children.length < 1)
    return; for (let i = 0; i < mana.children.length; i++) {
    const child = mana.children[i]; if (child && typeof child === 'object')
      (Template as any).visitManaTreeSpecial(address, `${hash}-${i}`, child, iteratee)
  }
}
;(Template as any).visit = (node: any, visitor: (node: any, parent: any, index: number, depth: number, address: string) => void, index = 0, depth = 0, address = '0') => {
  if (node) {
    visitor(node, null, index, depth, address); if (!node.children)
      return; for (let i = 0; i < node.children.length; i++) {
      const child = node.children[i]; if (typeof child === 'string')
        continue; (Template as any).visit(child, visitor, i, depth + 1, `${address}.${i}`)
    }
  }
}
;(Template as any).inspectNodeName = (node: any) => {
  let name; if (!node)
    name = 'void'; else if (!node.elementName)
    name = 'none'; else if (typeof node.elementName === 'string')
    name = node.elementName; else if (node.elementName.__reference)
    name = `ref(${node.elementName.__reference})`; else name = 'unknown'; return name
}
;(Template as any).inspectAttribute = (val: any) => {
  try { return JSON.stringify(val) }
  catch { return '!err!' }
}
;(Template as any).inspectNodeAttributes = (node: any) => {
  let attrs = ''; if (!node) {
    attrs = 'void'
  }
  else if (!node.attributes) {
    attrs = 'none'
  }
  else if (typeof node.attributes === 'object') { for (const key in node.attributes) { attrs += `${key}=${(Template as any).inspectAttribute(node.attributes[key])} ` } }
  else {
    attrs = 'unknown'
  } return attrs
}
;(Template as any).inspect = (mana: any) => { let out = ''; (Template as any).visit(mana, (node: any, parent: any, index: number, depth: number, address: string) => { const name = (Template as any).inspectNodeName(node); const attrs = (Template as any).inspectNodeAttributes(node); out += `${address} <${name} ${attrs}>\n` }); return out }
;(Template as any).visitWithoutDescendingIntoSubcomponents = (node: any, visitor: (node: any, parent: any, index: number, depth: number, address: string) => void, index = 0, depth = 0, address = '0') => {
  if (node) {
    visitor(node, null, index, depth, address); if (typeof node.elementName === 'string') {
      if (node.children) {
        for (let i = 0; i < node.children.length; i++) {
          const child = node.children[i]; if (typeof child === 'string')
            continue; (Template as any).visitWithoutDescendingIntoSubcomponents(child, visitor, i, depth + 1, `${address}.${i}`)
        }
      }
    }
  }
}
;(Template as any).visitNodes = (node: any, parent: any, index: number, visitor: (node: any, parent: any, index: number) => void) => {
  if (node) {
    visitor(node, parent, index); if (!node.children)
      return; for (let i = 0; i < node.children.length; i++) {
      const child = node.children[i]; if (typeof child === 'string')
        continue; (Template as any).visitNodes(child, node, i, visitor)
    }
  }
}
;(Template as any).ensureTopLevelDisplayAttributes = (mana: any) => { merge(mana.attributes, { style: { position: 'absolute', margin: '0', padding: '0', border: '0' } }); if (Element.safeElementName(mana) === 'svg') { merge(mana.attributes, { 'version': '1.1', 'xmlns': 'http://www.w3.org/2000/svg', 'xmlns:xlink': 'http://www.w3.org/1999/xlink' }) } }
;(Template as any).ensureTitleAndUidifyTree = (source: string, context: string, mana: any, options?: { title?: string, forceAssignId?: boolean, idRandomizer?: string }) => {
  if (!options)
    options = {}
  if (!mana.attributes)
    mana.attributes = {}
  if (options.title)
    mana.attributes[HAIKU_TITLE_ATTRIBUTE] = options.title
  if (!mana.attributes[HAIKU_TITLE_ATTRIBUTE]) {
    let title
    if (mana.attributes[HAIKU_SOURCE_ATTRIBUTE])
      title = path.basename(mana.attributes[HAIKU_SOURCE_ATTRIBUTE], path.extname(mana.attributes[HAIKU_SOURCE_ATTRIBUTE]))
    if (!title && mana.children) {
      const el = find(mana.children, { elementName: 'title' }); if (el && el.children && typeof el.children[0] === 'string')
        title = el.children[0]
    }
    if (!title && source && source.length > 1) { title = path.basename(source, path.extname(source)); title = title.replace('Bytecode', '') }
    if (!title)
      title = pascalcase(Element.safeElementName(mana) || 'node')
    mana.attributes[HAIKU_TITLE_ATTRIBUTE] = title
  }
  (Template as any).visitManaTreeSpecial('*', context, mana, (node: any, fqa: string) => {
    if (typeof node !== 'object')
      return
    if (!node.attributes)
      node.attributes = {}
    if (!node.attributes[HAIKU_ID_ATTRIBUTE] || options!.forceAssignId) { const haikuId = (Template as any).createHaikuId(node, fqa, source, context); node.attributes[HAIKU_ID_ATTRIBUTE] = haikuId }
    if (node.attributes.id && options!.idRandomizer)
      node.attributes.id += (`-${options!.idRandomizer}`)
  })
}
;(Template as any).ensureRootDisplayAttributes = (mana: any) => { merge(mana.attributes, { style: { position: 'relative', width: '550px', height: '400px', margin: '0', padding: '0', border: '0' } }); if (Element.safeElementName(mana) === 'svg') { merge(mana.attributes, { 'version': '1.1', 'xmlns': 'http://www.w3.org/2000/svg', 'xmlns:xlink': 'http://www.w3.org/1999/xlink' }) } }
;(Template as any).cleanTemplate = (mana: any) => {}
;(Template as any).areTemplatesEquivalent = (t1: any, t2: any) => {
  if (!t1 && !t2)
    return true; if (t1 && !t2)
    return false; if (!t1 && t2)
    return false; if (t1.elementName !== t2.elementName)
    return false; if (!t1.children && !t2.children)
    return true; if (t1.children && !t2.children)
    return false; if (!t1.children && t2.children)
    return false; if (t1.children.length !== t2.children.length)
    return false; for (let i = 0; i < t1.children.length; i++) {
    const c1 = t1.children[i]; const c2 = t2.children[i]; if (!(Template as any).areTemplatesEquivalent(c1, c2))
      return false
  } return true
}
;(Template as any).allSourceNodes = (rootLocator: string, mana: any, iteratee: (node: any, src: string, parent: any, index: number) => void) => {
  visitManaTree(rootLocator, mana, (elementName: any, attributes: any, children: any, node: any, locator: any, parent: any, index: number) => {
    if (attributes && attributes[HAIKU_SOURCE_ATTRIBUTE])
      iteratee(node, attributes[HAIKU_SOURCE_ATTRIBUTE], parent, index)
  })
}
;(Template as any).visitManaTree = (mana: any, iteratee: (...args: any[]) => void) => visitManaTree(ROOT_LOCATOR, mana, iteratee)
;(Template as any).reuseHotMana = (mana: any) => { const clone = (Template as any).clone({}, mana, (copy: any, original: any) => { if (original.layout && original.layout.computed && original.layout.computed.matrix) { copy.attributes.transform = `matrix3d(${original.layout.computed.matrix.join(',')})` } }); return clone }
;(Template as any).clone = (out: any, mana: any, worker?: (copy: any, original: any) => void) => {
  if (!mana || typeof mana !== 'object')
    return mana; out.elementName = mana.elementName; if (mana.attributes) {
    out.attributes = {}; for (const key in mana.attributes) {
      const prop = mana.attributes[key]; if (prop && typeof prop === 'object') { out.attributes[key] = {}; for (const subkey in prop) { out.attributes[key][subkey] = prop[subkey] } }
      else { out.attributes[key] = prop }
    }
  } if (worker)
    worker(out, mana); if (mana.children) { out.children = []; for (let i = 0; i < mana.children.length; i++) { out.children[i] = (Template as any).clone({}, mana.children[i], worker) } } return out
}
;(Template as any).insertAttributesIntoTimelineGroup = (timelineGroup: any, timelineTime: number, givenAttributes: any, mergeStrategy: string) => {
  for (const attributeName in givenAttributes) {
    const attributeValue = givenAttributes[attributeName]; if (attributeValue && typeof attributeValue === 'object') { for (const subKey in attributeValue) { const subVal = attributeValue[subKey]; const fullName = attributeName + GROUP_DELIMITER + subKey; (Template as any).mergeOne(timelineGroup, fullName, subVal, timelineTime, mergeStrategy) } }
    else { (Template as any).mergeOne(timelineGroup, attributeName, attributeValue, timelineTime, mergeStrategy) }
  }
}
function isObject(value: any) { return value !== null && typeof value === 'object' && !Array.isArray(value) }
;(Template as any).mergeOne = (timelineGroup: any, nameOrig: string, attributeValue: any, timelineTime: number, mergeStrategy: string) => { const nameFinal = (ATTRS_HYPH_TO_CAMEL as any)[nameOrig] || nameOrig; if (!timelineGroup[nameFinal]) { timelineGroup[nameFinal] = timelineGroup[nameOrig] || {}; if (nameOrig !== nameFinal) { delete timelineGroup[nameOrig] } } if (!timelineGroup[nameFinal][timelineTime]) { timelineGroup[nameFinal][timelineTime] = {} } (Template as any).mergeAppliedValue(nameFinal, timelineGroup[nameFinal][timelineTime], attributeValue, mergeStrategy) }
;(Template as any).mergeAppliedValue = (name: string, valueDescriptor: any, incomingValue: any, mergeStrategy: string) => {
  if (isObject(valueDescriptor.value) && isObject(incomingValue) && !isSerializedFunction(valueDescriptor.value) && !isSerializedFunction(incomingValue)) { switch (mergeStrategy) { case MERGE_STRATEGIES.assign: assign(valueDescriptor.value, incomingValue); break; case MERGE_STRATEGIES.defaults: defaults(valueDescriptor.value, incomingValue); break; default: throw new Error('Merge strategy provided is missing or invalid') } }
  else { switch (mergeStrategy) { case MERGE_STRATEGIES.assign: valueDescriptor.value = incomingValue; break; case MERGE_STRATEGIES.defaults: if (valueDescriptor.value === undefined) { valueDescriptor.value = incomingValue } break; default: throw new Error('Merge strategy provided is missing or invalid') } }
}
;(Template as any).manaToJson = (mana: any, replacer?: any, spacing?: number) => { const out = (Template as any).cleanMana(mana); return JSON.stringify(out, replacer || null, spacing || 2) }
;(Template as any).cleanMana = (mana: any, { resetIds = false, suppressSubcomponents = true }: { resetIds?: boolean, suppressSubcomponents?: boolean } = {}) => {
  const out: any = {}; if (!mana)
    return null; if (typeof mana === 'string')
    return mana; if (mana.elementName && typeof mana.elementName === 'object' && mana.elementName !== null) {
    if (suppressSubcomponents) { out.elementName = 'div' }
    else { out.elementName = Bytecode.decycle(mana.elementName, { cleanManaOptions: { resetIds, suppressSubcomponents }, doCleanMana: true }) }
  }
  else { out.elementName = mana.elementName } out.attributes = mana.attributes; if (resetIds) { delete out.attributes[HAIKU_ID_ATTRIBUTE] } out.children = mana.children && mana.children.map((childMana: any) => (Template as any).cleanMana(childMana, { resetIds, suppressSubcomponents })); return out
}
;(Template as any).manaToHtml = (out: any, object: any, mapping: any, options: any) => manaToXml(out, object, mapping, options)
;(Template as any).getStackingInfo = (bytecode: any, staticTemplateManaNode: any, timelineName: string, timelineTime: number) => {
  return staticTemplateManaNode.children.filter((child: any) => child && typeof child !== 'string').map((child: any, index: number) => { const haikuId = child.attributes[HAIKU_ID_ATTRIBUTE]; const zIndex = Number.parseInt((Template as any).getPropertyValue(bytecode, haikuId, timelineName, timelineTime, 'style.zIndex'), 10) || undefined; return { haikuId, zIndex, index } }).sort((a: any, b: any) => {
    if (a.zIndex !== undefined && b.zIndex !== undefined)
      return a.zIndex - b.zIndex; if ((a.zIndex === undefined) ^ (b.zIndex === undefined))
      return (a.zIndex === undefined) ? 1 : -1; return a.index - b.index
  }).reduce((accumulator: any[], { zIndex, haikuId }: any, currentIndex: number) => { if (currentIndex === 0) { return [{ zIndex: Math.max(zIndex || 1, 1), haikuId }] } const nextZ = accumulator[accumulator.length - 1].zIndex + 1; accumulator.push({ zIndex: (zIndex === undefined) ? nextZ : Math.max(zIndex, nextZ), haikuId }); return accumulator }, [])
}
;(Template as any).getPropertyValue = (bytecode: any, componentId: string, timelineName: string, timelineTime: number, propertyName: string) => {
  if (!bytecode)
    return; if (!bytecode.timelines)
    return; if (!bytecode.timelines[timelineName])
    return; if (!bytecode.timelines[timelineName][`haiku:${componentId}`])
    return; if (!bytecode.timelines[timelineName][`haiku:${componentId}`][propertyName])
    return; if (!bytecode.timelines[timelineName][`haiku:${componentId}`][propertyName][timelineTime])
    return; return bytecode.timelines[timelineName][`haiku:${componentId}`][propertyName][timelineTime].value
}

export default Template
export { Template }
