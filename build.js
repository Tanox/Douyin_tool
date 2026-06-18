const fs = require('fs');
const path = require('path');
const esbuild = require('esbuild');

const CONFIG = {
  buildDir: 'build',
  srcDir: 'src',
  packageFile: 'package.json',
  entryFile: 'src/main.ts'
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

async function buildUserScript() {
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

    ensureDir(path.resolve(CONFIG.buildDir));

    // 使用 esbuild 打包 TypeScript 代码
    const result = await esbuild.build({
      entryPoints: [CONFIG.entryFile],
      bundle: true,
      platform: 'browser',
      format: 'iife',
      target: ['es2020'],
      write: false,
      sourcemap: false,
      minifyIdentifiers: false,
      minifySyntax: false,
      minifyWhitespace: false,
      banner: {
        js: metadata
      },
      logLevel: 'warning'
    });

    const outputFile = path.join(CONFIG.buildDir, 'douyin_ui_customizer.user.js');
    fs.writeFileSync(outputFile, result.outputFiles[0].text, 'utf-8');

    console.log(`Build completed: ${outputFile}`);
    console.log(`Output size: ${(result.outputFiles[0].text.length / 1024).toFixed(2)} KB`);
  } catch (error) {
    console.error('Build failed:', error.message);
    if (error.errors) {
      console.error('esbuild errors:', JSON.stringify(error.errors, null, 2));
    }
    process.exit(1);
  }
}

function cleanupOldDist() {
  const distDir = path.resolve('dist');
  if (fs.existsSync(distDir)) {
    try {
      fs.rmSync(distDir, { recursive: true, force: true });
      console.log('Removed old dist directory');
    } catch (error) {
      console.warn('Failed to remove dist directory:', error.message);
    }
  }
}

async function main() {
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

  await buildUserScript();
  cleanupOldDist();
}

main();
