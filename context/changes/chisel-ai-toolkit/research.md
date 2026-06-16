---
date: 2026-06-16T18:00:00+02:00
researcher: Rafal Puczel
git_commit: 659928f9978a96cdf5405575ec6d758b370d0bce
branch: master
repository: xfiveco/chisel-ai-toolkit
topic: "Minimal versioned Chisel AI toolkit distributed via public GitHub Packages (M5L4 Model 1)"
tags: [research, codebase, github-packages, npm, installer, ci-cd]
status: complete
last_updated: 2026-06-16
last_updated_by: Rafal Puczel
---

# Research: Minimal versioned Chisel AI toolkit via public GitHub Packages (Model 1)

**Date**: 2026-06-16T18:00:00+02:00
**Researcher**: Rafal Puczel
**Git Commit**: 659928f9978a96cdf5405575ec6d758b370d0bce
**Branch**: master
**Repository**: xfiveco/chisel-ai-toolkit

## Research Question

Design a minimal team AI toolkit distributed via **public** GitHub Packages (M5L4 **Model 1** — NOT CodeArtifact). Inputs: the `m5l4-shared-*` and `m5l4-github-packages-*` specs and the `config-templates/m5l4-github-packages-*` templates. Ignore all `codeartifact-*` (Model 2 / AWS) material. Package scope: `@xfiveco`. Artifacts to bundle: 2-3 skills (e.g. `chisel-plan`, `chisel-create-block`, `chisel-setup`) + CLAUDE.md, whose content the user will supply later. Goal: a public package, published on merge to master via `GITHUB_TOKEN`, with the version list visible in the repo's **Packages** tab.

## Summary

The build is self-contained and low-risk. Four findings shape the plan:

1. **The package is the deliverable; the bundled skills are pluggable content.** The structure, installer/uninstaller, `.npmrc`, and publish workflow can be built and validated independently of *which* skills ship inside. The 2-3 Chisel skills (`chisel-plan`, `chisel-create-block`, `chisel-setup`) and the `CLAUDE.md` ruleset are **user-supplied content dropped into `skills/` and `rules/` later** — so v1 stands up the machinery with minimal placeholder `SKILL.md`/`CLAUDE.md` and swaps in real content when provided.

2. **"Public" simplifies the consumer side dramatically.** Per the M5L4 lesson, the public/private difference is **entirely on the READ side**. Publishing (write) is identical either way: ephemeral `GITHUB_TOKEN` + `permissions: packages: write`, zero managed secrets. For a **public** package, consumers need only the scope→registry line in `.npmrc` — **none** of the private-path read-auth machinery (the `preinstall` `GH_PKG_TOKEN` injector, the Cloudflare token-sync, the long-lived PAT, the mid-2026 fine-grained-PAT caveat) applies. Public packages are also fully free.

3. **The repo is greenfield npm-wise.** No `package.json`, `README.md`, or `.github/workflows/` yet. The build starts from zero, assembling from the five `config-templates/m5l4-github-packages-*` templates (which are correct and nearly drop-in).

4. **The three M5L4 *skills* offered by the harness (`pack-init`, `setup-cicd`, `tf-registry`) are all CodeArtifact / Model-2 tooling — ignore all three.** The ground truth is the `m5l4-github-packages-*` specs + templates, not those skills.

## Detailed Findings

### A. Bundled artifacts — supplied by the user

The three named skills (`chisel-plan`, `chisel-create-block`, `chisel-setup`) and the bundled `CLAUDE.md` ruleset do **not** yet exist in this repo. They are **content the user will provide later**.

Implications for the plan:

