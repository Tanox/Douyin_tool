---
version: 1.2
last_updated: 2024-06-19
author: Sut
changelog: "修复编码问题，重写开发指南README"
---

# 开发指南

欢迎阅读抖音UI定制器开发指南，本指南将帮助您了解项目的开发流程、环境配置和编码规范。

## 开发环境要求

### 系统要求
- Node.js (v14+)
- Git
- 现代浏览器(推荐Chrome)

### 克隆项目
```bash
git clone https://github.com/sutchan/douyin_tool.git
cd douyin_tool
```

### 项目结构
```
douyin_tool/
├── src/             # 源代码目录
│   ├── main.js      # 主程序入口
│   ├── config.js    # 配置管理
│   ├── ui_manager.js # UI管理器
│   ├── styles/      # 样式文件目录
│   └── utils/       # 工具函数目录
├── dist/            # 构建输出目录
├── docs/            # 文档目录
├── build.js         # 构建脚本
└── package.json     # 项目依赖配置
```

## 开发流程

### 1. 安装依赖
项目使用npm管理依赖，执行以下命令安装：
```bash
npm install
```

### 2. 构建项目
运行构建脚本生成用户脚本：
```bash
node build.js
```

构建产物将生成在 `dist` 目录中。

### 3. 测试与调试
- 使用浏览器插件(如Tampermonkey)加载构建后的脚本
- 在抖音网页上测试功能
- 使用浏览器开发者工具进行调试

## 编码规范

### JavaScript编码规范
- 使用ES6+语法
- 使用2个空格进行缩进
- 语句结束使用分号
- 字符串使用双引号
- 变量/函数使用小驼峰命名法
- 类使用大驼峰命名法
- 常量使用全大写并使用下划线分隔
- 所有函数必须包含JSDoc注释

### CSS编码规范
- 使用BEM命名规范
- 避免CSS变量管理问题
- 使用Flexbox和Grid布局
- 避免使用!important
- 组件样式模块化

## 版本控制

### Git提交规范

提交信息应遵循以下格式：

```
<type>: <description>

[optional body]

[optional footer]
```

提交类型包括：
- `feat`: 添加新功能
- `fix`: 修复bug
- `docs`: 更新文档
- `style`: 代码格式调整
- `refactor`: 代码重构
- `test`: 添加或修改测试
- `chore`: 构建或依赖更新

## 贡献指南

1. Fork项目仓库
2. 创建特性分支：`git checkout -b feature/amazing-feature`
3. 提交修改：`git commit -m 'feat: add some amazing feature'`
4. 推送到分支：`git push origin feature/amazing-feature`
5. 提交Pull Request

## 性能优化

### 开发注意事项
- 避免在生产环境使用`console.log`
- 使用防抖和节流优化事件处理
- 禁用Source Map以减小文件大小

### 构建优化

- 使用UglifyJS压缩代码
- 合并和压缩CSS文件
- 移除未使用的代码

## 版本管理

项目使用语义化版本(SemVer)进行版本管理：
- 主版本号(Major)：不兼容的API变更
- 次版本号(Minor)：向下兼容的功能性新增
- 补丁号(Patch)：向下兼容的问题修复
