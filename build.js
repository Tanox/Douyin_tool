const fs = require('fs');
const path = require('path');

const CONFIG = {
  distDir: 'dist',
  srcDir: 'src',
  packageFile: 'package.json'
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

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function buildUserScript() {
  try {
    const pkg = readJson(CONFIG.packageFile);
    const version = pkg.version;
    console.log(`Building user script v${version}...`);

    const metadata = `// ==UserScript==
// @name         抖音Web端界面UI定制工具
// @namespace    https://github.com/sutchan
// @version      ${version}
// @description  自定义抖音Web端界面，隐藏不需要的UI元素，提升观看体验
// @author       Sut (@sutchan)
// @match        https://www.douyin.com/*
// @match        https://v.douyin.com/*
// @grant        GM_addStyle
// @grant        GM_registerMenuCommand
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_addValueChangeListener
// @grant        GM_removeValueChangeListener
// @run-at       document-end
// @icon         https://www.douyin.com/favicon.ico
// @updateURL
// @downloadURL
// ==/UserScript==

`;

    const files = [
      'src/config.js',
      'src/utils/index.js',
      'src/utils/dom.ts',
      'src/utils/logger.ts',
      'src/utils/storage.ts',
      'src/utils/eventEmitter.ts',
      'src/utils/autoExecutor.ts',
      'src/utils/performance.js',
      'src/controllers/elementController.js',
      'src/controllers/layoutController.js',
      'src/styles/index.js',
      'src/styles/theme.js',
      'src/ui_manager.js',
      'src/main.js'
    ];

    let scriptContent = metadata;
    files.forEach(file => {
      const resolvedPath = path.resolve(file);
      if (fs.existsSync(resolvedPath)) {
        let content = fs.readFileSync(resolvedPath, 'utf-8');
        content = content.replace(/from '\.\/(\w+)\.ts'/g, "from './$1.js'");
        content = content.replace(/from '\.\.\/(\w+)\.ts'/g, "from '../$1.js'");
        scriptContent += content + '\n\n';
      } else {
        console.warn(`File not found: ${file}`);
      }
    });

    const distDir = path.resolve(CONFIG.distDir);
    ensureDir(distDir);

    const outputFile = path.join(distDir, 'douyin_ui_customizer.user.js');
    fs.writeFileSync(outputFile, scriptContent, 'utf-8');

    console.log(`Build completed: ${outputFile}`);
  } catch (error) {
    console.error('Build failed:', error.message);
    console.error(error.stack);
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

  buildUserScript();
}

main();