/**
 * @name Actions lockfile extraction and pin coverage
 * @description Verifies that `.github/workflows/actions.lock` is extracted into the test database
 *              and that `ActionsLock.pins` resolves the `uses:` steps the lockfile covers.
 * @id actions/tools/test/actions-lock
 * @tags lockfile
 */

import actions
private import codeql.actions.Lock
private import codeql.files.FileSystem

/** Holds if `path` is the relative path of an extracted `actions.lock` file. */
query predicate extractedLockFiles(string path) {
  path = any(ActionsLock lock).getFile().getRelativePath()
}

/** Holds if the lockfile pins `callee` in `workflow` to `ref` with a full commit digest. */
query predicate pinnedUses(string workflow, string callee, string ref) {
  exists(ActionsLock lock, UsesStep uses |
    lock.pins(uses, ref) and
    workflow = uses.getLocation().getFile().getRelativePath() and
    callee = uses.getCallee()
  )
}

/** Holds if `callee` in `workflow` is not covered by any lockfile entry. */
query predicate unpinnedUses(string workflow, string callee) {
  exists(UsesStep uses |
    not any(ActionsLock lock).pins(uses, _) and
    workflow = uses.getLocation().getFile().getRelativePath() and
    callee = uses.getCallee()
  )
}
