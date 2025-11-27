'use strict'

export const type = 'perItemReverse'
export const active = true
export const description = 'collapses useless groups'

const collections = require('svgo/plugins/_collections')
const attrsInheritable: string[] = collections.inheritableAttrs
const animationElems: string[] = collections.elemsGroups.animation

function hasAnimatedAttr(item: any): boolean {
  return (item.isElem && item.isElem(animationElems) && item.hasAttr('attributeName', (this as any)))
    || (!item.isEmpty && !item.isEmpty() && item.content && item.content.some(hasAnimatedAttr, this))
}

export function fn(item: any) {
  if (item.isElem && item.isElem() && (!item.isElem('switch') || isFeaturedSwitch(item)) && !item.isEmpty()) {
    item.content.forEach((g: any, i: number) => {
      if (g.isElem && g.isElem('g') && !g.isEmpty()) {
        if (g.hasAttr && g.hasAttr() && g.content.length === 1) {
          const inner = g.content[0]
          if (
            inner.isElem && inner.isElem() && !inner.hasAttr('id')
            && !(g.hasAttr('class') && inner.hasAttr('class')) && (
              (!g.hasAttr('clip-path') && !g.hasAttr('mask'))
              || (inner.isElem('g') && !g.hasAttr('transform') && !inner.hasAttr('transform') && !g.hasAttr('filter'))
            )
          ) {
            g.eachAttr((attr: any) => {
              if (g.content.some(hasAnimatedAttr, attr.name)) return
              if (!inner.hasAttr(attr.name)) inner.addAttr(attr)
              else if (attr.name == 'transform') inner.attr(attr.name).value = `${attr.value} ${inner.attr(attr.name).value}`
              else if (inner.hasAttr(attr.name, 'inherit')) inner.attr(attr.name).value = attr.value
              else if (!attrsInheritable.includes(attr.name) && !inner.hasAttr(attr.name, attr.value)) return
              g.removeAttr(attr.name)
            })
          }
        }
        if (!g.hasAttr() && !g.content.some((item: any) => item.isElem(animationElems))) {
          item.spliceContent(i, 1, g.content)
        }
      } else if (isFeaturedSwitch(g)) {
        item.spliceContent(i, 1, g.content)
      }
    })
  }
}

function isFeaturedSwitch(elem: any): boolean {
  return elem.isElem('switch') && !elem.isEmpty() && !elem.content.some((child: any) =>
    child.hasAttr('systemLanguage') || child.hasAttr('requiredFeatures') || child.hasAttr('requiredExtensions'),
  )
}

export default { type, active, description, fn }
