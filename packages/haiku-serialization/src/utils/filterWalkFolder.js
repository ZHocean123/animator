/**
 * Filters files while walking through a directory
 * @param {string} dir - The directory to walk
 * @param {Function} filter - Filter function to apply to each item
 * @param {Function} done - Callback function
 * @returns {*} - The walk stream
 */
import fse from 'haiku-fs-extra';
import path from 'path';

export default (dir, filter, done) => {
  const items = [];
  return fse.walk(dir)
    .on('data', (item) => {
      if(!filter) {
        return items.push(item);
      }
      if(filter(item.path, null, item, path.relative(dir, item.path))) {
        return items.push(item);
      }
    })
    .on('end', () => done(null, items))
    .on('error', done);
};
