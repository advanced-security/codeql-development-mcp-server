---
name: example-override
description: "Example agent demonstrating the overlay/override pattern."
tools: ['ql-mcp/*', 'edit', 'read', 'search']
---

# `example-override` Agent

This is a stub agent that demonstrates how to add or override `.agent.md` files
using the `--customizations-dir` overlay feature.

## How Overlays Work

When you run:

```bash
npm run bundle:customizations -- --customizations-dir=./examples/team-customizations
```

Files in `<customizations-dir>/agents/` are copied **after** the defaults,
replacing any file with the same name and adding new files.

## Customization Tips

- Override `codeql-query-developer.agent.md` to add team-specific workflows.
- Add new `.agent.md` files for team-specific roles (e.g., `security-review.agent.md`).
- Keep `name:` in frontmatter matching the filename stem for VS Code to discover the agent.
- Never add a `model:` key — users choose their own model.
