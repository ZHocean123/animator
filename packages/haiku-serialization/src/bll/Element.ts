/* eslint-disable node/prefer-global/process */
import { LAYOUT_3D_SCHEMA } from '@haiku/core/lib/HaikuComponent'
import HaikuElement from '@haiku/core/lib/HaikuElement'
import { cssQueryTree } from '@haiku/core/lib/HaikuNode'
import Layout3D from '@haiku/core/lib/Layout3D'
import functionToRFO from '@haiku/core/lib/reflection/functionToRFO'
import KnownDOMEvents from '@haiku/core/lib/renderers/dom/Events'
import decamelize from 'decamelize'
import * as Matrix from 'gl-matrix'
import { composedTransformsToTimelineProperties, Experiment, experimentIsEnabled } from 'haiku-common'
import lodash from 'lodash'
import polygonOverlap from 'polygon-overlap'
import titlecase from 'titlecase'
import logger from './../utils/LoggerInstance'
import BaseModel from './BaseModel'
import Bytecode from './Bytecode'
import ElementSelectionProxy from './ElementSelectionProxy'
import MathUtils from './MathUtils'
import Property from './Property'
import Row from './Row'
import Template from './Template'
import TimelineProperty from './TimelineProperty'
import TransformCache from './TransformCache'

const DEFABLE_TAG_NAMES: Record<string, boolean> = { hatch: true, linearGradient: true, meshGradient: true, pattern: true, radialGradient: true, solidcolor: true, filter: true }
const SVG_ONLY_ATTRIBUTES: Record<string, boolean> = { baseProfile: true, contentScriptType: true, contentStyleType: true, height: true, preserveAspectRatio: true, version: true, viewBox: true, xmlns: true, width: true }
const HAIKU_ID_ATTRIBUTE = 'haiku-id'
const HAIKU_TITLE_ATTRIBUTE = 'haiku-title'
const HAIKU_LOCKED_ATTRIBUTE = 'haiku-locked'
const HAIKU_SOURCE_ATTRIBUTE = 'haiku-source'
const SYNC_LOCKED_ID_SUFFIX = '#lock'
const TIMELINE_EVENT_PREFIX = 'timeline:'

const EMPTY_ELEMENT = { elementName: 'div', attributes: {}, children: [] as any[] }

function isNumeric(n: any) {
  return !Number.isNaN(Number.parseFloat(n)) && Number.isFinite(n)
}

function getAncestry(ancestors: any[], elementInstance: any) {
  ancestors.unshift(elementInstance)
  if (elementInstance.parent)
    getAncestry(ancestors, elementInstance.parent)
  return ancestors
}

const cleanHaikuId = (str: string) => titlecase(decamelize(String(str).trim()).replace(/[\W_]/g, ' '))

class Element extends (BaseModel as any) {
  _isHovered: boolean
  _isSelected: boolean
  _clusterAndPropertyRows: any[]
  _headingRow: any
  _visibleProperties: Record<string, boolean> = {}
  transformCache: TransformCache

  constructor(props: any, opts: any) {
    super(props, opts)
    this._isHovered = false
    this._isSelected = false
    this._clusterAndPropertyRows = []
    this._headingRow = null
    this.transformCache = new TransformCache(this)
  }

  $el() {
    const staticTemplateNode = this.getStaticTemplateNode()
    if (typeof staticTemplateNode === 'string')
      return null
    const haikuId = staticTemplateNode.attributes && staticTemplateNode.attributes[HAIKU_ID_ATTRIBUTE]
    return (Element as any).findDomNode(haikuId, this.component.getMount().$el())
  }

  afterInitialize() {
    if (!this._visibleProperties)
      this._visibleProperties = {}
  }

  oneListener($el: any, uid: string, type: string, fn: any) {
    if (!(Element as any).cache.eventListeners[uid])
      (Element as any).cache.eventListeners[uid] = {}
    if ((Element as any).cache.eventListeners[uid][type]) {
      $el.removeEventListener(type, (Element as any).cache.eventListeners[uid][type]); delete (Element as any).cache.eventListeners[uid][type]
    }
    (Element as any).cache.eventListeners[uid][type] = fn
    $el.addEventListener(type, fn)
    return fn
  }

  hoverOn(metadata: any, softly = false) {
    if (!this._isHovered) {
      this.cache.clear()
      this._isHovered = true
      if (!softly)
        this.emit('update', 'element-hovered', metadata)
    }
    return this
  }

  hoverOnSoftly(metadata: any) { return this.hoverOn(metadata, true) }
  hoverOff(metadata: any, softly = false) {
    if (this._isHovered) {
      this.cache.clear()
      this._isHovered = false
      if (!softly)
        this.emit('update', 'element-unhovered', metadata)
    }
  }

  hoverOffSoftly(metadata: any) { return this.hoverOff(metadata, true) }
  isHovered() { return this._isHovered }
  isShimElement() { return this.parent && this.parent.getSource() === '<group>' }

  select(metadata: any, softly = false) {
    if (this.isLocked())
      return
    if (!this._isSelected) {
      this._isSelected = true
      if (softly) {
        this.emit('update', 'element-selected-softly', metadata)
      }
      else {
        const row = this.getHeadingRow()
        if (row)
          row.expandAndSelect(metadata)
        this.emit('update', 'element-selected', metadata)
      }
    }
  }

  selectSoftly(metadata: any) { return this.select(metadata, true) }
  unselect(metadata: any, softly = false) {
    if (this._isSelected) {
      this._isSelected = false
      if (softly) {
        this.emit('update', 'element-unselected-softly', metadata)
      }
      else {
        const row = this.getHeadingRow()
        if (row && row.isSelected())
          row.deselect(metadata)
        this.emit('update', 'element-unselected', metadata)
      }
      ;(ElementSelectionProxy as any).purge?.()
    }
  }

  unselectSoftly(metadata: any) { return this.unselect(metadata, true) }

  getHeadingRow() { return this._headingRow }
  getPropertyRowByPropertyName(propertyName: string) {
    for (let i = 0; i < this._clusterAndPropertyRows.length; i++) {
      const candidateRow = this._clusterAndPropertyRows[i]
      if (candidateRow.isPropertyOfName(propertyName))
        return candidateRow
    }
  }

  isSelected() { return this._isSelected }
  isLocked() { return !!this.getStaticTemplateNode().attributes[HAIKU_LOCKED_ATTRIBUTE] }
  isLockedViaParents() {
    let p: any = this
    while (p) {
      if (p.isLocked())
        return true
      p = p.parent
    }
    return false
  }

  toggleLocked(metadata: any, cb: any) {
    this.component.setLockedStatusForComponent(this.getComponentId(), !this.getStaticTemplateNode().attributes[HAIKU_LOCKED_ATTRIBUTE], metadata, cb)
    this.emit('update', 'element-locked-toggle')
  }

  getStaticTemplateNode() { return this.component.locateTemplateNodeByComponentId(this.componentId) }
  getCoreHostComponentInstance() { return this.component.$instance }
  copy() { return this.clip() }
  clip() { return this.buildClipboardPayload() }

