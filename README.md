# @rafalpuczel/chisel-ai-toolkit

Versioned Chisel AI artifacts — skills and rules for Claude Code — distributed as a **public** npm package through GitHub Packages. Installing the package drops the bundled skills and rules into a consumer project's Claude Code setup.

This package is **public**: installing it needs no token or authentication, only a one-line registry mapping for the `@rafalpuczel` scope.

## Install

Add a `.npmrc` to the consumer project (committed, no token) mapping the scope to GitHub Packages:

```
@rafalpuczel:registry=https://npm.pkg.github.com
```

Then install:

```
npm install @rafalpuczel/chisel-ai-toolkit
```

A `postinstall` step runs the installer automatically.

## What gets installed

| Bundled artifact | Installed to (in the consumer project) |
| --- | --- |
| `skills/<name>/` (each bundled skill) | `.claude/skills/<name>/` — auto-discovered by Claude Code |
| `rules/CLAUDE.md` | spliced into the project's root `CLAUDE.md` between `<!-- BEGIN @rafalpuczel/chisel-ai-toolkit -->` / `<!-- END @rafalpuczel/chisel-ai-toolkit -->` markers |
| `rules/new-session-prompt.md` | `.claude/new-session-prompt.md` (standalone file) |
| (manifest) | `.claude/.ai-toolkit-manifest.json` — records version + installed files |

The install is **idempotent**: re-running updates the managed pieces in place instead of duplicating them.

## Re-install manually

```
npx @rafalpuczel/chisel-ai-toolkit
```

## Uninstall

```
node node_modules/@rafalpuczel/chisel-ai-toolkit/uninstall.js
```

This removes the installed skills and the session prompt, strips the managed block from the project's `CLAUDE.md`, and deletes the manifest — using the manifest to know exactly what was installed.

## Skills

Skills are **auto-discovered**: every directory under `skills/` that contains a `SKILL.md` is bundled and installed. Adding a new skill is a pure file drop — no installer or CI changes. Each skill's `SKILL.md` frontmatter `name` must equal its directory name.

Currently bundled (placeholder content — real content supplied separately):

- `chisel-plan`
- `chisel-create-block`
- `chisel-setup`
