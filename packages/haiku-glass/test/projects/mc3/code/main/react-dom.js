import React from 'react' // Installed as a peer dependency of '@haiku/core'
import ReactDOM from 'react-dom' // Installed as a peer dependency of '@haiku/core'
import HaikuReactAdapter from '@haiku/core/dom/react/index.js'
import domModule from './dom.js'
var HaikuReactComponent = HaikuReactAdapter(domModule)
if (HaikuReactComponent.default) HaikuReactComponent = HaikuReactComponent.default
export default HaikuReactComponent