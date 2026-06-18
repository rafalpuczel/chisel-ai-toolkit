#!/usr/bin/env node

// Validates every bundled skill under skills/*:
//   - a SKILL.md exists,
//   - it has YAML frontmatter containing `name` and `description`,
//   - the frontmatter `name` equals the skill's directory name.
// Requires at least one skill. Exits non-zero (listing every problem) on failure.

const fs = require("node:fs");
const path = require("node:path");

const SKILLS_DIR = path.join(__dirname, "..", "skills");

function frontmatter(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return null;
  const fields = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (kv) fields[kv[1]] = kv[2].trim();
  }
  return fields;
}

function main() {
  const errors = [];

  if (!fs.existsSync(SKILLS_DIR)) {
    console.error("validate-skills: skills/ directory not found");
    process.exit(1);
  }

  const dirs = fs
    .readdirSync(SKILLS_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name);

  if (dirs.length === 0) {
    console.error("validate-skills: no skills found under skills/");
    process.exit(1);
  }

  for (const dir of dirs) {
    const file = path.join(SKILLS_DIR, dir, "SKILL.md");
    if (!fs.existsSync(file)) {
      errors.push(`${dir}: missing SKILL.md`);
      continue;
    }
    const fm = frontmatter(fs.readFileSync(file, "utf8"));
    if (!fm) {
      errors.push(`${dir}: SKILL.md has no YAML frontmatter`);
      continue;
    }
    if (!fm.name) errors.push(`${dir}: frontmatter missing "name"`);
    else if (fm.name !== dir)
      errors.push(`${dir}: frontmatter name "${fm.name}" !== directory "${dir}"`);
    if (!fm.description) errors.push(`${dir}: frontmatter missing "description"`);
  }

  if (errors.length) {
    console.error("validate-skills: FAILED");
    for (const e of errors) console.error("  - " + e);
    process.exit(1);
  }

  console.log(`validate-skills: OK (${dirs.length} skill(s): ${dirs.join(", ")})`);
}

main();
