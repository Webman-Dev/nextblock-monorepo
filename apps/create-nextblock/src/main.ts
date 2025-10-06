#!/usr/bin/env node

import path from 'node:path';
import process from 'node:process';

type PackageManager = 'npm' | 'yarn' | 'pnpm';

type PackageJson = {
  name?: string;
  private?: boolean;
  version?: string;
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  [key: string]: unknown;
};

type IgnoreInstance = import('ignore').Ignore;

const SKIP_DIRECTORIES = new Set([
  'node_modules',
  '.next',
  'dist',
  '.turbo',
  '.git',
  '.nx',
  'workspace_modules',
  '.nx-helpers',
  'backup'
]);
const SKIP_FILES = new Set([
  'package-lock.json',
  'pnpm-lock.yaml',
  'yarn.lock',
  'npm-shrinkwrap.json'
]);
const SKIP_PATH_PREFIXES = ['apps/create-nextblock'];
const PACKAGE_MANAGER_INSTALL_ARGS: Record<PackageManager, { command: string; args: string[]; runDev: string }> = {
  npm: { command: 'npm', args: ['install'], runDev: 'npm run dev' },
  yarn: { command: 'yarn', args: ['install'], runDev: 'yarn dev' },
  pnpm: { command: 'pnpm', args: ['install'], runDev: 'pnpm dev' }
};

const REQUIRED_SCRIPTS: Record<string, string> = {
  dev: 'nx serve nextblock',
  build: 'nx build nextblock',
  start: 'nx serve nextblock --configuration=production',
  lint: 'nx lint nextblock --skip-nx-cache'
};

const REQUIRED_DEPENDENCIES: Record<string, string> = {
  '@nextblock-cms/ui': 'latest',
  '@nextblock-cms/utils': 'latest',
  '@nextblock-cms/db': 'latest',
  '@nextblock-cms/editor': 'latest',
  '@nextblock-cms/sdk': 'latest',
  dotenv: '^16.5.0'
};

async function main(): Promise<void> {
  const [{ default: chalk }, { default: inquirer }, fsExtraModule, execaModule] = await Promise.all([
    import('chalk'),
    import('inquirer'),
    import('fs-extra'),
    import('execa')
  ]);

  const importedFs = fsExtraModule as typeof import('fs-extra') & { default?: typeof import('fs-extra') };
  const fs = importedFs.default ?? importedFs;
  const { execa } = execaModule as typeof import('execa');

  console.log(chalk.bold.cyan('\nWelcome to NextBlock CMS!\n'));

  const answers = await inquirer.prompt<{
    projectName: string;
    packageManager: PackageManager;
  }>([
    {
      type: 'input',
      name: 'projectName',
      message: 'What should we name your project?',
      validate: (input: string) => (input.trim().length > 0 ? true : 'Please enter a project name.')
    },
    {
      type: 'list',
      name: 'packageManager',
      message: 'Which package manager should we use?',
      choices: [
        { name: 'npm', value: 'npm' },
        { name: 'yarn', value: 'yarn' },
        { name: 'pnpm', value: 'pnpm' }
      ],
      default: 'npm'
    }
  ]);

  const projectName = answers.projectName.trim();
  const packageManager = answers.packageManager;
  const projectDir = path.resolve(process.cwd(), projectName);

  if (await fs.pathExists(projectDir)) {
    console.log(chalk.red(`\nA directory named "${projectName}" already exists. Please choose a different name.`));
    process.exit(1);
  }

  const workspaceRoot = await findWorkspaceRoot(fs, getCliEntryFilePath());

  console.log(chalk.gray('Creating project directory...'));
  await fs.ensureDir(projectDir);

  console.log(chalk.gray('Copying workspace files...'));
  await copyWorkspaceContents(fs, workspaceRoot, projectDir, projectName);

  await transformPackageJson(fs, workspaceRoot, path.join(projectDir, 'package.json'), projectName);

  await copyEnvFile(fs, workspaceRoot, projectDir, chalk);

  console.log(chalk.gray('Installing dependencies...'));
  const installConfig = PACKAGE_MANAGER_INSTALL_ARGS[packageManager];
  await execa(installConfig.command, installConfig.args, { cwd: projectDir, stdio: 'inherit' });

  console.log(chalk.green(`\nYour NextBlock project is ready!`));
  console.log('\nNext steps:');
  console.log(`  cd ${projectName}`);
  console.log(`  ${installConfig.runDev}`);
  console.log('\nRemember to review and update your .env.local file before starting the development server.\n');
}

async function copyWorkspaceContents(
  fs: typeof import('fs-extra'),
  workspaceRoot: string,
  projectDir: string,
  projectName: string
): Promise<void> {
  const [{ default: createIgnore }] = await Promise.all([import('ignore')]);
  const ig = createIgnore();
  const gitignorePath = path.join(workspaceRoot, '.gitignore');
  if (await fs.pathExists(gitignorePath)) {
    ig.add(await fs.readFile(gitignorePath, 'utf8'));
  }

  const items = await fs.readdir(workspaceRoot);

  for (const item of items) {
    if (item === projectName) {
      continue;
    }

    const src = path.join(workspaceRoot, item);
    const dest = path.join(projectDir, item);

    if (!shouldIncludePath(normalizeForIgnore(item), projectName, ig)) {
      continue;
    }

    await fs.copy(src, dest, {
      overwrite: false,
      errorOnExist: false,
      filter: (entryPath) => {
        const normalized = normalizeForIgnore(path.relative(workspaceRoot, entryPath));
        return shouldIncludePath(normalized, projectName, ig);
      }
    });
  }
}

