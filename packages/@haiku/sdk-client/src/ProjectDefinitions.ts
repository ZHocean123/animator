import * as dedent from 'dedent';
import * as fse from 'fs-extra';
import * as path from 'path';

export const WHITESPACE_REGEX: RegExp = /\s+/;
export const UNDERSCORE = '_';
export const FALLBACK_SEMVER_VERSION = '0.0.0';
export const FALLBACK_ORG_NAME = 'Unknown';
export const FALLBACK_PROJECT_NAME = 'Unknown';
export const FALLBACK_AUTHOR_NAME = 'Haiku User';
export const DEFAULT_BRANCH_NAME = 'master';

export const getHaikuCoreVersion = (): string => {
  const CORE_PACKAGE_JSON = fse.readJsonSync(
    require.resolve(path.join('@haiku/core', 'package.json')),
    {throws: false},
  );

  if (CORE_PACKAGE_JSON) {
    return CORE_PACKAGE_JSON.version;
  }

  return FALLBACK_SEMVER_VERSION;
};

export const getHaikuComponentInitialVersion = (): string => {
  return FALLBACK_SEMVER_VERSION;
};

export const getSafeProjectName = (name: string): string =>
  (name && name.replace(WHITESPACE_REGEX, UNDERSCORE)) || FALLBACK_PROJECT_NAME;

export const getProjectNameSafeShort = (name: string): string => getSafeProjectName(name).slice(0, 20);

export const getProjectNameLowerCase = (name: string): string => getSafeProjectName(name).toLowerCase();

export const getReactProjectName = (name: string): string => `React_${getSafeProjectName(name)}`;

export const getAngularSelectorName = (name: string): string => getSafeProjectName(name)
.replace(/([A-Z])/g, (char: string) => `-${char.toLowerCase()}`)
.replace(/^-/, '');

export const getStandaloneName = (organizationName: string, name: string): string =>
  `HaikuComponent_${organizationName}_${getProjectNameSafeShort(name)}`;

export const getCopyrightNotice = (organizationName: string): string => dedent`
${`Copyright (c) ${(new Date()).getFullYear()} ${organizationName}. All rights reserved.`}
`;

export const getOrganizationNameOrFallback = (organizationName: string): string => {
  return organizationName || FALLBACK_ORG_NAME;
};

export const getAuthorNameOrFallback = (authorName: string): string => authorName || FALLBACK_AUTHOR_NAME;

export const readPackageJson = (folder: string): {haiku?: any, version?: string} => {
  let pkgjson: {haiku?: any, version?: string} = {};
  try {
    pkgjson = fse.readJsonSync(path.join(folder, 'package.json'), {throws: true});
  } catch (e) {
    pkgjson = {};
  }
  if (!pkgjson.haiku) {
    pkgjson.haiku = {};
  }
  if (!pkgjson.version) {
    pkgjson.version = FALLBACK_SEMVER_VERSION;
  }
  return pkgjson;
};

export const fetchProjectConfigInfo = (folder: string, cb: any): any => {
  const pkgjson = readPackageJson(folder);
  const config = (pkgjson && pkgjson.haiku) || {};
  return cb(
    null,
    Object.assign(
      config,
      {
        folder,
        uuid: 'HAIKU_SHARE_UUID', // Replaced on the server
        root: 'HAIKU_CDN_PROJECT_ROOT', // Replaced on the server
        core: getHaikuCoreVersion(),
        version: pkgjson.version,
      },
    ),
  );
};

export const storeConfigValues = (folder: string, incoming: any, extra = {}): any => {
  fse.mkdirpSync(folder);
  const pkgjson = readPackageJson(folder);
  Object.assign(pkgjson.haiku, extra, pkgjson.haiku, incoming);
  fse.outputJsonSync(path.join(folder, 'package.json'), pkgjson, {spaces: 2});
  return pkgjson.haiku;
};

export const getDefaultIllustratorAssetPath = (name: string): string => `designs/${getProjectNameSafeShort(name)}.ai`;

export const getDefaultSketchAssetPath = (name: string): string => `designs/${getProjectNameSafeShort(name)}.sketch`;
