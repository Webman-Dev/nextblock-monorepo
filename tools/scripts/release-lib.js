#!/usr/bin/env node

const { execSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const args = process.argv.slice(2);

if (args.length === 0) {
  console.error(
    'Usage: node tools/scripts/release-lib.js <library> [patch|minor|major] [--dry-run]',
  );
  process.exit(1);
}

const library = args[0];
const releaseType = ['major', 'minor', 'patch'].includes(args[1])
  ? args[1]
  : 'patch';
const dryRun = args.includes('--dry-run');

const workspaceRoot = process.cwd();
const libDir = path.join(workspaceRoot, 'libs', library);
const packageJsonPath = path.join(libDir, 'package.json');
const distDir = path.join(workspaceRoot, 'dist', 'libs', library);
const nxProject = library;

if (!fs.existsSync(packageJsonPath)) {
  console.error(`Library package.json not found at ${packageJsonPath}`);
  process.exit(1);
}

const originalPackageJsonRaw = fs.readFileSync(packageJsonPath, 'utf8');
const lockfilePath = path.join(libDir, 'package-lock.json');
const hadLockfile = fs.existsSync(lockfilePath);
let version;
let packageName;

function run(command, options = {}) {
  execSync(command, { stdio: 'inherit', shell: true, ...options });
}

try {
  const pkg = JSON.parse(originalPackageJsonRaw);
  packageName = pkg.name;

  console.log(`\n🚀 Releasing ${packageName} (${library})`);

  if (fs.existsSync(distDir)) {
    console.log(`→ Cleaning dist directory: ${distDir}`);
    fs.rmSync(distDir, { recursive: true, force: true });
  }

  console.log(`→ Bumping version (${releaseType})`);
  const versionCommand = `npm version ${releaseType} --no-git-tag-version`;
  run(versionCommand, { cwd: libDir });

  const updatedPackageJson = JSON.parse(
    fs.readFileSync(packageJsonPath, 'utf8'),
  );
  version = updatedPackageJson.version;
  console.log(`✓ Version bumped to ${version}`);

  console.log('\n→ Building with Nx');
  const buildCommand = `npx nx run ${nxProject}:build --skip-nx-cache --with-deps`;
  run(buildCommand, { cwd: workspaceRoot });

  if (!fs.existsSync(distDir)) {
    throw new Error(`Build output not found at ${distDir}`);
  }

  console.log('\n→ Publishing to npm');
  const publishArgs = ['npm', 'publish', '--access', 'public'];
  if (dryRun) {
    publishArgs.push('--dry-run');
  }
  run(publishArgs.join(' '), { cwd: distDir });

  console.log(
    `\n✅ Published ${packageName}@${version}${dryRun ? ' (dry run)' : ''}\n`,
  );

  if (!hadLockfile && fs.existsSync(lockfilePath)) {
    fs.rmSync(lockfilePath);
  }
} catch (error) {
  console.error('\n❌ Release failed.');
  if (version === undefined) {
    // Version bump did not succeed, nothing to revert.
  } else {
    console.log('↺ Reverting package.json to previous version.');
    fs.writeFileSync(packageJsonPath, originalPackageJsonRaw, 'utf8');
  }
  if (!hadLockfile && fs.existsSync(lockfilePath)) {
    fs.rmSync(lockfilePath, { force: true });
  }
  if (error instanceof Error) {
    console.error(error.message);
  }
  process.exit(1);
}
