const fs = require('fs-extra');
const path = require('path');

// Usage: node copy-next-build.js <appName> <outputPath>
// Example: node copy-next-build.js nextblock dist/apps/nextblock

const appName = process.argv[2];
const outputPath = process.argv[3];

if (!appName || !outputPath) {
  console.error('Usage: node copy-next-build.js <appName> <outputPath>');
  process.exit(1);
}

// Resolve paths relative to workspace root (assuming script is run from root or tools/scripts)
// We assume CWD is the workspace root when running via Nx
const workspaceRoot = process.cwd();

const sourceDir = path.join(workspaceRoot, 'apps', appName, '.next');
const destDir = path.join(workspaceRoot, outputPath, '.next');

console.log(`Copying .next assets...`);
console.log(`From: ${sourceDir}`);
console.log(`To:   ${destDir}`);

if (!fs.existsSync(sourceDir)) {
  console.error(`Error: Source .next directory not found at ${sourceDir}`);
  // If the build failed, this might be expected. But we should be running after a successful build.
  process.exit(1);
}

try {
  // Ensure parent directory exists
  fs.ensureDirSync(path.dirname(destDir));

  // Copy directory
  fs.copySync(sourceDir, destDir, { overwrite: true });
  console.log('Successfully copied .next directory.');
} catch (err) {
  console.error('Error copying .next directory:', err);
  process.exit(1);
}
