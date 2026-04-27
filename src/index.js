// 抖音Web端界面UI定制工具 - 主入口文件

import logger from './utils/logger.js';
import eventEmitter from './utils/eventEmitter.js';
import performanceMonitor from './utils/performance.js';
import themeManager from './styles/theme.js';
import UIManager from './ui_manager.js';
import elementController from './controllers/elementController.js';
import layoutController from './controllers/layoutController.js';

// 应用初始化
async function initializeApp() {
  try {
    // 启动性能监控
    performanceMonitor.start();
    logger.info('应用初始化开始...');

    // 初始化主题管理器
    themeManager.initialize();
    logger.info('主题管理器初始化完成');

    // 等待DOM加载完成
    await new Promise(resolve => {
      if (document.readyState === 'complete' || document.readyState === 'interactive') {
        resolve();
      } else {
        document.addEventListener('DOMContentLoaded', resolve);
      }
    });

    logger.info('DOM加载完成');

    // 导出全局API
    window.douyinUICustomizer = {
      // 主题API
      theme: {
        setTheme: (theme) => themeManager.applyTheme(theme),
        getTheme: () => themeManager.getCurrentTheme(),
        getAvailableThemes: () => themeManager.getAvailableThemes(),
        createTheme: (themeName, config) => themeManager.createTheme(themeName, config),
        deleteTheme: (themeName) => themeManager.deleteTheme(themeName)
      },

      // 元素控制API
      elements: {
        hide: (selector) => elementController.hideElement(selector),
        show: (selector) => elementController.showElement(selector),
        toggle: (selector) => elementController.toggleElement(selector),
        modifyStyle: (selector, styles) => elementController.modifyElementStyle(selector, styles),
        resetStyle: (selector) => elementController.resetElementStyle(selector),
        identify: (selector) => elementController.identifyElements(selector)
      },

      // 布局API
      layout: {
        apply: (layoutName) => layoutController.applyLayout(layoutName),
        save: (layoutName, config) => layoutController.saveLayout(layoutName, config),
        getCurrent: () => layoutController.getCurrentLayout(),
        getAvailable: () => layoutController.getAvailableLayouts(),
        reset: () => layoutController.resetLayout(),
        delete: (layoutName) => layoutController.deleteLayout(layoutName),
        export: (layoutName) => layoutController.exportLayout(layoutName),
        import: (layoutJson) => layoutController.importLayout(layoutJson)
      },

      // 事件API
      events: {
        on: (event, callback) => eventEmitter.on(event, callback),
        off: (event, callback) => eventEmitter.off(event, callback),
        emit: (event, data) => eventEmitter.emit(event, data)
      },

      // 性能监控API
      performance: {
        start: () => performanceMonitor.start(),
        stop: () => performanceMonitor.stop(),
        getMetrics: () => performanceMonitor.getMetrics()
      },

      // 版本信息
      version: '1.0.151'
    };

    logger.info('全局API导出完成');

    // 触发应用初始化完成事件
    eventEmitter.emit('app.initialized');
    performanceMonitor.stop();

    logger.info('应用初始化完成');
  } catch (error) {
    logger.error('应用初始化失败:', error);
    eventEmitter.emit('app.error', error);
  }
}

// 错误处理
function setupErrorHandling() {
  // 监听全局错误
  window.addEventListener('error', (error) => {
    logger.error('全局错误:', error);
    eventEmitter.emit('app.error', error);
  });

  // 监听Promise错误
  window.addEventListener('unhandledrejection', (event) => {
    logger.error('未处理的Promise错误:', event.reason);
    eventEmitter.emit('app.error', event.reason);
  });
}

// 清理函数
function cleanup() {
  logger.info('执行清理操作...');
  performanceMonitor.stop();
  eventEmitter.clear();
  logger.info('清理完成');
}

// 应用启动
setupErrorHandling();
initializeApp();

// 监听页面卸载事件
window.addEventListener('unload', cleanup);

export default {
  initialize: initializeApp,
  cleanup,
  douyinUICustomizer: window.douyinUICustomizer,
  elementController,
  layoutController,
  themeManager
};