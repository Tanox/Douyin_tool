# 抖音UI定制工具

[![GitHub stars](https://img.shields.io/github/stars/SutChan/douyin_tool?style=flat-square)](https://github.com/SutChan/douyin_tool/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/SutChan/douyin_tool?style=flat-square)](https://github.com/SutChan/douyin_tool/network/members)
[![License](https://img.shields.io/github/license/SutChan/douyin_tool?style=flat-square)](https://github.com/SutChan/douyin_tool/blob/main/LICENSE)
[![Tampermonkey](https://img.shields.io/badge/Tampermonkey-Compatible-green?style=flat-square)](https://www.tampermonkey.net/)

抖音Web端界面定制工具，让你可以隐藏礼物特效、调整弹幕样式、切换主题、管理布局等。

## 功能

### 视频界面
- 隐藏/显示视频控制栏
- 调整视频布局大小
- 显示/隐藏作者信息、音乐信息、推荐内容
- 播放控制（自动播放、循环播放）
- 主题切换（浅色/深色/极简）

### 直播间
- 隐藏礼物动画和特效
- 自定义弹幕样式（字体、颜色、透明度、速度）
- 隐藏广告和推荐内容
- 控制音量
- 调整直播画面比例

### 通用功能
- 拖拽调整设置面板位置
- 导入/导出配置
- 自动检测更新
- 性能监控

## 安装

1. 安装 [Tampermonkey](https://www.tampermonkey.net/)
2. [点击安装脚本](https://www.tampermonkey.net/script_installation.php#url=https://github.com/SutChan/douyin_tool/raw/main/dist/douyin_ui_customizer.user.js)

## 使用

1. 访问 [抖音网页版](https://www.douyin.com/)
2. 点击页面右下角的设置按钮 ⚙️
3. 在面板中选择要隐藏或调整的元素
4. 保存后立即生效

### 隐藏礼物特效

进入「直播设置」，关闭「显示礼物动画」即可隐藏所有礼物相关元素。

### 调整弹幕样式

在「直播设置」的弹幕选项中，可以设置：
- 字体大小（12-36像素）
- 弹幕颜色
- 透明度（0.1-1.0）
- 移动速度（快速/正常/慢速）

## 配置管理

- **导出配置**：将当前设置保存为文件
- **导入配置**：从文件恢复设置
- **重置配置**：恢复所有设置为默认值

## 项目结构

```
douyin_tool/
├── src/                 # 源代码
│   ├── controllers/     # 功能控制器
│   ├── styles/          # 样式和主题
│   ├── ui/              # 界面组件
│   ├── utils/           # 工具函数
│   ├── config.ts        # 配置管理
│   ├── main.ts          # 入口文件
│   └── ui_manager.ts    # UI管理器
├── dist/                # 构建产物
├── docs/                # 详细文档
└── package.json         # 项目配置
```

## 开发

```bash
# 克隆项目
git clone https://github.com/SutChan/douyin_tool.git
cd douyin_tool

# 安装依赖
npm install

# 本地开发
npm run dev

# 构建发布版本
npm run build
```

构建完成后，打开 `dist/douyin_ui_customizer.user.js` 复制内容到油猴中创建新脚本。

## 兼容性

- Chrome / Edge（需安装 Tampermonkey）
- Firefox（需安装 Tampermonkey 或 Greasemonkey）
- 其他支持用户脚本的浏览器

## 更新日志

详细的更新内容请查看 [CHANGELOG.md](CHANGELOG.md)。

## 许可证

[MIT](LICENSE)

## 问题反馈

如果你遇到问题或有功能建议，请在 [GitHub Issues](https://github.com/SutChan/douyin_tool/issues) 中反馈。

## 作者

[SutChan](https://github.com/SutChan)
