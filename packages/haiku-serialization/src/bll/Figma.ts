/* eslint-disable node/prefer-global/process */
import path from 'node:path'
import { URL, URLSearchParams } from 'node:url'
import { inkstone } from '@haiku/sdk-inkstone'
import fse from 'haiku-fs-extra'
import request from 'request'
import fileManipulation from '../utils/fileManipulation'
import logger from '../utils/LoggerInstance'
import mixpanel from '../utils/mixpanel'

const { sanitize } = fileManipulation as any

const API_BASE = 'https://api.figma.com/v1/'
const FIGMA_URL = 'https://www.figma.com/'
const FIGMA_CLIENT_ID = process.env.FIGMA_CLIENT_ID || 'tmhDo4V12I3fEiQ9OG8EHh'
const IS_FIGMA_FILE_RE = /\.figma$/
const IS_FIGMA_FOLDER_RE = /\.figma\.contents/
export const FIGMA_DEFAULT_FILENAME = 'Untitled'

const VALID_TYPES = { SLICE: 'SLICE', GROUP: 'GROUP', FRAME: 'FRAME', COMPONENT: 'COMPONENT' } as Record<string, string>
const FOLDERS = { SLICE: 'slices/', GROUP: 'groups/', COMPONENT: 'groups/', FRAME: 'frames/' } as Record<string, string>

export const MAX_ITEMS_TO_IMPORT = 100

const uniqueNameResolver: Record<string, Record<string, number>> = {}

export const PHONY_FIGMA_FILE = 'phony-haiku-helper-file.svg'

class Figma {
  private _token: string
  private _requestLib: typeof request

  constructor({ token, requestLib = request }: { token: string, requestLib?: typeof request }) {
    this._token = token
    this._requestLib = requestLib
  }

  set token(token: string) { this._token = token }
  get token() { return this._token }

  importSVG({ url, projectFolder }: { url: string, projectFolder: string }) {
    const { id } = (Figma as any).parseProjectURL(url)
    let assetBaseFolder: string
    ;(logger as any).info(`[figma] about to import document with id ${id}`)
    ;(mixpanel as any).haikuTrack('creator:figma:fileImport:start')
    return new Promise((resolve, reject) => {
      this.fetchDocument(id)
        .then((rawDocument: string) => {
          const document = JSON.parse(rawDocument)
          const abspath = path.join(projectFolder, 'designs', `${id}-${document.name}.figma`)
          assetBaseFolder = `${abspath}.contents`
          this.createFolders(assetBaseFolder)
          return document
        })
        .then((document: any) => this.findInstantiableElements(document, id))
        .then((elements: any[]) => this.sortElementsByPriorityToImport(elements))
        .then((elements: any[]) => this.getSVGLinks(elements, id))
        .then((elements: any[]) => this.getSVGContents(elements))
        .then((elements: any[]) => this.writeSVGInDisk(elements, assetBaseFolder))
        .then((elements: any[]) => { (mixpanel as any).haikuTrack('creator:figma:fileImport:success'); resolve(elements.length) })
        .catch(reject)
    })
  }

  fetchDocument(id: string) { const uri = `${API_BASE}files/${id}`; return this.request({ uri }) }

  createFolders(assetBaseFolder: string) {
    return new Promise((resolve, reject) => {
      try {
        fse.emptyDirSync(assetBaseFolder)
        const sliceFolder = path.join(assetBaseFolder, (FOLDERS as any)[VALID_TYPES.SLICE])
        fse.mkdirpSync(sliceFolder)
        const groupFolder = path.join(assetBaseFolder, (FOLDERS as any)[VALID_TYPES.GROUP])
        fse.mkdirpSync(groupFolder)
        const frameFolder = path.join(assetBaseFolder, (FOLDERS as any)[VALID_TYPES.FRAME])
        fse.mkdirpSync(frameFolder)
        fse.ensureFileSync(path.join(sliceFolder, PHONY_FIGMA_FILE))
        resolve(true)
      }
      catch (error) { reject(error) }
    })
  }

  writeSVGInDisk(elements: any[], assetBaseFolder: string) {
    ;(logger as any).info('[figma] writing SVGs in disk')
    return Promise.all(elements.map((element: any) => {
      if (element) {
        const folder = (FOLDERS as any)[element.type] || (FOLDERS as any).SLICE
        const svgPath = path.join(assetBaseFolder, folder, `${sanitize(element.name)}.svg`)
        return fse.writeFile(svgPath, element.svg || '<svg version="1.1" xmlns="http://www.w3.org/2000/svg"></svg>')
      }
    }))
  }

  getSVGContents(elements: any[]) {
    ;(logger as any).info('[figma] downloading SVGs from cloud')
    const requests = elements.map((element: any) => new Promise((resolve) => {
      this.request({ uri: element.svgURL, auth: false }).then((svg: string) => { resolve(Object.assign(element, { svg })) }).catch((error: any) => { (logger as any).error(`[figma] failed to import slice or group: ${JSON.stringify(element)}`, error); resolve() })
    }))
    return Promise.all(requests)
  }

