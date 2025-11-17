import test from 'tape'
import * as mod from '../lib/index.js'

test('esm import works (@haiku/sdk-client)', (t) => {
  t.ok(mod)
  t.end()
})