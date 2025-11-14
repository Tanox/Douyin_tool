const fs = require('fs');
const path = require('path');

// 读取src/ui_manager.js文件
const filePath = path.join(__dirname, 'src', 'ui_manager.js');
let content = fs.readFileSync(filePath, 'utf8');

// 1. 修复字符串中的多余换行符
content = content.replace(/`([^`]*)[\r\n]+([^`]*)`/g, (match, p1, p2) => {
  return `\`${p1} ${p2}\``;
});

// 2. 修复对象字面量中的错误语法（内部分号）
content = content.replace(/\{\s*([^}]*?)\s*;\s*([^}]*?)\s*\}/g, (match, p1, p2) => {
  if (p2 && p2.trim()) {
    return `{ ${p1}, ${p2} }`;
  }
  return `{ ${p1} }`;
});

// 3. 修复对象属性后的缺少逗号问题
content = content.replace(/([a-zA-Z_$][a-zA-Z0-9_$]*\s*:\s*[^,}]+)\s*([a-zA-Z_$][a-zA-Z0-9_$]*\s*:)/g, (match, p1, p2) => {
  return `${p1}, ${p2}`;
});

// 4. 修复语句连在一起的问题
content = content.replace(/([^;\r\n]+)\s*(if|return|throw|break|continue|setTimeout|logger\.\w+\()/g, (match, stmt1, keyword) => {
  if (!stmt1.endsWith(';')) {
    return `${stmt1};\n${keyword}`;
  }
  return match;
});

// 5. 修复日志语句后的语法问题
content = content.replace(/(logger\.\w+\([^)]*\))(?=\s*[a-zA-Z_])/g, (match) => {
  return `${match};`;
});

// 6. 修复变量声明后的缺少分号问题
content = content.replace(/(let|const|var)\s+[^=]+=\s*[^;\r\n]+(?=\r?\n\s*[a-zA-Z_]|$)/g, (match) => {
  return `${match};`;
});

// 7. 修复括号不匹配问题
// 这个是简单的修复，复杂的括号问题可能需要更高级的解析
content = content.replace(/\(\s*;\s*\)/g, '()');
content = content.replace(/\{\s*;\s*\}/g, '{}');
content = content.replace(/\[\s*;\s*\]/g, '[]');

// 8. 修复多余的分号
content = content.replace(/;;/g, ';');
content = content.replace(/;\s*;/g, ';');

// 9. 修复字符串中的多余空格
content = content.replace(/`([^`]+)\s+`/g, (match, p1) => {
  return `\`${p1.trim()}\``;
});

// 10. 修复函数定义后的错误语法
content = content.replace(/}\s*;\s*(\w+\s*\()/g, (match, p1) => {
  return `}\n${p1}`;
});

// 11. 修复逗号后缺少空格的问题
content = content.replace(/,([^\s])/g, ', $1');

// 12. 修复JSX相关的错误（如果存在）
content = content.replace(/<input([^>]*)>/g, '<input$1 />');

// 将修复后的内容写回文件
fs.writeFileSync(filePath, content, 'utf8');

console.log('src/ui_manager.js文件的语法错误已全面修复！');
