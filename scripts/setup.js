







import cp from "child_process";
import fse from "fs-extra";
import path from "path";
import log from "./helpers/log.js";
import runFlakyCommand from "./helpers/runFlakyCommand.js";

const processOptions = {cwd: global.process.cwd(), stdio: 'inherit'};

runFlakyCommand(() => {
  cp.execSync('pnpm install', processOptions);
  log.hat('installed dependencies');
}, 'mono pnpm install', 10);

const gitHooksPath = path.join(process.cwd(), '.git', 'hooks');
const repoHooksPath = path.join(process.cwd(), 'hooks');
if (fse.existsSync(gitHooksPath)) {
  fse.removeSync(gitHooksPath);
}

fse.symlink(repoHooksPath, gitHooksPath, () => {
  log.hat('installed hooks');
});
