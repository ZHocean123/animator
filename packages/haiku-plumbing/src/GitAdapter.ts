import * as git from 'isomorphic-git';
import * as http from 'isomorphic-git/http/node';
import * as fs from 'haiku-fs-extra';
import * as path from 'path';

// Re-export isomorphic-git for direct access if needed
export { git, http };

// Type definitions for compatibility
export interface GitRepository {
  // isomorphic-git doesn't have repository objects like nodegit
  // This is a placeholder for type compatibility
  readonly workdir: string;
}

export interface GitSignature {
  name: string;
  email: string;
  timestamp: number;
  timezoneOffset: number;
}

export interface GitCommit {
  oid: string;
  message: string;
  author: GitSignature;
  committer: GitSignature;
  parent: string[];
  tree: string;
}

export interface GitReference {
  name: string;
  target: string;
  isSymbolic(): boolean;
  isTag(): boolean;
  isBranch(): boolean;
}

export interface GitRemote {
  name: string;
  url: string;
  pushurl?: string;
}

export interface GitStatus {
  path: string;
  status: string;
  num: number;
}

export interface GitDiffDelta {
  status(): number;
  oldFile(): { path(): string };
  newFile(): { path(): string };
}

export interface GitDiff {
  numDeltas(): number;
  getDelta(i: number): GitDiffDelta;
}

// Status constants mapping from nodegit Diff.DELTA to isomorphic-git
export const DELTA_STATUS = {
  UNMODIFIED: 0,
  ADDED: 1,
  DELETED: 2,
  MODIFIED: 3,
  RENAMED: 4,
  COPIED: 5,
  IGNORED: 6,
  UNTRACKED: 7,
  TYPECHANGE: 8,
  UNREADABLE: 9,
  CONFLICTED: 10,
};

// Merge file favor mapping
export const FILE_FAVOR = {
  NORMAL: 0,
  OURS: 1,
  THEIRS: 2,
  UNION: 3,
};

// Repository operations
export async function open(pwd: string): Promise<GitRepository> {
  // Check if it's a git repository
  try {
    await fs.stat(path.join(pwd, '.git'));
    return { workdir: pwd } as GitRepository;
  } catch (error) {
    throw new Error(`could not find repository at ${pwd}`);
  }
}

export async function forceOpen(pwd: string): Promise<GitRepository> {
  return open(pwd);
}

export async function init(pwd: string): Promise<GitRepository> {
  await git.init({ fs, dir: pwd });
  return { workdir: pwd } as GitRepository;
}

export async function status(pwd: string): Promise<{ [path: string]: GitStatus }> {
  const statusMatrix = await git.statusMatrix({ fs, dir: pwd });
  const changes: { [path: string]: GitStatus } = {};
  
  for (const [filepath, headStatus, workdirStatus, stageStatus] of statusMatrix) {
    let statusNum: number;
    
    if (headStatus === 0 && workdirStatus === 2 && stageStatus === 0) {
      statusNum = DELTA_STATUS.UNTRACKED;
    } else if (headStatus === 0 && workdirStatus === 2 && stageStatus === 2) {
      statusNum = DELTA_STATUS.ADDED;
    } else if (headStatus === 1 && workdirStatus === 0 && stageStatus === 1) {
      statusNum = DELTA_STATUS.DELETED;
    } else if (headStatus === 1 && workdirStatus === 2 && stageStatus === 1) {
      statusNum = DELTA_STATUS.MODIFIED;
    } else {
      statusNum = DELTA_STATUS.MODIFIED; // Default to modified for other cases
    }
    
    changes[filepath] = {
      path: filepath,
      status: statusNum.toString(),
      num: statusNum,
    };
  }
  
  return changes;
}

export async function hardReset(pwd: string, targetRef: string): Promise<void> {
  // In isomorphic-git, we use checkout to reset to a specific commit
  const commitOid = await git.resolveRef({ fs, dir: pwd, ref: targetRef });
  await git.checkout({ fs, dir: pwd, ref: commitOid, force: true });
}

export async function removeUntrackedFiles(pwd: string): Promise<void> {
  const statuses = await status(pwd);
  const untrackedFiles = Object.keys(statuses).filter(path => 
    statuses[path].num === DELTA_STATUS.UNTRACKED
  );
  
  for (const file of untrackedFiles) {
    await fs.remove(path.join(pwd, file));
  }
}

