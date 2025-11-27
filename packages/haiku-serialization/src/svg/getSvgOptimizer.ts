import Svgo from 'svgo'
import customPlugins from './plugins'

let singleton: any

const plugins: any[] = [
  'removeMetadata',
  'removeTitle',
  'removeDesc',
  'removeUselessDefs',
  'removeEmptyAttrs',
  'removeUselessStrokeAndFill',
  'removeNonInheritableGroupAttrs',
  'moveElemsAttrsToGroup',
  'removeEmptyContainers',
  'removeEmptyText',
  'removeViewBox',
  'convertStyleToAttrs',
  customPlugins,
]

export default () => {
  if (!singleton) {
    singleton = new (Svgo as any)({ full: true, floatPrecision: 3, plugins })
  }
  return singleton
}
