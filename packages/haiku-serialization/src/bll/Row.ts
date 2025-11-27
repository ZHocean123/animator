import { TimelineProperty } from '../bll/TimelineProperty'
import BaseModel from './BaseModel'

// Avoid circular stubs
import Keyframe from './Keyframe'

import Timeline from './Timeline'

const NAVIGATION_DIRECTIONS = { SAME: 0, NEXT: +1, PREV: -1 }

export default class Row extends (BaseModel as any) {
  private _isSelected = false
  private _isFocused = false
  private _isExpanded = false
  private _isActive = false
  private _isHidden = false
  private _isHovered = false
  private _wasInitiallyExpanded = false
  cluster?: { prefix: string, name: string }
  property?: { name: string, type?: string }
  parent?: any
  children: any[]
  timeline: any
  element: any
  component: any
  position?: number
  _next?: any
  _prev?: any

  constructor(props: any, opts: any) { super(props, opts); this.children = [] }

  getUniqueKey() { return `${this.element.getComponentId()}+${this.element.getComponentId()}-${this.getType()}-${this.getClusterNameString()}-${this.getPropertyNameString()}` }
  deselectOthers(metadata: any, skipSelectElements = false) {
    (Row as any).where({ component: this.component }).forEach((row: any) => {
      if (row === this)
        return null; row.deselect(metadata, skipSelectElements)
    })
  }

  select(metadata: any) {
    if (!this._isSelected) {
      this.deselectOthers(metadata, true); this._isSelected = true; (this as any).emit('update', 'row-selected', metadata); if (this.isHeading() && this.element && !this.element.isSelected())
        this.element.select(metadata)
    } return this
  }

  deselect(metadata: any, skipSelectElements = false) {
    if (this._isSelected) {
      this._isSelected = false; (this as any).emit('update', 'row-deselected', metadata); if (!skipSelectElements && this.isHeading() && this.element && this.element.isSelected())
        this.element.unselect(metadata)
    } return this
  }

  isSelected() { return this._isSelected }
  activate() { if (!this._isActive) { this._isActive = true; (this as any).emit('update', 'row-activated') } return this }
  deactivate() { if (this._isActive) { this._isActive = false; (this as any).emit('update', 'row-deactivated') } return this }
  isActive() { return this._isActive }
  expand(metadata: any) {
    if (!this._isExpanded) { this._isExpanded = true; (this as any).emit('update', 'row-expanded', metadata) } if (this.parent)
      this.parent.expand(metadata); return this
  }

  collapse(metadata: any) { if (this._isExpanded) { this._isExpanded = false; (this as any).emit('update', 'row-collapsed', metadata) } return this }
  isCollapsed() {
    if (this.isProperty())
      return false; return !this._isExpanded
  }

  isExpanded() {
    if (this.isProperty())
      return true; return this._isExpanded
  }

  blurOthers(metadata: any) {
    (Row as any).where({ component: this.component }).forEach((row: any) => {
      if (row !== this)
        row.blur(metadata)
    })
  }

  focus(metadata: any) { if (!this._isFocused) { this.blurOthers(metadata); this._isFocused = true; (this as any).emit('update', 'row-focused', metadata) } return this }
  blur(metadata: any) { if (this._isFocused) { this._isFocused = false; (this as any).emit('update', 'row-blurred', metadata) } return this }
  isFocused() { return this._isFocused }
  hide() { if (!this._isHidden) { this._isHidden = true; (this as any).emit('update', 'row-hidden') } return this }
  show() { if (this._isHidden) { this._isHidden = false; (this as any).emit('update', 'row-shown') } return this }
  isHidden() { return this._isHidden }
  hover(metadata: any) { if (!this._isHovered) { this._isHovered = true; (this as any).emit('update', 'row-hovered') } return this }
  isHovered() { return this._isHovered }
  hoverAndUnhoverOthers(metadata: any) {
    (Row as any).where({ component: this.component }).forEach((row: any) => {
      if (row !== this)
        row.unhover(metadata)
    }); this.hover(metadata)
  }

  unhover(metadata: any) { if (this._isHovered) { this._isHovered = false; (this as any).emit('update', 'row-unhovered') } return this }
  expandAndSelect(metadata: any) {
    if (!this.isExpanded())
      this.expand(metadata); if (!this.isSelected())
      this.select(metadata); return this
  }

  collapseAndDeselect(metadata: any) {
    if (this.isExpanded())
      this.collapse(metadata); if (this.isSelected())
      this.deselect(metadata); return this
  }