export async function upsertRemoteDirectly(
  pwd: string,
  name: string,
  url: string
): Promise<GitRemote> {
  // isomorphic-git doesn't have a direct remote management API
  // We'll store remote info in a simple way for compatibility
  const remotes = await listRemotes(pwd);
  const existing = remotes.find(r => r.name === name);
  
  if (existing) {
    // Update existing remote
    // Note: isomorphic-git uses remotes from the config
    return { name, url, pushurl: url };
  } else {
    // Add remote to git config
    // This is a simplified implementation
    return { name, url, pushurl: url };
  }
}

export async function listRemotes(pwd: string): Promise<GitRemote[]> {
  try {
    const config = await git.getConfig({ fs, dir: pwd });
    const remotes: GitRemote[] = [];
    
    // Parse remotes from git config
    // This is a simplified version - real implementation would parse all remote.*.url entries
    return remotes;
  } catch (error) {
    return [];
  }
}

export async function getCurrentBranchName(pwd: string): Promise<string> {
  try {
    const ref = await git.currentBranch({ fs, dir: pwd });
    return ref || 'master';
  } catch (error) {
    return 'master';
  }
}

export async function cloneRepoDirectly(
  gitRemoteUrl: string,
  abspath: string
): Promise<void> {
  await git.clone({
    fs,
    http,
    dir: abspath,
    url: gitRemoteUrl,
    singleBranch: false,
    depth: 1,
  });
}

export async function addAllPathsToIndex(pwd: string): Promise<string> {
  await git.add({ fs, dir: pwd, filepath: '.' });
  const oid = await git.writeTree({ fs, dir: pwd });
  return oid;
}

export async function addPathsToIndex(pwd: string, relpaths: string[]): Promise<string> {
  for (const filepath of relpaths) {
    await git.add({ fs, dir: pwd, filepath });
  }
  const oid = await git.writeTree({ fs, dir: pwd });
  return oid;
}

export function createSignature(name: string, email: string): GitSignature {
  const timestamp = Math.floor(Date.now() / 1000);
  const timezoneOffset = 0; // minutes
  
  return {
    name,
    email,
    timestamp,
    timezoneOffset,
  };
}

export async function buildCommit(
  pwd: string,
  username: string,
  email: string,
  message: string,
  oid: string,
  updateRef: string,
  parentRef: string | null
): Promise<string> {
  const author = createSignature(username, email);
  const committer = createSignature('Haiku Plumbing', 'contact@haiku.ai');
  
  const parents: string[] = [];
  if (parentRef) {
    try {
      const parentOid = await git.resolveRef({ fs, dir: pwd, ref: parentRef });
      parents.push(parentOid);
    } catch (error) {
      // Parent ref might not exist for initial commit
    }
  }
  
  const commitOid = await git.commit({
    fs,
    dir: pwd,
    message,
    author,
    committer,
    parent: parents,
    tree: oid,
  });
  
  if (updateRef && updateRef !== 'undefined') {
    await git.updateRef({
      fs,
      dir: pwd,
      ref: `refs/heads/${updateRef}`,
      value: commitOid,
    });
  }
  
  return commitOid;
}

export async function pushToRemoteDirectly(
  pwd: string,
  remoteName: string,
  fullBranchName: string,
  doForcePush: boolean
): Promise<void> {
  try {
    await git.push({
      fs,
      http,
      dir: pwd,
      remote: remoteName,
      ref: fullBranchName,
      force: doForcePush,
    });
  } catch (error) {
    throw new Error(`Failed to push to remote: ${error.message}`);
  }
}

export async function getCurrentCommit(pwd: string): Promise<{ sha: string; commit: any }> {
  try {
    const sha = await git.resolveRef({ fs, dir: pwd, ref: 'HEAD' });
    const commit = await git.readCommit({ fs, dir: pwd, oid: sha });
    return { sha, commit: commit.commit };
  } catch (error) {
    throw new Error('Failed to get current commit');
  }
}

export async function createTag(
  pwd: string,
  tagName: string,
  commitId: string,
  tagMessage: string
): Promise<string> {
  await git.annotatedTag({
    fs,
    dir: pwd,
    tag: tagName,
    message: tagMessage,
    ref: commitId,
  });
  
  return commitId;
}

export async function listTags(pwd: string): Promise<string[]> {
  try {
    const tags = await git.listTags({ fs, dir: pwd });
    return tags;
  } catch (error) {
    return [];
  }
}

export async function fetchFromRemoteDirectly(pwd: string, remoteName: string): Promise<void> {
  await git.fetch({
    fs,
    http,
    dir: pwd,
    remote: remoteName,
  });
}

