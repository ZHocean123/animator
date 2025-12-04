let fs = require('graceful-fs')
let Buffer = require('node:buffer').Buffer

let BUF_LENGTH = 64 * 1024
let _buff = Buffer.alloc(BUF_LENGTH)

function copyFileSync(srcFile, destFile, options) {
  let clobber = options.clobber
  let preserveTimestamps = options.preserveTimestamps

  if (fs.existsSync(destFile)) {
    if (clobber) {
      fs.unlinkSync(destFile)
    }
    else {
      let err = new Error(`EEXIST: ${destFile} already exists.`)
      err.code = 'EEXIST'
      err.errno = -17
      err.path = destFile
      throw err
    }
  }

  let fdr = fs.openSync(srcFile, 'r')
  let stat = fs.fstatSync(fdr)
  let fdw = fs.openSync(destFile, 'w', stat.mode)
  let bytesRead = 1
  let pos = 0

  while (bytesRead > 0) {
    bytesRead = fs.readSync(fdr, _buff, 0, BUF_LENGTH, pos)
    fs.writeSync(fdw, _buff, 0, bytesRead)
    pos += bytesRead
  }

  if (preserveTimestamps) {
    fs.futimesSync(fdw, stat.atime, stat.mtime)
  }

  fs.closeSync(fdr)
  fs.closeSync(fdw)
}

module.exports = copyFileSync
