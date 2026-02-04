---
applyTo: '.github/workflows/*.{yml,yaml}'
description: 'Instructions for editing GitHub Actions workflows for this repository.'
---

# Copilot Instructions for `.github/workflows/*.{yml,yaml}` files

## PURPOSE

This file contains instructions for working with GitHub Actions workflow files in the `.github/workflows/` directory of the `codeql-development-mcp-server` repository.

## REQUIREMENTS

- **ALWAYS run `npm run build-and-test` from the repo root directory and ensure it passes completely before committing any changes. This is MANDATORY and must be verified before every commit.**
- ALWAYS use the principle of least privilege, and explicitly set `permissions` for workflows.
- ALWAYS use valid YAML syntax and follow GitHub Actions workflow conventions.
- ALWAYS follow best practices for GitHub Actions workflows including security, efficiency, and maintainability.
- ALWAYS order job names, step names, and workflow triggers alphabetically where logical.
- ALWAYS use descriptive names for workflows, jobs, and steps that clearly explain their purpose.
- ALWAYS check formatting with `npm run lint && npm run format:check` from the repo root directory to ensure consistent formatting after making changes.
- ALWAYS fix linting and formatting errors by running `npm run lint:fix && npm run format` from the repo root directory before committing changes.

## PREFERENCES

- PREFER using the latest stable versions of GitHub Actions (e.g., `actions/checkout@v6`, `actions/setup-node@v6`).
- PREFER explicit permissions declarations using the `permissions` key for security.
- PREFER descriptive step names that include the workflow context (e.g., "Lint and Format - Checkout repository").
- PREFER matrix strategies for testing multiple versions when applicable.
- PREFER adding summary outputs using `$GITHUB_STEP_SUMMARY` for better workflow visibility.

## CONSTRAINTS

- NEVER use overly broad permissions.
- NEVER leave any trailing whitespace on any line.
- NEVER use deprecated GitHub Actions or workflow syntax.
- NEVER commit workflow files without running the formatting checks first.