  getSVGLinks(elements: any[], id: string) {
    return new Promise((resolve, reject) => {
      let ids: any = elements.map((element: any) => element.id)
      if (ids.length === 0) { return reject({ status: 424, err: 'It looks like the Figma document you imported doesn\'t have any groups or slices. Try adding some and re-syncing.' }) }
      if (ids.length > MAX_ITEMS_TO_IMPORT) { ids = ids.slice(0, MAX_ITEMS_TO_IMPORT) }
      const params = new URLSearchParams([['format', 'svg'], ['ids', ids], ['svg_include_id', true]])
      const uri = `${API_BASE}images/${id}?${params.toString()}`
      this.request({ uri }).then((SVGLinks: string) => {
        const { images } = JSON.parse(SVGLinks)
        const elementsWithLinks = elements.map((element: any) => Object.assign(element, { svgURL: images[element.id] }))
        resolve(elementsWithLinks)
      }).catch(reject)
    })
  }

  sortElementsByPriorityToImport(arr: any[]) { return arr.sort((a: any, b: any) => (Object.values(VALID_TYPES) as any).indexOf(a.type) - (Object.values(VALID_TYPES) as any).indexOf(b.type)) }

  findItems(arr: any[], fileId: string) {
    const result: any[] = []
    for (const item of arr) {
      if ((VALID_TYPES as any)[item.type] || (item.exportSettings && item.exportSettings.length > 0)) {
        result.push({ id: item.id, name: (Figma as any).getUniqueName(fileId, item.name), type: item.type })
      }
      if (item.children) { result.push(...this.findItems(item.children, fileId)) }
    }
    return result
  }

  findInstantiableElements(file: any, fileId: string) { uniqueNameResolver[fileId] = {}; return this.findItems(file.document.children, fileId) }

  request({ uri, auth = true }: { uri: string, auth?: boolean }) {
    const headers = auth ? { Authorization: `Bearer ${this.token}` } : {}
    return new Promise((resolve, reject) => {
      this._requestLib({ uri, headers }, (error: any, response: any, body: any) => {
        if (error || response.statusCode !== 200) {
          try { reject(JSON.parse(body)) }
          catch { reject({ status: 500, err: 'There was an error connecting with Figma.' }) }
        }
        else { resolve(body) }
      })
    })
  }

  static parseProjectURL(rawURL: string) {
    ;(logger as any).info(`[figma] parsing project URL: ${rawURL}`)
    try {
      const url = new URL(rawURL); const parts = (url.pathname as any).split('/'); const id = parts[2]; const name = parts[3]; if (!id)
        return null; return { id, name: name || FIGMA_DEFAULT_FILENAME }
    }
    catch { return null }
  }

  static buildFigmaLink(fileID: string, fileName: string = '') { return `${FIGMA_URL}file/${fileID}/${fileName}` }
  static buildAuthenticationLink() { const state = (randomAlphabetical as any)(15); const redirectURI = `haiku://oauth/figma&scope=file_read&state=${state}&response_type=code`; const url = `${FIGMA_URL}oauth?client_id=${FIGMA_CLIENT_ID}&redirect_uri=${redirectURI}`; return { url, state } }
  static getAccessToken({ code, state, stateCheck }: { code: string, state: string, stateCheck: string }) { return new Promise((resolve, reject) => { if (state !== stateCheck) { reject({ status: 403, err: 'Invalid state code' }); return } (inkstone as any).integrations.getFigmaAccessToken(code, (error: any, response: any) => { error ? reject(error) : resolve(response) }) }) }
  static isFigmaFile(p: string) { return !!p && p.match(IS_FIGMA_FILE_RE) }
  static isFigmaFolder(p: string) { return !!p && p.match(IS_FIGMA_FOLDER_RE) }
  static findIDFromPath(relpath: string) { const basename = path.basename(relpath); const match = basename.match(/(\w+)-/); return match && match[1] }
  static findDisplayNameFromPath(relpath: string) { const basename = path.basename(relpath); const match = basename.match(/(\w+)-([\w-]+)\./); return match ? match[2] : FIGMA_DEFAULT_FILENAME }
  static buildFigmaLinkFromPath(relpath: string) { const id = (Figma as any).findIDFromPath(relpath); return (Figma as any).buildFigmaLink(id) }
  static getUniqueName(fileId: string, name: string) {
    if (!uniqueNameResolver[fileId])
      uniqueNameResolver[fileId] = {}; if (!uniqueNameResolver[fileId].hasOwnProperty(name)) { uniqueNameResolver[fileId][name] = 0; return name } return `${name} Copy ${++uniqueNameResolver[fileId][name]}`
  }
}

export default Figma
export { Figma }
