# Chisel AI Toolkit — Plan Brief

> Full plan: `context/changes/chisel-ai-toolkit/plan.md`
> Research: `context/changes/chisel-ai-toolkit/research.md`

## What & Why

Build a minimal, public, versioned npm package `@rafalpuczel/chisel-ai-toolkit` on GitHub Packages that bundles auto-discovered Chisel skills plus a `CLAUDE.md` ruleset and a `new-session-prompt.md`, with an idempotent installer/uninstaller and automatic publishing on merge to `master`. It replaces copy-paste sharing of AI artifacts with a versioned, single-source-of-truth package the whole team installs the same way.

## Starting Point

The repo is greenfield npm-wise — no `package.json`, README, or workflows. But five correct, nearly drop-in M5L4 templates already exist under `.claude/config-templates/m5l4-github-packages-*`, so the work is assembly + adaptation, not authoring from scratch. The npm scope `@rafalpuczel` matches the GitHub owner, as GitHub Packages requires.

## Desired End State

A consumer adds a one-line `.npmrc` and runs `npm install @rafalpuczel/chisel-ai-toolkit`; skills land in `.claude/skills/<name>/` (auto-discovered), the ruleset is spliced into the root `CLAUDE.md`, and a `new-session-prompt.md` is placed in `.claude/`. Every merge to `master` publishes a semantic-release-computed version, visible in the repo's **Packages** tab. Skill/ruleset content is supplied later as a pure file drop — no installer changes.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
| --- | --- | --- | --- |
| Distribution model | Public GitHub Packages (Model 1) | Lowest entry barrier for a team already on GitHub; public removes all consumer read-auth. | Research |
| Install layout | Into `.claude/` (template default) | Skills auto-discovered by Claude Code with zero consumer wiring. | Plan |
| Skill set | 3 placeholders, auto-discovered | Names fix paths now; installer/CI never hardcode a skill, so adding more is a file drop. | Plan |
| Rules folder | `CLAUDE.md` + `new-session-prompt.md` | Ship both rules artifacts; session prompt installs standalone to `.claude/`. | Plan |
| Versioning | semantic-release + git-diff guard | Auto-version from conventional commits; guard kills false/empty releases and 409s. | Plan |
| Version source | install.js reads package.json | Single source of truth — bump one file, no drift with the manifest. | Plan |
| CI validation | Generic over all `skills/*` | Enforces `frontmatter.name == dir` for any skill; supports auto-discovery. | Plan |
| License | MIT, public | Standard permissive OSS license matching the public, shareable goal. | Plan |

## Scope

**In scope:** package.json + `.npmrc`; 3 placeholder skills; placeholder `rules/CLAUDE.md` + `rules/new-session-prompt.md`; README; adapted `install.js`/`uninstall.js` (scope, single-source version, session-prompt placement); `semantic-release` config; publish workflow with generic skill validation + packaged-files git-diff guard.

**Out of scope:** real skill/ruleset content (user supplies later); AWS CodeArtifact / Terraform / OIDC and the `pack-init`/`setup-cicd`/`tf-registry` skills; consumer read-auth (PAT, `GH_PKG_TOKEN`, Cloudflare sync); self-contained `ai-toolkit/` install folder; unit-test framework; monorepo layout.

## Architecture / Approach

Repo-root npm package. `postinstall` runs a CommonJS `install.js` that globs `skills/*` → consumer `.claude/skills/`, splices `rules/CLAUDE.md` into the consumer root `CLAUDE.md` between `<!-- BEGIN/END @rafalpuczel/chisel-ai-toolkit -->` markers, copies `rules/new-session-prompt.md` → `.claude/new-session-prompt.md`, and writes a manifest. `uninstall.js` reverses all three via the manifest. CI validates every skill's frontmatter generically, then `semantic-release` publishes on merge to `master` using the ephemeral `GITHUB_TOKEN` (`packages: write`), gated by a packaged-files git-diff guard.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Skeleton & placeholders | Packable package.json, `.npmrc`, 3 skills, rules stubs, README | `npm pack` file set wrong (over/under-includes) |
| 2. Installer & uninstaller | Idempotent install + clean uninstall, session-prompt placement, version-from-package.json | CLAUDE.md splice clobbers existing consumer content |
| 3. CI/CD publish | Generic validation + semantic-release publish on merge, git-diff guard | semantic-release misconfig → 409 or empty release |

**Prerequisites:** repo pushed to `github.com/rafalpuczel/chisel-ai-toolkit` (done); `master` is the default branch; ability to set package visibility public after first publish.
**Estimated effort:** ~2-3 sessions across 3 phases.

## Open Risks & Assumptions

- **Faithful skill names not yet known** — v1 uses literal `chisel-plan`/`chisel-create-block`/`chisel-setup` as placeholders; a later rename to the true skill name is a trivial dir rename (auto-discovery means no code follows the name).
- **semantic-release read-token caveat is irrelevant** — that mid-2026 PAT issue is private-package only; this package is public.
- **First-publish visibility** — must confirm/flip the package to public in settings after the first publish.
- **`contents: write` permission** — semantic-release needs it (for tags/release notes), a step up from the template's `contents: read`.

## Success Criteria (Summary)

- A merge touching only non-packaged files produces no release
- A consumer installs the package and gets working, auto-discovered skills + a CLAUDE.md rules block + a session prompt; uninstall removes everything cleanly.
- Merging to `master` publishes a correctly-versioned package visible in the Packages tab; non-packaged-file merges publish nothing.
- Adding a new skill later requires only dropping a `skills/<name>/SKILL.md` — no installer or CI edits.
