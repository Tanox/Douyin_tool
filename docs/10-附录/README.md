---
version: 1.3
last_updated: 2025-11-27
author: Sut
changelog: "修复编码问题，更新附录内容，统一格式规范"
---

# 附录
本文档提供了抖音UI定制器(DOUYIN TOOL)的完整参考资料，包括技术栈、API说明、快捷键设置、配置说明和常见问题等。
## 目录
- [技术栈说明](#技术栈说明)
- [API参考](#api参考)
- [快捷键设置](#快捷键设置)
- [配置说明](#配置说明)
- [常见问题](#常见问题)
- [浏览器兼容性](#浏览器兼容性)
- [开发工具](#开发工具)
- [性能优化建议](#性能优化建议)

## 技术栈说明
### 核心Web API

- **localStorage** - 用于存储用户配置信息
- **MutationObserver** - 用于监听DOM变化，实现界面动态调整
- **DOM API** - 用于操作页面元素和结构
- **CSSStyleSheet** - 用于动态管理样式表

### JavaScript技术
- **ES6+** - 使用现代JavaScript特性
  - 箭头函数
  - 模板字符串
  - 解构赋值
  - Promise
  - 类和模块

### CSS技术
- **CSS变量** - 实现主题定制
- **Flexbox/Grid** - 布局管理
- **媒体查询** - 响应式设计
- **CSS动画** - 提升用户体验

## API参考
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

#### UI管理器
```javascript
// 初始化UI管理器
uiManager.init();

// 切换主题
uiManager.switchTheme(theme);

// 显示/隐藏元素
uiManager.toggleElement(elementId, visible);

// 调整布局
uiManager.adjustLayout(layout);
```

## 快捷键设置
以下是抖音UI定制器支持的快捷键：

| 快捷键 | 功能说明 |
|-------|---------|
| `Ctrl+Shift+D` | 切换浅色/深色主题 |
| `Ctrl+Shift+H` | 显示/隐藏配置面板 |
| `Ctrl+Shift+R` | 重置所有配置 |

## 配置说明
抖音UI定制器的配置存储在localStorage中，键名为`douyin_tool_config`。配置格式如下：

```json
{
  "theme": "default", // 主题，default(默认) 或 dark(深色)
  "elements": {       // 元素显示控制
    "sidebar": true,  // 侧边栏
    "comments": true, // 评论区
    "ads": false      // 广告
  },
  "layout": "default", // 布局类型
  "showConfig": true   // 是否显示配置面板
}
```

## 常见问题
### 1. 为什么脚本无法正常工作？
**解决方法**：
- 确保已正确安装脚本管理器(如Tampermonkey或Violentmonkey)
- 确保抖音网站已在脚本的匹配URL列表中
- 刷新抖音页面后重试
- 检查浏览器控制台是否有错误信息

### 2. 如何恢复默认配置？
**解决方法**：
- 点击配置面板中的"重置配置"按钮
- 或使用快捷键 `Ctrl+Shift+R`

### 3. 脚本支持哪些浏览器？
**支持的浏览器**：
- Chrome 80+
- Firefox 75+
- Edge 80+
- Safari 13+

### 4. 如何反馈问题或提出建议？
**解决方法**：
- 在GitHub仓库中提交Issue
- 提供详细的问题描述和复现步骤

## 浏览器兼容性
抖音UI定制器经过测试，在以下浏览器中可以正常工作：

| 浏览器 | 最低版本 |
|-------|---------|
| Chrome | 80+ |
| Firefox | 75+ |
| Edge | 80+ |
| Safari | 13+ |

## 开发工具
- **编辑器**：VS Code
- **构建工具**：Vite
- **版本控制**：Git
- **包管理**：npm

## 性能优化建议
- 避免频繁的DOM操作
- 使用事件委托减少事件监听器数量
- 合理使用缓存减少重复计算
- 优化CSS选择器，避免复杂的后代选择器
- 延迟加载非关键资源