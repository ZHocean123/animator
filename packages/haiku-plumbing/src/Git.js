/* tslint:disable:no-shadowed-variable only-arrow-functions ter-prefer-arrow-callback max-line-length no-parameter-reassignment */
import * as path from 'path';
import * as fs from 'haiku-fs-extra';
import * as async from 'async';
import { Environment } from 'haiku-common/src/environments';
import * as logger from 'haiku-serialization/src/utils/LoggerInstance';
import simpleGit from 'simple-git';

const DEFAULT_COMMITTER_EMAIL = 'contact@haiku.ai';
const DEFAULT_COMMITTER_NAME = 'Haiku Plumbing';
const DEFAULT_GIT_USERNAME = 'Haiku-Plumbing';
const DEFAULT_GIT_EMAIL = 'contact@haiku.ai';
const DEFAULT_GIT_COMMIT_MESSAGE = 'Edited project with Haiku Desktop';

function globalExceptionCatcher(exception) {
  logger.error(exception);
  throw exception;
}

export const globalCallbacks = {};
export const globalPushOpts = {
  callbacks: globalCallbacks,
};
export const globalFetchOpts = {
  downloadTags: 3,
  callbacks: globalCallbacks,
};
export const globalCloneOpts = {
  fetchOpts: globalFetchOpts,
};

if (global.process.env.NODE_ENV !== Environment.Production) {
  // Don't enforce strict SSL in dev mode.
  globalCallbacks.certificateCheck = () => 1;
}

// Simple-git instances cache
const GIT_INSTANCES = {};

function getGit(pwd) {
  if (GIT_INSTANCES[pwd]) {
    return GIT_INSTANCES[pwd];
  }
  const git = simpleGit(pwd);
  GIT_INSTANCES[pwd] = git;
  return git;
}

export function init(pwd, cb) {
  const git = getGit(pwd);
  git.init(false, (err) => { // false for not bare
    return cb(err, git);
  });
}

export function status(pwd, opts, cb) {
  const git = getGit(pwd);
  git.status((err, statusSummary) => {
    if (err) return cb(err);

    // Map simple-git status to the format expected by the caller
    // Caller expects a dict of changes: { path: { delta, prev, path, num } }
    // simple-git returns files array.

    const changes = {};
    statusSummary.files.forEach((file, index) => {
      let statusNum = 0; // UNMODIFIED
      // Map status codes roughly to nodegit enums if possible, or just use what we have.
      // Nodegit: ADDED, DELETED, MODIFIED, RENAMED, etc.
      // simple-git: index and working_dir status.

      // This is a simplification. The caller (MasterGitProject) mainly checks for existence of changes.
      // But statusToText uses specific nums.

      if (file.index === 'A' || file.working_dir === 'A') statusNum = 1; // ADDED (approx)
      else if (file.index === 'D' || file.working_dir === 'D') statusNum = 2; // DELETED
      else if (file.index === 'M' || file.working_dir === 'M') statusNum = 3; // MODIFIED
      else if (file.index === 'R' || file.working_dir === 'R') statusNum = 4; // RENAMED
      else if (file.index === '?' || file.working_dir === '?') statusNum = 7; // UNTRACKED
      else if (file.index === 'C' || file.working_dir === 'C') statusNum = 11; // CONFLICTED (approx)

      changes[file.path] = {
        delta: index,
        prev: file.path, // simple-git might not give old path easily in summary
        path: file.path,
        num: statusNum
      };
    });

    return cb(null, changes);
  });
}

export function hardReset(pwd, targetRef, cb) {
  const git = getGit(pwd);
  git.reset(['--hard', targetRef], (err) => {
    if (err) return cb(err);
    // Caller expects (err, repository, commit)
    // We return git instance and a dummy commit object if needed, or just nulls if caller doesn't strictly use them.
    // Checking MasterGitProject: cleanAllChanges uses it.
    return cb(null, git, {});
  });
}

