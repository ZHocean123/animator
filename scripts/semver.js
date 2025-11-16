import async from 'async';
import {assign} from 'lodash-es';
import fse from 'fs-extra';
import path from 'path';
import yargs from 'yargs';
import semver from 'semver';
import inquirer from 'inquirer';
import { fileURLToPath } from 'url';

import depTypes from './constants/depTypes.js';
import log from './helpers/log.js';
import getSemverTop from './helpers/getSemverTop.js';
import isHaikuDep from './helpers/isHaikuDep.js';
import packages from './helpers/packages.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const argv = yargs.argv;
const allPackages = packages();

const current = getSemverTop();
const patched = semver.inc(current, 'patch');

const DEFAULTS = {
  version: patched,
};

const inputs = assign({}, DEFAULTS, argv);

if (argv['non-interactive']) {
  go();
} else if (argv.explicit && semver.valid(argv.explicit) && semver.lte(current, argv.explicit)) {
  inputs.version = argv.explicit;
  go();
} else {
  inquirer.prompt([
    {
      type: 'input',
      name: 'version',
      message: 'Enter version to set in all projects:',
      default: inputs.version,
    },
  ]).then((answers) => {
    assign(inputs, answers);

    if (semver.lt(inputs.version, current)) {
      throw new Error('You cannot set a lower version than the current one');
    }

    log.hat('setting version to ' + inputs.version);

    go();
  });
}

function go () {
  async.each(allPackages, (pack, done) => {
    const packageJsonPath = path.join(pack.abspath, 'package.json');
    const packageJson = pack.pkg;
    log.log('setting ' + pack.name + ' to ' + inputs.version + ' (was ' + packageJson.version + ')');
    packageJson.version = inputs.version;
    depTypes.forEach((depType) => {
      if (!packageJson[depType]) {
        return;
      }
      for (const dep in packageJson[depType]) {
        if (isHaikuDep(dep)) {
          packageJson[depType][dep] = inputs.version;
        }
      }
    });
    fse.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n', done);
  }, () => {
    const monoJsonPath = path.join(process.cwd(), 'package.json');
    const monoJson = fse.readJsonSync(monoJsonPath);
    log.log('setting mono to ' + inputs.version + ' (was ' + monoJson.version + ')');
    monoJson.version = inputs.version;
    allPackages.forEach((pack) => {
      if (monoJson.dependencies.hasOwnProperty(pack.pkg.name)) {
        monoJson.dependencies[pack.pkg.name] = inputs.version;
      }
    });
    fse.writeFileSync(monoJsonPath, JSON.stringify(monoJson, null, 2) + '\n');
    log.hat('bumped semver!');
  });
}
