/* eslint-disable node/prefer-global/process */
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { app } from 'electron'
import { isMac } from 'haiku-common'
import * as HS from 'haiku-serialization'
import nodeFetch from 'node-fetch'
import * as qs from 'qs'
import { v4 as uuidv4 } from 'uuid'

const logger = (HS as any).logger
const fileManipulation = (HS as any).fileManipulation ?? HS
const { download, unzip, ditto } = fileManipulation as any

const DEFAULT_OPTIONS = {
  server: process.env.HAIKU_AUTOUPDATE_SERVER,
  environment: process.env.NODE_ENV,
  branch: process.env.HAIKU_RELEASE_BRANCH,
  platform: process.env.HAIKU_RELEASE_PLATFORM,
  version: process.env.HAIKU_RELEASE_VERSION,
  testAutoupdate: process.env.HAIKU_TEST_AUTOUPDATE,
}

export interface CheckResult {
  status: number
  url: string
}

export default {
  async update(url: string, progressCallback: (progress: number) => void, options = DEFAULT_OPTIONS) {
    if (process.env.HAIKU_SKIP_AUTOUPDATE !== '1') {
      if (!isMac()) {
        logger.warn('[autoupdater] Skipping mac-only update routine on non-mac platform')
        return
      }
      if (
        !options.server
        || !options.environment
        || !options.branch
        || !options.platform
        || !options.version
      ) {
        throw new Error('Missing release/autoupdate environment variables')
      }

      const tempPath = os.tmpdir()
      const zipPath = path.join(tempPath, `${uuidv4()}.zip`)
      const extractPath = path.join(tempPath, uuidv4())
      const appPath = path.resolve(app.getPath('exe'), '..', '..')
      logger.info('[autoupdater] About to download an update:', options, url)
      await download(url, zipPath, progressCallback)
      // `unzip` first, you can unzip in `ditto` by providing the `-xk` flags, but trying to target `/Applications`
      // throws permission errors.
      await unzip(zipPath, extractPath)
      const newAppName = fs.readdirSync(extractPath).find((file) => {
        return path.extname(file) === '.app'
      })

      if (!newAppName) {
        throw new Error('Couldn\'t find a valid application from the downloaded zip')
      }

      // `ditto` the contents of the extract path folder (the .app package) into `appPath`
      await ditto(path.join(extractPath, newAppName), appPath)
      app.relaunch()
      app.exit()
    }
  },

  checkUpdates() {
    return new Promise((resolve, reject) => {
      this.checkServer()
        .then(({ status, url }: CheckResult) => {
          status === 200 && url
            ? resolve({ url, shouldUpdate: true })
            : resolve({ shouldUpdate: false, url: null })
        })
        .catch(reject)
    })
  },

  checkServer() {
    let status: number

    return new Promise((resolve, reject) => {
      nodeFetch(this.generateURL(DEFAULT_OPTIONS))
        .then((response) => {
          if (!response.ok) {
            reject(new Error(`${response.statusText} : ${response.url}`))
          }
          status = response.status
          return status === 200 ? response.json() : {}
        })
        .then((data: { url: string }) => {
          resolve({ status, url: data.url })
        })
        .catch(reject)
    })
  },

  generateURL({ server, ...query}: { server: string }) {
    const queryString = qs.stringify(query)

    return `${server}/updates/latest?${queryString}`
  },
}
