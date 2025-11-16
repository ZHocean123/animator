import cp from 'child_process';
import { keyBy } from 'lodash-es';
import log from './helpers/log.js';
import allPackages from './helpers/packages.js';
import { argv } from 'yargs';

const packages = allPackages();
let groups = keyBy(packages, 'name');

let pkg = argv.package;
if (!pkg) {
  throw new Error('a --package argument is required');
}

let PACKAGE_PATH = groups[pkg] && groups[pkg].abspath;
if (!PACKAGE_PATH) {
  throw new Error(`cannot find package ${pkg}`);
}

log.hat(`publishing ${pkg} to the npm registry`);

// Have to set this because when we run via yarn, pnpm sets this var and we want npm's registry.
process.env.npm_config_registry = 'https://registry.npmjs.org';

cp.execSync(`npm publish --verbose --access public`, {cwd: PACKAGE_PATH, stdio: 'inherit'});
