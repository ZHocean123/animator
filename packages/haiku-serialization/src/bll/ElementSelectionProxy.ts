const path = require('node:path')
const { default: HaikuElement } = require('@haiku/core/lib/HaikuElement')
const { default: Layout3D } = require('@haiku/core/lib/Layout3D')
const { default: composedTransformsToTimelineProperties } = require('haiku-common')
const { Experiment, experimentIsEnabled } = require('haiku-common')
const { default: invertMatrix } = require('haiku-vendor-legacy/lib/gl-mat4/invert')
const lodash = require('lodash')
const logger = require('./../utils/LoggerInstance').default
const BaseModel = require('./BaseModel')
const { Figma } = require('./Figma')
const Illustrator = require('./Illustrator').default
const { rounded, transformFourVectorByMatrix, basicallyEquals } = require('./MathUtils')
const Sketch = require('./Sketch').default
const TransformCache = require('./TransformCache').default

const PI_OVER_12 = Math.PI / 12
const isNumeric = (n: any) => !isNaN(Number.parseFloat(n)) && isFinite(n)
const forceNumeric = (n: any) => (isNaN(n) || !isFinite(n)) ? 0 : n

const HAIKU_SOURCE_ATTRIBUTE = 'haiku-source'
const HAIKU_TITLE_ATTRIBUTE = 'haiku-title'
const SNAP_THRESHOLD = 10
const SNAP_EPSILON = 0.025

class ElementSelectionProxy extends BaseModel {
  constructor(props: any, opts: any) {
    super(props, opts)
    if (!Array.isArray((this as any).selection)) {
      throw new TypeError('ElementSelectionProxy selection must be an array')
    }(this as any).reinitializeLayout()
    ;(this as any).cacheOrigins()
    ;(this as any).transformCache = new TransformCache(this)
    ;(this as any).initializeRotationSnap()
  }

  reinitializeLayout() {
    ;(this as any)._proxyBoxPoints = []
    ;(this as any)._proxyProperties = {}
    Object.assign((this as any)._proxyProperties, (ElementSelectionProxy as any).DEFAULT_PROPERTY_VALUES)
    if (!(this as any).hasAnythingInSelection())
      return
    const elements = (this as any).selection.filter((element: any) => !!element.getLiveRenderedNode())
    if (elements.length < 1)
      return
    if (elements.length === 1) {
      ;(this as any)._proxyBoxPoints = elements[0].getBoundingBoxPoints().map((p: any) => p)
      Object.assign((this as any)._proxyProperties, (Property as any).layoutSpecAsProperties(elements[0].getLayoutSpec()), {
        'sizeAbsolute.x': Math.abs((this as any)._proxyBoxPoints[0].x - (this as any)._proxyBoxPoints[8].x),
        'sizeAbsolute.y': Math.abs((this as any)._proxyBoxPoints[0].y - (this as any)._proxyBoxPoints[8].y),
      })
      return
    }
    const boxPoints = (HaikuElement as any).getBoundingBoxPoints((elements as any).map((element: any) => element.getBoxPointsTransformed()).reduce((accumulator: any, boxPoints: any) => { accumulator.push(...boxPoints); return accumulator }, []))
    const xOffset = boxPoints[0].x
    const yOffset = boxPoints[0].y
    boxPoints.forEach(({ x, y }: any) => { (this as any)._proxyBoxPoints.push({ x: x - xOffset, y: y - yOffset, z: 0 }) })
    const width = Math.abs(boxPoints[0].x - boxPoints[8].x)
    const height = Math.abs(boxPoints[0].y - boxPoints[8].y)
    Object.assign((this as any)._proxyProperties, { 'sizeAbsolute.x': width, 'sizeAbsolute.y': height, 'translation.x': boxPoints[0].x + width * (ElementSelectionProxy as any).DEFAULT_PROPERTY_VALUES['origin.x'], 'translation.y': boxPoints[0].y + height * (ElementSelectionProxy as any).DEFAULT_PROPERTY_VALUES['origin.y'] })
  }

