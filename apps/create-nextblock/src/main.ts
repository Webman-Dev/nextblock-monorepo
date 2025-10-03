#!/usr/bin/env node

import path from 'node:path';
import process from 'node:process';

type PackageManager = 'npm' | 'yarn' | 'pnpm';

const SKIP_DIRECTORIES = new Set(['node_modules', '.next', 'dist', '.turbo', '.git', 'workspace_modules']);
const PACKAGE_MANAGER_INSTALL_ARGS: Record<PackageManager, { command: string; args: string[]; runDev: string }> = {
  npm: { command: 'npm', args: ['install'], runDev: 'npm run dev' },
  yarn: { command: 'yarn', args: ['install'], runDev: 'yarn dev' },
  pnpm: { command: 'pnpm', args: ['install'], runDev: 'pnpm dev' }
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

  const templateDir = await resolveTemplateDir(fs, getCliEntryFilePath());
  const workspaceRoot = path.resolve(templateDir, '..', '..');

  console.log(chalk.gray('Creating project directory...'));
  await fs.ensureDir(projectDir);

  console.log(chalk.gray('Copying project template...'));
  await fs.copy(templateDir, projectDir, {
    overwrite: false,
    errorOnExist: true,
    filter: (absolutePath: string) => shouldCopyPath(templateDir, absolutePath)
  });

  await transformPackageJson(fs, path.join(projectDir, 'package.json'), projectName);

  await copyEnvFile(fs, workspaceRoot, projectDir, chalk);

  console.log(chalk.gray('Installing dependencies...'));
  const installConfig = PACKAGE_MANAGER_INSTALL_ARGS[packageManager];
  await execa(installConfig.command, installConfig.args, { cwd: projectDir, stdio: 'inherit' });

  console.log(chalk.green(`\nYour NextBlock project is ready!`));
  console.log(`\nNext steps:`);
  console.log(`  cd ${projectName}`);
  console.log(`  ${installConfig.runDev}`);
  console.log('\nRemember to review and update your .env.local file before starting the development server.\n');
}

function shouldCopyPath(templateDir: string, absolutePath: string): boolean {
  const relative = path.relative(templateDir, absolutePath);
  if (!relative || relative === '') {
    return true;
  }

  const segments = relative.split(path.sep);
  return !segments.some((segment) => SKIP_DIRECTORIES.has(segment));
}

function getCliEntryFilePath(): string {
  const entry = process.argv[1];
  if (entry) {
    return path.resolve(entry);
  }

  throw new Error('Unable to determine CLI entry point path.');
}

async function transformPackageJson(
  fs: typeof import('fs-extra'),
  packageJsonPath: string,
  projectName: string
): Promise<void> {
  if (!(await fs.pathExists(packageJsonPath))) {
    throw new Error('Template package.json not found.');
  }

  const raw = await fs.readFile(packageJsonPath, 'utf8');
  const pkg = JSON.parse(raw) as Record<string, unknown>;

  pkg.name = projectName;

  sanitizeWorkspaceDependencies(pkg, 'dependencies');
  sanitizeWorkspaceDependencies(pkg, 'devDependencies');

  const existingScripts = (pkg.scripts as Record<string, string> | undefined) ?? {};
  const cleanedScripts: Record<string, string> = {};

  for (const [scriptName, command] of Object.entries(existingScripts)) {
    if (!isNxScript(command)) {
      cleanedScripts[scriptName] = command;
    }
  }

  cleanedScripts.dev = 'next dev';
  cleanedScripts.build = 'next build';
  cleanedScripts.start = 'next start';
  cleanedScripts.lint = 'next lint';

  pkg.scripts = cleanedScripts;

  await fs.writeFile(packageJsonPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
}

function sanitizeWorkspaceDependencies(pkg: Record<string, unknown>, key: 'dependencies' | 'devDependencies'): void {
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

function isNxScript(command: string | undefined): boolean {
  if (!command) {
    return false;
  }

  return /(^|\s)(?:npx\s+)?nx\b/.test(command);
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

async function resolveTemplateDir(
  fs: typeof import('fs-extra'),
  entryFilePath: string
): Promise<string> {
  const currentDir = path.dirname(entryFilePath);
  const root = path.parse(currentDir).root;
  let dir = currentDir;

  while (dir && dir !== root) {
    const candidate = path.join(dir, 'apps', 'nextblock');
    if (await fs.pathExists(candidate)) {
      return candidate;
    }
    dir = path.dirname(dir);
  }

  throw new Error('Unable to locate the template directory at apps/nextblock.');
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
