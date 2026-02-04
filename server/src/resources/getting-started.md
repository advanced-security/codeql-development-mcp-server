# CodeQL Getting Started Guide

## What is CodeQL?

CodeQL is a semantic code analysis engine that allows you to write queries to find problems in source code.

## Installation

1. Download CodeQL CLI from GitHub releases
2. Add to PATH
3. Verify: `codeql version`

## First Steps

### 1. Create a Database

```bash
codeql database create my-db --language=java --source-root=./src
```

### 2. Run Analysis

```bash
codeql database analyze my-db --format=sarif --output=results.sarif
```

## Resources

- [CodeQL Documentation](https://codeql.github.com/)
- [GitHub Security Lab](https://securitylab.github.com/)
