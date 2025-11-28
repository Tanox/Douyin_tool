// ==UserScript==
// @name         抖音网页版UI定制工具
// @namespace    http://tampermonkey.net/
// @version 1.0.149
// @description  抖音Web端界面UI定制工具，可自定义短视频和直播间界面
// @author       SutChan
// @match        *://*.douyin.com/*
// @grant        GM_registerMenuCommand
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_addStyle
// @license      MIT
// ==/UserScript==

/**
 * 抖音Web端界面UI定制工具主入口
 * 作者：SutChan
 * 版本：1.0.148
 */

// 导入工具模块
import { debounce, getElement, addEvent, createElement, injectStyle } from './utils/dom.js';
import { getItem, setItem, NamespacedStorage } from './utils/storage.js';
import logger from './utils/logger.js';
import eventEmitter from './utils/eventEmitter.js';
import performanceMonitor from './utils/performance.js';
import configManager from './config.js';
import UIManager from './ui_manager.js';
import themeManager from './styles/theme.js';

// 当前脚本版本
const CURRENT_VERSION = '1.0.149';
// 更新检查间隔（毫秒）
const UPDATE_CHECK_INTERVAL = 24 * 60 * 60 * 1000; // 24小时

// 创建命名空间存储
const storage = new NamespacedStorage('douyin_tool');

// UI管理器实例
let uiManager = null;

/**
 * 检查脚本更新
 */
async function checkForUpdates(showNoUpdateMessage = false) {
  try {
    // 从GitHub获取最新版本的脚本
    const updateUrl = 'https://github.com/SutChan/douyin_tool/raw/main/dist/douyin_ui_customizer.user.js';
    
    GM_xmlhttpRequest({
      method: 'GET',
      url: updateUrl,
      onload: function(response) {
        if (response.status === 200) {
          // 从脚本头部提取版本号
          const scriptContent = response.responseText;
          const versionMatch = scriptContent.match(/@version\s+(\d+\.\d+\.\d+)/i);
          
          if (versionMatch && versionMatch[1]) {
            const latestVersion = versionMatch[1];
            
            // 比较版本号
            if (isNewerVersion(latestVersion, CURRENT_VERSION)) {
              if (confirm(`发现新版本 ${latestVersion}！是否更新脚本？\n\n当前版本：${CURRENT_VERSION}`)) {
                // 打开更新链接
                window.open(updateUrl, '_blank');
              }
            } else if (showNoUpdateMessage) {
              alert('您的脚本已是最新版本！');
            }
          }
        }
      },
      onerror: function() {
        if (showNoUpdateMessage) {
          alert('检查更新失败，请稍后重试。');
        }
      }
    });
  } catch (error) {
    logger.error('检查更新时发生错误：', error);
  }
}

/**
 * 比较版本号
 * @param {string} newVersion - 新版本号
 * @param {string} currentVersion - 当前版本号
 * @returns {boolean} 是否是新版本
 */
function isNewerVersion(newVersion, currentVersion) {
  const newParts = newVersion.split('.').map(Number);
  const currentParts = currentVersion.split('.').map(Number);
  
  for (let i = 0; i < newParts.length; i++) {
    if (newParts[i] > currentParts[i]) return true;
    if (newParts[i] < currentParts[i]) return false;
  }
  
  return false;
}

/**
 * 检查是否需要进行自动更新检查
 */
function shouldCheckForUpdates() {
  const lastCheckTime = getItem('lastUpdateCheckTime', 0);
  const now = Date.now();
  
  // 如果距离上次检查超过了设定的间隔时间
  if (now - lastCheckTime > UPDATE_CHECK_INTERVAL) {
    setItem('lastUpdateCheckTime', now);
    return true;
  }
  
  return false;
}

