import { Experiment, experimentIsEnabled } from 'haiku-common'
import lodash from 'lodash'
import logger from './../utils/LoggerInstance'
import BaseModel from './BaseModel'
import Lock from './Lock'

const TIMER_TIMEOUT = 64
const PROPERTY_GROUP_ACCUMULATION_TIME = 500
const MAX_UNDOABLES_LEN = 50

const SNAPSHOTTED_UNDOABLES: Record<string, boolean> = {
  groupElements: true,
  ungroupElements: true,
  popBytecodeSnapshot: true,
  updateKeyframesAndTypes: true,
}

const ACCUMULATORS: Record<string, (params: any[], match: any) => void> = {
  updateKeyframes: (params: any[], match: any) => {
    const updates1 = match.params[2]
    const updates2 = params[2]
    for (const timelineName in updates2) {
      if (!updates1[timelineName])
        updates1[timelineName] = {}
      for (const componentId in updates2[timelineName]) {
        if (!updates1[timelineName][componentId])
          updates1[timelineName][componentId] = {}
        for (const propertyName in updates2[timelineName][componentId]) {
          if (!updates1[timelineName][componentId][propertyName])
            updates1[timelineName][componentId][propertyName] = {}
          for (const keyframeMs in updates2[timelineName][componentId][propertyName]) {
            updates1[timelineName][componentId][propertyName][keyframeMs] = updates2[timelineName][componentId][propertyName][keyframeMs]
          }
        }
      }
    }
  },
}

const INVERTER_ACCUMULATORS: Record<string, (baseInverter: any, newInverter: any) => void> = {
  updateKeyframes: (baseInverter: any, newInverter: any) => {
    const basis1 = baseInverter.params[1]
    const basis2 = newInverter.params[1]
    for (const timelineName in basis2) {
      if (!basis1[timelineName])
        basis1[timelineName] = {}
      for (const componentId in basis2[timelineName]) {
        if (!basis1[timelineName][componentId])
          basis1[timelineName][componentId] = {}
        for (const propertyName in basis2[timelineName][componentId]) {
          if (!basis1[timelineName][componentId][propertyName])
            basis1[timelineName][componentId][propertyName] = {}
          for (const keyframeMs in basis2[timelineName][componentId][propertyName]) {
            if (basis1[timelineName][componentId][propertyName][keyframeMs] !== undefined)
              continue
            basis1[timelineName][componentId][propertyName][keyframeMs] = basis2[timelineName][componentId][propertyName][keyframeMs]
          }
        }
      }
    }
  },
}

const shouldAccumulate = (method: string, params: any[]) => ACCUMULATORS[method] && !params[params.length - 2].cursor

export default class ActionStack extends (BaseModel as any) {
  stopped: boolean
  undoables: any[]
  redoables: any[]
  actions: any[]
  accumulatorTimeouts: Record<string, any>
  accumulatedInverters: Record<string, any>
  actionStackIndices: Record<string, number>
  project: any

  constructor(props: any, opts: any) {
    super(props, opts)
    this.resetData()
    this.processActions()
  }

  resetData() {
    this.stopped = false
    this.undoables = []
    this.redoables = []
    this.actions = []
    this.accumulatorTimeouts = {}
    this.accumulatedInverters = {}
    this.actionStackIndices = { glass: 0, timeline: 0, creator: 0, master: 0 }
  }

  stop() { this.stopped = true }

  processActions() {
    const action = this.actions[0]
    if (!action)
      return (this.stopped) ? null : setTimeout(() => this.processActions(), TIMER_TIMEOUT)
    delete this.accumulatorTimeouts[action.method]
    if (shouldAccumulate(action.method, action.params)) {
      if (action.timestamp && (Date.now() - action.timestamp) < PROPERTY_GROUP_ACCUMULATION_TIME) {
        this.accumulatorTimeouts[action.method] = setTimeout(() => this.processActions(), TIMER_TIMEOUT)
        return
      }
    }
    this.shiftAndProcessLatestAction()
  }

  forceAccumulation() {
    for (const method in this.accumulatorTimeouts) {
      clearTimeout(this.accumulatorTimeouts[method])
      delete this.accumulatorTimeouts[method]
      this.shiftAndProcessLatestAction()
    }
  }

  shiftAndProcessLatestAction() {
    const action = this.actions.shift()
    if (action)
      this.processAction(action)
    else this.processActions()
  }

  processAction(action: any) {
    const { method, params, before } = action
    if (before)
      before()
    return (this as any).emit('next', method, params, () => this.processActions())
  }

