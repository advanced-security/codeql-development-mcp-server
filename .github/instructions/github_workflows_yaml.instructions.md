---
applyTo: '.github/{actions,workflows}/**/*.{yml,yaml},.github/workflows/actions.lock'
description: 'Instructions for editing GitHub Actions workflows and composite actions. Use when changing uses: references, actions.lock, gh actions-lock, or same-repository $/ paths.'
---

# Copilot Instructions for `.github/{actions,workflows}/**/*.{yml,yaml}` files

## PURPOSE

This file contains instructions for working with GitHub Actions YAML files in the `.github/actions/` and `.github/workflows/` directories of the `codeql-development-mcp-server` repository, including the workflow dependency lockfile at `.github/workflows/actions.lock`.

## REQUIREMENTS

- **ALWAYS run `npm run build-and-test` from the repo root directory and ensure it passes completely before committing any changes. This is MANDATORY and must be verified before every commit.**
- **ALWAYS reference external GitHub Actions by a full semver tag, never by a commit SHA, a floating tag, or a branch — including GitHub-maintained `actions/*` actions.** Example: `uses: actions/checkout@v7.0.1`. Do not use `@v7`, `@main`, or `uses: actions/checkout@<40-character-sha> # v7.0.1`. The commit that tag resolves to is pinned in `.github/workflows/actions.lock`, which GitHub Actions runs. See [workflow dependency lockfiles](https://docs.github.com/actions/concepts/security/workflow-dependency-lockfiles). The one exception is `dtolnay/rust-toolchain@master` in `.github/actions/setup-codeql-environment/action.yml`: that action treats the `uses:` ref as the toolchain unless `toolchain:` is set, upstream requires `@master` when `toolchain:` is passed, and the only release tag is the 2022 `v1` tag. The lockfile pins that commit. Do not replace it with a SHA, `@stable`, or `@v1`.
- **ALWAYS regenerate `.github/workflows/actions.lock` with `gh actions-lock` after adding, removing, or retargeting a `uses:` reference** in an onboarded workflow, or in a composite action that an onboarded workflow calls. Run it from the repo root (`gh actions-lock`, or `gh actions-lock .github/workflows/<file>.yml`). If the extension is missing, install it with `gh extension install github/gh-actions-lock`. A normal run onboards missing pins and rewrites a bare SHA `uses:` to the full semver tag it reverse-looks up; do not rewrite those SHAs by hand and do not edit the lockfile by hand. `--relock` only advances refs that have moved: it does not onboard missing pins, and it leaves an unreachable pin as an error. If the CLI says a commit is not in upstream history, change that `uses:` to a current upstream ref and re-run `gh actions-lock`. `--accept-moved` re-pins a lockfile entry whose commit fell off history; it does not invent a tag for a dead SHA. Commit the lockfile diff with the workflow change. Dependabot regenerates the matching lockfile entry when it bumps an action in an onboarded workflow; do not drop that hunk.
- **ALWAYS reference an action or reusable workflow in this repository with self-repository syntax `uses: $/...`.** Examples: `uses: $/.github/actions/setup-codeql-environment` and `uses: $/.github/workflows/release-tag.yml`. A `$/` reference resolves to the commit that is running, does not require a checkout step, and does not need a lockfile entry. Workspace-relative `uses: ./...` is no longer the preferred form.
- **ALWAYS keep the leading `# This workflow is managed by gh actions-lock.` comment** on an onboarded workflow. `gh actions-lock` adds it when a workflow is onboarded; do not remove it.
- ALWAYS use the principle of least privilege, and explicitly set `permissions` for workflows.
- ALWAYS use valid YAML syntax and follow GitHub Actions workflow conventions.
- ALWAYS follow best practices for GitHub Actions workflows including security, efficiency, and maintainability.
- ALWAYS order job names, step names, and workflow triggers alphabetically where logical.
- ALWAYS use descriptive names for workflows, jobs, and steps that clearly explain their purpose.
- ALWAYS check formatting with `npm run lint && npm run format:check` from the repo root directory to ensure consistent formatting after making changes.
- ALWAYS fix linting and formatting errors by running `npm run lint:fix && npm run format` from the repo root directory before committing changes.

## PREFERENCES

- PREFER explicit permissions declarations using the `permissions` key for security.
- PREFER action versions already used by sibling workflows (`actions/checkout@v7.0.1`, `actions/setup-node@v7.0.0`, `actions/setup-go@v7.0.0`) over introducing another major of the same action.
- PREFER descriptive step names that include the workflow context (e.g., "Lint and Format - Checkout repository").
- PREFER matrix strategies for testing multiple versions when applicable.
- PREFER adding summary outputs using `$GITHUB_STEP_SUMMARY` for better workflow visibility.

## CONSTRAINTS

- **NEVER reference an external GitHub Action by commit SHA, floating tag, or branch name** (for example `@<40-character-sha> # v7`, `@v7`, or `@main`), except the documented `dtolnay/rust-toolchain@master` case above. Do not resolve a tag with `git ls-remote` in order to paste a SHA into a workflow or composite action. Inline SHA pinning is obsolete in this repository; `.github/workflows/actions.lock` is the pin.
- **NEVER edit `.github/workflows/actions.lock` by hand.** It is machine-generated by `gh actions-lock`. If a pin looks wrong, fix the `uses:` reference and regenerate the lockfile. Before committing a `uses:` change, `gh actions-lock --verify` must pass.
- **NEVER use workspace-relative `uses: ./...` for a same-repository action or reusable workflow** (for example `uses: ./.github/actions/setup-codeql-environment`). Use `uses: $/...`. `gh actions-lock` rewrites `./` only when the path is an in-repo action file (`action.yml`). A job-level `uses: ./.github/workflows/...` call is not migrated; write `uses: $/.github/workflows/...` yourself.
- NEVER use overly broad permissions.
- NEVER leave any trailing whitespace on any line.
- NEVER use deprecated GitHub Actions or workflow syntax.
- NEVER commit workflow files without running the formatting checks first.
