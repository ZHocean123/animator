import path from 'node:path'
import HaikuDOMAdapter from '@haiku/core/lib/adapters/dom'
import HaikuComponent, { clone, LAYOUT_3D_SCHEMA } from '@haiku/core/lib/HaikuComponent'
import { HAIKU_ID_ATTRIBUTE, HAIKU_LOCKED_ATTRIBUTE, HAIKU_TITLE_ATTRIBUTE, HAIKU_VAR_ATTRIBUTE } from '@haiku/core/lib/HaikuElement'
import { PlaybackFlag } from '@haiku/core/lib/HaikuTimeline'
import { InteractionMode, isPreviewMode } from '@haiku/core/lib/helpers/interactionModes'
import { getSortedKeyframes } from '@haiku/core/lib/helpers/KeyframeUtils'
import Layout3D from '@haiku/core/lib/Layout3D'
import async from 'async'
import { Experiment, experimentIsEnabled, SustainedWarningChecker } from 'haiku-common'
import jss from 'json-stable-stringify'
import lodash from 'lodash'
import pascalcase from 'pascalcase'
import pretty from 'pretty'
import ensureTrailingSlash from '../utils/ensureTrailingSlash'
import CryptoUtils from './../utils/CryptoUtils'
import logger from './../utils/LoggerInstance'
import BaseModel from './BaseModel'
import toTitleCase from './helpers/toTitleCase'
import Lock from './Lock'

const KEYFRAME_MOVE_DEBOUNCE_TIME = 100
const CHECK_SUSTAINED_WARNINGS_DEBOUNCE_TIME = 1000
const DEFAULT_SCENE_NAME = 'main'
const DEFAULT_INTERACTION_MODE = InteractionMode.EDIT
const DEFAULT_TIMELINE_NAME = 'Default'
const DEFAULT_TIMELINE_TIME = 0
const HAIKU_SOURCE_ATTRIBUTE = 'haiku-source'
const SYNC_LOCKED_ID_SUFFIX = '#lock'
const SELECTION_WAIT_TIME = 0
const SELECTION_PING_TIME = 100

const isNumeric = (n: any) => !Number.isNaN(Number.parseFloat(n)) && Number.isFinite(n)

function describeHotComponent(componentId: string, timelineName: string, timelineTime: number, propertyGroup: any) {
  if (Number(timelineTime) !== 0)
    return null
  return { selector: `haiku:${componentId}`, propertyNames: Array.isArray(propertyGroup) ? propertyGroup : Object.keys(propertyGroup), timelineName }
}
function keyframeUpdatesToHotComponentDescriptors(keyframeUpdates: any) {
  const hotComponentDescriptors: any[] = []
  for (const timelineName in keyframeUpdates) {
    for (const componentId in keyframeUpdates[timelineName]) {
      for (const propertyName in keyframeUpdates[timelineName][componentId]) {
        for (const keyframeMs in keyframeUpdates[timelineName][componentId][propertyName]) {
          const hotComponent = describeHotComponent(componentId, timelineName, Number(keyframeMs), [propertyName])
          if (hotComponent)
            hotComponentDescriptors.push(hotComponent)
        }
      }
    }
  }
  return hotComponentDescriptors
}

class ActiveComponent extends BaseModel {
  snapshots: any[]
  mount: any
  artboard: any
  marquee: any
  interactionMode: any
  commitAccumulatedKeyframeMovesDebounced: any
  _isMounted: boolean
  _isReloadingCode: boolean
  sustainedWarningsChecker: any

  constructor(props: any, opts: any) {
    super(props, opts)
    if (!(this as any).scenename)
      (this as any).scenename = DEFAULT_SCENE_NAME
    this.snapshots = []
    this.mount = (MountElement as any).upsert({ uid: this.getPrimaryKey(), component: this, project: (this as any).project })
    this.mount.on('update', (what: any) => { this.emit('update', what, this.mount) })
    this.artboard = (Artboard as any).upsert({ uid: this.getPrimaryKey(), component: this, project: (this as any).project, mount: this.mount })
    this.artboard.on('update', (what: any) => { this.emit('update', what, this.artboard) })
    this.marquee = (SelectionMarquee as any).upsert({ uid: this.getPrimaryKey(), component: this, artboard: this.artboard })
    ;(this as any).project.addActiveComponentToRegistry(this)
    this.interactionMode = DEFAULT_INTERACTION_MODE
    ;(Element as any).on('update', (element: any, what: string, metadata: any) => {
      if (element.component === this) {
        if (what === 'element-selected' || what === 'element-selected-softly')
          this.handleElementSelected(element.getComponentId(), metadata)
        else if (what === 'element-unselected' || what === 'element-unselected-softly')
          this.handleElementUnselected(element.getComponentId(), metadata)
        else if (what === 'element-hovered')
          this.handleElementHovered(element.getComponentId(), metadata)
        else if (what === 'element-unhovered')
          this.handleElementUnhovered(element.getComponentId(), metadata)
        else if (what === 'jit-property-added' || what === 'jit-property-removed')
          this.reload({ hardReload: true, clearCacheOptions: { doClearEntityCaches: true } }, {}, () => {})
        this.emit('update', what, element, metadata)
      }
    })
    ;(Row as any).on('update', (row: any, what: string) => {
      if (row.component === this) {
        this.emit('update', what, row, (this as any).project.getMetadata()); if (what === 'row-collapsed' || what === 'row-expanded')
          this.cache.unset('displayableRows')
      }
    })
    ;(Keyframe as any).on('update', (keyframe: any, what: string) => {
      if (keyframe.component === this)
        this.emit('update', what, keyframe, (this as any).project.getMetadata())
    })
    this.commitAccumulatedKeyframeMovesDebounced = lodash.debounce(this.commitAccumulatedKeyframeMoves.bind(this), KEYFRAME_MOVE_DEBOUNCE_TIME)
  }

  findElementRoot() {
    for (const element of (Element as any).findRoots()) {
      if (element.component.uid === (this as any).uid)
        return element
    } return null
  }

  queryElements(criteria: any) { criteria = criteria || {}; criteria.component = this; return (Element as any).where(criteria) }
  findRowByComponentId(haikuId: string) { return (Row as any).findByComponentAndHaikuId(this, haikuId) }
  findPropertyRowsByParentComponentId(parentHaikuId: string) { return (Row as any).findPropertyRowsByComponentAndParentHaikuId(this, parentHaikuId) }
  findElementByComponentId(haikuId: string) { return (Element as any).findByComponentAndHaikuId(this, haikuId) }
  locateTemplateNodeByComponentId(componentId: string) { return this.getTemplateNodesByComponentId()[componentId] }
  getTemplateNodesByComponentId() {
    return this.cache.fetch('getTemplateNodesByComponentId', () => {
      const nodes: any = {}; const mana = this.getReifiedBytecode().template; (Template as any).visit(mana, (node: any) => {
        if (node && node.attributes && node.attributes[HAIKU_ID_ATTRIBUTE])
          nodes[node.attributes[HAIKU_ID_ATTRIBUTE]] = node
      }); return nodes
    })
  }

  findTemplateNodeByComponentId(mana: any, componentId: string) {
    if (!mana)
      return; if (mana.attributes && mana.attributes[HAIKU_ID_ATTRIBUTE] === componentId)
      return mana; if (Array.isArray(mana.children)) {
      for (let i = 0; i < mana.children.length; i++) {
        const maybeChild = this.findTemplateNodeByComponentId(mana.children[i], componentId); if (maybeChild)
          return maybeChild
      }
    }
  }

  findElementByUid(uid: string) { return (Element as any).findById(uid) }
  getCurrentTimelineName() { return (Timeline as any).DEFAULT_NAME }
  getCurrentTimelineTime() {
    const canonicalCoreInstance = (this as any).$instance; if (!canonicalCoreInstance)
      return 0; const canonicalCoreTimeline = canonicalCoreInstance.getTimeline(this.getCurrentTimelineName()); if (!canonicalCoreTimeline)
      return 0; const controlledTime = canonicalCoreTimeline.getControlledTime(); return controlledTime || 0
  }

  getCurrentMspf() { return 16.666 }
  getRelpath() { return path.join('code', this.getSceneName(), 'code.js') }
  getLocalizedRelpath() { return (Template as any).normalizePath(`./${this.getRelpath()}`) }
  getSceneCodeFolder() { return path.join((this as any).project.getFolder(), 'code', this.getSceneName()) }
  getSceneDomModulePath() { return path.join('code', this.getSceneName(), 'dom.js') }
  getRelpathWithRespectToProjectFromPathRelativeToUs(relpathRelativeToUs: string) { const abspathToGivenPath = path.normalize(path.join(this.getSceneCodeFolder(), relpathRelativeToUs)); const relpathWithRespectToProject = abspathToGivenPath.replace((this as any).project.getFolder(), '').slice(1); return relpathWithRespectToProject }
  setSceneName(scenename: string) { (this as any).scenename = scenename; return this }
  setAsCurrentActiveComponent(metadata: any, cb: any) { (this as any).project.setCurrentActiveComponent(this.getSceneName(), metadata, cb) }
  getSceneName() { return (this as any).scenename }
  getFriendlySceneName(maybeProjectName?: string) {
    const snakename = this.getSceneName(); if (snakename === DEFAULT_SCENE_NAME)
      return `${(this as any).project.getFriendlyName(maybeProjectName)} (Main)`; return `${toTitleCase(snakename)}`
  }

  getAbsoluteLottieFilePath() { return path.join(this.getSceneCodeFolder(), 'lottie.json') }
  getAbsoluteHaikuStaticFilePath() { return path.join(this.getSceneCodeFolder(), 'static.json') }
  fetchActiveBytecodeFile() { return (this as any).file }
  tick() {
    if ((this as any).$instance.context && (this as any).$instance.context.tick)
      (this as any).$instance.context.tick()
  }

  forceFlush() { (this as any).$instance.markForFullFlush(true); this.tick() }
  addHotComponents(hotComponents: any[]) {
    hotComponents.forEach((hotComponent) => {
      if (hotComponent)
        (this as any).$instance.addHotComponent(hotComponent)
    })
  }

  clearCaches(options: any = {}) {
    (this as any).$instance.clearCaches(options); this.fetchRootElement().cache.clear(); if (options.doClearEntityCaches)
      this.fetchRootElement().clearEntityCaches()
  }

  getPropertyGroupValueFromPropertyKeys(componentId: string, timelineName: string, timelineTime: number, propertyKeys: string[]) {
    const groupValue: any = {}; const bytecode = this.getReifiedBytecode(); if (!bytecode || !bytecode.timelines || !bytecode.timelines[timelineName] || !bytecode.timelines[timelineName][`haiku:${componentId}`])
      return groupValue; const cluster = bytecode.timelines[timelineName][`haiku:${componentId}`]; propertyKeys.forEach((propertyKey) => {
      if (!cluster[propertyKey])
        return; if (!cluster[propertyKey][timelineTime])
        return; groupValue[propertyKey] = cluster[propertyKey][timelineTime].value
    }); return groupValue
  }

