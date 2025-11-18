import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { sanitize } = require('./fileManipulation.js');
export { sanitize };
export default sanitize;