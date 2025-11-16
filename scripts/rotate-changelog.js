





import log from "./helpers/log";
import nowVersion from "./helpers/nowVersion";
import { execSync } from "child_process";
import { existsSync, writeFileSync, copyFileSync } from "fs";
import { join } from "path";

();

const ROOT = join(global.process.cwd(), 'changelog', 'public');
const newOldVersion = join(ROOT, `${nowVersion}.json`);
const latestVersion = join(ROOT, 'latest.json');

if (existsSync(join(ROOT, `${nowVersion}.json`))) {
  log.warn('It looks like the changelog has already been rotated. Aborting!');
  global.process.exit(1);
}

copyFileSync(latestVersion, newOldVersion);
writeFileSync(latestVersion, `{
  "sections": {
    "What's new": [
      "FIRST!"
    ],
    "Fixes": [
      "FIRST!"
    ]
  }
}
`);

const processOptions = {cwd: global.process.cwd(), stdio: 'inherit'};
execSync('git reset --mixed', processOptions);
execSync(`git add ${ROOT}`, {cwd: global.process.cwd(), stdio: 'inherit'});
execSync('git commit -m "auto: rotate changelog"', {cwd: global.process.cwd(), stdio: 'inherit'});
