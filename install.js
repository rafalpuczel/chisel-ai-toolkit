#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const PACKAGE_NAME = "@rafalpuczel/chisel-ai-toolkit";
const PACKAGE_VERSION = require("./package.json").version;
const BEGIN = `<!-- BEGIN ${PACKAGE_NAME} -->`;
const END = `<!-- END ${PACKAGE_NAME} -->`;
const MANIFEST = ".ai-toolkit-manifest.json";

function findProjectRoot() {
  if (process.env.PROJECT_ROOT) return process.env.PROJECT_ROOT;

  let dir = __dirname;
  while (dir !== path.dirname(dir)) {
    if (path.basename(dir) === "node_modules") return path.dirname(dir);
    dir = path.dirname(dir);
  }
  return process.cwd();
}

function copyDir(source, target, installedFiles, root) {
  fs.mkdirSync(target, { recursive: true });
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const src = path.join(source, entry.name);
    const dst = path.join(target, entry.name);
    if (entry.isDirectory()) {
      copyDir(src, dst, installedFiles, root);
    } else {
      fs.copyFileSync(src, dst);
      installedFiles.push(path.relative(root, dst));
    }
  }
}

function installSkills(projectRoot, installedFiles, installedDirs) {
  const source = path.join(__dirname, "skills");
  if (!fs.existsSync(source)) return;

  const targetRoot = path.join(projectRoot, ".claude", "skills");
  fs.mkdirSync(targetRoot, { recursive: true });

  for (const skill of fs.readdirSync(source, { withFileTypes: true })) {
    if (!skill.isDirectory()) continue;
    const target = path.join(targetRoot, skill.name);
    fs.rmSync(target, { recursive: true, force: true });
    copyDir(path.join(source, skill.name), target, installedFiles, projectRoot);
    installedDirs.push(path.relative(projectRoot, target));
  }
}

function applyRulesBlock(existing, teamRules) {
  const block = `${BEGIN}\n${teamRules.trim()}\n${END}`;
  const start = existing.indexOf(BEGIN);
  const end = existing.indexOf(END);

  if (start !== -1 && end !== -1 && end > start) {
    return existing.slice(0, start) + block + existing.slice(end + END.length);
  }

  return existing.trimEnd() + "\n\n" + block + "\n";
}

function installRules(projectRoot, installedFiles) {
  const rulesFile = path.join(__dirname, "rules", "CLAUDE.md");
  if (!fs.existsSync(rulesFile)) return;

  const target = path.join(projectRoot, "CLAUDE.md");
  const existing = fs.existsSync(target) ? fs.readFileSync(target, "utf8") : "";
  const teamRules = fs.readFileSync(rulesFile, "utf8");
  fs.writeFileSync(target, applyRulesBlock(existing, teamRules));
  installedFiles.push("CLAUDE.md");
}

function installSessionPrompt(projectRoot, installedFiles) {
  const source = path.join(__dirname, "rules", "new-session-prompt.md");
  if (!fs.existsSync(source)) return;

  const targetDir = path.join(projectRoot, ".claude");
  fs.mkdirSync(targetDir, { recursive: true });
  const target = path.join(targetDir, "new-session-prompt.md");
  fs.copyFileSync(source, target);
  installedFiles.push(path.relative(projectRoot, target));
}

function writeManifest(projectRoot, installedFiles, installedDirs) {
  const manifestDir = path.join(projectRoot, ".claude");
  fs.mkdirSync(manifestDir, { recursive: true });
  fs.writeFileSync(
    path.join(manifestDir, MANIFEST),
    JSON.stringify(
      {
        package: PACKAGE_NAME,
        version: PACKAGE_VERSION,
        installedAt: new Date().toISOString(),
        files: installedFiles,
        directories: installedDirs,
      },
      null,
      2,
    ) + "\n",
  );
}

function main() {
  const projectRoot = findProjectRoot();
  const installedFiles = [];
  const installedDirs = [];

  installSkills(projectRoot, installedFiles, installedDirs);
  installRules(projectRoot, installedFiles);
  installSessionPrompt(projectRoot, installedFiles);
  writeManifest(projectRoot, installedFiles, installedDirs);

  console.log(`${PACKAGE_NAME}: installed ${installedFiles.length} file(s)`);
}

try {
  main();
} catch (error) {
  console.warn(`${PACKAGE_NAME}: postinstall warning: ${error.message}`);
}