export function removeUntrackedFiles(pwd, cb) {
  const git = getGit(pwd);
  git.clean('f', ['-d'], (err) => { // -fd
    return cb(err);
  });
}

export function upsertRemoteDirectly(pwd, name, url, cb) {
  const git = getGit(pwd);
  git.getRemotes(true, (err, remotes) => {
    if (err) return cb(err);
    const existing = remotes.find(r => r.name === name);
    if (existing) {
      if (existing.refs.fetch !== url || existing.refs.push !== url) {
        git.removeRemote(name, (err) => {
          if (err) return cb(err);
          git.addRemote(name, url, (err) => cb(err, { name: () => name, url: () => url }));
        });
      } else {
        cb(null, { name: () => name, url: () => url });
      }
    } else {
      git.addRemote(name, url, (err) => cb(err, { name: () => name, url: () => url }));
    }
  });
}

export function maybeInit(pwd, cb) {
  open(pwd, (err, git) => {
    if (err) {
      // If error, try init
      return init(pwd, (err, git) => {
        if (err) return cb(err);
        return cb(null, git, false); // false = newly initialized
      });
    }
    return cb(null, git, true); // true = already initialized
  });
}

// Index locking is less relevant with simple-git as it manages the lock, but we keep the interface
export function getIndexLockAgnostic(pwd, cb) {
  // No-op or return dummy
  return cb(null, {});
}

export function writeIndexLockAgnostic(index, pwd, cb) {
  return cb(null, 'dummy-oid');
}

export function destroyIndexLockSync(pwd) {
  const lockPath = path.join(pwd, '.git', 'index.lock');
  try {
    if (fs.existsSync(lockPath)) {
      fs.removeSync(lockPath);
    }
  } catch (exception) {
    logger.info('[git]', exception);
  }
}

export function addPathsToIndex(pwd, relpaths = [], cb) {
  const git = getGit(pwd);
  git.add(relpaths, (err) => {
    cb(err, 'dummy-oid');
  });
}

export function addAllPathsToIndex(pwd, cb) {
  const git = getGit(pwd);
  git.add('.', (err) => {
    cb(err, 'dummy-oid');
  });
}

export function referenceNameToId(pwd, name, cb) {
  const git = getGit(pwd);
  git.revparse([name], (err, val) => {
    if (err) return cb(err);
    return cb(null, val.trim());
  });
}

export function createSignature(name, email) {
  // Not used directly in simple-git calls usually, handled by config
  return { name, email };
}

export function buildCommit(pwd, username, email, message, oid, updateRef, parentRef, cb) {
  const git = getGit(pwd);
  // simple-git commit expects config to be set or passed.
  // We can set local config for this operation.

  const env = { ...process.env, GIT_AUTHOR_NAME: username, GIT_AUTHOR_EMAIL: email, GIT_COMMITTER_NAME: DEFAULT_COMMITTER_NAME, GIT_COMMITTER_EMAIL: DEFAULT_COMMITTER_EMAIL };

  git.env(env).commit(message, (err, summary) => {
    if (err) return cb(err);
    // summary.commit is the short hash or full hash? simple-git usually returns summary object.
    // We need the commit ID.
    // Let's get the latest commit ID.
    git.revparse(['HEAD'], (err, val) => {
      cb(err, val ? val.trim() : null);
    });
  });
}

export function getCurrentBranchName(pwd, cb) {
  const git = getGit(pwd);
  git.branchLocal((err, summary) => {
    if (err) return cb(err);
    const current = summary.current;
    const full = `refs/heads/${current}`;
    // Caller expects (err, partial, full, reference, repository)
    // We mock reference and repository
    const mockRef = {
      isBranch: () => true,
      name: () => full
    };
    cb(null, current, full, mockRef, git);
  });
}

export function cloneRepoDirectly(gitRemoteUrl, abspath, cb) {
  const git = simpleGit();
  git.clone(gitRemoteUrl, abspath, globalCloneOpts.fetchOpts, (err) => {
    cb(err, getGit(abspath), abspath);
  });
}

