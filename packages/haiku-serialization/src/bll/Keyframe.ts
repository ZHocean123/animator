import { Curve } from '@haiku/core/lib/api'
import HaikuComponent from '@haiku/core/lib/HaikuComponent'

import expressionToRO from '@haiku/core/lib/reflection/expressionToRO'
import { getCurveInterpolationPoints, isDecomposableCurve } from 'haiku-formats'
import BaseModel from './BaseModel'

export default class Keyframe extends (BaseModel as any) {
  _selected = false
  _selectedBody = false
  _activated = false
  _dragStartPx: number | null = null
  _dragStartMs: number | null = null
  _needsMove = false
  _hasMouseDown = false
  _lastMouseDown = 0
  _didHandleDragStop = false
  _didHandleContextMenu = false
  _mouseDownState: Record<string, any> = {}
  _updateReceivers: Record<string, (what: any) => void> = {}
  _viewPosition: Record<string, number> = {}
  origMs?: number
  ms!: number
  index!: number
  value: any
  curve: any
  row: any
  timeline: any
  element: any
  component: any
  _next: any
  _prev: any

  activate() { if (!this._activated) { this._activated = true; this.notifyUpdateReceivers('keyframe-activated') } }
  deactivate() { if (this._activated) { this._activated = false; this.notifyUpdateReceivers('keyframe-deactivated') } }
  isActive() { return this._activated }
  select() { if (!this._selected) { this._selected = true; this.notifyUpdateReceivers('keyframe-selected') } }
  deselect() { if (this._selected) { this._selected = false; this.notifyUpdateReceivers('keyframe-deselected') } }
  setBodySelected() { if (!this._selectedBody) { this._selectedBody = true; this.notifyUpdateReceivers('keyframe-body-selected') } }
  unsetBodySelected() { if (this._selectedBody) { this._selectedBody = false; this.notifyUpdateReceivers('keyframe-body-unselected') } }
  deselectAndDeactivate() { this.unsetBodySelected(); this.deselect(); this.deactivate() }
  isSelected() { return this._selected }
  isSelectedBody() { return this._selectedBody }
  delete(metadata: any) { this.row.deleteKeyframe(this, metadata); Timeline.clearCaches(); return this }
  dragStart(dragData: { x: number }) { this._dragStartMs = this.getMs(); this._dragStartPx = dragData.x; return this }
  dragStop() { this._dragStartMs = null; this._dragStartPx = null; return this }
  drag(pxpf: number, mspf: number, dragData: { lastX: number }, metadata: any) { const pxChange = dragData.lastX - (this._dragStartPx as number); const msChange = Math.round(pxChange / pxpf * mspf); this.move(msChange, (this._dragStartMs as number), mspf); return this }
  move(msChange: number, msOrig: number, mspf: number) { const msFinal = msOrig + msChange; if (msFinal >= 0) { this.moveTo(msFinal, mspf) } return this }
  moveTo(ms: number, mspf: number) {
    if (this.getMs() === ms)
      return this; this.setMs(ms); const msMargin = Math.round(mspf); if (this.next()) { if (this.getMs() >= (this.next().getMs() - 1)) { const nextMs = this.getMs() + msMargin; if (nextMs >= 0) { this.next().moveTo(nextMs, mspf) } } } if (this.prev()) { if (this.getMs() <= (this.prev().getMs() + 1)) { const prevMs = this.getMs() - msMargin; if (prevMs >= 0) { this.prev().moveTo(prevMs, mspf) } } } return this
  }

