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

  if (library === 'ecommerce' || library === 'ecom') {
    // -------------------------------------------------------------------------
    // TWIN PACKAGE STRATEGY: 1. Sync Stub
    // -------------------------------------------------------------------------
    console.log('\n→ [Twin Strategy] Syncing version to Ghost Module stub...');
    const stubDir = path.join(workspaceRoot, 'tools/stubs/libs/ecommerce');
    const stubPkgPath = path.join(stubDir, 'package.json');

    if (fs.existsSync(stubPkgPath)) {
      const stubPkg = JSON.parse(fs.readFileSync(stubPkgPath, 'utf8'));
      stubPkg.version = version;
      delete stubPkg.publishConfig; // Ensure no conflicting config remains
      fs.writeFileSync(stubPkgPath, JSON.stringify(stubPkg, null, 2) + '\n');
      console.log(`✓ Stub version updated to ${version}`);
    } else {
      console.error(`⚠️ Stub package.json not found at ${stubPkgPath}`);
    }

    // -------------------------------------------------------------------------
    // TWIN PACKAGE STRATEGY: 2. Publish Ghost Stub (Public)
    // -------------------------------------------------------------------------
    console.log('\n→ [Twin Strategy] Publishing Ghost Module (Public)...');

    // Create local .npmrc to FORCE public registry for this scope
    // This overrides global user config
    const stubNpmrcPath = path.join(stubDir, '.npmrc');
    const publicNpmrcContent = [
      '@nextblock-cms:registry=https://registry.npmjs.org',
      '//registry.npmjs.org/:_authToken=${npm_config_token}', // Use the token from env if available (from current session)
    ].join('\n');

    // We need to copy the user's AUTH token from their main .npmrc if we isolate config
    // Actually, asking npm to specific userconfig is safer.

    fs.writeFileSync(stubNpmrcPath, publicNpmrcContent);
    console.log(`✓ Created local .npmrc in stub to force Public registry`);

    const stubPublishArgs = [
      'npm',
      'publish',
      '--access',
      'public',
      '--userconfig', // CRITICAL: Ignore global ~/.npmrc scope mappings
      stubNpmrcPath,
    ];

    if (dryRun) {
      stubPublishArgs.push('--dry-run');
    }

    // We need to ensure the AUTH token is passed.
    // Since we are ignoring global config, we must manually read the auth token
    // or rely on the user having set NPM_TOKEN.
    // BUT the user just logged in. That token is in ~/.npmrc.
    // If we ignore ~/.npmrc, we lose the token.

    // BETTER STRATEGY:
    // Don't use --userconfig.
    // Instead, rely on the fact that project-level .npmrc SHOULD win.
    // If it didn't work before, maybe the content was malformed?
    // Let's try adding standard registry config.

    const refinedNpmrcContent = [
      'registry=https://registry.npmjs.org', // Default registry
      '@nextblock-cms:registry=https://registry.npmjs.org', // Scoped registry
      'always-auth=true',
    ].join('\n');
    fs.writeFileSync(stubNpmrcPath, refinedNpmrcContent);

    try {
      run(
        ['npm', 'publish', '--access', 'public', dryRun ? '--dry-run' : '']
          .filter(Boolean)
          .join(' '),
        { cwd: stubDir },
      ); // Revert to standard args
      console.log(
        `✅ [Public] Ghost Module published: ${packageName}@${version}`,
      );
    } finally {
      if (fs.existsSync(stubNpmrcPath)) fs.unlinkSync(stubNpmrcPath);
    }

    // -------------------------------------------------------------------------
    // TWIN PACKAGE STRATEGY: 3. Publish Real Module (Private)
    // -------------------------------------------------------------------------
    console.log('\n→ [Twin Strategy] Publishing Real Module (Private)...');

    // Create local .npmrc to FORCE GitHub registry for this scope
    const distNpmrcPath = path.join(distDir, '.npmrc');
    const privateNpmrcContent =
      '@nextblock-cms:registry=https://npm.pkg.github.com';

    fs.writeFileSync(distNpmrcPath, privateNpmrcContent);
    console.log(`✓ Created local .npmrc in dist to force GitHub registry`);

    const privatePublishArgs = ['npm', 'publish'];

    if (dryRun) {
      privatePublishArgs.push('--dry-run');
    }

    try {
      run(privatePublishArgs.join(' '), { cwd: distDir });
      console.log(
        `✅ [Private] Real Module published: ${packageName}@${version}`,
      );
    } finally {
      if (fs.existsSync(distNpmrcPath)) fs.unlinkSync(distNpmrcPath);
    }
  } else {
    // -------------------------------------------------------------------------
    // STANDARD STRATEGY (e.g. UI, Utils)
    // -------------------------------------------------------------------------
    console.log('\n→ Publishing to npm (Standard)');
    const publishArgs = ['npm', 'publish', '--access', 'public'];
    if (dryRun) {
      publishArgs.push('--dry-run');
    }
    run(publishArgs.join(' '), { cwd: distDir });
    console.log(
      `\n✅ Published ${packageName}@${version}${dryRun ? ' (dry run)' : ''}\n`,
    );
  }

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
