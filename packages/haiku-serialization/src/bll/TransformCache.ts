export default class TransformCache {
  private host: any
  private cache: Record<string, any>

  constructor(host: any) {
    this.host = host
    this.cache = {}
  }

  set(key: string) {
    const transform: any = this.host.getComputedLayout()
    if (this.host.getOriginOffsetComposedMatrix) {
      transform.originOffsetComposedMatrix = this.host.getOriginOffsetComposedMatrix()
    }
    this.cache[key] = transform
  }

  get(key: string) {
    return this.cache[key]
  }
}

export { TransformCache }
