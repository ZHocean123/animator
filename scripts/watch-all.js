import async from "async";
import cp from "child_process";
import yargs from "yargs";
const { argv } = yargs;
import log from "./helpers/log.js";
import allPackages from "./helpers/packages.js";
import { join } from "path";

if (!process.env.NODE_ENV) {
  // babel-cli requires this to be set for reasons I don't know
  process.env.NODE_ENV = "development";
}

// Note the packages we would never want to develop for specific dev choices.
const appOwnedDeps = ["haiku-creator", "haiku-plumbing"];
const devChoiceExclusions = {
  glass: appOwnedDeps.concat(["haiku-timeline"]),
  timeline: appOwnedDeps.concat(["haiku-glass"]),
  everything: []
};
const devChoice = argv.devChoice || "everything";
const children = [];

const runInstruction = (pack, cb) => {
  const cmd = "pnpm";
  const useTsdownWatch = pack.pkg.scripts.develop === "tsdown --watch";
  const cwd = pack.abspath;

  if (useTsdownWatch) {
    // 使用 tsdown watch 模式
    const proc = cp.spawn("tsdown", ["--watch"], {
      cwd,
      env: process.env,
      stdio: "inherit"
    });
    children.push({
      info: { cwd, cmd: "tsdown --watch", args: [] },
      proc
    });
  } else {
    // 使用 pnpm develop
    const proc = cp.spawn(cmd, ["develop"], {
      cwd,
      env: process.env,
      stdio: "inherit",
      shell: true
    });
    children.push({
      info: { cwd, cmd, args: ["develop"] },
      proc
    });
  }
  cb();
};

let allWatchersActive = false;

async.each(
  allPackages,
  (pack, done) => {
    const { shortname } = pack;
    if (
      devChoiceExclusions[devChoice] &&
      devChoiceExclusions[devChoice].includes(shortname)
    ) {
      done();
      return;
    }

    switch (shortname) {
      case "serialization":
      case "fs-extra":
      case "vendor-legacy":
        // These don't have watchers or need special treatment.
        done();
        break;
      default:
        // Standard, new way of doing things: `pnpm develop`.
        runInstruction(pack, done);
        break;
    }
  },
  () => {
    allWatchersActive = true;
  }
);

const exit = () => {
  if (!allWatchersActive) {
    setTimeout(exit, 500);
    return;
  }

  log.log("$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$");
  log.log("exiting; telling children to interrupt");
  log.log("$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$");

  children.forEach((child, index) => {
    log.log("$$$$$ " + index + " " + JSON.stringify(child.info));
    if (child.proc.stdin) {
      child.proc.stdin.end();
    }
    if (child.proc.stdout) {
      child.proc.stdout.destroy();
    }
    if (child.proc.stderr) {
      child.proc.stderr.destroy();
    }
    child.proc.kill("SIGKILL");
  });
};

global.process.on("exit", exit);
global.process.on("uncaughtException", exit);