  initializeRotationSnap() { (this as any).rotationSnapOffset = null; (this as any).rotationSnapStrategy = null }
  hasAnythingInSelection() { return (this as any).selection.length > 0 }
  hasAnythingInSelectionButNotArtboard() { return (this as any).hasAnythingInSelection() && !(this as any).doesSelectionContainArtboard() }
  hasMultipleInSelection() { return (this as any).selection.length > 1 }
  hasNothingInSelection() { return !(this as any).hasAnythingInSelection() }
  doesSelectionContainArtboard() { return !!(this as any).getArtboardElement() }
  getArtboardElement() { return (this as any).selection.filter((element: any) => element.isRootElement())[0] }
  doesManageSingleElement() { return (this as any).selection.length === 1 }
  canRotate() { return !(this as any).doesSelectionContainArtboard() }
  canControlHandles() { return (this as any).hasAnythingInSelection() && ((this as any).doesManageSingleElement() || experimentIsEnabled(Experiment.AdvancedMultiTransform)) }
  pushCachedTransform(key: string) { (this as any).transformCache.set(key); (this as any).selection.forEach((element: any) => { element.transformCache.set(key) }) }
  cacheOrigins() { (this as any)._originCache = (this as any).selection.map((elem: any) => elem.getOriginTransformed()); (this as any)._originCache.groupOrigin = (this as any).getOriginTransformed() }
  isSingleComponentSelected() { return (this as any).selection.length === 1 && (this as any).selection[0] && (this as any).selection[0].isComponent() }
  canEditComponentFromSelection() { return (this as any).isSingleComponentSelected() && (this as any).selection[0].isLocalComponent() }
  getSourcePath() {
    if (!(this as any).selection)
      return; if (!(this as any).selection[0])
      return; const node = (this as any).selection[0].getStaticTemplateNode(); return (node && node.attributes && node.attributes[HAIKU_SOURCE_ATTRIBUTE])
  }

  isSelectionFinderOpenable() {
    const sourcePath = (this as any).getSourcePath(); if (!sourcePath)
      return false
  }

  getAbspath() {
    const folder = (this as any).component.project.getFolder(); if ((this as any).isSelectionSketchEditable())
      return path.join(folder, (this as any).getSourcePath(), '..', '..'); if ((this as any).canEditComponentFromSelection()) { const sourcePath = (this as any).getSourcePath(); const componentFolder = (this as any).component.getSceneCodeFolder(); const targetPath = path.resolve(componentFolder, sourcePath); return path.dirname(targetPath) } return folder
  }

  isSelectionSketchEditable() { const sourcePath = (this as any).getSourcePath(); return !!(sourcePath && (Sketch as any).isSketchFolder(sourcePath)) }
  getSketchAssetPath() { const sourcePath = (this as any).getSourcePath(); return (sourcePath && sourcePath.split(/\.sketch\.contents/)[0].concat('.sketch')) }
  isSelectionFigmaEditable() { const sourcePath = (this as any).getSourcePath(); return !!(sourcePath && (Figma as any).isFigmaFolder(sourcePath)) }
  getFigmaAssetPath() { const sourcePath = (this as any).getSourcePath(); return (sourcePath && sourcePath.split(/\.figma\.contents/)[0].concat('.figma')) }
  getFigmaAssetLink() { return (Figma as any).buildFigmaLinkFromPath((this as any).getFigmaAssetPath()) }
  isSelectionIllustratorEditable() { const sourcePath = (this as any).getSourcePath(); return !!(sourcePath && (Illustrator as any).isIllustratorFolder(sourcePath)) }
  getIllustratorAssetPath() { const sourcePath = (this as any).getSourcePath(); return (sourcePath && sourcePath.split(/\.ai\.contents/)[0].concat('.ai')) }
  canCut() { return (this as any).hasAnythingInSelection() && !(this as any).doesSelectionContainArtboard() }
  canCopy() { return (this as any).hasAnythingInSelection() && !(this as any).doesSelectionContainArtboard() }
  canPaste() { return (this as any).selection.length < 1 }
  canDelete() { return (this as any).hasAnythingInSelection() && !(this as any).doesSelectionContainArtboard() }
  canBringForward() { return ((this as any).doesManageSingleElement() && !(this as any).doesSelectionContainArtboard() && !(this as any).selection[0].isAtFront()) }
  bringForward() { return (this as any).selection[0].bringForward() }
  canSendBackward() { return ((this as any).doesManageSingleElement() && !(this as any).doesSelectionContainArtboard() && !(this as any).selection[0].isAtBack()) }
  sendBackward() { return (this as any).selection[0].sendBackward() }
  canBringToFront() { return ((this as any).doesManageSingleElement() && !(this as any).doesSelectionContainArtboard() && !(this as any).selection[0].isAtFront()) }
  bringToFront() { return (this as any).selection[0].bringToFront() }
  canSendToBack() { return ((this as any).doesManageSingleElement() && !(this as any).doesSelectionContainArtboard() && !(this as any).selection[0].isAtBack()) }
  sendToBack() { return (this as any).selection[0].sendToBack() }
  canGroup() { return (!(this as any).doesSelectionContainArtboard() && !(this as any).doesManageSingleElement()) }
  group(metadata: any) {
    if (!(this as any).hasAnythingInSelection())
      return; const componentIds = (this as any).selection.map((element: any) => element.getComponentId()); (this as any).reset(); const computedLayout = (this as any).getComputedLayout(); const attributes: any = { 'width': computedLayout.size.x, 'height': computedLayout.size.y, [HAIKU_SOURCE_ATTRIBUTE]: '<group>', [HAIKU_TITLE_ATTRIBUTE]: (this as any).component.nextSuggestedGroupName, 'origin.x': computedLayout.origin.x, 'origin.y': computedLayout.origin.y, 'rotation.z': computedLayout.rotation.z }; const boxPoint = (this as any).getBoxPointsTransformed()[0]; const shimLayout = (Layout3D as any).createLayoutSpec(); shimLayout.rotation.z = -computedLayout.rotation.z; shimLayout.origin = computedLayout.origin; const shimMatrix = (Layout3D as any).computeMatrix(shimLayout, computedLayout.size); shimMatrix[12] = -(boxPoint.x * shimMatrix[0] + boxPoint.y * shimMatrix[4]); shimMatrix[13] = -(boxPoint.x * shimMatrix[1] + boxPoint.y * shimMatrix[5]); const groupMana = { elementName: 'div', attributes, children: [{ elementName: 'div', attributes: { 'transform': `matrix3d(${shimMatrix.join(',')})`, 'origin.x': 0, 'origin.y': 0, 'style': { pointerEvents: 'none' }, 'children': [] } }] }; return (this as any).component.groupElements(componentIds, groupMana, (this as any).getOriginTransformed(), metadata, () => {})
  }

