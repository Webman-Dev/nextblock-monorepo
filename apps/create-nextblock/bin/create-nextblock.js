#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { dirname, resolve, relative, sep, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { program } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import fs from 'fs-extra';

const DEFAULT_PROJECT_NAME = 'nextblock-cms';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const TEMPLATE_DIR = resolve(__dirname, '../templates/nextblock-template');
const REPO_ROOT = resolve(__dirname, '../../..');
const EDITOR_UTILS_SOURCE_DIR = resolve(REPO_ROOT, 'libs/editor/src/lib/utils');
const IS_WINDOWS = process.platform === 'win32';

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

const PACKAGE_VERSION_SOURCES = {
  '@nextblock-cms/ui': resolve(REPO_ROOT, 'libs/ui/package.json'),
  '@nextblock-cms/utils': resolve(REPO_ROOT, 'libs/utils/package.json'),
  '@nextblock-cms/db': resolve(REPO_ROOT, 'libs/db/package.json'),
  '@nextblock-cms/editor': resolve(REPO_ROOT, 'libs/editor/package.json'),
  '@nextblock-cms/sdk': resolve(REPO_ROOT, 'libs/sdk/package.json'),
};

program
  .name('create-nextblock')
  .description('Bootstrap a NextBlock CMS project')
  .argument('[project-directory]', 'The name of the project directory to create')
  .option('--skip-install', 'Skip installing dependencies')
  .option('-y, --yes', 'Skip all interactive prompts and use defaults')
  .action(handleCommand);

await program.parseAsync(process.argv).catch((error) => {
  console.error(chalk.red(error instanceof Error ? error.message : String(error)));
  process.exit(1);
});

async function handleCommand(projectDirectory, options) {
  const { skipInstall, yes } = options;

  try {
    let projectName = projectDirectory;

    if (!projectName) {
      if (yes) {
        projectName = DEFAULT_PROJECT_NAME;
        console.log(chalk.blue(`Using default project name because --yes was provided: ${projectName}`));
      } else {
        const answers = await inquirer.prompt([
          {
            type: 'input',
            name: 'projectName',
            message: 'What is your project named?',
            default: DEFAULT_PROJECT_NAME,
          },
        ]);

        projectName = answers.projectName?.trim() || DEFAULT_PROJECT_NAME;
      }
    }

    const projectDir = resolve(process.cwd(), projectName);
    await ensureEmptyDirectory(projectDir);

    console.log(chalk.green(`Project name: ${projectName}`));
    console.log(
      chalk.blue(
        `Options: skipInstall=${skipInstall ? 'true' : 'false'}, yes=${yes ? 'true' : 'false'}`,
      ),
    );

    console.log(chalk.blue('Copying project files...'));
    await copyTemplateTo(projectDir);
    console.log(chalk.green('Template copied successfully.'));

    await removeBackups(projectDir);

    await ensureClientComponents(projectDir);
    console.log(chalk.green('Client component directives applied.'));

    await ensureClientProviders(projectDir);
    console.log(chalk.green('Client provider wrappers configured.'));

    await sanitizeBlockEditorImports(projectDir);
    console.log(chalk.green('Block editor imports sanitized.'));

    await sanitizeUiImports(projectDir);
    console.log(chalk.green('UI component imports normalized.'));

    await ensureUiProxies(projectDir);
    console.log(chalk.green('UI proxy modules generated.'));

    const editorUtilNames = await ensureEditorUtils(projectDir);
    if (editorUtilNames.length > 0) {
      console.log(chalk.green('Editor utility shims generated.'));
    }

    await ensureGitignore(projectDir);
    console.log(chalk.green('.gitignore ready.'));

    await ensureEnvExample(projectDir);
    console.log(chalk.green('.env.example ready.'));

    await sanitizeLayout(projectDir);
    console.log(chalk.green('Global styles configured.'));

    await sanitizeTailwindConfig(projectDir);
    console.log(chalk.green('tailwind.config.js sanitized.'));

    await normalizeTsconfig(projectDir);
    console.log(chalk.green('tsconfig.json normalized.'));

    await sanitizeNextConfig(projectDir, editorUtilNames);
    console.log(chalk.green('next.config.js sanitized.'));

    await transformPackageJson(projectDir);
    console.log(chalk.green('Dependencies updated for public packages.'));

    if (!skipInstall) {
      await installDependencies(projectDir);
    } else {
      console.log(chalk.yellow('Skipping dependency installation.'));
    }

    await initializeGit(projectDir);
    console.log(chalk.green('Initialized a new Git repository.'));

    console.log(
      chalk.green(
        `\nSuccess! Your NextBlock CMS project "${projectName}" is ready.\n\n` +
          'Next steps:\n' +
          `1. \`cd ${projectName}\`\n` +
          '2. Copy your existing `.env` file or rename `.env.example` to `.env` and fill in your credentials.\n' +
          '3. `npm run dev` to start the development server.\n\n' +
          'Happy building!',
      ),
    );
  } catch (error) {
    console.error(
      chalk.red(error instanceof Error ? error.message : 'An unexpected error occurred'),
    );
    process.exit(1);
  }
}

