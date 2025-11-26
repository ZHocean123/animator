import type { SimpleGit } from 'simple-git'
import * as path from 'node:path'
/* tslint:disable:no-shadowed-variable only-arrow-functions ter-prefer-arrow-callback max-line-length no-parameter-reassignment */
import * as fs from 'haiku-fs-extra'
import simpleGit from 'simple-git'

const DEFAULT_COMMITTER_EMAIL = 'contact@haiku.ai'
const DEFAULT_COMMITTER_NAME = 'Haiku Plumbing'

// Git wrapper using simple-git instead of nodegit
export class GitWrapper {
  private git: SimpleGit
  private repoPath: string

  constructor(repoPath: string) {
    this.repoPath = repoPath
    this.git = simpleGit(repoPath)
  }

  // Initialize repository
  static async init(repoPath: string): Promise<GitWrapper> {
    await fs.ensureDir(repoPath)
    const git = simpleGit(repoPath)
    await git.init()
    return new GitWrapper(repoPath)
  }

  // Open existing repository
  static async open(repoPath: string): Promise<GitWrapper> {
    if (!await fs.pathExists(path.join(repoPath, '.git'))) {
      throw new Error(`Not a git repository: ${repoPath}`)
    }
    return new GitWrapper(repoPath)
  }

  // Clone repository
  static async clone(url: string, targetPath: string): Promise<GitWrapper> {
    const git = simpleGit()
    await git.clone(url, targetPath)
    return new GitWrapper(targetPath)
  }

  // Get repository status
  async getStatus(): Promise<any> {
    return await this.git.status()
  }

  // Add files
  async add(files: string | string[]): Promise<void> {
    await this.git.add(files)
  }

  // Commit changes
  async commit(message: string, author?: { name: string, email: string }): Promise<void> {
    const options: any = {}
    if (author) {
      options['--author'] = `${author.name} <${author.email}>`
    }
    await this.git.commit(message, [], options)
  }

  // Push to remote
  async push(remote: string = 'origin', branch: string = 'master'): Promise<void> {
    await this.git.push(remote, branch)
  }

  // Pull from remote
  async pull(remote: string = 'origin', branch: string = 'master'): Promise<void> {
    await this.git.pull(remote, branch)
  }

  // Fetch from remote
  async fetch(remote?: string): Promise<void> {
    if (remote) {
      await this.git.fetch(remote)
    }
    else {
      await this.git.fetch()
    }
  }

  // Hard reset to commit
  async reset(commit: string): Promise<void> {
    await this.git.reset(['--hard', commit])
  }

  // Get current branch
  async getCurrentBranch(): Promise<string> {
    const status = await this.git.status()
    return status.current || 'master'
  }

  // Check if repository has uncommitted changes
  async hasChanges(): Promise<boolean> {
    const status = await this.git.status()
    return status.files.length > 0
  }

  // Get diff
  async getDiff(): Promise<string> {
    return await this.git.diff()
  }

  // Create tag
  async tag(name: string, message?: string): Promise<void> {
    if (message) {
      await this.git.addAnnotatedTag(name, message)
    }
    else {
      await this.git.addTag(name)
    }
  }

  // Get repository path
  getRepoPath(): string {
    return this.repoPath
  }
}

// Legacy compatibility exports
export const globalCallbacks = {}
export const globalPushOpts = {}
export const globalFetchOpts = {}
export const globalCloneOpts = {}

// Legacy static methods for compatibility
export async function Repository_open(pwd: string): Promise<GitWrapper> {
  return await GitWrapper.open(pwd)
}

export async function Repository_init(pwd: string): Promise<GitWrapper> {
  return await GitWrapper.init(pwd)
}

export async function Clone_clone(url: string, targetPath: string): Promise<GitWrapper> {
  return await GitWrapper.clone(url, targetPath)
}

// Default exports for backward compatibility
export {
  GitWrapper as Git,
  GitWrapper as Repository,
}

export default GitWrapper
