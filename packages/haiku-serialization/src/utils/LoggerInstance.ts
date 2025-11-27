import fs from 'haiku-fs-extra'
import { HOMEDIR_LOGS_PATH } from './HaikuHomeDir'
import { Logger } from './Logger'

fs.mkdirpSync(HOMEDIR_LOGS_PATH)
const logger = new Logger(HOMEDIR_LOGS_PATH, 'haiku-debug.log')
export default logger
