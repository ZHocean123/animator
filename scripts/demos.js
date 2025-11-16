



import cp from "child_process";
import path from "path";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CORE_PATH = path.join(__dirname, '..', 'packages/@haiku/core');

cp.execSync('pnpm demos', {cwd: CORE_PATH, stdio: 'inherit'});