  getBaselineValueAtMillisecond(ms: number) { const { baselineValue } = (Timeline as any).getPropertyValueDescriptor(this, { timelineTime: ms, timelineName: this.timeline.getName() }); return baselineValue }
  getBaselineCurveAtMillisecond(ms: number) { const { baselineCurve } = (Timeline as any).getPropertyValueDescriptor(this, { timelineTime: ms, timelineName: this.timeline.getName() }); return baselineCurve }
  delete() { this.children.forEach((child: any) => child.delete()); (this as any).destroy() }
  visit(visitor: (row: any) => void) { visitor(this); this.children.forEach((child: any) => child.visit(visitor)) }
  rehydrate() {
    this.rehydrateKeyframes(); (this as any).emit('update', 'row-rehydrated'); if (this.parent)
      this.parent.emit('update', 'child-row-rehydrated')
  }

  getKeyframesDescriptor() { return TimelineProperty.getValueGroup(this.element.getComponentId(), this.component.getCurrentTimelineName(), this.getPropertyNameString(), this.component.getReifiedBytecode()) }
  rehydrateKeyframes() {
    const valueGroup = this.getKeyframesDescriptor(); if (!valueGroup)
      return []; const keyframesList = Object.keys(valueGroup).map(keyframeKey => Number.parseInt(keyframeKey, 10)).sort((a, b) => a - b); if (keyframesList.length < 1)
      return []; this.getKeyframes().forEach((keyframe: any) => { keyframe.mark() }); for (let i = 0; i < keyframesList.length; i++) {
      const mscurr = keyframesList[i]; if (isNaN(mscurr))
        continue; if (!valueGroup[mscurr] || valueGroup[mscurr].value === undefined)
        continue; const value = valueGroup[mscurr].value; let curve = valueGroup[mscurr].curve; if (curve === undefined)
        curve = null; const uid = (Keyframe as any).getInferredUid(this, mscurr); (Keyframe as any).upsert({ uid, origMs: mscurr, ms: mscurr, index: i, value, curve, row: this, element: this.element, timeline: this.timeline, component: this.component }, {})
    } this.getKeyframes().forEach((keyframe: any) => { keyframe.sweep() }); const updatedKeyframes = this.getKeyframes(); updatedKeyframes.forEach((keyframe: any, idx: number) => { keyframe._prev = updatedKeyframes[idx - 1]; keyframe._next = updatedKeyframes[idx + 1] })
  }

  createKeyframe(value: any, ms: number, metadata: any) {
    if (this.isClusterHeading()) { this.children.forEach((child: any) => child.createKeyframe(value, ms, metadata)); return this.expandAndSelect(metadata) } let valueToAssign; if (value === undefined)
      valueToAssign = this.getBaselineValueAtMillisecond(ms); else valueToAssign = value; const curveToAssign = this.getBaselineCurveAtMillisecond(ms); const parentSVG = this.element.getParentSvgElement(); let options: any = {}; if (parentSVG && this.element !== parentSVG)
      options = { setElementLockStatus: { [parentSVG.getComponentId()]: true } }; this.component.createKeyframe(this.element.getComponentId(), this.timeline.getName(), this.element.getNameString(), this.getPropertyNameString(), ms, valueToAssign, curveToAssign, null, null, options, metadata, () => {}); (Timeline as any).clearCaches(); (this as any).emit('update', 'keyframe-create'); if (this.parent) {
      this.parent.emit('update', 'keyframe-create'); if (this.parent.parent)
        this.parent.parent.emit('update', 'keyframe-create')
    }
  }

  deleteKeyframe(keyframe: any, metadata: any) {
    keyframe.destroy(); this.component.deleteKeyframe(this.element.getComponentId(), this.timeline.getName(), this.getPropertyNameString(), keyframe.getMs(), metadata, () => {}); (Timeline as any).clearCaches(); (this as any).emit('update', 'keyframe-delete'); if (this.parent)
      this.parent.emit('update', 'keyframe-delete')
  }

  getDescriptor() { return (this as any).property }
  getKeyframes() { return (Keyframe as any).where({ row: this }).sort((a: any, b: any) => a.index - b.index) }
  getKeyframeByMs(ms: number) { return this.getKeyframes().filter((keyframe: any) => keyframe.getMs() === ms)[0] }
  mapVisibleKeyframes({ maxDepth = Infinity }: { maxDepth?: number }, iteratee: (kf: any) => any) {
    if (this.getDepthAmongRows() > (maxDepth as number))
      return []; if (this.isHeading() || this.isClusterHeading()) { return [...this.children.map(child => child.mapVisibleKeyframes({ maxDepth }, iteratee))] } return this.getKeyframes().map(iteratee)
  }

