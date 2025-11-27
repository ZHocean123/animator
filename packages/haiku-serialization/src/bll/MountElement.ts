import BaseModel from './BaseModel'

export default class MountElement extends (BaseModel as any) {
  private _$el: HTMLElement | null

  constructor(props: any, opts: any) {
    super(props, opts)
    if (typeof window !== 'undefined') {
      this._$el = window.document.createElement('div')
      this._$el.setAttribute('id', this.getRenderId())
      this._$el.setAttribute('class', 'haiku-component-mount')
      this._$el.style.position = 'absolute'
      this._$el.style.left = '0'
      this._$el.style.top = '0'
      this._$el.style.width = '100%'
      this._$el.style.height = '100%'
      this._$el.style.overflow = 'visible'
    }
    else {
      this._$el = null
    }
  }

  $el() { return this._$el }

  remountInto($host: HTMLElement | null) {
    if (!$host)
      return null
    const $el = this.$el()
    if ($el) {
      if ($el.parentNode)
        $el.parentNode.removeChild($el)
      while ($host.firstChild) $host.removeChild($host.firstChild)
      $host.appendChild($el)
    }
  }

  getInnerHTML() {
    if (this.$el())
      return this.$el()!.innerHTML; return '<div></div>'
  }

  getBoundingClientRect() {
    if (this.$el()) {
      const rect = this.$el()!.getBoundingClientRect()
      return { width: rect.width, height: rect.height, top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right }
    }
    return { width: 1, height: 1, bottom: 0, top: 0, left: 0, right: 0 }
  }

  setClass(klassName: string) {
    if (this.$el())
      this.$el()!.className = `${klassName}`
  }

  setOpacity(opacity: number) {
    if (this.$el())
      this.$el()!.style.opacity = `${opacity}`
  }

  getRenderId() { return `haiku-mount-${(this as any).getPrimaryKey()}` }
  clear() { while (this.$el() && this.$el()!.firstChild) this.$el()!.removeChild(this.$el()!.firstChild as any) }
}

;(MountElement as any).DEFAULT_OPTIONS = { required: { component: true } }
;(BaseModel as any).extend(MountElement)

export { MountElement }
