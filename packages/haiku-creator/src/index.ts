/**
 * Haiku Creator - Core exports
 *
 * 主入口文件，聚合所有公共 API
 */

import * as bakeryElectron from './bakery/electron'
import * as electronModule from './electron'

// Re-export as named exports
const creator = electronModule
export default creator
export { bakeryElectron, creator }
