export default class Cache {
  private data: Record<string, any>
  constructor(data: Record<string, any> = {}) {
    this.data = data
  }

  reset(data: Record<string, any> = {}) { this.data = data }
  clear() { this.data = {} }
  get(key: string) { return this.data[key] }
  set(key: string, value: any) { this.data[key] = value }
  unset(key: string) { this.data[key] = undefined }
  fetch<T = any>(key: string, provider: () => T, postproc?: (v: T) => any) {
    const found = this.get(key)
    if (found !== undefined)
      return postproc ? postproc(found) : found
    const given = provider()
    this.set(key, given)
    return postproc ? postproc(given) : given
  }

  async<T = any>(key: string, provider: (cb: (err: Error | null, v?: T) => void) => any, cb: (err: Error | null, v?: any) => void, postproc?: (v: T) => any) {
    const found = this.get(key)
    if (found !== undefined)
      return cb(null, postproc ? postproc(found) : found)
    return provider((err, given) => {
      if (err)
        return cb(err)
      this.set(key, given)
      return cb(null, postproc ? postproc(given as T) : given)
    })
  }
}

export { Cache }
