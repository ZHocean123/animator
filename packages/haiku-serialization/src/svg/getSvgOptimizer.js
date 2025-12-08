import Svgo from 'svgo';
import customPlugins from './plugins';

let singleton;

const plugins = [
  'removeMetadata',
  'removeTitle',
  'removeDesc',
  'removeUselessDefs',
  'removeEmptyAttrs',
  'removeUselessStrokeAndFill',
  'removeNonInheritableGroupAttrs',
  'moveElemsAttrsToGroup',
  'removeEmptyContainers',
  'removeEmptyText',
  'removeViewBox',
  'convertStyleToAttrs',
  customPlugins,
];

export default () => {
  if (!singleton) {
    singleton = new Svgo({
      full: true,
      floatPrecision: 3,
      plugins,
    });
  }

  return singleton;
};