  getVisibleEvents() { return Object.keys(this.getReifiedEventHandlers()).filter(handler => !(this as any).isTimelineEvent(handler)) }
  getTimelineEvents() { return Object.keys(this.getReifiedEventHandlers()).filter(handler => (this as any).isTimelineEvent(handler)) }
  isTimelineEvent(eventName: string) { return eventName.includes(TIMELINE_EVENT_PREFIX) }
  hasEventHandlers() { return !lodash.isEmpty(this.getReifiedEventHandlers()) }
  hasVisibleEventHandlers() { return !lodash.isEmpty(this.getVisibleEvents()) }
  getReifiedEventHandlers() {
    const bytecode = this.component.getReifiedBytecode()
    const selector = `haiku:${this.getComponentId()}`
    if (!bytecode.eventHandlers)
      bytecode.eventHandlers = {}
    return bytecode.eventHandlers[selector] || {}
  }

  getReifiedEventHandler(eventName: string) { return this.getReifiedEventHandlers()[eventName] }
  getEventHandlerSaveStatus(eventName: string) {
    if (!this._eventHandlerSaves)
      this._eventHandlerSaves = {}
    return this._eventHandlerSaves[eventName]
  }

  setEventHandlerSaveStatus(eventName: string, statusValue: any) {
    if (!this._eventHandlerSaves)
      this._eventHandlerSaves = {}
    this._eventHandlerSaves[eventName] = statusValue
    this.emit('update', 'element-event-handler-save-status-update')
    return this
  }

  getApplicableEventHandlerOptionsList() {
    const options: any[] = []
    const predefined: Record<string, boolean> = {}
    ;(Element as any).HIGHER_ORDER_EVENTS.forEach((spec: any) => {
      predefined[spec.value] = true
    })
    options.push({ label: 'Favorites', options: (Element as any).HIGHER_ORDER_EVENTS })
    const handlers = this.getReifiedEventHandlers()
    for (const category in (KnownDOMEvents as any)) {
      const suboptions: any[] = []
      options.push({ label: category, options: suboptions })
      for (const name in (KnownDOMEvents as any)[category]) {
        const candidate = (KnownDOMEvents as any)[category][name]
        predefined[name] = true
        if (candidate.menuable || (handlers as any)[name])
          suboptions.push({ label: candidate.human || name, value: name })
      }
    }
    ;(Element as any).COMPONENT_EVENTS.forEach((spec: any) => {
      predefined[spec.value] = true
    })
    options.push({ label: 'Component/Lifecycle', options: (Element as any).COMPONENT_EVENTS })
    const customEvents: any[] = []
    for (const name in handlers) {
      if (!(this as any).isTimelineEvent(name) && !predefined[name])
        customEvents.push({ label: name, value: name })
    }
    options.push({ label: 'Custom Events', options: customEvents })
    return options
  }

  buildClipboardPayload() {
    const originalNode = this.getStaticTemplateNode()
    const clonedNode = lodash.cloneDeep((Template as any).manaWithOnlyStandardProps(originalNode, true))
    const clonedBytecode = lodash.cloneDeepWith(this.component.fetchActiveBytecodeFile().getReifiedDecycledBytecode(), (value: any) => {
      if (typeof value === 'function' && (value as any).injectee)
        return functionToRFO(value)
    })
    const eventHandlers = (Bytecode as any).getAppliedEventHandlersForNode({}, clonedBytecode, clonedNode)
    Object.keys(eventHandlers).forEach((element) => {
      Object.keys(eventHandlers[element]).forEach((event) => {
        eventHandlers[element][event].handler = functionToRFO(eventHandlers[element][event].handler)
      })
    })
    return { kind: 'bytecode', data: { eventHandlers, timelines: (Bytecode as any).getAppliedTimelinesForNode({}, clonedBytecode, clonedNode), template: clonedNode } }
  }

  getQualifiedBytecode() {
    const bytecode = (Bytecode as any).clone(this.component.getReifiedBytecode())
    const template = (Template as any).clone({}, (Template as any).manaWithOnlyStandardProps(this.getStaticTemplateNode(), false))
    const states = (Bytecode as any).getAppliedStatesForNode({}, bytecode, template)
    const helpers = (Bytecode as any).getAppliedHelpersForNode({}, bytecode, template)
    const timelines = (Bytecode as any).getAppliedTimelinesForNode({}, bytecode, template)
    const eventHandlers = (Bytecode as any).getAppliedEventHandlersForNode({}, bytecode, template)
    return { helpers, states, timelines, eventHandlers, template }
  }

  isSyncLocked() {
    const node = this.getStaticTemplateNode()
    if (node && node.attributes && node.attributes[HAIKU_SOURCE_ATTRIBUTE])
      return node.attributes[HAIKU_SOURCE_ATTRIBUTE].endsWith(SYNC_LOCKED_ID_SUFFIX)
    return false
  }

  getStackingInfo() {
    if (!this.parent)
      return
    if (!this.parent.getStaticTemplateNode())
      return
    return (Template as any).getStackingInfo(this.component.getReifiedBytecode(), this.parent.getStaticTemplateNode(), this.component.getInstantiationTimelineName(), this.component.getInstantiationTimelineTime())
  }

  isAtFront() {
    const stackingInfo = this.getStackingInfo()
    if (!stackingInfo)
      return true
    const myIndex = lodash.findIndex(stackingInfo, { haikuId: this.getComponentId() }); return myIndex === stackingInfo.length - 1
  }

  isAtBack() {
    const stackingInfo = this.getStackingInfo()
    if (!stackingInfo)
      return true
    const myIndex = lodash.findIndex(stackingInfo, { haikuId: this.getComponentId() }); return myIndex === 0
  }

  sendToBack() {
    this.component.zMoveToBack(this.getComponentId(), this.component.getCurrentTimelineName(), 0, this.component.project.getMetadata(), (err: any) => {
      if (err)
        return void (0)
    })
    this.emit('update', 'element-send-to-back')
  }

  bringToFront() {
    this.component.zMoveToFront(this.getComponentId(), this.component.getCurrentTimelineName(), 0, this.component.project.getMetadata(), (err: any) => {
      if (err)
        return void (0)
    })
    this.emit('update', 'element-bring-to-front')
  }

  bringForward() {
    this.component.zMoveForward(this.getComponentId(), this.component.getCurrentTimelineName(), 0, this.component.project.getMetadata(), (err: any) => {
      if (err)
        return void (0)
    })
    this.emit('update', 'element-bring-forward')
  }

  sendBackward() {
    this.component.zMoveBackward(this.getComponentId(), this.component.getCurrentTimelineName(), 0, this.component.project.getMetadata(), (err: any) => {
      if (err)
        return void (0)
    })
    this.emit('update', 'element-send-backward')
  }

