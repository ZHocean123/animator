import React from 'react' // Installed as a peer dependency of '@haiku/core'
import ReactDOM from 'react-dom' // Installed as a peer dependency of '@haiku/core'
import HaikuReactAdapter from '@haiku/core/dom/react/index.js'
import domModule from './dom.js'
var React_Alien = HaikuReactAdapter(domModule)
if (React_Alien.default) React_Alien = React_Alien.default
export default React_Alien