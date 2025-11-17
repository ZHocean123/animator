import test from 'tape'
import * as mod from '../lib/index.js'

test('esm import works (@haiku/sdk-inkstone)', (t) => {
  t.ok(mod)
  t.end()
})