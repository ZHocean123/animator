import CryptoJs from 'crypto-js';

function aesDecrypt (str, passcode) {
  return CryptoJs.AES.decrypt(str, passcode).toString(CryptoJs.enc.Utf8);
}

function aesEncrypt (str, passcode) {
  return CryptoJs.AES.encrypt(str, passcode).toString();
}

function safeJsonStringify (objToStringify, maybeReplacer, maybeSpacing) {
  try {
    return JSON.stringify(objToStringify, maybeReplacer, maybeSpacing);
  } catch (exception) {
    return null;
  }
}

function sha256 (input) {
  const jsonStr = safeJsonStringify(input);
  if (!jsonStr) {
    return null;
  }
  return CryptoJs.SHA256.encrypt(jsonStr).toString();
}

export {
  aesEncrypt,
  aesDecrypt,
  sha256,
};

export default {
  aesEncrypt,
  aesDecrypt,
  sha256,
};
