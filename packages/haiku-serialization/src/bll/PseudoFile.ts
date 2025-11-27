import BaseModel from './BaseModel'

export default class PseudoFile extends (BaseModel as any) {}

;(PseudoFile as any).DEFAULT_OPTIONS = { required: { relpath: true } }
;(BaseModel as any).extend(PseudoFile)

export { PseudoFile }
