import test from 'tape'
import * as mod from '../lib/index'

test('esm import works (haiku-common)', (t) => {
  t.ok(mod)
  t.end()
})