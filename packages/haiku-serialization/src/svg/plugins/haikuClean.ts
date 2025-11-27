type Item = {
  hasAttr: (name: string) => boolean
  attr: (name: string) => { value: string }
}

const plugin = {
  type: 'perItem',
  fn: (item: Item) => {
    if (item.hasAttr('font-family')) {
      item.attr('font-family').value = 'Helvetica, Arial, sans-serif'
    }
  },
}

export default plugin
