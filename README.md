# Mint for Claude Code

A work journal your coding agent keeps for you.

Claude Code writes what it did, what's left, and what it cost into [Mint](https://verymint.app).
You get one dashboard across every project, and the next session picks up where the last one ended.

## Install

1. Create an API key at [verymint.app/work](https://verymint.app/work) (Connect → API keys).
2. In Claude Code:

```
/plugin marketplace add verymint/claude-plugin
/plugin install mint@verymint
```

3. Paste your key when asked. Start a new session. That's it.

## What happens

| When | What Mint does |
|---|---|
| Session starts | Finds or creates a Mint project named after your repo, then shows Claude the latest worklogs and open tasks |
| Claude works | Claude can use the Mint tools (`mint_add_worklog`, `mint_add_task`, `mint_search_worklog`, costs, …) |
| You ask for a new board | Claude opens one itself with `mint_create_project` — asking for the same name twice returns the existing board, never a duplicate |
| You ask for a local copy | Claude exports the project with `mint_export_markdown` — state, tasks and work log as one Markdown file for your repo or Obsidian vault |
| Claude finishes after editing files | If nothing was logged yet, Claude is reminded once to write a short worklog |

Hooks never block a session: if Mint is unreachable, they stay silent.

## Options

Use a different project name by adding `.mint.json` to your repo:

```json
{ "project": "My App" }
```

## Privacy

The plugin only sends your API key, the project name, and what Claude chooses to log.
It never uploads your code.

## License

MIT
