




import log from "./log";
import initializeAWSService from "./initializeAwsService";
import DEPLOY_CONFIGS from "./../deploy";

export default function s3CopyObject (sourceKey, destKey, region, deployer, env, bucket, acl, cb) {
  const config = DEPLOY_CONFIGS[deployer][env];

  if (!config) {
    throw new Error(`No config for ${deployer} / ${env}`);
  }

  const accessKeyId = config.key;
  const secretAccessKey = config.secret;

  const s3 = initializeAWSService('S3', region, accessKeyId, secretAccessKey);
  log.log(`copying ${sourceKey} to ${destKey} within ${bucket}...`);
  s3.copyObject({
    Bucket: bucket,
    CopySource: `/${bucket}/${sourceKey}`,
    Key: destKey,
    ACL: acl,
  }, cb);
};
