/* tslint:disable:no-shadowed-variable only-arrow-functions ter-prefer-arrow-callback max-line-length no-parameter-reassignment */
import * as path from 'path';
import * as fs from 'haiku-fs-extra';
import * as async from 'async';
import {Environment} from 'haiku-common';
import * as logger from 'haiku-serialization/src/utils/LoggerInstance';
import * as GitAdapter from './GitAdapter';

const DEFAULT_COMMITTER_EMAIL = 'contact@haiku.ai';
const DEFAULT_COMMITTER_NAME = 'Haiku Plumbing';
const FORCE_PUSH_REFSPEC_PREFIX = '+';
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

if(global.process.env.NODE_ENV !== Environment.Production) {
  // Don't enforce strict SSL in dev mode.
  globalCallbacks.certificateCheck = () => 1;
}

// Multiton for caching already-opened repos
const LOCKED_INDEXES = {};
const INDEX_LOCK_INTERVAL = 0;

function _gimmeIndex(pwd, cb) {
  if(!LOCKED_INDEXES[pwd]) {
    LOCKED_INDEXES[pwd] = true;
    // eslint-disable-next-line
    return cb(() => {
      LOCKED_INDEXES[pwd] = false;
    });
  }
  return setTimeout(() => {
    return _gimmeIndex(pwd, cb);
  }, INDEX_LOCK_INTERVAL);
}

export function open(pwd, cb) {
  return forceOpen(pwd, (err, repository) => {
    if(err) {
      return cb(err);
    }
    return cb(null, repository || undefined);
  });
}

export function forceOpen(pwd, cb) {
  GitAdapter.open(pwd)
    .then((repository) => {
      return cb(null, repository);
    })
    .catch((error) => cb(error));
}

export function init(pwd, cb) {
  GitAdapter.init(pwd)
    .then((repository) => {
      return cb(null, repository);
    })
    .catch((error) => cb(error));
}

export function status(pwd, opts, cb) {
  return _gimmeIndex(pwd, (freeIndex) => {
    function done(err, out) {
      freeIndex();
      return cb(err, out);
    }

    return open(pwd, (err, repository) => {
      if(err) {
        return done(err);
      }
      GitAdapter.status(pwd)
        .then((changes) => {
          return done(null, changes);
        })
        .catch((error) => done(error));
    });
  });
}

export function hardReset(pwd, targetRef, cb) {
  GitAdapter.hardReset(pwd, targetRef)
    .then(() => {
      return cb(null);
    })
    .catch((error) => cb(error));
}

export function removeUntrackedFiles(pwd, cb) {
  GitAdapter.removeUntrackedFiles(pwd)
    .then(() => {
      return cb();
    })
    .catch((error) => cb(error));
}

export function upsertRemoteDirectly(pwd, name, url, cb) {
  GitAdapter.upsertRemoteDirectly(pwd, name, url)
    .then((remote) => {
      return cb(null, remote);
    })
    .catch((error) => cb(error));
}

function findExistingRemote(remotes, name) {
  if(remotes.length < 1) {
    return null;
  }
  let found = null;
  remotes.forEach((remote) => {
    if(typeof remote === 'string' && remote === name) {
      found = remote;
    } else if(remote.name && remote.name === name) {
      found = remote;
    }
  });
  return found;
}

export function maybeInit(pwd, cb) {
  GitAdapter.open(pwd)
    .then((repository) => {
      return cb(null, repository, true);
    })
    .catch((error) => {
      if(error.message && /could not find repository/i.test(error.message)) {
        return init(pwd, cb);
      }
      return cb(error);
    });
}

export function getIndexLockAgnostic(pwd, cb) {
  // This function is no longer needed with isomorphic-git, but kept for compatibility
  return cb(null, { workdir: pwd });
}

export function writeIndexLockAgnostic(index, pwd, cb) {
  // This function is no longer needed with isomorphic-git, but kept for compatibility
  GitAdapter.addAllPathsToIndex(pwd)
    .then((oid) => {
      return cb(null, oid);
    })
    .catch((error) => cb(error));
}