function shouldIncludePath(normalizedPath: string, projectName: string, ig: IgnoreInstance): boolean {
  if (!normalizedPath) {
    return true;
  }

  if (normalizedPath === projectName || normalizedPath.startsWith(`${projectName}/`)) {
    return false;
  }

  if (ig.ignores(normalizedPath)) {
    return false;
  }

  if (SKIP_PATH_PREFIXES.some((prefix) => normalizedPath === prefix || normalizedPath.startsWith(`${prefix}/`))) {
    return false;
  }

  const segments = normalizedPath.split('/').filter(Boolean);
  if (segments.some((segment) => SKIP_DIRECTORIES.has(segment))) {
    return false;
  }

  const basename = segments.at(-1);
  if (basename && SKIP_FILES.has(basename)) {
    return false;
  }

  return true;
}

function normalizeForIgnore(value: string): string {
  return value.split(path.sep).join('/');
}

function getCliEntryFilePath(): string {
  const entry = process.argv[1];
  if (entry) {
    return path.resolve(entry);
  }

  throw new Error('Unable to determine CLI entry point path.');
}

async function findWorkspaceRoot(
  fs: typeof import('fs-extra'),
  entryFilePath: string
): Promise<string> {
  let dir = path.dirname(entryFilePath);
  const root = path.parse(dir).root;

  while (dir && dir !== root) {
    if (await fs.pathExists(path.join(dir, 'nx.json'))) {
      return dir;
    }
    dir = path.dirname(dir);
  }

  throw new Error('Unable to locate Nx workspace root (nx.json not found).');
}

async function transformPackageJson(
  fs: typeof import('fs-extra'),
  workspaceRoot: string,
  packageJsonPath: string,
  projectName: string
): Promise<void> {
  const pkg = await loadTemplatePackageJson(fs, workspaceRoot, packageJsonPath);

  pkg.name = projectName;
  pkg.private = true;

  const dependencies = (pkg.dependencies ??= {});
  for (const [dep, version] of Object.entries(REQUIRED_DEPENDENCIES)) {
    dependencies[dep] ??= version;
  }

  sanitizeWorkspaceDependencies(pkg, 'dependencies');
  sanitizeWorkspaceDependencies(pkg, 'devDependencies');

  const scripts = (pkg.scripts ??= {});
  for (const [scriptName, command] of Object.entries(REQUIRED_SCRIPTS)) {
    scripts[scriptName] ??= command;
  }

  await fs.writeFile(packageJsonPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
}

async function loadTemplatePackageJson(
  fs: typeof import('fs-extra'),
  workspaceRoot: string,
  destinationPath: string
): Promise<PackageJson> {
  if (await fs.pathExists(destinationPath)) {
    const raw = await fs.readFile(destinationPath, 'utf8');
    return JSON.parse(raw) as PackageJson;
  }

  const rootPackageJson = path.join(workspaceRoot, 'package.json');
  if (await fs.pathExists(rootPackageJson)) {
    const raw = await fs.readFile(rootPackageJson, 'utf8');
    return JSON.parse(raw) as PackageJson;
  }

  return {
    name: projectNameFromPath(destinationPath),
    private: true,
    version: '0.0.0',
    scripts: {},
    dependencies: { ...REQUIRED_DEPENDENCIES }
  };
}

function projectNameFromPath(destinationPath: string): string {
  const dirName = path.basename(path.dirname(destinationPath));
  return dirName || 'nextblock-project';
}

function sanitizeWorkspaceDependencies(pkg: PackageJson, key: 'dependencies' | 'devDependencies'): void {
  const section = pkg[key];
  if (!section || typeof section !== 'object') {
    return;
  }

  const deps = section as Record<string, string>;
  for (const [depName, version] of Object.entries(deps)) {
    if (typeof version === 'string' && version.startsWith('workspace:')) {
      deps[depName] = 'latest';
    }
  }
}

async function copyEnvFile(
  fs: typeof import('fs-extra'),
  workspaceRoot: string,
  projectDir: string,
  chalk: typeof import('chalk')['default']
): Promise<void> {
  const sourceEnvPath = path.join(workspaceRoot, '.env.exemple');
  const targetEnvPath = path.join(projectDir, '.env.local');

  if (await fs.pathExists(sourceEnvPath)) {
    await fs.copy(sourceEnvPath, targetEnvPath, { overwrite: false, errorOnExist: false });
  } else {
    console.log(chalk.yellow('No .env.exemple file found in the workspace root. Skipping environment file copy.'));
  }
}

main().catch((error: unknown) => {
  console.error('\nAn unexpected error occurred while creating your project.');
  if (error instanceof Error) {
    console.error(error.message);
  } else {
    console.error(error);
  }
  process.exit(1);
});
