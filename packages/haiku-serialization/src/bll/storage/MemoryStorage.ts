export default class MemoryStorage {
  static data: Record<string, any> = {}
  store(key: string, pojo: any) {
    MemoryStorage.data[key] = pojo
    return pojo
  }

  unstore(key: string) {
    return MemoryStorage.data[key]
  }
}

export { MemoryStorage }