  enqueueAction(method: string, params: any[], before?: () => void) {
    if (shouldAccumulate(method, params)) {
      for (let i = this.actions.length - 1; i >= 0; i--) {
        const action = this.actions[i]
        if (action.method === method && action.params[0] === params[0] && action.params[1] === params[1]) {
          ACCUMULATORS[method](params, action)
          action.timestamp = Date.now()
          return
        }
      }
    }
    this.actions.push({ timestamp: Date.now(), method, params, before })
    if (this.actions.length < 2 && !shouldAccumulate(method, params))
      this.shiftAndProcessLatestAction()
  }

  addDoable(doable: any, stack: any[]) {
    stack.push(doable)
    if (stack.length > MAX_UNDOABLES_LEN)
      stack.shift()
    this.project.emit('update', 'updateMenu')
  }

  addUndoable(undoable: any, ac: any) { this.addDoable(Object.assign(undoable, { ac }), this.undoables) }
  addRedoable(redoable: any, ac: any) { this.addDoable(Object.assign(redoable, { ac }), this.redoables) }

  popDoable(stack: any[], ac?: any) {
    if (!ac)
      return stack.pop()
    const last = stack[stack.length - 1]
    if (last && !last.ac)
      return stack.pop()
    for (let i = stack.length - 1; i >= 0; i--) {
      const entry = stack[i]; if (entry.ac === ac)
        return stack.splice(i, 1)[0]
    }
    return null
  }

  popUndoable(ac?: any) { return this.popDoable(this.undoables, ac) }
  popRedoable(ac?: any) { return this.popDoable(this.redoables, ac) }
  getUndoables() { return this.undoables }
  getRedoables() { return this.redoables }

  buildMethodInverterAction(ac: any, method: string, params: any[], metadata: any, when: 'before' | 'after', output?: any) {
    if ((ActionStack as any).METHOD_INVERTERS[method] && (ActionStack as any).METHOD_INVERTERS[method][when]) {
      const inversion = (ActionStack as any).METHOD_INVERTERS[method][when].call(this, ac, params.slice(1), output)
      if (inversion) {
        const [relpath] = params
        inversion.params.unshift(relpath)
        inversion.params.push(metadata)
        if (when === 'before' && INVERTER_ACCUMULATORS[method]) {
          if (this.accumulatedInverters[method])
            INVERTER_ACCUMULATORS[method](this.accumulatedInverters[method], inversion)
          else this.accumulatedInverters[method] = inversion
        }
      }
      return inversion
    }
    return null
  }

  shouldOrderRemoteUpdate(metadata: any) { return experimentIsEnabled(Experiment.OrderedActionStack) && metadata.hasOwnProperty('actionStackIndex') && this.project.isRemoteRequest(metadata) }
  advanceActionStackIndexForMetadata(metadata: any) { this.actionStackIndices[metadata.from]++ }
  orderedAction(method: string, metadata: any, cb: () => void) {
    if (this.shouldOrderRemoteUpdate(metadata)) {
      if (this.actionStackIndices[metadata.from] !== metadata.actionStackIndex)
        return setTimeout(() => { this.orderedAction(method, metadata, cb) }, TIMER_TIMEOUT)
      this.advanceActionStackIndexForMetadata(metadata); return cb()
    }
    return cb()
  }

  handleActionInitiation(method: string, params: any[], metadata: any, continuation: (handle: (fn: (err?: any, out?: any) => void) => void) => void) {
    if (this.project.isRemoteRequest(metadata)) {
      if (metadata.cursor === (ActionStack as any).CURSOR_MODES.redo)
        this.popUndoable(this.project.getCurrentActiveComponent())
      else if (metadata.cursor === (ActionStack as any).CURSOR_MODES.undo)
        this.popRedoable(this.project.getCurrentActiveComponent())
    }
    const ac = (typeof params[0] === 'string') ? this.project.findActiveComponentBySourceIfPresent(params[0]) : null
    const finish = (inverter: any) => this.orderedAction(method, metadata, () => continuation((err: any, out: any) => {
      if (err)
        return
      if (!inverter)
        inverter = this.buildMethodInverterAction(ac, method, params, metadata, 'after', out)
      else delete this.accumulatedInverters[method]
      let did = false
      if (inverter) {
        if (!metadata.cursor) { did = true; this.redoables.length = 0; this.addUndoable(inverter, ac) }
        else if (metadata.cursor === (ActionStack as any).CURSOR_MODES.undo) { did = true; this.addUndoable(inverter, ac) }
        else if (metadata.cursor === (ActionStack as any).CURSOR_MODES.redo) { did = true; this.addRedoable(inverter, ac) }
        if (did) { (logger as any).info('[action stack] inversion :::', metadata.cursor, inverter.method, this.getUndoables().length, '<~u|r~>', this.getRedoables().length) }
      }
    }))
    if (SNAPSHOTTED_UNDOABLES[method])
      return ac.pushBytecodeSnapshot(() => finish({ method: ac.popBytecodeSnapshot.name, params: [params[0], metadata] }))
    return finish(this.buildMethodInverterAction(ac, method, params, metadata, 'before'))
  }

