import type { HaikuProject } from 'haiku-sdk-creator'
import { join } from 'node:path'
import { copySync, existsSync, rmdirSync } from 'fs-extra'

export function duplicateProject(destinationProject: HaikuProject, sourceProject: HaikuProject, cb: any) {
  try {
    // Make a dumb copy of the original project folder, minus all things Git.
    copySync(sourceProject.projectPath, destinationProject.projectPath)
    const gitPath = join(destinationProject.projectPath, '.git')
    if (existsSync(gitPath)) {
      rmdirSync(gitPath)
    }
    cb()
  }
  catch (err) {
    cb(err)
  }
}
