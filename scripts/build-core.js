import cp from "child_process";
import yargs from "yargs";
import log from "./helpers/log.js";
import runScript from "./helpers/runScript.js";
import nowVersion from "./helpers/nowVersion.js";
import packages from "./helpers/packages.js";

const { argv } = yargs;

const core = packages("@haiku/core");

log.hat(`note that the current version is ${nowVersion()}`);

log.hat('creating distribution builds of our core and adapters');

const makeBundle = () => {
  cp.execSync('pnpm bundle', {cwd: core.abspath, stdio: 'inherit'});
};

if (!argv['skip-compile']) {
  cp.execSync('pnpm install', {cwd: process.cwd(), stdio: 'inherit'});
  runScript('compile-package', ['--package=@haiku/core'], (err) => {
    if (err) {
      throw err;
    }

    makeBundle();
  });
} else {
  makeBundle();
}