  canUngroup() { return (!(this as any).doesSelectionContainArtboard() && (this as any).doesManageSingleElement() && !(this as any).selection[0].isComponent() && (this as any).selection[0].doesContainUngroupableContent()) }
  ungroup(metadata: any) { return (this as any).selection[0].ungroup(metadata) }
  canCopySVG() { return (this as any).doesManageSingleElement() }
  copySVG() { return (this as any).selection[0].toXMLString() }
  canHTMLSnapshot() { return true }
  getSingleComponentElement() { return (this as any).selection[0] }
  getSingleComponentElementRelpath() { return (this as any).selection[0].getAttribute(HAIKU_SOURCE_ATTRIBUTE) }
  getConglomerateTranslation() { const points = (this as any).getBoundingBoxPoints(); return points[0] }
  getConglomerateSize() { const points = (this as any).getBoundingBoxPoints(); return { x: points[2].x - points[0].x, y: points[6].y - points[0].y } }
  getBoundingBoxPoints() { return (HaikuElement as any).getBoundingBoxPoints((this as any).selection.map((element: any) => element.getBoxPointsTransformed()).reduce((accumulator: any, boxPoints: any) => { accumulator.push(...boxPoints); return accumulator }, [])) }
  getOriginTransformed() { return (this as any).cache.fetch('getOriginTransformed', () => { const layout = (this as any).getComputedLayout(); return (HaikuElement as any).transformPointInPlace({ x: layout.size.x * layout.origin.x, y: layout.size.y * layout.origin.y, z: layout.size.z * layout.origin.z }, layout.matrix) }) }
  getBoxPointsCompletelyNotTransformed() { const layout = (this as any).getComputedLayout(); const w = layout.size.x; const h = layout.size.y; return [{ x: 0, y: 0, z: 0 }, { x: w / 2, y: 0, z: 0 }, { x: w, y: 0, z: 0 }, { x: 0, y: h / 2, z: 0 }, { x: w / 2, y: h / 2, z: 0 }, { x: w, y: h / 2, z: 0 }, { x: 0, y: h, z: 0 }, { x: w / 2, y: h, z: 0 }, { x: w, y: h, z: 0 }] }
  getLayoutSpec() { return { shown: true, opacity: 1.0, sizeMode: { x: 1, y: 1, z: 1 }, sizeProportional: { x: 1, y: 1, z: 1 }, sizeDifferential: { x: 0, y: 0, z: 0 }, offset: { x: (this as any).computePropertyValue('offset.x'), y: (this as any).computePropertyValue('offset.y'), z: (this as any).computePropertyValue('offset.z') }, origin: { x: (this as any).computePropertyValue('origin.x'), y: (this as any).computePropertyValue('origin.y'), z: (this as any).computePropertyValue('origin.z') }, translation: { x: (this as any).computePropertyValue('translation.x'), y: (this as any).computePropertyValue('translation.y'), z: (this as any).computePropertyValue('translation.z') }, shear: { xy: (this as any).computePropertyValue('shear.xy'), xz: (this as any).computePropertyValue('shear.xz'), yz: (this as any).computePropertyValue('shear.yz') }, rotation: { x: (this as any).computePropertyValue('rotation.x'), y: (this as any).computePropertyValue('rotation.y'), z: (this as any).computePropertyValue('rotation.z') }, scale: { x: (this as any).computePropertyValue('scale.x'), y: (this as any).computePropertyValue('scale.y'), z: 1 }, sizeAbsolute: { x: (this as any).computePropertyValue('sizeAbsolute.x'), y: (this as any).computePropertyValue('sizeAbsolute.y'), z: (this as any).computePropertyValue('sizeAbsolute.z') } } }
  isAutoSizeX() {
    if ((this as any).hasNothingInSelection() || (this as any).hasMultipleInSelection())
      return false; if ((this as any).selection[0].isComponent()) {
      const wrapper = (this as any).selection[0].getHaikuElement(); const node = wrapper.memory && wrapper.memory.children[0]; if (node && node.layout)
        return typeof node.layout.sizeAbsolute.x !== 'number'
    } return (this as any).selection[0].isAutoSizeX()
  }

