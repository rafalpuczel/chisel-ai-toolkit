# Chisel AI Toolkit — Public GitHub Packages Distribution Implementation Plan

## Overview

Stand up a minimal, public, versioned npm package `@rafalpuczel/chisel-ai-toolkit` distributed through GitHub Packages (M5L4 **Model 1** — not CodeArtifact). The package bundles auto-discovered Chisel skills plus a `CLAUDE.md` ruleset and a `new-session-prompt.md`, installs them into a consumer project's `.claude/` conventions via an idempotent installer, removes them cleanly via an uninstaller, and publishes automatically on merge to `master` using `semantic-release` and the ephemeral `GITHUB_TOKEN`. Skill/ruleset *content* is supplied by the user later; v1 ships valid placeholders so the structure, installer, and publish pipeline are real and verifiable end-to-end.

## Current State Analysis

- The repo is **greenfield npm-wise**: no `package.json`, `README.md`, or `.github/workflows/` (research.md §Summary, §A). Remote is `git@github.com:rafalpuczel/chisel-ai-toolkit.git`, owner `rafalpuczel` — so the npm scope `@rafalpuczel` correctly matches the GitHub owner (a hard requirement for GitHub Packages).
- Five correct, nearly drop-in templates exist under `.claude/config-templates/m5l4-github-packages-*` (package.json, install.js, uninstall.js, consumer.npmrc, publish workflow) — research.md §B has full file:line breakdowns. The build is **assembly + placeholder substitution**, not authoring from scratch.
- The bundled skills/ruleset **do not exist yet**; they are user-supplied later. v1 ships placeholders at fixed paths (research.md §A).
- Local PostToolUse hook `.claude/hooks/lint-typecheck.sh:9-15` lints/typechecks **only `.ts/.tsx/.astro`** files — it no-ops for `.js/.json/.md/.yml`, so the CommonJS installer and all package files are unaffected (research.md §E).
- The three M5L4 *skills* offered by the harness (`pack-init`, `setup-cicd`, `tf-registry`) are CodeArtifact/Model-2 tooling — **ignored**; the templates + specs are the ground truth (research.md §D).

## Desired End State

A consumer can run `npm install @rafalpuczel/chisel-ai-toolkit` (with a one-line `.npmrc` scope mapping) and have:
- every bundled skill copied into `<project>/.claude/skills/<skill-name>/`, auto-discovered by Claude Code;
- the toolkit ruleset spliced into the consumer's root `CLAUDE.md` between sentinel markers;
- a `new-session-prompt.md` placed at `<project>/.claude/new-session-prompt.md`;
- a manifest at `<project>/.claude/.ai-toolkit-manifest.json` recording version + installed files;
- `npx @rafalpuczel/chisel-ai-toolkit` re-runs the install idempotently; an uninstall path reverses all of the above.

Publishing: every merge to `master` runs validation (generic skill-frontmatter checks + `npm pack --dry-run`), and `semantic-release` computes the next version from conventional commits, publishes to GitHub Packages, and the version list appears under the repo's **Packages** tab. A packaged-files git-diff guard prevents empty/false releases and the 409 duplicate-version error.

**Verification of end state**: install/uninstall round-trip against a throwaway consumer directory leaves no residue; `npm pack --dry-run` lists exactly the intended files; the workflow validates and (on a real merge) publishes a new version visible in Packages.

### Key Discoveries:

- Installer already globs `skills/*` for copying (`install.js.template:37-50`) — **auto-discovery of skills is already satisfied** for the copy path; only CI validation needs to be made generic.
- Rules are **spliced into the consumer `CLAUDE.md`**, not copied as a file (`install.js.template:64-72`); the package's `rules/` folder name does not survive on the consumer side.
- The template **duplicates the version** in `package.json` and `install.js` `PACKAGE_VERSION` (`install.js.template:7`) — drift risk; resolved by reading version from the bundled `package.json` at runtime.
- The publish template gates publish on `if: github.event_name == 'push'` (`publish-ai-toolkit.yml.template:31`) and uses `NODE_AUTH_TOKEN: secrets.GITHUB_TOKEN` (`:44-46`) — the correct public-package publish path.
- For a **public** package, none of the private read-auth machinery (`preinstall` `GH_PKG_TOKEN` injector, PAT, Cloudflare sync) is needed (research.md §C) — explicitly omitted.

## What We're NOT Doing

