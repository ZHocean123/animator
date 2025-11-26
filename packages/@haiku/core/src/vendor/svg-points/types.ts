export type ShapeSpec = CircleSpec | EllipseSpec | LineSpec | PathSpec | PolygonSpec | PolylineSpec | RectSpec

export interface CircleSpec {
  type?: 'circle'
  cx: number
  cy: number
  r: number
}

export interface EllipseSpec {
  type?: 'ellipse'
  cx?: number
  cy?: number
  rx?: number
  ry?: number
}

export interface LineSpec {
  type?: 'line'
  x1: number
  y1: number
  x2: number
  y2: number
}

export interface PathSpec {
  type?: 'path'
  d: string
}

export interface PolygonSpec {
  type?: 'polygon'
  points: string
}

export interface PolylineSpec {
  type?: 'polyline'
  points: string
}

export interface RectSpec {
  type?: 'rect'
  height: number
  width: number
  rx?: number
  ry?: number
  x?: number
  y?: number
}

export interface CurveDef {
  type: string
  largeArcFlag?: number
  sweepFlag?: number
  xAxisRotation?: number
  rx?: number
  ry?: number
  x1?: number
  y1?: number
  x2?: number
  y2?: number
}

export interface CurveSpec {
  curve?: CurveDef
  x: number
  y: number
  moveTo?: boolean
  closed?: boolean
}
