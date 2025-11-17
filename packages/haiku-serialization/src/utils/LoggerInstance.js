import fse from 'fs-extra';
import { Logger } from './Logger.js';
import { HOMEDIR_LOGS_PATH } from './HaikuHomeDir.js';

fse.mkdirpSync(HOMEDIR_LOGS_PATH);
const logger = new Logger(HOMEDIR_LOGS_PATH, 'haiku-debug.log');

export default logger;
export const raw = (...args) => logger.raw(...args);
export const info = (...args) => logger.info(...args);
export const traceInfo = (...args) => logger.traceInfo(...args);
export const debug = (...args) => logger.debug(...args);
export const warn = (...args) => logger.warn(...args);
export const error = (...args) => logger.error(...args);