// HACK: This assumes we are only running one thread against this repo
export function destroyIndexLockSync(pwd) {
  const lockPath = path.join(pwd, '.git', 'index.lock');
  delete LOCKED_INDEXES[pwd]; // Remove the in-memory mutex too in case one is hanging around
  try {
    if(fs.existsSync(lockPath)) {
      fs.removeSync(lockPath);
    }
  } catch(exception) {
    logger.info('[git]', exception);
  }
}

export function addPathsToIndex(pwd, relpaths = [], cb) {
  if(relpaths.length < 1) {
    return cb(new Error('Empty paths list given'));
  }
  GitAdapter.addPathsToIndex(pwd, relpaths)
    .then((oid) => {
      return cb(null, oid);
    })
    .catch((error) => cb(error));
}

export function addAllPathsToIndex(pwd, cb) {
  GitAdapter.addAllPathsToIndex(pwd)
    .then((oid) => {
      return cb(null, oid);
    })
    .catch((error) => cb(error));
}

export function referenceNameToId(pwd, name, cb) {
  GitAdapter.open(pwd)
    .then(() => {
      // isomorphic-git doesn't use reference objects the same way
      return cb(null, name);
    })
    .catch((error) => cb(error));
}

export function createSignature(name, email) {
  return GitAdapter.createSignature(name, email);
}

export function buildCommit(pwd, username, email, message, oid, updateRef, parentRef, cb) {
  GitAdapter.buildCommit(
    pwd,
    username || DEFAULT_COMMITTER_NAME,
    email || DEFAULT_COMMITTER_EMAIL,
    message,
    oid,
    updateRef,
    parentRef,
  )
    .then((commitId) => {
      return cb(null, commitId);
    })
    .catch((error) => cb(error));
}

function getRepositoryHeadReference(pwd, cb) {
  GitAdapter.getCurrentBranchName(pwd)
    .then((branchName) => {
      return cb(null, { name: branchName }, 'direct', { workdir: pwd });
    })
    .catch((error) => cb(error));
}

export function getCurrentBranchName(pwd, cb) {
  GitAdapter.getCurrentBranchName(pwd)
    .then((branchName) => {
      const full = `refs/heads/${branchName}`;
      return cb(null, branchName, full, { name: full }, { workdir: pwd });
    })
    .catch((error) => cb(error));
}

export function cloneRepoDirectly(gitRemoteUrl, abspath, cb) {
  GitAdapter.cloneRepoDirectly(gitRemoteUrl, abspath)
    .then(() => {
      return cb(null, { workdir: abspath }, abspath);
    })
    .catch((error) => cb(error));
}

export function pushToRemoteDirectly(pwd, remoteName, fullBranchName, doForcePush, cb) {
  GitAdapter.pushToRemoteDirectly(pwd, remoteName, fullBranchName, doForcePush)
    .then(() => {
      return cb();
    })
    .catch((error) => cb(error));
}

export function lookupRemote(pwd, remoteName, cb) {
  GitAdapter.listRemotes(pwd)
    .then((remotes) => {
      const remote = remotes.find(r => r.name === remoteName);
      return cb(null, remote || null);
    })
    .catch((error) => cb(error));
}

export function listRemotes(pwd, cb) {
  GitAdapter.listRemotes(pwd)
    .then((remotes) => {
      return cb(null, remotes);
    })
    .catch((error) => cb(error));
}

export function doesRemoteExist(pwd, remoteName, cb) {
  GitAdapter.listRemotes(pwd)
    .then((remotes) => {
      const found = findExistingRemote(remotes, remoteName);
      return cb(null, !!found);
    })
    .catch((error) => cb(error));
}

export function getCurrentCommit(pwd, cb) {
  GitAdapter.getCurrentCommit(pwd)
    .then(({ sha, commit }) => {
      return cb(null, sha, commit, { workdir: pwd });
    })
    .catch((error) => cb(error));
}

export function hardResetFromSHA(pwd, sha, cb) {
  GitAdapter.hardResetFromSHA(pwd, sha)
    .then(() => {
      return cb();
    })
    .catch((error) => cb(error));
}