export function pushToRemoteDirectly(pwd, remoteName, fullBranchName, doForcePush, cb) {
  const git = getGit(pwd);
  const branch = fullBranchName.replace('refs/heads/', '');
  const options = doForcePush ? ['--force'] : [];
  git.push(remoteName, branch, options, (err) => {
    cb(err);
  });
}

export function lookupRemote(pwd, remoteName, cb) {
  const git = getGit(pwd);
  git.getRemotes(true, (err, remotes) => {
    if (err) return cb(err);
    const remote = remotes.find(r => r.name === remoteName);
    if (!remote) return cb(new Error('Remote not found'));

    // Mock the remote object expected by caller
    const mockRemote = {
      name: () => remote.name,
      url: () => remote.refs.fetch,
      pushurl: () => remote.refs.push,
      push: (refSpecs, opts) => {
        // refSpecs is array of strings like 'refs/heads/master'
        // simple-git push takes remote, branch.
        // This is a bit tricky if refSpecs are complex.
        // Assuming refSpecs[0] is the branch.
        return new Promise((resolve, reject) => {
          // This is a simplified implementation
          // We might need to parse refSpecs
          // For now, let's assume it's just pushing the current branch or tags
          // But wait, the caller uses this mock object.
          // We should probably implement a specific push function if possible.
          // But here we are returning a mock object that has a .push method returning a Promise.

          // Parse refspec
          const spec = refSpecs[0];
          const parts = spec.split(':');
          const src = parts[0].replace('+', ''); // remove force flag if present

          git.push(remoteName, src, (err) => {
            if (err) reject(err);
            else resolve();
          });
        });
      }
    };
    cb(null, mockRemote);
  });
}

export function listRemotes(pwd, cb) {
  const git = getGit(pwd);
  git.getRemotes((err, remotes) => {
    if (err) return cb(err);
    // Caller expects array of objects with .name() method or strings?
    // Git.js:199: if (typeof remote === 'string' ... else if (remote.name && remote.name() === name)
    // So we can return objects with name() method.
    const mapped = remotes.map(r => ({ name: () => r.name, url: () => r.refs.fetch }));
    cb(null, mapped);
  });
}

export function doesRemoteExist(pwd, remoteName, cb) {
  listRemotes(pwd, (err, remotes) => {
    if (err) return cb(err);
    const found = remotes.find(r => r.name() === remoteName);
    cb(null, !!found);
  });
}

export function getCurrentCommit(pwd, cb) {
  const git = getGit(pwd);
  git.revparse(['HEAD'], (err, val) => {
    if (err) return cb(err);
    const sha = val.trim();
    // Caller expects (err, sha, commitObj, repo)
    cb(null, sha, { sha: () => sha }, git);
  });
}

export function hardResetFromSHA(pwd, sha, cb) {
  const git = getGit(pwd);
  git.reset(['--hard', sha], (err) => {
    cb(err);
  });
}

export function fetchFromRemoteDirectly(pwd, remoteName, cb) {
  const git = getGit(pwd);
  git.fetch(remoteName, (err) => {
    cb(err);
  });
}

export function mergeBranches(pwd, branchNameOurs, branchNameTheirs, fileFavorName, doFindRenames, cb) {
  const git = getGit(pwd);
  // strategy: fileFavorName (ours, theirs, normal)
  const options = [];
  if (fileFavorName === 'ours') options.push('-Xours');
  if (fileFavorName === 'theirs') options.push('-Xtheirs');

  git.merge([branchNameTheirs, ...options], (err, summary) => {
    if (err) {
      // Check for conflicts
      if (err.message && err.message.includes('CONFLICT')) {
        // Return conflict info
        // Caller expects (err, didHaveConflicts, result, result)
        // If conflict, err should be null, didHaveConflicts true.
        // But simple-git returns error on conflict.
        return cb(null, true, {}, {});
      }
      return cb(err);
    }
    // Success
    // Need commit id?
    git.revparse(['HEAD'], (err, val) => {
      cb(null, false, val ? val.trim() : 'merged', {});
    });
  });
}

