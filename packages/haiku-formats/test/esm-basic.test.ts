import test from 'tape'
import * as mod from '../lib/index.js'

test('esm import works (haiku-formats)', (t) => {
  t.ok(mod)
  t.end()
})