  getMountHTML() { return this.getMount().getInnerHTML() }
  htmlSnapshot(cb: any) { const html = this.getMountHTML(); return cb(null, pretty(html).replace(/web\+haikuroot:\/\//g, ensureTrailingSlash((this as any).project.getFolder()))) }
  setCurrentTimelineFrameValue(frame: number) { this.getCurrentTimeline().seek(frame, true) }
  setTimelineTimeValue(timelineTime: number, forceSeek = false) {
    timelineTime = Math.round(timelineTime); if (forceSeek || timelineTime !== this.getCurrentTimelineTime()) {
      (Timeline as any).where({ component: this }).forEach((timeline: any) => { timeline.seekToTime(timelineTime, true, forceSeek) }); if ((this as any).$instance.context && (this as any).$instance.context.tick)
        (this as any).$instance.context.tick(true); (ElementSelectionProxy as any).all().forEach((proxy: any) => { proxy.clearAllRelatedCaches(); proxy.reinitializeLayout() })
    }
  }

  setTitleForComponent(componentId: string, newTitle: string, metadata: any, cb: any) {
    (this as any).project.updateHook('setTitleForComponent', this.getRelpath(), componentId, newTitle, metadata, (fire: any) => {
      return this.performComponentWork((bytecode: any, mana: any, done: any) => {
        const templateNode = this.locateTemplateNodeByComponentId(componentId); if (!templateNode)
          return done(null, '', ''); if (newTitle) { const oldTitle = templateNode.attributes[HAIKU_TITLE_ATTRIBUTE]; templateNode.attributes[HAIKU_TITLE_ATTRIBUTE] = newTitle; return done(null, newTitle, oldTitle) } return done(null, templateNode.attributes[HAIKU_TITLE_ATTRIBUTE], templateNode.attributes[HAIKU_TITLE_ATTRIBUTE])
      }, (err: any, newTitleOut: string, oldTitle: string) => {
        if (err)
          return cb(err); const element = this.findElementByComponentId(componentId); if (element)
          element.updateTargetingRows('row-set-title'); fire(null, oldTitle); return cb(null, newTitleOut)
      })
    })
  }

  setLockedStatusForComponent(componentId: string, locked: boolean, metadata: any, cb: any) {
    (this as any).project.updateHook('setLockedStatusForComponent', this.getRelpath(), componentId, locked, metadata, (fire: any) => {
      return this.performComponentWork((bytecode: any, mana: any, done: any) => {
        const templateNode = this.locateTemplateNodeByComponentId(componentId); if (!templateNode)
          return done(null, '', ''); const oldStatus = templateNode.attributes[HAIKU_LOCKED_ATTRIBUTE]; templateNode.attributes[HAIKU_LOCKED_ATTRIBUTE] = locked; return done(null, locked, oldStatus)
      }, (err: any, lockedOut: boolean, oldStatus: boolean) => {
        if (err)
          return cb(err); const element = this.findElementByComponentId(componentId); if (element)
          element.updateTargetingRows('row-set-locked'); fire(null, oldStatus); return cb(null, lockedOut)
      })
    })
  }

  handleElementSelected(componentId: string, metadata: any) { metadata.integrity = false; (this as any).project.updateHook('selectElement', this.getRelpath(), componentId, metadata, (fire: any) => fire()) }
  handleElementUnselected(componentId: string, metadata: any) { metadata.integrity = false; (this as any).project.updateHook('unselectElement', this.getRelpath(), componentId, metadata, (fire: any) => fire()) }
  handleElementHovered(componentId: string, metadata: any) { metadata.integrity = false; (this as any).project.updateHook('hoverElement', this.getRelpath(), componentId, metadata, (fire: any) => fire()) }
  handleElementUnhovered(componentId: string, metadata: any) { metadata.integrity = false; (this as any).project.updateHook('unhoverElement', this.getRelpath(), componentId, metadata, (fire: any) => fire()) }
  getTopLevelElementHaikuIds() { const template = this.getReifiedBytecode().template; const children = (template && template.children) || []; return children.map((child: any) => child && child.attributes && child.attributes[HAIKU_ID_ATTRIBUTE]).filter((id: any) => !!id) }
  selectElementWithinTime(waitTime: number, componentId: string, metadata: any, cb: any) {
    const element = (Element as any).findByComponentAndHaikuId(this, componentId); if (!element) {
      if (waitTime <= 0)
        return cb(); return setTimeout(() => this.selectElementWithinTime(waitTime - SELECTION_PING_TIME, componentId, metadata, cb), SELECTION_PING_TIME)
    } element.select(metadata); cb()
  }

  selectAll(options: any, metadata: any, cb: any) {
    return (Lock as any).request((Lock as any).LOCKS.ActiveComponentWork, false, (release: any) => {
      this.getArtboard().getElement().children.forEach((element: any) => {
        if (element.isLocked())
          return; element.selectSoftly(metadata)
      }); release(); (this as any).project.updateHook('selectAll', this.getRelpath(), options, metadata, (fire: any) => fire()); return cb()
    })
  }

  selectElement(componentId: string, metadata: any, cb: any) { return this.selectElementWithinTime(SELECTION_WAIT_TIME, componentId, metadata, () => cb()) }
  unselectElementWithinTime(waitTime: number, componentId: string, metadata: any, cb: any) {
    const element = (Element as any).findByComponentAndHaikuId(this, componentId); if (!element) {
      if (waitTime <= 0)
        return cb(); return setTimeout(() => this.unselectElementWithinTime(waitTime - SELECTION_PING_TIME, componentId, metadata, cb), SELECTION_PING_TIME)
    } element.unselect(metadata); return cb()
  }

  unselectElement(componentId: string, metadata: any, cb: any) { return this.unselectElementWithinTime(SELECTION_WAIT_TIME, componentId, metadata, () => cb()) }
  hoverElement(componentId: string, metadata: any, cb: any) {
    const element = (Element as any).findByComponentAndHaikuId(this, componentId); if (element)
      element.hoverOn(metadata); return cb()
  }

  unhoverElement(componentId: string, metadata: any, cb: any) {
    const element = (Element as any).findByComponentAndHaikuId(this, componentId); if (element)
      element.hoverOff(metadata); return cb()
  }

  isPreviewModeActive() { return isPreviewMode(this.interactionMode) }
  setInteractionMode(interactionMode: any, cb: any) { this.interactionMode = interactionMode; return this.reload({ superficial: true, clearCacheOptions: { doClearEntityCaches: true } }, null, cb) }
  setHotEditingMode(hotEditingMode: boolean) { (this as any).$instance.assignConfig({ hotEditingMode }) }
  getInsertionPointInfo(nonce = 0) { const bytecode = this.getReifiedBytecode(); const mana = bytecode && bytecode.template; const index = (mana && mana.children && mana.children.length) || 0; const template = mana && (Template as any).manaWithOnlyMinimalProps(mana, () => ({})); const source = `${jss(template)}-${index}-${nonce}`; const hash = (Template as any).getHash(source, 6); return { template, source, hash } }
  getInsertionPointHash() { return this.getInsertionPointInfo().hash }
  doesMatchOrHostComponent(other: any, cb: any) {
    if (other === this)
      return cb(null, true); if ((Template as any).normalizePath(other.getRelpath()) === (Template as any).normalizePath(this.getRelpath()))
      return cb(null, true); return cb(null, (Bytecode as any).doesMatchOrHostBytecode(this.getReifiedBytecode(), other.getReifiedBytecode(), undefined))
  }

  instantiateReference(subcomponent: any, identifier: string, modpath: string, coords: any, overrides: any, metadata: any, cb: any) {
    return subcomponent.doesMatchOrHostComponent(this, (err: any, answer: boolean) => {
      if (err)
        return cb(err); if (answer)
        return cb(new Error('You cannot place a component within itself')); let fullpath: string; const isExternalModule = modpath[0] !== '.'; if (!isExternalModule)
        fullpath = path.join((this as any).project.getFolder(), modpath); else fullpath = modpath; const file = (isExternalModule) ? (PseudoFile as any).upsert({ relpath: modpath }) : (this as any).project.upsertFile({ relpath: modpath, folder: (this as any).project.getFolder() }); const mod = (ModuleWrapper as any).upsert({ uid: fullpath, isExternalModule, component: subcomponent, file }); const title = subcomponent.getTitle(); return mod.moduleAsMana(this.getRelpath(), identifier, title, (err2: any, manaForWrapperElement: any) => {
        if (err2)
          return cb(err2); if (!manaForWrapperElement)
          return cb(new Error(`Module ${fullpath} could not be imported`)); this.instantiateManaInBytecode(manaForWrapperElement, this.getReifiedBytecode(), overrides, coords); return cb(null, manaForWrapperElement)
      })
    })
  }

  getTitle() { return pascalcase(this.getSceneName()) }
  getAbspath() { return path.join((this as any).project.getFolder(), this.getRelpath()) }
  fetchTimelinePropertyFromComponentElement(mana: any, propertyName: string) {
    if (!mana.elementName || !mana.elementName.template || !mana.elementName.template.attributes || !mana.elementName.template.elementName)
      return; return (TimelineProperty as any).getComputedValue(mana.elementName.template.attributes[HAIKU_ID_ATTRIBUTE], mana.elementName.template.elementName, propertyName, this.getCurrentTimelineName(), this.getCurrentTimelineTime(), 0, mana.elementName, mana.__memory && mana.__memory.subcomponent, mana.__memory && mana.__memory.subcomponent && mana.__memory.subcomponent.state)
  }

  instantiateManaInBytecode(mana: any, bytecode: any, overrides: any, coords: any) { const { hash } = this.getInsertionPointInfo(0); const timelineName = this.getInstantiationTimelineName(); const timelineTime = this.getInstantiationTimelineTime(); const timelines = (Template as any).prepareManaAndBuildTimelinesObject(mana, hash, timelineName, timelineTime, { doHashWork: true }); const componentId = mana.attributes[HAIKU_ID_ATTRIBUTE]; logger.info(`[active component (${(this as any).project.getAlias()})] instantiatee (mana) ${componentId} via ${hash}`); bytecode.template.children.unshift(mana); this.mutateInstantiateeDisplaySettings(componentId, timelines, timelineName, timelineTime, mana, coords); (Bytecode as any).applyOverrides(overrides, timelines, timelineName, `haiku:${componentId}`, timelineTime); (Bytecode as any).mergeTimelines(bytecode.timelines, timelines); this.zMoveToFrontImpl(bytecode, componentId, timelineName, timelineTime); return componentId }
  instantiateMana(mana: any, bytecode: any, coords: any, metadata: any, cb: any) { this.instantiateManaInBytecode(mana, bytecode, {}, coords); return cb(null, mana) }
  getInstantiationTimelineName() { return (Timeline as any).DEFAULT_NAME }
  getInstantiationTimelineTime() { return 0 }
  getMergeDesignTimelineName() { return (Timeline as any).DEFAULT_NAME }
  getMergeDesignTimelineTime() { return 0 }
  createInTransitionInTimelineObject(timelineObj: any, propertyName: string, fromTime: number, fromValue: any, toTime: number, toValue: any, curveName?: string) {
    if (!timelineObj[propertyName])
      timelineObj[propertyName] = {}; if (!timelineObj[propertyName][fromTime])
      timelineObj[propertyName][fromTime] = {}; timelineObj[propertyName][fromTime].value = fromValue; if (curveName)
      timelineObj[propertyName][fromTime].curve = curveName; if (!timelineObj[propertyName][toTime])
      timelineObj[propertyName][toTime] = {}; timelineObj[propertyName][toTime].value = toValue
  }

  mutateInstantiateeDisplaySettings(componentId: string, timelinesObject: any, timelineName: string, timelineTime: number, templateObject: any, maybeCoords: any) {
    const instance = (this as any).$instance; if (instance) { instance.context.getContainer(true); instance.render() } const insertedTimeline = timelinesObject[this.getCurrentTimelineName()][`haiku:${componentId}`] || {}; if (timelineTime > 0)
      this.createInTransitionInTimelineObject(insertedTimeline, 'opacity', 0, 0, timelineTime, 1, null as any); if (templateObject.elementName && typeof templateObject.elementName === 'object') {
      const sizeAbsoluteX = this.fetchTimelinePropertyFromComponentElement(templateObject, 'sizeAbsolute.x'); if (sizeAbsoluteX) {
        if (!insertedTimeline['sizeAbsolute.x'])
          insertedTimeline['sizeAbsolute.x'] = {}; if (!insertedTimeline['sizeAbsolute.x'][timelineTime])
          insertedTimeline['sizeAbsolute.x'][timelineTime] = {}; insertedTimeline['sizeAbsolute.x'][timelineTime].value = (Layout3D as any).AUTO_SIZING_TOKEN; if (!insertedTimeline['sizeMode.x'])
          insertedTimeline['sizeMode.x'] = {}; if (!insertedTimeline['sizeMode.x'][timelineTime])
          insertedTimeline['sizeMode.x'][timelineTime] = {}; insertedTimeline['sizeMode.x'][timelineTime].value = (Layout3D as any).SIZE_ABSOLUTE
      } const sizeAbsoluteY = this.fetchTimelinePropertyFromComponentElement(templateObject, 'sizeAbsolute.y'); if (sizeAbsoluteY) {
        if (!insertedTimeline['sizeAbsolute.y'])
          insertedTimeline['sizeAbsolute.y'] = {}; if (!insertedTimeline['sizeAbsolute.y'][timelineTime])
          insertedTimeline['sizeAbsolute.y'][timelineTime] = {}; insertedTimeline['sizeAbsolute.y'][timelineTime].value = (Layout3D as any).AUTO_SIZING_TOKEN; if (!insertedTimeline['sizeMode.y'])
          insertedTimeline['sizeMode.y'] = {}; if (!insertedTimeline['sizeMode.y'][timelineTime])
          insertedTimeline['sizeMode.y'][timelineTime] = {}; insertedTimeline['sizeMode.y'][timelineTime].value = (Layout3D as any).SIZE_ABSOLUTE
      }
    }
    if (maybeCoords !== undefined && maybeCoords !== null) {
      const propertyGroup: any = {}; const { width, height } = this.getContextSizeActual(timelineName, timelineTime); if (maybeCoords && typeof maybeCoords.x === 'number')
        propertyGroup['translation.x'] = maybeCoords.x; else propertyGroup['translation.x'] = width / 2; if (maybeCoords && typeof maybeCoords.y === 'number')
        propertyGroup['translation.y'] = maybeCoords.y; else propertyGroup['translation.y'] = height / 2; (TimelineProperty as any).addPropertyGroup(timelinesObject, timelineName, componentId, (Element as any).safeElementName(templateObject), propertyGroup, timelineTime)
    }
  }

  unconglomerateComponent(componentIds: string[], name: string, size: any, translation: any, coords: any, propertiesSerial: any, options: any = {}, metadata: any, cb: any) { (Lock as any).request((Lock as any).LOCKS.ActiveComponentWork, false, (release: any) => (this as any).project.updateHook('unconglomerateComponent', this.getRelpath(), componentIds, name, size, translation, coords, propertiesSerial, options, metadata, (fire: any) => { this.fetchActiveBytecodeFile().updateInMemoryHotModule(this.snapshots.pop(), () => { (this as any).project.deleteSceneByName(name, () => { release(); this.moduleSync(() => { fire(); cb() }) }) }) })) }
  conglomerateComponent(componentIds: string[], name: string, size: any, translation: any, coords: any, propertiesSerial: any, options: any = {}, metadata: any, cb: any) { const properties = (Bytecode as any).unserializeValue(propertiesSerial, (ref: any) => this.evaluateReference(ref)); return (Lock as any).request((Lock as any).LOCKS.ActiveComponentWork, false, (release: any) => { return this.pushBytecodeSnapshot(() => (this as any).project.updateHook('conglomerateComponent', this.getRelpath(), componentIds, name, size, translation, coords, (Bytecode as any).serializeValue(properties), options, metadata, (fire: any) => { const finish = (err: any, ac: any) => { if (err) { release(); logger.error(`[active component (${(this as any).project.getAlias()})]`, err); return cb(err) } return this.reload({ hardReload: true, clearCacheOptions: { doClearEntityCaches: true } }, null, () => { release(); fire(); return cb(null, ac) }) }; return this.conglomerateComponentActual(componentIds, name, size, translation, coords, properties, options, metadata, finish) })) }) }
  conglomerateComponentActual(ids: string[], name: string, size: any, translation: any, coords: any, properties: any, options: any = {}, metadata: any, cb: any) {
    let activeComponentToReturn: any; return this.performComponentWork((hostBytecode: any, hostTemplate: any, done: any) => {
      return (this as any).project.upsertSceneByName(name, (err: any, newActiveComponent: any) => {
        if (err)
          return done(err); activeComponentToReturn = newActiveComponent; const newBytecode = newActiveComponent.getReifiedBytecode(); newActiveComponent.upsertProperties(newBytecode, newBytecode.template.attributes[HAIKU_ID_ATTRIBUTE], newActiveComponent.getInstantiationTimelineName(), newActiveComponent.getInstantiationTimelineTime(), lodash.assign({ 'sizeAbsolute.x': size.x, 'sizeAbsolute.y': size.y }), 'merge'); ids.forEach((id) => {
          const element = this.findElementByComponentId(id); if (!element)
            throw new Error(`Cannot relocate element ${id}`); const elementBytecode = element.getQualifiedBytecode(); const elementOffset = { 'translation.x': translation.x, 'translation.y': translation.y }; const timelineName = this.getCurrentTimelineName(); const selector = (Template as any).buildHaikuIdSelector(elementBytecode.template.attributes[HAIKU_ID_ATTRIBUTE]); if (!elementBytecode.timelines[timelineName][selector])
            elementBytecode.timelines[timelineName][selector] = {}; for (const propertyName in elementOffset) {
            const offsetValue = elementOffset[propertyName]; if (!elementBytecode.timelines[timelineName][selector][propertyName])
              elementBytecode.timelines[timelineName][selector][propertyName] = {}; if (!elementBytecode.timelines[timelineName][selector][propertyName][0])
              elementBytecode.timelines[timelineName][selector][propertyName][0] = {}; for (const keyframeMs in elementBytecode.timelines[timelineName][selector][propertyName]) {
              const existingValue = elementBytecode.timelines[timelineName][selector][propertyName][keyframeMs].value || 0; const existingCurve = elementBytecode.timelines[timelineName][selector][propertyName][keyframeMs].curve; if (typeof existingValue === 'function')
                continue; const updatedValue = (isNumeric(existingValue)) ? (existingValue as any) - (offsetValue as any) : offsetValue; elementBytecode.timelines[timelineName][selector][propertyName][keyframeMs] = { value: updatedValue }; if (existingCurve)
                elementBytecode.timelines[timelineName][selector][propertyName][keyframeMs].curve = existingCurve
            }
          } newActiveComponent.instantiateBytecode(elementBytecode); this.deleteElementImpl(hostTemplate, id)
        }); return newActiveComponent.reload({ hardReload: true, clearCacheOptions: { doClearEntityCaches: true } }, {}, () => {
          newActiveComponent.handleUpdatedBytecode(newBytecode); const relpath = `./${newActiveComponent.getRelpath()}`; const identifier = (ModuleWrapper as any).modulePathToIdentifierName(relpath); if (options.skipInstantiateInHost)
            return done(); return this.instantiateReference(newActiveComponent, identifier, relpath, coords, properties, metadata, (err2: any) => {
            if (err2)
              return done(err2); const insertion = this.getReifiedBytecode().template.children[0]; this.upsertProperties(this.getReifiedBytecode(), insertion.attributes[HAIKU_ID_ATTRIBUTE], this.getInstantiationTimelineName(), 0, { playback: PlaybackFlag.LOOP }, 'merge'); return done()
          })
        })
      })
    }, (err: any) => {
      if (err)
        return cb(err); return cb(null, activeComponentToReturn)
    })
  }

  instantiateBytecode(incomingBytecode: any) { const timelineName = this.getInstantiationTimelineName(); const timelineTime = this.getInstantiationTimelineTime(); const existingBytecode = this.getReifiedBytecode(); const existingTemplate = existingBytecode.template; const { hash } = this.getInsertionPointInfo(0); (Bytecode as any).padIds(incomingBytecode, (oldId: string) => (Template as any).getHash(`${oldId}-${hash}`, 12)); const componentId = incomingBytecode.template.attributes[HAIKU_ID_ATTRIBUTE]; logger.info(`[active component (${(this as any).project.getAlias()})] instantiatee (bytecode) ${componentId} via ${hash}`); existingTemplate.children.unshift(incomingBytecode.template); this.mutateInstantiateeDisplaySettings(componentId, incomingBytecode.timelines, timelineName, timelineTime, incomingBytecode.template, null); (Bytecode as any).mergeBytecodeControlStructures(existingBytecode, incomingBytecode) }
  instantiateComponent(relpath: string, coords: any, metadata: any, cb: any) {
    return (Lock as any).request((Lock as any).LOCKS.ActiveComponentWork, false, (release: any) => {
      return (this as any).project.updateHook('instantiateComponent', this.getRelpath(), relpath, coords, metadata, (fire: any) => {
        const finish = (err: any, manaForWrapperElement: any) => { if (err) { release(); logger.error(`[active component (${(this as any).project.getAlias()})]`, err); return cb(err) } return this.reload({ hardReload: true, clearCacheOptions: { doClearEntityCaches: true } }, null, () => { release(); fire(null, manaForWrapperElement); cb(null, manaForWrapperElement); return this.selectElement(manaForWrapperElement.attributes[HAIKU_ID_ATTRIBUTE], metadata, () => {}) }) }; return this.performComponentWork((bytecode: any, mana: any, done: any) => {
          if ((ModuleWrapper as any).doesRelpathLookLikeInstalledComponent(relpath)) { const installedComponent = (InstalledComponent as any).upsert({ modpath: relpath }); return this.instantiateReference(installedComponent, installedComponent.getIdentifier(), relpath, coords, { 'origin.x': 0.5, 'origin.y': 0.5 }, metadata, done) } if ((ModuleWrapper as any).doesRelpathLookLikeLocalComponent(relpath)) { return (this as any).project.findActiveComponentBySource(relpath, (err2: any, subcomponent: any) => { if (!err2 && subcomponent) { return subcomponent.moduleReload('basicReload', () => { const localComponentIdentifier = (ModuleWrapper as any).modulePathToIdentifierName(relpath); return this.instantiateReference(subcomponent, localComponentIdentifier, relpath, coords, { 'origin.x': 0.5, 'origin.y': 0.5 }, metadata, done) }) } return done(new Error(`Cannot find component ${relpath}`)) }) } if ((ModuleWrapper as any).doesRelpathLookLikeSVGDesign(relpath)) {
            return (File as any).readMana((this as any).project.getFolder(), relpath, (err3: any, mana2: any) => {
              if (err3)
                return done(err3); (Template as any).fixManaSourceAttribute(mana2, relpath); return this.instantiateMana(mana2, bytecode, coords, metadata, done)
            })
          } if ((Asset as any).isImage(relpath)) {
            const imageComponent = (ImageComponent as any).upsert({ project: (this as any).project, relpath }); return imageComponent.queryImageSize((err4: any, size: any) => {
              if (err4)
                return done(err4); const { width, height } = size; return this.instantiateReference(imageComponent, imageComponent.identifier, imageComponent.modpath, coords, { 'origin.x': 0.5, 'origin.y': 0.5, 'href': imageComponent.getLocalHref(), width, height }, metadata, done)
            })
          } return done(new Error(`Problem instantiating ${relpath}`))
        }, finish)
      })
    })
  }

  deleteComponents(componentIds: string[], metadata: any, cb: any) {
    return (Lock as any).request((Lock as any).LOCKS.ActiveComponentWork, false, (release: any) => {
      (this as any).project.updateHook('deleteComponents', this.getRelpath(), componentIds, metadata, (fire: any) => {
        return this.performComponentWork((bytecode: any, mana: any, done: any) => {
          componentIds.forEach((componentId) => {
            const element = this.findElementByComponentId(componentId); if (element)
              element.remove(); this.deleteElementImpl(mana, componentId)
          }); done()
        }, (err: any) => { if (err) { release(); logger.error(`[active component (${(this as any).project.getAlias()})]`, err); return cb(err) } return this.reload({ hardReload: true, clearCacheOptions: { doClearEntityCaches: true } }, null, () => { release(); fire(); return cb() }) })
      })
    })
  }

  deleteElementImpl(mana: any, componentId: string) {
    (Template as any).visitManaTree(mana, (elementName: any, attributes: any, children: any, node: any, locator: any, parent: any, index: number) => {
      if (!attributes)
        return null; if (!attributes[HAIKU_ID_ATTRIBUTE])
        return null; if (componentId !== attributes[HAIKU_ID_ATTRIBUTE])
        return null; if (parent) {
        parent.children.splice(index, 1)
      }
      else { mana.elementName = 'div'; mana.attributes = {}; mana.children = [] }
    })
  }

  mergePrimitiveWithOverrides(primitive: any, overrides: any, cb: any) {
    return this.performComponentWork((bytecode: any, template: any, done: any) => {
      (Template as any).visit((template), (node: any) => {
        if (node.attributes[HAIKU_SOURCE_ATTRIBUTE] !== primitive.getRequirePath())
          return; const timelineName = this.getMergeDesignTimelineName(); const timelineTime = this.getMergeDesignTimelineTime(); const haikuId = node.attributes[HAIKU_ID_ATTRIBUTE]; const timelineObj = (bytecode.timelines && bytecode.timelines[timelineName] && bytecode.timelines[timelineName][`haiku:${haikuId}`]); if (timelineObj) {
          for (const propertyName in timelineObj) {
            const keyframeObj = timelineObj[propertyName][timelineTime]; if (!keyframeObj)
              continue; if (keyframeObj.edited)
              continue; const overrideVal = overrides[propertyName]; if (overrideVal !== undefined)
              keyframeObj.value = overrideVal
          }
        }
      }); done()
    }, cb)
  }

  removeChildContentFromBytecode(bytecode: any, mana: any) {
    const removedOutputs: any = {}; (Template as any).visit(mana, (node: any, parent: any, index: number, depth: number, address: string) => {
      if (node === mana)
        return; const haikuId = node.attributes && node.attributes[HAIKU_ID_ATTRIBUTE]; if (!haikuId)
        return; removedOutputs[haikuId] = { treeInfo: { index, depth, address }, templateNode: node, eventHandlers: {}, timelines: {} }; const haikuSelector = `haiku:${haikuId}`; if (bytecode.eventHandlers) { removedOutputs[haikuId].eventHandlers = bytecode.eventHandlers[haikuSelector]; delete bytecode.eventHandlers[haikuSelector] } if (bytecode.timelines) { for (const timelineName in bytecode.timelines) { removedOutputs[haikuId].timelines[timelineName] = bytecode.timelines[timelineName][haikuSelector]; delete bytecode.timelines[timelineName][haikuSelector] } }
    }); mana.children.splice(0); return removedOutputs
  }

  findEquivalentNode(node: any, { index, depth, address }: any, template: any) {
    let foundNode: any; const ourDomId = node.attributes && node.attributes.id; (Template as any).visit(template, (desc: any, parent: any, theirIndex: number, theirDepth: number, theirAddress: string) => {
      if (foundNode)
        return; const theirDomId = desc.attributes && desc.attributes.id; if (address === theirAddress && node.elementName === desc.elementName && ourDomId === theirDomId)
        foundNode = desc
    }); return foundNode
  }

  mergeRemovedOutputs(bytecode: any, subtemplate: any, removals: any) {
    if (!bytecode.timelines)
      return; for (const haikuId in removals) {
      const { treeInfo, templateNode, timelines } = removals[haikuId]; const equivalent = this.findEquivalentNode(templateNode, treeInfo, subtemplate); if (!equivalent)
        continue; const equivalentId = equivalent.attributes && equivalent.attributes[HAIKU_ID_ATTRIBUTE]; if (!equivalentId)
        continue; equivalent.__replacee = templateNode; const equivalentSelector = `haiku:${equivalentId}`; for (const timelineName in bytecode.timelines) {
        if (!timelines[timelineName])
          continue; if (!bytecode.timelines[timelineName][equivalentSelector])
          continue; for (const propertyName in timelines[timelineName]) {
          for (const keyframeMs in timelines[timelineName][propertyName]) {
            const sourceObj = timelines[timelineName][propertyName][keyframeMs]; if (!sourceObj.edited)
              continue; if (!bytecode.timelines[timelineName][equivalentSelector][propertyName])
              bytecode.timelines[timelineName][equivalentSelector][propertyName] = {}; if (!bytecode.timelines[timelineName][equivalentSelector][propertyName][keyframeMs])
              bytecode.timelines[timelineName][equivalentSelector][propertyName][keyframeMs] = {}; const targetObj = bytecode.timelines[timelineName][equivalentSelector][propertyName][keyframeMs]; if (sourceObj.curve)
              targetObj.curve = sourceObj.curve; if (sourceObj.value !== undefined)
              targetObj.value = sourceObj.value; targetObj.edited = true
          }
        }
      }
    }
  }

  mergeMana(existingBytecode: any, manaIncoming: any, index: any, { mergeRemovedOutputs = true }: any) {
    let numMatchingNodes = 0; const timelineName = this.getMergeDesignTimelineName(); const timelineTime = this.getMergeDesignTimelineTime(); (Template as any).visitWithoutDescendingIntoSubcomponents(existingBytecode.template, (existingNode: any) => {
      if (!existingNode.attributes[HAIKU_SOURCE_ATTRIBUTE] || !manaIncoming.attributes[HAIKU_SOURCE_ATTRIBUTE] || ((Template as any).normalizePath(existingNode.attributes[HAIKU_SOURCE_ATTRIBUTE]) !== (Template as any).normalizePath(manaIncoming.attributes[HAIKU_SOURCE_ATTRIBUTE])))
        return; const safeIncoming = (Template as any).clone({}, manaIncoming); const removedOutputs = this.removeChildContentFromBytecode(existingBytecode, existingNode); const { hash } = this.getInsertionPointInfo(`${index}-${numMatchingNodes++}`); const timelinesObject = (Template as any).prepareManaAndBuildTimelinesObject(safeIncoming, hash, timelineName, timelineTime, { doHashWork: true }); const existingSelector = `haiku:${existingNode.attributes[HAIKU_ID_ATTRIBUTE]}`; const incomingSelector = `haiku:${safeIncoming.attributes[HAIKU_ID_ATTRIBUTE]}`; timelinesObject[timelineName][existingSelector] = timelinesObject[timelineName][incomingSelector]; delete timelinesObject[timelineName][incomingSelector]; for (let i = 0; i < safeIncoming.children.length; i++) { const incomingChild = safeIncoming.children[i]; existingNode.children.push(incomingChild) } (Bytecode as any).mergeTimelines(existingBytecode.timelines, timelinesObject); if (mergeRemovedOutputs)
        this.mergeRemovedOutputs(existingBytecode, existingNode, removedOutputs)
    })
  }

  mergeDesignFiles(designs: any, cb: any) { return this.performComponentWork((bytecode: any, template: any, done: any) => { return this.mergeDesignFilesImpl(designs, bytecode, {}, done) }, cb) }
  mergeDesignFilesImpl(designs: any, bytecode: any, { mergeRemovedOutputs = true }: any, cb: any) {
    const designsAsArray = Object.keys(designs).sort((a, b) => {
      if (a < b)
        return -1; if (a > b)
        return 1; return 0
    }); if (!designsAsArray.length)
      return cb(); const usedSources = new Set<string>(); (Template as any).visitWithoutDescendingIntoSubcomponents(bytecode.template, (existingNode: any) => {
      if (existingNode.attributes[HAIKU_SOURCE_ATTRIBUTE])
        usedSources.add(existingNode.attributes[HAIKU_SOURCE_ATTRIBUTE])
    }); return async.eachOfSeries(designsAsArray, (relpath: string, index: number, next: any) => {
      if ((ModuleWrapper as any).doesRelpathLookLikeSVGDesign(relpath) && usedSources.has(path.posix.normalize(relpath))) {
        return (File as any).readMana((this as any).project.getFolder(), relpath, (err: any, mana: any) => {
          if (err || !mana)
            return next(); (Template as any).fixManaSourceAttribute(mana, relpath); this.mergeMana(bytecode, mana, index, { mergeRemovedOutputs }); return next()
        })
      } return next()
    }, (err: any, out: any) => {
      if (err)
        return cb(err); const bc = this.getReifiedBytecode(); (this as any).project.getAllActiveComponents().forEach((ac: any) => {
        if (!ac.$instance)
          return; ac.$instance.visitGuestHierarchy((instance: any) => {
          if (this.doesManageCoreInstance(instance)) {
            const safe = (ActiveComponent as any).memorySafeBytecode(bc, instance); if (instance.node.__memory && instance.node.__memory.parent)
              Object.assign(instance.node.__memory.parent.elementName, safe); Object.assign(instance.bytecode, safe)
          }
        })
      }); return cb(null, out)
    })
  }

  pasteThings(pasteablesSerial: any[], options: any, metadata: any, cb: any) {
    const pasteables = pasteablesSerial.map(pasteableSerial => (Bytecode as any).unserializeValue(pasteableSerial, (ref: any) => this.evaluateReference(ref))); return (Lock as any).request((Lock as any).LOCKS.ActiveComponentWork, false, (release: any) => {
      return (this as any).project.updateHook('pasteThings', this.getRelpath(), pasteablesSerial, options, metadata, (fire: any) => {
        return this.performComponentWork((bytecode: any, mana: any, done: any) => {
          const haikuIds: any[] = []; return async.eachSeries(pasteables, (pasteable: any, next: any) => {
            if (pasteable.kind === 'bytecode') {
              const nested = (pasteable.data && pasteable.data.template && pasteable.data.template.elementName); if (typeof nested === 'object') {
                const source = pasteable.data.template.attributes[HAIKU_SOURCE_ATTRIBUTE]; const identifier = pasteable.data.template.attributes[HAIKU_VAR_ATTRIBUTE]; const scenename = (this as any).project.relpathToSceneName(source); (nested as any).__reference = (ModuleWrapper as any).buildReference((ModuleWrapper as any).REF_TYPES.COMPONENT, (Template as any).normalizePath(`./${this.getRelpath()}`), (Template as any).normalizePathOfPossiblyExternalModule(source), identifier); return (this as any).project.findOrCreateActiveComponent(scenename, (err: any, ac: any) => {
                  if (err)
                    return next(err); return ac.moduleReload('basicReload', () => { ac.doesMatchOrHostComponent(this, (_: any, answer: boolean) => { if (!answer) { lodash.assign(nested, ac.getReifiedBytecode()); haikuIds.push(this.pasteBytecodeImpl(bytecode, pasteable.data, options)) } return next() }) })
                })
              } haikuIds.push(this.pasteBytecodeImpl(bytecode, pasteable.data, options)); return next()
            } logger.warn(`[active component (${(this as any).project.getAlias()})] cannot paste ${pasteable.kind}`); return next()
          }, (err: any) => done(err, { haikuIds }))
        }, (err: any, { haikuIds }: any) => { if (err) { release(); logger.error(`[active component (${(this as any).project.getAlias()})]`, err); return cb(err) } return this.reload({ hardReload: true, clearCacheOptions: { doClearEntityCaches: true } }, null, () => { release(); fire(null, { haikuIds }); return cb(null, { haikuIds }) }) })
      })
    })
  }

  pasteBytecodeImpl(ourBytecode: any, theirBytecode: any, { skipHashPadding = false }: any) { theirBytecode = (Bytecode as any).clone(theirBytecode); if (!skipHashPadding) { const { hash } = this.getInsertionPointInfo(0); (Bytecode as any).padIds(theirBytecode, (oldId: string) => `${oldId}-${hash}`) } const haikuId = theirBytecode.template.attributes['haiku-id']; (Bytecode as any).pasteBytecode(ourBytecode, theirBytecode); logger.info(`[active component (${(this as any).project.getAlias()})] pastee (bytecode) ${haikuId}`); this.zMoveToFrontImpl(ourBytecode, haikuId, 'Default', 0); return haikuId }
  evaluateReference(__reference: any) { const modref = (ModuleWrapper as any).parseReference(__reference); if (modref && modref.type && modref.type === (ModuleWrapper as any).REF_TYPES.COMPONENT) { const ac = (this as any).project.findActiveComponentBySourceIfPresent(modref.source); if (ac) { const bytecode = ac.getReifiedBytecode(); return lodash.assign({ __reference }, bytecode) } } return __reference }
  splitSelectedKeyframes(metadata: any) { const keyframes = this.getSelectedKeyframes(); keyframes.forEach((keyframe: any) => keyframe.removeCurve(metadata)) }
  deleteSelectedKeyframes(metadata: any) {
    const keyframes = this.getSelectedKeyframes(); if ((Keyframe as any).groupIsSingleTween(keyframes))
      return keyframes[0].removeCurve(metadata); keyframes.forEach((keyframe: any) => {
      if (!keyframe.isTransitionSegment()) {
        const prev = keyframe.prev(); if (prev && prev.isTransitionSegment())
          prev.removeCurve(metadata)
      } keyframe.delete(metadata)
    })
  }

  joinSelectedKeyframes(curveName: any, metadata: any) {
    const keyframes = this.getSelectedKeyframes(); keyframes.forEach((keyframe: any) => {
      if (keyframe.next() && keyframe.isSelectedBody())
        keyframe.addCurve(curveName, metadata)
    })
  }

  changeCurveOnSelectedKeyframes(curveName: any, metadata: any) {
    const keyframes = this.getSelectedKeyframes(); keyframes.forEach((keyframe: any) => {
      if (keyframe.next() && keyframe.isSelectedBody())
        keyframe.changeCurve(curveName, metadata)
    })
  }

  getFirstSelectedCurve() { const keyframes = this.getSelectedKeyframes(); const selectedKeyframeWithCurve = keyframes.find((keyframe: any) => keyframe.isSelectedBody()); return selectedKeyframeWithCurve ? selectedKeyframeWithCurve.getCurve() : null }
  dragStartSelectedKeyframes(dragData: any, referenceKeyframe: any) {
    const keyframes = this.getSelectedKeyframes(); if (referenceKeyframe && (Keyframe as any).groupIsSingleTween(keyframes))
      referenceKeyframe.dragStart(dragData); else keyframes.forEach((keyframe: any) => keyframe.dragStart(dragData))
  }

  dragStopSelectedKeyframes() { const keyframes = this.getSelectedKeyframes(); keyframes.forEach((keyframe: any) => keyframe.dragStop()); this.commitAccumulatedKeyframeMovesDebounced() }
  dragSelectedKeyframes(pxpf: number, mspf: number, dragData: any, metadata: any, referenceKeyframe: any) {
    const keyframes = this.getSelectedKeyframes(); if (referenceKeyframe && (Keyframe as any).groupIsSingleTween(keyframes))
      referenceKeyframe.drag(pxpf, mspf, dragData, metadata); else keyframes.forEach((keyframe: any) => keyframe.drag(pxpf, mspf, dragData, metadata))
  }

  elementHasTransitionOrExpression(elementId: string) {
    const bytecode = this.getReifiedBytecode(); const timelineName = this.getCurrentTimelineName(); const componentId = `haiku:${elementId}`; if (componentId in bytecode.timelines[timelineName]) {
      const componentTimeline = bytecode.timelines[timelineName][componentId]; for (const propertyName in componentTimeline) {
        if (!(LAYOUT_3D_SCHEMA as any)[propertyName])
          continue; const propertyTimeline = componentTimeline[propertyName]; if (propertyTimeline instanceof Object) {
          const keys = Object.keys(propertyTimeline); const values = keys.map(key => propertyTimeline[key].value); if (keys.length > 1) {
            if (values.some(value => value !== values[0]))
              return true
          } if (values.some(value => typeof value === 'function'))
            return true
        }
      }
    } return false
  }

  snapshotKeyframeUpdates(keyframeUpdates: any) {
    const bytecode = this.getReifiedBytecode(); const updates: any = {}; for (const timelineName in keyframeUpdates) {
      updates[timelineName] = {}; for (const componentId in keyframeUpdates[timelineName]) {
        const selector = (Template as any).buildHaikuIdSelector(componentId); updates[timelineName][componentId] = {}; for (const propertyName in keyframeUpdates[timelineName][componentId]) {
          updates[timelineName][componentId][propertyName] = {}; for (const keyframeMs in keyframeUpdates[timelineName][componentId][propertyName]) {
            if (!bytecode.timelines[timelineName] || !bytecode.timelines[timelineName][selector] || !bytecode.timelines[timelineName][selector][propertyName] || !bytecode.timelines[timelineName][selector][propertyName][keyframeMs]) {
              if (Number(keyframeMs) === 0) { const elementName = this.getElementNameOfComponentId(componentId); updates[timelineName][componentId][propertyName][keyframeMs] = { value: (TimelineProperty as any).getFallbackValue(elementName, propertyName) } }
              else { updates[timelineName][componentId][propertyName][keyframeMs] = null } continue
            } const keyfVal = (typeof bytecode.timelines[timelineName][selector][propertyName][keyframeMs].value === 'function') ? bytecode.timelines[timelineName][selector][propertyName][keyframeMs].value : lodash.clone(bytecode.timelines[timelineName][selector][propertyName][keyframeMs].value); updates[timelineName][componentId][propertyName][keyframeMs] = { value: keyfVal }
          }
        }
      }
    } return updates
  }

  gatherZIndexKeyframeMoves(timelineName: string) { const keyframeMovesDescriptor: any = { [timelineName]: {} }; this.getReifiedTemplate().children.forEach((child: any) => { keyframeMovesDescriptor[timelineName][child.attributes[HAIKU_ID_ATTRIBUTE]] = { 'style.zIndex': {} } }); return this.snapshotKeyframeMoves(keyframeMovesDescriptor) }
  gatherKeyframeMoves(componentId: string, timelineName: string, propertyNames: string[]) { const keyframeMovesDescriptor: any = {}; keyframeMovesDescriptor[timelineName] = {}; keyframeMovesDescriptor[timelineName][componentId] = {}; propertyNames.forEach((propertyName) => { keyframeMovesDescriptor[timelineName][componentId][propertyName] = {} }); return this.snapshotKeyframeMoves(keyframeMovesDescriptor) }
  snapshotKeyframeMoves(keyframeMovesDescriptor: any) {
    const moves: any = {}; for (const timelineName in keyframeMovesDescriptor) {
      moves[timelineName] = {}; for (const componentId in keyframeMovesDescriptor[timelineName]) {
        moves[timelineName][componentId] = {}; const propertyNames = Object.keys(keyframeMovesDescriptor[timelineName][componentId]); const keyframesObj = this.getKeyframesObjectForPropertyNames(timelineName, componentId, propertyNames); for (const propertyName in keyframesObj) {
          const propertyObj = keyframesObj[propertyName]; moves[timelineName][componentId][propertyName] = {}; for (const keyframeMs in propertyObj) {
            const keyfObj = propertyObj[keyframeMs]; const keyfVal = (typeof keyfObj.value === 'function') ? keyfObj.value : lodash.clone(keyfObj.value); moves[timelineName][componentId][propertyName][keyframeMs] = { value: keyfVal }; if (keyfObj.curve)
              moves[timelineName][componentId][propertyName][keyframeMs].curve = keyfObj.curve; if (keyfObj.edited)
              moves[timelineName][componentId][propertyName][keyframeMs].edited = true
          }
        }
      }
    } return moves
  }

  commitAccumulatedKeyframeMoves() { this.moveKeyframes((Keyframe as any).buildKeyframeMoves({ component: this }, true), (this as any).project.getMetadata(), () => {}) }
  getMount() { return this.mount }
  getArtboard() { return this.artboard }
  getSelectionMarquee() { return this.marquee }
  reload(reloadOptions: any, instanceConfig: any, cb: any) {
    const runReload = (done: any) => {
      if (reloadOptions.hardReload)
        return this.hardReload(reloadOptions, instanceConfig, done); return this.softReload(reloadOptions, instanceConfig, done)
    }; if (reloadOptions.skipReloadLock)
      return runReload(cb); return (Lock as any).request((Lock as any).LOCKS.ActiveComponentReload, false, (release: any) => {
      const finish = (err: any) => {
        release(); if (err)
          return cb(err); this.emit('update', 'reloaded', (reloadOptions.hardReload) ? 'hard' : 'soft'); return cb()
      }; return runReload(finish)
    })
  }

  softReload(reloadOptions: any, instanceConfig: any, cb: any) {
    if (!reloadOptions.superficial)
      this.clearCaches(reloadOptions.clearCacheOptions); if (experimentIsEnabled(Experiment.WarnOnUndefinedStateVariables))
      this.emitDebouncedCheckSustainedWarning(); if (!reloadOptions.hardReload) {
      if (reloadOptions.forceFlush)
        this.forceFlush(); else if (reloadOptions.hotComponents)
        this.addHotComponents(reloadOptions.hotComponents)
    } return cb()
  }

  hardReload(reloadOptions: any, instanceConfig: any, finish: any) {
    const timelineTimeBeforeReload = this.getCurrentTimelineTime() || 0; return async.series([(cb: any) => {
      if ((this as any).$instance)
        (this as any).$instance.context.clock.stop(); return cb()
    }, (cb: any) => {
      if (!reloadOptions.moduleReloadMethod)
        return cb(); return this.moduleCreate(reloadOptions.moduleReloadMethod, instanceConfig, cb)
    }, (cb: any) => { return this.softReload(reloadOptions, instanceConfig, cb) }, (cb: any) => {
      if (typeof reloadOptions.customRehydrate === 'function')
        reloadOptions.customRehydrate(reloadOptions); else this.rehydrate(reloadOptions); (ElementSelectionProxy as any).clearCaches(); this.forceFlush(); this.setTimelineTimeValue(timelineTimeBeforeReload, true); if ((this as any).$instance) {
        (this as any).$instance.context.clock.start(); const timeline = (this as any).$instance.getTimeline(this.getCurrentTimelineName()); if (timeline)
          timeline.setPlaying(true)
      } (this as any).project.emit('change-authoritative-frame', Math.round(timelineTimeBeforeReload / this.getCurrentMspf())); return cb()
    }], finish)
  }

  destroy(cleanup = false) { if ((this as any).$instance) { (this as any).$instance.context.contextUnmount(); (this as any).$instance.context.getClock().stop(); (this as any).$instance.context.destroy() } this.file.destroy(cleanup); for (const klass of [MountElement, Artboard, SelectionMarquee, Timeline, Keyframe, Row, Element, ElementSelectionProxy] as any[]) { (klass as any).where({ component: this }).forEach((instance: any) => instance.destroy()) } super.destroy() }
  moduleReload(moduleReloadMethod = 'basicReload', cb: any) { return this.fetchActiveBytecodeFile().mod[moduleReloadMethod](cb) }
  doesManageCoreInstance(instance: any) {
    if (!instance.getBytecodeRelpath())
      return false; return (path.normalize(instance.getBytecodeRelpath()) === path.normalize(this.getRelpath()))
  }

  moduleCreate(moduleReloadMethod: string, instanceConfig: any = {}, cb: any) {
    return this.moduleReload(moduleReloadMethod, (err: any) => {
      if (err)
        return cb(err); const bytecode = this.getReifiedBytecode(); if (this.isProjectActiveComponent()) {
        (this as any).project.getAllActiveComponents().forEach((ac: any) => {
          if (ac.$instance) {
            ac.$instance.visitGuestHierarchy((instance: any) => {
              instance.deactivate(); if (this.doesManageCoreInstance(instance)) {
                const safe = (ActiveComponent as any).memorySafeBytecode(bytecode, instance); if (instance.node.__memory && instance.node.__memory.parent)
                  Object.assign(instance.node.__memory.parent.elementName, safe); Object.assign(instance.bytecode, safe)
              } instance.clearCaches({ clearStates: true })
            }); ac.$instance.context.contextUnmount(); ac.$instance.context.getClock().stop()
          }
        })
      } if ((this as any).$instance)
        (this as any).$instance.context.destroy(); const timelineTime = this.getCurrentTimelineTime(); (this as any).$instance = this.createInstance(bytecode, instanceConfig); this.sustainedWarningsChecker = new SustainedWarningChecker((this as any).$instance); this.emitDebouncedCheckSustainedWarning = lodash.debounce(() => { this.emit('sustained-check:start') }, CHECK_SUSTAINED_WARNINGS_DEBOUNCE_TIME, { leading: false, trailing: true }); this.setTimelineTimeValue(timelineTime, true); return cb()
    })
  }

  moduleFindOrCreate(moduleReloadMethod: string, instanceConfig: any, cb: any) {
    if ((this as any).$instance)
      return cb(); return this.moduleCreate(moduleReloadMethod, instanceConfig, cb)
  }

  isProjectActiveComponent() { return (this as any).project.getCurrentActiveComponent() === this }
  createInstance(bytecode: any, config: any) { const factory = (HaikuDOMAdapter as any)(bytecode, null, null); const createdHaikuCoreComponent = factory(this.getMount().$el(), lodash.merge({}, { folder: ensureTrailingSlash((this as any).project.getFolder()), contextMenu: 'disabled', overflowX: 'visible', overflowY: 'visible', mixpanel: false, interactionMode: this.interactionMode, hotEditingMode: true, clock: { run: false } }, config)); createdHaikuCoreComponent.context.getContainer(true); createdHaikuCoreComponent.render(); createdHaikuCoreComponent.visitGuestHierarchy((instance: any) => { instance.activate() }); return createdHaikuCoreComponent }
  mountApplication($el: any, instanceConfig: any, cb: any) {
    this.getMount().remountInto($el); this.codeReloadingOn(); return this.reload({ hardReload: true, moduleReloadMethod: 'basicReload', clearCacheOptions: { doClearEntityCaches: true } }, instanceConfig, (err: any) => {
      this.codeReloadingOff(); if (err) {
        logger.error(`[active component (${(this as any).project.getAlias()})]`, err); this.emit('error', err); if (cb)
          return cb(err); return null
      } this._isMounted = true; this.emit('update', 'application-mounted'); if (cb)
        return cb(); return null
    })
  }

  sleepComponentsOn() { (HaikuComponent as any).all().forEach((instance: any) => { instance.sleepOn() }) }
  sleepComponentsOff() { (HaikuComponent as any).all().forEach((instance: any) => { instance.sleepOff() }) }
  isCodeReloading() { return this._isReloadingCode }
  codeReloadingOn() { this._isReloadingCode = true; this.sleepComponentsOn(); this.getMount().setOpacity(0.2) }
  codeReloadingOff() { this.getMount().setOpacity(1.0); this.sleepComponentsOff(); this._isReloadingCode = false }
  moduleReplace(cb: any) { return (Lock as any).request((Lock as any).LOCKS.ActiveComponentWork, false, (release: any) => { this.codeReloadingOn(); return this.reload({ hardReload: true, moduleReloadMethod: 'reload', clearCacheOptions: { doClearEntityCaches: true } }, null, (err: any) => { release(); this.codeReloadingOff(); if (err) { logger.error(`[active component (${(this as any).project.getAlias()})]`, err); return this.emit('error', err) } return cb() }) }) }
  moduleSync(cb: any) { return (Lock as any).request((Lock as any).LOCKS.ActiveComponentWork, false, (release: any) => { this.codeReloadingOn(); return this.reload({ hardReload: true, moduleReloadMethod: 'basicReload', clearCacheOptions: { doClearEntityCaches: true } }, null, (err: any) => { release(); this.codeReloadingOff(); if (err) { logger.error(`[active component (${(this as any).project.getAlias()})]`, err); return this.emit('error', err) } this.fetchActiveBytecodeFile().requestAsyncContentFlush(); return cb() }) }) }
  fetchRootElement() {
    const staticTemplateNode = this.getReifiedBytecode().template; const uid = (Element as any).makeUid(this, null, 0, staticTemplateNode); const found = (Element as any).findById(uid); if (found)
      return found; return (Element as any).upsertElementFromVirtualElement(this, staticTemplateNode, null, 0, '0')
  }

  pushBytecodeSnapshot(done: any) { this.snapshots.push((Bytecode as any).snapshot(this.fetchActiveBytecodeFile().getReifiedDecycledBytecode({ suppressSubcomponents: false }))); done() }
  popBytecodeSnapshot(metadata: any, cb: any) { return (this as any).project.updateHook('popBytecodeSnapshot', this.getRelpath(), metadata, (fire: any) => { this.fetchActiveBytecodeFile().updateInMemoryHotModule(this.snapshots.splice(this.snapshots.length - 2, 1)[0], () => { this.moduleSync(() => { fire(); return cb() }) }) }) }
  rehydrate(options: any = {}) {
    (BaseModel as any).__sync = false; this.cache.unset('displayableRows'); this.cache.unset('getTemplateNodesByComponentId'); (Timeline as any).upsert({ uid: this.buildCurrentTimelineUid(), folder: (this as any).project.getFolder(), name: this.getCurrentTimelineName(), component: this }, {}); const root = this.fetchRootElement(); (Keyframe as any).where({ component: this }).forEach((keyframe: any) => keyframe.mark()); (Row as any).where({ component: this }).forEach((row: any) => row.mark()); (Element as any).where({ component: this }).forEach((element: any) => {
      if (element !== root)
        element.mark()
    }); root.children = []; root.rehydrate(Object.assign({}, options, { maxRehydrationDepth: 1 })); root.visitAll((element: any) => { element.rehydrateRows(options) }); (Element as any).where({ component: this }).forEach((element: any) => {
      if (element !== root)
        element.sweep()
    }); (Row as any).where({ component: this }).forEach((row: any) => row.sweep()); (Keyframe as any).where({ component: this }).forEach((keyframe: any) => keyframe.sweep()); const row = root.getAllRows()[0]; if (row) { if (!row._wasInitiallyExpanded) { row._isExpanded = true; row._wasInitiallyExpanded = true } } (BaseModel as any).__sync = true
  }

  getReifiedBytecode() { return this.fetchActiveBytecodeFile().getReifiedBytecode() }
  getSerializedBytecode() { return this.fetchActiveBytecodeFile().getSerializedBytecode() }
  getBytecodeJSON(replacer: any, spacing: any) { return jss(this.getSerializedBytecode(), replacer, spacing) }
  getReifiedTemplate() { const reifiedBytecode = this.getReifiedBytecode(); return reifiedBytecode && reifiedBytecode.template }
  upsertProperties(bytecode: any, componentId: string, timelineName: string, timelineTime: number, propertiesToMerge: any, strategy: any) { return (Bytecode as any).upsertPropertyValue(bytecode, componentId, timelineName, timelineTime, propertiesToMerge, strategy) }
  getComponentId() { return this.getArtboard().getElementHaikuId() }
  isAutoSizeX() { return this.getDeclaredPropertyValue(this.getComponentId(), this.getCurrentTimelineName(), this.getCurrentTimelineTime(), 'sizeAbsolute.x') === 'auto' }
  isAutoSizeY() { return this.getDeclaredPropertyValue(this.getComponentId(), this.getCurrentTimelineName(), this.getCurrentTimelineTime(), 'sizeAbsolute.y') === 'auto' }
  getDeclaredPropertyValue(componentId: string, timelineName: string, timelineTime: number, propertyName: string) { const bytecode = this.getReifiedBytecode(); let propertyValue = (Template as any).getPropertyValue(bytecode, componentId, timelineName, timelineTime, propertyName); if (propertyValue === undefined || propertyValue === null) { const elementName = this.getElementNameOfComponentId(componentId); propertyValue = (TimelineProperty as any).getFallbackValue(elementName, propertyName) } return propertyValue }
  getDeclaredPropertyValues(componentId: string, timelineName: string, timelineTime: number, propertyNames: string[]) { const out: any = {}; propertyNames.forEach((propertyName) => { out[propertyName] = this.getDeclaredPropertyValue(componentId, timelineName, timelineTime, propertyName) }); return out }
  getStateDescriptor(stateName: string) { const states = this.getReifiedBytecode().states; return states && states[stateName] }
  getComputedPropertyValue(template: any, componentId: string, timelineName: string, timelineTime: number, propertyName: string, fallbackValue: any) { const bytecode = this.getReifiedBytecode(); const elementsById = (Template as any).getAllElementsByHaikuId(template); const element = elementsById[componentId]; const host = (this as any).$instance; const states = (host && host.getStates()) || {}; return (TimelineProperty as any).getComputedValue(componentId, (Element as any).safeElementName(element), propertyName, timelineName || DEFAULT_TIMELINE_NAME, timelineTime || DEFAULT_TIMELINE_TIME, fallbackValue, bytecode, host, states) }
  getContextSize() { return this.getContextSizeActual(this.getCurrentTimelineName(), this.getCurrentTimelineTime()) }
  getContextSizeActual(timelineName: string, timelineTime: number) {
    const defaults = { width: 1, height: 1 }; const bytecode = this.getReifiedBytecode(); if (!bytecode || !bytecode.template || !bytecode.template.attributes)
      return defaults; const contextHaikuId = bytecode.template.attributes[HAIKU_ID_ATTRIBUTE]; if (!contextHaikuId)
      return defaults; const contextElementName = (Element as any).safeElementName(bytecode.template); if (!contextElementName)
      return defaults; const modelElement = this.findElementByComponentId(contextHaikuId); if (!modelElement || !modelElement.getLiveRenderedNode())
      return defaults; const haikuElement = modelElement.getHaikuElement(); if (!haikuElement)
      return defaults; const host = (this as any).$instance; const states = (host && host.getStates()) || {}; let contextWidth = (TimelineProperty as any).getComputedValue(contextHaikuId, contextElementName, 'sizeAbsolute.x', timelineName || DEFAULT_TIMELINE_NAME, timelineTime || DEFAULT_TIMELINE_TIME, 0, bytecode, host, states); let contextHeight = (TimelineProperty as any).getComputedValue(contextHaikuId, contextElementName, 'sizeAbsolute.y', timelineName || DEFAULT_TIMELINE_NAME, timelineTime || DEFAULT_TIMELINE_TIME, 0, bytecode, host, states); if (typeof contextWidth !== 'number')
      contextWidth = haikuElement.computeSizeX(); if (typeof contextHeight !== 'number')
      contextHeight = haikuElement.computeSizeY(); return { width: contextWidth, height: contextHeight }
  }

  buildCurrentTimelineUid() { return `${this.getPrimaryKey()}::${this.getCurrentTimelineName()}` }
  getCurrentTimeline() { return (Timeline as any).findById(this.buildCurrentTimelineUid()) }
  getRows() { return (Row as any).where({ component: this }) }
  getKeyframes() { return (Keyframe as any).where({ component: this }) }
  getElements() { return (Element as any).where({ component: this }) }
  getLastTemplateNode() { const bytecode = this.getReifiedBytecode(); return (bytecode && bytecode.template && bytecode.template.children && bytecode.template.children[bytecode.template.children.length - 1]) }
  getFirstTemplateNode() { const bytecode = this.getReifiedBytecode(); return (bytecode && bytecode.template && bytecode.template.children && bytecode.template.children[0]) }
  getLastTemplateNodeHaikuId() { const node = this.getLastTemplateNode(); return node && node.attributes && node.attributes[HAIKU_ID_ATTRIBUTE] }
  getFirstTemplateNodeHaikuId() { const node = this.getFirstTemplateNode(); return node && node.attributes && node.attributes[HAIKU_ID_ATTRIBUTE] }
  focusSelectNext(navDir: any, doFocus: any, metadata: any) { return (Row as any).focusSelectNext({ component: this }, navDir, doFocus, metadata) }
  getSelectedRows() { return (Row as any).where({ component: this, _isSelected: true }) }
  getSelectedElements() { return (Element as any).where({ component: this, _isSelected: true }) }
  getCurrentRows(criteria: any) { criteria = criteria || {}; criteria.component = this; return (Row as any).where(criteria) }
  getDisplayableRowsGroupedByElementInZOrder() { const stack = this.getRawStackingInfo(this.getInstantiationTimelineName(), this.getInstantiationTimelineTime()).reverse(); const root = this.fetchRootElement(); const rows = root.getHostedPropertyRows(false); const all = [].concat(rows); const groups = [{ host: root, id: root.getComponentId(), rows }].concat(stack.reduce((acc: any, { haikuId }: any) => { const child = this.findElementByComponentId(haikuId); if (child) { const subrows = child.getHostedPropertyRows(true); all.push.apply(all, subrows); acc.push({ host: child, id: child.getComponentId(), rows: subrows }) } return acc }, [])); const first = all[0]; const last = all[all.length - 1]; all.forEach((row: any, index: number) => { const prev = all[index - 1]; row._prev = null; row._next = null; if (prev) { row._prev = prev; prev._next = row } }); first._prev = last; last._next = first; return groups }
  getSelectedKeyframes() { return (Keyframe as any).where({ component: this, _selected: true }) }
  checkIfSelectedKeyframesAreMovableToZero() { const selectedKeyframes = this.getSelectedKeyframes(); const notMovable = selectedKeyframes.findIndex((keyframe: any) => !(keyframe.prev() && keyframe.prev().origMs === 0)); return notMovable === -1 }
  getCurrentKeyframes(criteria: any) { criteria = criteria || {}; criteria.component = this; return (Keyframe as any).where(criteria) }
  getFocusedRow() { return (Row as any).getFocusedRow({ component: this }) }
  getSelectedRow() { return (Row as any).getSelectedRow({ component: this }) }
  performComponentWork(worker: any, cb: any) {
    this.sleepComponentsOn(); return (Lock as any).request((Lock as any).LOCKS.FilePerformComponentWork, false, (release: any) => {
      const finish = (err: any, ...result: any[]) => { release(); return cb(err, ...result) }; const bytecode = this.getReifiedBytecode(); return worker(bytecode, bytecode.template, (err: any, ...result: any[]) => {
        if (err)
          return finish(err); this.handleUpdatedBytecode(bytecode); this.sleepComponentsOff(); return finish(null, ...result)
      })
    })
  }

  handleUpdatedBytecode(bytecode: any) { (Bytecode as any).cleanBytecode(bytecode); (Template as any).cleanTemplate(bytecode.template); const file = this.fetchActiveBytecodeFile(); file.updateInMemoryHotModule(bytecode, () => { this.fetchActiveBytecodeFile().requestAsyncContentFlush() }) }
  performComponentTimelinesWork(worker: any, finish: any) {
    return this.performComponentWork((bytecode: any, mana: any, done: any) => {
      if (!bytecode)
        return done(new Error('Missing bytecode')); if (!bytecode.timelines)
        return done(new Error('Missing timelines')); return worker(bytecode, mana, bytecode.timelines, done)
    }, finish)
  }

  getKeyframeValue(componentId: string, timelineName: string, timelineTime: number, propertyName: string) { const bytecode = this.getReifiedBytecode(); const selector = `haiku:${componentId}`; return (bytecode && bytecode.timelines && bytecode.timelines[timelineName] && bytecode.timelines[timelineName][selector] && bytecode.timelines[timelineName][selector][propertyName] && bytecode.timelines[timelineName][selector][propertyName][timelineTime] && bytecode.timelines[timelineName][selector][propertyName][timelineTime].value) }
  getKeyframeCurve(componentId: string, timelineName: string, timelineTime: number, propertyName: string) { const bytecode = this.getReifiedBytecode(); const selector = `haiku:${componentId}`; return (bytecode && bytecode.timelines && bytecode.timelines[timelineName] && bytecode.timelines[timelineName][selector] && bytecode.timelines[timelineName][selector][propertyName] && bytecode.timelines[timelineName][selector][propertyName][timelineTime] && bytecode.timelines[timelineName][selector][propertyName][timelineTime].curve) }
  getElementNameOfComponentId(componentId: string) { const element = this.findTemplateNodeByComponentId(this.getReifiedBytecode().template, componentId); return element && element.elementName }
  getSafeElementNameOfComponentId(componentId: string) { const element = this.findTemplateNodeByComponentId(this.getReifiedBytecode().template, componentId); return element && (Element as any).safeElementName(element) }
  getTimelineDescriptor(timelineName: string) { const bytecode = this.getReifiedBytecode(); return bytecode && bytecode.timelines && bytecode.timelines[timelineName] }
  getRawStackingInfo(timelineName: string, timelineTime: number) { const bytecode = this.getReifiedBytecode(); return (Template as any).getStackingInfo(bytecode, bytecode.template, timelineName, timelineTime) }
  setZIndicesForStackingInfo(bytecode: any, timelineName: string, timelineTime: number, stackingInfo: any[]) { stackingInfo.forEach(({ haikuId }, arrayIndex) => { this.upsertProperties(bytecode, haikuId, timelineName, timelineTime, { 'style.zIndex': arrayIndex + 1 }, 'merge') }) }
  grabStackObjectFromStackingInfo(stackingInfo: any[], componentId: string) {
    for (let index = stackingInfo.length - 1; index >= 0; index--) {
      if (stackingInfo[index].haikuId === componentId)
        return { ourStackObject: stackingInfo.splice(index, 1)[0], index }
    }
  }

  writeMetadata(bytecodeMetadata: any, metadata: any, cb: any) { return (this as any).project.updateHook('writeMetadata', this.getRelpath(), bytecodeMetadata, metadata, (fire: any) => { return this.performComponentWork((bytecode: any, mana: any, done: any) => { (Bytecode as any).writeMetadata(bytecode, lodash.assign({}, bytecodeMetadata, { title: this.getTitle() })); done() }, () => { fire(); cb() }) }) }
  readMetadata(cb: any) { return cb(null, this.getReifiedBytecode().metadata || {}) }
  readAllEventHandlers(metadata: any, cb: any) { return this.readAllEventHandlersActual(cb) }
  readAllEventHandlersActual(cb: any) { const bytecode = this.getSerializedBytecode(); return cb(null, (Bytecode as any).readAllEventHandlers(bytecode)) }
  readAllStateValues(metadata: any, cb: any) { return this.readAllStateValuesActual(cb) }
  readAllStateValuesActual(cb: any) { const bytecode = this.getSerializedBytecode(); return cb(null, (Bytecode as any).readAllStateValues(bytecode)) }
  batchUpsertEventHandlers(selectorName: string, eventsSerial: any, metadata: any, cb: any) { const events = (Bytecode as any).unserializeValue(eventsSerial, (ref: any) => this.evaluateReference(ref)); return (this as any).project.updateHook('batchUpsertEventHandlers', this.getRelpath(), selectorName, (Bytecode as any).serializeValue(events), metadata, (fire: any) => { return this.batchUpsertEventHandlersActual(selectorName, events, (err: any) => { if (err) { logger.error(`[active component (${(this as any).project.getAlias()})]`, err); return cb(err) } return this.reload({ hardReload: (this as any).project.isRemoteRequest(metadata), clearCacheOptions: { doClearEntityCaches: true } }, null, () => { fire(); (this as any).project.broadcastPayload({ name: 'event-handlers-updated' }); return cb() }) }) }) }
  batchUpsertEventHandlersActual(selectorName: string, serializedEvents: any, cb: any) { return this.performComponentWork((bytecode: any, mana: any, done: any) => { (Bytecode as any).batchUpsertEventHandlers(bytecode, selectorName, serializedEvents); done() }, cb) }
  changeKeyframeValue(componentId: string, timelineName: string, propertyName: string, keyframeMs: number, newValueSerial: any, metadata: any, cb: any) { const newValue = (Bytecode as any).unserializeValue(newValueSerial, (ref: any) => this.evaluateReference(ref)); return (this as any).project.updateHook('changeKeyframeValue', this.getRelpath(), componentId, timelineName, propertyName, keyframeMs, (Bytecode as any).serializeValue(newValue), metadata, (fire: any) => { return this.changeKeyframeValueActual(componentId, timelineName, propertyName, keyframeMs, newValue, metadata, (err: any) => { if (err) { logger.error(`[active component (${(this as any).project.getAlias()})]`, err); return cb(err) } return this.reload({ hardReload: (this as any).project.isRemoteRequest(metadata), forceFlush: true, clearCacheOptions: { doClearEntityCaches: true } }, null, () => { fire(); return cb() }) }) }) }
  changeKeyframeValueActual(componentId: string, timelineName: string, propertyName: string, keyframeMs: number, newValue: any, metadata: any, cb: any) { return this.performComponentWork((bytecode: any, mana: any, done: any) => { (Bytecode as any).changeKeyframeValue(bytecode, componentId, timelineName, propertyName, keyframeMs, newValue); done() }, cb) }
  changeSegmentCurve(componentId: string, timelineName: string, propertyName: string, keyframeMs: number, newCurveSerial: any, metadata: any, cb: any) { const newCurve = (Bytecode as any).unserializeValue(newCurveSerial, (ref: any) => this.evaluateReference(ref)); return (this as any).project.updateHook('changeSegmentCurve', this.getRelpath(), componentId, timelineName, propertyName, keyframeMs, (Bytecode as any).serializeValue(newCurve), metadata, (fire: any) => { return this.changeSegmentCurveActual(componentId, timelineName, propertyName, keyframeMs, newCurve, metadata, (err: any) => { if (err) { logger.error(`[active component (${(this as any).project.getAlias()})]`, err); return cb(err) } return this.reload({ hardReload: (this as any).project.isRemoteRequest(metadata), forceFlush: true, clearCacheOptions: { doClearEntityCaches: true } }, null, () => { fire(); return cb() }) }) }) }
  changeSegmentCurveActual(componentId: string, timelineName: string, propertyName: string, keyframeMs: number, newCurve: any, metadata: any, cb: any) { return this.performComponentWork((bytecode: any, mana: any, done: any) => { (Bytecode as any).changeSegmentCurve(bytecode, componentId, timelineName, propertyName, keyframeMs, newCurve); done() }, cb) }
  joinKeyframes(componentId: string, timelineName: string, elementName: any, propertyName: string, keyframeMsLeft: number, keyframeMsRight: number, newCurveSerial: any, metadata: any, cb: any) {
    const newCurve = (Bytecode as any).unserializeValue(newCurveSerial, (ref: any) => this.evaluateReference(ref)); return (this as any).project.updateHook('joinKeyframes', this.getRelpath(), componentId, timelineName, elementName, propertyName, keyframeMsLeft, keyframeMsRight, (Bytecode as any).serializeValue(newCurve), metadata, (fire: any) => {
      return this.joinKeyframesActual(componentId, timelineName, elementName, propertyName, keyframeMsLeft, keyframeMsRight, newCurve, metadata, (err: any) => {
        if (err) { logger.error(`[active component (${(this as any).project.getAlias()})]`, err); return cb(err) } return this.reload({ hardReload: true, forceFlush: true, clearCacheOptions: { doClearEntityCaches: true }, customRehydrate: () => {
          if ((this as any).project.isRemoteRequest(metadata)) { this.rehydrate(); return } const element = this.findElementByComponentId(componentId); if (element) {
            const row = element.getPropertyRowByPropertyName(propertyName); if (row) {
              const keyframe = row.getKeyframeByMs(keyframeMsLeft); if (keyframe)
                keyframe.setCurve(newCurve)
            }
          }
        } }, null, () => { fire(); return cb() })
      })
    })
  }

  joinKeyframesActual(componentId: string, timelineName: string, elementName: any, propertyName: string, keyframeMsLeft: number, keyframeMsRight: number, newCurve: any, metadata: any, cb: any) { return this.performComponentWork((bytecode: any, mana: any, done: any) => { (Bytecode as any).joinKeyframes(bytecode, componentId, timelineName, elementName, propertyName, keyframeMsLeft, keyframeMsRight, newCurve); done() }, cb) }
  splitSegment(componentId: string, timelineName: string, elementName: any, propertyName: string, keyframeMs: number, metadata: any, cb: any) {
    return (this as any).project.updateHook('splitSegment', this.getRelpath(), componentId, timelineName, elementName, propertyName, keyframeMs, metadata, (fire: any) => {
      return this.splitSegmentActual(componentId, timelineName, elementName, propertyName, keyframeMs, metadata, (err: any) => {
        if (err) { logger.error(`[active component (${(this as any).project.getAlias()})]`, err); return cb(err) } return this.reload({ hardReload: true, forceFlush: true, clearCacheOptions: { doClearEntityCaches: true }, customRehydrate: () => {
          if ((this as any).project.isRemoteRequest(metadata)) { this.rehydrate(); return } const element = this.findElementByComponentId(componentId); if (element) {
            const row = element.getPropertyRowByPropertyName(propertyName); if (row) {
              const keyframe = row.getKeyframeByMs(keyframeMs); if (keyframe)
                keyframe.setCurve(null)
            }
          }
        } }, null, () => { fire(); return cb() })
      })
    })
  }

  splitSegmentActual(componentId: string, timelineName: string, elementName: any, propertyName: string, keyframeMs: number, metadata: any, cb: any) { return this.performComponentWork((bytecode: any, mana: any, done: any) => { (Bytecode as any).splitSegment(bytecode, componentId, timelineName, elementName, propertyName, keyframeMs); done() }, cb) }
  getKeyframesObjectForPropertyNames(timelineName: string, componentId: string, propertyNames: string[]) { const bytecode = this.getReifiedBytecode() || {}; const timeline = bytecode.timelines[timelineName] || {}; const properties = timeline[`haiku:${componentId}`] || {}; const keyframes: any = {}; propertyNames.forEach((propertyName) => { keyframes[propertyName] = properties[propertyName] }); return keyframes }
  ensureZerothKeyframe(bytecode: any, timelineName: string, componentId: string, propertyName: string, fallbackToInitialKeyframeIfProvided = true) {
    const selector = `haiku:${componentId}`; if (!bytecode.timelines[timelineName])
      bytecode.timelines[timelineName] = {}; if (!bytecode.timelines[timelineName][selector])
      bytecode.timelines[timelineName][selector] = {}; if (!bytecode.timelines[timelineName][selector][propertyName])
      bytecode.timelines[timelineName][selector][propertyName] = {}; const descriptor = bytecode.timelines[timelineName][selector][propertyName]; const keyframeNumbers = getSortedKeyframes(descriptor); const initialKeyframeMs = keyframeNumbers[0]; const initialKeyframeObj = (initialKeyframeMs !== undefined) ? descriptor[initialKeyframeMs] : undefined; if (!descriptor[0])
      descriptor[0] = {}; if (descriptor[0].value === undefined) {
      if (fallbackToInitialKeyframeIfProvided && initialKeyframeObj) {
        descriptor[0].value = (Bytecode as any).unserializeValue(initialKeyframeObj.value, (ref: any) => this.evaluateReference(ref))
      }
      else { const declaredValue = this.getDeclaredPropertyValue(componentId, timelineName, 0, propertyName); descriptor[0].value = (Bytecode as any).unserializeValue(declaredValue, (ref: any) => this.evaluateReference(ref)) }
    } if (descriptor[0].value === undefined)
      descriptor[0].value = 1; descriptor[0].edited = true
  }

  moveKeyframes(keyframeMovesSerial: any, metadata: any, cb: any) {
    if (Object.keys(keyframeMovesSerial).length < 1)
      return cb(); const keyframeMoves = (Bytecode as any).unserializeValue(keyframeMovesSerial, (ref: any) => this.evaluateReference(ref)); return (this as any).project.updateHook('moveKeyframes', this.getRelpath(), (Bytecode as any).serializeValue(keyframeMoves), metadata, (fire: any) => {
      return this.moveKeyframesActual(keyframeMoves, metadata, (err: any) => {
        if (err) { logger.error(`[active component (${(this as any).project.getAlias()})]`, err); return cb(err) } return this.reload({ hardReload: true, forceFlush: true, clearCacheOptions: { doClearEntityCaches: true }, customRehydrate: () => {
          if ((this as any).project.isRemoteRequest(metadata)) { this.rehydrate(); return } for (const timelineName in keyframeMoves) {
            for (const componentId in keyframeMoves[timelineName]) {
              const element = this.findElementByComponentId(componentId); if (!element)
                continue; for (const propertyName in keyframeMoves[timelineName][componentId]) {
                const row = element.getPropertyRowByPropertyName(propertyName); if (!row)
                  continue; row.getKeyframes().forEach((keyframe: any) => keyframe.updateOwnMetadata()); row.rehydrate()
              }
            }
          }
        } }, null, () => { fire(); return cb() })
      })
    })
  }

  moveKeyframesActual(keyframeMoves: any, metadata: any, cb: any) { return this.performComponentWork((bytecode: any, mana: any, done: any) => { (Bytecode as any).moveKeyframes(bytecode, keyframeMoves); for (const timelineName in keyframeMoves) { for (const componentId in keyframeMoves[timelineName]) { for (const propertyName in keyframeMoves[timelineName][componentId]) { this.ensureZerothKeyframe(bytecode, timelineName, componentId, propertyName, true) } } } (Timeline as any).clearCaches(); done() }, cb) }
  updateKeyframes(keyframeUpdatesSerial: any, options: any, metadata: any, cb: any) {
    const keyframeUpdates = (Bytecode as any).unserializeValue(keyframeUpdatesSerial, (ref: any) => this.evaluateReference(ref)); return (this as any).project.updateHook('updateKeyframes', this.getRelpath(), (Bytecode as any).serializeValue(keyframeUpdates), options, metadata, (fire: any) => {
      const unlockedDesigns: any = {}; if (options.setElementLockStatus) {
        for (const elID in options.setElementLockStatus) {
          const node = this.findTemplateNodeByComponentId(this.getReifiedBytecode().template, elID); if (!node || !node.attributes[HAIKU_SOURCE_ATTRIBUTE])
            continue; const lockStatus = options.setElementLockStatus[elID]; if (!lockStatus && node.attributes[HAIKU_SOURCE_ATTRIBUTE].endsWith(SYNC_LOCKED_ID_SUFFIX)) { node.attributes[HAIKU_SOURCE_ATTRIBUTE] = node.attributes[HAIKU_SOURCE_ATTRIBUTE].replace(SYNC_LOCKED_ID_SUFFIX, ''); unlockedDesigns[node.attributes[HAIKU_SOURCE_ATTRIBUTE]] = true }
          else if (lockStatus && !node.attributes[HAIKU_SOURCE_ATTRIBUTE].endsWith(SYNC_LOCKED_ID_SUFFIX)) { node.attributes[HAIKU_SOURCE_ATTRIBUTE] = node.attributes[HAIKU_SOURCE_ATTRIBUTE] + SYNC_LOCKED_ID_SUFFIX }
        }
      } return this.updateKeyframesActual(keyframeUpdates, { unlockedDesigns }, metadata, (err: any) => {
        if (err) { logger.error(`[active component (${(this as any).project.getAlias()})]`, err); return cb(err) } return this.reload({ hardReload: (this as any).project.isRemoteRequest(metadata), forceFlush: !!metadata.cursor, hotComponents: keyframeUpdatesToHotComponentDescriptors(keyframeUpdates), clearCacheOptions: { doClearEntityCaches: !!metadata.cursor }, customRehydrate: () => {
          const componentIds: any = {}; for (const timelineName in keyframeUpdates) {
            for (const componentId in keyframeUpdates[timelineName]) {
              if (componentIds[componentId])
                continue; componentIds[componentId] = true; const element = this.findElementByComponentId(componentId); if (element) {
                element.rehydrateRows(); (Row as any).where({ component: this, element }).forEach((row: any) => {
                  if (experimentIsEnabled(Experiment.ExpandTimelinePropertiesFromStageChanges)) {
                    if (row.property && keyframeUpdates[timelineName][componentId][row.property.name])
                      row.expand(metadata)
                  }
                })
              }
            }
          } if (options.setElementLockStatus) { for (const elID in options.setElementLockStatus) { const element = this.findElementByComponentId(elID); (Row as any).where({ component: this, element }).forEach((row: any) => { row.rehydrate() }) } }
        } }, null, () => { fire(); this.tick(); return cb() })
      })
    })
  }

  updateKeyframesActual(keyframeUpdates: any, { unlockedDesigns }: any, metadata: any, cb: any) {
    return this.performComponentWork((bytecode: any, mana: any, done: any) => {
      for (const timelineName in keyframeUpdates) {
        if (!bytecode.timelines[timelineName])
          bytecode.timelines[timelineName] = {}; for (const componentId in keyframeUpdates[timelineName]) {
          const selector = (Template as any).buildHaikuIdSelector(componentId); if (!bytecode.timelines[timelineName][selector])
            bytecode.timelines[timelineName][selector] = {}; for (const propertyName in keyframeUpdates[timelineName][componentId]) {
            if (!bytecode.timelines[timelineName][selector][propertyName])
              bytecode.timelines[timelineName][selector][propertyName] = {}; for (const keyframeMs in keyframeUpdates[timelineName][componentId][propertyName]) {
              const propertyObj = keyframeUpdates[timelineName][componentId][propertyName][keyframeMs]; if (propertyObj === null) { delete bytecode.timelines[timelineName][selector][propertyName][keyframeMs]; continue } if (!bytecode.timelines[timelineName][selector][propertyName][keyframeMs])
                bytecode.timelines[timelineName][selector][propertyName][keyframeMs] = {}; const keyfVal = (typeof propertyObj.value === 'function') ? propertyObj.value : lodash.clone(propertyObj.value); bytecode.timelines[timelineName][selector][propertyName][keyframeMs].value = keyfVal; this.ensureZerothKeyframe(bytecode, timelineName, componentId, propertyName, false); if (experimentIsEnabled(Experiment.AutoTweenNewKeyframes)) { (Bytecode as any).addDefaultCurveIfNecessary(bytecode, timelineName, selector, Number(keyframeMs), propertyName, componentId, this.getElementNameOfComponentId(componentId)) }
            }
          }
        }
      } (Timeline as any).clearCaches(); this.mergeDesignFilesImpl(unlockedDesigns, bytecode, { mergeRemovedOutputs: false }, done)
    }, cb)
  }

  updateTypesActual(typeUpdates: any, metadata: any, cb: any) { return this.performComponentWork((bytecode: any, mana: any, done: any) => { for (const id in typeUpdates) { const node = this.locateTemplateNodeByComponentId(id); node.elementName = typeUpdates[id] } done() }, cb) }
  updateKeyframesAndTypes(keyframeUpdatesSerial: any, typeUpdates: any, options: any, metadata: any, cb: any) {
    const keyframeUpdates = (Bytecode as any).unserializeValue(keyframeUpdatesSerial, (ref: any) => this.evaluateReference(ref)); return (this as any).project.updateHook('updateKeyframesAndTypes', this.getRelpath(), (Bytecode as any).serializeValue(keyframeUpdates), typeUpdates, options, metadata, (fire: any) => {
      const unlockedDesigns: any = {}; if (options.setElementLockStatus) {
        for (const elID in options.setElementLockStatus) {
          const node = this.findTemplateNodeByComponentId(this.getReifiedBytecode().template, elID); if (!node || !node.attributes[HAIKU_SOURCE_ATTRIBUTE])
            continue; const lockStatus = options.setElementLockStatus[elID]; if (!lockStatus && node.attributes[HAIKU_SOURCE_ATTRIBUTE].endsWith(SYNC_LOCKED_ID_SUFFIX)) { node.attributes[HAIKU_SOURCE_ATTRIBUTE] = node.attributes[HAIKU_SOURCE_ATTRIBUTE].replace(SYNC_LOCKED_ID_SUFFIX, ''); unlockedDesigns[node.attributes[HAIKU_SOURCE_ATTRIBUTE]] = true }
          else if (lockStatus && !node.attributes[HAIKU_SOURCE_ATTRIBUTE].endsWith(SYNC_LOCKED_ID_SUFFIX)) { node.attributes[HAIKU_SOURCE_ATTRIBUTE] = node.attributes[HAIKU_SOURCE_ATTRIBUTE] + SYNC_LOCKED_ID_SUFFIX }
        }
      } return this.updateKeyframesActual(keyframeUpdates, { unlockedDesigns }, metadata, (err: any) => {
        if (err) { logger.error(`[active component (${(this as any).project.getAlias()})]`, err); return cb(err) } return this.updateTypesActual(typeUpdates, metadata, (err2: any) => {
          if (err2) { logger.error(`[active component (${(this as any).project.getAlias()})]`, err2); return cb(err2) } return this.reload({ hardReload: (this as any).project.isRemoteRequest(metadata), forceFlush: !!metadata.cursor, hotComponents: keyframeUpdatesToHotComponentDescriptors(keyframeUpdates), clearCacheOptions: { doClearEntityCaches: !!metadata.cursor }, customRehydrate: () => {
            const componentIds: any = {}; for (const timelineName in keyframeUpdates) { for (const componentId in keyframeUpdates[timelineName]) { componentIds[componentId] = true } } for (const id in typeUpdates) componentIds[id] = true; if (options.setElementLockStatus) { for (const elID in options.setElementLockStatus) componentIds[elID] = true } for (const id in componentIds) {
              const el = this.findElementByComponentId(id); if (el)
                el.rehydrateRows()
            }
          } }, null, () => { fire(); return cb() })
        })
      })
    })
  }

  createKeyframe(componentId: string, timelineName: string, elementName: any, propertyName: string, keyframeStartMs: number, keyframeValueSerial: any, keyframeCurveSerial: any, keyframeEndMs: number, keyframeEndValueSerial: any, options: any, metadata: any, cb: any) {
    const keyframeValue = (Bytecode as any).unserializeValue(keyframeValueSerial, (ref: any) => this.evaluateReference(ref)); const keyframeCurve = (Bytecode as any).unserializeValue(keyframeCurveSerial, (ref: any) => this.evaluateReference(ref)); const keyframeEndValue = (Bytecode as any).unserializeValue(keyframeEndValueSerial, (ref: any) => this.evaluateReference(ref)); const element = this.findElementByComponentId(componentId); const actualKeyframeStartMs = element && !(Property as any).canHaveKeyframes(propertyName, element) ? 0 : keyframeStartMs; return (this as any).project.updateHook('createKeyframe', this.getRelpath(), componentId, timelineName, elementName, propertyName, actualKeyframeStartMs, (Bytecode as any).serializeValue(keyframeValue), (Bytecode as any).serializeValue(keyframeCurve), keyframeEndMs, (Bytecode as any).serializeValue(keyframeEndValue), options, metadata, (fire: any) => {
      const unlockedDesigns: any = {}; if (options && options.setElementLockStatus) {
        for (const elID in options.setElementLockStatus) {
          const node = this.findTemplateNodeByComponentId(this.getReifiedBytecode().template, elID); if (!node || !node.attributes[HAIKU_SOURCE_ATTRIBUTE])
            continue; const lockStatus = options.setElementLockStatus[elID]; if (!lockStatus && node.attributes[HAIKU_SOURCE_ATTRIBUTE].endsWith(SYNC_LOCKED_ID_SUFFIX)) { node.attributes[HAIKU_SOURCE_ATTRIBUTE] = node.attributes[HAIKU_SOURCE_ATTRIBUTE].replace(SYNC_LOCKED_ID_SUFFIX, ''); unlockedDesigns[node.attributes[HAIKU_SOURCE_ATTRIBUTE]] = true }
          else if (lockStatus && !node.attributes[HAIKU_SOURCE_ATTRIBUTE].endsWith(SYNC_LOCKED_ID_SUFFIX)) { node.attributes[HAIKU_SOURCE_ATTRIBUTE] = node.attributes[HAIKU_SOURCE_ATTRIBUTE] + SYNC_LOCKED_ID_SUFFIX }
        }
      } return this.createKeyframeActual(componentId, timelineName, elementName, propertyName, actualKeyframeStartMs, keyframeValue, keyframeCurve, keyframeEndMs, keyframeEndValue, metadata, (err: any) => {
        if (err) { logger.error(`[active component (${(this as any).project.getAlias()})]`, err); return cb(err) } return this.reload({ hardReload: true, clearCacheOptions: { doClearEntityCaches: true }, customRehydrate: () => {
          if ((this as any).project.isRemoteRequest(metadata)) { this.rehydrate(); return } if (!element)
            return; const row = element.getPropertyRowByPropertyName(propertyName); if (!row)
            return; row.getKeyframes().forEach((keyframe: any) => keyframe.updateOwnMetadata()); row.rehydrate()
        } }, null, () => { fire(); return cb() })
      })
    })
  }

  createKeyframeActual(componentId: string, timelineName: string, elementName: any, propertyName: string, keyframeStartMs: number, keyframeValue: any, keyframeCurve: any, keyframeEndMs: number, keyframeEndValue: any, metadata: any, cb: any) { return this.performComponentWork((bytecode: any, mana: any, done: any) => { const host = (this as any).$instance; const states = (host && host.getStates()) || {}; (Bytecode as any).createKeyframe(bytecode, componentId, timelineName, elementName, propertyName, keyframeStartMs, keyframeValue, keyframeCurve, keyframeEndMs, keyframeEndValue, host, states); this.ensureZerothKeyframe(bytecode, timelineName, componentId, propertyName, false); if (experimentIsEnabled(Experiment.AutoTweenNewKeyframes)) { (Bytecode as any).addDefaultCurveIfNecessary(bytecode, timelineName, (Template as any).buildHaikuIdSelector(componentId), keyframeStartMs, propertyName, componentId, elementName) } done() }, cb) }
  deleteKeyframe(componentId: string, timelineName: string, propertyName: string, keyframeMs: number, metadata: any, cb: any) {
    return (this as any).project.updateHook('deleteKeyframe', this.getRelpath(), componentId, timelineName, propertyName, keyframeMs, metadata, (fire: any) => {
      return this.deleteKeyframeActual(componentId, timelineName, propertyName, keyframeMs, metadata, (err: any) => {
        if (err) { logger.error(`[active component (${(this as any).project.getAlias()})]`, err); return cb(err) } return this.reload({ hardReload: true, clearCacheOptions: { doClearEntityCaches: true }, customRehydrate: () => {
          if ((this as any).project.isRemoteRequest(metadata)) { this.rehydrate(); return } const element = this.findElementByComponentId(componentId); if (!element)
            return; const row = element.getPropertyRowByPropertyName(propertyName); if (!row)
            return; row.getKeyframes().forEach((keyframe: any) => keyframe.updateOwnMetadata()); row.rehydrate()
        } }, null, () => { fire(); return cb() })
      })
    })
  }

  deleteKeyframeActual(componentId: string, timelineName: string, propertyName: string, keyframeMs: number, metadata: any, cb: any) { return this.performComponentWork((bytecode: any, mana: any, done: any) => { (Bytecode as any).deleteKeyframe(bytecode, componentId, timelineName, propertyName, keyframeMs); this.ensureZerothKeyframe(bytecode, timelineName, componentId, propertyName, true); done() }, cb) }
  get nextSuggestedGroupName() {
    const reservations: number[] = []; this.getElements().forEach((element: any) => {
      const title = element.getTitle(); if (!title || typeof title !== 'string')
        return; const matches = element.getTitle().match(/^group (\d+)$/i); if (matches)
        reservations.push(Number(matches[1]))
    }); const next = Math.max(...reservations); return `Group ${isFinite(next) ? next + 1 : 1}`
  }

  groupElements(componentIds: string[], groupMana: any, coords: any, metadata: any, cb: any) { return (this as any).project.updateHook('groupElements', this.getRelpath(), componentIds, groupMana, coords, metadata, (fire: any) => { return this.groupElementsActual(componentIds, groupMana, coords, metadata, (err: any, groupComponentId: string) => { if (err) { logger.error(`[active component (${(this as any).project.getAlias()})]`, err); return cb(err) } return this.reload({ hardReload: true, clearCacheOptions: { doClearEntityCaches: true } }, null, () => { fire(null, groupComponentId); this.findElementByComponentId(groupComponentId).select(metadata); return cb() }) }) }) }
  groupElementsActual(componentIds: string[], groupManaIn: any, coords: any, metadata: any, cb: any) {
    const groupMana = lodash.cloneDeep(groupManaIn); const originalTimeline = this.getTimelineDescriptor(this.getCurrentTimelineName()); return this.performComponentWork((bytecode: any, mana: any, done: any) => {
      const timelineName = this.getInstantiationTimelineName(); const timelineTime = this.getInstantiationTimelineTime(); const groupComponentId = this.instantiateManaInBytecode(groupMana, bytecode, {}, coords); const nodesToRegroup: any[] = []; for (let i = mana.children.length - 1; i >= 0; i--) {
        const node = mana.children[i]; if (!node.attributes)
          continue; if (componentIds.includes(node.attributes[HAIKU_ID_ATTRIBUTE])) {
          const timelineSelector = `haiku:${node.attributes[HAIKU_ID_ATTRIBUTE]}`; nodesToRegroup.push(node); mana.children.splice(i, 1); if (!originalTimeline[timelineSelector])
            continue; const propertyGroup = Object.keys(originalTimeline[timelineSelector]).reduce((accumulator: any, propertyName) => { if ((LAYOUT_3D_SCHEMA as any)[propertyName]) { accumulator[propertyName] = { 0: { value: this.getComputedPropertyValue(mana, node.attributes[HAIKU_ID_ATTRIBUTE], timelineName, this.getCurrentTimelineTime(), propertyName, undefined) } } } return accumulator }, {}); (Bytecode as any).replaceTimelinePropertyGroups(bytecode, timelineName, timelineSelector, propertyGroup)
        }
      } groupMana.children[0].children = nodesToRegroup; const stackingInfo = (Template as any).getStackingInfo(bytecode, mana, timelineName, timelineTime); const stackObject = this.grabStackObjectFromStackingInfo(stackingInfo, groupComponentId); const ourStackObject = stackObject && stackObject.ourStackObject; if (ourStackObject)
        stackingInfo.push(ourStackObject); else logger.warn(`[active component] stack object missing at ${timelineName} ${timelineTime}`); this.setZIndicesForStackingInfo(bytecode, timelineName, timelineTime, stackingInfo); done(null, groupComponentId)
    }, cb)
  }

  ungroupElements(componentId: string, nodes: any[], metadata: any, cb: any) { return (this as any).project.updateHook('ungroupElements', this.getRelpath(), componentId, nodes, metadata, (fire: any) => { const clonedNodes = lodash.cloneDeep(nodes); return this.ungroupElementsActual(componentId, clonedNodes, metadata, (err: any, ungroupedComponentIds: any[]) => { if (err) { logger.error(`[active component (${(this as any).project.getAlias()})]`, err); return cb(err) } return this.reload({ hardReload: true, clearCacheOptions: { doClearEntityCaches: true } }, null, () => { fire(null, ungroupedComponentIds); return cb() }) }) }) }
  ungroupElementsActual(componentId: string, nodes: any[], metadata: any, cb: any) { return this.performComponentWork((bytecode: any, mana: any, done: any) => { const updatedComponentIds = nodes.map((node) => { const newId = this.instantiateManaInBytecode(node, bytecode, {}, undefined); (Template as any).visitManaTree(node, (elementName: any, attributes: any, children: any, componentMana: any) => { if (attributes && attributes['haiku-transclude']) { const originalComponent = this.getTemplateNodesByComponentId()[attributes['haiku-transclude']]; if (originalComponent) { children.push(...originalComponent.children); if (elementName === '__component__') { componentMana.elementName = originalComponent.elementName; attributes['haiku-var'] = originalComponent.attributes['haiku-var'] } } delete attributes['haiku-transclude'] } }); return newId }); this.deleteElementImpl(mana, componentId); done(null, updatedComponentIds) }, cb) }
  upsertStateValue(stateName: string, stateDescriptorSerial: any, metadata: any, cb: any) { const stateDescriptor = (Bytecode as any).unserializeValue(stateDescriptorSerial, (ref: any) => this.evaluateReference(ref)); return (this as any).project.updateHook('upsertStateValue', this.getRelpath(), stateName, (Bytecode as any).serializeValue(stateDescriptor), metadata, (fire: any) => { stateDescriptor.edited = true; return this.upsertStateValueActual(stateName, stateDescriptor, metadata, (err: any) => { if (err) { logger.error(`[active component (${(this as any).project.getAlias()})]`, err); return cb(err) } return this.reload({ hardReload: (this as any).project.isRemoteRequest(metadata), forceFlush: true, clearCacheOptions: { doClearEntityCaches: true, clearStates: true } }, null, () => { fire(); return cb() }) }) }) }
  upsertStateValueActual(stateName: string, stateDescriptor: any, metadata: any, cb: any) { return this.performComponentWork((bytecode: any, mana: any, done: any) => { (Bytecode as any).upsertStateValue(bytecode, stateName, stateDescriptor); done() }, cb) }
  deleteStateValue(stateName: string, metadata: any, cb: any) { return (this as any).project.updateHook('deleteStateValue', this.getRelpath(), stateName, metadata, (fire: any) => { return this.deleteStateValueActual(stateName, metadata, (err: any) => { if (err) { logger.error(`[active component (${(this as any).project.getAlias()})]`, err); return cb(err) } return this.reload({ hardReload: (this as any).project.isRemoteRequest(metadata), forceFlush: true, clearCacheOptions: { doClearEntityCaches: true, clearStates: true } }, null, () => { fire(); return cb() }) }) }) }
  deleteStateValueActual(stateName: string, metadata: any, cb: any) { return this.performComponentWork((bytecode: any, mana: any, done: any) => { (Bytecode as any).deleteStateValue(bytecode, stateName); done() }, cb) }
  zShiftIndices(componentId: string, timelineName: string, timelineTime: number, newIndex: number, metadata: any, cb: any) { return (this as any).project.updateHook('zShiftIndices', this.getRelpath(), componentId, timelineName, timelineTime, newIndex, metadata, (fire: any) => { return this.zShiftIndicesActual(componentId, timelineName, timelineTime, newIndex, metadata, (err: any) => { if (err) { logger.error(`[active component (${(this as any).project.getAlias()})]`, err); return cb(err) } return this.reload({ hardReload: (this as any).project.isRemoteRequest(metadata), forceFlush: true, clearCacheOptions: { doClearEntityCaches: true } }, null, () => { fire(); return cb() }) }) }) }
  zShiftIndicesImpl(bytecode: any, componentId: string, timelineName: string, timelineTime: number, newIndex: number) { const stackingInfo = (Template as any).getStackingInfo(bytecode, bytecode.template, timelineName, timelineTime); this.grabStackObjectFromStackingInfo(stackingInfo, componentId); stackingInfo.splice(newIndex, 0, { haikuId: componentId, zIndex: newIndex }); this.setZIndicesForStackingInfo(bytecode, timelineName, timelineTime, stackingInfo); return stackingInfo }
  zShiftIndicesActual(componentId: string, timelineName: string, timelineTime: number, newIndex: number, metadata: any, cb: any) { let stackingInfo: any; return this.performComponentTimelinesWork((bytecode: any, mana: any, timelines: any, done: any) => { stackingInfo = this.zShiftIndicesImpl(bytecode, componentId, timelineName, timelineTime, newIndex); done() }, (err: any) => { cb(err, stackingInfo) }) }
  zMoveToFront(componentId: string, timelineName: string, timelineTime: number, metadata: any, cb: any) { return (this as any).project.updateHook('zMoveToFront', this.getRelpath(), componentId, timelineName, timelineTime, metadata, (fire: any) => { return this.zMoveToFrontActual(componentId, timelineName, timelineTime, metadata, (err: any) => { if (err) { logger.error(`[active component (${(this as any).project.getAlias()})]`, err); return cb(err) } return this.reload({ hardReload: (this as any).project.isRemoteRequest(metadata), forceFlush: true, clearCacheOptions: { doClearEntityCaches: true } }, null, () => { fire(); return cb() }) }) }) }
  zMoveToFrontImpl(bytecode: any, componentId: string, timelineName: string, timelineTime: number) { const stackingInfo = (Template as any).getStackingInfo(bytecode, bytecode.template, timelineName, timelineTime); this.grabStackObjectFromStackingInfo(stackingInfo, componentId); stackingInfo.push({ haikuId: componentId, zIndex: (stackingInfo.length > 0) ? stackingInfo[stackingInfo.length - 1].zIndex + 1 : 1 }); this.setZIndicesForStackingInfo(bytecode, timelineName, timelineTime, stackingInfo); return stackingInfo }
  zMoveToFrontActual(componentId: string, timelineName: string, timelineTime: number, metadata: any, cb: any) { let stackingInfo: any; return this.performComponentTimelinesWork((bytecode: any, mana: any, timelines: any, done: any) => { stackingInfo = this.zMoveToFrontImpl(bytecode, componentId, timelineName, timelineTime); done() }, (err: any) => { cb(err, stackingInfo) }) }
  zMoveForward(componentId: string, timelineName: string, timelineTime: number, metadata: any, cb: any) { return (this as any).project.updateHook('zMoveForward', this.getRelpath(), componentId, timelineName, timelineTime, metadata, (fire: any) => { return this.zMoveForwardActual(componentId, timelineName, timelineTime, metadata, (err: any) => { if (err) { logger.error(`[active component (${(this as any).project.getAlias()})]`, err); return cb(err) } return this.reload({ hardReload: (this as any).project.isRemoteRequest(metadata), forceFlush: true, clearCacheOptions: { doClearEntityCaches: true } }, null, () => { fire(); return cb() }) }) }) }
  zMoveForwardActual(componentId: string, timelineName: string, timelineTime: number, metadata: any, cb: any) {
    let stackingInfo: any; return this.performComponentTimelinesWork((bytecode: any, mana: any, timelines: any, done: any) => {
      stackingInfo = (Template as any).getStackingInfo(bytecode, mana, timelineName, timelineTime); const stackObject = this.grabStackObjectFromStackingInfo(stackingInfo, componentId); const ourStackObject = stackObject && stackObject.ourStackObject; if (ourStackObject) { const index = stackObject.index; stackingInfo.splice(index + 1, 0, ourStackObject) }
      else {
        logger.warn(`[active component] stack object missing at ${timelineName} ${timelineTime}`)
      } this.setZIndicesForStackingInfo(bytecode, timelineName, timelineTime, stackingInfo); done()
    }, (err: any) => { cb(err, stackingInfo) })
  }

  zMoveBackward(componentId: string, timelineName: string, timelineTime: number, metadata: any, cb: any) { return (this as any).project.updateHook('zMoveBackward', this.getRelpath(), componentId, timelineName, timelineTime, metadata, (fire: any) => { return this.zMoveBackwardActual(componentId, timelineName, timelineTime, metadata, (err: any) => { if (err) { logger.error(`[active component (${(this as any).project.getAlias()})]`, err); return cb(err) } return this.reload({ hardReload: (this as any).project.isRemoteRequest(metadata), forceFlush: true, clearCacheOptions: { doClearEntityCaches: true } }, null, () => { fire(); return cb() }) }) }) }
  zMoveBackwardActual(componentId: string, timelineName: string, timelineTime: number, metadata: any, cb: any) {
    let stackingInfo: any; return this.performComponentTimelinesWork((bytecode: any, mana: any, timelines: any, done: any) => {
      stackingInfo = (Template as any).getStackingInfo(bytecode, mana, timelineName, timelineTime); const stackObject = this.grabStackObjectFromStackingInfo(stackingInfo, componentId); const ourStackObject = stackObject && stackObject.ourStackObject; if (ourStackObject) { const index = stackObject.index; stackingInfo.splice(Math.max(index - 1, 0), 0, ourStackObject) }
      else {
        logger.warn(`[active component] stack object missing at ${timelineName} ${timelineTime}`)
      } this.setZIndicesForStackingInfo(bytecode, timelineName, timelineTime, stackingInfo); done()
    }, (err: any) => { cb(err, stackingInfo) })
  }

  zMoveToBack(componentId: string, timelineName: string, timelineTime: number, metadata: any, cb: any) { return (this as any).project.updateHook('zMoveToBack', this.getRelpath(), componentId, timelineName, timelineTime, metadata, (fire: any) => { return this.zMoveToBackActual(componentId, timelineName, timelineTime, metadata, (err: any) => { if (err) { logger.error(`[active component (${(this as any).project.getAlias()})]`, err); return cb(err) } return this.reload({ hardReload: (this as any).project.isRemoteRequest(metadata), forceFlush: true, clearCacheOptions: { doClearEntityCaches: true } }, null, () => { fire(); return cb() }) }) }) }
  zMoveToBackActual(componentId: string, timelineName: string, timelineTime: number, metadata: any, cb: any) { let stackingInfo: any; return this.performComponentTimelinesWork((bytecode: any, mana: any, timelines: any, done: any) => { stackingInfo = (Template as any).getStackingInfo(bytecode, mana, timelineName, timelineTime); this.grabStackObjectFromStackingInfo(stackingInfo, componentId); stackingInfo.unshift({ haikuId: componentId, zIndex: 1 }); this.setZIndicesForStackingInfo(bytecode, timelineName, timelineTime, stackingInfo); done() }, (err: any) => { cb(err, stackingInfo) }) }
  createTimeline(timelineName: string, timelineDescriptorSerial: any, metadata: any, cb: any) { const timelineDescriptor = (Bytecode as any).unserializeValue(timelineDescriptorSerial, (ref: any) => this.evaluateReference(ref)); return (this as any).project.updateHook('createTimeline', this.getRelpath(), timelineName, (Bytecode as any).serializeValue(timelineDescriptor), metadata, (fire: any) => { return this.createTimelineActual(timelineName, timelineDescriptor, metadata, (err: any) => { if (err) { logger.error(`[active component (${(this as any).project.getAlias()})]`, err); return cb(err) } return this.reload({ hardReload: (this as any).project.isRemoteRequest(metadata), clearCacheOptions: { doClearEntityCaches: true } }, null, () => { fire(); return cb() }) }) }) }
  createTimelineActual(timelineName: string, timelineDescriptor: any, metadata: any, cb: any) { return this.performComponentWork((bytecode: any, mana: any, done: any) => { (Bytecode as any).createTimeline(bytecode, timelineName, timelineDescriptor); done() }, cb) }
  renameTimeline(timelineNameOld: string, timelineNameNew: string, metadata: any, cb: any) { return (this as any).project.updateHook('renameTimeline', this.getRelpath(), timelineNameOld, timelineNameNew, metadata, (fire: any) => { return this.renameTimelineActual(timelineNameOld, timelineNameNew, metadata, (err: any) => { if (err) { logger.error(`[active component (${(this as any).project.getAlias()})]`, err); return cb(err) } return this.reload({ hardReload: (this as any).project.isRemoteRequest(metadata), clearCacheOptions: { doClearEntityCaches: true } }, null, () => { fire(); return cb() }) }) }) }
  renameTimelineActual(timelineNameOld: string, timelineNameNew: string, metadata: any, cb: any) { return this.performComponentWork((bytecode: any, mana: any, done: any) => { (Bytecode as any).renameTimeline(bytecode, timelineNameOld, timelineNameNew); done() }, cb) }
  deleteTimeline(timelineName: string, metadata: any, cb: any) { return (this as any).project.updateHook('deleteTimeline', this.getRelpath(), timelineName, metadata, (fire: any) => { return this.deleteTimelineActual(timelineName, metadata, (err: any) => { if (err) { logger.error(`[active component (${(this as any).project.getAlias()})]`, err); return cb(err) } return this.reload({ hardReload: (this as any).project.isRemoteRequest(metadata), clearCacheOptions: { doClearEntityCaches: true } }, null, () => { fire(); return cb() }) }) }) }
  deleteTimelineActual(timelineName: string, metadata: any, cb: any) { return this.performComponentWork((bytecode: any, mana: any, done: any) => { (Bytecode as any).deleteTimeline(bytecode, timelineName); done() }, cb) }
  duplicateTimeline(timelineName: string, metadata: any, cb: any) { return (this as any).project.updateHook('duplicateTimeline', this.getRelpath(), timelineName, metadata, (fire: any) => { return this.duplicateTimelineActual(timelineName, metadata, (err: any) => { if (err) { logger.error(`[active component (${(this as any).project.getAlias()})]`, err); return cb(err) } return this.reload({ hardReload: (this as any).project.isRemoteRequest(metadata), clearCacheOptions: { doClearEntityCaches: true } }, null, () => { fire(); return cb() }) }) }) }
  duplicateTimelineActual(timelineName: string, metadata: any, cb: any) { return this.performComponentWork((bytecode: any, mana: any, done: any) => { (Bytecode as any).duplicateTimeline(bytecode, timelineName); done() }, cb) }
  changePlaybackSpeed(framesPerSecond: number, metadata: any, cb: any) { return (this as any).project.updateHook('changePlaybackSpeed', this.getRelpath(), framesPerSecond, metadata, (fire: any) => { return this.changePlaybackSpeedActual(framesPerSecond, metadata, (err: any) => { if (err) { logger.error(`[active component (${(this as any).project.getAlias()})]`, err); return cb(err) } return this.reload({ hardReload: (this as any).project.isRemoteRequest(metadata), clearCacheOptions: { doClearEntityCaches: true } }, null, () => { fire(); return cb() }) }) }) }
  changePlaybackSpeedActual(framesPerSecond: number, metadata: any, cb: any) { return this.performComponentWork((bytecode: any, mana: any, done: any) => { (Bytecode as any).changePlaybackSpeed(bytecode, framesPerSecond); done() }, cb) }
  getNormalizedBytecodeSHA() { return (CryptoUtils as any).sha256(this.getNormalizedBytecodeJSON()) }
  getNormalizedBytecode() { return (AST as any).normalizeBytecode(this.getReifiedBytecode()) }
  getNormalizedBytecodeJSON() { return jss(this.getNormalizedBytecode()) }
  dump() { const relpath = this.getRelpath(); const aid = this.getArtboard().getElementHaikuId(); return `${relpath}(${this.getMount().getRenderId()})@${aid}/${this.interactionMode}` }
  checkSustainedWarnings() { this.sustainedWarningsChecker.checkAndGetAllSustainedWarnings() }
  syncCode(currentEditorContents: string, metadata: any, cb: any) {
    const absPath = this.fetchActiveBytecodeFile().getAbspath(); return (Lock as any).request((Lock as any).LOCKS.FileReadWrite(absPath), false, (release: any) => {
      return (this as any).project.updateHook('syncCode', this.getRelpath(), currentEditorContents, metadata, (fire: any) => {
        try { const bytecode = (ModuleWrapper as any).testLoadBytecode(currentEditorContents, absPath); this.fetchActiveBytecodeFile().updateContents(currentEditorContents); this.handleUpdatedBytecode(bytecode) }
        catch (requireError) { release(); return cb(requireError) } release(); fire(); return this.moduleSync(cb)
      })
    })
  }

  static DEFAULT_OPTIONS = { required: { uid: true, file: true, project: true, relpath: true, scenename: true } }
}

;(BaseModel as any).extend(ActiveComponent)
;(ActiveComponent as any).buildPrimaryKey = (folder: string, scenename: string) => `${folder.replace(/\\/g, '/')}::${scenename}`
;(ActiveComponent as any).memorySafeBytecode = (bytecode: any, instance: any) => {
  const safe: any = {}; for (const key in bytecode) {
    if (key === 'template')
      safe[key] = clone(bytecode[key], instance); else safe[key] = bytecode[key]
  } return safe
}

export default ActiveComponent
export { ActiveComponent }

const Artboard = require('./Artboard')
const Asset = require('./Asset')
const AST = require('./AST')
const Bytecode = require('./Bytecode')
const Element = require('./Element')
const ElementSelectionProxy = require('./ElementSelectionProxy')
const File = require('./File')
const ImageComponent = require('./ImageComponent')
const InstalledComponent = require('./InstalledComponent')
const Keyframe = require('./Keyframe')
const ModuleWrapper = require('./ModuleWrapper')
const MountElement = require('./MountElement')
const Property = require('./Property')
const PseudoFile = require('./PseudoFile')
const Row = require('./Row')
const SelectionMarquee = require('./SelectionMarquee')
const Template = require('./Template')
const Timeline = require('./Timeline')
const TimelineProperty = require('./TimelineProperty')