export function fetchFromRemoteDirectly(pwd, remoteName, cb) {
  GitAdapter.fetchFromRemoteDirectly(pwd, remoteName)
    .then(() => {
      return cb();
    })
    .catch((error) => cb(error));
}

export function mergeBranches(pwd, branchNameOurs, branchNameTheirs, fileFavorName, doFindRenames, cb) {
  // Note: isomorphic-git merge API implementation
  // Using simplified branch merge approach
  logger.info('[git] merging branches from', branchNameTheirs, 'to', branchNameOurs);

  GitAdapter.mergeProject(pwd, 'origin', branchNameOurs, fileFavorName)
    .then(({ didHaveConflicts, shaOrIndex }) => {
      if(didHaveConflicts) {
        return cb(null, true, shaOrIndex);
      }
      return cb(null, false, shaOrIndex);
    })
    .catch((error) => cb(error));
}

export function cleanAllChanges(pwd, cb) {
  GitAdapter.cleanAllChanges(pwd)
    .then(() => {
      return cb();
    })
    .catch((error) => cb(error));
}

export function rebaseBranches(folder, upstreamName, branchName, ontoStr, cb) {
  // isomorphic-git doesn't have rebaseBranches, return error
  logger.warn('[git] rebaseBranches not implemented in isomorphic-git');
  return cb(new Error('rebaseBranches not supported'));
}

export function getCommitHistoryForFile(folder, filePath, maxEntries = 1000, cb) {
  // isomorphic-git doesn't have fileHistoryWalk, return empty
  logger.warn('[git] getCommitHistoryForFile not implemented in isomorphic-git');
  return cb(null, []);
}

export function getMasterCommitHistory(folder, cb) {
  // isomorphic-git doesn't have getMasterCommit, return empty
  logger.warn('[git] getMasterCommitHistory not implemented in isomorphic-git');
  return cb(null, []);
}

export function mergeBranchesWithoutBase(folder, toName, fromName, signature, mergePreference, fileFavorName, cb) {
  logger.info('[git] merging branches (without base) from', fromName, 'to', toName);

  GitAdapter.mergeProject(folder, 'origin', toName, fileFavorName)
    .then(({ didHaveConflicts, shaOrIndex }) => {
      return cb(null, didHaveConflicts, shaOrIndex);
    })
    .catch((error) => cb(error));
}

export function createTag(pwd, tagNameProbablySemver, commitId, tagMessage, cb) {
  GitAdapter.createTag(pwd, tagNameProbablySemver, commitId, tagMessage)
    .then((tagOid) => {
      return cb(null, tagOid);
    })
    .catch((error) => cb(error));
}

export function pushTagToRemoteDirectly(pwd, remoteName, tagName, cb) {
  // isomorphic-git push doesn't handle tags the same way
  // For now, just call regular push
  logger.info('[git] pushing tags - calling regular push');
  pushToRemoteDirectly(pwd, remoteName, tagName, true, cb);
}

export function listTags(pwd, cb) {
  GitAdapter.listTags(pwd)
    .then((tags) => {
      return cb(null, tags);
    })
    .catch((error) => cb(error));
}

export function commitProject(folder, username, useHeadAsParent, saveOptions = {}, pathsToAdd, cb) {
  function pathAdder(done) {
    if(pathsToAdd === '.') {
      logger.info(`[git] adding all paths to index`);
      return addAllPathsToIndex(folder, done);
    }

    if(typeof pathsToAdd === 'string') {
      logger.info(`[git] adding path ${pathsToAdd} to index`);
      return addPathsToIndex(folder, [pathsToAdd], done);
    }

    if(Array.isArray(pathsToAdd) && pathsToAdd.length > 0) {
      logger.info(`[git] adding paths ${pathsToAdd.join(', ')} to index`);
      return addPathsToIndex(folder, pathsToAdd, done);
    }

    logger.info(`[git] no path given`);
    return done();
  }

  return pathAdder((err, oid) => {
    if(err) {
      return cb(err);
    }

    if(!oid) {
      logger.info(`[git] blank oid so cannot commit`);
    }

    const user = username || DEFAULT_GIT_USERNAME;
    const email = username || DEFAULT_GIT_EMAIL;
    const message = (saveOptions && saveOptions.commitMessage) || DEFAULT_GIT_COMMIT_MESSAGE;

    const parentRef = (useHeadAsParent) ? 'HEAD' : null; // Initial commit might not want us to specify a nonexistent ref
    const updateRef = 'HEAD';

    logger.info(`[git] committing ${JSON.stringify(message)} in ${folder} [${updateRef} onto ${parentRef}] ...`);

    return buildCommit(folder, user, email, message, oid, updateRef, parentRef, (err, commitId) => {
      if(err) {
        return cb(err);
      }

      logger.info(`[git] commit done (${commitId})`);

      return cb(null, commitId);
    });
  });
}

