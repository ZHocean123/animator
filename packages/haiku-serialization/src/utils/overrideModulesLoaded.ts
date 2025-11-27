import path from 'node:path'

const nodehook = require('node-hook')
const remapSource = require('../ast/remapSource').default || require('../ast/remapSource')

export default (cb: (unhook: () => void) => any, remapParams: any, iterator?: (filename: string, updated: string, original: string) => void) => {
  nodehook.hook('.js', (source: string, filename: string) => {
    if (path.basename(filename) !== 'code.js')
      return source
    const updated = remapSource(source, remapParams)
    if (iterator)
      iterator(filename, updated, source)
    return updated
  })
  return cb(() => nodehook.unhook('.js'))
}
