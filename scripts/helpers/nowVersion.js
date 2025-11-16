import path from "path";
import fse from "fs-extra";

const ROOT = process.cwd();

export default function nowVersion () {
  return fse.readJsonSync(path.join(ROOT, 'package.json')).version;
};
