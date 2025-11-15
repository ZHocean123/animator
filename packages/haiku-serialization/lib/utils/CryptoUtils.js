var CryptoJs = require('crypto-js');
var realSha256 = require('crypto-js/sha256');
function aesDecrypt(str, passcode) {
    return CryptoJs.AES.decrypt(str, passcode).toString(CryptoJs.enc.Utf8);
}
function aesEncrypt(str, passcode) {
    return CryptoJs.AES.encrypt(str, passcode).toString();
}
function safeJsonStringify(objToStringify, maybeReplacer, maybeSpacing) {
    try {
        return JSON.stringify(objToStringify, maybeReplacer, maybeSpacing);
    }
    catch (exception) {
        return null;
    }
}
function sha256(input) {
    var jsonStr = safeJsonStringify(input);
    if (!jsonStr) {
        return null;
    }
    return realSha256(jsonStr).toString();
}
module.exports = {
    aesEncrypt: aesEncrypt,
    aesDecrypt: aesDecrypt,
    sha256: sha256,
};
//# sourceMappingURL=CryptoUtils.js.map