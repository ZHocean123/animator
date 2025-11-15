var https = require('https');
var fs = require('fs');
var exec = require('child_process').exec;
var RESERVED_CHAR_REPLACEMENT = '-';
var FILENAME_RESERVED_REGEX = /[<>:"\/\\|?*\x00-\x1F]/g;
var WINDOWS_NAMES_RESERVED_REGEX = /^(con|prn|aux|nul|com[0-9]|lpt[0-9])$/i;
module.exports = {
    download: function (url, downloadPath, onProgress, shouldCancel) {
        var file = fs.createWriteStream(downloadPath);
        return new Promise(function (resolve, reject) {
            var request = https.get(url, function (response) {
                var contentLenght = parseInt(response.headers['content-length'], 10);
                var progress = 0;
                response.pipe(file);
                response.on('data', function (data) {
                    if (typeof shouldCancel === 'function' && shouldCancel()) {
                        request.abort();
                        file.close();
                        reject(Error('Download cancelled'));
                    }
                    progress += data.length;
                    onProgress(progress * 100 / contentLenght);
                });
                response.on('error', function (error) {
                    fs.unlink(downloadPath);
                    reject(error);
                });
                file.on('finish', function () {
                    file.close(resolve);
                });
            });
        });
    },
    unzip: function (zipPath, destination) {
        var saneZipPath = JSON.stringify(zipPath);
        var saneDestination = JSON.stringify(destination);
        var unzipCommand = "/usr/bin/unzip -o -qq ".concat(saneZipPath, " -d ").concat(saneDestination);
        return new Promise(function (resolve, reject) {
            exec(unzipCommand, {}, function (err) {
                err ? reject(err) : resolve(true);
            });
        });
    },
    ditto: function (src, dest) {
        var saneSrc = JSON.stringify(src);
        var saneDest = JSON.stringify(dest);
        var dittoComand = "/usr/bin/ditto ".concat(saneSrc, " ").concat(saneDest);
        return new Promise(function (resolve, reject) {
            exec(dittoComand, {}, function (err) {
                err ? reject(err) : resolve(true);
            });
        });
    },
    sanitize: function (name) {
        if (typeof name !== 'string') {
            return '';
        }
        return name
            .replace(FILENAME_RESERVED_REGEX, RESERVED_CHAR_REPLACEMENT)
            .replace(WINDOWS_NAMES_RESERVED_REGEX, RESERVED_CHAR_REPLACEMENT);
    },
    stringifyPath: function (filePath) {
        if (typeof filePath !== 'string') {
            return '';
        }
        return filePath.replace(/\\/g, '\\\\');
    },
};
//# sourceMappingURL=fileManipulation.js.map