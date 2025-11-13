const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Building Electron main process...');

// Compile TypeScript
try {
  execSync('npx tsc -p electron/tsconfig.json', { stdio: 'inherit' });
  console.log('✓ Electron TypeScript compiled successfully');
} catch (error) {
  console.error('✗ Failed to compile Electron TypeScript');
  process.exit(1);
}

// Ensure dist directory exists
const distDir = path.join(__dirname, '../dist');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

console.log('✓ Electron build complete');
