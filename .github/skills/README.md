# CodeQL Development MCP Server Skills

This directory contains [Agent Skills](https://agentskills.io/) that teach GitHub Copilot how to perform specialized tasks using the CodeQL Development MCP Server.

## About

Skills are folders of instructions, scripts, and resources that Copilot can load when relevant. Each skill combines two or more MCP Server tools (primitives) to accomplish specific development tasks.

## Structure

Each skill is defined in its own subdirectory:

- Directory names should be lowercase, using hyphens for spaces
- Each directory must contain a `SKILL.md` file with YAML frontmatter and instructions
- Additional scripts, examples, or resources can be included in the skill directory

## SKILL.md Format

```markdown
---
name: skill-name
description: Brief description of the skill and when to use it
---

Instructions for performing the task, including which MCP Server tools to use and in what order.
```

## References

- [About Agent Skills](https://docs.github.com/en/copilot/concepts/agents/about-agent-skills)
- [`agentskills/agentskills` repo](https://github.com/agentskills/agentskills)
- [Example `anthropics/skills` repo](https://github.com/anthropics/skills)
- [Awesome Copilot Skills](https://github.com/github/awesome-copilot/blob/main/docs/README.skills.md)
