#!/usr/bin/env node

import { resolve, relative, sep, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'fs-extra';
import chalk from 'chalk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = resolve(__dirname, '..');
const SOURCE_DIR = resolve(PROJECT_ROOT, '../nextblock');
const TARGET_DIR = resolve(PROJECT_ROOT, 'templates/nextblock-template');
const REPO_ROOT = resolve(PROJECT_ROOT, '..', '..');
const ROOT_PACKAGE_JSON = resolve(REPO_ROOT, 'package.json');
const UI_GLOBALS_SOURCE = resolve(
  PROJECT_ROOT,
  '../../libs/ui/src/styles/globals.css',
);
const UI_PROXY_MODULES = [
  'avatar',
  'badge',
  'button',
  'card',
  'checkbox',
  'ColorPicker',
  'ConfirmationDialog',
  'CustomSelectWithInput',
  'dialog',
  'dropdown-menu',
  'input',
  'label',
  'popover',
  'progress',
  'select',
  'separator',
  'Skeleton',
  'table',
  'textarea',
  'tooltip',
  'ui',
];

const IGNORED_SEGMENTS = new Set([
  'node_modules',
  '.git',
  '.next',
  'dist',
  'tmp',
  'coverage',
  'backup',
  'backups',
]);

async function ensureTemplateSync() {
  const sourceExists = await fs.pathExists(SOURCE_DIR);
  if (!sourceExists) {
    throw new Error(
      `Source project not found at ${SOURCE_DIR}. Please ensure apps/nextblock exists before syncing.`,
    );
  }

  console.log(
    chalk.blue(
      `Syncing template from ${chalk.bold(relative(PROJECT_ROOT, SOURCE_DIR))} to ${chalk.bold(
        relative(PROJECT_ROOT, TARGET_DIR),
      )}`,
    ),
  );

  await fs.ensureDir(TARGET_DIR);
  await emptyDirWithRetry(TARGET_DIR);

  await fs.copy(SOURCE_DIR, TARGET_DIR, {
    dereference: true,
    filter: (src) => {
      const rel = relative(SOURCE_DIR, src);
      if (!rel) {
        return true;
      }

      const segments = rel.split(sep);
      return segments.every((segment) => !IGNORED_SEGMENTS.has(segment));
    },
  });

  await ensureEnvExample();
  await ensureTemplateGitignore();
  await ensureGlobalStyles();
  await ensureClientTranslations();
  await sanitizeBlockEditorImports();
  await sanitizeUiImports();
  await ensureUiProxies();
  await removeBackups();
  await ensureUiProxies();
  await removeBackups();
  await syncPackageVersions();
  await removeTemplateProjectJson();

  console.log(chalk.green('Template sync complete.'));
}

async function ensureEnvExample() {
  const envTargets = [
    resolve(REPO_ROOT, '.env.example'),
    resolve(REPO_ROOT, '.env.exemple'),
    resolve(SOURCE_DIR, '.env.example'),
    resolve(SOURCE_DIR, '.env.exemple'),
  ];

  const destination = resolve(TARGET_DIR, '.env.example');

  for (const envPath of envTargets) {
    if (await fs.pathExists(envPath)) {
      await fs.copy(envPath, destination);
      return;
    }
  }

  const placeholder = `# Environment variables for NextBlock CMS
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_JWT_SECRET=
NEXT_PUBLIC_URL=http://localhost:3000
`;

  await fs.writeFile(destination, placeholder);
}

async function ensureTemplateGitignore() {
  const destination = resolve(TARGET_DIR, 'gitignore'); // Rename to gitignore
  const content = `.DS_Store
node_modules
dist
.next
out
build
coverage
*.log
logs
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*

.env
.env.*
.env.local
.env.development.local
.env.production.local
.env.test.local

.vscode
.idea
.swp
*.sw?

supabase/.temp
supabase/.branches
`;
  await fs.outputFile(destination, content);
}

async function ensureGlobalStyles() {
  const destination = resolve(TARGET_DIR, 'app/globals.css');

  if (await fs.pathExists(destination)) {
    await fs.remove(destination);
  }

  if (await fs.pathExists(UI_GLOBALS_SOURCE)) {
    await fs.copy(UI_GLOBALS_SOURCE, destination);
    return;
  }

  const fallback = `@tailwind base;
@tailwind components;
@tailwind utilities;
`;

  await fs.outputFile(destination, fallback);
}

async function ensureClientTranslations() {
  const providersPath = resolve(TARGET_DIR, 'app/providers.tsx');
  if (!(await fs.pathExists(providersPath))) {
    return;
  }

  let content = await fs.readFile(providersPath, 'utf8');
  const wrapperImportPath = '@nextblock-cms/utils';
  const wrapperImportStatement = `import { TranslationsProvider } from '${wrapperImportPath}';`;
  const existingImportRegex =
    /import\s+\{\s*TranslationsProvider\s*\}\s*from\s*['"]@nextblock-cms\/utils['"];?/;
  const legacyImportRegex =
    /import\s+\{\s*TranslationsProvider\s*\}\s*from\s*['"]@\/lib\/client-translations['"];?/;

  if (existingImportRegex.test(content) || legacyImportRegex.test(content)) {
    content = content
      .replace(existingImportRegex, wrapperImportStatement)
      .replace(legacyImportRegex, wrapperImportStatement);
  } else if (!content.includes(wrapperImportStatement)) {
    const lines = content.split(/\r?\n/);
    const insertIndex =
      lines.findIndex((line) => line.startsWith('import')) + 1;
    if (insertIndex > 0) {
      lines.splice(insertIndex, 0, wrapperImportStatement);
      content = lines.join('\n');
    } else {
      content = `${wrapperImportStatement}\n${content}`;
    }
  }

  await fs.writeFile(providersPath, content);

  const wrapperPath = resolve(TARGET_DIR, 'lib/client-translations.tsx');
  if (await fs.pathExists(wrapperPath)) {
    await fs.remove(wrapperPath);
  }
}

async function sanitizeBlockEditorImports() {
  const blockEditorPath = resolve(
    TARGET_DIR,
    'app/cms/blocks/components/BlockEditorArea.tsx',
  );
  if (!(await fs.pathExists(blockEditorPath))) {
    return;
  }

  const replacements = [
    { pattern: /(\.\.\/editors\/[A-Za-z0-9_-]+)\.js/g, replacement: '$1.tsx' },
    { pattern: /(\.\.\/actions)\.js/g, replacement: '$1.ts' },
  ];

  const content = await fs.readFile(blockEditorPath, 'utf8');
  let updated = content;

  for (const { pattern, replacement } of replacements) {
    updated = updated.replace(pattern, replacement);
  }

  if (updated !== content) {
    await fs.writeFile(blockEditorPath, updated);
  }
}

async function sanitizeUiImports() {
  const searchDirs = ['app', 'components', 'context', 'lib'];
  const validExtensions = new Set(['.ts', '.tsx', '.js', '.jsx']);
  const filesToProcess = [];

  for (const relativeDir of searchDirs) {
    const absoluteDir = resolve(TARGET_DIR, relativeDir);
    if (await fs.pathExists(absoluteDir)) {
      await collectFiles(absoluteDir, filesToProcess, validExtensions);
    }
  }

  for (const filePath of filesToProcess) {
    const original = await fs.readFile(filePath, 'utf8');
    const replaced = original.replace(
      /@nextblock-cms\/ui\/(?!styles\/)[A-Za-z0-9/_-]+/g,
      '@nextblock-cms/ui',
    );

    if (replaced !== original) {
      await fs.writeFile(filePath, replaced);
    }
  }
}

async function collectFiles(directory, accumulator, extensions) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      await collectFiles(fullPath, accumulator, extensions);
    } else {
      const dotIndex = entry.name.lastIndexOf('.');
      if (dotIndex !== -1) {
        const ext = entry.name.slice(dotIndex);
        if (extensions.has(ext)) {
          accumulator.push(fullPath);
        }
      }
    }
  }
}

