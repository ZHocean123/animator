var parse = require('@babel/parser').parse;
function parseCode(code, options) {
    try {
        var parsed = parse(code, options || {
            sourceType: 'module',
        });
        return parsed;
    }
    catch (exception) {
        return exception;
    }
}
module.exports = parseCode;
//# sourceMappingURL=parseCode.js.map