  getBoundingClientRect(marginX?: number, marginY?: number) {
    const points = this.getBoxPointsTransformed()
    if (marginX !== undefined && marginY !== undefined) {
      const mat = Matrix.mat2d.create()
      const margin = Matrix.vec2.create()
      Matrix.vec2.set(margin, -marginX, -marginY)
      Matrix.mat2d.translate(mat, mat, margin)
      for (let i = 0; i < points.length; i++) {
        const pointInput = Matrix.vec2.create()
        const pointOutput = Matrix.vec2.create()
        Matrix.vec2.set(pointInput, points[i].x, points[i].y)
        Matrix.vec2.transformMat2d(pointOutput, pointInput, mat)
        points[i] = { x: (pointOutput as any)[0], y: (pointOutput as any)[1] }
      }
    }
    const top = Math.min(points[0].y, points[2].y, points[6].y, points[8].y)
    const bottom = Math.max(points[0].y, points[2].y, points[6].y, points[8].y)
    const left = Math.min(points[0].x, points[2].x, points[6].x, points[8].x)
    const right = Math.max(points[0].x, points[2].x, points[6].x, points[8].x)
    const height = Math.abs(bottom - top)
    const width = Math.abs(right - left)
    return { top, right, bottom, left, width, height }
  }

  isAutoSizeX() {
    const layout = this.getLayoutSpec()
    return typeof layout.sizeAbsolute.x !== 'number'
  }

  isAutoSizeY() {
    const layout = this.getLayoutSpec()
    return typeof layout.sizeAbsolute.y !== 'number'
  }

  getComputedSize() {
    if (this.isTextNode())
      return this.parent.getComputedSize()
    return this.getHaikuElement().size
  }

  getComputedLayout() {
    const targetNode = this.getLiveRenderedNode() || {}
    const parentNode = (this.parent && this.parent.getLiveRenderedNode()) || {}
    return HaikuElement.computeLayout(
      { layout: this.getLayoutSpec(), elementName: (targetNode as any).elementName, attributes: (targetNode as any).attributes, children: ((targetNode as any).__memory && (targetNode as any).__memory.children) || (targetNode as any).children, __memory: (targetNode as any).__memory },
      { layout: {
        computed: { matrix: Layout3D.createMatrix(), bounds: (this.parent && this.parent.getHaikuElement().computeContentBounds()) || {}, size: (this.parent && this.parent.getComputedSize()) || this.getComputedSize() },
      }, elementName: (parentNode as any).elementName, attributes: (parentNode as any).attributes, children: (parentNode as any).children, __memory: (parentNode as any).__memory },
    )
  }

  getLayoutSpec() {
    const bytecode = this.component.getReifiedBytecode()
    const hostInstance = this.component.$instance
    if (!hostInstance)
      return Layout3D.createLayoutSpec()
    const componentId = this.getComponentId()
    const elementName = (Element as any).safeElementName(this.getStaticTemplateNode())
    const elementNode = hostInstance.findElementsByHaikuId(componentId)[0]
    const timelineName = this.component.getCurrentTimelineName()
    const timelineTime = this.component.getCurrentTimelineTime()
    const propertiesBase = (TimelineProperty as any).getPropertiesBase(bytecode.timelines, timelineName, componentId) || {}
    const grabValue = (outputName: string) => {
      const { computedValue } = hostInstance.grabValue(timelineName, componentId, elementNode, outputName, (propertiesBase as any)[outputName], timelineTime, !hostInstance.shouldPerformFullFlush(), true)
      if (computedValue === undefined || computedValue === null)
        return (TimelineProperty as any).getFallbackValue(elementName, outputName)
      return computedValue
    }
    return {
      shown: grabValue('shown'),
      opacity: grabValue('opacity'),
      offset: { x: grabValue('offset.x'), y: grabValue('offset.y'), z: grabValue('offset.z') },
      origin: { x: grabValue('origin.x'), y: grabValue('origin.y'), z: grabValue('origin.z') },
      translation: { x: grabValue('translation.x'), y: grabValue('translation.y'), z: grabValue('translation.z') },
      rotation: { x: grabValue('rotation.x'), y: grabValue('rotation.y'), z: grabValue('rotation.z') },
      scale: { x: grabValue('scale.x'), y: grabValue('scale.y'), z: grabValue('scale.z') },
      shear: { xy: grabValue('shear.xy'), xz: grabValue('shear.xz'), yz: grabValue('shear.yz') },
      sizeMode: { x: grabValue('sizeMode.x'), y: grabValue('sizeMode.y'), z: grabValue('sizeMode.z') },
      sizeProportional: { x: grabValue('sizeProportional.x'), y: grabValue('sizeProportional.y'), z: grabValue('sizeProportional.z') },
      sizeDifferential: { x: grabValue('sizeDifferential.x'), y: grabValue('sizeDifferential.y'), z: grabValue('sizeDifferential.z') },
      sizeAbsolute: { x: grabValue('sizeAbsolute.x'), y: grabValue('sizeAbsolute.y'), z: grabValue('sizeAbsolute.z') },
    }
  }

  getBoundingBoxPoints() {
    const layout = this.getComputedLayout()
    const w = (layout as any).size.x
    const h = (layout as any).size.y
    return [
      { x: 0, y: 0, z: 0 },
      { x: w / 2, y: 0, z: 0 },
      { x: w, y: 0, z: 0 },
      { x: 0, y: h / 2, z: 0 },
      { x: w / 2, y: h / 2, z: 0 },
      { x: w, y: h / 2, z: 0 },
      { x: 0, y: h, z: 0 },
      { x: w / 2, y: h, z: 0 },
      { x: w, y: h, z: 0 },
    ]
  }

  getBoxPointsTransformed() { return HaikuElement.transformPointsInPlace(this.getBoundingBoxPoints(), this.getOriginOffsetComposedMatrix()) }
  getOriginNotTransformed() { return this.cache.fetch('getOriginNotTransformed', () => { const layout = this.getComputedLayout(); return { x: (layout as any).size.x * (layout as any).origin.x, y: (layout as any).size.y * (layout as any).origin.y, z: (layout as any).size.z * (layout as any).origin.z } }) }
  getOriginTransformed() { return this.cache.fetch('getOriginTransformed', () => { return HaikuElement.transformPointInPlace(this.getOriginNotTransformed(), this.getOriginOffsetComposedMatrix()) }) }
  getOriginOffsetComposedMatrix() { return this.cache.fetch('getOriginOffsetComposedMatrix', () => { return Layout3D.multiplyArrayOfMatrices(this.getComputedLayoutAncestry().reverse().map(layout => (layout as any).matrix)) }) }
  getAncestry() {
    const ancestors: any[] = []
    getAncestry(ancestors, this)
    return ancestors
  }

  getComputedLayoutAncestry() { return this.getAncestry().map((ancestor: any) => ancestor.getComputedLayout()) }
  getPropertyKeyframesObject(propertyName: string) { const bytecode = this.component.getReifiedBytecode(); return (TimelineProperty as any).getPropertySegmentsBase(bytecode.timelines, this.component.getCurrentTimelineName(), this.getComponentId(), propertyName) }
  computePropertyValue(propertyName: string, fallbackValue?: any) {
    const bytecode = this.component.getReifiedBytecode()
    const host = this.component.$instance
    const states = (host && host.getStates()) || {}
    const computed = (TimelineProperty as any).getComputedValue(this.getComponentId(), (Element as any).safeElementName(this.getStaticTemplateNode()), propertyName, this.component.getCurrentTimelineName(), this.component.getCurrentTimelineTime(), fallbackValue, bytecode, host, states)
    return computed
  }

