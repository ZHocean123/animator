import path from 'node:path'
import { Experiment, experimentIsEnabled, isMac, isWindows } from 'haiku-common'
import BaseModel from './BaseModel'
import { Figma, PHONY_FIGMA_FILE } from './Figma'
import toTitleCase from './helpers/toTitleCase'
import Illustrator from './Illustrator'
import Sketch from './Sketch'

const PAGES_REGEX = isWindows() ? new RegExp('\\\\pages\\\\') : /\/pages\//
const SLICES_REGEX = isWindows() ? new RegExp('\\\\slices\\\\') : /\/slices\//
const ARTBOARDS_REGEX = isWindows() ? new RegExp('\\\\artboards\\\\') : /\/artboards\//
const GROUPS_REGEX = isWindows() ? new RegExp('\\\\groups\\\\') : /\/groups\//
const FRAMES_REGEX = isWindows() ? new RegExp('\\\\frames\\\\') : /\/frames\//

const MAIN_COMPONENT_NAME = 'main'

class Asset extends (BaseModel as any) {
  getAbspath() { return path.join(this.project.getFolder(), this.getRelpath()) }
  getRelpath() { return this.relpath }
  getSceneName() {
    if (!this.isComponent())
      return; const parts = path.normalize(this.relpath).split(path.sep); return parts[1]
  }

  getAssetInfo() {
    const parts = this.relpath.split(path.sep)
    if (parts.length !== 4) { return { generator: null, relpath: null } }
    const longSource = path.join(parts[0], parts[1], parts[2])
    const shortSource = path.join(parts[0], parts[1])
    const matchRegexp = isWindows() ? new RegExp('\\\.(\\w+)\\.contents\\\\') : new RegExp('\\\.(\\w+)\\.contents\/')
    const match = longSource.match(matchRegexp)
    if (match) { return { generator: match[1], generatorRelpath: shortSource.replace(/\.contents$/, '') } }
    return { generator: null, relpath: null }
  }

  isDraggable() { return ((this.isComponent() && this.isComponentOtherThanMain()) || this.isVector() || this.isImage()) }
  isComponent() { return this.kind === (Asset as any).KINDS.COMPONENT }
  isVector() { return this.kind === (Asset as any).KINDS.VECTOR }
  isImage() { return this.kind === (Asset as any).KINDS.IMAGE }
  isSketchFile() { return this.kind === (Asset as any).KINDS.SKETCH }
  isFigmaFile() { return this.kind === (Asset as any).KINDS.FIGMA }
  isIllustratorFile() { return this.kind === (Asset as any).KINDS.ILLUSTRATOR }
  isRemoteAsset() { return this.proximity === (Asset as any).PROXIMITIES.REMOTE }
  isLocalAsset() { return this.proximity === (Asset as any).PROXIMITIES.LOCAL }
  isLocalComponent() { return this.isComponent() && this.isLocalAsset() }
  getLocalizedRelpath() {
    if (this.getRelpath()[0] === '@')
      return this.getRelpath(); return (Template as any).normalizePath(`./${this.getRelpath()}`)
  }

  isOrphanSvg() { return this.isVector() && this.parent.isDesignsHostFolder() }
  isComponentOtherThanMain() { return (this.isComponent() && this.relpath !== 'code/main/code.js') }
  isDesignsHostFolder() { return this.relpath === 'designs' }
  isComponentsHostFolder() { return this.relpath === 'code' }
  addSketchChild(svgAsset: any) {
    if (svgAsset.isSlice()) { this.slicesFolderAsset.insertChild(svgAsset); this.unshiftFolderAsset(this.slicesFolderAsset) }
    else if (svgAsset.isArtboard()) { this.artboardsFolderAsset.insertChild(svgAsset); this.unshiftFolderAsset(this.artboardsFolderAsset) }
    else { this.insertChild(svgAsset) }
  }

  addFigmaChild(svgAsset: any) {
    if (svgAsset.isSlice()) { this.slicesFolderAsset.insertChild(svgAsset); this.unshiftFolderAsset(this.slicesFolderAsset) }
    else if (svgAsset.isGroup()) { this.groupsFolderAsset.insertChild(svgAsset); this.unshiftFolderAsset(this.groupsFolderAsset) }
    else if (svgAsset.isFrame()) { this.framesFolderAsset.insertChild(svgAsset); this.unshiftFolderAsset(this.framesFolderAsset) }
  }

