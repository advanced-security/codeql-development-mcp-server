# `codeql_resolve_languages` - list_languages

## Purpose

Tests the `codeql_resolve_languages` tool by listing all installed CodeQL extractor packs.

## Inputs

- **format**: Output format (`json`)

## Expected Behavior

The tool should return a list of all installed CodeQL language extractors (e.g., javascript, python, java, etc.) with their installation paths.
