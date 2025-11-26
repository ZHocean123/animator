const fs = require('haiku-fs-extra')
const { HOMEDIR_LOGS_PATH } = require('./HaikuHomeDir')
const { Logger } = require('./Logger')

fs.mkdirpSync(HOMEDIR_LOGS_PATH)
const logger = new Logger(HOMEDIR_LOGS_PATH, 'haiku-debug.log')
module.exports = logger
