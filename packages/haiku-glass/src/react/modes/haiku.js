/* tslint:disable */

function kw(type) {
  return { type, style: 'keyword' }
}

const A = kw('keyword a')
const B = kw('keyword b')
const C = kw('keyword c')

const operator = kw('operator')
const atom = { type: 'atom', style: 'atom' }

const HaikuMode = {
  keywords: {
    if: kw('if'),
    while: A,
    with: A,
    else: B,
    do: B,
    try: B,
    finally: B,
    return: C,
    break: C,
    continue: C,
    new: kw('new'),
    delete: C,
    throw: C,
    debugger: C,
    var: kw('var'),
    const: kw('var'),
    let: kw('var'),
    function: kw('function'),
    catch: kw('catch'),
    for: kw('for'),
    switch: kw('switch'),
    case: kw('case'),
    default: kw('default'),
    in: operator,
    typeof: operator,
    instanceof: operator,
    true: atom,
    false: atom,
    null: atom,
    undefined: atom,
    NaN: atom,
    Infinity: atom,
    this: kw('this'),
    class: kw('class'),
    super: kw('atom'),
    yield: C,
    export: kw('export'),
    import: kw('import'),
    extends: C,
    await: C,
  },
}

module.exports = HaikuMode
