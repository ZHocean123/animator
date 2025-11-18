import HaikuVueAdapter from '@haiku/core/dom/vue/index.js'
import domModule from './dom.js'
var HaikuVueComponent = HaikuVueAdapter(domModule)
if (HaikuVueComponent.default) HaikuVueComponent = HaikuVueComponent.default
export default HaikuVueComponent