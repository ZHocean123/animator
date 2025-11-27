import * as path from 'node:path'
import fse from 'haiku-fs-extra'

interface WalkItem { path: string }

export default function filterWalkFolder(
  dir: string,
  filter: ((abspath: string, _: null, item: WalkItem, relpath: string) => boolean) | null,
  done: (err: Error | null, items?: WalkItem[]) => void,
): any {
  const items: WalkItem[] = []
  return (fse as any).walk(dir).on('data', (item: WalkItem) => {
    if (!filter) {
      items.push(item)
      return
    }
    if (filter(item.path, null, item, path.relative(dir, item.path))) {
      items.push(item)
    }
  }).on('end', () => done(null, items)).on('error', (err: Error) => done(err))
}