  computePropertyGroupValueFromGroupDelta(propertyGroupDelta: Record<string, any>) {
    const propertyGroupValue: Record<string, any> = {}
    for (const propertyName in propertyGroupDelta) {
      const existingPropertyValue = this.computePropertyValue(propertyName, 0)
      const deltaPropertyValue = propertyGroupDelta[propertyName].value
      if (isNumeric(existingPropertyValue) && isNumeric(deltaPropertyValue))
        propertyGroupValue[propertyName] = { value: MathUtils.rounded((existingPropertyValue as any) + (deltaPropertyValue as any)) }
      else propertyGroupValue[propertyName] = { value: existingPropertyValue }
    }
    return propertyGroupValue
  }

  remove() {
    this.destroy()
    const row = this.getHeadingRow()
    if (row)
      row.delete()
    this.emit('update', 'element-removed')
  }

  isRepeater() {
    const rkfs = this.getRepeaterKeyframes()
    return !!(rkfs && Object.keys(rkfs).length > 0)
  }

  getRepeaterKeyframes() { return this.getPropertyKeyframesObject('controlFlow.repeat') }
  isTextNode() { return typeof this.getStaticTemplateNode() === 'string' }
  isComponent() { return !!this.getHostedComponentBytecode() }
  isNonRenderedComponent() {
    const bytecode = this.getHostedComponentBytecode()
    if (!bytecode)
      return false
    if (!bytecode.metadata)
      return false
    return !!bytecode.metadata.nonrendered
  }

  isExternalComponent() {
    if (!this.isComponent())
      return false
    return !this.isLocalComponent()
  }

  isLocalComponent() {
    if (!this.isComponent())
      return false
    const sourceAttr = this.getSource()
    return sourceAttr && (sourceAttr as any)[0] === '.'
  }

  getSource() {
    const node = this.getStaticTemplateNode()
    return node && node.attributes && node.attributes[HAIKU_SOURCE_ATTRIBUTE]
  }

  getHostedComponentBytecode() {
    if (this.isTextNode())
      return null
    const node = this.getStaticTemplateNode()
    if (!node)
      return null
    const elementName = (node as any).elementName
    if (!elementName)
      return null
    if (typeof elementName !== 'object')
      return null
    return elementName
  }

  getTitle() {
    if (this.isTextNode())
      return '<text>'
    return this.getStaticTemplateNode().attributes[HAIKU_TITLE_ATTRIBUTE] || `<${this.getNameString()}>`
  }

  setTitle(newTitle: string, metadata: any, cb: any) { this.component.setTitleForComponent(this.getComponentId(), newTitle, metadata, cb) }
  getNameString() {
    if (this.isTextNode())
      return '<text>'
    if (this.isComponent())
      return 'div'
    const node = this.getStaticTemplateNode()
    if (node)
      return (node as any).elementName
    return 'div'
  }

  getSafeDomFriendlyName() { const elementName = (this.isComponent()) ? 'div' : this.getNameString(); return elementName }
  getComponentId() { return (this as any).componentId }
  getGraphAddress() { return (this as any).address }
  updateTargetingRows(updateEventName: string) { this.getAllRows().forEach((row: any) => { row.emit('update', updateEventName) }) }
  getAllRows() { return (Row as any).where({ component: this.component, element: this }) }
  get isVisuallySelectable() { return this.parent && this.parent.isRootElement() }
  get topmostHeadingRow() {
    const headingRow = this.getHeadingRow()
    if (!this.parent)
      return headingRow
    if (headingRow) {
      headingRow.parent.silentlyExpandAllGParents()
      return headingRow
    }
    return this.parent.topmostHeadingRow
  }

  shouldBeDisplayed() { return (!this.isTextNode() && !this.isShimElement() && this._clusterAndPropertyRows.length) }
  getHostedPropertyRows(doRecurse = false) {
    const rows: any[] = []
    const headingRow = this.getHeadingRow()
    if (headingRow) {
      rows.push(headingRow)
      if (headingRow.children) {
        headingRow.children.forEach((childRow: any) => {
          if (childRow.isCluster() || childRow.isProperty()) {
            rows.push(childRow)
            if (childRow.children)
              childRow.children.forEach((grandchildRow: any) => { rows.push(grandchildRow) })
          }
        })
      }
    }
    if (doRecurse && experimentIsEnabled(Experiment.ShowSubElementsInJitMenu)) {
      const deeprows: any[] = []
      this.visitDescendants((descendantElement: any) => {
        if (!descendantElement.shouldBeDisplayed())
          return
        const currentHeadingRow = descendantElement.topmostHeadingRow || headingRow
        const subrows = descendantElement.getHostedPropertyRows(false).filter((row: any) => row.shouldBeDisplayed(currentHeadingRow))
        deeprows.push.apply(deeprows, subrows)
      })
      rows.push.apply(rows, deeprows)
    }
    return rows
  }

  clearEntityCaches() {
    if (this.children)
      this.children.forEach((element: any) => { element.cache.clear(); element.clearEntityCaches() })
    this.getAllRows().forEach((row: any) => {
      row.cache.clear()
      row.clearEntityCaches()
    })
  }

  getFirstNotShimParent(current: any = this) {
    if (!current.parent || !current.parent.isShimElement())
      return current.parent
    return current.getFirstNotShimParent(current.parent)
  }

  rehydrateRows(options: any = {}) {
    if (options.superficial || process.env.HAIKU_SUBPROCESS !== 'timeline')
      return
    const existingRows = this.getAllRows()
    existingRows.forEach((row: any) => row.mark())
    const element = this as any
    const component = this.component
    const timeline = this.component.getCurrentTimeline()
    const parent = this.getFirstNotShimParent()
    const parentElementHeadingRow = parent && parent.getHeadingRow()
    const currentElementHeadingRow = (Row as any).upsert({ uid: (Row as any).buildHeadingUid(component, element), parent: parentElementHeadingRow, element, component, timeline, children: [], property: null, cluster: null }, {})
    if (parentElementHeadingRow)
      parentElementHeadingRow.insertChild(currentElementHeadingRow)
    this._headingRow = currentElementHeadingRow
    this._clusterAndPropertyRows = []
    const clusters: Record<string, boolean> = {}
    ;(this as any).hasAddressableProperties = false
    this.eachAddressableProperty((propertyGroupDescriptor: any, addressableName: string) => {
      ;(this as any).hasAddressableProperties = true
      if (propertyGroupDescriptor.cluster) {
        const clusterId = (Row as any).buildClusterUid(this, element, propertyGroupDescriptor)
        let clusterRow: any
        if (clusters[clusterId]) {
          clusterRow = (Row as any).findById(clusterId)
        }
        else {
          clusterRow = (Row as any).upsert({ uid: clusterId, element, component, timeline, parent: currentElementHeadingRow, children: [], property: null, cluster: propertyGroupDescriptor.cluster }, {})
          this._clusterAndPropertyRows.push(clusterRow)
          currentElementHeadingRow.insertChild(clusterRow)
          clusters[clusterId] = true
        }
        const clusterMember = (Row as any).upsert({ uid: (Row as any).buildClusterMemberUid(this, element, propertyGroupDescriptor, addressableName), element, component, timeline, parent: clusterRow, children: [], property: propertyGroupDescriptor, cluster: propertyGroupDescriptor.cluster }, {})
        this._clusterAndPropertyRows.push(clusterMember)
        clusterMember.rehydrate()
        clusterRow.insertChild(clusterMember)
      }
      else {
        const propertyRow = (Row as any).upsert({ uid: (Row as any).buildPropertyUid(this, element, addressableName), element, component, timeline, parent: currentElementHeadingRow, children: [], property: propertyGroupDescriptor, cluster: null }, {})
        this._clusterAndPropertyRows.push(propertyRow)
        propertyRow.rehydrate()
        currentElementHeadingRow.insertChild(propertyRow)
      }
    })
    existingRows.forEach((row: any) => row.sweep())
  }

