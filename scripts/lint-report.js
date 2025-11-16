



import async from "async";
import cp from "child_process";
import log from "./helpers/log.js";
import allPackages from "./helpers/packages.js";
import unbuildables from "./helpers/unbuildables.js";


let hadError = false;
async.each(allPackages, (pack, next) => {
  if (unbuildables.includes(pack.name) || !pack.pkg.scripts || !pack.pkg.scripts['lint-report']) {
    next();
    return;
  }

  const command = pack.pkg.scripts['lint-report'];
  log.log('fetching lint report for ' + pack.name);
  cp.exec(command, {cwd: pack.abspath, stdio: 'inherit'}, (err) => {
    if (err) {
      hadError = true;
    }
    next();
  });
}, () => {
  if (hadError) {
    global.process.exit(1);
  }
});
