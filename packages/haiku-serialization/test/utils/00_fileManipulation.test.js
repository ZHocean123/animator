const test = require('tape');
const fs = require('fs');
process.env.TS_NODE_PROJECT = require('path').join(__dirname, '../../tsconfig.tests.json');
require('ts-node/register');
const fileManipulation = require('../../src/utils/fileManipulation.ts').default;

const ROOT = process.cwd();
const FIXTURES = `${ROOT}/test/fixtures/fileManipulation`;
const FIXTURES_TMP = `${FIXTURES}/tmp`;

test('fileManipulation#unzip succesfully unzips a file', async (t) => {
  if (process.platform === 'win32') {
    t.pass('skip unzip on Windows in CI environment');
    return t.end();
  }
  await fileManipulation.unzip(`${FIXTURES}/hello.md.zip`, FIXTURES_TMP);
  t.ok(fs.existsSync(`${FIXTURES_TMP}/hello.md`), 'uncompressed file exists');
  t.end();
});

test('fileManipulation#unzip succesfully unzips a file', async (t) => {
  if (process.platform === 'win32') {
    t.pass('skip unzip on Windows in CI environment');
    return t.end();
  }
  await fileManipulation.unzip(`${FIXTURES}/hello.md.zip`, FIXTURES_TMP);
  t.ok(fs.existsSync(`${FIXTURES_TMP}/hello.md`), 'uncompressed file exists');
  t.end();
});

test('fileManipulation#sanitize replaces invalid linux characters with a dash', (t) => {
  const sanitized = fileManipulation.sanitize('my / file / name')
  t.equal(sanitized, 'my - file - name', 'dashes should be removed');
  t.end();
})