  visitAll(iteratee: any) { (Element as any).visitAll(this, iteratee) }
  visitDescendants(iteratee: any) { (Element as any).visitDescendants(this, iteratee) }
  getAllChildren() { return this.children || [] }
  rehydrateChildren({ maxRehydrationDepth }: { maxRehydrationDepth: number }) {
    const node: any = this.getStaticTemplateNode()
    if (typeof node.elementName === 'object')
      return
    if (node && node.children) {
      for (let i = 0; i < node.children.length; i++) {
        const child = node.children[i]
        const element = (Element as any).upsertElementFromVirtualElement(this.component, child, this, i, `${this.getGraphAddress()}.${i}`)
        if ((child as any).__replacee) {
          const replaceeHaikuId = (child as any).__replacee.attributes && (child as any).__replacee.attributes[HAIKU_ID_ATTRIBUTE]
          if (replaceeHaikuId) {
            const replaceeElement = (Element as any).findByComponentAndHaikuId(this.component, replaceeHaikuId)
            if (replaceeElement)
              element._visibleProperties = replaceeElement._visibleProperties
          }
          delete (child as any).__replacee
        }
        element.rehydrate({ maxRehydrationDepth })
      }
    }
  }

  rehydrate({ maxRehydrationDepth }: { maxRehydrationDepth: number }) {
    if (this.getDepthAmongElements() <= maxRehydrationDepth || (experimentIsEnabled(Experiment.ShowSubElementsInJitMenu) && this.hasInternalPropertiesDefinedCached()))
      this.rehydrateChildren({ maxRehydrationDepth })
  }

  hasInternalPropertiesDefined() {
    const selectors: Record<string, any> = {}
    const node = this.getStaticTemplateNode()
    (Template as any).visitWithoutDescendingIntoSubcomponents(node, (subnode: any) => {
      if (node === subnode)
        return
      const selector = (TimelineProperty as any).getSelectorForComponentId(subnode.attributes[HAIKU_ID_ATTRIBUTE])
      selectors[selector] = subnode
    })
    if (Object.keys(selectors).length < 1)
      return false
    const bytecode = this.component.getReifiedBytecode()
    if (!bytecode || !bytecode.timelines)
      return false
    for (const timelineName in bytecode.timelines) {
      for (const selector in bytecode.timelines[timelineName]) {
        const subnode = (selectors as any)[selector]
        if (!subnode)
          continue
        for (const propertyName in bytecode.timelines[timelineName][selector]) {
          const keyframesObject = bytecode.timelines[timelineName][selector][propertyName]
          if ((Property as any).areAnyKeyframesDefined(subnode.elementName, propertyName, keyframesObject))
            return true
        }
      }
    }
    return false
  }

  hasInternalPropertiesDefinedCached() { return this.cache.fetch('hasInternalPropertiesDefinedCached', () => this.hasInternalPropertiesDefined()) }
  getDepthAmongElements() {
    let depth = 0
    let parent = this.parent
    while (parent) {
      depth += 1
      parent = parent.parent
    }
    return depth
  }

  getBuiltinAddressables() { const builtinAddressables: Record<string, any> = {}; (Property as any).assignDOMSchemaProperties(builtinAddressables, this); return builtinAddressables }
  getComponentAddressables() {
    const componentAddressables: Record<string, any> = {}
    if (this.isComponent()) {
      const node = this.getLiveRenderedNode() as any
      if (node && node.elementName && node.elementName.states) {
        for (const name in node.elementName.states) {
          const state = node.elementName.states[name]
          componentAddressables[name] = { name, type: 'state', prefix: name, suffix: undefined, fallback: state.value, typedef: state.type, mock: state.mock }
        }
      }
    }
    return componentAddressables
  }

  getCompleteAddressableProperties() {
    const builtinAddressables = this.getBuiltinAddressables()
    const componentAddressables = this.getComponentAddressables()
    const returnedAddressables: Record<string, any> = {}
    for (const key1 in builtinAddressables) returnedAddressables[key1] = builtinAddressables[key1]
    for (const key2 in componentAddressables) returnedAddressables[key2] = componentAddressables[key2]
    return returnedAddressables
  }

  getJITPropertyOptions() {
    if (this.isNonRenderedComponent())
      return []
    const exclusions = this.getExcludedAddressableProperties()
    if (this.getDepthAmongElements() > 1) {
      const complete = this.getCompleteAddressableProperties()
      for (const key in complete) {
        if (!this._visibleProperties[key])
          (exclusions as any)[key] = complete[key]
      }
    }
    const grouped: Record<string, any> = {}
    for (const propertyName in exclusions) {
      const propertyObj = (exclusions as any)[propertyName]
      if (!(Property as any).includeInJIT(propertyName, this, propertyObj, null))
        continue
      const prefix = propertyObj.prefix
      const suffix = propertyObj.suffix
      if (!grouped[prefix])
        grouped[prefix] = { element: this, prefix, suffix, label: (Property as any).humanizePropertyNamePart(prefix) }
      if (suffix) {
        if (!grouped[prefix].options)
          grouped[prefix].options = []
        grouped[prefix].options.push({ element: this, prefix, suffix, label: (Property as any).humanizePropertyNamePart(suffix), value: propertyObj.name })
      }
      else {
        grouped[prefix].value = propertyObj.name
      }
    }
    if (experimentIsEnabled(Experiment.ShowSubElementsInJitMenu)) {
      if (!this.isRootElement() && !this.isComponent()) {
        if (this.children && this.children.length > 0) {
          this.children.forEach((child: any) => {
            const name = child.getSafeDomFriendlyName()
            if (!(Property as any).BUILTIN_DOM_SCHEMAS[name] || child.isTextNode())
              return false
            const insert = this.grabNextUsefulMenuInsert(child)
            if (insert) {
              const { key, label, options, element } = insert
              grouped[key] = { type: 'element', element, prefix: `zzzzz_element_${label}`, label: `‹› ${label}`, options }
            }
          })
        }
      }
    }
    const list = this.groupedOptionsObjectToList(grouped)
    return list
  }

  grabNextUsefulMenuInsert(child: any) {
    if (child.isTextNode())
      return null
    const options = child.getJITPropertyOptions()
    if (options.length === 1 && options[0].type === 'element')
      return this.grabNextUsefulMenuInsert(options[0].element)
    const key = child.getPrimaryKey()
    const label = child.getFriendlyLabel()
    return { key, label, options, element: child }
  }

