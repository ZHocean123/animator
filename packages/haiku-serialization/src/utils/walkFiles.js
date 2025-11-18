/**
 * Walks through files in a directory
 * @param {string} dir - The directory to walk
 * @param {Function} done - Callback function
 * @returns {*} - Result from filterWalkFolder
 */
import fse from 'haiku-fs-extra';
import filterWalkFolder from './filterWalkFolder.js';

export default function walkFiles(dir, done) {
  return filterWalkFolder(dir, fileOnlyFilter, done);
}

function fileOnlyFilter(abspath, _, fileObj, relpath) {
  if(relpath.match(/(^\.|\/\.|node_modules|bower_components|jspm_modules)/)) {
    return false; // HACK: Skip files we shouldn't be loading (.git, etc)
  }
  return fse.lstatSync(abspath).isFile();
}
