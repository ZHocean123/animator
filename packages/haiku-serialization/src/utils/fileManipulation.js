import { exec } from 'node:child_process'
import fs from 'node:fs'
import https from 'node:https'

const RESERVED_CHAR_REPLACEMENT = '-'
const FILENAME_RESERVED_REGEX = /[<>:"/\\|?*\x00-\x1F]/g
const WINDOWS_NAMES_RESERVED_REGEX = /^(con|prn|aux|nul|com\d|lpt\d)$/i

export function download(url, downloadPath, onProgress, shouldCancel) {
  const file = fs.createWriteStream(downloadPath)

  return new Promise((resolve, reject) => {
    const request = https.get(url, (response) => {
      const contentLenght = Number.parseInt(response.headers['content-length'], 10)
      let progress = 0

      response.pipe(file)

      response.on('data', (data) => {
        if (typeof shouldCancel === 'function' && shouldCancel()) {
          request.abort()
          file.close()
          reject(new Error('Download cancelled'))
        }

        progress += data.length
        onProgress(progress * 100 / contentLenght)
      })

      response.on('error', (error) => {
        fs.unlink(downloadPath)
        reject(error)
      })

      file.on('finish', () => {
        file.close(resolve)
      })
    })
  })
}

export function unzip(zipPath, destination) {
  const saneZipPath = JSON.stringify(zipPath)
  const saneDestination = JSON.stringify(destination)
  const unzipCommand = `/usr/bin/unzip -o -qq ${saneZipPath} -d ${saneDestination}`

  return new Promise((resolve, reject) => {
    exec(unzipCommand, {}, (err) => {
      err ? reject(err) : resolve(true)
    })
  })
}

export function ditto(src, dest) {
  const saneSrc = JSON.stringify(src)
  const saneDest = JSON.stringify(dest)
  const dittoComand = `/usr/bin/ditto ${saneSrc} ${saneDest}`

  return new Promise((resolve, reject) => {
    exec(dittoComand, {}, (err) => {
      err ? reject(err) : resolve(true)
    })
  })
}

export function sanitize(name) {
  if (typeof name !== 'string') {
    return ''
  }

  return name
    .replace(FILENAME_RESERVED_REGEX, RESERVED_CHAR_REPLACEMENT)
    .replace(WINDOWS_NAMES_RESERVED_REGEX, RESERVED_CHAR_REPLACEMENT)
}

export function stringifyPath(filePath) {
  if (typeof filePath !== 'string') {
    return ''
  }

  return filePath.replace(/\\/g, '\\\\')
}
