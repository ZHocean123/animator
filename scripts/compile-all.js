




import async from "async";
import cp from "child_process";
import fs from "fs";
import path from "path";
import yargs from "yargs";
import glob from "glob";
import allPackages from "./helpers/packages.js";
import log from "./helpers/log.js";

/**
 * 解析命令行参数
 * 兼容旧版 yargs（CommonJS 导出），在 ESM 环境下通过 default 导出访问
 */
const argv = yargs.argv;


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
const sortedPackages = allPackages().sort((a, b) => {
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

/**
 * 设置默认运行环境，避免某些构建工具在未设置 NODE_ENV 时行为异常
 */
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'development';
}

/**
 * 获取文件修改时间
 */
const getModificationTime = (file) => new Date(fs.statSync(file).mtime);

async.each(sortedPackages, (pack, done) => {
  if (pack.pkg && pack.pkg.scripts && pack.pkg.scripts.compile) {
    const lastCompileFilename = path.join(pack.abspath, '.last-compile');

    /**
     * 读取上次编译时间标记
     * 文件格式：export default { "lastCompileTime": "ISO_STRING" };
     */
    let lastCompileTime = null;
    if (!argv.force && fs.existsSync(lastCompileFilename)) {
      try {
        const lastCompileContent = fs.readFileSync(lastCompileFilename, 'utf8');
        const jsonMatch = lastCompileContent.match(/export default\s+(\{.*\});/s);
        if (jsonMatch) {
          const lastCompile = JSON.parse(jsonMatch[1]);
          if (lastCompile.hasOwnProperty('lastCompileTime')) {
            lastCompileTime = new Date(lastCompile.lastCompileTime);
          }
        }
      } catch (e) {
        // 解析失败则认为需要重新编译
        lastCompileTime = null;
      }
    }

    /**
     * 计算自上次编译以来修改的文件数量
     */
    const files = glob.sync(`${pack.abspath}/src/**`, {});
    const modifiedFiles = files.filter((file) => getModificationTime(file) > lastCompileTime);

    /**
     * 有变更则编译；失败时记录详细错误并继续后续包
     */
    log.warn(`Detected ${modifiedFiles.length} changed file(s) in ${pack.shortname}. Compiling....`);
    try {
      cp.execSync('pnpm run compile', { cwd: pack.abspath, stdio: 'inherit' });
    } catch (error) {
      const errMsg = `Compilation failed for ${pack.shortname}`;
      log.err(errMsg);
      if (error && error.stack) {
        log.err(error.stack);
      } else if (error && error.message) {
        log.err(error.message);
      }
      try {
        const logPath = path.join(pack.abspath, '.compile-error.log');
        const payload = {
          package: pack.shortname,
          error: String(error && error.stack ? error.stack : error && error.message ? error.message : error),
          when: new Date().toISOString(),
        };
        fs.writeFileSync(logPath, JSON.stringify(payload, null, 2));
      } catch (_) {}
    }

    /**
     * 更新上次编译时间标记
     */
    lastCompileTime = new Date();
    fs.writeFileSync(lastCompileFilename, `export default ${JSON.stringify({lastCompileTime})};`);

    done();
  } else {
    done();
  }
});