export function cleanAllChanges(pwd, cb) {
  hardReset(pwd, 'HEAD', (err) => {
    if (err) return cb(err);
    removeUntrackedFiles(pwd, cb);
  });
}

export function rebaseBranches(folder, upstreamName, branchName, ontoStr, cb) {
  const git = getGit(folder);
  // git rebase upstream branch
  git.rebase([upstreamName], (err) => {
    cb(err, 'dummy-oid');
  });
}

export function getCommitHistoryForFile(folder, filePath, maxEntries = 1000, cb) {
  const git = getGit(folder);
  git.log({ file: filePath, maxCount: maxEntries }, (err, log) => {
    if (err) return cb(err);
    cb(null, log.all);
  });
}

export function getMasterCommitHistory(folder, cb) {
  const git = getGit(folder);
  git.log((err, log) => {
    if (err) return cb(err);
    cb(null, log.all);
  });
}

export function mergeBranchesWithoutBase(folder, toName, fromName, signature, mergePreference, fileFavorName, cb) {
  // This seems to be used for merging without a common base, or just merging.
  // We can try standard merge.
  return mergeBranches(folder, toName, fromName, fileFavorName, false, cb);
}

export function createTag(pwd, tagNameProbablySemver, commitId, tagMessage, cb) {
  const git = getGit(pwd);
  git.tag(['-a', tagNameProbablySemver, '-m', tagMessage, commitId], (err) => {
    cb(err, 'dummy-oid');
  });
}

export function pushTagToRemoteDirectly(pwd, remoteName, tagName, cb) {
  const git = getGit(pwd);
  git.push(remoteName, tagName, (err) => {
    cb(err);
  });
}

export function listTags(pwd, cb) {
  const git = getGit(pwd);
  git.tags((err, tags) => {
    if (err) return cb(err);
    cb(null, tags.all);
  });
}

export function commitProject(folder, username, useHeadAsParent, saveOptions = {}, pathsToAdd, cb) {
  const git = getGit(folder);

  const addPaths = (done) => {
    if (pathsToAdd === '.') {
      git.add('.', done);
    } else if (typeof pathsToAdd === 'string') {
      git.add([pathsToAdd], done);
    } else if (Array.isArray(pathsToAdd) && pathsToAdd.length > 0) {
      git.add(pathsToAdd, done);
    } else {
      done();
    }
  };

  addPaths((err) => {
    if (err) return cb(err);

    const user = username || DEFAULT_GIT_USERNAME;
    const email = username || DEFAULT_GIT_EMAIL; // Logic copied from original
    const message = (saveOptions && saveOptions.commitMessage) || DEFAULT_GIT_COMMIT_MESSAGE;

    const env = { ...process.env, GIT_AUTHOR_NAME: user, GIT_AUTHOR_EMAIL: email, GIT_COMMITTER_NAME: DEFAULT_COMMITTER_NAME, GIT_COMMITTER_EMAIL: DEFAULT_COMMITTER_EMAIL };

    git.env(env).commit(message, (err, summary) => {
      if (err) return cb(err);
      git.revparse(['HEAD'], (err, val) => {
        cb(err, val ? val.trim() : null);
      });
    });
  });
}

export function fetchProjectDirectly(folder, projectName, repositoryUrl, cb) {
  upsertRemoteDirectly(folder, projectName, repositoryUrl, (err) => {
    if (err) return cb(err);
    fetchFromRemoteDirectly(folder, projectName, (err) => {
      cb(err);
    });
  });
}

export function pushProjectDirectly(folder, projectName, cb) {
  getCurrentBranchName(folder, (err, partial, full) => {
    if (err) return cb(err);
    pushToRemoteDirectly(folder, projectName, full, true, cb);
  });
}

