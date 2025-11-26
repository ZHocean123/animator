/**
 * Haiku Creator - Core exports
 *
 * 主入口文件，聚合所有公共 API
 */

// Use require to import CommonJS module
const electronModule = require('./electron');
const bakeryElectron = require('./bakery/electron').default;

// Re-export as named exports
export const creator = electronModule.default;
export {bakeryElectron};
