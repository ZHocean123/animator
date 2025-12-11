import * as fse from 'haiku-fs-extra';
import filterWalkFolder from './filterWalkFolder.js';

function walkFiles (dir, done) {
  return filterWalkFolder(dir, fileOnlyFilter, done);
}

function fileOnlyFilter (abspath, _, fileObj, relpath) {
  if (relpath.match(/(^\.|\/\.|node_modules|bower_components|jspm_modules)/)) {
    return false; // HACK: Skip files we shouldn't be loading (.git, etc)
  }
  return fse.lstatSync(abspath).isFile();
}

export default walkFiles;
