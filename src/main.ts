import { debounce, getElement, addEvent, createElement, injectStyle } from './utils/dom';
import { getItem, setItem, NamespacedStorage } from './utils/storage';
import logger from './utils/logger';
import eventEmitter from './utils/eventEmitter';
import performanceMonitor from './utils/performance';
import configManager from './config';
import UIManager from './ui_manager';
import themeManager from './styles/theme';
import { injectStyles, injectBasicStyles } from './utils/styleGenerator';
import { observePageChanges, stopObserving, isVideoPage, isLivePage } from './utils/pageObserver';

declare global {
  interface Window {
    douyinUICustomizer?: any;
    resetConfig?: () => any;
  }

  const GM_xmlhttpRequest: ((details: any) => void) | undefined;
  const GM_registerMenuCommand: ((name: string, fn: () => void) => void) | undefined;
}

const CURRENT_VERSION = '2.0.3';
const UPDATE_CHECK_INTERVAL = 24 * 60 * 60 * 1000;

const storage = new NamespacedStorage('douyin_tool');
let uiManager: UIManager | null = null;

function checkForUpdates(showNoUpdateMessage = false): void {
  try {
    const updateUrl = 'https://github.com/SutChan/douyin_tool/raw/main/dist/douyin_ui_customizer.user.js';

    if (typeof GM_xmlhttpRequest !== 'undefined') {
      GM_xmlhttpRequest({
        method: 'GET',
        url: updateUrl,
        onload: function(response: any) {
          if (response.status === 200) {
            const scriptContent = response.responseText;
            const versionMatch = scriptContent.match(/@version\s+(\d+\.\d+\.\d+)/i);

            if (versionMatch && versionMatch[1]) {
              const latestVersion = versionMatch[1];

              if (isNewerVersion(latestVersion, CURRENT_VERSION)) {
                if (confirm(`发现新版本 ${latestVersion}！是否更新脚本？\n\n当前版本：${CURRENT_VERSION}`)) {
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
    }
  } catch (error) {
    logger.error('检查更新时发生错误：', error);
  }
}

function isNewerVersion(newVersion: string, currentVersion: string): boolean {
  const newParts = newVersion.split('.').map(Number);
  const currentParts = currentVersion.split('.').map(Number);

  for (let i = 0; i < newParts.length; i++) {
    if (newParts[i] > currentParts[i]) return true;
    if (newParts[i] < currentParts[i]) return false;
  }

  return false;
}

function shouldCheckForUpdates(): boolean {
  const lastCheckTime = getItem('lastUpdateCheckTime', 0) || 0;
  const now = Date.now();

  if (now - lastCheckTime > UPDATE_CHECK_INTERVAL) {
    setItem('lastUpdateCheckTime', now);
    return true;
  }

  return false;
}

function init(): void {
  logger.info('抖音UI定制工具已启动');

  (performanceMonitor as any).startMonitoring();
  configManager.loadConfig();
  const config = configManager.getConfig();

  uiManager = new UIManager(config);
  uiManager.init();

  themeManager.init();

  injectBasicStyles();
  injectStyles(themeManager, config);

  observePageChanges(uiManager);
  createFloatingSettingsButton(uiManager);

  if (shouldCheckForUpdates()) {
    checkForUpdates(false);
  }

  setupErrorHandling();

  eventEmitter.emit('tool.init.completed', { config });
}

function createFloatingSettingsButton(uiManager: UIManager): void {
  if (document.getElementById('douyin-ui-customizer-float-btn')) {
    return;
  }

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

  floatButton.addEventListener('click', () => {
    uiManager.showSettingsPanel();
  });

  floatButton.addEventListener('mouseenter', () => {
    floatButton.style.transform = 'scale(1.1)';
  });

  floatButton.addEventListener('mouseleave', () => {
    floatButton.style.transform = 'scale(1)';
  });

  document.body.appendChild(floatButton);

  setInterval(() => {
    if (!document.getElementById('douyin-ui-customizer-float-btn')) {
      createFloatingSettingsButton(uiManager);
    }
  }, 5000);
}

let globalUIManager: UIManager | null = null;

function initUIManager(): UIManager {
  if (!globalUIManager) {
    const config = configManager.getConfig();
    globalUIManager = new UIManager(config);
  }
  return globalUIManager;
}

if (typeof GM_registerMenuCommand !== 'undefined') {
  GM_registerMenuCommand('打开设置面板', () => {
    const uiManager = initUIManager();
    uiManager.showSettingsPanel();
  });

  GM_registerMenuCommand('切换暗黑模式', async () => {
    try {
      const config = configManager.getConfig();
      const newTheme = config.theme === 'dark' ? 'light' : 'dark';
      configManager.setConfig('theme', newTheme);
      await themeManager.applyTheme(newTheme);
      logger.info(`主题已切换为: ${newTheme}`);
    } catch (error) {
      logger.error('切换主题失败:', error);
    }
  });

  GM_registerMenuCommand('检查更新', () => {
    checkForUpdates(true);
  });

  GM_registerMenuCommand('重置所有设置', () => {
    if (confirm('确定要重置所有设置吗？')) {
      configManager.resetConfig();
      location.reload();
    }
  });
}

function setupErrorHandling(): void {
  window.onerror = function(message, source, lineno, colno, error) {
    logger.error('[抖音UI定制工具] 全局错误:', { message, source, lineno, colno, error });
    eventEmitter.emit('tool.error', { type: 'global', error, message });
    return true;
  };

  window.addEventListener('unhandledrejection', function(event) {
    logger.error('[抖音UI定制工具] 未处理的Promise错误:', event.reason);
    eventEmitter.emit('tool.error', { type: 'promise', error: event.reason });
  });

  window.addEventListener('error', (event) => {
    logger.error('[抖音UI定制工具] 捕获到错误:', event.error, event.message);
    eventEmitter.emit('tool.error', { type: 'window', error: event.error, message: event.message });
  });

  (performanceMonitor as any).watchPerformance((data: any) => {
    logger.warn('性能警告:', data);
  });
}

function cleanup(): void {
  logger.info('抖音UI定制工具执行清理');

  try {
    if (uiManager && typeof uiManager.cleanup === 'function') {
      uiManager.cleanup();
    }

    (performanceMonitor as any).stopMonitoring();
    stopObserving();

    eventEmitter.off('tool.init.completed');
    eventEmitter.off('tool.styles.updated');
    eventEmitter.off('tool.error');
    eventEmitter.off('performance.warning');

    eventEmitter.emit('tool.cleanup.completed');
  } catch (error) {
    logger.error('[抖音UI定制工具] 清理失败:', error);
  }
}

function ensureInit(): void {
  try {
    init();
  } catch (error) {
    logger.error('初始化失败，将重试:', error);
    setTimeout(init, 500);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', ensureInit);
}

if (document.readyState !== 'loading') {
  setTimeout(ensureInit, 0);
}

setTimeout(ensureInit, 1000);

let lastHref = location.href;
setInterval(() => {
  if (location.href !== lastHref) {
    lastHref = location.href;
    logger.info('检测到页面URL变化，重新应用UI定制');
    ensureInit();
  }
}, 1000);

window.addEventListener('unload', cleanup);

const douyinUICustomizer = {
  version: CURRENT_VERSION,
  getConfig: () => configManager.getConfig(),
  setConfig: (key: string, value: unknown) => configManager.setConfig(key, value),
  showDebugInfo: () => {
    logger.debug('[抖音UI定制工具] 调试信息:', {
      version: CURRENT_VERSION,
      config: configManager.getConfig(),
      page: {
        url: window.location.href,
        title: document.title,
        readyState: document.readyState
      },
      performance: (performanceMonitor as any).getMetrics()
    });
  },
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
  cleanup,
  theme: {
    apply: (themeName: string) => themeManager.applyTheme(themeName),
    getCurrent: () => themeManager.getCurrentTheme(),
    list: () => themeManager.listThemes()
  },
  on: (event: string, callback: (...args: unknown[]) => void) => eventEmitter.on(event, callback),
  off: (event: string, callback: (...args: unknown[]) => void) => eventEmitter.off(event, callback),
  emit: (event: string, data: unknown) => eventEmitter.emit(event, data),
  performance: {
    start: () => (performanceMonitor as any).startMonitoring(),
    stop: () => (performanceMonitor as any).stopMonitoring(),
    getStats: () => (performanceMonitor as any).getMetrics(),
    enableDebug: () => {}
  },
  config: {
    export: () => configManager.exportConfig(),
    import: (jsonString: string) => configManager.importConfig(jsonString),
    reset: () => configManager.resetConfig(),
    validate: (config: unknown) => configManager.validateConfig(config as any)
  }
};

window.douyinUICustomizer = douyinUICustomizer;

logger.info('[抖音UI定制工具] 初始化完成，当前版本:', CURRENT_VERSION);

eventEmitter.on('tool.error', (data) => {
  logger.error('工具错误事件:', data);
});

eventEmitter.on('tool.styles.updated', (data) => {
  logger.info('样式已更新:', data);
});