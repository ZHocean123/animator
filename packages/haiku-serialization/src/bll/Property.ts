import { getFallback } from '@haiku/core/lib/HaikuComponent'
import decamelize from 'decamelize'
import titlecase from 'titlecase'
import BaseModel from './BaseModel'

function decam(s: string): string {
  return decamelize(s).replace(/[\W_]/g, ' ')
}

export default class Property extends (BaseModel as any) {}

Property.DEFAULT_OPTIONS = { required: {} }
(BaseModel as any).extend(Property)

Property.assignDOMSchemaProperties = (out: Record<string, any>, element: any) => {
  const schema = Property.BUILTIN_DOM_SCHEMAS[element.getSafeDomFriendlyName()] || {}
  for (const name in schema) {
    let propertyGroup: any = null
    const nameParts = name.split('.')
    const fallback = getFallback(element.getSafeDomFriendlyName(), name)
    propertyGroup = {
      type: 'native',
      name,
      prefix: nameParts[0],
      suffix: nameParts[1],
      fallback,
      typedef: (schema as any)[name],
      mock: void 0,
      target: element,
      value: void 0,
    }
    if (propertyGroup) {
      if (nameParts[0] && nameParts[1]) {
        propertyGroup.cluster = {
          prefix: nameParts[0],
          name: Property.PREFIX_TO_CLUSTER_NAME[nameParts[0]] || nameParts[0],
        }
      }
      out[name] = propertyGroup
    }
  }
}

Property.doesPropertyGroupContainRotation = (propertyGroup: Record<string, any>) => {
  return (
    propertyGroup['rotation.x']
    || propertyGroup['rotation.y']
    || propertyGroup['rotation.z']
  )
}

Property.sort = (a: { name: string }, b: { name: string }) => a.name > b.name

Property.humanizePropertyName = (propertyName: string) => {
  if ((Property.HUMANIZED_PROP_NAMES as any)[propertyName]) {
    return (Property.HUMANIZED_PROP_NAMES as any)[propertyName]
  }
  return decam(propertyName)
}

Property.humanizePropertyNamePart = (propertyNamePart: string) => {
  if (Property.PREFIX_TO_CLUSTER_NAME[propertyNamePart]) {
    return Property.PREFIX_TO_CLUSTER_NAME[propertyNamePart]
  }
  return titlecase(decam(propertyNamePart))
}

Property.layoutSpecAsProperties = (spec: any) => {
  return {
    'shown': spec.shown,
    'opacity': spec.opacity,
    'offset.x': spec.offset.x,
    'offset.y': spec.offset.y,
    'offset.z': spec.offset.z,
    'origin.x': spec.origin.x,
    'origin.y': spec.origin.y,
    'origin.z': spec.origin.z,
    'translation.x': spec.translation.x,
    'translation.y': spec.translation.y,
    'translation.z': spec.translation.z,
    'rotation.x': spec.rotation.x,
    'rotation.y': spec.rotation.y,
    'rotation.z': spec.rotation.z,
    'scale.x': spec.scale.x,
    'scale.y': spec.scale.y,
    'scale.z': spec.scale.z,
    'shear.xy': spec.shear.xy,
    'shear.xz': spec.shear.xz,
    'shear.yz': spec.shear.yz,
    'sizeMode.x': spec.sizeMode.x,
    'sizeMode.y': spec.sizeMode.y,
    'sizeMode.z': spec.sizeMode.z,
    'sizeProportional.x': spec.sizeProportional.x,
    'sizeProportional.y': spec.sizeProportional.y,
    'sizeProportional.z': spec.sizeProportional.z,
    'sizeDifferential.x': spec.sizeDifferential.x,
    'sizeDifferential.y': spec.sizeDifferential.y,
    'sizeDifferential.z': spec.sizeDifferential.z,
    'sizeAbsolute.x': spec.sizeAbsolute.x,
    'sizeAbsolute.y': spec.sizeAbsolute.y,
    'sizeAbsolute.z': spec.sizeAbsolute.z,
  }
}

