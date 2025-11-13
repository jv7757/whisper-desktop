const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('=== Whisper Desktop Build Diagnosis ===\n');

// Check if dist directory exists
const distDir = path.join(__dirname, '../dist');
console.log('1. Checking build output...');
if (fs.existsSync(distDir)) {
  console.log('✓ dist/ directory exists');

  const mainJs = path.join(distDir, 'main.js');
  const preloadJs = path.join(distDir, 'preload.js');
  const rendererDir = path.join(distDir, 'renderer');

  console.log(`  - main.js: ${fs.existsSync(mainJs) ? '✓' : '✗'}`);
  console.log(`  - preload.js: ${fs.existsSync(preloadJs) ? '✓' : '✗'}`);
  console.log(`  - renderer/: ${fs.existsSync(rendererDir) ? '✓' : '✗'}`);

  if (fs.existsSync(rendererDir)) {
    const indexHtml = path.join(rendererDir, 'index.html');
    console.log(`  - renderer/index.html: ${fs.existsSync(indexHtml) ? '✓' : '✗'}`);

    if (fs.existsSync(indexHtml)) {
      const content = fs.readFileSync(indexHtml, 'utf-8');
      console.log('  - HTML base tag check...');
      if (content.includes('<base')) {
        console.log('    ⚠ Found <base> tag - may cause issues');
      } else {
        console.log('    ✓ No <base> tag found');
      }

      console.log('  - Script paths check...');
      const scriptMatches = content.match(/<script[^>]+src="([^"]+)"/g);
      if (scriptMatches) {
        scriptMatches.forEach(match => {
          const src = match.match(/src="([^"]+)"/)[1];
          if (src.startsWith('/')) {
            console.log(`    ⚠ Absolute path found: ${src}`);
          } else {
            console.log(`    ✓ Relative path: ${src}`);
          }
        });
      }
    }
  }
} else {
  console.log('✗ dist/ directory not found. Run build first.');
}

console.log('\n2. Checking resources...');
const resourcesDir = path.join(__dirname, '../resources');
if (fs.existsSync(resourcesDir)) {
  console.log('✓ resources/ directory exists');

  const platforms = ['win32', 'darwin', 'linux'];
  platforms.forEach(platform => {
    const binDir = path.join(resourcesDir, 'bin', platform);
    if (fs.existsSync(binDir)) {
      const files = fs.readdirSync(binDir);
      console.log(`  - ${platform}: ${files.length} files`);
    } else {
      console.log(`  - ${platform}: ✗ not found`);
    }
  });

  const modelsDir = path.join(resourcesDir, 'models');
  if (fs.existsSync(modelsDir)) {
    const models = fs.readdirSync(modelsDir).filter(f => f.endsWith('.bin'));
    console.log(`  - models: ${models.length} .bin files`);
  } else {
    console.log('  - models: ✗ not found');
  }
} else {
  console.log('✗ resources/ directory not found');
}

console.log('\n3. Package.json configuration...');
const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf-8'));
console.log(`  - main: ${packageJson.main}`);
console.log(`  - asarUnpack: ${packageJson.build?.asarUnpack ? '✓ configured' : '✗ not configured'}`);

console.log('\n=== Diagnosis Complete ===\n');
