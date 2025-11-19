#!/usr/bin/env node

const fs = require('fs-extra');
const path = require('node:path');

async function main() {
  const repoRoot = process.cwd();
  const [sourceArg, destArg] = process.argv.slice(2);
  const sourceDir = sourceArg ? path.resolve(repoRoot, sourceArg) : path.join(repoRoot, 'libs', 'db', 'src', 'supabase');
  const destDir = destArg ? path.resolve(repoRoot, destArg) : path.join(repoRoot, 'dist', 'libs', 'db', 'supabase');
  const basePkgPath = path.join(repoRoot, 'libs', 'db', 'package.json');
  const distPkgPath = path.join(repoRoot, 'dist', 'libs', 'db', 'package.json');

  const exists = await fs.pathExists(sourceDir);
  if (!exists) {
    console.warn(`[copy-db-supabase] Source not found: ${sourceDir}`);
    return;
  }

  await fs.ensureDir(destDir);
  await fs.copy(sourceDir, destDir, { overwrite: true });
  console.log(`[copy-db-supabase] Copied supabase assets to ${destDir}`);

  if (await fs.pathExists(distPkgPath)) {
    const distPkg = await fs.readJson(distPkgPath);
    const basePkg = (await fs.pathExists(basePkgPath)) ? await fs.readJson(basePkgPath) : {};
    const merged = {
      ...distPkg,
      files: Array.from(
        new Set([
          ...(distPkg.files || []),
          ...(basePkg.files || []),
          'supabase/**',
          '*.js',
          '*.cjs.js',
          '*.es.js',
          '*.mjs',
          '*.d.ts',
        ]),
      ),
    };
    await fs.writeJson(distPkgPath, merged, { spaces: 2 });
    console.log('[copy-db-supabase] Updated dist package.json to include supabase assets.');
  } else {
    console.warn(`[copy-db-supabase] dist package.json not found at ${distPkgPath}`);
  }
}

main().catch((err) => {
  console.error('[copy-db-supabase] Failed to copy supabase assets:', err);
  process.exit(1);
});
