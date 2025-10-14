#!/usr/bin/env node

const path = require('node:path');
const fs = require('fs-extra');

const TEMPLATE_SKIP_DIRECTORIES = new Set(['node_modules', '.next']);
const TEMPLATE_SKIP_FILES = new Set(['project.json', 'nx.json', 'workspace.json']);

async function main() {
  const workspaceRoot = process.cwd();
  const sourceDir = path.join(workspaceRoot, 'apps', 'nextblock');
  const targetDir = path.join(workspaceRoot, 'apps', 'create-nextblock', 'template');

  await ensureSourceExists(sourceDir);
  await syncTemplate(fs, sourceDir, targetDir);

  console.log(`Template synced from ${sourceDir} to ${targetDir}`);
}

async function ensureSourceExists(sourceDir) {
  if (!(await fs.pathExists(sourceDir))) {
    throw new Error(`Source template not found at ${sourceDir}`);
  }
}

async function syncTemplate(fsModule, sourceDir, targetDir) {
  await fsModule.ensureDir(targetDir);
  await fsModule.emptyDir(targetDir);

  await fsModule.copy(sourceDir, targetDir, {
    overwrite: true,
    errorOnExist: false,
    filter: (src) => shouldCopyTemplatePath(sourceDir, src),
  });
}

function shouldCopyTemplatePath(sourceDir, currentPath) {
  const relative = path.relative(sourceDir, currentPath);

  if (!relative || relative === '') {
    return true;
  }

  const segments = relative.split(path.sep);
  if (segments.some((segment) => TEMPLATE_SKIP_DIRECTORIES.has(segment))) {
    return false;
  }

  const basename = path.basename(currentPath);
  return !TEMPLATE_SKIP_FILES.has(basename);
}

main().catch((error) => {
  console.error('Failed to sync create-nextblock template.');
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