  eachAddressableProperty(iteratee: any) {
    const addressableProperties = this.getDisplayedAddressableProperties()
    for (const propertyName in addressableProperties) {
      if ((addressableProperties as any)[propertyName])
        iteratee((addressableProperties as any)[propertyName], propertyName)
    }
  }

  groupedOptionsObjectToList(grouped: Record<string, any>) {
    const options = Object.values(grouped).sort((a: any, b: any) => {
      const ap = a.prefix.toLowerCase()
      const bp = b.prefix.toLowerCase()
      if (ap < bp)
        return -1
      if (ap > bp)
        return 1
      return 0
    })
    return options as any[]
  }

  getFriendlyLabel() {
    const node = this.getStaticTemplateNode()
    return (Element as any).getFriendlyLabel(node)
  }

  getJITPropertyOptionsAsMenuItems() { const options = this.getJITPropertyOptions(); return this.optionsToItems(options) }
  optionsToItems(options: any[]) {
    return options.map((option: any) => {
      const item: any = { label: option.label }
      if (option.options) {
        item.submenu = this.optionsToItems(option.options)
      }
      else {
        item.onClick = () => {
          option.element.showAddressableProperty(option.value)
        }
      }
      return item
    })
  }

  getExcludedAddressableProperties() { return this.getCollatedAddressableProperties().excluded }
  getDisplayedAddressableProperties() { return this.getCollatedAddressableProperties().filtered }
  getExplicitlyVisibleAddressableProperties() {
    const complete = this.getCompleteAddressableProperties()
    const filtered: Record<string, any> = {}
    for (const propertyName in complete) {
      if (this._visibleProperties[propertyName])
        filtered[propertyName] = complete[propertyName]
    }
    return filtered
  }

  getCollatedAddressableProperties() {
    const complete = this.getCompleteAddressableProperties()
    const filtered: Record<string, any> = {}
    const excluded: Record<string, any> = {}
    for (const propertyName in complete) {
      const propertyObject = complete[propertyName]
      ;(Property as any).buildFilterObject(filtered, this, propertyName, propertyObject)
      if (!filtered[propertyName])
        excluded[propertyName] = propertyObject
    }
    return { filtered, excluded }
  }

  showAddressableProperty(propertyName: string) {
    this._visibleProperties[propertyName] = true
    this.rehydrateRows()
    const row = this.getPropertyRowByPropertyName(propertyName)
    if (row) {
      if (row.isWithinCollapsedRow())
        row.parent.expand(this.component.project.getMetadata())
      row.select(this.component.project.getMetadata())
    }
    this.emit('update', 'jit-property-added')
  }

  hideAddressableProperty(propertyName: string) { this._visibleProperties[propertyName] = false; this.emit('update', 'jit-property-removed') }
  isRootElement() { return !this.parent }
  getBoxPolygonPointsTransformed() { const points = this.getBoxPointsTransformed(); return (Element as any).pointsToPolygonPoints(points) }
  doesOverlapWithBox(box: { x: number, y: number, width: number, height: number }) { const theirPoints = (Element as any).boxToCornersAsPolygonPoints(box); const ourPoints = this.getBoxPolygonPointsTransformed(); return (polygonOverlap as any)(theirPoints, ourPoints) }

  getLiveRenderedNode() { const instance = this.getCoreHostComponentInstance(); return instance ? instance.findElementsByHaikuId(this.getComponentId())[0] : null }
  getHaikuElement() { return HaikuElement.findOrCreateByNode(this.getLiveRenderedNode()) }
  getParentSvgElement() {
    let currElem: any = this
    while (currElem) {
      if (currElem.getNameString() === 'svg')
        return currElem
      currElem = currElem.parent
    }
    return null
  }

  getUngroupables() {
    const haikuElement = this.getHaikuElement()
    switch ((haikuElement as any).tagName) {
      case 'svg':
      case 'div':
        const ungroupables: any[] = []
        this.getHaikuElement().visit((descendantHaikuElement: any) => {
          const eligibleChildren = descendantHaikuElement.children.filter((element: any) => element.tagName !== 'defs' && element.target && ((haikuElement as any).tagName === 'div' || typeof element.target.getBBox === 'function'))
          if (eligibleChildren.length > 1) {
            ungroupables.push(...eligibleChildren)
            return false
          }
        }, (node: any) => node.tagName !== 'defs')
        return ungroupables
      default:
        return []
    }
  }

  doesContainUngroupableContent() { return this.getUngroupables().length > 1 }
  ungroup(metadata: any, cb: any = () => {}) {
    const nodes: any[] = []
    this.ungroupWrapper(nodes)
    switch (this.getStaticTemplateNode().elementName) {
      case 'svg': this.ungroupSvg(nodes)
        break
      case 'div': this.ungroupDiv(nodes)
        break
      default: logger.warn(`[element] ignoring nonsense request to ungroup ${this.getStaticTemplateNode().elementName}`)
    }
    return this.component.ungroupElements(this.getComponentId(), nodes, metadata, cb)
  }

  ungroupWrapper(nodes: any[]) {
    const haikuElement: any = this.getHaikuElement()
    const baseStyles = haikuElement.attributes.style
    if (!baseStyles)
      return
    const style: any = {}
    Object.keys(baseStyles).forEach((styleName) => {
      switch (styleName) {
        case 'background':
        case 'backgroundColor':
          style[styleName] = baseStyles[styleName]
      }
    })
    if (Object.keys(style).length === 0)
      return
    const attributes: any = Object.assign({ width: haikuElement.layout.size.x, height: haikuElement.layout.size.y, [HAIKU_SOURCE_ATTRIBUTE]: haikuElement.attributes[HAIKU_SOURCE_ATTRIBUTE] }, { style })
    const layoutMatrix = this.getOriginOffsetComposedMatrix() as any
    const originX = haikuElement.layout.size.x / 2
    const originY = haikuElement.layout.size.y / 2
    layoutMatrix[12] += originX * layoutMatrix[0] + originY * layoutMatrix[4]
    layoutMatrix[13] += originX * layoutMatrix[1] + originY * layoutMatrix[5]
    ;(composedTransformsToTimelineProperties as any)(attributes, [layoutMatrix])
    nodes.push((Template as any).cleanMana({ elementName: 'svg', attributes, children: [{ elementName: 'rect', attributes: { width: haikuElement.layout.size.x, height: haikuElement.layout.size.y, fill: 'none', stroke: 'none' } }] }, { resetIds: true }))
  }

  ungroupDiv(nodes: any[]) {
    this.getUngroupables().forEach((haikuElement: any) => {
      const layoutMatrix = Layout3D.multiplyArrayOfMatrices(haikuElement.layoutAncestryMatrices.reverse().filter((m: any) => !!m))
      const layout = haikuElement.layout
      const attributes: any = { 'width': layout.size.x, 'height': layout.size.y, [HAIKU_TITLE_ATTRIBUTE]: haikuElement.attributes[HAIKU_TITLE_ATTRIBUTE], [HAIKU_SOURCE_ATTRIBUTE]: haikuElement.attributes[HAIKU_SOURCE_ATTRIBUTE], 'origin.x': layout.origin.x, 'origin.y': layout.origin.y, 'haiku-transclude': haikuElement.getComponentId() }
      ;(composedTransformsToTimelineProperties as any)(attributes, [layoutMatrix])
      if (!attributes['translation.x'])
        attributes['translation.x'] = 0
      if (!attributes['translation.y'])
        attributes['translation.y'] = 0
      const originX = layout.size.x * layout.origin.x
      const originY = layout.size.y * layout.origin.y
      if (haikuElement.tagName === 'svg') {
        attributes.style = { overflow: 'visible' }
        if (haikuElement.layout.opacity !== 1)
          attributes.opacity = haikuElement.layout.opacity
      }
      attributes['translation.x'] += originX * layoutMatrix[0] + originY * layoutMatrix[4]
      attributes['translation.y'] += originX * layoutMatrix[1] + originY * layoutMatrix[5]
      nodes.push({ elementName: typeof haikuElement.type !== 'string' ? '__component__' : haikuElement.tagName, attributes, children: [] })
    })
  }

