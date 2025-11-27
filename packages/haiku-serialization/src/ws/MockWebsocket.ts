export default class MockWebsocket {
  private eventEmitter: any | null
  constructor(eventEmitter: any | null = null) { this.eventEmitter = eventEmitter }
  on(eventName: string, handler: (payload: any) => void) {
    if (this.eventEmitter === null)
      return
    this.eventEmitter.on(eventName, (_: any, payload: any) => { handler(payload) })
  }

  connect() {}
  disconnect() {}
  send() {}
  method() {}
  request() {}
  action(method: string, params: any[], cb: () => void) { return cb() }
}

export { MockWebsocket }
