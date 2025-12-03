import * as fs from 'haiku-fs-extra'
import { HaikuHomeDir } from './HaikuHomeDir'
import { Logger } from './Logger'

// Create logs directory if it doesn't exist
fs.mkdirpSync(HaikuHomeDir.HOMEDIR_LOGS_PATH)

// Create and export logger instance
const logger = new Logger(HaikuHomeDir.HOMEDIR_LOGS_PATH, 'haiku-debug.log')
export default logger
