const async = require('async');
const cp = require('child_process');
const fs = require('fs');
const path = require('path');
const argv = require('yargs').argv;
const glob = require('glob');

const allPackages = require('./helpers/packages')();
const log = require('./helpers/log');

if (!process.env.NODE_ENV) {
  // babel-cli requires this to be set for reasons I don't know
  process.env.NODE_ENV = 'development';
}

const getModificationTime = (file) => new Date(fs.statSync(file).mtime);

async.each(allPackages, (pack, done) => {
  if (pack.pkg && pack.pkg.scripts && (pack.pkg.scripts.build || pack.pkg.scripts.compile)) {
    const lastCompileFilename = path.join(pack.abspath, '.last-compile');

    /* Load last compile time from file */
    let lastCompileTime = null;
    if (!argv.force && fs.existsSync(lastCompileFilename)) {
      const lastCompile = require(lastCompileFilename);
      if (lastCompile.hasOwnProperty('lastCompileTime')) {
        lastCompileTime = new Date(lastCompile.lastCompileTime);
      }
    }

    /* Get modified file since last compilation */
    const files = glob.sync(`${pack.abspath}/src/**`, {});
    const modifiedFiles = files.filter((file) => getModificationTime(file) > lastCompileTime);

    /* Build package if it has any modified file */
    if (modifiedFiles.length >= 0) {
      log.warn(`Detected ${modifiedFiles.length} changed file(s) in ${pack.shortname}. Building with tsdown....`);
      
      // Try to use tsdown build command first, fallback to compile if not available
      const buildCommand = pack.pkg.scripts.build ? 'pnpm run build' : 'pnpm run compile';
      
      try {
        log.log(`Running command: ${buildCommand} in ${pack.abspath}`);
        cp.execSync(buildCommand, {cwd: pack.abspath, stdio: 'inherit'});
        log.log(`Successfully built ${pack.shortname}`);
      } catch (error) {
        log.err(`Failed to build ${pack.shortname} with command: ${buildCommand}`);
        log.err(`Error details: ${error.message}`);
        log.err(`Working directory: ${pack.abspath}`);
        log.err(`Package name: ${pack.name}`);
        
        // Check if tsdown config exists
        const tsdownConfigPath = path.join(pack.abspath, 'tsdown.config.ts');
        if (!fs.existsSync(tsdownConfigPath)) {
          log.err(`Missing tsdown.config.ts in ${pack.shortname} at ${tsdownConfigPath}`);
        }
        
        // Check if package.json has build scripts
        if (!pack.pkg.scripts || (!pack.pkg.scripts.build && !pack.pkg.scripts.compile)) {
          log.err(`No build or compile script found in package.json for ${pack.shortname}`);
        }
        
        return done(error);
      }
    } else {
      log.log(`No changes in ${pack.shortname} since last build. Skipping....`);
    }

    /* Update last compile time */
    lastCompileTime = new Date();
    fs.writeFileSync(lastCompileFilename, `module.exports = ${JSON.stringify({lastCompileTime})};`);

    done();
  } else {
    done();
  }
}, (err) => {
  if (err) {
    log.err('=====================================');
    log.err('BUILD FAILED');
    log.err('=====================================');
    log.err('Error during build:', err);
    log.err('Stack trace:', err.stack);
    log.err('=====================================');
    process.exit(1);
  }
  log.log('=====================================');
  log.log('BUILD SUCCESSFUL');
  log.log('=====================================');
  log.log('All packages built successfully with tsdown!');
});
