# Example Team Skill

This is an example `SKILL.md` file demonstrating how to add a team-specific skill
via the `--customizations-dir` overlay feature.

## How to Use

1. Copy this directory to your team's customizations repository.
2. Rename `example-team-skill` to match your skill's name.
3. Replace this content with your team's skill documentation.
4. Reference it in your `.agent.md` files.

## Overlay Usage

```bash
npm run bundle:customizations -- --customizations-dir=./examples/team-customizations
```

Skills placed in `<customizations-dir>/skills/<name>/SKILL.md` are merged alongside the defaults.
