---
applyTo: '.github/{actions,workflows}/**/*.{yml,yaml}'
description: 'Instructions for editing GitHub Actions workflows for this repository.'
---

# Copilot Instructions for `.github/{actions,workflows}/*.{yml,yaml}` files

## PURPOSE

This file contains instructions for working with GitHub Actions YAML files in the `.github/actions/` and `.github/workflows/` directories of the `codeql-development-mcp-server` repository.

## REQUIREMENTS

- **ALWAYS run `npm run build-and-test` from the repo root directory and ensure it passes completely before committing any changes. This is MANDATORY and must be verified before every commit.**
- **ALWAYS pin ALL external GitHub Actions to full-length commit SHAs, never to tags or branch names — including GitHub-maintained `actions/*` actions.** Add a trailing comment with the original tag for readability (e.g., `uses: actions/checkout@de0fac2e4500dabe0009e67214ff5f5447ce83dd # v6`). To resolve a tag to its underlying commit SHA (handling annotated tags correctly), run `git ls-remote https://github.com/OWNER/REPO.git refs/tags/TAG^{}`; for branch-based refs, use `refs/heads/BRANCH`.
- ALWAYS use the principle of least privilege, and explicitly set `permissions` for workflows.
- ALWAYS use valid YAML syntax and follow GitHub Actions workflow conventions.
- ALWAYS follow best practices for GitHub Actions workflows including security, efficiency, and maintainability.
- ALWAYS order job names, step names, and workflow triggers alphabetically where logical.
- ALWAYS use descriptive names for workflows, jobs, and steps that clearly explain their purpose.
- ALWAYS check formatting with `npm run lint && npm run format:check` from the repo root directory to ensure consistent formatting after making changes.
- ALWAYS fix linting and formatting errors by running `npm run lint:fix && npm run format` from the repo root directory before committing changes.

## PREFERENCES

- PREFER explicit permissions declarations using the `permissions` key for security.
- PREFER descriptive step names that include the workflow context (e.g., "Lint and Format - Checkout repository").
- PREFER matrix strategies for testing multiple versions when applicable.
- PREFER adding summary outputs using `$GITHUB_STEP_SUMMARY` for better workflow visibility.

## CONSTRAINTS

- **NEVER reference an external GitHub Action by tag or branch name (e.g., `@v6`, `@main`). ALWAYS use the full 40-character commit SHA with a `# tag` comment.**
- NEVER use overly broad permissions.
- NEVER leave any trailing whitespace on any line.
- NEVER use deprecated GitHub Actions or workflow syntax.
- NEVER commit workflow files without running the formatting checks first.
