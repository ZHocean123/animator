import fse from 'haiku-fs-extra'
import filterWalkFolder from './filterWalkFolder'

export default function walkFiles(dir: string, done: (err: Error | null, items?: any[]) => void) {
  return filterWalkFolder(dir, fileOnlyFilter, done)
}

function fileOnlyFilter(abspath: string, _: null, _fileObj: any, relpath: string) {
  if (relpath.match(/(^\.|\/\.|node_modules|bower_components|jspm_modules)/)) {
    return false
  }
  return (fse as any).lstatSync(abspath).isFile()
}
