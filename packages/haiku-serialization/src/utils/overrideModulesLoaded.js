import nodehook from 'node-hook';
import path from 'path';
import remapSource from '../ast/remapSource.js';

const overrideModulesLoaded = (cb, remapParams, iterator) => {
  nodehook.hook('.js', (source, filename) => {
    if (path.basename(filename) !== 'code.js') {
      return source;
    }
    const updated = remapSource(source, remapParams);
    if (iterator) {
      iterator(filename, updated, source);
    }
    return updated;
  });

  return cb(() => nodehook.unhook('.js'));
};

export default overrideModulesLoaded;
