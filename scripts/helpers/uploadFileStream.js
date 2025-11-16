let fs = (await import("fs"));
let log = (await import("./log"));
let initializeAWSService = (await import("./initializeAwsService"));
let uploadObjectToS3 = (await import("./uploadObjectToS3"));
let DEPLOY_CONFIGS = (await import("./../deploy"));

export default function uploadFileStream (sourcepath, destpath, region, deployer, env, bucket, acl, cb) {
  const config = DEPLOY_CONFIGS[deployer][env];

  if (!config) {
    throw new Error(`No config for ${deployer} / ${env}`);
  }

  const accessKeyId = config.key;
  const secretAccessKey = config.secret;

  const s3 = initializeAWSService('S3', region, accessKeyId, secretAccessKey);
  const stream = fs.createReadStream(sourcepath);

  log.log('uploading ' + sourcepath + ' as ' + destpath + ' to ' + bucket + '...');

  return uploadObjectToS3(s3, destpath, stream, bucket, acl, cb);
};
