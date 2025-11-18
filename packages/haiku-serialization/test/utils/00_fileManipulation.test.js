import test from 'tape';
import fs from 'fs';
import fileManipulation from '../../src/utils/fileManipulation.js';

const ROOT = process.cwd();
const FIXTURES = `${ROOT}/test/fixtures/fileManipulation`;
const FIXTURES_TMP = `${FIXTURES}/tmp`;

test('fileManipulation#unzip succesfully unzips a file', async (t) => {
  await fileManipulation.unzip(`${FIXTURES}/hello.md.zip`, FIXTURES_TMP);

  t.ok(fs.existsSync(`${FIXTURES_TMP}/hello.md`), 'uncompressed file exists');

  t.end();
});

test('fileManipulation#unzip succesfully unzips a file', async (t) => {
  await fileManipulation.unzip(`${FIXTURES}/hello.md.zip`, FIXTURES_TMP);

  t.ok(fs.existsSync(`${FIXTURES_TMP}/hello.md`), 'uncompressed file exists');

  t.end();
});

test('fileManipulation#sanitize replaces invalid linux characters with a dash', (t) => {
  const sanitized = fileManipulation.sanitize('my / file / name')
  t.equal(sanitized, 'my - file - name', 'dashes should be removed');
  t.end();
})