// 初始化函数
function init() {
  logger.info('抖音UI定制工具已启动');
  
  // 开始性能监控
  performanceMonitor.start();
  
  // 加载配置
  configManager.loadConfig();
  const config = configManager.getConfig();
  
  // 初始化UI管理器
  uiManager = new UIManager(config);
  
  // 初始化主题管理器
  themeManager.init(config.theme);
  
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
  
  // 设置错误处理
  setupErrorHandling();
  
  // 触发初始化完成事件
  eventEmitter.emit('tool.init.completed', { config });
}

/**
 * 注入样式
 * @param {string} theme - 主题名称
 */
async function injectStyles(theme) {
  try {
    // 使用主题管理器应用主题
    const success = await themeManager.applyTheme(theme);
    if (!success) {
      logger.warn('主题应用失败，使用备用样式注入');
      
      // 备用样式注入逻辑
      const oldStyle = document.getElementById('douyin-ui-customizer-styles');
      if (oldStyle) {
        oldStyle.remove();
      }
      
      // 注入新样式
      const styleElement = document.createElement('style');
      styleElement.id = 'douyin-ui-customizer-styles';
      
      // 根据主题选择样式
      // 备用样式逻辑：使用空字符串，因为主题管理器应该负责加载样式
      styleElement.textContent = '';
      
      document.head.appendChild(styleElement);
    }
    
    // 注入自定义样式
    const customStyle = document.createElement('style');
    customStyle.id = 'douyin-ui-customizer-custom';
    customStyle.textContent = generateCustomStyles();
    document.head.appendChild(customStyle);
    
    // 触发样式更新事件
    eventEmitter.emit('tool.styles.updated', { theme });
  } catch (error) {
    logger.error('注入样式失败:', error);
  }
}

/**
 * 生成自定义样式
 * @returns {string} 自定义CSS
 */
function generateCustomStyles() {
  const config = configManager.getConfig();
  let customCSS = '';
  
  // 添加用于隐藏元素的CSS类，确保优先级
  customCSS += `
    .douyin-ui-hidden {
      display: none !important;
      visibility: hidden !important;
      opacity: 0 !important;
      width: 0 !important;
      height: 0 !important;
      pointer-events: none !important;
      z-index: -1 !important;
    }
  `;
  
  // 短视频界面定制样式
  if (config.videoUI) {
    // 隐藏点赞按钮
    if (!config.videoUI.showLikeButton) {
      customCSS += '.like-button { display: none !important; }';
    }
    
    // 隐藏评论按钮
    if (!config.videoUI.showCommentButton) {
      customCSS += '.comment-button { display: none !important; }';
    }
    
    // 隐藏分享按钮
    if (!config.videoUI.showShareButton) {
      customCSS += '.share-button { display: none !important; }';
    }
    
    // 隐藏作者信息
    if (!config.videoUI.showAuthorInfo) {
      customCSS += '.author-info { display: none !important; }';
    }
    
    // 隐藏音乐信息
    if (!config.videoUI.showMusicInfo) {
      customCSS += '.music-info, .music-label, .sound-info { display: none !important; }';
    }
    
    // 隐藏视频描述
    if (!config.videoUI.showDescription) {
      customCSS += '.video-desc, .description, .video-content { display: none !important; }';
    }
    
    // 调整界面元素布局
    if (config.videoUI.layout) {
      // 这里可以根据配置添加相应的布局样式
    }
  }
  
  // 直播间界面定制样式
  if (config.liveUI) {
    // 隐藏礼物动画和相关元素（增强版，覆盖更多礼物元素）
    if (!config.liveUI.showGifts) {
      customCSS += `
        /* 礼物核心元素 */
        .gift-animation, .gift-container, .gift-effect, .gift-display,
        .present-animation, .reward-container, .award-animation,
        .animation-container, .live-gift, .live-gift-animation,
        /* 抖音常用礼物类名 */
        [class*="gift"], [class*="present"], [class*="reward"],
        [class*="award"], [class*="effect"], [class*="animation"],
        [class*="特效"], [class*="礼物"], [class*="打赏"],
        [class*="连击"], [class*="豪华礼物"], [class*="礼物特效"],
        /* 礼物按钮和面板 */
        .gift-panel, .gift-button, .send-gift-button,
        /* 礼物动画容器 */
        [style*="animation:"], [style*="transition:"], 
        /* 高z-index可能是礼物的元素 */
        [style*="z-index:"][style*="z-index: 1"],[style*="z-index: 2"],
        [style*="z-index: 3"],[style*="z-index: 4"],[style*="z-index: 5"] {
          display: none !important;
          visibility: hidden !important;
          opacity: 0 !important;
          width: 0 !important;
          height: 0 !important;
          pointer-events: none !important;
          z-index: -1 !important;
        }
      `;
    }
    
    // 隐藏推荐和广告
    if (!config.liveUI.showRecommendations) {
      customCSS += '.live-recommendations, .live-ads { display: none !important; }';
    }
    
    // 自定义弹幕样式
    if (config.liveUI.danmaku) {
      if (config.liveUI.danmaku.fontSize) {
        customCSS += `.danmaku { font-size: ${config.liveUI.danmaku.fontSize}px !important; }`;
      }
      if (config.liveUI.danmaku.color) {
        customCSS += `.danmaku { color: ${config.liveUI.danmaku.color} !important; }`;
      }
    }
  }
  
  return customCSS;
}