  undo(options: any, metadata: any, cb: (err?: any, out?: any) => void) {
    this.forceAccumulation()
    if (this.getUndoables().length < 1) {
      return cb()
      (logger as any).info(`[action stack] undo (us=${this.getUndoables().length})`)
    }
    return (Lock as any).request((Lock as any).LOCKS.ActionStackUndoRedo, false, (release: () => void) => {
      const undoable = this.popUndoable(this.project.getCurrentActiveComponent())
      if (!undoable) { release(); return cb() }
      const { method, params, ac } = undoable
      if (!ac) { release(); return cb() }
      const m = lodash.assign({}, params.pop(), { cursor: 'redo', from: this.project.getAlias() })
      params.push(m)
      return ac[method](...params.slice(1), (err: any, out: any) => { release(); return cb(err, out) })
    })
  }

  redo(options: any, metadata: any, cb: (err?: any, out?: any) => void) {
    this.forceAccumulation()
    if (this.getRedoables().length < 1) {
      return cb()
      (logger as any).info(`[action stack] redo (rs=${this.getRedoables().length})`)
    }
    return (Lock as any).request((Lock as any).LOCKS.ActionStackUndoRedo, false, (release: () => void) => {
      const redoable = this.popRedoable(this.project.getCurrentActiveComponent())
      if (!redoable) { release(); return cb() }
      const { method, params, ac } = redoable
      if (!ac) { release(); return cb() }
      const m = lodash.assign({}, params.pop(), { cursor: 'undo', from: this.project.getAlias() })
      params.push(m)
      return ac[method](...params.slice(1), (err: any, out: any) => { release(); return cb(err, out) })
    })
  }

  static DEFAULT_OPTIONS = { required: { uid: true, project: true } }
}

;(BaseModel as any).extend(ActionStack)