  addIllustratorChild(svgAsset: any) { this.artboardsFolderAsset.insertChild(svgAsset); this.unshiftFolderAsset(this.artboardsFolderAsset) }
  addSketchAsset(relpath: string, dict: Record<string, any>) { const project = this.project; const result = (Asset as any).findById(path.join(project.getFolder(), relpath)); if (result) { this.insertChild(result); return result } const artboardsFolderAsset = (Asset as any).upsert({ uid: path.join(project.getFolder(), 'designs', relpath, 'artboards'), type: (Asset as any).TYPES.CONTAINER, kind: (Asset as any).KINDS.FOLDER, proximity: (Asset as any).PROXIMITIES.LOCAL, project, relpath: path.join('designs', relpath, 'artboards'), displayName: 'Artboards', children: [], dtModified: Date.now() }); const slicesFolderAsset = (Asset as any).upsert({ uid: path.join(project.getFolder(), 'designs', relpath, 'slices'), type: (Asset as any).TYPES.CONTAINER, kind: (Asset as any).KINDS.FOLDER, proximity: (Asset as any).PROXIMITIES.LOCAL, project, relpath: path.join('designs', relpath, 'slices'), displayName: 'Slices', children: [], dtModified: Date.now() }); const sketchAsset = (Asset as any).upsert({ uid: path.join(project.getFolder(), relpath), type: (Asset as any).TYPES.CONTAINER, kind: (Asset as any).KINDS.SKETCH, proximity: (Asset as any).PROXIMITIES.LOCAL, project, relpath, displayName: path.basename(relpath), children: [], slicesFolderAsset, artboardsFolderAsset, dtModified: ((dict as any)[relpath] && (dict as any)[relpath].dtModified) || Date.now() }); slicesFolderAsset.parent = artboardsFolderAsset.parent = sketchAsset; this.insertChild(sketchAsset); return sketchAsset }
  addFigmaAsset(relpath: string) { const project = this.project; const result = (Asset as any).findById(path.join(project.getFolder(), relpath)); if (result) { this.insertChild(result); return result } const framesFolderAsset = (Asset as any).upsert({ uid: path.join(project.getFolder(), 'designs', relpath, 'frames'), type: (Asset as any).TYPES.CONTAINER, kind: (Asset as any).KINDS.FOLDER, proximity: (Asset as any).PROXIMITIES.LOCAL, project, relpath: path.join('designs', relpath, 'frames'), displayName: 'Frames', children: [], dtModified: Date.now() }); const groupsFolderAsset = (Asset as any).upsert({ uid: path.join(project.getFolder(), 'designs', relpath, 'groups'), type: (Asset as any).TYPES.CONTAINER, kind: (Asset as any).KINDS.FOLDER, proximity: (Asset as any).PROXIMITIES.LOCAL, project, relpath: path.join('designs', relpath, 'groups'), displayName: 'Groups', children: [], dtModified: Date.now() }); const slicesFolderAsset = (Asset as any).upsert({ uid: path.join(project.getFolder(), 'designs', relpath, 'slices'), type: (Asset as any).TYPES.CONTAINER, kind: (Asset as any).KINDS.FOLDER, proximity: (Asset as any).PROXIMITIES.LOCAL, project, relpath: path.join('designs', relpath, 'slices'), displayName: 'Slices', children: [], dtModified: Date.now() }); const figmaAsset = (Asset as any).upsert({ uid: path.join(project.getFolder(), relpath), type: (Asset as any).TYPES.CONTAINER, kind: (Asset as any).KINDS.FIGMA, proximity: (Asset as any).PROXIMITIES.LOCAL, figmaID: Figma.findIDFromPath(relpath), project, relpath, displayName: Figma.findDisplayNameFromPath(relpath), children: [], slicesFolderAsset, groupsFolderAsset, framesFolderAsset, dtModified: Date.now() }); slicesFolderAsset.parent = groupsFolderAsset.parent = figmaAsset; this.insertChild(figmaAsset); return figmaAsset }
  addIllustratorAsset(relpath: string, dict: Record<string, any>) { const project = this.project; const result = (Asset as any).findById(path.join(project.getFolder(), relpath)); if (result) { this.insertChild(result); return result } const artboardsFolderAsset = (Asset as any).upsert({ uid: path.join(project.getFolder(), 'designs', relpath, 'artboards'), type: (Asset as any).TYPES.CONTAINER, kind: (Asset as any).KINDS.FOLDER, proximity: (Asset as any).PROXIMITIES.LOCAL, project, relpath: path.join('designs', relpath, 'artboards'), displayName: 'Artboards', children: [], dtModified: Date.now() }); const illustratorAsset = (Asset as any).upsert({ uid: path.join(project.getFolder(), relpath), type: (Asset as any).TYPES.CONTAINER, kind: (Asset as any).KINDS.ILLUSTRATOR, project, proximity: (Asset as any).PROXIMITIES.LOCAL, relpath, displayName: path.basename(relpath), children: [], artboardsFolderAsset, dtModified: ((dict as any)[relpath] && (dict as any)[relpath].dtModified) || Date.now() }); artboardsFolderAsset.parent = illustratorAsset; this.insertChild(illustratorAsset); return illustratorAsset }
  getChildAssets() { return this.children }
  isPrimaryAsset() { const { primaryAssetPath } = this.project.getNameVariations(); return path.normalize(this.relpath) === primaryAssetPath }
  isDefaultIllustratorAssetPath() { const { defaultIllustratorAssetPath } = this.project.getNameVariations(); return path.normalize(this.relpath) === defaultIllustratorAssetPath }
  isSlice() { return !!this.relpath.match(SLICES_REGEX) }
  isArtboard() { return !!this.relpath.match(ARTBOARDS_REGEX) }
  isGroup() { return !!this.relpath.match(GROUPS_REGEX) }
  isFrame() { return !!this.relpath.match(FRAMES_REGEX) }
  isPhony() { return this.relpath.includes(PHONY_FIGMA_FILE) }
  isPhonyOrOnlyHasPhonyChildrens() { const children = this.getChildAssets(); return this.isPhony() || (children.length === 1 && children[0].isPhony()) }
  unshiftFolderAsset(folderAsset: any) { const foundAmongChildren = this.children.includes(folderAsset); if (folderAsset && !foundAmongChildren) { this.children.unshift(folderAsset) } }
  dump() { let str = `${this.relpath}`; this.children.forEach((child: any) => { const sublevel = child.dump(); str += `\n  ${sublevel.split('\n').join('\n  ')}` }); return str }
}

