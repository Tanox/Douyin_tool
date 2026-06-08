import logger from './utils/logger';
import eventEmitter from './utils/eventEmitter';
import performanceMonitor from './utils/performance';
import themeManager from './styles/theme';
import UIManager from './ui_manager';
import elementController from './controllers/elementController';
import layoutController from './controllers/layoutController';

declare global {
  interface Window {
    douyinUICustomizer?: any;
  }
}

async function initializeApp() {
  try {
    (performanceMonitor as any).startMonitoring();
    logger.info('应用初始化开始...');

    themeManager.init();
    logger.info('主题管理器初始化完成');

    await new Promise(resolve => {
      if (document.readyState === 'complete' || document.readyState === 'interactive') {
        resolve(null);
      } else {
        document.addEventListener('DOMContentLoaded', resolve);
      }
    });

    logger.info('DOM加载完成');

    window.douyinUICustomizer = {
      theme: {
        setTheme: (theme: string) => themeManager.applyTheme(theme),
        getTheme: () => themeManager.getCurrentTheme(),
        getAvailableThemes: () => themeManager.getAvailableThemes(),
        createTheme: (config: Record<string, unknown>) => themeManager.createTheme(config as any),
        deleteTheme: (themeName: string) => themeManager.deleteTheme(themeName)
      },

      elements: {
        hide: (selector: string) => elementController.hideElement(selector),
        show: (selector: string) => elementController.showElement(selector),
        toggle: (selector: string) => elementController.toggleElement(selector),
        modifyStyle: (selector: string, styles: Record<string, string>) => elementController.modifyElementStyle(selector, styles),
        resetStyle: (selector: string) => elementController.resetElementStyle(selector),
        identify: () => elementController.identifyElements()
      },

      layout: {
        apply: (layoutName: string) => layoutController.applyLayout(layoutName),
        save: (layoutName: string, config: Record<string, unknown>) => layoutController.saveLayout(layoutName, config),
        getCurrent: () => layoutController.getCurrentLayout(),
        getAvailable: () => layoutController.getAvailableLayouts(),
        reset: () => layoutController.resetLayout(),
        delete: (layoutName: string) => layoutController.deleteLayout(layoutName),
        export: (layoutName: string) => layoutController.exportLayout(layoutName),
        import: (layoutJson: string) => layoutController.importLayout(layoutJson)
      },

      events: {
        on: (event: string, callback: (...args: unknown[]) => void) => eventEmitter.on(event, callback),
        off: (event: string, callback: (...args: unknown[]) => void) => eventEmitter.off(event, callback),
        emit: (event: string, data: unknown) => eventEmitter.emit(event, data)
      },

      performance: {
        start: () => (performanceMonitor as any).startMonitoring(),
        stop: () => (performanceMonitor as any).stopMonitoring(),
        getMetrics: () => (performanceMonitor as any).getMetrics()
      },

      version: '2.0.4'
    };

    logger.info('全局API导出完成');

    eventEmitter.emit('app.initialized');
    (performanceMonitor as any).stopMonitoring();

    logger.info('应用初始化完成');
  } catch (error) {
    logger.error('应用初始化失败:', error);
    eventEmitter.emit('app.error', error);
  }
}

function setupErrorHandling() {
  window.addEventListener('error', (error) => {
    logger.error('全局错误:', error);
    eventEmitter.emit('app.error', error);
  });

  window.addEventListener('unhandledrejection', (event) => {
    logger.error('未处理的Promise错误:', event.reason);
    eventEmitter.emit('app.error', event.reason);
  });
}

function cleanup() {
  logger.info('执行清理操作...');
  (performanceMonitor as any).stopMonitoring();
  logger.info('清理完成');
}

setupErrorHandling();
initializeApp();

window.addEventListener('unload', cleanup);

export default {
  initialize: initializeApp,
  cleanup,
  douyinUICustomizer: window.douyinUICustomizer,
  elementController,
  layoutController,
  themeManager
};