  isState() { return (this as any).property && (this as any).property.type === 'state' }
  isFirstRowOfPropertyCluster() { return (this as any).cluster && (this as any).property && this.getIndexWithinParentRow() === 0 }
  isClusterProperty() { return (this as any).cluster && !(this as any).property }
  isClusterHeading() { return (this as any).cluster && !(this as any).property }
  isCluster() { return !!(this as any).cluster }
  isProperty() { return !!(this as any).property }
  isPropertyOfName(propertyName: string) { return ((this as any).property && (this as any).property.name === propertyName) }
  isHeading() { return !(this as any).property && !(this as any).cluster }
  getType() {
    if (this.isClusterHeading())
      return 'cluster-heading'; if (this.isHeading())
      return 'element-heading'; if (this.isProperty())
      return 'property'; return 'unknown'
  }

  getAddress() {
    let id; if (this.isHeading())
      id = 'heading'; else if (this.isClusterHeading())
      id = 'cluster-heading'; else id = this.getPropertyNameString(); return `${this.element.getGraphAddress()}/${id}`
  }

  getClusterNameString() { return (this as any).cluster && (this as any).cluster.name }
  getPropertyNameString() { return (this as any).property && (this as any).property.name }
  getClusterValues() { return this.children.map((row: any) => row.getPropertyValueDescriptor()) }
  getPropertyValueDescriptor() { return (Timeline as any).getPropertyValueDescriptor(this, { numFormat: '0,0[.]000' }) }
  getPropertyId() { return `${this.element.getComponentId()}-${this.element.getNameString()}-${this.getPropertyNameString()}` }
  getInputPropertyId() { return `property-input-field-box-${this.getPropertyId()}` }
  getPropertyName() { return (this as any).property && (this as any).property.name }
  isClusterActivated(_item: any) { return false }
  isRootRow() { return !this.parent }
  isWithinCollapsedRow() { return this.parent && (this.parent.isCollapsed() || this.parent.isWithinCollapsedRow()) }
  representsStringNode() { return typeof this.element.getStaticTemplateNode() === 'string' }
  clearEntityCaches() {
    if (this.children)
      this.children.forEach((row: any) => { row.cache.clear(); row.clearEntityCaches() }); this.getKeyframes().forEach((keyframe: any) => { keyframe.cache.clear() })
  }

  getPosition() {
    if (typeof (this as any).position === 'number')
      return (this as any).position; return Number.MAX_SAFE_INTEGER
  }

  setPosition(position: number) { (this as any).position = position }
  getDepthAmongRows() {
    let depth = 0; let parent = this.parent; while (parent) {
      if (parent.element.hasAddressableProperties)
        depth += 1; parent = parent.parent
    } return depth
  }

  getDepthAmongElements() { return this.element.getDepthAmongElements() }
  getAllSiblings() { return (this.parent && this.parent.children) || [] }
  getIndexWithinParentRow() {
    const siblings = this.getAllSiblings(); for (let i = 0; i < siblings.length; i++) {
      if (siblings[i] === this)
        return i
    } return 0
  }

  next() { return this._next }
  prev() { return this._prev }
  shouldBeDisplayed(row: any) {
    if (this.isHeading())
      return true; if (this.isCluster())
      return true; if ((Property as any).includeInAddressables(this.getPropertyNameString(), this.element, (this as any).property, this.getKeyframesDescriptor())) { this.parent = row; return true } return false
  }

  silentlyExpandAllGParents() {
    if (this.isRootRow())
      return; if (this.element.getNameString() === 'g')
      this._isExpanded = true; if (this.parent)
      this.parent.silentlyExpandAllGParents()
  }

  dump() {
    let str = `${this.getType()}.${this.element.getComponentId()}<${this.element.getSafeDomFriendlyName()}>|${this.getDepthAmongRows()}.${this.getIndexWithinParentRow()}`; if (this.isCluster())
      str += `.${(this as any).cluster.prefix}[]`; if (this.isProperty())
      str += `.${this.getPropertyName()}`; return str
  }
}

