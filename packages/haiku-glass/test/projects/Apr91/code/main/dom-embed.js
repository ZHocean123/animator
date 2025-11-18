import code from './code.js'
var adapter = window.HaikuResolve && window.HaikuResolve('3.2.0')
if (adapter) {
  export default adapter(code)
} else  {
  function safety () {
    console.error(
      '[haiku core] core version 3.2.0 seems to be missing. ' +
      'index.embed.js expects it at window.HaikuCore["3.2.0"], but we cannot find it. ' +
      'you may need to add a <script src="path/to/HaikuCore.js"></script> to fix this.'
    )
    return code
  }
  for (var key in code) {
    safety[key] = code[key]
  }
  export default safety
}