- **v1 ships minimal placeholders** so the pipeline is real and testable: a `skills/<name>/SKILL.md` per intended skill (valid frontmatter `name` + `description`, stub body) and a short `rules/CLAUDE.md` between sentinel markers. These get **replaced wholesale** when the user supplies the real content — no merge logic needed, the file paths are the contract.
- **The number and exact names are not yet locked.** The spec example uses one skill (`code-review`); the user intends 2-3 Chisel skills. The package structure is identical regardless of count — each skill is just another directory under `skills/`.
- **SKILL.md frontmatter convention** (from this repo's own `.claude/skills/` 10x-* skills) is the shape the bundled skills should follow:
  ```yaml
  ---
  name: <skill-name>            # must match the directory name (CI validates this)
  description: <one line>
  allowed-tools:                # optional
    - Read
    - Write
  ---
  ```
  The publish workflow's validation job checks that a bundled `SKILL.md` exists and that its frontmatter `name` matches its directory — so placeholder frontmatter must already be valid for CI to pass.

### B. GitHub Packages specs + templates (the ground truth — Model 1)

Specs (all read fully):
- `.claude/prompts/m5l4-github-packages-spec-pack.md` — package structure, `publishConfig.registry` (:51-53), `files[]` (:54), `postinstall: node install.js` (:56), sentinel markers `<!-- BEGIN/END @scope/ai-toolkit -->` (:80-85), `.npmrc` mapping (:64-66), installer behavior incl. idempotency + "don't fail npm install on postinstall error" (:71-85), optional `preinstall` auth helper (:87-96, **private-only — drop for public**).
- `.claude/prompts/m5l4-github-packages-spec-cicd.md` — workflow `publish-ai-toolkit.yml` (:11), `permissions: contents: read / packages: write` (:23-27), explicit "Do not require AWS_ACCOUNT_ID / AWS_ROLE_ARN / id-token: write / CodeArtifact login" (:29-31), 5-point validation job (:33-38), publish with `NODE_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }}` (:41-45).
- `.claude/prompts/m5l4-shared-conventions.md` — engineering conventions (input to a `code-review` skill; not directly needed for the toolkit build).
- `.claude/prompts/m5l4-shared-spec-skill.md` — spec for a `code-review` skill (the spec's example bundled skill; we substitute the user's Chisel skills).

Templates (`.claude/config-templates/`, correct & nearly drop-in):
- `m5l4-github-packages-package.json.template:1-26` — `publishConfig.registry: https://npm.pkg.github.com` (:7-9), `files: ["skills/","rules/","install.js","uninstall.js","README.md"]` (:10-16), `postinstall: node install.js` (:17-19), `bin: { "ai-toolkit": "./install.js" }` (:20-22), `engines.node >=20` (:23-25). **License `UNLICENSED` (:5) → change to a real OSS license for public.**
- `m5l4-github-packages-install.js.template:1-109` — CommonJS. `findProjectRoot()` walks up to `node_modules` parent or `PROJECT_ROOT` (:12-21); copies `skills/*` → consumer `.claude/skills/<name>/` (rm+copy, idempotent) (:37-50); injects `rules/CLAUDE.md` into consumer `CLAUDE.md` between sentinels (:52-73); writes `.claude/.ai-toolkit-manifest.json` with package, version, installedAt, files (:75-91); wraps `main()` in try/catch that only `console.warn`s — never fails `npm install` (:104-108).
- `m5l4-github-packages-uninstall.js.template:1-42` — manifest-driven file removal (skips CLAUDE.md) (:26-31) + sentinel-block strip (:11-16, :32-36); removes manifest (:37).
- `m5l4-github-packages-consumer.npmrc.template:1` — single line `@twoj-zespol:registry=https://npm.pkg.github.com`.
- `m5l4-github-packages-publish-ai-toolkit.yml.template:1-47` — validate job (`npm ci`, `test -f skills/code-review/SKILL.md`, `npm pack --dry-run`) + publish job gated `if: github.event_name == 'push'` with `NODE_AUTH_TOKEN: secrets.GITHUB_TOKEN`.

**Required placeholder edits across all templates:**
- Scope `@twoj-zespol` → `@xfiveco` (package.json:2, install.js:6, uninstall.js:6, consumer.npmrc:1, publish-*.yml:23,38). Package name → `@xfiveco/<name>`.
- The hardcoded `PACKAGE_VERSION = "0.1.0"` in install.js:7 must be kept in sync with package.json (see Open Questions — single-source-of-truth risk).
- The validate-job check `test -f skills/code-review/SKILL.md` (publish-*.yml:26) must change to one of the bundled skill paths (e.g. `skills/chisel-plan/SKILL.md`) once names are fixed — or be made generic (assert ≥1 `skills/*/SKILL.md` exists) so it doesn't depend on a specific skill name.

### C. Public-vs-private delta (authoritative: M5L4 lesson)

Source: `H:\localhost\apps\10xdev\course\M5\L4\shared-ai-registry-skille-komendy-i-reguly-dla-zespolu.md` (the canonical Model 1 vs Model 2 lesson; user has read access per `.claude/settings.local.json`).

- **Write (publish) is identical public or private** (:148): CI uses the auto-injected `GITHUB_TOKEN`, scoped by `permissions: packages: write`, ephemeral, zero managed secrets. ✅ exactly the user's goal.
- **Read is the only axis that differs** (:150-154): private packages need a long-lived PAT wherever they install (the `preinstall` `GH_PKG_TOKEN` line :158-163 + Cloudflare token-sync :165, :211). **Public packages need none of it** — anyone installs with just the `.npmrc` scope mapping. Public = fully free (:154).
- **Versioning guidance** (:196-212): publishing on every merge makes manual version bumps a bottleneck and risks the **409 duplicate-version rejection** (:212). Lesson recommends conventional-commits-driven automation (semantic-release / release-please) **plus** a `git diff` guard that real package files changed between tags, to kill false releases from mis-tagged commits. Manual bump is viable for a minimal first cut but will hit 409 on re-merge without a bump.
- **Read-token type is a moving target (mid-2026)** (:210) — but **private-only**, so irrelevant to this public package.
- **The npm scope must equal the GitHub owner** for GitHub Packages. Remote is `git@github.com:xfiveco/chisel-ai-toolkit.git`, owner `xfiveco` (confirmed via `gh repo view`), so `@xfiveco` is correct and consistent.

### D. The harness's M5L4 skills are Model 2 — ignore

- `.claude/skills/pack-init/SKILL.md` — "Model 2 CodeArtifact delivery path" (:3, :18). Forces a `packages/ai-toolkit/` monorepo, hardcodes `@10xdevs` (:42), adds CodeArtifact-only `pack.yaml` + `bin/cli.js`, and omits the GH publishConfig / `.npmrc` / exact-sentinel pieces. Conceptually adjacent but **not** a drop-in.
- `.claude/skills/setup-cicd/SKILL.md` — CodeArtifact CI via **OIDC** (`id-token: write`, `aws codeartifact login`, `AWS_ROLE_ARN`). Directly opposite to the GH spec's `packages: write` + `GITHUB_TOKEN`. Ignore.
- `.claude/skills/tf-registry/SKILL.md` — Terraform for an AWS CodeArtifact registry (domain/KMS/IAM). GitHub Packages needs zero infra. Ignore.

### E. Local toolchain constraints (this repo)

- PostToolUse hook `.claude/hooks/lint-typecheck.sh:9-15` runs ESLint + `astro check` **only on `.ts/.tsx/.astro`** files; it no-ops for `.js/.json/.md/.yml`. → Keeping the installer as plain CommonJS `.js` (as the templates do) avoids pulling in an ESLint/Astro toolchain that doesn't exist here. Writing it in TypeScript would trip the hook.
- `.gitignore:1` contains exactly `.claude` — this ignores the repo's own `.claude/` tooling dir. The package's *bundled* skills live in a tracked `skills/` dir at **repo root** (per the spec layout), so this doesn't block packaging, but the line is worth revisiting (it currently excludes this repo's own `.claude/` from version control).

