---
version: 1.0
last_updated: 2025-11-08
author: Sut
changelog: 初始创建
---

# 开发指南

本指南旨在帮助开发者了解如何参与Douyin Tool项目的开发工作。

## 开发环境搭建

### 前置要求

- Node.js (v14+)
- Git
- 现代浏览器（推荐Chrome或Edge）

### 克隆仓库

```bash
git clone https://github.com/sutchan/douyin_tool.git
cd douyin_tool
```

### 项目结构

```
douyin_tool/
├── src/             # 源代码目录
│   ├── main.js      # 主入口文件
│   ├── config.js    # 配置管理
│   ├── ui_manager.js # UI管理
│   ├── styles/      # 样式文件
│   └── utils/       # 工具函数
├── dist/            # 构建输出目录
├── docs/            # 文档目录
├── build.js         # 构建脚本
└── package.json     # 项目配置
```

## 开发流程

### 1. 安装依赖

项目使用npm管理依赖，安装命令：

```bash
npm install
```

### 2. 本地开发

修改源代码后，可以使用以下命令构建项目：

```bash
node build.js
```

构建后的文件将输出到`dist`目录。

### 3. 测试方式

- 在浏览器中安装生成的用户脚本
- 访问抖音网页版测试功能
- 使用浏览器开发者工具调试

## 代码规范

### JavaScript规范

- 使用ES6+语法
- 遵循函数式编程风格
- 避免全局变量污染
- 函数应该有清晰的单一职责
- 为公共API添加JSDoc注释

### CSS规范

- 使用语义化的类名
- 采用BEM命名规范
- 避免使用ID选择器
- 使用CSS变量实现主题
- 保持样式模块化

## 提交规范

### Git提交消息

提交消息应遵循以下格式：

```
<type>: <description>

[optional body]

[optional footer]
```

类型包括：
- `feat`: 新功能
- `fix`: 修复bug
- `docs`: 文档变更
- `style`: 代码风格调整
- `refactor`: 代码重构
- `test`: 测试相关
- `chore`: 构建过程或辅助工具变动

## 贡献指南

1. Fork项目仓库
2. 创建功能分支（`git checkout -b feature/amazing-feature`）
3. 提交更改（`git commit -m 'feat: add some amazing feature'`）
4. 推送到分支（`git push origin feature/amazing-feature`）
5. 开启Pull Request

## 常见问题

### 开发调试技巧

- 使用`console.log`进行调试
- 利用浏览器的Performance面板分析性能
- 使用Source Map便于调试压缩后的代码

### 构建问题排查

- 检查Node.js版本
- 确认依赖安装正确
- 查看构建日志中的错误信息

## 版本控制

项目使用语义化版本（SemVer）规范：
- 主版本号：不兼容的API更改
- 次版本号：向下兼容的功能性新增
- 修订号：向下兼容的问题修正