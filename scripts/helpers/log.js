import clc from 'cli-color';

let SPACER = '\n=============================================\n';

export default {
  log (msg) {
    console.log(clc.white(msg));
  },

  err (msg) {
    console.log(clc.red(msg));
  },

  warn (msg) {
    console.log(clc.yellow(msg));
  },

  hat (msg, color) {
    console.log(clc[color || 'cyan'](SPACER + msg + SPACER));
  },
};