- **Not** authoring real skill or ruleset content — v1 ships placeholders; the user supplies real content later as a pure file drop.
- **Not** using AWS CodeArtifact, Terraform, OIDC, or the `pack-init`/`setup-cicd`/`tf-registry` skills (Model 2).
- **Not** adding any consumer-side read-auth (no `preinstall` token injector, no PAT handling, no Cloudflare token-sync) — the package is public.
- **Not** installing into a self-contained `ai-toolkit/` parent folder — skills go into `.claude/skills/` (auto-discovery), per the chosen install layout.
- **Not** creating a separate uninstall `bin` entry beyond what's needed — uninstall is invoked via `node uninstall.js` / documented in README (the `bin` maps `ai-toolkit` → install).
- **Not** building a monorepo — package lives at repo root.

## Implementation Approach

Assemble from the templates in three phases, each independently verifiable. Phase 1 produces a packable skeleton with placeholder content (provable via `npm pack --dry-run`). Phase 2 makes the installer/uninstaller real and round-trip-clean against a throwaway consumer dir, adding the `new-session-prompt.md` placement and the single-source version read. Phase 3 wires CI: generic skill validation, then `semantic-release` publishing on merge with a packaged-files git-diff guard. Skill auto-discovery is honored everywhere — no skill name is hardcoded in installer or CI.

## Critical Implementation Details

- **Version single-source**: `install.js` must resolve its own bundled `package.json` (it ships in `files[]`) and read `version` at runtime instead of a hardcoded `PACKAGE_VERSION`. The manifest's `version` field comes from there. This is the one deliberate deviation from the template.
- **Skill auto-discovery invariant**: a skill installs to `.claude/skills/<dirname>/`, and Claude Code resolves it by the frontmatter `name`. CI must enforce `frontmatter.name === <dirname>` for every `skills/*` — otherwise a mismatched skill silently misinstalls. The installer copies by directory name regardless, so the guard belongs in CI.
- **semantic-release + git-diff guard ordering**: the packaged-files-changed check must run **before** `semantic-release` decides to publish, so a commit that changes nothing in `files[]` produces no release even if its conventional-commit type would imply one (research.md §C, lesson :196-212). GitHub Packages rejects duplicate versions with a 409 — the guard plus semantic-release's own version computation make duplicates impossible.

## Phase 1: Package Skeleton & Placeholder Content

### Overview

Create the repo-root package files and placeholder bundled content so the package is well-formed and packable.

### Changes Required:

#### 1. Package manifest

**File**: `package.json`

**Intent**: Define the public, scoped package that publishes to GitHub Packages and installs itself via `postinstall`. Derived from `m5l4-github-packages-package.json.template` with public-package and `@rafalpuczel` adaptations.

**Contract**: `name: "@rafalpuczel/chisel-ai-toolkit"`, `version: "0.0.0"` (semantic-release manages real versions), `license: "MIT"`, `publishConfig.registry: "https://npm.pkg.github.com"`, `files: ["skills/","rules/","install.js","uninstall.js","README.md"]`, `scripts.postinstall: "node install.js"`, `bin: { "ai-toolkit": "./install.js" }`, `engines.node: ">=20"`, `type: "commonjs"`. Add `repository` field pointing at the GitHub repo (semantic-release needs it).

#### 2. Consumer registry mapping

**File**: `.npmrc`

**Intent**: Map the `@rafalpuczel` scope to GitHub Packages so this repo (and the documented consumer setup) resolves the scope from the right registry. Committed, **no token** line.

**Contract**: single line `@rafalpuczel:registry=https://npm.pkg.github.com` (from `consumer.npmrc.template:1`, scope changed).

#### 3. Placeholder skills (auto-discovered)

**File**: `skills/chisel-plan/SKILL.md`, `skills/chisel-create-block/SKILL.md`, `skills/chisel-setup/SKILL.md`

**Intent**: Provide three valid placeholder skills so the package bundles real, discoverable artifacts; replaced wholesale when the user supplies content. Directory names are the skill identity.

**Contract**: each file has YAML frontmatter with `name: <dirname>` (matching its directory exactly) and a one-line `description`, plus a short stub body noting it's a placeholder. Frontmatter must be valid for CI to pass (see Phase 3). No nested asset files.

#### 4. Placeholder ruleset + session prompt

**File**: `rules/CLAUDE.md`, `rules/new-session-prompt.md`

**Intent**: Ship the two rules-folder artifacts as minimal stubs so the installer's CLAUDE.md splice and session-prompt copy are exercised; replaced when the user supplies real content.

