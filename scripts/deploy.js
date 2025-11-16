



import os from "os";
import path from "path";

let VAULT = path.join(os.homedir(), 'Secrets');

if (!process.env.HAIKU_INTERNAL_SLACK_CLIENT_ID) {
  throw new Error('env var missing');
}
if (!process.env.HAIKU_INTERNAL_SLACK_CLIENT_SECRET) {
  throw new Error('env var missing');
}
if (!process.env.HAIKU_INTERNAL_SLACK_TOKEN) {
  throw new Error('env var missing');
}
if (!process.env.HAIKU_INTERNAL_SLACK_LEGACY_TOKEN) {
  throw new Error('env var missing');
}
if (!process.env.HAIKU_RELEASE_WRITER_KEY) {
  throw new Error('env var missing');
}
if (!process.env.HAIKU_RELEASE_WRITER_SECRET) {
  throw new Error('env var missing');
}
if (!process.env.HAIKU_S3_DEPLOYER_KEY) {
  throw new Error('env var missing');
}
if (!process.env.HAIKU_S3_DEPLOYER_SECRET) {
  throw new Error('env var missing');
}




export const vault = VAULT;
export const certificate = 'HaikuSystemsIncDeveloperId.p12';
// certificate = 'DeveloperIdApplicationMatthewB73M94S23A.p12';
export const cloud_installer = {};
export const slack = {
  clientId: process.env.HAIKU_INTERNAL_SLACK_CLIENT_ID,
  clientSecret: process.env.HAIKU_INTERNAL_SLACK_CLIENT_SECRET,
  token: process.env.HAIKU_INTERNAL_SLACK_TOKEN,
  legacy: process.env.HAIKU_INTERNAL_SLACK_LEGACY_TOKEN,
  deployer: {
    production: {
      region: 'us-east-1',
      bucket: 'haiku-electron-releases-production',
      user: 'haiku-electron-releases-writer-2',
      distribution: 'E29RYBWU7AU9',
      key: process.env.HAIKU_RELEASE_WRITER_KEY,
      secret: process.env.HAIKU_RELEASE_WRITER_SECRET,
    },
    development: {
      region: 'us-east-1',
      bucket: 'haiku-electron-releases-development',
      user: 'haiku-electron-releases-writer-2',
      key: process.env.HAIKU_RELEASE_WRITER_KEY,
      secret: process.env.HAIKU_RELEASE_WRITER_SECRET,
    },
  },
};
export const code_haiku_ai = {
  production: {
    user: 'haiku-s3-deployer-2',
    key: process.env.HAIKU_S3_DEPLOYER_KEY,
    secret: process.env.HAIKU_S3_DEPLOYER_SECRET,
  },
};
export const cloudfront = {
  production: {
    distributionId: 'E1FUJARDP1LMEC',
    profile: 'haiku',
  },
};
export const marketing = {
  production: {
    user: 'haiku-s3-deployer-2',
    key: process.env.HAIKU_S3_DEPLOYER_KEY,
    secret: process.env.HAIKU_S3_DEPLOYER_SECRET,
  },
};