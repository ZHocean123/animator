import fs from 'haiku-fs-extra'
import Home from './HaikuHomeDir'
import { Logger } from './Logger'

fs.mkdirpSync(Home.HOMEDIR_LOGS_PATH)
const logger = new Logger(Home.HOMEDIR_LOGS_PATH, 'haiku-debug.log')
export default logger