/**
 * 监听页面变化
 * @param {UIManager} uiManager - UI管理器实例
 */
function observePageChanges(uiManager) {
  logger.info('开始监听页面变化...');
  
  // 防抖函数，避免频繁触发UI更新
  const debouncedApplyCustomizations = debounce(() => {
    logger.info('应用UI定制...');
    // 检查是否是短视频页面
    if (isVideoPage()) {
      logger.info('检测到短视频页面，应用视频定制');
      uiManager.applyVideoCustomizations();
    }
    
    // 检查是否是直播间页面
    if (isLivePage()) {
      logger.info('检测到直播间页面，应用直播定制');
      uiManager.applyLiveCustomizations();
    }
  }, 300);
  
  // 使用MutationObserver监听DOM变化
  const observer = new MutationObserver((mutations) => {
    // 检查是否有重要的DOM变化
    let hasSignificantChange = false;
    
    for (const mutation of mutations) {
      // 检查是否有新节点添加
      if (mutation.addedNodes.length > 0) {
        // 检查是否添加了视频容器、内容区域等重要元素
        const addedElements = Array.from(mutation.addedNodes).filter(node => node.nodeType === 1);
        for (const element of addedElements) {
          // 检查是否包含重要元素或类名
          if (element.querySelector('[class*="video"],[class*="content"],[class*="main"],[id*="video"]') || 
              element.className && (element.className.includes('video') || 
                                   element.className.includes('content') || 
                                   element.className.includes('main'))) {
            hasSignificantChange = true;
            break;
          }
        }
      }
      
      if (hasSignificantChange) break;
    }
    
    // 如果有重要变化，应用定制
    if (hasSignificantChange) {
      debouncedApplyCustomizations();
    }
  });
  
  // 更激进的观察配置
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,  // 监听属性变化，包括class变化
    characterData: true  // 监听文本内容变化
  });
  
  // 初始应用，使用多次应用策略确保效果
  const initialApplyDelay = [500, 2000, 5000];
  initialApplyDelay.forEach((delay, index) => {
    setTimeout(() => {
      logger.info(`初始应用UI定制 (尝试 ${index + 1}/${initialApplyDelay.length})`);
      if (isVideoPage()) {
        uiManager.applyVideoCustomizations();
      }
      if (isLivePage()) {
        uiManager.applyLiveCustomizations();
      }
    }, delay);
  });
}

/**
 * 检查是否是短视频页面
 * @returns {boolean} 是否是短视频页面
 */
function isVideoPage() {
  return location.pathname.includes('/video/') || 
         location.pathname === '/' || 
         location.pathname.includes('/user/');
}

/**
 * 检查是否是直播间页面
 * @returns {boolean} 是否是直播间页面
 */
function isLivePage() {
  return location.pathname.includes('/live/');
}

