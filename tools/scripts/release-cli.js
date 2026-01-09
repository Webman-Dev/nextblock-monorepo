#!/usr/bin/env node

const { execSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const args = process.argv.slice(2);
const releaseType = ['major', 'minor', 'patch'].includes(args[0]) ? args[0] : 'patch';
const dryRun = args.includes('--dry-run');

const workspaceRoot = process.cwd();

// Files to bump
const packagesToBump = [
  path.join(workspaceRoot, 'package.json'), // Root
  path.join(workspaceRoot, 'apps', 'nextblock', 'package.json'), // Template Source
  path.join(workspaceRoot, 'apps', 'create-nextblock', 'package.json'), // CLI Tool
];

function run(command, options = {}) {
  console.log(`> ${command}`);
  if (!dryRun) {
    execSync(command, { stdio: 'inherit', shell: true, ...options });
  }
}

try {
  console.log(`\n🚀 Releasing create-nextblock CLI (${releaseType})`);
  if (dryRun) console.log('⚠️  DRY RUN MODE');

  // 1. Bump Versions
  console.log('\n→ Bumping versions...');
  for (const pkgPath of packagesToBump) {
    const dir = path.dirname(pkgPath);
    console.log(`  Bumping ${path.relative(workspaceRoot, pkgPath)}`);
    // Use npm version to handle semver bumping reliably
    // --no-git-tag-version to avoid creating tags/commits for each individual bump
    run(`npm version ${releaseType} --no-git-tag-version`, { cwd: dir });
  }

  // 2. Sync Template
  // This copies apps/nextblock -> apps/create-nextblock/templates/nextblock-template
  // So the template inside the CLI will have the new version from step 1.
  console.log('\n→ Syncing template...');
  run('npm run sync:create-nextblock', { cwd: workspaceRoot });

  // 3. Publish CLI
  const cliDir = path.join(workspaceRoot, 'apps', 'create-nextblock');
  console.log('\n→ Publishing create-nextblock...');
  const publishArgs = ['npm', 'publish', '--access', 'public'];
  if (dryRun) {
    publishArgs.push('--dry-run');
  }
  run(publishArgs.join(' '), { cwd: cliDir });

  console.log(`\n✅ Release complete!${dryRun ? ' (dry run)' : ''}\n`);

} catch (error) {
  console.error('\n❌ Release failed.');
  if (error instanceof Error) {
    console.error(error.message);
  }
  process.exit(1);
}
