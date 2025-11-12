const fs = require('fs');
const path = require('path');

// 获取当前版本号，如果没有则默认为1.0.0
function getCurrentVersion() {
  try {
    const packageJsonPath = path.join(__dirname, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      return packageJson.version || '1.0.0';
    }
    return '1.0.0';
  } catch (error) {
    console.error('获取版本号失败:', error);
    return '1.0.0';
  }
}

// 更新版本号
function updateVersion(version) {
  try {
    const packageJsonPath = path.join(__dirname, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      packageJson.version = version;
      fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
      console.log(`版本已更新为: ${version}`);
    }
  } catch (error) {
    console.error('更新版本号失败:', error);
  }
}

// 解析版本号并递增
function incrementVersion(version) {
  const parts = version.split('.');
  if (parts.length === 3) {
    parts[2] = String(parseInt(parts[2]) + 1);
    return parts.join('.');
  }
  return version;
}

// 检查文件是否存在
function checkFilesExist(files) {
  const missingFiles = files.filter(file => !fs.existsSync(file));
  if (missingFiles.length > 0) {
    console.error('以下文件不存在:');
    missingFiles.forEach(file => console.error(`  - ${file}`));
    return false;
  }
  return true;
}

// 清理CSS代码，移除注释和多余的空格
function cleanCSS(css) {
  // 移除CSS注释
  css = css.replace(/\/\*[\s\S]*?\*\//g, '');
  // 移除多余的空格
  css = css.replace(/\s+/g, ' ');
  // 移除行首和行尾的空格
  css = css.replace(/^\s+|\s+$/gm, '');
  return css.trim();
}

// 生成油猴脚本头部
function generateUserscriptHeader(version) {
  return `// ==UserScript==
// @name         抖音UI自定义工具
// @namespace    http://tampermonkey.net/
// @version      ${version}
// @description  自定义抖音网页版的UI界面，隐藏不需要的元素，调整布局
// @author       You
// @match        https://www.douyin.com/*
// @match        https://v.douyin.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=douyin.com
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// ==/UserScript==

`;
}

// 主函数
function main() {
  const srcDir = path.join(__dirname, 'src');
  const distDir = path.join(__dirname, 'dist');
  const outputFile = path.join(distDir, 'douyin_ui_customizer.user.js');
  
  // 检查源文件是否存在
  const sourceFiles = [
    path.join(srcDir, 'index.js'),
    path.join(srcDir, 'ui_manager.js'),
    path.join(srcDir, 'utils', 'index.js'),
    path.join(srcDir, 'styles', 'default.css')
  ];
  
  if (!checkFilesExist(sourceFiles)) {
    process.exit(1);
  }
  
  // 创建dist目录（如果不存在）
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
  }
  
  // 获取并更新版本号
  const currentVersion = getCurrentVersion();
  const newVersion = incrementVersion(currentVersion);
  updateVersion(newVersion);
  
  // 读取源文件
  console.log('开始合并文件...');
  const indexCode = fs.readFileSync(sourceFiles[0], 'utf8');
  const uiManagerCode = fs.readFileSync(sourceFiles[1], 'utf8');
  const utilsCode = fs.readFileSync(sourceFiles[2], 'utf8');
  const defaultCssCode = cleanCSS(fs.readFileSync(sourceFiles[3], 'utf8'));
  const darkCssCode = cleanCSS(fs.readFileSync(path.join(srcDir, 'styles', 'dark.css'), 'utf8'));
  const cssCode = defaultCssCode + '\n' + darkCssCode;
  
  // 生成CSS注入代码
  const cssInjectCode = `// 注入CSS样式
(function() {
  const style = document.createElement('style');
  style.textContent = \`${cssCode}\`;
  document.head.appendChild(style);
})();

`;
  
  // 合并代码
  let finalScript = generateUserscriptHeader(newVersion);
  finalScript += cssInjectCode;
  finalScript += utilsCode + '\n\n';
  finalScript += uiManagerCode + '\n\n';
  
  // 如果index.js包含初始化代码，使用它；否则添加默认初始化
  if (!indexCode.includes('new UIManager()')) {
    finalScript += '// 初始化UIManager\nconst uiManager = new UIManager();\nuiManager.init();';
  } else {
    // 提取index.js中的实际执行代码（排除导入语句）
    const indexExecutionCode = indexCode
      .split('\n')
      .filter(line => !line.startsWith('import ') && !line.startsWith('export '))
      .join('\n')
      .trim();
    if (indexExecutionCode) {
      finalScript += indexExecutionCode;
    } else {
      finalScript += '// 初始化UIManager\nconst uiManager = new UIManager();\nuiManager.init();';
    }
  }
  
  // 简单的语法修复
  finalScript = finalScript.replace(/\{\s*,/g, '{');
  finalScript = finalScript.replace(/const DEFAULT_CONFIG = \{,/g, 'const DEFAULT_CONFIG = {');
  finalScript = finalScript.replace(/}\s*function loadConfig/g, '};\nfunction loadConfig');
  // 修复孤立的等号
  finalScript = finalScript.replace(/^\s*=\s*$/gm, '');
  // 确保模块导出语句后的代码正确
  finalScript = finalScript.replace(/export default UIManager;\s*=\s*/g, 'export default UIManager;\n');
  
  // 修复一些常见的语法错误
  finalScript = finalScript.replace(/,\s*}/g, '}'); // 移除对象中多余的逗号
  finalScript = finalScript.replace(/,\s*\]/g, ']'); // 移除数组中多余的逗号
  finalScript = finalScript.replace(/\s*\}\s*\s*\(/g, '})('); // 修复函数调用格式
  
  // 确保所有函数定义和方法末尾都有分号
  finalScript = finalScript.replace(/}\s*function/g, '};\nfunction');
  finalScript = finalScript.replace(/}\s*}\s*class/g, '};\n};\nclass');
  finalScript = finalScript.replace(/}\s*}\s*export/g, '};\n};\nexport');
  
  // 修复导入导出设置相关的函数调用
  if (finalScript.includes('createImportExportSettings()')) {
    // 添加缺失的函数定义
    const importExportCode = `function createImportExportSettings() {\n  return '\
    <div class="setting-group">\n      <h3>导入/导出设置</h3>\n      <div class="setting-item">\n        <button id="export-config" class="ui-button">导出配置</button>\n        <button id="import-config" class="ui-button">导入配置</button>\n        <input type="file" id="config-file" style="display: none;" accept=".json">\n      </div>\n    </div>\
  ';\n}\n\nfunction initImportExport() {\n  document.getElementById('export-config').addEventListener('click', exportConfig);\n  document.getElementById('import-config').addEventListener('click', () => {\n    document.getElementById('config-file').click();\n  });\n  document.getElementById('config-file').addEventListener('change', importConfig);\n}\n\nfunction exportConfig() {\n  const config = JSON.stringify(DEFAULT_CONFIG, null, 2);\n  const blob = new Blob([config], { type: 'application/json' });\n  const url = URL.createObjectURL(blob);\n  const a = document.createElement('a');\n  a.href = url;\n  a.download = 'douyin_ui_config.json';\n  document.body.appendChild(a);\n  a.click();\n  document.body.removeChild(a);\n  URL.revokeObjectURL(url);\n}\n\nfunction importConfig(event) {\n  const file = event.target.files[0];\n  if (!file) return;\n  \n  const reader = new FileReader();\n  reader.onload = function(e) {\n    try {\n      const config = JSON.parse(e.target.result);\n      Object.assign(DEFAULT_CONFIG, config);\n      saveConfig();\n      uiManager.applySettings();\n      alert('配置导入成功！');\n    } catch (error) {\n      alert('配置文件格式错误！');\n      console.error('导入配置失败:', error);\n    }\n  };\n  reader.readAsText(file);\n}\n\nfunction saveConfig() {\n  try {\n    localStorage.setItem('douyin_ui_config', JSON.stringify(DEFAULT_CONFIG));\n  } catch (error) {\n    console.error('保存配置失败:', error);\n  }\n}`;
    
    // 在适当位置插入函数定义
    finalScript = finalScript.replace(/\/\/ 初始化UIManager/, importExportCode + '\n\n// 初始化UIManager');
  }
  
  // 写入输出文件
  fs.writeFileSync(outputFile, finalScript, 'utf8');
  console.log(`构建完成！生成的文件: ${outputFile}`);
  console.log(`版本: ${newVersion}`);
}

// 执行主函数
main();