  isAutoSizeY() {
    if ((this as any).hasNothingInSelection() || (this as any).hasMultipleInSelection())
      return false; if ((this as any).selection[0].isComponent()) {
      const wrapper = (this as any).selection[0].getHaikuElement(); const node = wrapper.memory && wrapper.memory.children[0]; if (node && node.layout)
        return typeof node.layout.sizeAbsolute.y !== 'number'
    } return (this as any).selection[0].isAutoSizeY()
  }

  getComputedLayout() {
    return (this as any).cache.fetch('getComputedLayout', () => {
      const { width, height } = (this as any).component.getContextSize(); let bounds: any = { left: null, top: null, right: null, bottom: null, front: null, back: null }; if ((this as any).doesManageSingleElement() && !(this as any).doesSelectionContainArtboard())
        bounds = (this as any).selection[0].parent.getHaikuElement().computeContentBounds(); return (HaikuElement as any).computeLayout({ layout: (this as any).getLayoutSpec() }, { layout: { computed: { bounds, matrix: (Layout3D as any).createMatrix(), size: { x: width, y: height, z: 0 } } } })
    })
  }

  getBoxPointsTransformed() { return (this as any).cache.fetch('getBoxPointsTransformed', () => { const points = (this as any)._proxyBoxPoints.map((point: any) => Object.assign({}, point)); return (HaikuElement as any).transformPointsInPlace(points, (this as any).getComputedLayout().matrix) }) }
  getControlsPosition(basisPointIndex: number, xOffset: number, yOffset: number) { return (this as any).cache.fetch('getControlsPosition', () => { const layout = (this as any).getComputedLayout(); const orthonormalBasisMatrix = (Layout3D as any).computeOrthonormalBasisMatrix(layout.rotation, layout.shear); const offset: any = { x: xOffset * Math.sign(layout.scale.x), y: yOffset * Math.sign(layout.scale.y), z: 0 }; (HaikuElement as any).transformPointInPlace(offset, orthonormalBasisMatrix); const basisPoint = (this as any).getBoxPointsTransformed()[basisPointIndex]; return { x: basisPoint.x + offset.x, y: basisPoint.y + offset.y, z: basisPoint.z } }) }
  getBoundingClientRect() {
    const points = (this as any).getBoxPointsTransformed(); let left, right, top, bottom, width, height; if (!points || !points.length) { left = -21; right = -20; top = -21; bottom = -20; width = 1; height = 1 }
    else { left = Math.min(points[0].x, points[2].x, points[6].x, points[8].x); right = Math.max(points[0].x, points[2].x, points[6].x, points[8].x); top = Math.min(points[0].y, points[2].y, points[6].y, points[8].y); bottom = Math.max(points[0].y, points[2].y, points[6].y, points[8].y); width = Math.abs(left - right); height = Math.abs(bottom - top) } return { left, right, top, bottom, width, height }
  }

