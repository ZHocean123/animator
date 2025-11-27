/* eslint-disable node/prefer-global/process */
import type { Buffer } from 'node:buffer'
import { exec } from 'node:child_process'
import * as fs from 'node:fs'
import * as https from 'node:https'
import * as path from 'node:path'

const RESERVED_CHAR_REPLACEMENT = '-'
// oxlint-disable-next-line no-control-regex
// eslint-disable-next-line no-control-regex
const FILENAME_RESERVED_REGEX = /[<>:"/\\|?*\x00-\x1F]/g
const WINDOWS_NAMES_RESERVED_REGEX = /^(con|prn|aux|nul|com\d|lpt\d)$/i

export default {
  download(url: string, downloadPath: string, onProgress: (percent: number) => void, shouldCancel?: () => boolean) {
    const file = fs.createWriteStream(downloadPath)
    return new Promise<void>((resolve, reject) => {
      const request = https.get(url, (response) => {
        const contentLenght = Number.parseInt(response.headers['content-length'] || '0', 10)
        let progress = 0
        response.pipe(file)
        response.on('data', (data: Buffer) => {
          if (typeof shouldCancel === 'function' && shouldCancel()) {
            request.abort()
            file.close()
            reject(new Error('Download cancelled'))
          }
          progress += data.length
          if (contentLenght > 0)
            onProgress((progress * 100) / contentLenght)
        })
        response.on('error', (error) => {
          try {
            fs.unlinkSync(downloadPath)
          }
          catch {}
          reject(error)
        })
        file.on('finish', () => {
          file.close()
          resolve()
        })
      })
    })
  },

  unzip(zipPath: string, destination: string) {
    const absZip = path.resolve(zipPath)
    const absDest = path.resolve(destination)
    const saneZipPath = JSON.stringify(absZip)
    const saneDestination = JSON.stringify(absDest)
    const isWin = process.platform === 'win32'
    const unzipCommand = isWin
      ? `powershell -NoProfile -Command "$zip=${saneZipPath}; $dest=${saneDestination}; Add-Type -A 'System.IO.Compression.FileSystem'; [IO.Compression.ZipFile]::ExtractToDirectory($zip, $dest)"`
      : `/usr/bin/unzip -o -qq ${saneZipPath} -d ${saneDestination}`
    return new Promise<boolean>((resolve, reject) => {
      exec(unzipCommand, {}, (err) => {
        err ? reject(err) : resolve(true)
      })
    })
  },

  ditto(src: string, dest: string) {
    const saneSrc = JSON.stringify(src)
    const saneDest = JSON.stringify(dest)
    const dittoComand = `/usr/bin/ditto ${saneSrc} ${saneDest}`
    return new Promise<boolean>((resolve, reject) => {
      exec(dittoComand, {}, (err) => {
        err ? reject(err) : resolve(true)
      })
    })
  },

  sanitize(name: unknown): string {
    if (typeof name !== 'string')
      return ''
    return name.replace(FILENAME_RESERVED_REGEX, RESERVED_CHAR_REPLACEMENT).replace(WINDOWS_NAMES_RESERVED_REGEX, RESERVED_CHAR_REPLACEMENT)
  },

  stringifyPath(filePath: unknown): string {
    if (typeof filePath !== 'string')
      return ''
    return filePath.replace(/\\/g, '\\\\')
  },
}
