import path from "path";
import cp from "child_process";
import { keyBy } from "lodash-es";
import log from "./helpers/log.js";
import allPackages from "./helpers/packages.js";
import yargs from "yargs";
const { argv } = yargs;
import async from "async";
import uglify2 from "uglify-js";
import glob from "glob-all";
import fse from "fs-extra";

const packages = allPackages();

const groups = keyBy(packages, "name");

const pkg = argv.package;
if (!pkg) {
  throw new Error("a --package argument is required");
}

const PACKAGE_PATH = groups[pkg] && groups[pkg].abspath;
if (!PACKAGE_PATH) {
  throw new Error(`cannot find package ${pkg}`);
}

log.hat(`compiling ${pkg}`);

if (!process.env.NODE_ENV) {
  // babel-cli requires this to be set for reasons I don't know
  process.env.NODE_ENV = "development";
}

cp.execSync("pnpm compile", { cwd: PACKAGE_PATH, stdio: "inherit" });

if (argv.uglify) {
  const globule = path.join(PACKAGE_PATH, argv.uglify);
  log.log("uglifying glob " + globule);

  glob([globule], (err, files) => {
    if (err) {
      throw err;
    }
    return async.eachSeries(
      files,
      (file, next) => {
        log.log("uglifying " + file);

        try {
          const { code } = uglify2.minify(fse.readFileSync(file).toString());
          if (!code) {
            throw new Error("Encountered error during minification");
          }
          return fse.outputFile(file, code, writeError => {
            if (writeError) {
              return next(writeError);
            }
            return next();
          });
        } catch (exception) {
          log.log("cannot uglify: " + exception.message);
          return next();
        }
      },
      finalErr => {
        if (finalErr) {
          throw finalErr;
        }
        log.log("done uglifying");
      }
    );
  });
}
