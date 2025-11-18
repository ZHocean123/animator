import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { stringifyPath } = require('./fileManipulation.js');
export { stringifyPath };
export default stringifyPath;
