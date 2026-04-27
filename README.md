# 抖音Web端界面UI定制工具

[![GitHub stars](https://img.shields.io/github/stars/SutChan/douyin_tool?style=flat-square)](https://github.com/SutChan/douyin_tool/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/SutChan/douyin_tool?style=flat-square)](https://github.com/SutChan/douyin_tool/network/members)
[![License](https://img.shields.io/github/license/SutChan/douyin_tool?style=flat-square)](https://github.com/SutChan/douyin_tool/blob/main/LICENSE)
[![Tampermonkey](https://img.shields.io/badge/Tampermonkey-Compatible-green?style=flat-square)](https://www.tampermonkey.net/)

## 项目简介

抖音Web端界面UI定制工具是一款专注于提升抖音Web端浏览体验的浏览器扩展/用户脚本。通过DOM操作和CSS注入实现界面定制，采用模块化设计，低侵入性，不修改页面核心结构，保证了与抖音官方功能的最大兼容性。

## 功能特性

### 短视频界面定制

- 视频播放控制栏样式自定义
- 视频显示区域大小调整
- 作者信息、头像、音乐信息、描述显示控制
- 界面元素布局调整
- 背景色和主题切换

### 直播间界面定制

- 礼物动画和特效隐藏（增强版）
- 弹幕样式自定义（字体、颜色、透明度、速度）
- 聊天区域、礼物面板显示控制
- 直播间推荐和广告屏蔽
- 直播画面比例调整
- 用户评论/礼物通知屏蔽

### 通用功能

- 设置面板拖拽
- 浅色/深色主题切换
- 配置导出/导入
- 自动版本更新检查

## 技术架构

### 核心模块

```
src/
├── main.js              # 入口文件，负责模块初始化和协调
├── config.js             # 配置管理，处理设置存储和加载
├── ui_manager.js         # UI管理核心，协调各模块与页面的交互
├── modules/
│   ├── video_player.js   # 视频播放器定制
│   ├── live_room.js      # 直播间定制
│   ├── theme.js          # 主题管理
│   ├── filter.js         # 内容过滤
│   └── common.js         # 通用功能
├── utils/
│   ├── dom.js            # DOM操作封装
│   ├── storage.js        # localStorage封装
│   ├── logger.js         # 日志系统
│   └── event_emitter.js  # 事件总线
└── styles/
    ├── default.css       # 默认主题
    ├── dark.css          # 暗黑主题
    └── custom.css        # 自定义样式模板
```

### 技术实现

- **模块化架构**：采用ES6模块化设计，各功能组件独立分离
- **事件驱动**：通过事件总线实现模块间解耦通信
- **配置管理**：localStorage存储，支持导入导出
- **样式注入**：通过创建style元素动态注入CSS
- **版本管理**：构建时自动递增版本号

### 兼容性

- Chrome / Edge (Tampermonkey)
- Firefox (Greasemonkey / Tampermonkey)
- 其他兼容用户脚本管理器的浏览器

## 快速开始

### 安装

1. 安装 [Tampermonkey](https://www.tampermonkey.net/) 或 [Greasemonkey](https://addons.mozilla.org/zh-CN/firefox/addon/greasemonkey/)
2. [一键安装脚本](https://www.tampermonkey.net/script_installation.php#url=https://github.com/SutChan/douyin_tool/raw/main/dist/douyin_ui_customizer.user.js)

### 本地开发

```bash
git clone https://github.com/SutChan/douyin_tool.git
cd douyin_tool
npm install
npm run build
```

构建完成后，打开 `dist/douyin_ui_customizer.user.js` 并复制内容到油猴中创建新脚本。

## 使用说明

1. 访问 [抖音网页版](https://www.douyin.com/)
2. 点击油猴图标，选择本脚本设置选项
3. 在设置面板中调整界面元素
4. 保存后设置立即生效

### 礼物隐藏

进入「直播间设置」，取消勾选「显示礼物动画」即可隐藏所有礼物相关元素。

### 配置管理

- 「导出配置」保存个性化设置
- 「导入配置」在不同设备间恢复设置
- 「重置」恢复默认配置

## 项目结构

```
douyin_tool/
├── src/
│   ├── main.js           # 入口文件
│   ├── config.js         # 配置管理
│   ├── ui_manager.js     # UI管理核心
│   ├── modules/          # 功能模块
│   ├── utils/            # 工具函数
│   └── styles/           # 样式文件
├── build/                # 构建脚本
├── dist/                 # 构建产物
└── docs/                 # 详细文档
```

## 详细文档

- [安装指南](docs/03-安装指南/README.md)
- [功能说明](docs/04-功能说明/README.md)
- [API文档](docs/05-技术文档/api.md)
- [更新日志](docs/CHANGELOG.md)

## 许可证

[MIT](LICENSE)

## 作者

[SutChan](https://github.com/SutChan)