## Code References

- `.claude/config-templates/m5l4-github-packages-package.json.template:1-26` — package.json base
- `.claude/config-templates/m5l4-github-packages-install.js.template:1-109` — installer (sentinel inject + manifest)
- `.claude/config-templates/m5l4-github-packages-uninstall.js.template:1-42` — uninstaller
- `.claude/config-templates/m5l4-github-packages-consumer.npmrc.template:1` — consumer `.npmrc`
- `.claude/config-templates/m5l4-github-packages-publish-ai-toolkit.yml.template:1-47` — publish workflow
- `.claude/prompts/m5l4-github-packages-spec-pack.md` / `m5l4-github-packages-spec-cicd.md` — authoritative specs
- `H:\localhost\apps\10xdev\course\M5\L4\shared-ai-registry-skille-komendy-i-reguly-dla-zespolu.md:105-212` — Model 1 section incl. public/private + versioning
- `.claude/skills/10x-init/SKILL.md:1-8` — local SKILL.md frontmatter convention reference
- `.claude/hooks/lint-typecheck.sh:9-15` — lint hook scope (`.ts/.tsx/.astro` only)

## Architecture Insights

- **Proposed package layout** (repo root, per spec :22-33, adapted for public; skill/ruleset content TBD by user):
  ```
  chisel-ai-toolkit/
  ├── package.json            # @xfiveco/<name>, publishConfig→npm.pkg.github.com, files[], postinstall, bin, MIT
  ├── README.md               # install + what's bundled + uninstall
  ├── install.js              # from template, scope @xfiveco
  ├── uninstall.js            # from template, scope @xfiveco
  ├── skills/                 # PLACEHOLDER content until user supplies real skills
  │   ├── chisel-plan/SKILL.md
  │   ├── chisel-create-block/SKILL.md
  │   └── chisel-setup/SKILL.md
  ├── rules/
  │   └── CLAUDE.md           # PLACEHOLDER ruleset until user supplies real content
  ├── .npmrc                  # @xfiveco:registry=https://npm.pkg.github.com (committed, NO token)
  └── .github/workflows/
      └── publish-ai-toolkit.yml
  ```