  createKeyframe(value: any, ms: number, metadata: any) { this.row.createKeyframe(value, ms, metadata); return this }
  removeCurve(metadata: any) { if (this.next() && this.next().isActive()) { this.setCurve(null); this.component.splitSegment(this.element.getComponentId(), this.timeline.getName(), this.element.getNameString(), this.row.getPropertyNameString(), this.getMs(), metadata, () => {}); this.row.emit('update', 'keyframe-remove-curve') } return this }
  addCurve(curveName: any, metadata: any) { this.setCurve(curveName); this.component.joinKeyframes(this.element.getComponentId(), this.timeline.getName(), this.element.getNameString(), this.row.getPropertyNameString(), this.getMs(), null, curveName, metadata, () => {}); this.row.emit('update', 'keyframe-add-curve'); return this }
  changeCurve(curveName: any, metadata: any) { this.setCurve(curveName); this.component.changeSegmentCurve(this.element.getComponentId(), this.timeline.getName(), this.row.getPropertyNameString(), this.getMs(), curveName, metadata, () => {}); this.row.emit('update', 'keyframe-change-curve'); return this }
  isTransitionSegment() { const curve = this.getCurve(); return Boolean(curve) && (Boolean(Curve[this.getCurveCapitalized()]) || Array.isArray(curve)) }
  isConstantSegment() { return this.hasNextKeyframe() }
  hasConstantBody() { return (this.next() && !this.getCurve()) }
  hasCurveBody() { return Boolean(this.next() && this.isTransitionSegment()) }
  hasDecomposableCurve() { return this.hasCurveBody() && isDecomposableCurve(this.getCurve()) }
  getCurveInterpolationPoints() { if (this.isTransitionSegment()) { return getCurveInterpolationPoints(this.getCurve()) } }
  isSoloKeyframe() {
    const prev = this.prev(); if (!prev)
      return true; return !prev.getCurve()
  }

  hasPreviousKeyframe() { return !!this.prev() }
  hasNextKeyframe() { return !!this.next() }
  setOrigMs(ms: number) { this.origMs = ms }
  updateOwnMetadata() { const ms = this.getMs(); const newUid = (Keyframe as any).getInferredUid(this.row, ms); this.setOrigMs(ms); (Keyframe as any).setInstancePrimaryKey(this, newUid) }
  getUniqueKey() { return this.getPrimaryKey() }
  getViewPosition() { return this._viewPosition }
  isWithinCollapsedRow() { return this.row.isCollapsed() || this.row.isWithinCollapsedRow() }
  getFrame(mspf: number) { return Timeline.millisecondToNearestFrame(this.getMs(), mspf) }
  getOrigMs() { return this.origMs }
  getMs() { return this.ms }
  setMs(ms: number) {
    if (ms < 0)
      throw new Error('keyframes cannot be less than 0'); const normalized = this.timeline.normalizeMs(ms); const previous = this.getMs(); this.ms = normalized; Timeline.clearCaches(); if (normalized !== previous) { this._needsMove = true; this.notifyUpdateReceivers('keyframe-ms-set'); if (this.prev()) { this.prev().notifyUpdateReceivers('keyframe-neighbor-move') } if (this.next()) { this.next().notifyUpdateReceivers('keyframe-neighbor-move') } } return this
  }

  getIndex() { return this.index }
  getValue(serialized?: boolean) {
    if (serialized)
      return expressionToRO(this.value); return this.value
  }

  getSpec(edited?: boolean, serialized?: boolean) {
    const spec: any = { value: this.getValue(serialized) }; if (edited)
      spec.edited = true; if (this.getCurve())
      spec.curve = this.getCurve(); return spec
  }

  setCurve(value: any) { this.curve = value; return this }
  getCurve() { return this.curve }
  isVisible(a: number, b: number) {
    if (this.getMs() > b)
      return false; const next = this.next(); return !next || this.getMs() >= a || next.getMs() >= a
  }

  isTweenable() {
    if (typeof this.value === 'string' || this.value instanceof String) {
      const ourPropertyName = this.row.getPropertyNameString()
      return HaikuComponent.PARSERS[ourPropertyName] || (this.value as any) == Number.parseFloat(this.value, 10)
    }
    return typeof (this.value) !== 'boolean'
  }