async function ensureUiProxies() {
  const proxiesDir = resolve(TARGET_DIR, 'lib/ui');
  await fs.ensureDir(proxiesDir);

  const proxyContent = "export * from '@nextblock-cms/ui';\n";

  for (const moduleName of UI_PROXY_MODULES) {
    const proxyPath = resolve(proxiesDir, `${moduleName}.ts`);
    if (!(await fs.pathExists(proxyPath))) {
      await fs.outputFile(proxyPath, proxyContent);
    }
  }
}

async function removeBackups() {
  const targets = [
    resolve(TARGET_DIR, 'backup'),
    resolve(TARGET_DIR, 'backups'),
  ];

  await Promise.all(
    targets.map((dir) => fs.remove(dir).catch(() => undefined)),
  );
}

async function removeTemplateProjectJson() {
  const projectJsonPath = resolve(TARGET_DIR, 'project.json');
  await fs.remove(projectJsonPath).catch(() => undefined);
}

async function syncPackageVersions() {
  const targetPackageJsonPath = resolve(TARGET_DIR, 'package.json');
  const sourcePackageJsonPath = resolve(SOURCE_DIR, 'package.json');

  if (!(await fs.pathExists(targetPackageJsonPath))) return;
  if (!(await fs.pathExists(ROOT_PACKAGE_JSON))) return;
  if (!(await fs.pathExists(sourcePackageJsonPath))) return;

  const rootPkg = await fs.readJson(ROOT_PACKAGE_JSON);
  const sourcePkg = await fs.readJson(sourcePackageJsonPath);
  const targetPkg = await fs.readJson(targetPackageJsonPath);

  let modified = false;

  const getVersion = (pkgName, sourceVersion) => {
    if (rootPkg.dependencies && rootPkg.dependencies[pkgName]) {
      return rootPkg.dependencies[pkgName];
    }
    if (rootPkg.devDependencies && rootPkg.devDependencies[pkgName]) {
      return rootPkg.devDependencies[pkgName];
    }
    return sourceVersion;
  };

  const processSection = (sectionName) => {
    if (!sourcePkg[sectionName]) return;
    targetPkg[sectionName] = targetPkg[sectionName] || {};

    for (const [pkgName, sourceVersion] of Object.entries(
      sourcePkg[sectionName],
    )) {
      if (sourceVersion.startsWith('workspace:')) {
        targetPkg[sectionName][pkgName] = 'workspace:*';
        continue;
      }
      const versionToUse = getVersion(pkgName, sourceVersion);
      if (targetPkg[sectionName][pkgName] !== versionToUse) {
        targetPkg[sectionName][pkgName] = versionToUse;
        modified = true;
      }
    }
  };

  processSection('dependencies');
  processSection('devDependencies');

  const criticalDevDeps = [
    'tailwindcss',
    'postcss',
    'autoprefixer',
    'typescript',
    '@tailwindcss/postcss',
  ];

  criticalDevDeps.forEach((pkg) => {
    const ver = getVersion(pkg, null);
    if (ver) {
      targetPkg.devDependencies = targetPkg.devDependencies || {};
      if (targetPkg.devDependencies[pkg] !== ver) {
        targetPkg.devDependencies[pkg] = ver;
        modified = true;
      }
    }
  });

  if (modified) {
    console.log(
      chalk.green(
        'Synced all dependencies dynamically with root/source package.json',
      ),
    );
    if (targetPkg.dependencies) {
      targetPkg.dependencies = Object.keys(targetPkg.dependencies)
        .sort()
        .reduce((obj, key) => {
          obj[key] = targetPkg.dependencies[key];
          return obj;
        }, {});
    }
    await fs.writeJson(targetPackageJsonPath, targetPkg, { spaces: 2 });
  }
}

ensureTemplateSync().catch((error) => {
  console.error(
    chalk.red(error instanceof Error ? error.message : String(error)),
  );
  process.exit(1);
});

async function emptyDirWithRetry(dir, retries = 5, delay = 1000) {
  for (let i = 0; i < retries; i++) {
    try {
      await fs.emptyDir(dir);
      return;
    } catch (err) {
      if (i === retries - 1) throw err;
      if (err.code === 'EBUSY' || err.code === 'EPERM') {
        console.log(
          chalk.yellow(
            `Locked file encountered. Retrying in ${delay}ms... (${i + 1}/${retries})`,
          ),
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        throw err;
      }
    }
  }
}
