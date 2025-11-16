import cp from "child_process";
import path from "path";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = process.cwd();

export default function runScript (name, args, cb) {
  const child = cp.fork(path.join(__dirname, '..', name + '.js'), args || [], {stdio: 'inherit', cwd: ROOT});
  child.on('close', (code) => {
    if (code !== 0) {
      return cb(new Error('Error in ' + name));
    }
    return cb();
  });
};
