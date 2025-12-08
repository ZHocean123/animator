import Changelog from '../../src/bll/Changelog.js';

test('Changelog.readSingleChangelog reads and parses a single changelog file', async () => {
  try {
    const changelogManager = new Changelog('0.0.0', 'test/fixtures/changelog/');
    const changelog = await changelogManager.readSingleChangelog('1.2.3.json');
    expect(typeof changelog).toBe('object');
    expect(changelog.version).toBe('1.2.3');
  } catch (e) {
    expect(e).toBeUndefined();
  }
});

test('Changelog.readChangelogs reads and parses changelogs in a directory', async () => {
  try {
    const changelogManager = new Changelog('0.0.0', 'test/fixtures/changelog/');
    const changelogs = await changelogManager.readChangelogs();
    expect(Array.isArray(changelogs)).toBeTruthy();
    expect(changelogs.length).toBe(3);
    expect(typeof changelogs[0]).toBe('object');
  } catch (e) {
    expect(e).toBeUndefined();
  }
});

test('Changelog.readChangelogs returns changelogs ordered by version', async () => {
  try {
    const changelogManager = new Changelog('0.0.0', 'test/fixtures/changelog/');
    const changelogs = await changelogManager.readChangelogs();
    expect(changelogs[0].version).toBe('1.2.3');
    expect(changelogs[1].version).toBe('1.2.11');
    expect(changelogs[2].version).toBe('4.3.2');
  } catch (e) {
    expect(e).toBeUndefined();
  }
});

test('Changelog.readChangelogs uses the current version by default if no version is provided', async () => {
  try {
    const changelogManager = new Changelog(null, 'test/fixtures/changelog/');
    const changelog = await changelogManager.getChangelog();

    expect(changelog.version).toBe('4.3.2');
    expect(changelog.sections.Fixes).toBeTruthy();
    expect(changelog.sections['What\'s new']).toBeTruthy();
  } catch (e) {
    expect(e).toBeUndefined();
  }
});

test('Changelog.readChangelogs returns an aggregated changelog with the correct versions if a prior version is provided', async () => {
  try {
    const changelogManager = new Changelog('1.2.3', 'test/fixtures/changelog/');
    const changelog = await changelogManager.getChangelog();

    expect(changelog.version).toBe('4.3.2');
    expect(changelog.sections.Fixes.indexOf('Fix: 1.2.11 fixes')).toBeGreaterThan(-1);
    expect(changelog.sections['What\'s new']).toBeTruthy();
    expect(changelog.sections['1.2.3 Heading']).toBeFalsy();
  } catch (e) {
    expect(e).toBeUndefined();
  }
});
