---
version: 1.0
last_updated: 2025-11-08
author: Sut
changelog: 初始创建
---

# 附录

本附录提供Douyin Tool项目的补充资料和参考信息。

## 目录

- [技术参考](#技术参考)
- [API文档](#api文档)
- [快捷键](#快捷键)
- [配置说明](#配置说明)
- [常见问题](#常见问题)
- [术语表](#术语表)
- [相关资源](#相关资源)
- [许可证](#许可证)

## 技术参考

### 浏览器API

- **localStorage** - 用于存储用户配置
- **MutationObserver** - 监听DOM变化
- **DOM API** - 用于操作页面元素
- **CSSStyleSheet** - 用于动态修改样式

### JavaScript特性

- **ES6+** - 使用的现代JavaScript特性
  - 箭头函数
  - 模板字符串
  - 解构赋值
  - Promise
  - 模块化

### CSS特性

- **CSS变量** - 用于主题实现
- **Flexbox/Grid** - 用于布局
- **媒体查询** - 用于响应式设计
- **CSS动画** - 用于提升用户体验

## API文档

### 核心API

#### 配置管理

```javascript
// 加载配置
config.load();

// 保存配置
config.save();

// 获取配置项
config.get(key, defaultValue);

// 设置配置项
config.set(key, value);

// 重置配置
config.reset();
```

#### UI管理

```javascript
// 初始化UI
uiManager.init();

// 切换主题
uiManager.switchTheme(theme);

// 控制元素显示/隐藏
uiManager.toggleElement(elementId, visible);

// 调整布局
uiManager.adjustLayout(layout);
```

## 快捷键

以下是工具支持的快捷键：

| 快捷键 | 功能描述 |
|-------|---------|
| `Ctrl+Shift+D` | 切换主题 |
| `Ctrl+Shift+H` | 显示/隐藏配置面板 |
| `Ctrl+Shift+R` | 重置所有设置 |

## 配置说明

用户配置存储在浏览器的localStorage中，键名为`douyin_tool_config`。配置采用JSON格式，主要包含以下字段：

```json
{
  "theme": "default", // 主题：default 或 dark
  "elements": {       // 元素显示控制
    "sidebar": true,
    "comments": true,
    "ads": false
  },
  "layout": "default", // 布局设置
  "showConfig": true   // 是否显示配置面板
}
```

## 常见问题

### 1. 工具安装后不生效怎么办？

**解决方案**：
- 确保已正确安装用户脚本管理器
- 确认脚本已启用
- 刷新抖音网页
- 检查是否有其他扩展冲突

### 2. 如何恢复默认设置？

**解决方案**：
- 打开配置面板
- 点击"重置设置"按钮
- 或使用快捷键 `Ctrl+Shift+R`

### 3. 工具支持哪些浏览器？

**支持的浏览器**：
- Chrome 80+
- Firefox 75+
- Edge 80+
- Safari 13+

### 4. 抖音网页更新后工具不工作了？

**解决方案**：
- 检查是否有工具更新
- 如果没有更新，可以在GitHub上提交Issue

## 术语表

| 术语 | 解释 |
|-----|------|
| 用户脚本 | 一种可以在浏览器中运行的JavaScript脚本，用于修改网页行为和样式 |
| Tampermonkey | 最流行的用户脚本管理器，支持Chrome、Firefox等浏览器 |
| DOM | 文档对象模型，网页的编程接口 |
| CSS | 层叠样式表，用于定义网页的视觉样式 |
| MutationObserver | 用于监控DOM变化的浏览器API |

## 相关资源

### 开发工具

- [Tampermonkey](https://www.tampermonkey.net/) - 流行的用户脚本管理器
- [Violentmonkey](https://violentmonkey.github.io/) - 开源用户脚本管理器
- [Node.js](https://nodejs.org/) - JavaScript运行环境

### 学习资源

- [MDN Web Docs](https://developer.mozilla.org/) - Web开发文档
- [JavaScript.info](https://javascript.info/) - JavaScript学习网站
- [CSS-Tricks](https://css-tricks.com/) - CSS学习资源

### 用户脚本平台

- [Greasy Fork](https://greasyfork.org/) - 用户脚本分享平台
- [OpenUserJS](https://openuserjs.org/) - 开源用户脚本平台

## 许可证

Douyin Tool 项目采用 MIT 许可证。详情请参阅项目根目录下的 [LICENSE](https://github.com/sutchan/douyin_tool/blob/main/LICENSE) 文件。

## 贡献者指南

如果您想为项目做出贡献，请参考 [开发指南](../06-开发指南/README.md) 和 [贡献指南](../guides/contributing_guide.md)。

## 更新日志

完整的更新日志请参阅 [CHANGELOG](../CHANGELOG.md) 文件。