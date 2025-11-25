const cp = require('child_process');
const path = require('path');
const log = require('./helpers/log');
const gitStatusInfo = require('./helpers/gitStatusInfo');
const allPackages = require('./helpers/packages')();
const unbuildables = require('./helpers/unbuildables');
const ROOT = path.join(__dirname, '..');
const fs = require("../packages/haiku-fs-extra");

let clc = require('cli-color');

const lintProcesses = [];

for (const pack of allPackages) {
  const lintProcess = {pkgName: pack.name};

  if (unbuildables.includes(lintProcess.pkgName)) {
    continue;
  }

  lintProcess.command = pack.pkg.scripts.fix || pack.pkg.scripts.lint;
  if (lintProcess.command) {
    lintProcess.output = '';
    
    // Use root ESLint configuration for all packages
    const env = {...global.process.env, FORCE_COLOR: true};
    // Point ESLint to root config since we use unified configuration
    env.ESLINT_USE_FLAT_CONFIG = 'false';
    
    lintProcess.cp = cp.spawn(lintProcess.command, {cwd: pack.abspath, shell: true, env});

    lintProcess.cp.stdout.on('data', (data) => {
      lintProcess.output = lintProcess.output.concat(data);
    });

    lintProcess.cp.stderr.on('data', (data) => {
      lintProcess.output = lintProcess.output.concat(data);
    });

    lintProcess.cp.on('close', (code) => {
      lintProcess.outputCode = code;
      if (lintProcess.outputCode === 0) {
        log.log(`Linting ${lintProcess.pkgName} ${clc.green('✔')}`);
      } else {
        log.log(`Linting ${lintProcess.pkgName} ${clc.red('✘')}`);
        log.log(lintProcess.outputCode);
      }
    });

    lintProcess.cp.on('error', (code) => {
      log.err(`Linting ${lintProcess.pkgName} ${clc.red('✘')}`);
      log.err(`Command ${lintProcess.command} exited with code ${code}`);
      log.err(lintProcess.output);
    });

    lintProcesses.push(lintProcess);
  }
}

// Display mono repo status when every lint is finished
for (const lintProcess of lintProcesses) {

  lintProcess.cp.on('close', () => {
    // If all processes are finished
    if (lintProcesses.every((p) => p.outputCode !== undefined)) {
      const monoStatus = gitStatusInfo(ROOT);
      delete monoStatus.output;
      const statStr = JSON.stringify(monoStatus, null, 2);
      log.hat(`Here's what things look like in mono now:\n${statStr}\n(This is just FYI. An empty object is ok too.)`);

      // Exit with correct value
      if (lintProcesses.every((p) => p.outputCode === 0)) {
        process.exit(0);
      } else {
        process.exit(-1);
      }

    }
  });
}
