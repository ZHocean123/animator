// Electron exports
export { default as PopoverMenu, PopoverMenu as PopoverMenuClass } from './electron/PopoverMenu'
// Re-export specific modules for compatibility
export { default as Globals } from './Globals'
export * from './helpers/doesValueImplyExpression'
export * from './helpers/doPositionsMatch'

export * from './helpers/ensureEq'
export * from './helpers/ensureRet'
export * from './helpers/eqToRet'
export * from './helpers/ExprSigns'
// Helper exports
export { default as formatSeconds } from './helpers/formatSeconds'
export * from './helpers/getDomEventPosition'
export * from './helpers/getDomNodeRect'
export * from './helpers/getLocalDomEventPosition'
export * from './helpers/humanizePropertyName'
export * from './helpers/inferUnitOfValue'
export * from './helpers/isElectron'
export { default as isNumeric } from './helpers/isNumeric'
export * from './helpers/isPositionOutside'
export * from './helpers/leftTrim'
export * from './helpers/retToEq'
export { default as truncate } from './helpers/truncate'
export * from './helpers/types'
export { InteractionMode, isCodeEditorMode, isEditMode, isPreviewMode, showGlassOnStage } from './interactionModes'
export * from './Mixpanel'

// Core exports
export { default as Palette } from './Palette'
// React component exports (only export modules with proper default/named exports)
export * from './react/Bezier'

export { default as BezierEditor } from './react/Bezier/BezierEditor'
// Note: Some components may need to be imported directly from their files:
// - ReactPopoverMenu from './react/PopoverMenu'
// - ExternalLink from './react/ExternalLink'
// - LoadingButton from './react/LoadingButton'
// - LoadingTopBar from './react/LoadingTopBar'
// - Paginator from './react/Paginator'
// - RevealPanel from './react/RevealPanel'
// - Tooltip from './react/Tooltip'
// - TooltipBasic from './react/TooltipBasic'
export { CodeBox } from './react/CodeBox'
export { ExternalLink } from './react/ExternalLink'
// Note: Using specific exports instead of wildcard to avoid build issues
export * from './react/icons'
// curve SVG exports
export {
  type CurveProps,
  EaseInBounceSVG,
  EaseInElasticSVG,
  EaseInOutBounceSVG,
  EaseInOutElasticSVG,
  EaseOutBounceSVG,
  EaseOutElasticSVG,
} from './react/icons/CurveSVGS'
export { LoadingTopBar } from './react/LoadingTopBar'
export * from './react/Modal'
export * from './react/OtherIcons'
export { Paginator } from './react/Paginator'
export { PrettyScroll } from './react/PrettyScroll'
export { RevealPanel } from './react/RevealPanel'

export * from './react/ShareModal'
export * from './react/ShareModal/ShareOptions'
export * from './SharedStyles'

// Icons need to be imported directly from their files
// Inspector panels need to be imported directly from their files
