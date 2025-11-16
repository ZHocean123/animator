





import async from "async";
import cp from "child_process";
import log from "./helpers/log";
import allPackages from "./helpers/packages";
import unbuildables from "./helpers/unbuildables";
import { readJsonSync } from "fs-extra";
import { join } from "path";

();


let hadError = false;
async.each(allPackages, (pack, next) => {
  if (unbuildables.includes(pack.name) || !pack.pkg.scripts || !pack.pkg.scripts['test-report']) {
    next();
    return;
  }

  const command = pack.pkg.scripts['test-report'];
  log.log(`fetching test report for ${pack.name}`);
  cp.exec(command, {cwd: pack.abspath, stdio: 'inherit'}, (err) => {
    if (err) {
      log.err(`caught error in ${pack.shortname} test-report: ${err.toString()}`);
      hadError = true;
    } else {
      log.log(`finished fetching test report for ${pack.name}`);
    }
    next();
  });
}, () => {
  try {
    readJsonSync(join(global.process.cwd(), 'changelog', 'public', 'latest.json'));
  } catch (err) {
    log.err('caught error during attempt to deserialize changelog');
    hadError = true;
  }

  if (hadError) {
    global.process.exit(1);
  }
});