  next() { return this._next }
  prev() { return this._prev }
  isNextKeyframeSelected() { return this.next() && this.next().isSelected() }
  getPixelOffsetRight(base: number, pxpf: number, mspf: number) {
    if (base === undefined || pxpf === undefined || mspf === undefined)
      throw new Error(`keyframe pixel offset right params missing`); if (this.next()) { return (this.next().getFrame(mspf) - base) * pxpf } return 0
  }

  getPixelOffsetLeft(base: number, pxpf: number, mspf: number) {
    if (base === undefined || pxpf === undefined || mspf === undefined)
      throw new Error(`keyframe pixel offset left params missing`); return (this.getFrame(mspf) - base) * pxpf
  }

  storeViewPosition({ rect, offset }: { rect: { left: number, right: number }, offset: number }) { this._viewPosition = { left: rect.left + offset, right: rect.right + offset } }
  clearViewPosition() { this._viewPosition = {} }
  isWithinCollapsedClusterHeadingRow() { return (this.row && this.row.parent && this.row.parent.isClusterHeading() && this.row.parent.isCollapsed()) }
  isClusterMember() { return (this.row && this.row.parent && this.row.parent.isClusterHeading()) }
  getElementHeadingRow() { if (this.row && this.row.parent) { if (this.row.parent.isClusterHeading()) { return this.row.parent.parent } return this.row.parent } }
  getClusterHeadingRow() { if (this.row && this.row.parent) { if (this.row.parent.isClusterHeading()) { return this.row.parent } } }
}

export { Keyframe }

;(Keyframe as any).DEFAULT_OPTIONS = { required: { component: true, timeline: true, element: true, row: true, ms: true, index: true, value: true } }
;(BaseModel as any).extend(Keyframe)

;(Keyframe as any).deselectAndDeactivateAllKeyframes = (criteria: any) => { (Keyframe as any).where(criteria).forEach((keyframe: any) => { keyframe.unsetBodySelected(); keyframe.deselect(); keyframe.deactivate() }) }
;(Keyframe as any).getInferredUid = (row: any, ms: number) => `${row.getPrimaryKey()}-keyframe-${ms}`
;(Keyframe as any).clearAllViewPositions = (filter: any) => { (Keyframe as any).where(filter).forEach((keyframe: any) => { keyframe.clearViewPosition() }) }
;(Keyframe as any).buildKeyframeMoves = (criteria: any, serialized?: boolean) => {
  const moves: any = {}; const movables = (Keyframe as any).where(Object.assign({ _needsMove: true }, criteria)); movables.forEach((movable: any) => {
    if (!movable._needsMove)
      return null; const timelineName = movable.timeline.getName(); const componentId = movable.element.getComponentId(); const propertyName = movable.row.getPropertyNameString(); if (!moves[timelineName])
      moves[timelineName] = {}; if (!moves[timelineName][componentId])
      moves[timelineName][componentId] = {}; if (!moves[timelineName][componentId][propertyName])
      moves[timelineName][componentId][propertyName] = {}; (Keyframe as any).where(criteria).forEach((partner: any) => {
      if (partner.timeline.getName() !== timelineName)
        return null; if (partner.element.getComponentId() !== componentId)
        return null; if (partner.row.getPropertyNameString() !== propertyName)
        return null; moves[timelineName][componentId][propertyName][partner.getMs()] = partner.getSpec(true, serialized); partner._needsMove = false
    }); moves[timelineName][componentId][propertyName][movable.getMs()] = movable.getSpec(true, serialized); movable._needsMove = false
  }); return moves
}
;(Keyframe as any).findIntersectingWithArea = ({ component, area, offset, viewCoordinatesProvider }: any) => {
  return (Keyframe as any).where({ component }).filter((keyframe: any) => {
    const keyframeView = keyframe.getViewPosition(); if (!keyframeView.left || keyframe.element.isLocked())
      return false; if (keyframeView.left - offset.horizontal > area.right)
      return false; if (keyframeView.right - offset.horizontal < area.left)
      return false; const y = viewCoordinatesProvider(keyframe.element).top; return y >= area.top && y <= area.bottom
  })
}