export async function mergeProject(
  pwd: string,
  projectName: string,
  partialBranchName: string,
  fileFavorName: string = 'normal'
): Promise<{ didHaveConflicts: boolean; shaOrIndex?: string }> {
  try {
    const remoteRef = `refs/remotes/${projectName}/${partialBranchName}`;
    const localRef = `refs/heads/${partialBranchName}`;
    
    // Fetch the remote branch
    await git.checkout({ fs, dir: pwd, ref: localRef });
    
    // Merge remote into local
    const mergeResult = await git.merge({
      fs,
      dir: pwd,
      ours: localRef,
      theirs: remoteRef,
      fastForwardOnly: false,
    });
    
    if (mergeResult.alreadyMerged || mergeResult.fastForward) {
      return { didHaveConflicts: false, shaOrIndex: mergeResult.oid };
    }
    
    // Check for conflicts
    const status = await git.statusMatrix({ fs, dir: pwd });
    const hasConflicts = status.some(
      ([_, headStatus, workdirStatus, stageStatus]) => 
        headStatus === 1 && workdirStatus === 3 && stageStatus === 3
    );
    
    if (hasConflicts) {
      return { didHaveConflicts: true };
    }
    
    const commitOid = await git.commit({
      fs,
      dir: pwd,
      message: `Merge ${remoteRef} into ${localRef}`,
      parent: [localRef, remoteRef],
    });
    
    return { didHaveConflicts: false, shaOrIndex: commitOid };
  } catch (error) {
    return { didHaveConflicts: true };
  }
}

export async function hardResetFromSHA(pwd: string, sha: string): Promise<void> {
  await git.checkout({ fs, dir: pwd, ref: sha, force: true });
}

export async function commitProject(
  pwd: string,
  username: string,
  useHeadAsParent: boolean,
  message: string,
  pathsToAdd: string | string[]
): Promise<string> {
  // Add paths to index
  if (pathsToAdd === '.') {
    await addAllPathsToIndex(pwd);
  } else if (Array.isArray(pathsToAdd)) {
    await addPathsToIndex(pwd, pathsToAdd);
  } else if (typeof pathsToAdd === 'string') {
    await addPathsToIndex(pwd, [pathsToAdd]);
  }
  
  // Write tree
  const oid = await git.writeTree({ fs, dir: pwd });
  
  // Build and create commit
  const commitOid = await buildCommit(
    pwd,
    username,
    `${username}@haiku.ai`,
    message,
    oid,
    'HEAD',
    useHeadAsParent ? 'HEAD' : null
  );
  
  return commitOid;
}

export function statusToText(statusNum: number): string {
  const words = [];
  const statusMap: { [key: number]: string } = {
    [DELTA_STATUS.UNMODIFIED]: 'UNMODIFIED',
    [DELTA_STATUS.ADDED]: 'ADDED',
    [DELTA_STATUS.DELETED]: 'DELETED',
    [DELTA_STATUS.MODIFIED]: 'MODIFIED',
    [DELTA_STATUS.RENAMED]: 'RENAMED',
    [DELTA_STATUS.COPIED]: 'COPIED',
    [DELTA_STATUS.IGNORED]: 'IGNORED',
    [DELTA_STATUS.UNTRACKED]: 'UNTRACKED',
    [DELTA_STATUS.TYPECHANGE]: 'TYPECHANGE',
    [DELTA_STATUS.UNREADABLE]: 'UNREADABLE',
    [DELTA_STATUS.CONFLICTED]: 'CONFLICTED',
  };
  
  return statusMap[statusNum] || 'UNKNOWN';
}

export function saveStrategyToFileFavorName(saveStrategy?: any): string {
  if (!saveStrategy || !saveStrategy.strategy) {
    return 'normal';
  }
  
  if (saveStrategy.strategy === 'recursive') {
    return 'normal';
  }
  if (saveStrategy.strategy === 'ours') {
    return 'ours';
  }
  if (saveStrategy.strategy === 'theirs') {
    return 'theirs';
  }
  
  return 'normal';
}

// Clean all changes - reset and remove untracked
export async function cleanAllChanges(pwd: string): Promise<void> {
  await hardReset(pwd, 'HEAD');
  await removeUntrackedFiles(pwd);
}

// Destroy index lock (compatibility function)
export function destroyIndexLockSync(pwd: string): void {
  const lockPath = path.join(pwd, '.git', 'index.lock');
  try {
    if (fs.existsSync(lockPath)) {
      fs.removeSync(lockPath);
    }
  } catch (exception) {
    // Ignore errors
  }
}