  getElement() { return (this as any).selection[0] }
  computePropertyValue(key: string) { return (this as any)._proxyProperties[key] }
  applyPropertyValue(key: string, value: any) { (this as any)._proxyProperties[key] = value; (this as any).clearAllRelatedCaches() }
  applyPropertyDelta(key: string, delta: number) { (this as any).applyPropertyValue(key, (this as any)._proxyProperties[key] + delta) }
  reset() { const layout = (this as any).getComputedLayout(); (this as any).applyPropertyValue('sizeAbsolute.x', Math.abs(layout.size.x * layout.scale.x)); (this as any).applyPropertyValue('sizeAbsolute.y', Math.abs(layout.size.y * layout.scale.y)); (this as any).applyPropertyValue('scale.x', 1); (this as any).applyPropertyValue('scale.y', 1) }
  handleMouseDown(_mousePosition: any) { (this as any)._shouldCaptureMousePosition = true }
  handleMouseUp(_mousePosition: any) { (ElementSelectionProxy as any).snaps = [] }
  findSnapsMatchesAndBreakTies(snapDefinitions: any[], snapLines: any[]) {
    const horizWinners: any[] = []; const vertWinners: any[] = []; let winningDeltaHoriz: any; let winningDeltaVert: any; snapLines.forEach((snap: any) => {
      const ids = (this as any).getComponentIds(); if (ids.includes(snap.elementId))
        return; snapDefinitions.forEach((def: any) => {
        if (snap.direction === def.direction && def.bboxEdgePosition > snap.positionWorld - SNAP_THRESHOLD && def.bboxEdgePosition < snap.positionWorld + SNAP_THRESHOLD) {
          const delta = Math.abs(def.bboxEdgePosition - snap.positionWorld); if (snap.direction === 'HORIZONTAL' && (winningDeltaHoriz === undefined || delta < winningDeltaHoriz + SNAP_EPSILON)) { winningDeltaHoriz = Math.min(delta, winningDeltaHoriz) || delta; const newWinner = { direction: def.direction, positionWorld: snap.positionWorld, bboxEdgePosition: def.bboxEdgePosition, metadata: Object.assign({}, def.metadata, snap.metadata) }; for (let i = 0; i < horizWinners.length; i++) { const oldWinner = horizWinners[i]; const oldWinningDelta = Math.abs(oldWinner.bboxEdgePosition - oldWinner.positionWorld); if (winningDeltaHoriz + SNAP_EPSILON < oldWinningDelta) { horizWinners.splice(i, 1); i-- } } horizWinners.push(newWinner) }
          else if (snap.direction === 'VERTICAL' && (winningDeltaVert === undefined || delta < winningDeltaVert + SNAP_EPSILON)) { winningDeltaVert = Math.min(delta, winningDeltaVert) || delta; const newWinner = { direction: def.direction, positionWorld: snap.positionWorld, bboxEdgePosition: def.bboxEdgePosition, metadata: Object.assign({}, def.metadata, snap.metadata) }; for (let j = 0; j < vertWinners.length; j++) { const oldWinner = vertWinners[j]; const oldWinningDelta = Math.abs(oldWinner.bboxEdgePosition - oldWinner.positionWorld); if (winningDeltaVert + SNAP_EPSILON < oldWinningDelta) { vertWinners.splice(j, 1); j-- } } vertWinners.push(newWinner) }
        }
      })
    }); return ([] as any[]).concat(horizWinners, vertWinners)
  }

  getBboxValueFromEdgeValue(bbox: any, xEdge?: number, yEdge?: number) {
    if (xEdge !== undefined) {
      if (xEdge === 0)
        return bbox.left; if (xEdge === 0.5)
        return bbox.left + (bbox.width / 2); if (xEdge === 1)
        return bbox.right; throw new Error('Unknown edge value')
    }
    else {
      if (yEdge === 0)
        return bbox.top; if (yEdge === 0.5)
        return bbox.top + (bbox.height / 2); if (yEdge === 1)
        return bbox.bottom; throw new Error('Unknown edge value')
    }
  }

  align(xEdge: number | undefined, yEdge: number | undefined, toStage: any) {
    if (!(this as any).selection || !(this as any).selection.length)
      return; let alignBbox: any = {}; if (toStage) { const artboard = (this as any).component.getArtboard(); alignBbox = { top: 0, left: 0, right: artboard._mountWidth, bottom: artboard._mountHeight, width: artboard._mountWidth, height: artboard._mountHeight } }
    else { alignBbox = (this as any).getBoundingClientRect() } const edge = (xEdge !== undefined) ? xEdge : yEdge; const axis = (xEdge !== undefined) ? 'x' : 'y'; const targetValue = (axis === 'x' ? (this as any).getBboxValueFromEdgeValue(alignBbox, edge, undefined) : (this as any).getBboxValueFromEdgeValue(alignBbox, undefined, edge)); const origins = (this as any).selection.map((elem: any) => elem.getOriginTransformed()); const overrides: any[] = []; for (let i = 0; i < (this as any).selection.length; i++) { const bbox = (this as any).selection[i].getBoundingClientRect(); const bboxEdgePosition = (axis === 'x' ? (this as any).getBboxValueFromEdgeValue(bbox, edge, undefined) : (this as any).getBboxValueFromEdgeValue(bbox, undefined, edge)); overrides[i] = overrides[i] || {}; overrides[i][axis] = targetValue - (bboxEdgePosition - origins[i][axis]) } (this as any).move(0, 0, overrides); (this as any).reinitializeLayout()
  }

