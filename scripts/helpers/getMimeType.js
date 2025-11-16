let mime = (await import("mime-types"));

let DEFAULT_MIME_TYPE = 'application/octet-stream';

function getMimeType (str) {
  return mime.lookup(str) || DEFAULT_MIME_TYPE;
}

export default getMimeType;
