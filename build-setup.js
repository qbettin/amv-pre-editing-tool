// build-setup.js
// Run this before building: node build-setup.js

const { execSync } = require('child_process');
const fs = require('fs-extra');
const path = require('path');

console.log('🚀 Building AMV Pre-Editing Tool (Windows)...\n');

// Step 1: Build Python executable
console.log('📦 Step 1: Building Python executable...');
try {
  execSync('cd python && pyinstaller build.spec', { stdio: 'inherit' });
  console.log('✅ Python executable built\n');
} catch (error) {
  console.error('❌ Failed to build Python executable');
  process.exit(1);
}

// Step 2: Copy Python executable to resources
console.log('📦 Step 2: Copying Python executable to resources...');
const pythonDist = path.join(__dirname, 'python', 'dist', 'frame_processor.exe');
const resourcesDir = path.join(__dirname, 'resources', 'python-dist');

if (!fs.existsSync(pythonDist)) {
  console.error('❌ Python executable not found at:', pythonDist);
  process.exit(1);
}

fs.ensureDirSync(resourcesDir);
fs.copySync(pythonDist, path.join(resourcesDir, 'frame_processor.exe'));
console.log('✅ Python executable copied\n');

// Step 3: Verify FFmpeg binary exists
console.log('📦 Step 3: Checking FFmpeg binary...');
const ffmpegPath = path.join(__dirname, 'resources', 'ffmpeg', 'win', 'ffmpeg.exe');

if (!fs.existsSync(ffmpegPath)) {
  console.warn('⚠️  FFmpeg not found at:', ffmpegPath);
  console.warn('Download from: https://www.gyan.dev/ffmpeg/builds/');
  console.warn('Extract ffmpeg.exe to: resources/ffmpeg/win/\n');
  process.exit(1);
} else {
  console.log('✅ Found: ffmpeg.exe\n');
}

console.log('✅ Build preparation complete!');
console.log('Run "npm run build:app" to create the Windows installer.\n');