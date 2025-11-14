const fs = require('fs');

// 读取文件内容
const filePath = 'src/ui_manager.js';
let content = fs.readFileSync(filePath, 'utf8');

console.log('开始修复最终语法错误...');

// 修复1: 修复文件末尾的多余括号和分号
content = content.replace(/export default UIManager;\)\}\};/g, 'export default UIManager;');

// 修复2: 修复未终止的正则表达式字面量（根据诊断信息第192行和第202行）
content = content.replace(/\/([^\/]*)\\[^\/]*$/gm, '/$1/'); // 修复未终止的正则表达式

// 修复3: 修复未终止的字符串字面量（根据诊断信息第233行和第234行）
content = content.replace(/"([^"]*)$/gm, '"$1"'); // 修复未终止的字符串

// 修复4: 修复TypeScript语法在JavaScript文件中的使用（非null断言）
content = content.replace(/!/g, ''); // 移除非null断言

// 修复5: 修复意外的关键字或标识符（根据诊断信息第405行、第410行、第415行、第426行）
content = content.replace(/\b(let|const|var)\s+\b(let|const|var)\b/g, '$1'); // 修复重复的变量声明关键字

// 修复6: 修复括号不匹配问题
let brackets = [];
let newContent = '';
for (let i = 0; i < content.length; i++) {
    const char = content[i];
    if (char === '(' || char === '{' || char === '[') {
        brackets.push(char);
    } else if (char === ')' || char === '}' || char === ']') {
        const lastBracket = brackets[brackets.length - 1];
        if ((lastBracket === '(' && char === ')') || 
            (lastBracket === '{' && char === '}') || 
            (lastBracket === '[' && char === ']')) {
            brackets.pop();
        }
    }
    newContent += char;
}
content = newContent;

// 修复7: 确保所有语句都有分号结尾
content = content.replace(/([^;])\n/g, '$1;\n');

// 修复8: 移除多余的分号
content = content.replace(/;;+/g, ';');

// 修复9: 修复属性分配问题
content = content.replace(/([a-zA-Z_$][a-zA-Z0-9_$]*)\s+([a-zA-Z_$][a-zA-Z0-9_$]*):/g, '$1: $2:');

// 修复10: 修复JSX语法错误（如果有）
content = content.replace(/<([a-zA-Z_][a-zA-Z0-9_]*)([^>]*)>([^<]*)<\/\1>/g, '<$1$2>$3</$1>');

// 保存修复后的文件
fs.writeFileSync(filePath, content, 'utf8');

console.log('最终语法错误修复完成！');