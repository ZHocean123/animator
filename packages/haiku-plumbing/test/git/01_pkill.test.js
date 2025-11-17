import * as tape from 'tape';
import * as path from 'path';
import * as cp from 'child_process';
import TestHelpers from '../TestHelpers';
import {fileURLToPath} from 'node:url';
import {dirname} from 'node:path';

tape('git.pkill', (t) => {
  t.plan(1);
  TestHelpers.tmpdir((folder, teardown) => {
    process.env.GIT_PKILL_DIR = folder;
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const PROC_FILE = path.join(__dirname, 'git1.js');
    const proc = cp.fork(
      './node_modules/.bin/ts-node',
      [
        '-r',
        'tsconfig-paths/register',
        '-P',
        'tsconfig.all.json',
        PROC_FILE,
      ],
    );
    proc.on('exit', (code) => {
      console.log(`subproc exited with ${code}`);
      t.true(code === 0);
      teardown();
    });
    proc.on('error', (err) => console.log(`subproc errored with ${err}`));
  });
});
