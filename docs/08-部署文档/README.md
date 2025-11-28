---
version: 1.3
last_updated: 2025-11-27
author: Sut
changelog: "修复编码问题，更新部署文档内容，统一格式规范"
---

# 抖音UI定制器 - 部署文档
## 部署文档概述
本文档详细介绍抖音UI定制器的部署、安装和发布流程，帮助用户快速上手使用该工具。
## 环境要求
### 开发环境要求
- Node.js (v14+)
- npm 或 yarn 包管理器

### 运行环境要求
1. **浏览器要求**
   - Chrome 60+
   - Firefox 55+
   - Edge 79+
   - Safari 13+

2. **用户脚本管理器**
   - Tampermonkey (推荐)
   - Violentmonkey
   - Greasemonkey (Firefox)

## 部署步骤
### 1. 克隆项目

```bash
git clone https://github.com/sutchan/douyin_tool.git
cd douyin_tool
```

### 2. 安装依赖

```bash
npm install
```

### 3. 构建项目

```bash
npm run build
```

### 4. 构建产物

构建完成后，产物将生成在 `dist/` 目录中：
- `douyin_ui_customizer.user.js` - 主用户脚本文件
- `manifest.json` - 浏览器扩展配置文件(如果支持)

## 安装方法

### 1. 通过浏览器扩展安装
#### Tampermonkey/Violentmonkey 安装步骤
1. 确保已安装 Tampermonkey 或 Violentmonkey 浏览器扩展
2. 打开项目的 GitHub 页面，进入 `dist` 目录
3. 点击 `douyin_ui_customizer.user.js` 文件
4. 点击 "Raw" 按钮，脚本管理器将自动识别并提示安装
5. 点击 "安装" 按钮完成安装

#### 手动安装步骤
1. 构建项目获取 `douyin_ui_customizer.user.js` 文件
2. 打开浏览器的用户脚本管理器
3. 点击 "添加新脚本"
4. 将 `douyin_ui_customizer.user.js` 文件内容复制粘贴到编辑器中
5. 点击 "保存" 完成安装

### 2. 本地开发模式
对于开发者，可以使用开发模式运行项目：

```bash
npm run dev
```

这将启动开发服务器，自动重新构建脚本。

## 发布平台

### 推荐发布平台
- **Greasy Fork** - 最大的用户脚本分享平台
- **OpenUserJS** - 开源用户脚本社区
- **GitHub Pages** - 可以搭建自己的发布页面

### 发布注意事项
- 确保脚本符合各平台的发布规则
- 提供详细的安装说明和使用文档
- 定期更新脚本以修复问题和添加新功能
- 响应用户反馈和问题

## 发布流程

### 发布前准备
1. 更新 `package.json` 中的版本号
2. 更新 `CHANGELOG.md` 记录版本变更
3. 确保所有功能正常工作
4. 执行测试验证脚本稳定性

### 发布步骤
1. 构建生产版本
2. 推送代码到 GitHub
3. 创建 GitHub Release
4. 上传构建产物到发布平台
5. 更新文档中的版本信息

## 验证清单

### 部署前验证
- [ ] 项目代码已通过所有测试
- [ ] 依赖已正确安装
- [ ] 构建版本正常工作
- [ ] 构建产物符合预期

### 安装验证
- [ ] Chrome 浏览器安装成功
- [ ] Firefox 浏览器安装成功
- [ ] Edge 浏览器安装成功
- [ ] Safari 浏览器安装成功

### 功能验证
- [ ] 脚本可以正常加载
- [ ] 所有功能模块正常工作
- [ ] 页面显示正常
- [ ] 性能符合要求

## 常见问题与解决方案
1. **脚本无法安装**
   - 确保已正确安装用户脚本管理器
   - 检查浏览器版本是否符合要求
   - 尝试手动安装脚本

2. **脚本功能异常**
   - 检查抖音网站是否更新了页面结构
   - 查看浏览器控制台是否有错误信息
   - 尝试重新安装最新版本的脚本

3. **性能问题**
   - 确保浏览器已更新到最新版本
   - 关闭其他可能冲突的扩展
   - 反馈问题到 GitHub Issues

## 联系方式

如果在部署或使用过程中遇到问题，请通过以下方式联系：
- GitHub Issues: https://github.com/sutchan/douyin_tool/issues
- 邮箱: [您的邮箱地址]

---

本文档由 Sut 创建并维护，最后更新时间：2025年11月27日