  ungroupSvg(nodes: any[]) {
    const defs: any[] = []
    const extraNodes: any[] = []
    const svgElement: any = this.getHaikuElement()
    const ungroupables = this.getUngroupables()
    const bytecode = this.component.getReifiedBytecode()
    svgElement.visit((descendantHaikuElement: any) => {
      if (descendantHaikuElement.tagName === 'style' && descendantHaikuElement.memory && descendantHaikuElement.memory.children) {
        const styleNode = (Template as any).cleanMana(lodash.cloneDeep(descendantHaikuElement.node), { resetIds: true })
        styleNode.children = [descendantHaikuElement.memory.children[0]]
        extraNodes.push(styleNode)
      }
      else if (((descendantHaikuElement.parent && descendantHaikuElement.parent.tagName === 'defs') || (DEFABLE_TAG_NAMES as any)[descendantHaikuElement.tagName])) {
        defs.push(descendantHaikuElement.node)
      }
    })
    ungroupables.forEach((descendantHaikuElement: any) => {
      const mergedAttributes: Record<string, string> = {}
      let parent = descendantHaikuElement.parent
      while (parent && (parent.node.elementName === 'g' || parent.node.elementName === 'svg')) {
        for (const propertyName in bytecode.timelines[this.component.getCurrentTimelineName()][`haiku:${parent.componentId}`]) {
          if (!propertyName.startsWith('style') && !(SVG_ONLY_ATTRIBUTES as any)[propertyName] && !mergedAttributes.hasOwnProperty(propertyName))
            mergedAttributes[propertyName] = parent.componentId
        }
        parent = parent.parent
      }
      const attributes = Object.keys(mergedAttributes).reduce((accumulator: any, propertyName) => {
        if (!Object.prototype.hasOwnProperty.call((LAYOUT_3D_SCHEMA as any), propertyName) || propertyName === 'opacity') {
          accumulator[propertyName] = this.component.getComputedPropertyValue(descendantHaikuElement.node, mergedAttributes[propertyName], this.component.getCurrentTimelineName(), this.component.getCurrentTimelineTime(), propertyName, undefined)
        }
        return accumulator
      }, {})
      if (typeof descendantHaikuElement.opacity === 'number' && descendantHaikuElement.opacity !== 1)
        attributes.opacity = descendantHaikuElement.opacity
      const boundingBox = descendantHaikuElement.target.getBBox()
      if (boundingBox.width < 1)
        boundingBox.width = Math.max(descendantHaikuElement.attributes['stroke-width'] || attributes['stroke-width'] || 1, 1)
      if (boundingBox.height < 1)
        boundingBox.height = Math.max(descendantHaikuElement.attributes['stroke-width'] || attributes['stroke-width'] || 1, 1)
      const originX = boundingBox.width / 2
      const originY = boundingBox.height / 2
      const layoutMatrix = descendantHaikuElement.layoutMatrix
      layoutMatrix[12] += (boundingBox.x + originX) * layoutMatrix[0] + (boundingBox.y + originY) * layoutMatrix[4]
      layoutMatrix[13] += (boundingBox.x + originX) * layoutMatrix[1] + (boundingBox.y + originY) * layoutMatrix[5]
      const layoutAncestryMatrices = descendantHaikuElement.layoutAncestryMatrices
      if (layoutAncestryMatrices[layoutAncestryMatrices.length - 1] !== layoutMatrix)
        layoutAncestryMatrices.push(layoutMatrix)
      descendantHaikuElement.visit((subHaikuElement: any) => {
        delete subHaikuElement.node.layout
      })
      const parentAttributes: any = { width: boundingBox.width, height: boundingBox.height, style: { overflow: 'visible' }, [HAIKU_SOURCE_ATTRIBUTE]: `${svgElement.attributes[HAIKU_SOURCE_ATTRIBUTE]}#${descendantHaikuElement.id}`, [HAIKU_TITLE_ATTRIBUTE]: descendantHaikuElement[HAIKU_TITLE_ATTRIBUTE] || descendantHaikuElement.title || descendantHaikuElement.id }
      ;(composedTransformsToTimelineProperties as any)(parentAttributes, layoutAncestryMatrices)
      if (descendantHaikuElement.layout) {
        if (descendantHaikuElement.layout.sizeAbsolute.x > 0)
          descendantHaikuElement.attributes.width = descendantHaikuElement.layout.sizeAbsolute.x
        if (descendantHaikuElement.layout.sizeAbsolute.y)
          descendantHaikuElement.attributes.height = descendantHaikuElement.layout.sizeAbsolute.y
      }
      const node = (Template as any).cleanMana({ elementName: 'svg', attributes: parentAttributes, children: [{ elementName: 'g', attributes: Object.assign(attributes, { transform: `translate(${-MathUtils.rounded(boundingBox.x)} ${-MathUtils.rounded(boundingBox.y)})` }), children: [Object.assign({}, descendantHaikuElement.node, { attributes: Object.assign({ 'haiku-transclude': descendantHaikuElement.getComponentId() }, descendantHaikuElement.attributes), children: [] })] }] }, { resetIds: true })
      if (defs.length > 0) {
        (node as any).children.unshift((Template as any).cleanMana({ elementName: 'defs', attributes: {}, children: defs.map((Template as any).reuseHotMana) }, { resetIds: true }))
      }
      ;(node as any).children.unshift(...extraNodes.map((Template as any).reuseHotMana))
      nodes.push(node)
    })
  }

  getAttribute(key: string) {
    const node = this.getLiveRenderedNode() as any
    return node && node.attributes && node.attributes[key]
  }

  toXMLString() { return (Template as any).manaToHtml('', this.getLiveRenderedNode() || EMPTY_ELEMENT) }
  toJSONString() { return (Template as any).manaToJson(this.getLiveRenderedNode() || EMPTY_ELEMENT, null, 2) }
  dump() {
    let str = `${this.getNameString()}:${this.getTitle()}:${this.getComponentId()}`
    if (this.isHovered())
      str += ' {h}'
    if (this.isSelected())
      str += ' {s}'
    return str
  }

  static DEFAULT_OPTIONS = { required: { component: true, uid: true, address: true, componentId: true } }
}