async function ensureEmptyDirectory(projectDir) {
  const exists = await fs.pathExists(projectDir);
  if (!exists) {
    return;
  }

  const contents = await fs.readdir(projectDir);
  if (contents.length > 0) {
    throw new Error(`Directory "${projectDir}" already exists and is not empty.`);
  }
}

async function copyTemplateTo(projectDir) {
  const templateExists = await fs.pathExists(TEMPLATE_DIR);
  if (!templateExists) {
    throw new Error(
      `Template directory not found at ${TEMPLATE_DIR}. Run "npm run sync:create-nextblock" to populate it.`,
    );
  }

  await fs.ensureDir(projectDir);

  await fs.copy(TEMPLATE_DIR, projectDir, {
    dereference: true,
    filter: (src) => {
      const relativePath = relative(TEMPLATE_DIR, src);
      if (!relativePath) {
        return true;
      }

      const segments = relativePath.split(sep);
      return !segments.includes('.git') && !segments.includes('node_modules');
    },
  });
}

async function removeBackups(projectDir) {
  const backupDir = resolve(projectDir, 'backup');
  if (await fs.pathExists(backupDir)) {
    await fs.remove(backupDir);
  }
}

async function ensureGitignore(projectDir) {
  const gitignorePath = resolve(projectDir, '.gitignore');
  const npmIgnorePath = resolve(projectDir, '.npmignore');
  const repoGitignorePath = resolve(REPO_ROOT, '.gitignore');

  const defaultLines = [
    '# Dependencies',
    'node_modules',
    '',
    '# Next.js build output',
    '.next',
    'out',
    '',
    '# Production',
    'build',
    'dist',
    '',
    '# Logs',
    'logs',
    '*.log',
    'npm-debug.log*',
    'yarn-debug.log*',
    'yarn-error.log*',
    'pnpm-debug.log*',
    '',
    '# Environment',
    '.env.local',
    '.env.development.local',
    '.env.test.local',
    '.env.production.local',
    '',
    '# Backups',
    'backup/',
    '',
    '# Misc',
    '.DS_Store',
  ];

  let repoLines = [];
  if (await fs.pathExists(repoGitignorePath)) {
    const raw = await fs.readFile(repoGitignorePath, 'utf8');
    repoLines = raw
      .replace(/\r\n/g, '\n')
      .split('\n')
      .map((line) => line.replace(/\s+$/, '').replace(/apps\/nextblock\//g, ''))
      .map((line) => (line.trim() === '' ? '' : line));
  }

  let content = '';

  if (await fs.pathExists(gitignorePath)) {
    content = await fs.readFile(gitignorePath, 'utf8');
  } else if (await fs.pathExists(npmIgnorePath)) {
    await fs.move(npmIgnorePath, gitignorePath, { overwrite: true });
    content = await fs.readFile(gitignorePath, 'utf8');
  } else {
    content = defaultLines.join('\n') + '\n';
  }

  const lines =
    content === ''
      ? []
      : content
          .replace(/\r\n/g, '\n')
          .split('\n')
          .map((line) => line.replace(/\s+$/, ''));

  const existing = new Set(lines);
  let updated = false;

  const mergeLine = (line) => {
    if (line === undefined || line === null) {
      return;
    }
    if (line === '') {
      if (lines.length === 0 || lines[lines.length - 1] === '') {
        return;
      }
      lines.push('');
      updated = true;
      return;
    }
    if (!existing.has(line)) {
      lines.push(line);
      existing.add(line);
      updated = true;
    }
  };

  for (const line of repoLines) {
    mergeLine(line);
  }

  mergeLine('');

  for (const line of defaultLines) {
    mergeLine(line);
  }

  const normalized = [];
  for (const line of lines) {
    if (line === '') {
      if (normalized.length === 0 || normalized[normalized.length - 1] === '') {
        continue;
      }
      normalized.push('');
    } else {
      normalized.push(line);
    }
  }

  if (normalized.length === 0 || normalized[normalized.length - 1] !== '') {
    normalized.push('');
  }

  const nextContent = normalized.join('\n');

  if (updated || content !== nextContent) {
    await fs.writeFile(gitignorePath, nextContent);
  }
}

async function ensureEnvExample(projectDir) {
  const destination = resolve(projectDir, '.env.example');
  if (await fs.pathExists(destination)) {
    return;
  }

  const templatePaths = [
    resolve(TEMPLATE_DIR, '.env.example'),
    resolve(REPO_ROOT, '.env.example'),
    resolve(REPO_ROOT, '.env.exemple'),
  ];

  for (const candidate of templatePaths) {
    if (await fs.pathExists(candidate)) {
      await fs.copy(candidate, destination);
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

async function ensureClientComponents(projectDir) {
  const relativePaths = [
    'components/env-var-warning.tsx',
    'app/providers.tsx',
    'app/ToasterProvider.tsx',
    'context/AuthContext.tsx',
    'context/CurrentContentContext.tsx',
    'context/LanguageContext.tsx',
  ];

  for (const relativePath of relativePaths) {
    const absolutePath = resolve(projectDir, relativePath);
    if (!(await fs.pathExists(absolutePath))) {
      continue;
    }

    const original = await fs.readFile(absolutePath, 'utf8');
    const trimmed = original.trimStart();
    if (
      trimmed.startsWith("'use client'") ||
      trimmed.startsWith('"use client"') ||
      trimmed.startsWith('/* @client */')
    ) {
      continue;
    }

    await fs.writeFile(absolutePath, `'use client';\n\n${original}`);
  }
}

async function ensureClientProviders(projectDir) {
  const providersPath = resolve(projectDir, 'app/providers.tsx');
  if (!(await fs.pathExists(providersPath))) {
    return;
  }

  let content = await fs.readFile(providersPath, 'utf8');
    const wrapperImportStatement = "import { TranslationsProvider } from '@nextblock-cms/utils';";
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
      const firstImport = lines.findIndex((line) => line.startsWith('import'));
      const insertIndex = firstImport === -1 ? 0 : firstImport + 1;
      lines.splice(insertIndex, 0, wrapperImportStatement);
      content = lines.join('\n');
  }

    await fs.writeFile(providersPath, content);

    const wrapperPath = resolve(projectDir, 'lib/client-translations.tsx');
    if (await fs.pathExists(wrapperPath)) {
      await fs.remove(wrapperPath);
    }
  }

async function ensureEditorUtils(projectDir) {
  const exists = await fs.pathExists(EDITOR_UTILS_SOURCE_DIR);
  if (!exists) {
    return [];
  }

  const entries = await fs.readdir(EDITOR_UTILS_SOURCE_DIR);
  const utilNames = entries.filter((name) => name.endsWith('.ts')).map((name) => name.replace(/\.ts$/, ''));

  if (utilNames.length === 0) {
    return [];
  }

  const destinationDir = resolve(projectDir, 'lib/editor/utils');
  await fs.ensureDir(destinationDir);

  for (const utilName of utilNames) {
    const sourcePath = resolve(EDITOR_UTILS_SOURCE_DIR, `${utilName}.ts`);
    const destinationPath = resolve(destinationDir, `${utilName}.ts`);
    await fs.copy(sourcePath, destinationPath);
  }

  return utilNames;
}

async function sanitizeBlockEditorImports(projectDir) {
  const blockEditorPath = resolve(projectDir, 'app/cms/blocks/components/BlockEditorArea.tsx');
  if (!(await fs.pathExists(blockEditorPath))) {
    return;
  }

  const content = await fs.readFile(blockEditorPath, 'utf8');
  const replacements = [
    { pattern: /(\.\.\/editors\/[A-Za-z0-9_-]+)\.js/g, replacement: '$1.tsx' },
    { pattern: /(\.\.\/actions)\.js/g, replacement: '$1.ts' },
  ];

  const updated = replacements.reduce(
    (current, { pattern, replacement }) => current.replace(pattern, replacement),
    content,
  );

  if (updated !== content) {
    await fs.writeFile(blockEditorPath, updated);
  }
}

async function sanitizeUiImports(projectDir) {
  const searchDirs = ['app', 'components', 'context', 'lib'];
  const validExtensions = new Set(['.js', '.jsx', '.ts', '.tsx']);
  const files = [];

  for (const relativeDir of searchDirs) {
    const absoluteDir = resolve(projectDir, relativeDir);
    if (await fs.pathExists(absoluteDir)) {
      await collectFiles(absoluteDir, files, validExtensions);
    }
  }

  for (const filePath of files) {
    const original = await fs.readFile(filePath, 'utf8');
    const updated = original.replace(/@nextblock-cms\/ui\/(?!styles\/)[A-Za-z0-9/_-]+/g, '@nextblock-cms/ui');
    if (updated !== original) {
      await fs.writeFile(filePath, updated);
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

async function ensureUiProxies(projectDir) {
  const proxiesDir = resolve(projectDir, 'lib/ui');
  await fs.ensureDir(proxiesDir);

  const proxyContent = "export * from '@nextblock-cms/ui';\n";

  for (const moduleName of UI_PROXY_MODULES) {
    const proxyPath = resolve(proxiesDir, `${moduleName}.ts`);
    if (!(await fs.pathExists(proxyPath))) {
      await fs.outputFile(proxyPath, proxyContent);
    }
  }
}

async function sanitizeLayout(projectDir) {
  await ensureGlobalStyles(projectDir);
  await ensureEditorStyles(projectDir);

  const layoutPath = resolve(projectDir, 'app/layout.tsx');
  if (!(await fs.pathExists(layoutPath))) {
    return;
  }

  const requiredImports = [
    "import '@nextblock-cms/ui/styles/globals.css';",
    "import '@nextblock-cms/editor/styles/editor.css';",
  ];

  const content = await fs.readFile(layoutPath, 'utf8');
  let updated = content.replace(
    /import\s+['"]\.\/globals\.css['"];?\s*/g,
    '',
  );
  updated = updated.replace(
    /import\s+['"]\.\/editor\.css['"];?\s*/g,
    '',
  );

  const missingImports = requiredImports.filter((statement) => !updated.includes(statement));
  if (missingImports.length > 0) {
    updated = `${missingImports.join('\n')}\n${updated}`;
  }

  if (updated !== content) {
    await fs.writeFile(layoutPath, updated);
  }
}

async function ensureGlobalStyles(projectDir) {
  const destination = resolve(projectDir, 'app/globals.css');

  if (!(await fs.pathExists(destination))) {
    return;
  }

  const content = (await fs.readFile(destination, 'utf8')).trim();
  if (
    content === '' ||
    content.startsWith('/* Project-level overrides') ||
    content.includes('@tailwind base')
  ) {
    await fs.remove(destination);
  }
}

async function ensureEditorStyles(projectDir) {
  const stylesDir = resolve(projectDir, 'app');
  const editorPath = resolve(stylesDir, 'editor.css');
  const dragHandlePath = resolve(stylesDir, 'drag-handle.css');

  for (const filePath of [editorPath, dragHandlePath]) {
    if (await fs.pathExists(filePath)) {
      const content = (await fs.readFile(filePath, 'utf8')).trim();
      if (
        content === '' ||
        content.startsWith('/* Editor styles placeholder') ||
        content.includes("@nextblock-cms/editor/styles")
      ) {
        await fs.remove(filePath);
      }
    }
  }
}

async function sanitizeTailwindConfig(projectDir) {
  const tailwindConfigPath = resolve(projectDir, 'tailwind.config.js');
  const content = `/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './context/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
    './node_modules/@nextblock-cms/ui/**/*.{js,ts,jsx,tsx}',
    './node_modules/@nextblock-cms/editor/**/*.{js,ts,jsx,tsx}',
  ],
  safelist: [
    'animate-enter',
    'animate-leave',
    'dark',
    'text-primary',
    'text-secondary',
    'text-accent',
    'text-muted',
    'text-destructive',
    'text-background',
  ],
  prefix: '',
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        warning: {
          DEFAULT: 'hsl(var(--warning))',
          foreground: 'hsl(var(--warning-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
`;

  await fs.writeFile(tailwindConfigPath, content);
}

async function normalizeTsconfig(projectDir) {
  const tsconfigPath = resolve(projectDir, 'tsconfig.json');
  if (!(await fs.pathExists(tsconfigPath))) {
    return;
  }

  const tsconfig = await fs.readJSON(tsconfigPath);
  if ('extends' in tsconfig) {
    delete tsconfig.extends;
  }

  if ('references' in tsconfig) {
    delete tsconfig.references;
  }
  const defaultInclude = new Set([
    'next-env.d.ts',
    '**/*.ts',
    '**/*.tsx',
    '**/*.js',
    '**/*.jsx',
    '.next/types/**/*.ts',
  ]);

  if (Array.isArray(tsconfig.include)) {
    for (const entry of tsconfig.include) {
      if (typeof entry === 'string' && !entry.includes('../')) {
        defaultInclude.add(entry);
      }
    }
  }

  tsconfig.include = Array.from(defaultInclude);

  const defaultExclude = new Set(['node_modules']);
  if (Array.isArray(tsconfig.exclude)) {
    for (const entry of tsconfig.exclude) {
      if (typeof entry === 'string' && !entry.includes('../')) {
        defaultExclude.add(entry);
      }
    }
  }

  tsconfig.exclude = Array.from(defaultExclude);

  tsconfig.compilerOptions = {
    ...(tsconfig.compilerOptions ?? {}),
    baseUrl: '.',
    skipLibCheck: true,
  };

  const compilerOptions = tsconfig.compilerOptions;
  compilerOptions.paths = {
    ...(compilerOptions.paths ?? {}),
    '@/*': ['./*'],
    '@nextblock-cms/ui/*': ['./lib/ui/*'],
    '@nextblock-cms/editor/utils/*': ['./lib/editor/utils/*'],
  };

  await fs.writeJSON(tsconfigPath, tsconfig, { spaces: 2 });
}

async function sanitizeNextConfig(projectDir, editorUtilNames = []) {
  const nextConfigPath = resolve(projectDir, 'next.config.js');
  const content = buildNextConfigContent(editorUtilNames);
  await fs.writeFile(nextConfigPath, content);
}

async function transformPackageJson(projectDir) {
  const packageJsonPath = resolve(projectDir, 'package.json');
  if (!(await fs.pathExists(packageJsonPath))) {
    return;
  }

  const packageJson = await fs.readJSON(packageJsonPath);
  const projectName = basename(projectDir);

  if (projectName) {
    packageJson.name = projectName;
  }

  packageJson.version = packageJson.version ?? '0.1.0';
  packageJson.private = packageJson.private ?? true;

  packageJson.dependencies = packageJson.dependencies ?? {};

  for (const [pkgName, manifestPath] of Object.entries(PACKAGE_VERSION_SOURCES)) {
    if (pkgName in packageJson.dependencies) {
      const current = packageJson.dependencies[pkgName];
      if (typeof current === 'string' && current.startsWith('workspace:')) {
        let versionSpecifier = 'latest';
        try {
          const manifest = await fs.readJSON(manifestPath);
          if (manifest.version) {
            versionSpecifier = `^${manifest.version}`;
          }
        } catch {
          versionSpecifier = 'latest';
        }

        packageJson.dependencies[pkgName] = versionSpecifier;
      }
    }
  }

  await fs.writeJSON(packageJsonPath, packageJson, { spaces: 2 });
}

async function installDependencies(projectDir) {
  const npmCommand = IS_WINDOWS ? 'npm.cmd' : 'npm';
  console.log(chalk.blue('Installing dependencies with npm...'));
  await runCommand(npmCommand, ['install'], { cwd: projectDir });
  console.log(chalk.green('Dependencies installed.'));
}

async function initializeGit(projectDir) {
  const gitDirectory = resolve(projectDir, '.git');
  if (await fs.pathExists(gitDirectory)) {
    return;
  }

  try {
    console.log(chalk.blue('Initializing Git repository...'));
    await runCommand('git', ['init'], { cwd: projectDir });
    console.log(chalk.green('Git repository initialized.'));
  } catch (error) {
    console.warn(
      chalk.yellow(
        `Skipping Git initialization: ${error instanceof Error ? error.message : String(error)}`,
      ),
    );
  }
}

function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: IS_WINDOWS,
      ...options,
    });

    child.on('error', (error) => {
      reject(error);
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} exited with code ${code}`));
      }
    });
  });
}

function buildNextConfigContent(editorUtilNames) {
  const aliasLines = [];

  for (const moduleName of UI_PROXY_MODULES) {
    aliasLines.push(
      "      '@nextblock-cms/ui/" + moduleName + "': path.join(process.cwd(), 'lib/ui/" + moduleName + "'),",
    );
  }

  for (const moduleName of editorUtilNames) {
    aliasLines.push(
      "      '@nextblock-cms/editor/utils/" +
        moduleName +
        "': path.join(process.cwd(), 'lib/editor/utils/" +
        moduleName +
        "'),",
    );
  }

  const lines = [
    '//@ts-check',
    '',
    "const path = require('path');",
    "const webpack = require('webpack');",
    '',
    '/**',
    " * @type {import('next').NextConfig}",
    ' **/',
    'const nextConfig = {',
    "  outputFileTracingRoot: path.join(__dirname),",
    '  env: {',
    "    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,",
    "    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,",
    '  },',
    '  images: {',
    "    formats: ['image/avif', 'image/webp'],",
    '    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384, 512],',
    '    deviceSizes: [320, 480, 640, 750, 828, 1080, 1200, 1440, 1920, 2048, 2560],',
    '    minimumCacheTTL: 31536000,',
    "    dangerouslyAllowSVG: false,",
    "    contentSecurityPolicy: \"default-src 'self'; script-src 'none'; sandbox;\",",
    '    remotePatterns: [',
    "      { protocol: 'https', hostname: 'pub-a31e3f1a87d144898aeb489a8221f92e.r2.dev' },",
    "      { protocol: 'https', hostname: 'e260676f72b0b18314b868f136ed72ae.r2.cloudflarestorage.com' },",
    '      ...(process.env.NEXT_PUBLIC_URL',
    '        ? [',
    '            {',
    "              protocol: /** @type {'http' | 'https'} */ (new URL(process.env.NEXT_PUBLIC_URL).protocol.slice(0, -1)),",
    "              hostname: new URL(process.env.NEXT_PUBLIC_URL).hostname,",
    '            },',
    '          ]',
    '        : []),',
    '    ],',
    '  },',
    '  experimental: {',
    "    optimizeCss: true,",
    "    cssChunking: 'strict',",
    '  },',
    "  transpilePackages: ['@nextblock-cms/utils', '@nextblock-cms/ui', '@nextblock-cms/editor'],",
    '  webpack: (config, { isServer }) => {',
    '    config.resolve = config.resolve || {};',
    '    config.resolve.alias = {',
    '      ...(config.resolve.alias ?? {}),',
  ];

  if (aliasLines.length > 0) {
    lines.push(...aliasLines);
  }

  lines.push('    };', '');

  if (editorUtilNames.length > 0) {
    lines.push(
      '    const editorUtilsShims = ' + JSON.stringify(editorUtilNames) + ';',
      '    config.plugins = config.plugins || [];',
      '    for (const utilName of editorUtilsShims) {',
      "      const shimPath = path.join(process.cwd(), 'lib/editor/utils', utilName);",
      '      config.plugins.push(',
      "        new webpack.NormalModuleReplacementPlugin(new RegExp('^@nextblock-cms/editor/utils/' + utilName + '$'), shimPath),",
      '      );',
      '      config.plugins.push(',
      "        new webpack.NormalModuleReplacementPlugin(new RegExp('^./utils/' + utilName + '$'), shimPath),",
      '      );',
      '    }',
      '',
    );
  }

  lines.push(
    '    if (!isServer) {',
    '      config.module = config.module || {};',
    '      config.module.rules = config.module.rules || [];',
    '      config.module.rules.push({',
    "        test: /\\.svg$/i,",
    "        issuer: /\\.[jt]sx?$/,",
    "        use: ['@svgr/webpack'],",
    '      });',
    '',
    '      config.optimization = {',
    '        ...(config.optimization ?? {}),',
    '        splitChunks: {',
    '          ...((config.optimization ?? {}).splitChunks ?? {}),',
    '          cacheGroups: {',
    '            ...(((config.optimization ?? {}).splitChunks ?? {}).cacheGroups ?? {}),',
    '            tiptap: {',
    "              test: /[\\\\/]node_modules[\\\\/](@tiptap|prosemirror)[\\\\/]/,",
    "              name: 'tiptap',",
    "              chunks: 'async',",
    '              priority: 30,',
    '              reuseExistingChunk: true,',
    '            },',
    '            tiptapExtensions: {',
    "              test: /[\\\\/](tiptap-extensions|RichTextEditor|MenuBar|MediaLibraryModal)[\\\\/]/,",
    "              name: 'tiptap-extensions',",
    "              chunks: 'async',",
    '              priority: 25,',
    '              reuseExistingChunk: true,',
    '            },',
    '          },',
    '        },',
    '      };',
    '    }',
    '',
    '    return config;',
    '  },',
    '  turbopack: {',
    '    // Turbopack-specific options can be configured here if needed.',
    '  },',
    '  compiler: {',
    "    removeConsole: process.env.NODE_ENV === 'production',",
    '  },',
    '};',
    '',
    'module.exports = nextConfig;',
  );

  return lines.join('\n');
}
