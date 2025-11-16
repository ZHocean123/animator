



import async from "async";
import cp from "child_process";
import log from "./helpers/log.js";
import allPackages from "./helpers/packages.js";
import unbuildables from "./helpers/unbuildables.js";


async.eachSeries(allPackages, (pack, next) => {
  if (unbuildables.includes(pack.name) || !pack.pkg.scripts || !pack.pkg.scripts.test) {
    next();
    return;
  }

  try {
    log.log('running tests in ' + pack.name);
    cp.execSync('pnpm run test', {cwd: pack.abspath, stdio: 'inherit'});
  } catch (exception) {
    log.err(exception.message);
  }
  return next();
});