/**
 * 创建浮动设置按钮
 * @param {UIManager} uiManager - UI管理器实例
 */
function createFloatingSettingsButton(uiManager) {
  // 检查是否已存在浮动按钮，避免重复创建
  if (document.getElementById('douyin-ui-customizer-float-btn')) {
    return;
  }

  // 创建浮动按钮元素
  const floatButton = document.createElement('div');
  floatButton.id = 'douyin-ui-customizer-float-btn';
  floatButton.innerHTML = '⚙️';
  floatButton.style.cssText = `
    position: fixed;
    bottom: 30px;
    right: 30px;
    width: 50px;
    height: 50px;
    background: #000000;
    color: #ffffff;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
    cursor: pointer;
    z-index: 999998;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
    transition: all 0.3s ease;
  `;

  // 添加点击事件
  floatButton.addEventListener('click', () => {
    uiManager.showSettingsPanel();
  });

  // 添加悬停效果
  floatButton.addEventListener('mouseenter', () => {
    floatButton.style.transform = 'scale(1.1)';
  });
  
  floatButton.addEventListener('mouseleave', () => {
    floatButton.style.transform = 'scale(1)';
  });

  // 添加到文档中
  document.body.appendChild(floatButton);

  // 定期检查按钮是否存在，避免被页面脚本移除
  setInterval(() => {
    if (!document.getElementById('douyin-ui-customizer-float-btn')) {
      createFloatingSettingsButton(uiManager);
    }
  }, 5000); // 每5秒检查一次
}

// 定义全局UI管理器实例
let globalUIManager = null;

// 全局初始化UI管理器函数
function initUIManager() {
  if (!globalUIManager) {
    const config = configManager.getConfig();
    globalUIManager = new UIManager(config);
  }
  return globalUIManager;
}

// 在脚本顶层注册油猴菜单命令，确保在油猴环境中立即执行
// 打开设置面板
GM_registerMenuCommand('打开设置面板', () => {
  const uiManager = initUIManager();
  uiManager.showSettingsPanel();
});

// 切换暗黑模式
GM_registerMenuCommand('切换暗黑模式', async () => {
  try {
    const config = configManager.getConfig();
    const newTheme = config.theme === 'dark' ? 'light' : 'dark';
    configManager.setConfig('theme', newTheme);
    
    // 使用主题管理器切换主题
    await themeManager.applyTheme(newTheme);
    logger.info(`主题已切换为: ${newTheme}`);
  } catch (error) {
    logger.error('切换主题失败:', error);
  }
});

// 手动检查更新
GM_registerMenuCommand('检查更新', () => {
  checkForUpdates(true);
});

// 重置所有设置
GM_registerMenuCommand('重置所有设置', () => {
  if (confirm('确定要重置所有设置吗？')) {
    configManager.resetConfig();
    location.reload();
  }
});

// 错误处理
function setupErrorHandling() {
  // 全局错误捕获
  window.onerror = function(message, source, lineno, colno, error) {
    logger.error('[抖音UI定制工具] 全局错误:', { message, source, lineno, colno, error });
    eventEmitter.emit('tool.error', { type: 'global', error, message });
    return true;
  };
  
  // Promise错误捕获
  window.addEventListener('unhandledrejection', function(event) {
    logger.error('[抖音UI定制工具] 未处理的Promise错误:', event.reason);
    eventEmitter.emit('tool.error', { type: 'promise', error: event.reason });
  });
  
  // 窗口错误捕获
  window.addEventListener('error', (event) => {
    logger.error('[抖音UI定制工具] 捕获到错误:', event.error, event.message);
    eventEmitter.emit('tool.error', { type: 'window', error: event.error, message: event.message });
  });
  
  // 监听性能警告
  performanceMonitor.on('performance.warning', (data) => {
    logger.warn('性能警告:', data);
  });
}