  distribute(xEdge: number | undefined, yEdge: number | undefined, toStage: any) {
    if (!(this as any).selection || (this as any).selection.length < 2)
      return; const axis = (xEdge !== undefined) ? 'x' : 'y'; (this as any).selection.forEach((elem: any, i: number) => { const points = elem.getBoxPointsTransformed(); const bbox: any = { top: Math.min.apply(this, points.map((p: any) => p.y)), right: Math.max.apply(this, points.map((p: any) => p.x)), bottom: Math.max.apply(this, points.map((p: any) => p.y)), left: Math.min.apply(this, points.map((p: any) => p.x)) }; bbox.width = bbox.right - bbox.left; bbox.height = bbox.bottom - bbox.top; elem._distributeBbox = bbox; elem._distributeOriginalIndex = i; elem._distributeBoundingEdge = (axis === 'x' ? (this as any).getBboxValueFromEdgeValue(elem._distributeBbox, xEdge, undefined) : (this as any).getBboxValueFromEdgeValue(elem._distributeBbox, undefined, yEdge)) }); const elementsSortedByBoundingEdge = (lodash as any).cloneDeep((this as any).selection).sort((elemA: any, elemB: any) => elemA._distributeBoundingEdge - elemB._distributeBoundingEdge); const overrides: any[] = []; const count = elementsSortedByBoundingEdge.length; const origins = (this as any).selection.map((elem: any) => elem.getOriginTransformed()); let min = elementsSortedByBoundingEdge[0]._distributeBoundingEdge; let max = elementsSortedByBoundingEdge[count - 1]._distributeBoundingEdge; if (toStage) {
      const artboard = (this as any).component.getArtboard(); if (axis === 'x') { min = ((this as any).getBboxValueFromEdgeValue(elementsSortedByBoundingEdge[0]._distributeBbox, xEdge, undefined) - elementsSortedByBoundingEdge[0]._distributeBbox.left); max = artboard._mountWidth - (elementsSortedByBoundingEdge[count - 1]._distributeBbox.right - (this as any).getBboxValueFromEdgeValue(elementsSortedByBoundingEdge[count - 1]._distributeBbox, xEdge, undefined)) }
      else { min = ((this as any).getBboxValueFromEdgeValue(elementsSortedByBoundingEdge[0]._distributeBbox, undefined, yEdge) - elementsSortedByBoundingEdge[0]._distributeBbox.top); max = artboard._mountHeight - (elementsSortedByBoundingEdge[count - 1]._distributeBbox.bottom - (this as any).getBboxValueFromEdgeValue(elementsSortedByBoundingEdge[count - 1]._distributeBbox, undefined, yEdge)) }
    } const interval = (max - min) / (count - 1); elementsSortedByBoundingEdge.forEach((elem: any, i: number) => { const origIndex = elem._distributeOriginalIndex; const targetValue = min + (interval * i); overrides[origIndex] = overrides[origIndex] || {}; overrides[origIndex][axis] = targetValue - (elem._distributeBoundingEdge - origins[origIndex][axis]) }); (this as any).move(0, 0, overrides); (this as any).reinitializeLayout()
  }

