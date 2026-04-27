const { build } = require('vite');
const fs = require('fs');
const path = require('path');

const CONFIG = {
  distDir: 'dist',
  srcDir: 'src',
  packageFile: 'package.json',
  viteConfig: 'vite.config.js'
};

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(path.resolve(filePath), 'utf-8'));
}

function writeJson(filePath, data) {
  fs.writeFileSync(path.resolve(filePath), JSON.stringify(data, null, 2), 'utf-8');
}

function parseVersion(version) {
  const parts = version.split('.').map(Number);
  return { major: parts[0] || 0, minor: parts[1] || 0, patch: parts[2] || 0 };
}

function bumpVersion(version, type) {
  const v = parseVersion(version);
  switch (type) {
    case 'major':
      v.major += 1;
      v.minor = 0;
      v.patch = 0;
      break;
    case 'minor':
      v.minor += 1;
      v.patch = 0;
      break;
    case 'patch':
    default:
      v.patch += 1;
      break;
  }
  return `${v.major}.${v.minor}.${v.patch}`;
}

async function runBuild() {
  try {
    const pkg = readJson(CONFIG.packageFile);
    const newVersion = pkg.version;
    console.log(`Starting build v${newVersion}...`);

    const viteConfigPath = path.resolve(CONFIG.viteConfig);
    if (!fs.existsSync(viteConfigPath)) {
      throw new Error(`Vite config not found: ${CONFIG.viteConfig}`);
    }

    await build({ configFile: viteConfigPath, mode: 'production' });

    console.log(`Build completed: v${newVersion}`);
  } catch (error) {
    console.error('Build failed:', error.message);
    process.exit(1);
  }
}

function main() {
  const args = process.argv.slice(2);
  const bumpType = args[0] || 'patch';
  const increment = args.includes('--increment');

  if (['patch', 'minor', 'major'].indexOf(bumpType) === -1) {
    console.error(`Invalid bump type: ${bumpType}. Use: patch, minor, or major`);
    process.exit(1);
  }

  const pkg = readJson(CONFIG.packageFile);
  const oldVersion = pkg.version;
  const newVersion = bumpVersion(oldVersion, bumpType);

  if (increment) {
    pkg.version = newVersion;
    writeJson(CONFIG.packageFile, pkg);
    console.log(`Version bumped: ${oldVersion} -> ${newVersion}`);
  } else {
    console.log(`Version: ${newVersion}`);
  }

  runBuild();
}

main();
