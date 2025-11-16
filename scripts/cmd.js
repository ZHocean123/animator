


import async from "async";
import cp from "child_process";
import { argv } from "yargs";
import log from "./helpers/log.js";
import allPackages from "./helpers/packages.js";

let args = argv._;
let cmd = args[0];

async.eachSeries(allPackages, (pack, next) => {
  log.log('running command ' + cmd + ' in ' + pack.abspath);
  cp.exec(cmd, {cwd: pack.abspath}, (err, out) => {
    if (err) {
      log.err(err);
      return next(err);
    }
    log.log(out);
    return next();
  });
});