**Contract**: `rules/CLAUDE.md` — a few lines identifying the toolkit and a TODO that real rules land here (content only; the sentinel markers are added by the installer at splice time, not stored in this file). `rules/new-session-prompt.md` — a short stub primer.

#### 5. README

**File**: `README.md`

**Intent**: Document install (consumer `.npmrc` + `npm install`), what gets installed and where (`.claude/skills/`, root `CLAUDE.md` block, `.claude/new-session-prompt.md`), manual (re)install via `npx`, and uninstall via `node uninstall.js`.

**Contract**: prose; must state the package is **public** (no auth/token needed to install) and show the one-line `.npmrc`. Names the install destinations precisely.

#### 6. Narrow .gitignore

**File**: `.gitignore`

**Intent**: The current `.gitignore` is exactly `.claude`, which also ignores nothing the package ships (package content is at repo root), but it does exclude this repo's own `.claude/` tooling from version control. Add `node_modules` (needed once semantic-release deps are installed) and keep `.claude` ignored unless the user wants it tracked.

**Contract**: ensure `node_modules/` is ignored; leave `.claude` handling as-is (out of scope to change tooling tracking). One-line addition.

### Success Criteria:

#### Automated Verification:

- `npm pack --dry-run` succeeds and lists exactly: `skills/**`, `rules/**`, `install.js` (added Phase 2), `uninstall.js` (Phase 2), `README.md`, `package.json`.
- `node -e "JSON.parse(require('fs').readFileSync('package.json'))"` parses (valid JSON).
- Every `skills/*/SKILL.md` has frontmatter whose `name` equals its directory name (spot-checked via `node`/grep).

#### Manual Verification:

- README accurately describes the public install flow and the three install destinations.
- Placeholder content is obviously placeholder and replaceable without touching installer logic.

**Implementation Note**: After completing this phase and all automated verification passes, pause for manual confirmation before proceeding.

---

## Phase 2: Installer & Uninstaller

### Overview

Adapt the template installer/uninstaller for `@rafalpuczel`, single-source versioning, and the new `new-session-prompt.md` install destination; ensure idempotent install and clean uninstall.

### Changes Required:

#### 1. Installer

**File**: `install.js`

**Intent**: Copy bundled skills into the consumer `.claude/skills/`, splice the ruleset into the consumer root `CLAUDE.md` between sentinel markers, place the session prompt as a standalone file, and write a manifest — all idempotently and without ever failing `npm install`. Derived from `install.js.template` with three changes.

**Contract**:
- `PACKAGE_NAME = "@rafalpuczel/chisel-ai-toolkit"`; sentinel markers become `<!-- BEGIN @rafalpuczel/chisel-ai-toolkit -->` / `<!-- END ... -->`.
- **Remove** the hardcoded `PACKAGE_VERSION` constant; read `version` from the bundled `package.json` at runtime (resolve `path.join(__dirname, "package.json")`). Used for the manifest.
- **Add** a `installSessionPrompt(projectRoot, installedFiles)` step: copy `rules/new-session-prompt.md` → `<projectRoot>/.claude/new-session-prompt.md`, push the relative path into `installedFiles` so the manifest tracks it.
- Preserve existing behavior: `findProjectRoot()` (`template:12-21`), `copyDir`/`installSkills` glob of `skills/*` (`:37-50`, **keeps auto-discovery**), `applyRulesBlock` sentinel splice (`:52-73`), manifest write (`:75-91`), and the top-level try/catch that only `console.warn`s (`:104-108`).

#### 2. Uninstaller

**File**: `uninstall.js`

**Intent**: Reverse every install action using the manifest: remove copied skill dirs and the session-prompt file, strip the sentinel block from the consumer `CLAUDE.md`, and delete the manifest. Derived from `uninstall.js.template` with scope + session-prompt handling.

**Contract**:
- `PACKAGE_NAME` + sentinel markers updated to `@rafalpuczel/chisel-ai-toolkit`.
- Manifest-driven removal loop (`template:26-31`) already deletes tracked files (skills + the new `.claude/new-session-prompt.md`) since they're in `installedFiles`; confirm the session-prompt path is removed by this loop and is **not** skipped like `CLAUDE.md` is.
- `removeRulesBlock` strips the sentinel block from `CLAUDE.md` (`:11-16, 32-36`); manifest deleted last (`:37`).

### Success Criteria:

#### Automated Verification:

