/* eslint-disable node/prefer-global/process */
import os from 'node:os'
import Mixpanel from 'mixpanel'

import logger from './LoggerInstance'

const tokens = { development: '53f3639f564804dcb710fd18511d1c0b', production: '6f31d4f99cf71024ce27c3e404a79a61' }
const token = (process.env.NODE_ENV === 'production') ? tokens.production : tokens.development
const mixpanel = Mixpanel.init(token, { protocol: 'https' })
;(mixpanel as any).token = token

const defaultPayload = { app: 'haiku', arch: os.arch(), platform: os.platform(), type: os.type(), process: (typeof window === 'undefined') ? 'renderer' : 'main', node_env: process.env.NODE_ENV, release_environment: process.env.NODE_ENV, release_branch: process.env.HAIKU_RELEASE_BRANCH, release_platform: process.env.HAIKU_RELEASE_PLATFORM, release_version: process.env.HAIKU_RELEASE_VERSION, distinct_id: void 0 }
;(mixpanel as any).mergeToPayload = function mergeToPayload(keepPayload: Record<string, any>) {
  return Object.assign(defaultPayload, keepPayload)
}
function _getPayload(_eventName: string, eventPayload: any) {
  return Object.assign({}, defaultPayload, eventPayload)
}
function _safeStringify(obj: any) {
  try {
    return JSON.stringify(obj)
  }
  catch { return null }
}
;(mixpanel as any).haikuTrack = function haikuTrack(eventName: string, eventPayload?: any) {
  const finalPayload = _getPayload(eventName, eventPayload)
  logger.info('[mixpanel]', eventName)
  return mixpanel.track(eventName, finalPayload)
}
const trackedEvents: Record<string, boolean> = {}
;(mixpanel as any).haikuTrackOnce = function haikuTrackOnce(eventName: string, eventPayload?: any) { const candidatePayload = _getPayload(eventName, eventPayload); const payloadString = _safeStringify(candidatePayload); if (payloadString) { if (!trackedEvents[payloadString]) { trackedEvents[payloadString] = true; (mixpanel as any).haikuTrack(eventName, eventPayload) } } }
export default mixpanel
