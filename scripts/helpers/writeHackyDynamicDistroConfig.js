let fse = (await import("fs-extra"));
let hb = (await import("handlebars"));
let path = (await import("path"));
let ROOT = global.process.cwd();

export default function writeHackyDynamicDistroConfig (inputs) {
  const src = fse.readFileSync(path.join(ROOT, '_config.js.handlebars')).toString();
  const tpl = hb.compile(src);
  const result = tpl(inputs);

  fse.writeFileSync(path.join(ROOT, 'config.js'), result);
};