Property.PREFIX_TO_CLUSTER_NAME = {
  mount: 'Mount',
  offset: 'Offset',
  origin: 'Origin',
  translation: 'Position',
  rotation: 'Rotation',
  scale: 'Scale',
  shear: 'Shear',
  sizeMode: 'Sizing Mode',
  sizeProportional: 'Size %',
  sizeDifferential: 'Size +/-',
  sizeAbsolute: 'Size',
  overflow: 'Overflow',
  style: 'Style',
} as Record<string, string>

Property.HUMANIZED_PROP_NAMES = {
  'rotation.z': 'Rotation Z',
  'rotation.y': 'Rotation Y',
  'rotation.x': 'Rotation X',
  'shear.xy': 'Shear X / Y',
  'shear.xz': 'Shear X / Z',
  'shear.yz': 'Shear Y / Z',
  'translation.x': 'Position X',
  'translation.y': 'Position Y',
  'translation.z': 'Position Z',
  'sizeAbsolute.x': 'Size X',
  'sizeAbsolute.y': 'Size Y',
  'style.overflowX': 'Overflow X',
  'style.overflowY': 'Overflow Y',
  'origin.x': 'Origin X',
  'origin.y': 'Origin Y',
} as Record<string, string>

Property.BUILTIN_DOM_SCHEMAS = {
  div: {
    'sizeAbsolute.x': 'number',
    'sizeAbsolute.y': 'number',
    'playback': 'any',
    'controlFlow.placeholder': 'any',
    'controlFlow.repeat': 'any',
    'controlFlow.if': 'any',
    'opacity': 'number',
    'translation.x': 'number',
    'translation.y': 'number',
    'translation.z': 'number',
    'rotation.x': 'number',
    'rotation.y': 'number',
    'rotation.z': 'number',
    'scale.x': 'number',
    'scale.y': 'number',
    'origin.x': 'number',
    'origin.y': 'number',
    'shear.xy': 'number',
    'shear.xz': 'number',
    'shear.yz': 'number',
    'style.background': 'string',
    'style.backgroundColor': 'string',
    'style.border': 'string',
    'style.borderBottom': 'string',
    'style.borderLeft': 'string',
    'style.borderRight': 'string',
    'style.borderTop': 'string',
    'style.color': 'string',
    'style.cursor': 'string',
    'style.fontFamily': 'string',
    'style.fontSize': 'string',
    'style.fontStyle': 'string',
    'style.fontWeight': 'string',
    'style.overflowY': 'string',
    'style.overflowX': 'string',
    'style.textTransform': 'string',
    'style.pointerEvents': 'string',
    'style.perspective': 'string',
    'style.transformStyle': 'string',
    'style.verticalAlign': 'string',
    'style.zIndex': 'number',
    'style.WebkitTapHighlightColor': 'string',
  },
  svg: {
    'controlFlow.placeholder': 'any',
    'controlFlow.repeat': 'any',
    'controlFlow.if': 'any',
    'opacity': 'number',
    'translation.x': 'number',
    'translation.y': 'number',
    'translation.z': 'number',
    'rotation.x': 'number',
    'rotation.y': 'number',
    'rotation.z': 'number',
    'scale.x': 'number',
    'scale.y': 'number',
    'shear.xy': 'number',
    'shear.xz': 'number',
    'shear.yz': 'number',
    'origin.x': 'number',
    'origin.y': 'number',
    'style.border': 'string',
    'style.borderBottom': 'string',
    'style.borderLeft': 'string',
    'style.borderRight': 'string',
    'style.borderTop': 'string',
    'style.color': 'string',
    'style.cursor': 'string',
    'style.pointerEvents': 'string',
  },
} as Record<string, Record<string, string>>

export { Property }