;(Asset as any).DEFAULT_OPTIONS = { required: { uid: true, type: true, kind: true, project: true, relpath: true, displayName: true, children: true, dtModified: true } }
;(BaseModel as any).extend(Asset)
;(Asset as any).TYPES = { CONTAINER: 'container', FILE: 'file', HACKY_MESSAGE: 'hacky_message' }
;(Asset as any).KINDS = { FOLDER: 'folder', SKETCH: 'sketch', FIGMA: 'figma', ILLUSTRATOR: 'ai', IMAGE: 'image', FONT: 'font', VECTOR: 'vector', COMPONENT: 'component', OTHER: 'other', HACKY_MESSAGE: 'hacky_message' }
;(Asset as any).PROXIMITIES = { LOCAL: 'local', REMOTE: 'remote' }
;(Asset as any).ingestAssets = (project: any, dict: Record<string, any>) => {
  (Asset as any).purge(); const componentFolderAsset = (Asset as any).upsert({ uid: path.join(project.getFolder(), 'code'), type: (Asset as any).TYPES.CONTAINER, kind: (Asset as any).KINDS.FOLDER, proximity: (Asset as any).PROXIMITIES.LOCAL, project, relpath: 'code', displayName: 'Components', children: [], dtModified: Date.now() }); const designFolderAsset = (Asset as any).upsert({ uid: path.join(project.getFolder(), 'designs'), type: (Asset as any).TYPES.CONTAINER, kind: (Asset as any).KINDS.FOLDER, proximity: (Asset as any).PROXIMITIES.LOCAL, project, relpath: 'designs', displayName: 'Designs', children: [], dtModified: Date.now() }); const rootAssets = [designFolderAsset]; rootAssets.unshift(componentFolderAsset); for (const relpath in dict) {
    const extname = path.extname(relpath).toLowerCase(); if (isMac() && extname === '.sketch') { (designFolderAsset as any).addSketchAsset(relpath, dict) }
    else if (extname === '.ai') { (designFolderAsset as any).addIllustratorAsset(relpath, dict) }
    else if (extname === '.svg') { if (relpath.match(PAGES_REGEX)) { continue } const svgAsset = (Asset as any).upsert({ uid: path.join(project.getFolder(), relpath), type: (Asset as any).TYPES.FILE, kind: (Asset as any).KINDS.VECTOR, proximity: (Asset as any).PROXIMITIES.LOCAL, project, relpath, displayName: path.basename(relpath, extname), children: [], dtModified: (dict as any)[relpath].dtModified }); const { generator, generatorRelpath } = (svgAsset as any).getAssetInfo(); switch (generator) { case 'sketch': const sketchAsset = (designFolderAsset as any).addSketchAsset(generatorRelpath, dict); (sketchAsset as any).addSketchChild(svgAsset); break; case 'figma': const figmaAsset = (designFolderAsset as any).addFigmaAsset(generatorRelpath); if (figmaAsset) { (figmaAsset as any).addFigmaChild(svgAsset) } break; case 'ai': const illustratorAsset = (designFolderAsset as any).addIllustratorAsset(generatorRelpath, dict); (illustratorAsset as any).addIllustratorChild(svgAsset); break; default: (designFolderAsset as any).insertChild(svgAsset) } }
    else if (path.basename(relpath) === 'code.js') { const pathParts = relpath.split(path.sep); const namePart = pathParts[1]; if (namePart !== MAIN_COMPONENT_NAME) { (componentFolderAsset as any).insertChild((Asset as any).upsert({ uid: path.join(project.getFolder(), relpath), type: (Asset as any).TYPES.FILE, kind: (Asset as any).KINDS.COMPONENT, proximity: (Asset as any).PROXIMITIES.LOCAL, project, relpath, displayName: (toTitleCase as any)(namePart), children: [], dtModified: (dict as any)[relpath].dtModified })) } (componentFolderAsset as any).children = sortedChildrenOfComponentFolderAsset(componentFolderAsset) }
    else if ((IMAGE_ASSET_EXTNAMES as any)[extname] && experimentIsEnabled(Experiment.AllowBitmapImages)) { const imageAsset = (Asset as any).upsert({ uid: path.join(project.getFolder(), relpath), type: (Asset as any).TYPES.FILE, kind: (Asset as any).KINDS.IMAGE, proximity: (Asset as any).PROXIMITIES.LOCAL, project, relpath, displayName: path.basename(relpath, extname), children: [], dtModified: (dict as any)[relpath].dtModified }); (designFolderAsset as any).insertChild(imageAsset) }
  } return rootAssets
}
function sortedChildrenOfComponentFolderAsset(asset: any) {
  let main: any; const controls: any[] = []; const components: any[] = []; asset.children.forEach((child: any) => {
    if (child.isControl) { controls.push(child) }
    else {
      if (child.displayName === 'Main') { main = child }
      else { components.push(child) }
    }
  }); const out: any[] = []; if (main)
    out.push(main); return out.concat(sortAssetsAlpha(components)).concat(sortAssetsAlpha(controls))
}
function sortAssetsAlpha(assets: any[]) {
  return assets.sort((a, b) => {
    if (a.displayName < b.displayName)
      return -1; if (a.displayName > b.displayName)
      return 1; return 0
  })
}
;(Asset as any).isInternalDrop = (dropEvent: any) => dropEvent && dropEvent.dataTransfer && !dropEvent.dataTransfer.types.includes('Files')
;(Asset as any).isSketchFile = (fileFromDropEvent: any) => { const extname = path.extname(fileFromDropEvent.getAsFile().name).toLowerCase(); return extname === '.sketch' }
;(Asset as any).isValidFile = (fileFromDropEvent: any) => {
  const file = fileFromDropEvent.getAsFile(); if (!file)
    return false; const abspath = file.name; return (fileFromDropEvent.type === 'image/svg+xml' || (Asset as any).isSketchFile(fileFromDropEvent) || (Asset as any).isDesignAsset(abspath))
}
;(Asset as any).preventDefaultDrag = (dropEvent: any) => {
  if ((Asset as any).isInternalDrop(dropEvent))
    return null; return dropEvent.preventDefault()
}
const IMAGE_ASSET_EXTNAMES: Record<string, boolean> = { '.png': true, '.jpg': true, '.jpeg': true, '.gif': true }
;(Asset as any).isImage = (filepath: string) => { const extname = path.extname(filepath).toLowerCase(); return (IMAGE_ASSET_EXTNAMES as any)[extname] }
;(Asset as any).isDesignAsset = (abspath: string) => { const extname = path.extname(abspath).toLowerCase(); return (Sketch as any).isSketchFile(abspath) || (Illustrator as any).isIllustratorFile(abspath) || extname === '.svg' || (Asset as any).isImage(abspath) }

export default Asset
export { Asset }