export function combineHistories(folder, projectName, ourBranchName, theirBranchName, saveOptions = {}, cb) {
  // combine histories usually means merge --allow-unrelated-histories
  const git = getGit(folder);
  const fileFavorName = saveStrategyToFileFavorName(saveOptions && saveOptions.saveStrategy);
  const options = ['--allow-unrelated-histories'];
  if (fileFavorName === 'ours') options.push('-Xours');
  if (fileFavorName === 'theirs') options.push('-Xtheirs');

  git.merge([theirBranchName, ...options], (err) => {
    if (err) {
      if (err.message && err.message.includes('CONFLICT')) {
        return cb(null, true, {}, {});
      }
      return cb(err);
    }
    git.revparse(['HEAD'], (err, val) => {
      cb(null, false, val ? val.trim() : 'merged');
    });
  });
}

export function getReference(folder, name, cb) {
  const git = getGit(folder);
  git.revparse([name], (err, val) => {
    if (err) return cb(null, false);
    // Return mock ref
    cb(null, { name: () => name, target: () => val.trim() });
  });
}

export function getRemoteBranchRefName(projectName, partialBranchName) {
  return `remotes/${projectName}/${partialBranchName}`;
}

export function mergeProject(folder, projectName, partialBranchName, saveOptions = {}, cb) {
  const remoteBranchRefName = getRemoteBranchRefName(projectName, partialBranchName);
  const fileFavorName = saveStrategyToFileFavorName(saveOptions && saveOptions.saveStrategy);

  mergeBranches(folder, partialBranchName, remoteBranchRefName, fileFavorName, false, (err, didHaveConflicts, shaOrIndex) => {
    if (!err) return cb(null, didHaveConflicts, shaOrIndex);

    if (err.message && (err.message.match(/No merge base found/i) || err.message.match(/refusing to merge unrelated histories/i))) {
      return combineHistories(folder, projectName, partialBranchName, remoteBranchRefName, saveOptions, cb);
    }
    return cb(err);
  });
}

export function logStatuses(statuses) {
  for (const key in statuses) {
    const status = statuses[key];
    logger.info('[git] git status:' + status.path + ' ' + statusToText(status));
  }
}

export function statusToText(status) {
  // status.num is our mapped number
  const words = [];
  if (status.num === 1) words.push('ADDED');
  if (status.num === 2) words.push('DELETED');
  if (status.num === 3) words.push('MODIFIED');
  if (status.num === 4) words.push('RENAMED');
  if (status.num === 7) words.push('UNTRACKED');
  if (status.num === 11) words.push('CONFLICTED');
  return words.join(' ');
}

export function saveStrategyToFileFavorName(saveStrategy) {
  if (!saveStrategy) {
    return 'normal';
  }
  if (!saveStrategy.strategy) {
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

export function open(pwd, cb) {
  const git = getGit(pwd);
  // Mock the createBranch method for MasterGitProject compatibility
  // simple-git has branchLocal, checkout, etc.
  // MasterGitProject calls repository.createBranch(name, commit, force, signature, logMessage)
  // We return the git instance with a mocked createBranch method.
  // But simple-git instance is a chainable object. We can attach a method to it?
  // Or return a proxy/wrapper?
  // Attaching to the instance might persist across calls if cached.
  // But getGit returns cached instance.
  // Let's attach it if not present.

  if (!git.createBranch) {
    git.createBranch = (name, commit, force, signature, logMessage) => {
      // nodegit createBranch returns a Promise that resolves to a Reference.
      // simple-git branch([name]) creates a branch.
      // But we need to handle 'commit' (target point), force, etc.
      // simple-git: .branch(['-f', name, commit]) if force.
      const args = [];
      if (force) args.push('-f');
      args.push(name);
      if (commit) args.push(commit); // commit sha or object? nodegit expects commit object or oid.

      return new Promise((resolve, reject) => {
        git.branch(args, (err, summary) => {
          if (err) return reject(err);
          // Return a mock Reference object
          resolve({
            name: () => 'refs/heads/' + name,
            target: () => (typeof commit === 'string' ? commit : 'dummy-oid'),
            isBranch: () => true
          });
        });
      });
    };
  }

  return cb(null, git);
}