export function fetchProjectDirectly(folder, projectName, repositoryUrl, cb) {
  GitAdapter.upsertRemoteDirectly(folder, projectName, repositoryUrl)
    .then(() => {
      logger.info(`[git] fetching ${projectName} from remote ${repositoryUrl}`);
      return GitAdapter.fetchFromRemoteDirectly(folder, projectName);
    })
    .then(() => {
      logger.info('[git] fetch done');
      return cb();
    })
    .catch((error) => cb(error));
}

export function pushProjectDirectly(folder, projectName, cb) {
  GitAdapter.getCurrentBranchName(folder)
    .then((partialBranchName) => {
      const fullBranchName = `refs/heads/${partialBranchName}`;
      logger.info(`[git] pushing ${fullBranchName} to remote (${projectName})`);
      const doForcePush = true;
      return GitAdapter.pushToRemoteDirectly(folder, projectName, fullBranchName, doForcePush);
    })
    .then(() => {
      logger.info('[git] push done');
      return cb();
    })
    .catch((error) => cb(error));
}

export function combineHistories(folder, projectName, ourBranchName, theirBranchName, saveOptions = {}, cb) {
  const fileFavorName = saveStrategyToFileFavorName(saveOptions && saveOptions.saveStrategy);

  GitAdapter.mergeProject(folder, projectName, ourBranchName, fileFavorName)
    .then(({ didHaveConflicts, shaOrIndex }) => {
      return cb(null, didHaveConflicts, shaOrIndex);
    })
    .catch((error) => cb(error));
}

export function getReference(folder, name, cb) {
  // Simplified for isomorphic-git compatibility
  GitAdapter.open(folder)
    .then(() => {
      return cb(null, { name, target: name });
    })
    .catch((error) => cb(error));
}

export function getRemoteBranchRefName(projectName, partialBranchName) {
  return `remotes/${projectName}/${partialBranchName}`;
}

export function mergeProject(folder, projectName, partialBranchName, saveOptions = {}, cb) {
  const fileFavorName = saveStrategyToFileFavorName(saveOptions && saveOptions.saveStrategy);
  const doFindRenames = false;

  logger.info(`[git] merging '${partialBranchName}' with remote via '${fileFavorName}' (${folder})`);

  return mergeBranches(folder, partialBranchName, `remotes/${projectName}/${partialBranchName}`, fileFavorName, doFindRenames, (err, didHaveConflicts, shaOrIndex) => {
    if(!err) {
      return cb(null, didHaveConflicts, shaOrIndex);
    }

    if(err.message && err.message.match(/No merge base found/i)) {
      logger.info(`[git] histories lack common ancestor; trying to combine`);

      return combineHistories(folder, projectName, partialBranchName, `remotes/${projectName}/${partialBranchName}`, saveOptions, cb);
    }

    return cb(err);
  });
}

export function logStatuses(statuses) {
  for(const key in statuses) {
    const status = statuses[key];
    logger.info('[git] git status:' + status.path + ' ' + statusToText(status));
  }
}

export function statusToText(status) {
  return GitAdapter.statusToText(status.num);
}

export function saveStrategyToFileFavorName(saveStrategy) {
  return GitAdapter.saveStrategyToFileFavorName(saveStrategy);
}