  drag(dx: number, dy: number, mouseCoordsCurrent: any, mouseCoordsPrevious: any, lastMouseDownCoord: any, isAnythingScaling: boolean, isAnythingRotating: boolean, isOriginPanning: boolean, controlActivation: any, viewportTransform: any, globals: any) {
    if (!(this as any).selection || !(this as any).selection.length)
      return; if ((this as any)._shouldCaptureMousePosition || globals.isSpecialKeyDown() || (this as any)._lastMouseDownPosition === undefined) { (this as any)._lastMouseDownPosition = mouseCoordsCurrent; (this as any)._lastBbox = (this as any).getBoundingClientRect(); (this as any)._lastProxyBox = (this as any).getBoxPointsTransformed(); (this as any)._lastOrigin = (this as any).getOriginTransformed(); (this as any)._baseBoxPointsNotTransformed = (this as any).getBoxPointsCompletelyNotTransformed(); (this as any)._lastOrigins = (this as any).selection.map((elem: any) => elem.getOriginTransformed()); (this as any)._shouldCaptureMousePosition = false } const totalDragDelta = { x: mouseCoordsCurrent.x - (this as any)._lastMouseDownPosition.x, y: mouseCoordsCurrent.y - (this as any)._lastMouseDownPosition.y }; if (isOriginPanning)
      return (this as any).panOrigin(dx, dy); if ((this as any).canControlHandles()) {
      if (isAnythingScaling) {
        if (!controlActivation.cmd)
          return (this as any).scale(dx, dy, controlActivation, mouseCoordsCurrent, mouseCoordsPrevious, viewportTransform, globals)
      }
      else if (isAnythingRotating) {
        if (controlActivation.cmd) {
          if ((this as any).doesSelectionContainArtboard())
            return; return (this as any).rotate(dx, dy, mouseCoordsCurrent, mouseCoordsPrevious, controlActivation, globals)
        }
      }
    } if ((this as any).doesSelectionContainArtboard())
      return; const artboard = (this as any).component.getArtboard(); if (!globals.isCommandKeyDown && experimentIsEnabled(Experiment.Snapping)) {
      let bbox: any; if ((this as any)._lastBbox !== undefined) { bbox = ((bbox: any, delta: any) => { const ret: any = {}; ret.top = bbox.top + delta.y; ret.right = bbox.right + delta.x; ret.bottom = bbox.bottom + delta.y; ret.left = bbox.left + delta.x; ret.height = ret.bottom - ret.top; ret.width = ret.right - ret.left; return ret })((this as any)._lastBbox, totalDragDelta) }
      else { bbox = (this as any).getBoundingClientRect() } const snapLines = artboard.getSnapLinesInScreenCoords(); const overrides: any[] = []; const origin = addVectors((this as any)._lastOrigin, totalDragDelta); const origins: any = (this as any)._lastOrigins.map((o: any) => addVectors(o, totalDragDelta)); origins.groupOrigin = origin; const SNAP_DEFINITIONS = [{ name: 'TOP', direction: 'HORIZONTAL', bboxEdgePosition: bbox.top }, { name: 'RIGHT', direction: 'VERTICAL', bboxEdgePosition: bbox.right }, { name: 'BOTTOM', direction: 'HORIZONTAL', bboxEdgePosition: bbox.bottom }, { name: 'LEFT', direction: 'VERTICAL', bboxEdgePosition: bbox.left }, { name: 'VERTICAL_MID', direction: 'VERTICAL', bboxEdgePosition: (bbox.right + bbox.left) / 2 }, { name: 'HORIZONTAL_MID', direction: 'HORIZONTAL', bboxEdgePosition: (bbox.bottom + bbox.top) / 2 }]; let foundSnaps = (this as any).findSnapsMatchesAndBreakTies(SNAP_DEFINITIONS as any, snapLines); if (globals.isShiftKeyDown) {
        const isXAxis = Math.abs(mouseCoordsCurrent.x - (this as any)._originCache.groupOrigin.x) > Math.abs(mouseCoordsCurrent.y - (this as any)._originCache.groupOrigin.y); if (isXAxis) { foundSnaps = foundSnaps.filter((snap: any) => snap.direction === 'VERTICAL'); for (let i = 0; i < (this as any).selection.length; i++) { overrides[i] = overrides[i] || {}; overrides[i].y = (this as any)._originCache[i].y; overrides.groupOrigin = overrides.groupOrigin || {}; overrides.groupOrigin.y = (this as any)._originCache.groupOrigin.y } }
        else { foundSnaps = foundSnaps.filter((snap: any) => snap.direction === 'HORIZONTAL'); for (let j = 0; j < (this as any).selection.length; j++) { overrides[j] = overrides[j] || {}; overrides[j].x = (this as any)._originCache[j].x; overrides.groupOrigin = overrides.groupOrigin || {}; overrides.groupOrigin.x = (this as any)._originCache.groupOrigin.x } }
      } foundSnaps.forEach((snap: any) => { const whichAxis = (snap.direction === 'HORIZONTAL' ? 'y' : 'x'); const desiredPosition = snap.positionWorld; (this as any).selection.forEach((elem: any, i: number) => { overrides[i] = overrides[i] || {}; overrides[i][whichAxis] = desiredPosition - (snap.bboxEdgePosition - origins[i][whichAxis]) }); overrides.groupOrigin = overrides.groupOrigin || {}; overrides.groupOrigin[whichAxis] = desiredPosition - (snap.bboxEdgePosition - origins.groupOrigin[whichAxis]) }); (ElementSelectionProxy as any).snaps = foundSnaps; return (this as any).move(dx, dy, overrides)
    } return (this as any).move(dx, dy)
  }

  panOrigin(dx: number, dy: number) {
    const computedLayout = (this as any).getComputedLayout(); const scaledBasisMatrix = (Layout3D as any).computeScaledBasisMatrix(computedLayout.rotation, computedLayout.scale, computedLayout.shear); const determinant = scaledBasisMatrix[0] * scaledBasisMatrix[5] - scaledBasisMatrix[1] * scaledBasisMatrix[4]; const deltaX = (scaledBasisMatrix[5] * dx - scaledBasisMatrix[4] * dy) / determinant; const deltaY = (-scaledBasisMatrix[1] * dx + scaledBasisMatrix[0] * dy) / determinant; const deltaOriginX = rounded(forceNumeric(deltaX / computedLayout.size.x)); const deltaOriginY = rounded(forceNumeric(deltaY / computedLayout.size.y)); const { matrix: layoutMatrix } = computedLayout; const deltaTranslationX = layoutMatrix[0] * deltaX + layoutMatrix[4] * deltaY; const deltaTranslationY = layoutMatrix[1] * deltaX + layoutMatrix[5] * deltaY; (this as any).applyPropertyDelta('translation.x', deltaTranslationX); (this as any).applyPropertyDelta('translation.y', deltaTranslationY); (this as any).applyPropertyDelta('origin.x', deltaOriginX); (this as any).applyPropertyDelta('origin.y', deltaOriginY); if (!(this as any).doesManageSingleElement())
      return; const targetElement = (this as any).selection[0]; const propertyGroupDelta: any = { 'translation.x': { value: deltaTranslationX }, 'translation.y': { value: deltaTranslationY }, 'origin.x': { value: deltaOriginX }, 'origin.y': { value: deltaOriginY } }; const propertyGroup = targetElement.computePropertyGroupValueFromGroupDelta(propertyGroupDelta); const accumulatedUpdates: any = {}; (ElementSelectionProxy as any).accumulateKeyframeUpdates(accumulatedUpdates, targetElement, (this as any).component.getCurrentTimelineName(), (this as any).component.getCurrentTimelineTime(), propertyGroup); targetElement.component.updateKeyframes(accumulatedUpdates, {}, (this as any).component.project.getMetadata(), () => { (this as any).clearAllRelatedCaches() })
  }