- **Installer contract** (consumer side): skills → `.claude/skills/<name>/`; ruleset → spliced into consumer `CLAUDE.md` between `<!-- BEGIN @xfiveco/<name> -->` / `<!-- END ... -->`; manifest at `.claude/.ai-toolkit-manifest.json`. Idempotent (re-install replaces managed blocks); postinstall never hard-fails `npm install`.
- **Content is swap-in-place**: because the installer copies whole `skills/<name>/` dirs and replaces the sentinel block wholesale, supplying real skill/ruleset content later is a pure file drop in `skills/`+`rules/` — no installer changes, no merge logic. The file paths are the only contract.
- **Publish trigger**: push to `master` → validate → `npm publish` with `GITHUB_TOKEN`. The version list then appears under the repo's **Packages** tab automatically (a published GitHub Packages version is surfaced there by default). For "public" visibility, confirm/flip the package to public in package settings (first publish under a public repo is typically public, but verify).
- **Bin command**: package.json `bin` maps `ai-toolkit` → `install.js`, enabling `npx @xfiveco/<name>` manual (re)install. Consider a separate `uninstall` invocation path (template `bin` only wires install).

## Historical Context (from prior changes)

- `context/changes/chisel-ai-toolkit/change.md` — this change's identity (status now `preparing`).
- No prior changes or archive entries exist (`/context` was scaffolded today via `/10x-init`); `context/foundation/lessons.md` is absent — no known-pattern priors to apply.

## Related Research

None — this is the first research artifact in the repo.

## Open Questions

1. **Skill set: count + exact names.** Confirm the bundled skills (working assumption: `chisel-plan`, `chisel-create-block`, `chisel-setup`). Names fix the `skills/<name>/` paths and the CI validation reference. **Content for each is supplied by the user later** — v1 ships valid placeholder `SKILL.md` files at these paths.
2. **Bundled CLAUDE.md content.** What goes in `rules/CLAUDE.md` is **user-supplied later**. v1 ships a short placeholder between the sentinel markers so the installer's splice logic is exercised. Decide later how heavy/what scope the real ruleset is.
3. **Versioning strategy.** Minimal first cut = manual `version` bump in package.json (simple, but a second merge without a bump hits the **409 duplicate** rejection). Vs. automated conventional-commits (semantic-release / release-please) + `git diff` guard per the lesson. Which for v1?
4. **Single source of version truth.** The template duplicates the version in `package.json` and `install.js` (`PACKAGE_VERSION`). Keep the hardcoded constant (and a bump checklist), or have `install.js` read version from its own `package.json` at runtime to avoid drift?
5. **Public flip + license.** Set `license` to `MIT` (or other) in package.json, and confirm the published package is **public** in GitHub package settings. Pick the license.
6. **CI validation strictness for placeholders.** Should the validate job assert a *specific* skill path (`skills/chisel-plan/SKILL.md`) or generically require ≥1 `skills/*/SKILL.md`? Generic is more robust while skill names/content are still in flux.
7. **`.gitignore` `.claude` line** — leave as-is (only affects this repo's own tooling, not the published `skills/` at root) or narrow it? Confirm it does not accidentally exclude anything the package needs.
