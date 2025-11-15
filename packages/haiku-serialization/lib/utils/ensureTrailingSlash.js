module.exports = function (str) {
    return (str[str.length - 1] === '/')
        ? str
        : "".concat(str, "/");
};
//# sourceMappingURL=ensureTrailingSlash.js.map