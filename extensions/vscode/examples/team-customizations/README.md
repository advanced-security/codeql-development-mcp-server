# Team Customizations — Overlay Example

This directory demonstrates how to extend the built-in custom agents with
team-specific or personal agents, prompts, and skills.

## Structure

```
team-customizations/
  agents/          # .agent.md files to add or override
  prompts/         # .prompt.md files to add
  skills/          # <name>/SKILL.md files to add
  README.md        # this file
```

## Usage

### At build time (produces a custom VSIX)

```bash
cd extensions/vscode
npm run bundle:customizations -- --customizations-dir=./examples/team-customizations
npm run package
```

### At bundle time only (during development)

```bash
CODEQL_MCP_CUSTOMIZATIONS_DIR=./examples/team-customizations npm run bundle:customizations
```

## Override vs. Add

- A file with the **same name** as a bundled file **replaces** it (with a warning).
- A file with a **new name** is **added** alongside the defaults.

## Important Notes

- **Never add a `model:` key** to `.agent.md` files — users choose their own model in VS Code.
- Skill files must be named `SKILL.md` and placed in `skills/<name>/SKILL.md`.
- Prompt files must end in `.prompt.md`.
- Agent files must end in `.agent.md`.
