var fs = require('haiku-fs-extra');
var Logger = require('./Logger').Logger;
var HOMEDIR_LOGS_PATH = require('./HaikuHomeDir').HOMEDIR_LOGS_PATH;
fs.mkdirpSync(HOMEDIR_LOGS_PATH);
var logger = new Logger(HOMEDIR_LOGS_PATH, 'haiku-debug.log');
module.exports = logger;
//# sourceMappingURL=LoggerInstance.js.map