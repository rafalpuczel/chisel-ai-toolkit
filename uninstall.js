#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const PACKAGE_NAME = "@rafalpuczel/chisel-ai-toolkit";
const BEGIN = `<!-- BEGIN ${PACKAGE_NAME} -->`;
const END = `<!-- END ${PACKAGE_NAME} -->`;
const MANIFEST = ".ai-toolkit-manifest.json";

function removeRulesBlock(content) {
  const start = content.indexOf(BEGIN);
  const end = content.indexOf(END);
  if (start === -1 || end === -1 || end < start) return content;
  return (content.slice(0, start) + content.slice(end + END.length)).replace(/\n{3,}/g, "\n\n");
}

function removeIfEmptyDir(dir) {
  try {
    if (fs.existsSync(dir) && fs.readdirSync(dir).length === 0) {
      fs.rmdirSync(dir);
    }
  } catch {
    // best-effort cleanup; ignore
  }
}

function main() {
  const projectRoot = process.env.PROJECT_ROOT || process.cwd();
  const manifestPath = path.join(projectRoot, ".claude", MANIFEST);
  if (!fs.existsSync(manifestPath)) {
    console.log(`${PACKAGE_NAME}: no manifest found, nothing to uninstall`);
    return;
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  for (const relPath of manifest.files || []) {
    if (relPath === "CLAUDE.md") continue;
    fs.rmSync(path.join(projectRoot, relPath), { recursive: true, force: true });
  }
  for (const relDir of manifest.directories || []) {
    fs.rmSync(path.join(projectRoot, relDir), { recursive: true, force: true });
  }

  const rulesPath = path.join(projectRoot, "CLAUDE.md");
  if (fs.existsSync(rulesPath)) {
    const stripped = removeRulesBlock(fs.readFileSync(rulesPath, "utf8"));
    if (stripped.trim() === "") {
      // CLAUDE.md held only our managed block — remove the now-empty file.
      fs.rmSync(rulesPath, { force: true });
    } else {
      fs.writeFileSync(rulesPath, stripped);
    }
  }

  fs.rmSync(manifestPath, { force: true });

  // Remove now-empty directories we may have created (never touches non-empty ones).
  removeIfEmptyDir(path.join(projectRoot, ".claude", "skills"));
  removeIfEmptyDir(path.join(projectRoot, ".claude"));

  console.log(`${PACKAGE_NAME}: uninstalled managed files`);
}

main();