// 清理函数
function cleanup() {
  logger.info('抖音UI定制工具执行清理');
  
  try {
    // 调用UI管理器的清理方法
    if (uiManager && typeof uiManager.cleanup === 'function') {
      uiManager.cleanup();
    }
    
    // 停止性能监控
    performanceMonitor.stop();
    
    // 移除事件监听
    eventEmitter.off('tool.init.completed');
    eventEmitter.off('tool.styles.updated');
    eventEmitter.off('tool.error');
    eventEmitter.off('performance.warning');
    
    // 触发清理完成事件
    eventEmitter.emit('tool.cleanup.completed');
  } catch (error) {
    logger.error('[抖音UI定制工具] 清理失败:', error);
  }
}

// 增强的初始化逻辑，确保脚本在各种情况下都能正确执行
function ensureInit() {
  // 尝试直接初始化
  try {
    init();
  } catch (error) {
    logger.error('初始化失败，将重试:', error);
    // 如果初始化失败，500ms后重试
    setTimeout(init, 500);
  }
}

// 使用多种方式确保初始化执行
// 1. 传统DOMContentLoaded事件监听
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', ensureInit);
} 

// 2. 立即尝试初始化（如果文档已加载）
if (document.readyState !== 'loading') {
  setTimeout(ensureInit, 0); // 使用setTimeout确保在当前事件循环后执行
}

// 3. 添加延迟初始化作为后备方案
setTimeout(ensureInit, 1000);

// 4. 监听页面变化，确保SPA路由变化时也能初始化
let lastHref = location.href;
setInterval(() => {
  if (location.href !== lastHref) {
    lastHref = location.href;
    logger.info('检测到页面URL变化，重新应用UI定制');
    ensureInit();
  }
}, 1000);

// 注册卸载事件
window.addEventListener('unload', cleanup);

// 导出公共API
const douyinUICustomizer = {
  version: CURRENT_VERSION,
  getConfig: () => configManager.getConfig(),
  setConfig: (key, value) => configManager.setConfig(key, value),
  showDebugInfo: () => {
    logger.debug('[抖音UI定制工具] 调试信息:', {
      version: CURRENT_VERSION,
      config: configManager.getConfig(),
      page: {
        url: window.location.href,
        title: document.title,
        readyState: document.readyState
      },
      performance: performanceMonitor.getStats()
    });
  },
  // 添加公共方法
  refresh: () => {
    if (uiManager && typeof uiManager.applyVideoCustomizations === 'function' && typeof uiManager.applyLiveCustomizations === 'function') {
      if (isVideoPage()) {
        uiManager.applyVideoCustomizations();
      }
      if (isLivePage()) {
        uiManager.applyLiveCustomizations();
      }
    }
  },
  cleanup: cleanup,
  // 主题相关API
  theme: {
    apply: (themeName) => themeManager.applyTheme(themeName),
    getCurrent: () => themeManager.getCurrentTheme(),
    list: () => themeManager.listThemes()
  },
  // 事件系统API
  on: (event, callback) => eventEmitter.on(event, callback),
  off: (event, callback) => eventEmitter.off(event, callback),
  emit: (event, data) => eventEmitter.emit(event, data),
  // 性能监控API
  performance: {
    start: () => performanceMonitor.start(),
    stop: () => performanceMonitor.stop(),
    getStats: () => performanceMonitor.getStats(),
    enableDebug: () => performanceMonitor.enableDebug()
  },
  // 配置管理API
  config: {
    export: () => configManager.exportConfig(),
    import: (jsonString) => configManager.importConfig(jsonString),
    reset: () => configManager.resetConfig(),
    validate: (config) => configManager.validateConfig(config)
  }
};

// 暴露到全局作用域（如果需要）
window.douyinUICustomizer = douyinUICustomizer;

logger.info('[抖音UI定制工具] 初始化完成，当前版本:', CURRENT_VERSION);

// 注册关键事件监听器
eventEmitter.on('tool.error', (data) => {
  logger.error('工具错误事件:', data);
});

eventEmitter.on('tool.styles.updated', (data) => {
  logger.info('样式已更新:', data);
});