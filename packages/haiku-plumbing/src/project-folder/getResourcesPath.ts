import { join } from 'node:path'
import { isMac } from 'haiku-common'

/**
 * Returns the path to the resources directory. You can define resources in the
 * root `package.json` file under `extraResources`
 *
 * FIXME: according to the docs, Electron provides a process-level variable
 * (`process.resourcesPath`) with this value, but it's `null` in
 * `haiku-plumbing` for some reason I couldn't figure out.
 */
export function getResourcesPath() {
  if (process.env.NODE_ENV !== 'production') {
    return null
  }

  if (isMac()) {
    return join(process.execPath, '..', '..', '..', '..', '..', 'Resources')
  }

  return join(process.execPath, '..', 'resources')
}