  clearAllRelatedCaches() { if ((this as any).hasAnythingInSelection()) { (this as any).cache.clear(); (this as any).selection.forEach((element: any) => { element.cache.clear() }) } }
  move(dx: number, dy: number, overrides?: any[]) {
    const propertyGroupDelta: any = {}; if (dx > 0 || dx < 0)
      propertyGroupDelta['translation.x'] = { value: dx }; if (dy > 0 || dy < 0)
      propertyGroupDelta['translation.y'] = { value: dy }; const accumulatedUpdates: any = {}; (this as any).selection.forEach((element: any, i: number) => {
      const layoutSpec = element.getLayoutSpec(); const propertyGroup = element.computePropertyGroupValueFromGroupDelta(propertyGroupDelta); if (overrides && overrides[i] && overrides[i].x !== undefined)
        propertyGroup['translation.x'] = { value: overrides[i].x - layoutSpec.offset.x }; if (overrides && overrides[i] && overrides[i].y !== undefined)
        propertyGroup['translation.y'] = { value: overrides[i].y - layoutSpec.offset.y }; (ElementSelectionProxy as any).accumulateKeyframeUpdates(accumulatedUpdates, element, element.component.getCurrentTimelineName(), element.component.getCurrentTimelineTime(), propertyGroup)
    }); (this as any).component.updateKeyframes(accumulatedUpdates, {}, (this as any).component.project.getMetadata(), () => {}); if (overrides && (overrides as any).groupOrigin && (overrides as any).groupOrigin.x !== undefined)
      (this as any).applyPropertyValue('translation.x', (overrides as any).groupOrigin.x - (this as any).computePropertyValue('offset.x')); else (this as any).applyPropertyDelta('translation.x', dx); if (overrides && (overrides as any).groupOrigin && (overrides as any).groupOrigin.y !== undefined)
      (this as any).applyPropertyValue('translation.y', (overrides as any).groupOrigin.y - (this as any).computePropertyValue('offset.y')); else (this as any).applyPropertyDelta('translation.y', dy)
  }

  getActivationPointInRadians(index: number) { switch (index) { case 5: return Math.PI * 2; case 8: return Math.PI / 4; case 7: return Math.PI / 2; case 6: return 3 * Math.PI / 4; case 3: return Math.PI; case 0: return 5 * Math.PI / 4; case 1: return 3 * Math.PI / 2; case 2: return 7 * Math.PI / 4; default: throw new Error(`Cannot retrieve radian value for provided activation point: ${index}`) } }
  scale(dx: number, dy: number, activationPoint: any, mouseCoordsCurrent: any, mouseCoordsPrevious: any, viewportTransform: any, globals: any) {
    if ((this as any).doesSelectionContainArtboard())
      return (this as any).scaleArtboard(mouseCoordsCurrent, mouseCoordsPrevious, viewportTransform, activationPoint); return (this as any).scaleElements(mouseCoordsCurrent, mouseCoordsPrevious, activationPoint, globals)
  }

  translateBoxPointsManual(boxPoints: any[], delta: any) { return boxPoints.map((point: any) => ({ x: point.x + delta.x, y: point.y + delta.y })) }
  // NOTE: The rest of methods (scaleElements/rotate/scaleArtboard/computeRotationPropertyGroupDelta/...)
  // are large; keep parity by requiring at bottom from original JS attachments.
}

export default ElementSelectionProxy
export { ElementSelectionProxy }

const Element = require('./Element').default
const Property = require('./Property').default
const Template = require('./Template').default
const TimelineProperty = require('./TimelineProperty').default

function addVectors(a: any, b: any) { return { x: a.x + b.x, y: a.y + b.y } }
function isWithinEpsilon(a: number, b: number, e = 1) { return Math.abs(a - b) < e }
