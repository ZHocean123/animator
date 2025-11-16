




import async from "async";
import cp from "child_process";
import fs from "fs";
import path from "path";
import { argv } from "yargs";
import glob from "glob";
import allPackages from "./helpers/packages.js";
import log from "./helpers/log.js";


// Define build order to ensure dependencies are built first
const buildOrder = [
  'haiku-common',
  '@haiku/core',
  'haiku-serialization',
  'haiku-plumbing',
  'haiku-formats',
  'haiku-ui-common',
  'haiku-timeline',
  'haiku-glass',
  'haiku-sdk-creator',
  '@haiku/sdk-client',
  '@haiku/cli',
  'haiku-admin-cli',
  'haiku-creator'
];

// Sort packages according to build order
const sortedPackages = allPackages.sort((a, b) => {
  const aIndex = buildOrder.indexOf(a.shortname);
  const bIndex = buildOrder.indexOf(b.shortname);
  
  // If both packages are in build order, sort by that order
  if (aIndex !== -1 && bIndex !== -1) {
    return aIndex - bIndex;
  }
  
  // If only one package is in build order, prioritize it
  if (aIndex !== -1) return -1;
  if (bIndex !== -1) return 1;
  
  // Otherwise, keep original order
  return 0;
});

if (!process.env.NODE_ENV) {
  // babel-cli requires this to be set for reasons I don't know
  process.env.NODE_ENV = 'development';
}

const getModificationTime = (file) => new Date(fs.statSync(file).mtime);

async.each(sortedPackages, (pack, done) => {
  if (pack.pkg && pack.pkg.scripts && pack.pkg.scripts.compile) {
    const lastCompileFilename = path.join(pack.abspath, '.last-compile');

    /* Load last compile time from file */
    let lastCompileTime = null;
    if (!argv.force && fs.existsSync(lastCompileFilename)) {
      try {
        // 动态导入文件内容
        const lastCompileContent = fs.readFileSync(lastCompileFilename, 'utf8');
        // 简单解析 export default 对象
        const jsonMatch = lastCompileContent.match(/export default\s+(\{.*\});/s);
        if (jsonMatch) {
          const lastCompile = JSON.parse(jsonMatch[1]);
          if (lastCompile.hasOwnProperty('lastCompileTime')) {
            lastCompileTime = new Date(lastCompile.lastCompileTime);
          }
        }
      } catch (e) {
        // 如果解析失败，继续编译
        lastCompileTime = null;
      }
    }

    /* Get modified file since last compilation */
    const files = glob.sync(`${pack.abspath}/src/**`, {});
    const modifiedFiles = files.filter((file) => getModificationTime(file) > lastCompileTime);

    /* Compile package if it has any modified file */
    // if (modifiedFiles.length > 0) {
      log.warn(`Detected ${modifiedFiles.length} changed file(s) in ${pack.shortname}. Compiling....`);
      try {
        cp.execSync('pnpm run compile', {cwd: pack.abspath, stdio: 'inherit'});
      } catch (error) {
        log.warn(`Compilation failed for ${pack.shortname}, but continuing...`);
        // Continue with next package even if compilation fails
      }
    // } else {
    //   log.log(`No changes in ${pack.shortname} since last compile. Skipping....`);
    // }

    /* Update last compile time */
    lastCompileTime = new Date();
    fs.writeFileSync(lastCompileFilename, `export default ${JSON.stringify({lastCompileTime})};`);

    done();
  } else {
    done();
  }
});
