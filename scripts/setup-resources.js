const fs = require('fs');
const path = require('path');

console.log('Setting up resource directories...');

const resourceDirs = [
  'resources/bin/win32',
  'resources/bin/darwin',
  'resources/bin/linux',
  'resources/models'
];

resourceDirs.forEach(dir => {
  const fullPath = path.join(__dirname, '..', dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
    console.log(`✓ Created directory: ${dir}`);
  } else {
    console.log(`  Directory already exists: ${dir}`);
  }
});

// Create README files in each directory
const binReadme = `# Binary Files

Place the platform-specific binaries here:

- ffmpeg: Audio/video processing tool
- whisper: Whisper.cpp executable

Make sure the files have execute permissions on Unix-like systems:
\`\`\`bash
chmod +x ffmpeg whisper
\`\`\`
`;

const modelReadme = `# Whisper Models

Place your Whisper model files (.bin) here.

Download models from:
https://huggingface.co/ggerganov/whisper.cpp

Recommended models:
- ggml-tiny.bin (75 MB) - Fast, lower accuracy
- ggml-base.bin (142 MB) - Balanced
- ggml-small.bin (466 MB) - Better accuracy
- ggml-medium.bin (1.5 GB) - High accuracy
`;

// Write README files
fs.writeFileSync(path.join(__dirname, '../resources/bin/README.md'), binReadme);
fs.writeFileSync(path.join(__dirname, '../resources/models/README.md'), modelReadme);

console.log('✓ Resource directories setup complete');
console.log('\nNext steps:');
console.log('1. Download Whisper models and place them in resources/models/');
console.log('2. Download/compile FFmpeg and Whisper.cpp binaries');
console.log('3. Place binaries in the appropriate platform directories');
