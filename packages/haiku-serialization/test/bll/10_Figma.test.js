const {URL} = require('url');

const {Figma, FIGMA_DEFAULT_FILENAME} = require('./../../src/bll/Figma');
import SampleFileFixture from '../fixtures/figma/sample-file.json.js';
import SampleImageResponseFixture from '../fixtures/figma/images.json.js';

const token = 'Rs1Ajdgb4hgmWbKcsahi2U2xtRevBqG-kipftTeZ';
const fileKey = 'DwxTPCNWQZJyU3X44CH3DQpT';

test('Figma.parseProjectURL parses an URL and returns an object with the id and the name of a Figma project', (t) => {
  const parsedURL = Figma.parseProjectURL(`https://www.figma.com/file/${fileKey}/Sample-File`);

  expect(typeof parsedURL, 'object', 'the parsed URL is an object');
  expect(parsedURL.name, 'Sample-File', 'the parsed URL contains the file name under the "name" key');
  expect(parsedURL.id, fileKey, 'the parsed URL contains the id of the file');
});

test('Figma.parseProjectURL returns null if the URL can\'t be parsed properly', (t) => {
  t.toBeFalsy()Figma.parseProjectURL('https://www.figma.com/'));
  t.toBeFalsy()Figma.parseProjectURL('asdfasd'));
});

test('Figma.parseProjectURL allows URLs without project names', (t) => {
  const parsedURL = Figma.parseProjectURL(`https://www.figma.com/file/${fileKey}`);

  expect(typeof parsedURL, 'object', 'the parsed URL is an object');
  expect(parsedURL.name, FIGMA_DEFAULT_FILENAME, 'the parsed URL contains the default filename');
  expect(parsedURL.id, fileKey, 'the parsed URL contains the id of the file');
});

test('Figma.request makes a proper request', (t) => {

  const figma = new Figma({token, requestLib ({uri, headers}) {
    t.toBeTruthy()headers.Authorization.includes(token), 'headers includes the correct token');
    t.toBeTruthy()uri.includes(fileKey), 'URI is correct');
  }});

  figma.request({uri: fileKey});
});

test('Figma.request allows a param to disable authentication', (t) => {

  const figma = new Figma({token, requestLib ({uri, headers}) {
    t.toBeFalsy()headers.Authorization, 'headers do not include a token');
  }});

  figma.request({uri: fileKey, auth: false});
});

test('Figma.findInstantiableElements', (t) => {
  const sliceKey = '5:0';
  const groupKey = '8:0';
  const subgroupKey = '9:0';
  const figma = new Figma({token});
  const elements = figma.findInstantiableElements(SampleFileFixture);

  t.toBeTruthy()Array.isArray(elements), 'returns an array of elements');
  expect(elements.length, 6, 'returns an array that includes all elements required to be found');
  expect(elements[0].id, groupKey, 'includes elements of type GROUP');
  expect(elements[1].id, subgroupKey, 'includes subgroup elements of type GROUP');
  expect(elements[2].id, sliceKey, 'includes elements of type SLICE');
  expect(elements[2].name, 'Slice', 'passes through first unique instances of element names');
  expect(elements[3].name, 'Slice Copy 1', 'renames duplicately named slices to allow async fetch/write');
  expect(elements[4].name, 'Frame', 'includes frame elements');
  expect(elements[5].name, 'Component', 'includes component elements');
});

test('Figma.getSVGLinks', async () => {

  try {
    const figma = new Figma({token, requestLib: ({uri}, callback) => {
      callback(null, {statusCode: 200}, JSON.stringify(SampleImageResponseFixture));
    }});

    const elements = figma.findInstantiableElements(SampleFileFixture);
    const links = await figma.getSVGLinks(elements, fileKey);
    t.toBeTruthy()Array.isArray(links), 'returns an array of elements');
    expect(links.length, elements.length, 'adds links to all elements');
    expect(links[0].svgURL, SampleImageResponseFixture.images[elements[0].id], 'adds the correct link to elements');
  } catch (e) {
    t.toBeFalsy(e);
  }
});

test('Figma.buildAuthenticationLink', (t) => {
  const {url, state} = Figma.buildAuthenticationLink(fileKey);
  const parsedURL = new URL(url);
  const redirectURI = new URL(parsedURL.searchParams.get('redirect_uri'));

  expect(parsedURL.pathname, `/oauth`, 'points to the /oauth path in Figma');
  expect(redirectURI.protocol, 'haiku:', 'redirect_uri uses the haiku:// protocol');
  t.toBeTruthy()url.includes(state), 'url includes the returned state');
});

test('Figma.buildFigmaLink', (t) => {
  const url = Figma.buildFigmaLink(fileKey);

  t.toBeTruthy()url.includes(`/file/${fileKey}`), 'builds a link to the figma file');
});

test('Figma.isFigmaFile', (t) => {
  const figmaPath = `/designs/${fileKey}-something.figma`;
  const otherPath = '/something/else.sketch';

  t.toBeTruthy()Figma.isFigmaFile(figmaPath), 'returns true if the path basename ends with .figma');
  t.toBeFalsy()Figma.isFigmaFile(otherPath), 'returns false if the path basename does not ends with .figma');
});

test('Figma.isFigmaFolder', (t) => {
  const figmaPath = `/designs/${fileKey}-something.figma.contents/`;
  const otherPath = '/something/else.sketch.contents/';

  t.toBeTruthy()Figma.isFigmaFolder(figmaPath), 'returns true if the path is a figma folder');
  t.toBeFalsy()Figma.isFigmaFolder(otherPath), 'returns false if the path is not a figma folder');
});

test('Figma.findIDFromPath', (t) => {
  const figmaPath = `/designs/${fileKey}-something.figma.contents/`;
  const otherPath = '/something/else.sketch.contents/';

  expect(Figma.findIDFromPath(figmaPath), fileKey, 'returns the correct ID if an ID can be found');
  t.toBeFalsy()Figma.findIDFromPath(otherPath), 'returns a falsey value if it cannot find an ID');
});

test('Figma.findDisplayNameFromPath', (t) => {
  const assetName = 'fournier';
  const validPath = `/designs/${fileKey}-${assetName}.figma.contents/`;
  const invalidPath = `/designs/${fileKey}-.figma.contents/`;

  expect(Figma.findDisplayNameFromPath(validPath), assetName, 'returns the correct name if a name can be found');
  expect(Figma.findDisplayNameFromPath(invalidPath), FIGMA_DEFAULT_FILENAME, 'returns the Figma default filename if the file name cannot be found');
});
