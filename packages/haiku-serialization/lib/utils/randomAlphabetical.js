var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
function randomAlphabetical(len) {
    var text = '';
    for (var i = 0; i < len; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}
module.exports = randomAlphabetical;
//# sourceMappingURL=randomAlphabetical.js.map