- Round-trip script against a throwaway dir: set `PROJECT_ROOT=<tmp>`, run `node install.js`, assert `<tmp>/.claude/skills/chisel-plan/SKILL.md`, `<tmp>/.claude/new-session-prompt.md`, the `<!-- BEGIN @rafalpuczel/chisel-ai-toolkit -->` block in `<tmp>/CLAUDE.md`, and `<tmp>/.claude/.ai-toolkit-manifest.json` all exist; manifest `version` equals `package.json` version.
- Idempotency: running `node install.js` twice produces no duplicate sentinel blocks and no duplicate skill copies (diff the second run's result against the first).
- Uninstall: `node uninstall.js` removes all skill dirs, the session-prompt file, the sentinel block, and the manifest — leaving `<tmp>/CLAUDE.md` free of the managed block and no `.ai-toolkit-manifest.json`.
- `node --check install.js` and `node --check uninstall.js` pass (syntax).

#### Manual Verification:

- Install into a consumer that **already has** a `CLAUDE.md` with prior content: the managed block is appended/updated without clobbering existing content; uninstall leaves the prior content intact.
- A second skill added to `skills/` (e.g. a throwaway `chisel-test/SKILL.md`) is auto-installed without any installer edit.

**Implementation Note**: After completing this phase and all automated verification passes, pause for manual confirmation before proceeding.

---

## Phase 3: CI/CD Publish Workflow (semantic-release)

### Overview

Add the GitHub Actions workflow that validates the package on every PR/push and publishes a semantic-release-computed version to GitHub Packages on merge to `master`, guarded so only real packaged-file changes produce a release.

### Changes Required:

#### 1. semantic-release configuration

**File**: `package.json` (devDependencies + config) or `.releaserc.json`

**Intent**: Configure semantic-release to compute the version from conventional commits and publish to GitHub Packages, with the git-diff guard ensuring packaged files actually changed.

**Contract**: add `semantic-release` and required plugins (`@semantic-release/commit-analyzer`, `@semantic-release/release-notes-generator`, `@semantic-release/npm` configured for the GitHub Packages registry, `@semantic-release/github`) to `devDependencies`; configure the npm plugin to publish (not just version) against `https://npm.pkg.github.com`. Branch: `master`. The packaged-files git-diff guard runs as a workflow step gating the release job (see change 2), not as a plugin.

#### 2. Publish workflow

**File**: `.github/workflows/publish-ai-toolkit.yml`

**Intent**: Validate on PR + push; on push to `master`, run the git-diff guard then semantic-release to publish. Derived from `publish-ai-toolkit.yml.template` with generic skill validation and a semantic-release publish job.

**Contract**:
- Triggers: `push` and `pull_request` on `[main, master]` (`template:3-7`).
- `permissions: contents: write` (semantic-release needs to push tags/release notes) `+ packages: write` (`template:9-11`; note: `contents` upgraded from `read` to `write` for semantic-release tagging).
- **Validate job** (replaces `test -f skills/code-review/SKILL.md` at `template:26`): a generic step that loops every `skills/*/SKILL.md`, fails if zero exist, and for each asserts (a) the file exists, (b) it has YAML frontmatter containing `name` and `description`, (c) frontmatter `name` equals the directory name. Then `npm pack --dry-run` (`template:27`). Implemented as a small Node script step (no extra deps) given the frontmatter parse.
- **Git-diff guard step** (publish job, before release): compare the latest release tag to `HEAD` over the `files[]` globs (`skills/ rules/ install.js uninstall.js README.md package.json`); if nothing changed, skip the release. (Note: semantic-release also won't release without a relevant commit; this guard is the belt-and-suspenders the lesson recommends, research.md §C.)
- **Publish job**: `needs: validate`, `if: github.event_name == 'push'` (`template:31`); checkout with full history (`fetch-depth: 0`, required by semantic-release), `setup-node` with `registry-url: https://npm.pkg.github.com` + `scope: "@rafalpuczel"` (`template:36-40`), `npm ci`, run `npx semantic-release` with `env: { GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}, NODE_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }} }`.

### Success Criteria:

#### Automated Verification:

- `npx --yes yaml-lint .github/workflows/publish-ai-toolkit.yml` (or `node -e` YAML parse) — workflow is valid YAML.
- The validate-job Node script, run locally over `skills/*`, exits 0 for the three valid placeholders and exits non-zero when a deliberately-broken skill (frontmatter `name` ≠ dir) is added.
- `npx semantic-release --dry-run` (with appropriate env locally or in a CI dry-run) reports the next version without error and without attempting a real publish.

#### Manual Verification:

- A test merge to `master` with a `feat:`/`fix:` commit that changes a packaged file publishes a new version that appears under the repo's **Packages** tab.
- A merge whose changes touch only non-packaged files (e.g. `context/**`) produces **no** release (git-diff guard / semantic-release no-op).
- The published package is **public** in GitHub package settings (verify/flip after first publish).
- A re-run on an unchanged tree does not error with a 409 duplicate-version.

**Implementation Note**: After completing this phase and all automated verification passes, pause for final manual confirmation.

---

## Testing Strategy

### Unit Tests:

- No unit-test framework is introduced (out of scope for a minimal v1). Verification is via the install/uninstall round-trip scripts and the CI validation script described in the phase Success Criteria.

### Integration Tests:

- Install→idempotent-reinstall→uninstall round-trip against a throwaway `PROJECT_ROOT` directory (Phase 2).
- `npm pack --dry-run` file-manifest check (Phase 1).
- `semantic-release --dry-run` version computation (Phase 3).

### Manual Testing Steps:

1. In a scratch consumer repo, add `.npmrc` with the scope line, `npm install @rafalpuczel/chisel-ai-toolkit` (after first publish), confirm skills appear in `.claude/skills/`, the CLAUDE.md block exists, and `.claude/new-session-prompt.md` is present.
2. Run the package's `node uninstall.js` in that consumer; confirm clean removal.
3. Merge a `feat:` commit touching a packaged file; confirm a new version in the Packages tab.
4. Merge a commit touching only `context/**`; confirm no new release.

## Performance Considerations

None — file-copy installer over a handful of small markdown/JS files; no runtime hot paths.

## Migration Notes

First-ever publish: confirm the GitHub Package visibility is **public** (first publish under a public repo is typically public, but verify in package settings, research.md §Architecture Insights). semantic-release starts versioning from the commit history; ensure conventional-commit messages from this point so the first computed version is sensible.

## References

- Related research: `context/changes/chisel-ai-toolkit/research.md`
- Templates: `.claude/config-templates/m5l4-github-packages-*` (package.json:1-26, install.js:1-109, uninstall.js:1-42, consumer.npmrc:1, publish-ai-toolkit.yml:1-47)
- Specs: `.claude/prompts/m5l4-github-packages-spec-pack.md`, `.claude/prompts/m5l4-github-packages-spec-cicd.md`
- M5L4 lesson (Model 1, versioning, public/private): `H:\localhost\apps\10xdev\course\M5\L4\shared-ai-registry-skille-komendy-i-reguly-dla-zespolu.md:105-212`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Package Skeleton & Placeholder Content

#### Automated

- [x] 1.1 `npm pack --dry-run` succeeds and lists exactly the intended files — 8903dce
- [x] 1.2 `package.json` parses as valid JSON — 8903dce
- [x] 1.3 Every `skills/*/SKILL.md` frontmatter `name` equals its directory name — 8903dce

#### Manual

- [x] 1.4 README accurately describes the public install flow and three install destinations — 8903dce
- [x] 1.5 Placeholder content is obviously placeholder and replaceable without installer changes — 8903dce

### Phase 2: Installer & Uninstaller

#### Automated

- [x] 2.1 Install round-trip creates skills, session prompt, CLAUDE.md block, and manifest (version matches package.json) — a59d978
- [x] 2.2 Idempotent reinstall produces no duplicate blocks or skill copies — a59d978
- [x] 2.3 Uninstall removes skills, session prompt, sentinel block, and manifest — a59d978
- [x] 2.4 `node --check` passes for install.js and uninstall.js — a59d978

#### Manual

- [x] 2.5 Install into a consumer with existing CLAUDE.md preserves prior content; uninstall leaves it intact — a59d978
- [x] 2.6 A newly added skill dir is auto-installed with no installer edit — a59d978

### Phase 3: CI/CD Publish Workflow (semantic-release)

#### Automated

- [x] 3.1 Workflow file is valid YAML — dae9220
- [x] 3.2 Validate-job script passes the 3 placeholders and fails a deliberately-broken skill — dae9220
- [x] 3.3 `semantic-release --dry-run` computes a version without error or real publish — dae9220

#### Manual

- [x] 3.4 Test merge with a packaged-file change publishes a version visible in the Packages tab — verified: v1.0.0 published, installs cleanly, listed via GitHub API
- [x] 3.5 Merge touching only non-packaged files produces no release — verified by user
- [x] 3.6 Published package is public in GitHub package settings — verified: API reports visibility=public
- [x] 3.7 Re-run on unchanged tree does not 409 — verified by user
