# 抖音UI定制工具

让抖音网页版更好用！可以隐藏礼物特效、调整弹幕样式、切换主题等。

[![GitHub stars](https://img.shields.io/github/stars/SutChan/douyin_tool?style=flat-square)](https://github.com/SutChan/douyin_tool/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/SutChan/douyin_tool?style=flat-square)](https://github.com/SutChan/douyin_tool/network/members)
[![License](https://img.shields.io/github/license/SutChan/douyin_tool?style=flat-square)](https://github.com/SutChan/douyin_tool/blob/main/LICENSE)
[![Tampermonkey](https://img.shields.io/badge/Tampermonkey-Compatible-green?style=flat-square)](https://www.tampermonkey.net/)
[![Version](https://img.shields.io/badge/version-1.1.0-blue.svg?style=flat-square)](./package.json)

## 功能

### 直播功能
- **隐藏礼物特效** - 隐藏直播间里的礼物动画和特效
- **调整弹幕样式** - 修改字体大小、颜色、透明度、移动速度
- **隐藏广告推荐** - 隐藏直播间的广告和不相关内容
- **控制音量** - 快速调节直播音量
- **弹幕位置控制** - 支持弹幕位置、最大行数等高级设置

### 视频功能
- **隐藏界面元素** - 可以隐藏点赞、评论、分享等按钮
- **显示/隐藏信息** - 控制作者信息、音乐信息等是否显示
- **主题切换** - 支持浅色/深色模式
- **播放控制** - 自动播放、循环播放等设置

### 通用功能
- **拖拽设置面板** - 随意拖动调整位置
- **导入导出设置** - 备份和恢复你的配置
- **自动更新** - 有新版本时自动提醒
- **性能监控** - 实时监控脚本性能表现

## 技术架构

本工具采用模块化设计，主要包括以下核心模块：

- **核心入口 (index.ts / main.ts)**: 脚本的起点，负责初始化和加载其他模块。
- **配置管理 (config.ts)**: 负责用户设置的读取、写入和管理，支持 `localStorage` 持久化。
- **UI管理器 (ui_manager.ts)**: 负责创建、渲染和管理用户界面元素，包括设置面板、自定义组件等。
- **控制器模块 (elementController.ts, layoutController.ts)**: 负责监听页面变化和用户交互，驱动UI更新和功能执行。
- **UI组件系统 (ui/index.ts)**: 提供可复用的UI组件，如按钮、面板、滑块等。
- **工具函数 (utils/index.ts)**: 封装通用功能，如事件发射器 (`eventEmitter`)、DOM操作 (`dom`)、样式生成 (`styleGenerator`)、性能监控 (`performance`) 等。
- **样式管理 (styles/index.ts)**: 管理和注入CSS样式，包括主题切换功能 (`theme.ts`)。

整体架构遵循事件驱动和模块化原则，便于扩展和维护。

## 安装

### 第一步：安装 Tampermonkey 扩展

根据你的浏览器选择对应版本：

| 浏览器 | 推荐扩展 |
|-------|---------|
| Chrome | [Tampermonkey](https://www.tampermonkey.net/) |
| Edge | [Tampermonkey](https://www.tampermonkey.net/) |
| Firefox | [Tampermonkey](https://www.tampermonkey.net/) 或 Greasemonkey |

### 第二步：安装脚本

1. 点击上面的 Tampermonkey 官网链接安装扩展
2. 安装完成后，点击 [这里安装脚本](https://raw.githubusercontent.com/SutChan/douyin_tool/main/dist/douyin_ui_customizer.user.js)
3. Tampermonkey 会弹出安装确认，点击"安装"

## 使用方法

1. 打开 [抖音网页版](https://www.douyin.com/)
2. 进入任意直播间或视频页面
3. 点击页面右下角的 **⚙️** 按钮打开设置面板
4. 根据需要勾选要隐藏或调整的选项
5. 设置会自动保存并立即生效

### 隐藏礼物特效

1. 打开设置面板
2. 切换到「直播设置」标签
3. 找到「显示礼物动画」选项，关闭它
4. 礼物特效就会被隐藏

### 调整弹幕样式

1. 打开设置面板
2. 切换到「直播设置」标签
3. 找到弹幕相关设置：
   - **字体大小**：12-36 像素
   - **弹幕颜色**：输入颜色代码如 #FFFFFF
   - **透明度**：0.1（很淡）- 1.0（不透明）
   - **移动速度**：快速 / 正常 / 慢速

### 切换主题

1. 打开设置面板
2. 在「通用设置」中找到主题选项
3. 选择「浅色」或「深色」模式

## 常见问题

**Q: 安装后没反应？**
> 确保 Tampermonkey 扩展已启用，然后刷新抖音页面。

**Q: 如何恢复默认设置？**
> 打开 Tampermonkey 菜单，选择「抖音UI定制工具」→「重置所有设置」。

**Q: 想备份设置？**
> 在设置面板中找到「导出配置」，保存到文件。需要恢复时使用「导入配置」。

## 更新脚本

脚本会自动检查更新。如果想手动检查：
- 点击 Tampermonkey 图标
- 选择「抖音UI定制工具」→「检查更新」

## 兼容性

支持的浏览器：
- Chrome
- Microsoft Edge
- Firefox
- 其他基于 Chromium 的浏览器

## 问题反馈

遇到问题或有功能建议？
👉 [GitHub Issues](https://github.com/SutChan/douyin_tool/issues)

## 许可证

MIT License

## 作者

[SutChan](https://github.com/SutChan)