;(Row as any).DEFAULT_OPTIONS = { required: { timeline: true, element: true, component: true } }
;(BaseModel as any).extend(Row)
;(Row as any).top = (criteria: any) => (Row as any).find(Object.assign({ parent: null }, criteria))
;(Row as any).findByComponentAndHaikuId = (component: any, haikuId: string) => (Row as any).where({ component }).filter((row: any) => row.element.getComponentId() === haikuId)[0]
;(Row as any).findPropertyRowsByComponentAndParentHaikuId = (component: any, haikuId: string) => (Row as any).where({ component }).filter((row: any) => row.isProperty() && row.parent && row.parent.element.getComponentId() === haikuId)
;(Row as any).cyclicalNav = (criteria: any, row: any, navDir: number) => {
  let target; if (navDir === undefined || navDir === null || navDir === NAVIGATION_DIRECTIONS.SAME)
    target = row; else if (row && navDir === NAVIGATION_DIRECTIONS.NEXT)
    target = row.next(); else if (row && navDir === NAVIGATION_DIRECTIONS.PREV)
    target = row.prev(); if (target && !target.isProperty()) {
    if (navDir !== undefined && navDir !== null && navDir !== NAVIGATION_DIRECTIONS.SAME)
      return (Row as any).cyclicalNav(criteria, target, navDir)
  } return target
}
;(Row as any).focusSelectNext = (criteria: any, navDir: number, doFocus: boolean, metadata: any) => {
  const selected = (Row as any).getSelectedRow(criteria); const focused = (Row as any).getFocusedRow(criteria); if (selected) { selected.blur(metadata); selected.deselect(metadata) } if (focused) { focused.blur(metadata); focused.deselect(metadata) } const previous = focused || selected; const target = (previous) ? (Row as any).cyclicalNav(criteria, previous, navDir) : (Row as any).cyclicalNav(criteria, (Row as any).findByGlobalPosition(criteria, 0), navDir); if (target) {
    target.expand(metadata); target.select(metadata); if (doFocus)
      target.focus(metadata)
  }
}
;(Row as any).getSelectedRow = (criteria: any) => (Row as any).where(criteria).filter((row: any) => row._isSelected)[0]
;(Row as any).getFocusedRow = (criteria: any) => (Row as any).where(criteria).filter((row: any) => row._isFocused)[0]
;(Row as any).rmap = function _rmap(criteria: any, iteratee: (row: any) => any) { return rmap([(Row as any).top(criteria)], iteratee) }
;(Row as any).rsmap = function _rsmap(criteria: any, iteratee: (row: any) => string, indentation?: string) { const tree = rsmap([(Row as any).top(criteria)], iteratee); return tlines([], '', indentation || '    ', tree).join('\n') }
function rmap(rows: any[], iteratee: (row: any) => any) {
  return rows.map((row: any) => {
    const out = iteratee(row); if (!out)
      throw new Error('rmap iteratee must return an object'); if (typeof out !== 'object')
      throw new TypeError('rmap iteratee must return an object'); out.children = rmap(row.children, iteratee); return out
  })
}
function rsmap(rows: any[], iteratee: (row: any) => string) {
  return rows.map((row: any) => {
    const out = iteratee(row); if (typeof out !== 'string')
      throw new TypeError('rmap iteratee must return a string'); return { text: out, children: rsmap(row.children, iteratee) }
  })
}
function tlines(lines: string[], indent: string, indentation: string, nodes: any[]) { nodes.forEach((node: any) => { lines.push(indent + node.text); tlines(lines, indent + indentation, indentation, node.children) }); return lines }
;(Row as any).dumpHierarchyInfo = (criteria: any) => (Row as any).rsmap(criteria, (row: any) => row.dump())
;(Row as any).buildPropertyUid = (component: any, targetElement: any, addressableName: string) => { const elementId = `${targetElement.getComponentId()}`; return `${component.getPrimaryKey()}::${elementId}-property-${addressableName}` }
;(Row as any).buildClusterUid = (component: any, targetElement: any, propertyGroupDescriptor: any) => { const elementId = `${targetElement.getComponentId()}`; return `${component.getPrimaryKey()}::${elementId}-cluster-${propertyGroupDescriptor.cluster.prefix}` }
;(Row as any).buildClusterMemberUid = (component: any, targetElement: any, propertyGroupDescriptor: any, addressableName: string) => { const elementId = `${targetElement.getComponentId()}`; return `${component.getPrimaryKey()}::${elementId}-cluster-${propertyGroupDescriptor.cluster.prefix}-property-${addressableName}` }
;(Row as any).buildHeadingUid = (component: any, targetElement: any) => `${component.getPrimaryKey()}::${targetElement.getComponentId()}-heading`

export { Row }
const Property = require('./Property').default