;(ActionStack as any).METHOD_INVERTERS = {
  conglomerateComponent: { before: (ac: any, [componentIds, name, size, translation, coords, propertiesSerial, options]: any[]) => ({ method: ac.unconglomerateComponent.name, params: [componentIds, name, size, translation, coords, propertiesSerial, options] }) },
  unconglomerateComponent: { before: (ac: any, [componentIds, name, size, translation, coords, propertiesSerial, options]: any[]) => ({ method: ac.conglomerateComponent.name, params: [componentIds, name, size, translation, coords, propertiesSerial, options] }) },
  updateKeyframes: { before: (ac: any, [keyframeUpdates]: any[]) => { const previousUpdates = ac.snapshotKeyframeUpdates(keyframeUpdates); return { method: ac.updateKeyframes.name, params: [previousUpdates, {}] } } },
  moveKeyframes: { before: (ac: any, [keyframeMoves]: any[]) => { const previousMoves = ac.snapshotKeyframeMoves(keyframeMoves); return { method: ac.moveKeyframes.name, params: [previousMoves] } } },
  instantiateComponent: { after: (ac: any, [modpath, coords]: any[], output: any) => {
    if (output)
      return { method: ac.deleteComponents.name, params: [[output.attributes['haiku-id']]] }
  } },
  deleteComponents: { before: (ac: any, [haikuIds]: any[]) => ({ method: ac.pasteThings.name, params: [haikuIds.map((haikuId: any) => ac.findElementByComponentId(haikuId)).filter((element: any) => !!element).map((element: any) => element.clip()), { skipHashPadding: true }] }) },
  pasteThings: { after: (ac: any, _: any, { haikuIds }: any) => ({ method: ac.deleteComponents.name, params: [haikuIds] }) },
  changeKeyframeValue: { before: (ac: any, [componentId, timelineName, propertyName, keyframeMs, newValue]: any[]) => { const oldValue = ac.getKeyframeValue(componentId, timelineName, keyframeMs, propertyName); return { method: ac.changeKeyframeValue.name, params: [componentId, timelineName, propertyName, keyframeMs, oldValue] } } },
  changeSegmentCurve: { before: (ac: any, [componentId, timelineName, propertyName, keyframeMs, newCurve]: any[]) => { const oldCurve = ac.getKeyframeCurve(componentId, timelineName, keyframeMs, propertyName); return { method: ac.changeSegmentCurve.name, params: [componentId, timelineName, propertyName, keyframeMs, oldCurve] } } },
  createKeyframe: { before: (ac: any, [componentId, timelineName, elementName, propertyName, keyframeStartMs, keyframeValue, keyframeCurve, keyframeEndMs, keyframeEndValue]: any[]) => {
    const oldValue = ac.getKeyframeValue(componentId, timelineName, keyframeStartMs, propertyName); const oldCurve = ac.getKeyframeCurve(componentId, timelineName, keyframeStartMs, propertyName); if (oldValue !== undefined)
      return { method: ac.createKeyframe.name, params: [componentId, timelineName, elementName, propertyName, keyframeStartMs, oldValue, oldCurve, null, null, null] }; return { method: ac.deleteKeyframe.name, params: [componentId, timelineName, propertyName, keyframeStartMs] }
  } },
  deleteKeyframe: { before: (ac: any, [componentId, timelineName, propertyName, keyframeMs]: any[]) => { const elementName = ac.getSafeElementNameOfComponentId(componentId); const oldValue = ac.getKeyframeValue(componentId, timelineName, keyframeMs, propertyName); const oldCurve = ac.getKeyframeCurve(componentId, timelineName, keyframeMs, propertyName); return { method: ac.createKeyframe.name, params: [componentId, timelineName, elementName, propertyName, keyframeMs, oldValue, oldCurve, null, null, null] } } },
  joinKeyframes: { before: (ac: any, [componentId, timelineName, elementName, propertyName, keyframeMsLeft, keyframeMsRight, newCurve]: any[]) => ({ method: ac.splitSegment.name, params: [componentId, timelineName, elementName, propertyName, keyframeMsLeft] }) },
  splitSegment: { before: (ac: any, [componentId, timelineName, elementName, propertyName, keyframeMs]: any[]) => { const oldCurve = ac.getKeyframeCurve(componentId, timelineName, keyframeMs, propertyName); return { method: ac.joinKeyframes.name, params: [componentId, timelineName, elementName, propertyName, keyframeMs, null, oldCurve] } } },
  upsertStateValue: { before: (ac: any, [stateName, stateDescriptor]: any[]) => {
    const previousDescriptor = lodash.clone(ac.getStateDescriptor(stateName)); if (!previousDescriptor)
      return { method: ac.deleteStateValue.name, params: [stateName] }; return { method: ac.upsertStateValue.name, params: [stateName, previousDescriptor] }
  } },
  deleteStateValue: { before: (ac: any, [stateName]: any[]) => { const previousDescriptor = lodash.clone(ac.getStateDescriptor(stateName)); return { method: ac.upsertStateValue.name, params: [stateName, previousDescriptor] } } },
  zMoveToFront: { before: (ac: any, [componentId, timelineName, timelineTime]: any[]) => { const moves = ac.gatherZIndexKeyframeMoves(timelineName); return { method: ac.moveKeyframes.name, params: [moves] } } },
  zMoveForward: { before: (ac: any, [componentId, timelineName, timelineTime]: any[]) => { const moves = ac.gatherZIndexKeyframeMoves(timelineName); return { method: ac.moveKeyframes.name, params: [moves] } } },
  zMoveBackward: { before: (ac: any, [componentId, timelineName, timelineTime]: any[]) => { const moves = ac.gatherZIndexKeyframeMoves(timelineName); return { method: ac.moveKeyframes.name, params: [moves] } } },
  zMoveToBack: { before: (ac: any, [componentId, timelineName, timelineTime]: any[]) => { const moves = ac.gatherZIndexKeyframeMoves(timelineName); return { method: ac.moveKeyframes.name, params: [moves] } } },
  zShiftIndices: { before: (ac: any, [componentId, timelineName, timelineTime, newIndex]: any[]) => { const moves = ac.gatherZIndexKeyframeMoves(timelineName); return { method: ac.moveKeyframes.name, params: [moves] } } },
}

;(ActionStack as any).CURSOR_MODES = { undo: 'undo', redo: 'redo' }
;(ActionStack as any).toPOJO = (instance: any) => ({ uid: instance.uid, stopped: instance.stopped, undoables: instance.undoables, redoables: instance.redoables, actions: instance.actions })
;(ActionStack as any).fromPOJO = (pojo: any) => (ActionStack as any).upsert(pojo, {})

export { ActionStack }
