const fs = require('fs');
const path = require('path');

// 读取src/ui_manager.js文件
const filePath = path.join(__dirname, 'src', 'ui_manager.js');
let content = fs.readFileSync(filePath, 'utf8');

// 1. 修复语句连在一起的问题
// 例如：console.log('test') if (condition) return;
content = content.replace(/([^;\r\n]+)\s*(if|return|throw|break|continue)\s*(\([^)]*\)|[^;\r\n]+)/g, (match, stmt1, keyword, stmt2) => {
  return `${stmt1};\n    ${keyword} ${stmt2}`;
});

// 2. 修复缺少分号的问题
// 例如：let a = 1
content = content.replace(/(let|const|var)\s+[^=]+=\s*[^;\r\n]+(?=\r?\n|\r|$)/g, (match) => {
  return `${match};`;
});

// 3. 修复函数调用后缺少分号的问题
content = content.replace(/(logger\.\w+\([^)]*\))(?=\s*\r?\n\s*[a-zA-Z_])/g, (match) => {
  return `${match};`;
});

// 4. 修复对象字面量中的语法错误
// 例如：{ key: value; }
content = content.replace(/(\{[^}]*?)\s*;\s*([^}]*?\})/g, (match, before, after) => {
  return `${before} ${after}`;
});

// 5. 修复数组字面量中的语法错误
// 例如：[item1; item2]
content = content.replace(/(\[[^\]]*?)\s*;\s*([^\]]*?\])/g, (match, before, after) => {
  return `${before}, ${after}`;
});

// 6. 修复右花括号后的多余分号
content = content.replace(/\}\s*;\s*(else|catch|finally)/g, (match, keyword) => {
  return `} ${keyword}`;
});

// 7. 修复连续的右花括号问题
content = content.replace(/\}\s*\}\s*;\s*([a-zA-Z_])/g, (match, start) => {
  return `}};\n    ${start}`;
});

// 8. 修复特定行的语法错误
// 第1438行：修复重复声明observer变量的问题
content = content.replace(/const observer\s*=\s*new IntersectionObserver\(([^)]*)\);\s*const observer\s*=/g, (match, params) => {
  return `const observer = new IntersectionObserver(${params});\n    const observer2 =`;
});

// 第1648行：修复意外的关键字或标识符问题
content = content.replace(/\s*this\s*\.\s*applyVideoCustomizations\s*\(\)\s*;/g, (match) => {
  return `\n    this.applyVideoCustomizations();`;
});

// 9. 修复缩进问题
content = content.replace(/(?<!\r\n|\r|^)\s*}/g, (match) => {
  return `\n${match}`;
});

// 将修复后的内容写回文件
fs.writeFileSync(filePath, content, 'utf8');

console.log('src/ui_manager.js文件的语法错误已修复！');
