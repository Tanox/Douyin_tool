---
version: 1.0
last_updated: 2025-11-08
author: SutChan
changelog: "从旧文档迁移并整合"
---
# 抖音Web端界面UI定制工具 - API文档

本文档详细描述抖音Web端界面UI定制工具的核心函数、类和API，供开发者参考和使用。

## 目录

- [主模块API](#主模块api)
- [配置管理API](#配置管理api)
- [UI管理器API](#ui管理器api)
- [工具函数API](#工具函数api)
- [构建系统API](#构建系统api)

## 主模块API

### init()

**功能**：初始化抖音UI定制工具

**调用时机**：页面加载完成后自动调用

**流程**：
1. 加载配置
2. 初始化UI管理器
3. 注入样式
4. 监听页面变化
5. 创建浮动设置按钮
6. 检查更新

```javascript
// 初始化函数
export function init() {
  console.log('抖音UI定制工具已启动');
  
  // 加载配置
  const config = loadConfig();
  
  // 初始化UI管理器
  const uiManager = new UIManager(config);
  
  // 注入样式
  injectStyles(config.theme);
  
  // 监听页面变化
  observePageChanges(uiManager);
  
  // 创建浮动设置按钮
  createFloatingSettingsButton(uiManager);
  
  // 检查是否需要进行自动更新检查
  if (shouldCheckForUpdates()) {
    checkForUpdates(false);
  }
}
```

### injectStyles(theme)

**功能**：根据主题注入相应的CSS样式

**参数**：
- `theme`: 字符串，主题名称（'light' 或 'dark'）

**流程**：
1. 移除可能存在的旧样式
2. 创建新的样式元素
3. 根据主题选择样式内容
4. 注入自定义样式

```javascript
/**
 * 注入样式
 * @param {string} theme - 主题名称
 */
function injectStyles(theme) {
  // 移除可能存在的旧样式
  const oldStyle = document.getElementById('douyin-ui-customizer-styles');
  if (oldStyle) {
    oldStyle.remove();
  }
  
  // 注入新样式
  const styleElement = document.createElement('style');
  styleElement.id = 'douyin-ui-customizer-styles';
  
  // 根据主题选择样式
  if (theme === 'dark') {
    styleElement.textContent = darkStyles;
  } else {
    styleElement.textContent = defaultStyles;
  }
  
  document.head.appendChild(styleElement);
}
```

## 配置管理API

### loadConfig()

**功能**：从本地存储加载配置

**返回值**：配置对象，包含所有设置项

**流程**：
1. 从localStorage读取配置
2. 验证配置完整性
3. 合并默认配置
4. 返回最终配置

### saveConfig(config)

**功能**：保存配置到本地存储

**参数**：
- `config`: 对象，包含要保存的配置项

**流程**：
1. 验证配置有效性
2. 序列化配置为JSON字符串
3. 保存到localStorage
4. 触发配置变更事件

### exportConfig()

**功能**：导出当前配置为可分享的字符串

**返回值**：字符串，包含加密或编码后的配置数据

### importConfig(configStr)

**功能**：从字符串导入配置

**参数**：
- `configStr`: 字符串，包含加密或编码后的配置数据

**返回值**：布尔值，表示导入是否成功

### resetConfig()

**功能**：重置所有配置为默认值

**流程**：
1. 加载默认配置
2. 保存到本地存储
3. 触发配置重置事件

## UI管理器API

### UIManager类

**功能**：管理UI元素和用户界面

**构造函数**：
```javascript
/**
 * UI管理器
 * @param {Object} config - 配置对象
 */
class UIManager {
  constructor(config) {
    this.config = config;
    this.settingsPanel = null;
    this.isPanelVisible = false;
  }
}
```

### applySettings()

**功能**：应用用户配置到UI

**流程**：
1. 获取页面元素
2. 根据配置修改元素显示状态
3. 应用样式修改
4. 更新UI状态

### createSettingsPanel()

**功能**：创建设置面板UI

**返回值**：DOM元素，设置面板

**流程**：
1. 创建面板容器
2. 添加选项卡和设置项
3. 绑定事件处理器
4. 设置初始样式

### updateSettingsPanel()

**功能**：根据当前配置更新设置面板

**参数**：
- `config`: 对象，新的配置对象

**流程**：
1. 更新内部配置引用
2. 修改面板中各控件的状态
3. 应用主题变更（如果有）

## 工具函数API

### DOM操作工具 (utils/dom.js)

#### findElement(selector, context)

**功能**：在指定上下文中查找元素

**参数**：
- `selector`: 字符串，CSS选择器
- `context`: DOM元素，查找上下文（可选，默认为document）

**返回值**：DOM元素或null

#### findElements(selector, context)

**功能**：查找匹配选择器的所有元素

**参数**：同findElement

**返回值**：DOM元素数组

#### addStyle(element, styles)

**功能**：为元素添加样式

**参数**：
- `element`: DOM元素
- `styles`: 对象，样式属性和值

#### toggleElement(element, show)

**功能**：显示或隐藏元素

**参数**：
- `element`: DOM元素
- `show`: 布尔值，是否显示

### 存储工具 (utils/storage.js)

#### setItem(key, value)

**功能**：存储数据到localStorage

**参数**：
- `key`: 字符串，存储键名
- `value`: 任意类型，存储值

#### getItem(key, defaultValue)

**功能**：从localStorage获取数据

**参数**：
- `key`: 字符串，存储键名
- `defaultValue`: 任意类型，默认值（可选）

**返回值**：存储的值或默认值

#### removeItem(key)

**功能**：从localStorage删除数据

**参数**：
- `key`: 字符串，存储键名

## 构建系统API

### build.js

**功能**：构建脚本，用于生成油猴脚本文件

**主要功能**：
1. 读取源代码文件
2. 合并文件内容
3. 添加油猴脚本头信息
4. 生成最终脚本文件
5. 自动更新版本号

### 构建命令

```bash
# 构建脚本
npm run build

# 开发模式（自动监听文件变化并重新构建）
npm run dev
```

### 构建配置

构建配置在`package.json`中定义，主要包括：
- 入口文件
- 输出目录
- 版本号规则
- 脚本元数据