;(BaseModel as any).extend(Element)
;(Element as any).directlySelected = null
;(Element as any).cache = { domNodes: {}, eventListeners: {} }
;(Element as any).HIGHER_ORDER_EVENTS = [{ label: 'Hover', value: 'hover' }, { label: 'Unhover', value: 'unhover' }]
;(Element as any).COMPONENT_EVENTS = [{ label: 'Will Mount', value: 'component:will-mount' }, { label: 'Did Mount', value: 'component:did-mount' }, { label: 'Will Unmount', value: 'component:will-unmount' }, { label: 'Did Initialize', value: 'component:did-initialize' }, { label: 'Frame', value: 'frame' }]
;(Element as any).nodeIsGrouper = (node: any) => (node.elementName === 'svg' || node.elementName === 'g' || node.elementName === 'div')
;(Element as any).unselectAllElements = (criteria: any, metadata: any) => { (Element as any).where(criteria).forEach((element: any) => element.unselect(metadata)); (Element as any).directlySelected = null }
;(Element as any).hoverOffAllElements = (criteria: any, metadata: any) => { (Element as any).where(criteria).forEach((element: any) => element.hoverOff(metadata)) }
;(Element as any).clearCaches = function clearCaches() {
  (Element as any).cache = { domNodes: {}, eventListeners: {} }
}
;(Element as any).findDomNode = function findDomNode(haikuId: string, element: any) {
  if (!element)
    return null
  if ((Element as any).cache.domNodes[haikuId])
    return (Element as any).cache.domNodes[haikuId]
  const selector = `[${HAIKU_ID_ATTRIBUTE}="${haikuId}"]`
  const found = element.querySelector(selector);
  (Element as any).cache.domNodes[haikuId] = found
  return found
}
;(Element as any).findRoots = (criteria: any) => {
  return (Element as any).where(criteria).filter((element: any) => {
    return !element.parent
  })
}
;(Element as any).visitAll = (element: any, visitor: any) => {
  visitor(element);
  (Element as any).visitDescendants(element, visitor)
}
;(Element as any).visitDescendants = (element: any, visitor: any) => {
  if (!element.children)
    return void (0)
  element.children.forEach((child: any) => {
    visitor(child);
    (Element as any).visitDescendants(child, visitor)
  })
}
;(Element as any).getRotationIn360 = (radians: number) => {
  if (radians < 0)
    radians += (Math.PI * 2)
  let rotationDegrees = ~~(radians * 180 / Math.PI)
  if (rotationDegrees > 360)
    rotationDegrees = rotationDegrees % 360
  return rotationDegrees
}
;(Element as any).boxToCornersAsPolygonPoints = ({ x, y, width, height }: { x: number, y: number, width: number, height: number }) => { return [[x, y], [x + width, y], [x + width, y + height], [x, y + height]] }
;(Element as any).pointsToPolygonPoints = (points: Array<{ x: number, y: number }>) => { return points.map(point => [point.x, point.y]) }
;(Element as any).distanceBetweenPoints = (p1: { x: number, y: number }, p2: { x: number, y: number }, zoomFactor?: number) => {
  let distance = Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2)
  if (zoomFactor)
    distance *= zoomFactor
  return distance
}
;(Element as any).buildPrimaryKeyFromComponentParentIdAndStaticTemplateNode = (component: any, parentId: string, indexInParent: number, staticTemplateNode: any) => {
  let uid: any
  if (typeof staticTemplateNode === 'string')
    uid = `${parentId}/text:${indexInParent}`
  else
    uid = (staticTemplateNode.attributes && staticTemplateNode.attributes[HAIKU_ID_ATTRIBUTE]) || Math.random(); uid = (Element as any).buildUidFromComponentAndHaikuId(component, uid); return uid
}
;(Element as any).buildUidFromComponentAndDomElement = (component: any, $el: any) => `${component.getPrimaryKey()}::${$el.getAttribute(HAIKU_ID_ATTRIBUTE)}`
;(Element as any).buildUidFromComponentAndHaikuId = (component: any, haikuId: string) => `${component.getPrimaryKey()}::${haikuId}`
;(Element as any).findByComponentAndHaikuId = (component: any, haikuId: string) => (Element as any).findById((Element as any).buildUidFromComponentAndHaikuId(component, haikuId))
;(Element as any).findHoveredElement = (component: any) => (Element as any).where({ component, _isHovered: true })[0]
;(Element as any).makeUid = (component: any, parent: any, index: number, staticTemplateNode: any) => {
  const parentHaikuId = (parent && parent.attributes && parent.attributes[HAIKU_ID_ATTRIBUTE])
  if (!parent) {
    parent = (parentHaikuId && (Element as any).findById((Element as any).buildUidFromComponentAndHaikuId(component, parentHaikuId)))
  }
  const uid = (Element as any).buildPrimaryKeyFromComponentParentIdAndStaticTemplateNode(component, parentHaikuId, index, staticTemplateNode)
  return uid
}
;(Element as any).getFriendlyLabel = (node: any) => {
  if (!node || typeof node !== 'object')
    return ''
  const id = node.attributes && node.attributes.id
  const title = node.attributes && node.attributes[HAIKU_TITLE_ATTRIBUTE]
  let name = (typeof node.elementName === 'string' && node.elementName) ? node.elementName : 'div'
  if ((Element as any).FRIENDLY_NAME_SUBSTITUTES[name])
    name = (Element as any).FRIENDLY_NAME_SUBSTITUTES[name]
  if (id && !title)
    return cleanHaikuId(id)
  let out = ''
  if (typeof id === 'string')
    out += `${id} `
  if (typeof title === 'string')
    out += `${title} `
  if (out.length === 0 && typeof name === 'string')
    out += `${name}`
  return cleanHaikuId(out)
}
;(Element as any).upsertElementFromVirtualElement = (component: any, staticTemplateNode: any, parent: any, index: number, address: string) => {
  if (!component.project)
    throw new Error('component argument must have a `project` defined')
  if (!component.project.getPlatform())
    throw new Error('component project must be able to return a platform object')
  if (!component.project.getMetadata())
    throw new Error('component proct must be able to return a metadata object')
  const uid = (Element as any).makeUid(component, parent, index, staticTemplateNode)
  const metadata = component.project.getMetadata()
  const componentId = (typeof staticTemplateNode === 'string') ? uid : staticTemplateNode.attributes[HAIKU_ID_ATTRIBUTE]
  const element = (Element as any).upsert({ uid, componentId, index, address, component, parent, children: [] }, metadata)
  if (parent)
    parent.insertChild(element)
  return element
}
;(Element as any).querySelectorAll = (selector: string, mana: any) => cssQueryTree(mana, selector, { name: 'elementName', attributes: 'attributes', children: 'children' })
;(Element as any).FRIENDLY_NAME_SUBSTITUTES = { g: 'group', tspan: 'Text Span' } as Record<string, string>
;(Element as any).safeElementName = (mana: any) => {
  if (!mana || typeof mana !== 'object')
    return 'div'
  if (mana.elementName && typeof mana.elementName === 'object')
    return 'div'
  return mana.elementName
}
;(Element as any).deselectAllOtherElements = (criteria: any, target: any, metadata: any) => {
  (Element as any).where(Object.assign({ _isSelected: true }, criteria)).forEach((element: any) => {
    if (element.getComponentId() !== target.getComponentId())
      element.unselect(metadata, true)
  })
}

export default Element
export { Element }
