# @rafalpuczel/chisel-ai-toolkit

Versioned Chisel AI artifacts — skills and rules for Claude Code — distributed as a **public** npm package through GitHub Packages. Installing the package drops the bundled skills and rules into a consumer project's Claude Code setup.

The package is **public** (anyone may read it, no per-package grant needed), but note: **GitHub Packages requires npm clients to present a token with the `read:packages` scope for *every* npm read — including public packages.** This is a registry requirement, not a private-package restriction. A bare `npm install` with no GitHub token fails with `401 … authentication token not provided`; a token missing the scope fails with `403 … token does not match expected scopes`.

## Install

### 1. Map the scope (committed `.npmrc`, no token)

Add to the consumer project's `.npmrc` (this line is safe to commit):

```
@rafalpuczel:registry=https://npm.pkg.github.com
```

### 2. Provide a `read:packages` token (never committed)

Add a token line to your **user** `~/.npmrc` (not the project file):

```
//npm.pkg.github.com/:_authToken=${GH_PKG_TOKEN}
```

Get a token with the `gh` CLI (`gh auth refresh -h github.com -s read:packages`, then `gh auth token`) or a classic PAT with `read:packages`. In CI, inject it from a secret — never commit `_authToken`.

### 3. Install

```
npm install @rafalpuczel/chisel-ai-toolkit
```

A `postinstall` step runs the installer automatically. (The consumer project must have its own `package.json` so npm reads the project `.npmrc`.)

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
