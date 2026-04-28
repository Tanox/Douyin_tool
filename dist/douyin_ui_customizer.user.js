// ==UserScript==
// @name         抖音Web端界面UI定制工具
// @namespace    https://github.com/sutchan
// @version      1.1.1
// @description  自定义抖音Web端界面，隐藏不需要的UI元素，提升观看体验
// @author       Sut (@sutchan)
// @match        https://www.douyin.com/*
// @match        https://v.douyin.com/*
// @grant        GM_addStyle
// @grant        GM_registerMenuCommand
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_addValueChangeListener
// @grant        GM_removeValueChangeListener
// @run-at       document-end
// @icon         https://www.douyin.com/favicon.ico
// @updateURL
// @downloadURL
// ==/UserScript==

// 配置管理模块 v1.1.1 - 负责处理配置的加载、保存和默认设置

import { getItem, setItem, getNestedItem, setNestedItem, NamespacedStorage } from './utils/storage.js';
import logger from './utils/logger.js';
import eventEmitter from './utils/eventEmitter.js';

// 创建配置专用的命名空间存储
const configStorage = new NamespacedStorage('douyin_tool_config');

// 配置存储键名
const CONFIG_KEY = 'main';

// 配置版本，用于配置迁移
const CONFIG_VERSION = '1.1.1';

/**
 * 默认配置
 */
const DEFAULT_CONFIG = {
  version: CONFIG_VERSION,
  theme: 'light', // light 或 dark

  // 短视频界面配置
  videoUI: {
    showLikeButton: true,
    showCommentButton: true,
    showShareButton: true,
    showAuthorInfo: true,
    showMusicInfo: true,
    showDescription: true,
    showRecommendations: true,
    layout: 'default',
    controlBar: {
      show: true,
      autoHide: true,
      position: 'bottom',
      size: 'medium',
      opacity: 0.9
    },
    playback: {
      defaultQuality: 'auto',
      autoPlay: true,
      loop: false
    }
  },

  // 直播间界面配置
  liveUI: {
    showGifts: true,
    showDanmaku: true,
    showRecommendations: true,
    showAds: false,
    showStats: true,
    danmaku: {
      fontSize: 16,
      color: '#FFFFFF',
      opacity: 0.8,
      speed: 'medium',
      position: 'top',
      maxLines: 5
    },
    layout: 'default',
    volume: 100
  },

  // 通用配置
  general: {
    autoPlay: true,
    autoScroll: false,
    keyboardShortcuts: true,
    notifications: false,
    language: 'zh-CN',
    animations: true,
    updateCheck: true
  },

  // 高级配置
  advanced: {
    debugMode: false,
    performanceMode: false,
    customCSS: '',
    customScripts: []
  }
};

// 当前配置对象缓存
let currentConfig = null;

/**
 * 加载配置
 * @returns {Object} 配置对象
 */
export function loadConfig() {
  try {
    const savedConfig = configStorage.getItem(CONFIG_KEY);

    if (savedConfig) {
      logger.info('[抖音工具] 加载已保存的配置');
      // 检查配置版本，如果版本不匹配，进行迁移
      const loadedConfig = migrateConfig(savedConfig);
      // 合并保存的配置和默认配置，确保所有必需字段都存在
      currentConfig = mergeConfig(loadedConfig, DEFAULT_CONFIG);
      // 更新配置版本
      currentConfig.version = CONFIG_VERSION;
    } else {
      logger.info('[抖音工具] 使用默认配置');
      currentConfig = { ...DEFAULT_CONFIG };
    }

    // 保存更新后的配置
    saveConfig(currentConfig);

    return currentConfig;
  } catch (error) {
    logger.error('[抖音工具] 加载配置失败：', error);
    eventEmitter.emit('config.error', { type: 'load', error });
    // 如果加载失败，使用默认配置
    currentConfig = { ...DEFAULT_CONFIG };
    return currentConfig;
  }
}

/**
 * 获取配置
 * @returns {Object} 当前配置对象
 */
export function getConfig() {
  if (!currentConfig) {
    loadConfig();
  }
  return { ...currentConfig }; // 返回配置的副本，避免直接修改
}

/**
 * 设置配置
 * @param {Object|string} key - 配置键名或完整配置对象
 * @param {*} value - 配置值（当key为字符串时）
 * @returns {boolean} 是否设置成功
 */
export function setConfig(key, value) {
  try {
    if (!currentConfig) {
      loadConfig();
    }

    if (typeof key === 'object') {
      // 如果传入的是完整配置对象，合并到当前配置
      currentConfig = mergeConfig(key, currentConfig);
    } else {
      // 如果传入的是键名和值，设置特定配置项
      if (key.includes('.')) {
        // 支持嵌套路径，如 'videoUI.controlBar.show'
        setNestedConfig(key, value);
      } else {
        // 顶层配置
        currentConfig[key] = value;
      }
    }

    // 更新配置版本
    currentConfig.version = CONFIG_VERSION;

    // 保存更新后的配置
    saveConfig(currentConfig);

    return true;
  } catch (error) {
    logger.error('[抖音工具] 设置配置失败：', error);
    eventEmitter.emit('config.error', { type: 'set', error, key, value });
    return false;
  }
}

/**
 * 设置嵌套配置
 * @param {string} path - 嵌套路径，如 'videoUI.controlBar.show'
 * @param {*} value - 配置值
 */
function setNestedConfig(path, value) {
  const keys = path.split('.');
  let obj = currentConfig;

  // 导航到目标路径的父级
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!obj[key] || typeof obj[key] !== 'object') {
      obj[key] = {};
    }
    obj = obj[key];
  }

  // 设置最终值
  obj[keys[keys.length - 1]] = value;
}

/**
 * 获取特定配置项
 * @param {string} path - 配置路径，如 'videoUI.controlBar.show'
 * @param {*} defaultValue - 默认值
 * @returns {*} 配置值
 */
export function getConfigValue(path, defaultValue = undefined) {
  if (!currentConfig) {
    loadConfig();
  }

  if (path.includes('.')) {
    // 支持嵌套路径
    return getNestedItemFromConfig(path, defaultValue);
  }

  // 顶层配置
  return currentConfig[path] !== undefined ? currentConfig[path] : defaultValue;
}

/**
 * 从配置中获取嵌套值
 * @param {string} path - 嵌套路径，如 'videoUI.controlBar.show'
 * @param {*} defaultValue - 默认值
 * @returns {*} 嵌套配置值
 */
function getNestedItemFromConfig(path, defaultValue) {
  const keys = path.split('.');
  let obj = currentConfig;

  for (const key of keys) {
    if (obj === null || obj === undefined || typeof obj !== 'object' || !(key in obj)) {
      return defaultValue;
    }
    obj = obj[key];
  }

  return obj;
}

/**
 * 保存配置
 * @param {Object} config - 要保存的配置对象
 */
export function saveConfig(config) {
  try {
    configStorage.setItem(CONFIG_KEY, config);
    logger.info('[抖音工具] 配置已保存');
    eventEmitter.emit('config.saved', { config });
    return true;
  } catch (error) {
    logger.error('[抖音工具] 保存配置失败：', error);
    eventEmitter.emit('config.error', { type: 'save', error });
    return false;
  }
}

/**
 * 重置配置为默认值
 * @returns {Object} 默认配置对象
 */
export function resetConfig() {
  try {
    currentConfig = { ...DEFAULT_CONFIG };
    configStorage.setItem(CONFIG_KEY, currentConfig);
    logger.info('[抖音工具] 配置已重置为默认值');
    eventEmitter.emit('config.reset', { config: currentConfig });
    return currentConfig;
  } catch (error) {
    logger.error('[抖音工具] 重置配置失败：', error);
    eventEmitter.emit('config.error', { type: 'reset', error });
    return { ...DEFAULT_CONFIG };
  }
}

/**
 * 合并配置对象
 * @param {Object} userConfig - 用户配置
 * @param {Object} defaultConfig - 默认配置
 * @returns {Object} 合并后的配置
 */
function mergeConfig(userConfig, defaultConfig) {
  const merged = { ...defaultConfig };

  for (const key in userConfig) {
    if (Object.prototype.hasOwnProperty.call(userConfig, key)) {
      if (typeof userConfig[key] === 'object' && userConfig[key] !== null &&
        typeof defaultConfig[key] === 'object' && defaultConfig[key] !== null &&
        !Array.isArray(userConfig[key]) && !Array.isArray(defaultConfig[key])) {
        // 递归合并嵌套对象
        merged[key] = mergeConfig(userConfig[key], defaultConfig[key]);
      } else {
        merged[key] = userConfig[key];
      }
    }
  }

  return merged;
}

/**
 * 配置版本迁移
 * @param {Object} oldConfig - 旧配置
 * @returns {Object} 迁移后的配置
 */
function migrateConfig(oldConfig) {
  // 如果没有版本信息或版本不匹配，执行迁移
  if (!oldConfig.version || oldConfig.version !== CONFIG_VERSION) {
    logger.info(`[抖音工具] 执行配置迁移: ${oldConfig.version || 'unknown'} -> ${CONFIG_VERSION}`);
    eventEmitter.emit('config.migrating', {
      fromVersion: oldConfig.version || 'unknown',
      toVersion: CONFIG_VERSION
    });

    // 这里可以添加具体的迁移逻辑
    // 例如，添加新配置项，修改配置结构等

    // 确保配置包含必要的新版本字段
    if (!oldConfig.advanced) {
      oldConfig.advanced = DEFAULT_CONFIG.advanced;
    }

    if (!oldConfig.videoUI.playback) {
      oldConfig.videoUI.playback = DEFAULT_CONFIG.videoUI.playback;
    }

    if (!oldConfig.liveUI.maxLines) {
      oldConfig.liveUI.danmaku.maxLines = DEFAULT_CONFIG.liveUI.danmaku.maxLines;
    }
  }

  return oldConfig;
}

/**
 * 导出配置为JSON字符串
 * @returns {string} JSON格式的配置字符串
 */
export function exportConfig() {
  const config = getConfig();
  try {
    const result = JSON.stringify(config, null, 2);
    logger.info('[抖音工具] 配置导出成功');
    return result;
  } catch (error) {
    logger.error('[抖音工具] 导出配置失败：', error);
    eventEmitter.emit('config.error', { type: 'export', error });
    return '{}';
  }
}

/**
 * 导入配置
 * @param {string} jsonString - JSON格式的配置字符串
 * @returns {boolean} 是否导入成功
 */
export function importConfig(jsonString) {
  try {
    const config = JSON.parse(jsonString);

    // 验证配置格式
    if (typeof config !== 'object' || config === null) {
      throw new Error('配置格式无效');
    }

    // 合并导入的配置和默认配置，确保所有必需字段都存在
    currentConfig = mergeConfig(config, DEFAULT_CONFIG);
    // 更新配置版本
    currentConfig.version = CONFIG_VERSION;
    // 保存配置
    saveConfig(currentConfig);

    logger.info('[抖音工具] 配置导入成功');
    eventEmitter.emit('config.imported', { config: currentConfig });
    return true;
  } catch (error) {
    logger.error('[抖音工具] 导入配置失败：', error);
    eventEmitter.emit('config.error', { type: 'import', error });
    return false;
  }
}

/**
 * 验证配置
 * @param {Object} config - 要验证的配置对象
 * @returns {Object} 包含验证结果的对象
 */
export function validateConfig(config) {
  const issues = [];

  try {
    // 验证主题配置
    if (config.theme && !['light', 'dark'].includes(config.theme)) {
      issues.push('主题配置无效，应为 light 或 dark');
    }

    // 验证布局配置
    if (config.videoUI?.layout && !['default', 'compact', 'fullscreen'].includes(config.videoUI.layout)) {
      issues.push('视频界面布局配置无效');
    }

    if (config.liveUI?.layout && !['default', 'minimal', 'immersive'].includes(config.liveUI.layout)) {
      issues.push('直播间界面布局配置无效');
    }

    // 验证数值范围
    if (config.liveUI?.danmaku?.fontSize && (config.liveUI.danmaku.fontSize < 12 || config.liveUI.danmaku.fontSize > 36)) {
      issues.push('弹幕字体大小应在 12-36 之间');
    }

    if (config.liveUI?.danmaku?.opacity && (config.liveUI.danmaku.opacity < 0.1 || config.liveUI.danmaku.opacity > 1)) {
      issues.push('弹幕透明度应在 0.1-1 之间');
    }

  } catch (error) {
    logger.error('[抖音工具] 验证配置失败：', error);
    eventEmitter.emit('config.error', { type: 'validate', error });
    issues.push('配置验证过程中发生错误');
  }

  return {
    valid: issues.length === 0,
    issues: issues
  };
}

// 导出配置管理对象
// 添加初始化逻辑
const initialized = loadConfig();

// 注册配置事件监听器
eventEmitter.on('config.saved', (data) => {
  logger.debug('[抖音工具] 配置已保存:', data);
});

eventEmitter.on('config.error', (data) => {
  logger.error('[抖音工具] 配置错误:', data);
});

export default {
  loadConfig,
  getConfig,
  setConfig,
  getConfigValue,
  saveConfig,
  resetConfig,
  exportConfig,
  importConfig,
  validateConfig,
  get DEFAULT_CONFIG() {
    return { ...DEFAULT_CONFIG };
  },
  get CONFIG_VERSION() {
    return CONFIG_VERSION;
  },
  get initialized() {
    return initialized !== null;
  }
};

// 初始化配置管理器
logger.info('[抖音工具] 配置管理器已初始化');
eventEmitter.emit('config.initialized', { config: currentConfig });

// src/utils/index.js

// DOM操作工具
export * from './dom.js';

// 存储工具
export * from './storage.js';

// 日志记录工具
export { Logger } from './logger.js';
export { default as logger } from './logger.js';

// 事件总线
export { EventEmitter } from './eventEmitter.js';
export { default as eventEmitter } from './eventEmitter.js';

// 性能监控
export { PerformanceMonitor } from './performance.js';
export { default as performanceMonitor } from './performance.js';

// 自动执行控制器
export { default as autoExecutor } from './autoExecutor.js';

/**
 * 工具集合
 * 提供所有工具的统一访问
 */
export const utils = {
  // DOM工具
  debounce,
  throttle,
  getElement,
  getElements,
  findElementsByClassPattern,
  findElementsByStructure,
  toggleElements,
  addClass,
  removeClass,
  addEvent,
  removeEvent,
  createElement,
  injectStyle,
  
  // 存储工具
  getItem,
  setItem,
  removeItem,
  clearAll,
  getNestedItem,
  setNestedItem,
  getMultipleItems,
  setMultipleItems,
  removeMultipleItems,
  hasItem,
  getAllKeys,
  getStorageInfo,
  getPrefixedKey,
  NamespacedStorage,
  
  // 日志工具
  Logger,
  logger,
  
  // 事件总线
  EventEmitter,
  eventEmitter,
  
  // 性能监控
  PerformanceMonitor,
  performanceMonitor,
  
  // 自动执行控制器
  autoExecutor
};

export default utils;

// src/utils/dom.js

import logger from './logger.js';

// DOM查询缓存
const domCache = new Map();
const cacheExpiry = 5000; // 缓存过期时间（毫秒）

/**
 * 生成缓存键
 * @param {string|RegExp} selector - 选择器或正则表达式
 * @param {HTMLElement} parent - 父元素
 * @returns {string} 缓存键
 */
function generateCacheKey(selector, parent = document) {
  const selectorStr = typeof selector === 'string' ? selector : selector.toString();
  const parentStr = parent === document ? 'document' : parent.id || parent.className || parent.tagName;
  return `${selectorStr}_${parentStr}`;
}

/**
 * 清理过期缓存
 */
function cleanupCache() {
  const now = Date.now();
  for (const [key, { timestamp }] of domCache.entries()) {
    if (now - timestamp > cacheExpiry) {
      domCache.delete(key);
    }
  }
}

// 定期清理缓存
let cleanupInterval = setInterval(cleanupCache, cacheExpiry * 2);

/**
 * 清理模块资源
 */
export function cleanup() {
  clearInterval(cleanupInterval);
  clearDomCache();
  logger.info('DOM工具模块已清理');
}

/**
 * 防抖函数
 * @param {Function} func - 要防抖的函数
 * @param {number} wait - 等待时间（毫秒）
 * @returns {Function} 防抖后的函数
 */
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * 节流函数
 * @param {Function} func - 要节流的函数
 * @param {number} limit - 时间限制（毫秒）
 * @returns {Function} 节流后的函数
 */
export function throttle(func, limit) {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * 安全地获取DOM元素
 * @param {string} selector - CSS选择器
 * @param {HTMLElement} parent - 父元素，默认为document
 * @returns {HTMLElement|null} DOM元素或null
 */
export function getElement(selector, parent = document) {
  try {
    const cacheKey = generateCacheKey(selector, parent);
    
    // 检查缓存
    if (domCache.has(cacheKey)) {
      const { element } = domCache.get(cacheKey);
      return element;
    }
    
    const element = parent.querySelector(selector);
    
    // 存入缓存
    domCache.set(cacheKey, {
      element,
      timestamp: Date.now()
    });
    
    return element;
  } catch (error) {
    logger.error(`获取元素失败 (${selector}):`, error);
    return null;
  }
}

/**
 * 安全地获取多个DOM元素
 * @param {string} selector - CSS选择器
 * @param {HTMLElement} parent - 父元素，默认为document
 * @returns {HTMLElement[]} DOM元素数组
 */
export function getElements(selector, parent = document) {
  try {
    const cacheKey = generateCacheKey(selector, parent);
    
    // 检查缓存
    if (domCache.has(cacheKey)) {
      const { elements } = domCache.get(cacheKey);
      return elements;
    }
    
    const elements = Array.from(parent.querySelectorAll(selector));
    
    // 存入缓存
    domCache.set(cacheKey, {
      elements,
      timestamp: Date.now()
    });
    
    return elements;
  } catch (error) {
    logger.error(`获取多个元素失败 (${selector}):`, error);
    return [];
  }
}

/**
 * 通过类名模式查找元素
 * @param {RegExp} pattern - 类名正则表达式
 * @param {HTMLElement} parent - 父元素，默认为document
 * @returns {HTMLElement[]} 匹配的元素数组
 */
export function findElementsByClassPattern(pattern, parent = document) {
  try {
    const cacheKey = generateCacheKey(pattern, parent);
    
    // 检查缓存
    if (domCache.has(cacheKey)) {
      const { elements } = domCache.get(cacheKey);
      return elements;
    }
    
    const elements = [];
    
    // 尝试使用CSS选择器（如果模式简单）
    const patternStr = pattern.toString().replace(/^\/|\/$/g, '');
    if (!patternStr.includes('|') && !patternStr.includes('*') && !patternStr.includes('+') && !patternStr.includes('?')) {
      try {
        const selector = `.${patternStr}`;
        const cssElements = getElements(selector, parent);
        if (cssElements.length > 0) {
          // 存入缓存
          domCache.set(cacheKey, {
            elements: cssElements,
            timestamp: Date.now()
          });
          return cssElements;
        }
      } catch (e) {
        // CSS选择器失败，回退到原始方法
      }
    }
    
    // 回退到原始方法（优化版本）
    const allElements = parent.querySelectorAll('[class]');
    allElements.forEach(element => {
      if (pattern.test(element.className)) {
        elements.push(element);
      }
    });
    
    // 存入缓存
    domCache.set(cacheKey, {
      elements,
      timestamp: Date.now()
    });
    
    return elements;
  } catch (error) {
    logger.error('通过类名模式查找元素失败:', error);
    return [];
  }
}

/**
 * 通过结构特征查找元素
 * @param {Object} options - 结构选项
 * @param {HTMLElement} parent - 父元素，默认为document
 * @returns {HTMLElement[]} 匹配的元素数组
 */
export function findElementsByStructure(options, parent = document) {
  try {
    const cacheKey = generateCacheKey(JSON.stringify(options), parent);
    
    // 检查缓存
    if (domCache.has(cacheKey)) {
      const { elements } = domCache.get(cacheKey);
      return elements;
    }
    
    const result = [];
    const candidates = options.tagName 
      ? parent.getElementsByTagName(options.tagName)
      : parent.getElementsByTagName('*');
    
    for (let i = 0; i < candidates.length; i++) {
      const candidate = candidates[i];
      let match = true;
      
      // 检查属性
      if (options.attributes) {
        for (const [attr, value] of Object.entries(options.attributes)) {
          if (candidate.getAttribute(attr) !== value) {
            match = false;
            break;
          }
        }
      }
      
      // 检查子元素
      if (match && options.children) {
        match = options.children.every((childOption, index) => {
          const child = candidate.children[index];
          if (!child) return false;
          
          if (childOption.tagName && child.tagName.toLowerCase() !== childOption.tagName.toLowerCase()) {
            return false;
          }
          
          if (childOption.attributes) {
            for (const [attr, value] of Object.entries(childOption.attributes)) {
              if (child.getAttribute(attr) !== value) {
                return false;
              }
            }
          }
          
          return true;
        });
      }
      
      if (match) {
        result.push(candidate);
      }
    }
    
    // 存入缓存
    domCache.set(cacheKey, {
      elements: result,
      timestamp: Date.now()
    });
    
    return result;
  } catch (error) {
    logger.error('通过结构查找元素失败:', error);
    return [];
  }
}

/**
 * 批量DOM更新
 * @param {Function} callback - 包含DOM操作的回调函数
 * @param {HTMLElement} container - 容器元素，默认为document.body
 */
export function batchUpdate(callback, container = document.body) {
  try {
    const fragment = document.createDocumentFragment();
    callback(fragment);
    container.appendChild(fragment);
  } catch (error) {
    logger.error('批量更新失败:', error);
  }
}

/**
 * 切换元素显示/隐藏
 * @param {HTMLElement|HTMLElement[]} elements - 要切换的元素或元素数组
 * @param {boolean} show - 是否显示
 */
export function toggleElements(elements, show) {
  try {
    const elementArray = Array.isArray(elements) ? elements : [elements];
    
    // 使用批量更新
    batchUpdate((fragment) => {
      elementArray.forEach(element => {
        if (element && element.style) {
          element.style.display = show ? '' : 'none';
        }
      });
    });
  } catch (error) {
    logger.error('切换元素显示状态失败:', error);
  }
}

/**
 * 添加CSS类到元素
 * @param {HTMLElement} element - 目标元素
 * @param {string|string[]} className - 要添加的类名
 */
export function addClass(element, className) {
  try {
    if (!element || !element.classList) return;
    
    const classNames = Array.isArray(className) ? className : [className];
    classNames.forEach(cls => {
      if (cls) element.classList.add(cls);
    });
  } catch (error) {
    logger.error('添加CSS类失败:', error);
  }
}

/**
 * 从元素移除CSS类
 * @param {HTMLElement} element - 目标元素
 * @param {string|string[]} className - 要移除的类名
 */
export function removeClass(element, className) {
  try {
    if (!element || !element.classList) return;
    
    const classNames = Array.isArray(className) ? className : [className];
    classNames.forEach(cls => {
      if (cls) element.classList.remove(cls);
    });
  } catch (error) {
    logger.error('移除CSS类失败:', error);
  }
}

/**
 * 安全地添加事件监听器
 * @param {HTMLElement} element - 目标元素
 * @param {string} eventType - 事件类型
 * @param {Function} handler - 事件处理函数
 * @param {Object} options - 事件选项
 */
export function addEvent(element, eventType, handler, options = {}) {
  try {
    if (element && element.addEventListener) {
      element.addEventListener(eventType, handler, options);
    }
  } catch (error) {
    logger.error(`添加事件监听器失败 (${eventType}):`, error);
  }
}

/**
 * 安全地移除事件监听器
 * @param {HTMLElement} element - 目标元素
 * @param {string} eventType - 事件类型
 * @param {Function} handler - 事件处理函数
 * @param {Object} options - 事件选项
 */
export function removeEvent(element, eventType, handler, options = {}) {
  try {
    if (element && element.removeEventListener) {
      element.removeEventListener(eventType, handler, options);
    }
  } catch (error) {
    logger.error(`移除事件监听器失败 (${eventType}):`, error);
  }
}

/**
 * 事件委托
 * @param {HTMLElement} parent - 父元素
 * @param {string} eventType - 事件类型
 * @param {string} selector - 目标元素选择器
 * @param {Function} handler - 事件处理函数
 */
export function delegateEvent(parent, eventType, selector, handler) {
  try {
    parent.addEventListener(eventType, (e) => {
      const target = e.target.closest(selector);
      if (target) {
        handler.call(target, e);
      }
    });
  } catch (error) {
    logger.error(`事件委托失败 (${eventType}):`, error);
  }
}

/**
 * 创建新元素
 * @param {string} tagName - 标签名
 * @param {Object} attributes - 属性对象
 * @param {HTMLElement[]} children - 子元素数组
 * @returns {HTMLElement} 创建的元素
 */
export function createElement(tagName, attributes = {}, children = []) {
  try {
    const element = document.createElement(tagName);
    
    // 设置属性
    for (const [key, value] of Object.entries(attributes)) {
      if (key === 'style' && typeof value === 'object') {
        Object.assign(element.style, value);
      } else if (key === 'className' && typeof value === 'string') {
        element.className = value;
      } else {
        element.setAttribute(key, value);
      }
    }
    
    // 添加子元素
    children.forEach(child => {
      if (typeof child === 'string') {
        element.appendChild(document.createTextNode(child));
      } else if (child && child.nodeType) {
        element.appendChild(child);
      }
    });
    
    return element;
  } catch (error) {
    logger.error(`创建元素失败 (${tagName}):`, error);
    return document.createElement(tagName);
  }
}

/**
 * 注入样式到页面
 * @param {string} css - CSS样式字符串
 * @returns {HTMLStyleElement} 样式元素
 */
export function injectStyle(css) {
  try {
    const styleElement = document.createElement('style');
    styleElement.type = 'text/css';
    styleElement.textContent = css;
    document.head.appendChild(styleElement);
    return styleElement;
  } catch (error) {
    logger.error('注入样式失败:', error);
    return null;
  }
}

/**
 * 清理DOM缓存
 */
export function clearDomCache() {
  domCache.clear();
  logger.info('DOM缓存已清理');
}

// src/utils/logger.js

class Logger {
  /**
   * 构造函数
   * @param {Object} options - 配置选项
   * @param {string} options.prefix - 日志前缀
   * @param {boolean} options.enableDebug - 是否启用调试日志
   * @param {boolean} options.enableInfo - 是否启用信息日志
   * @param {boolean} options.enableWarn - 是否启用警告日志
   * @param {boolean} options.enableError - 是否启用错误日志
   * @param {number} options.maxHistorySize - 最大历史记录条数
   */
  constructor(options = {}) {
    this.prefix = options.prefix || '[抖音UI定制工具]';
    this.enableDebug = options.enableDebug !== false; // 默认启用
    this.enableInfo = options.enableInfo !== false;   // 默认启用
    this.enableWarn = options.enableWarn !== false;   // 默认启用
    this.enableError = options.enableError !== false; // 默认启用
    this.logHistory = [];
    this.maxHistorySize = options.maxHistorySize || 100; // 最大历史记录条数
  }

  /**
   * 格式化日志消息
   * @param {string} level - 日志级别
   * @param {*} args - 日志参数
   * @returns {string} 格式化后的日志消息
   */
  _formatMessage(level, ...args) {
    const timestamp = new Date().toLocaleTimeString();
    const formattedArgs = args.map(arg => {
      if (typeof arg === 'object' && arg !== null) {
        try {
          return JSON.stringify(arg, null, 2);
        } catch (e) {
          return String(arg);
        }
      }
      return String(arg);
    }).join(' ');
    
    return `[${timestamp}] ${this.prefix} [${level}] ${formattedArgs}`;
  }

  /**
   * 记录日志到历史记录
   * @param {string} level - 日志级别
   * @param {string} message - 日志消息
   */
  _addToHistory(level, message) {
    this.logHistory.push({
      timestamp: Date.now(),
      level,
      message
    });
    
    // 限制历史记录大小
    if (this.logHistory.length > this.maxHistorySize) {
      this.logHistory.shift();
    }
  }

  /**
   * 调试日志
   * @param {...*} args - 日志参数
   */
  debug(...args) {
    if (!this.enableDebug) return;
    const message = this._formatMessage('DEBUG', ...args);
    console.debug(message);
    this._addToHistory('DEBUG', message);
  }

  /**
   * 信息日志
   * @param {...*} args - 日志参数
   */
  info(...args) {
    if (!this.enableInfo) return;
    const message = this._formatMessage('INFO', ...args);
    console.info(message);
    this._addToHistory('INFO', message);
  }

  /**
   * 警告日志
   * @param {...*} args - 日志参数
   */
  warn(...args) {
    if (!this.enableWarn) return;
    const message = this._formatMessage('WARN', ...args);
    console.warn(message);
    this._addToHistory('WARN', message);
  }

  /**
   * 错误日志
   * @param {...*} args - 日志参数
   */
  error(...args) {
    if (!this.enableError) return;
    const message = this._formatMessage('ERROR', ...args);
    console.error(message);
    this._addToHistory('ERROR', message);
  }

  /**
   * 设置日志级别
   * @param {Object} options - 日志级别配置
   */
  setLevel(options) {
    this.enableDebug = options.debug !== false;
    this.enableInfo = options.info !== false;
    this.enableWarn = options.warn !== false;
    this.enableError = options.error !== false;
    this.debug('日志级别已更新:', options);
  }

  /**
   * 获取日志历史
   * @param {number} limit - 返回的最大条数
   * @returns {Array} 日志历史记录
   */
  getHistory(limit = this.logHistory.length) {
    return this.logHistory.slice(-limit);
  }

  /**
   * 清空日志历史
   */
  clearHistory() {
    this.logHistory = [];
    this.debug('日志历史已清空');
  }

  /**
   * 导出日志历史为字符串
   * @returns {string} 导出的日志字符串
   */
  exportLogs() {
    return this.logHistory
      .map(log => `[${new Date(log.timestamp).toISOString()}] [${log.level}] ${log.message}`)
      .join('\n');
  }

  /**
   * 捕获错误并记录
   * @param {Error} error - 错误对象
   * @param {string} context - 错误上下文
   */
  captureError(error, context = '') {
    const errorMessage = `${context}${context ? ': ' : ''}${error.message || 'Unknown error'}`;
    const stack = error.stack || '';
    this.error(errorMessage, 'Stack:', stack);
    
    // 可以在这里添加错误上报逻辑
    return errorMessage;
  }
}

// 创建默认实例
const defaultLogger = new Logger();

// 导出类和默认实例
export { Logger };
export default defaultLogger;

// src/utils/storage.js

import logger from './logger.js';

/**
 * 安全地获取本地存储数据
 * @param {string} key - 存储键名
 * @param {*} defaultValue - 默认值，当数据不存在或解析失败时返回
 * @returns {*} 存储的数据或默认值
 */
export function getItem(key, defaultValue = null) {
  try {
    const item = localStorage.getItem(key);
    if (!item) return defaultValue;
    
    const parsed = JSON.parse(item);
    
    // 检查数据是否过期
    if (parsed && parsed._expiresAt && Date.now() > parsed._expiresAt) {
      localStorage.removeItem(key);
      return defaultValue;
    }
    
    // 返回实际数据或整个对象（如果没有包装）
    return parsed._data !== undefined ? parsed._data : parsed;
  } catch (error) {
    logger.error(`获取存储数据失败 (${key}):`, error);
    return defaultValue;
  }
}

/**
 * 安全地设置本地存储数据
 * @param {string} key - 存储键名
 * @param {*} value - 要存储的数据
 * @param {number} [expiresIn] - 过期时间（毫秒），可选
 * @returns {boolean} 是否成功设置数据
 */
export function setItem(key, value, expiresIn) {
  try {
    let dataToStore;
    
    // 如果设置了过期时间，包装数据
    if (expiresIn !== undefined) {
      dataToStore = {
        _data: value,
        _expiresAt: Date.now() + expiresIn
      };
    } else {
      dataToStore = value;
    }
    
    localStorage.setItem(key, JSON.stringify(dataToStore));
    return true;
  } catch (error) {
    logger.error(`设置存储数据失败 (${key}):`, error);
    return false;
  }
}

/**
 * 安全地删除本地存储数据
 * @param {string} key - 存储键名
 * @returns {boolean} 是否成功删除数据
 */
export function removeItem(key) {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    logger.error(`删除存储数据失败 (${key}):`, error);
    return false;
  }
}

/**
 * 清除所有本地存储数据
 * @returns {boolean} 是否成功清除数据
 */
export function clearAll() {
  try {
    localStorage.clear();
    return true;
  } catch (error) {
    logger.error('清除所有存储数据失败:', error);
    return false;
  }
}

/**
 * 获取嵌套数据
 * @param {string} key - 存储键名
 * @param {string} path - 嵌套路径，如 'user.profile.name'
 * @param {*} defaultValue - 默认值
 * @returns {*} 嵌套数据或默认值
 */
export function getNestedItem(key, path, defaultValue = null) {
  try {
    const data = getItem(key, {});
    const keys = path.split('.');
    let current = data;
    
    for (const k of keys) {
      if (current === null || current === undefined || typeof current !== 'object') {
        return defaultValue;
      }
      current = current[k];
    }
    
    return current !== undefined ? current : defaultValue;
  } catch (error) {
    logger.error(`获取嵌套数据失败 (${key}.${path}):`, error);
    return defaultValue;
  }
}

/**
 * 设置嵌套数据
 * @param {string} key - 存储键名
 * @param {string} path - 嵌套路径，如 'user.profile.name'
 * @param {*} value - 要设置的值
 * @param {number} [expiresIn] - 过期时间（毫秒），可选
 * @returns {boolean} 是否成功设置数据
 */
export function setNestedItem(key, path, value, expiresIn) {
  try {
    // 先获取现有数据，如果不存在则使用空对象
    const data = getItem(key, {});
    const keys = path.split('.');
    let current = data;
    
    // 导航到目标路径的父级
    for (let i = 0; i < keys.length - 1; i++) {
      const k = keys[i];
      if (!current[k] || typeof current[k] !== 'object') {
        current[k] = {};
      }
      current = current[k];
    }
    
    // 设置最终值
    current[keys[keys.length - 1]] = value;
    
    // 保存更新后的数据
    return setItem(key, data, expiresIn);
  } catch (error) {
    logger.error(`设置嵌套数据失败 (${key}.${path}):`, error);
    return false;
  }
}

/**
 * 批量获取存储数据
 * @param {string[]} keys - 键名数组
 * @returns {Object} 键值对对象
 */
export function getMultipleItems(keys) {
  const result = {};
  
  keys.forEach(key => {
    result[key] = getItem(key);
  });
  
  return result;
}

/**
 * 批量设置存储数据
 * @param {Object} keyValuePairs - 键值对对象
 * @param {number} [expiresIn] - 统一的过期时间（毫秒），可选
 * @returns {Object} 每个键的设置结果
 */
export function setMultipleItems(keyValuePairs, expiresIn) {
  const results = {};
  
  for (const [key, value] of Object.entries(keyValuePairs)) {
    results[key] = setItem(key, value, expiresIn);
  }
  
  return results;
}

/**
 * 批量删除存储数据
 * @param {string[]} keys - 键名数组
 * @returns {Object} 每个键的删除结果
 */
export function removeMultipleItems(keys) {
  const results = {};
  
  keys.forEach(key => {
    results[key] = removeItem(key);
  });
  
  return results;
}

/**
 * 检查键是否存在
 * @param {string} key - 存储键名
 * @returns {boolean} 是否存在
 */
export function hasItem(key) {
  try {
    return localStorage.getItem(key) !== null;
  } catch (error) {
    logger.error(`检查键是否存在失败 (${key}):`, error);
    return false;
  }
}

/**
 * 获取存储的所有键名
 * @returns {string[]} 键名数组
 */
export function getAllKeys() {
  try {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      keys.push(localStorage.key(i));
    }
    return keys;
  } catch (error) {
    logger.error('获取所有键名失败:', error);
    return [];
  }
}

/**
 * 获取存储使用情况
 * @returns {Object} 存储使用信息
 */
export function getStorageInfo() {
  try {
    let totalSize = 0;
    const items = {};
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      const value = localStorage.getItem(key);
      const size = new Blob([key + value]).size;
      
      totalSize += size;
      items[key] = size;
    }
    
    return {
      totalItems: localStorage.length,
      totalSize: totalSize,
      totalSizeKB: (totalSize / 1024).toFixed(2),
      items: items
    };
  } catch (error) {
    logger.error('获取存储信息失败:', error);
    return {
      totalItems: 0,
      totalSize: 0,
      totalSizeKB: '0',
      items: {}
    };
  }
}

/**
 * 为存储键添加前缀
 * @param {string} prefix - 前缀
 * @param {string} key - 原始键名
 * @returns {string} 添加前缀后的键名
 */
export function getPrefixedKey(prefix, key) {
  return `${prefix}_${key}`;
}

/**
 * 命名空间存储类
 * 提供基于命名空间的存储管理
 */
export class NamespacedStorage {
  /**
   * 构造函数
   * @param {string} namespace - 命名空间
   */
  constructor(namespace) {
    this.namespace = namespace;
  }
  
  /**
   * 获取带命名空间的键名
   * @param {string} key - 原始键名
   * @returns {string} 带命名空间的键名
   */
  _getKey(key) {
    return getPrefixedKey(this.namespace, key);
  }
  
  /**
   * 获取数据
   * @param {string} key - 键名
   * @param {*} defaultValue - 默认值
   * @returns {*} 存储的数据
   */
  getItem(key, defaultValue = null) {
    return getItem(this._getKey(key), defaultValue);
  }
  
  /**
   * 设置数据
   * @param {string} key - 键名
   * @param {*} value - 值
   * @param {number} [expiresIn] - 过期时间
   * @returns {boolean} 是否成功
   */
  setItem(key, value, expiresIn) {
    return setItem(this._getKey(key), value, expiresIn);
  }
  
  /**
   * 删除数据
   * @param {string} key - 键名
   * @returns {boolean} 是否成功
   */
  removeItem(key) {
    return removeItem(this._getKey(key));
  }
  
  /**
   * 清除命名空间下的所有数据
   * @returns {boolean} 是否成功
   */
  clear() {
    try {
      const prefix = `${this.namespace}_`;
      const keysToRemove = [];
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(prefix)) {
          keysToRemove.push(key);
        }
      }
      
      keysToRemove.forEach(key => localStorage.removeItem(key));
      return true;
    } catch (error) {
      logger.error(`清除命名空间 ${this.namespace} 失败:`, error);
      return false;
    }
  }
}

// src/utils/eventEmitter.js

import logger from './logger.js';

class EventEmitter {
  /**
   * 构造函数
   */
  constructor() {
    this.events = {}; // 存储事件和对应的监听器
    this.maxListeners = 10; // 默认每个事件最大监听器数量
  }

  /**
   * 设置每个事件的最大监听器数量
   * @param {number} n - 最大监听器数量
   * @returns {EventEmitter} 当前实例，支持链式调用
   */
  setMaxListeners(n) {
    this.maxListeners = n;
    return this;
  }

  /**
   * 监听事件
   * @param {string} event - 事件名称
   * @param {Function} listener - 事件监听器函数
   * @returns {EventEmitter} 当前实例，支持链式调用
   */
  on(event, listener) {
    if (typeof listener !== 'function') {
      throw new TypeError('监听器必须是函数');
    }

    // 初始化事件监听器数组
    if (!this.events[event]) {
      this.events[event] = [];
    }

    // 检查监听器数量限制
    if (this.events[event].length >= this.maxListeners && !this.events[event].includes(listener)) {
      logger.warn(`警告: 事件'${event}'的监听器数量超过了${this.maxListeners}个。` +
                 `使用setMaxListeners方法可以修改此限制。`);
    }

    // 添加监听器
    this.events[event].push(listener);
    return this;
  }

  /**
   * 监听事件，但只触发一次
   * @param {string} event - 事件名称
   * @param {Function} listener - 事件监听器函数
   * @returns {EventEmitter} 当前实例，支持链式调用
   */
  once(event, listener) {
    if (typeof listener !== 'function') {
      throw new TypeError('监听器必须是函数');
    }

    // 创建一次性监听器包装函数
    const onceWrapper = (...args) => {
      this.off(event, onceWrapper); // 触发后立即移除
      listener.apply(this, args);    // 调用原始监听器
    };

    onceWrapper.originalListener = listener; // 保存原始监听器引用
    return this.on(event, onceWrapper);
  }

  /**
   * 移除事件监听器
   * @param {string} [event] - 事件名称（可选）
   * @param {Function} [listener] - 要移除的监听器函数（可选）
   * @returns {EventEmitter} 当前实例，支持链式调用
   */
  off(event, listener) {
    // 如果没有指定事件，移除所有事件的所有监听器
    if (event === undefined) {
      this.events = {};
      return this;
    }

    // 如果事件不存在，直接返回
    if (!this.events[event]) {
      return this;
    }

    // 如果没有指定监听器，移除该事件的所有监听器
    if (listener === undefined) {
      this.events[event] = [];
      return this;
    }

    // 过滤掉要移除的监听器
    this.events[event] = this.events[event].filter(l => {
      // 处理once包装的监听器
      return l !== listener && l.originalListener !== listener;
    });

    return this;
  }

  /**
   * 触发事件
   * @param {string} event - 事件名称
   * @param {...*} args - 传递给监听器的参数
   * @returns {boolean} 是否有监听器被触发
   */
  emit(event, ...args) {
    // 如果事件不存在或没有监听器，返回false
    if (!this.events[event] || this.events[event].length === 0) {
      return false;
    }

    // 复制监听器数组，避免触发过程中修改数组导致的问题
    const listeners = [...this.events[event]];
    
    // 异步执行所有监听器，避免阻塞
    listeners.forEach(listener => {
      try {
        listener.apply(this, args);
      } catch (error) {
        logger.error(`事件'${event}'的监听器执行出错:`, error);
      }
    });

    return true;
  }

  /**
   * 获取指定事件的所有监听器
   * @param {string} event - 事件名称
   * @returns {Array} 监听器函数数组
   */
  listeners(event) {
    return this.events[event] || [];
  }

  /**
   * 获取所有注册的事件名称
   * @returns {Array} 事件名称数组
   */
  eventNames() {
    return Object.keys(this.events).filter(event => this.events[event].length > 0);
  }

  /**
   * 获取指定事件的监听器数量
   * @param {string} event - 事件名称
   * @returns {number} 监听器数量
   */
  listenerCount(event) {
    return this.events[event] ? this.events[event].length : 0;
  }

  /**
   * 清除指定事件的所有监听器
   * @param {string} event - 事件名称
   * @returns {EventEmitter} 当前实例，支持链式调用
   */
  removeAllListeners(event) {
    if (event) {
      // 清除特定事件的监听器
      this.events[event] = [];
    } else {
      // 清除所有事件的监听器
      this.events = {};
    }
    return this;
  }

  /**
   * 在监听器队列开头添加监听器
   * @param {string} event - 事件名称
   * @param {Function} listener - 事件监听器函数
   * @returns {EventEmitter} 当前实例，支持链式调用
   */
  prependListener(event, listener) {
    if (typeof listener !== 'function') {
      throw new TypeError('监听器必须是函数');
    }

    // 初始化事件监听器数组
    if (!this.events[event]) {
      this.events[event] = [];
    }

    // 添加到队列开头
    this.events[event].unshift(listener);
    return this;
  }

  /**
   * 在监听器队列开头添加只触发一次的监听器
   * @param {string} event - 事件名称
   * @param {Function} listener - 事件监听器函数
   * @returns {EventEmitter} 当前实例，支持链式调用
   */
  prependOnceListener(event, listener) {
    if (typeof listener !== 'function') {
      throw new TypeError('监听器必须是函数');
    }

    const onceWrapper = (...args) => {
      this.off(event, onceWrapper);
      listener.apply(this, args);
    };

    onceWrapper.originalListener = listener;
    
    // 初始化事件监听器数组
    if (!this.events[event]) {
      this.events[event] = [];
    }

    // 添加到队列开头
    this.events[event].unshift(onceWrapper);
    return this;
  }
}

// 创建默认实例
const defaultEventEmitter = new EventEmitter();

// 导出类和默认实例
export { EventEmitter };
export default defaultEventEmitter;

// src/utils/autoExecutor.js

import { debounce, throttle, getElement, getElements, findElementsByClassPattern, findElementsByStructure } from './dom.js';
import logger from './logger.js';
import eventEmitter from './eventEmitter.js';
import buttonDetector from './buttonDetector.js';

class AutoExecutor {
  constructor(options = {}) {
    this.options = {
      detectionStrategies: ['text', 'css', 'structure'],
      retryConfig: {
        maxAttempts: 10,
        initialDelay: 500,
        backoffFactor: 2
      },
      checkInterval: 1000,
      enabled: false,
      customDetector: null,
      confirmationRequired: false,
      enableLogging: true,
      captureScreenshots: false,
      maxHistorySize: 100,
      ...options
    };

    this.isRunning = false;
    this.isEmergencyStopped = false;
    this.checkIntervalId = null;
    this.executionHistory = [];
    this.currentAttempt = 0;

    if (this.options.enableLogging) {
      logger.info('AutoExecutor initialized with options:', this.options);
    }

    eventEmitter.on('autoExecutor.emergencyStop', () => {
      this.emergencyStop();
    });
  }

  start() {
    if (this.isRunning) {
      if (this.options.enableLogging) {
        logger.warn('AutoExecutor is already running');
      }
      return;
    }

    if (this.options.confirmationRequired) {
      const confirmed = confirm('确认要启动自动执行控制器吗？这将自动点击界面中的按钮。');
      if (!confirmed) {
        return;
      }
    }

    this.isRunning = true;
    this.isEmergencyStopped = false;
    this.currentAttempt = 0;

    if (this.options.enableLogging) {
      logger.info('AutoExecutor started');
    }

    this.isEmergencyStopped = false;
    this.detectAndClick();

    this.checkIntervalId = setInterval(() => {
      this.detectAndClick();
    }, this.options.checkInterval);

    eventEmitter.emit('autoExecutor.started');
  }

  stop() {
    if (!this.isRunning) {
      if (this.options.enableLogging) {
        logger.warn('AutoExecutor is not running');
      }
      return;
    }

    this.isRunning = false;
    this.isEmergencyStopped = false;

    if (this.checkIntervalId) {
      clearInterval(this.checkIntervalId);
      this.checkIntervalId = null;
    }

    if (this.options.enableLogging) {
      logger.info('AutoExecutor stopped');
    }

    eventEmitter.emit('autoExecutor.stopped');
  }

  emergencyStop() {
    this.isEmergencyStopped = true;
    this.stop();

    if (this.options.enableLogging) {
      logger.error('AutoExecutor emergency stopped');
    }

    eventEmitter.emit('autoExecutor.emergencyStopped');
  }

  async detectAndClick() {
    if (this.isEmergencyStopped) {
      return;
    }

    try {
      this.currentAttempt++;

      const button = await this.detectButton();

      if (button) {
        if (this.isButtonClickable(button)) {
          if (this.options.captureScreenshots) {
            this.captureScreenshot('before_click');
          }

          this.clickButton(button);

          if (this.options.captureScreenshots) {
            setTimeout(() => {
              this.captureScreenshot('after_click');
            }, 500);
          }

          this.currentAttempt = 0;
        }
      } else if (this.currentAttempt >= this.options.retryConfig.maxAttempts) {
        if (this.options.enableLogging) {
          logger.warn(`AutoExecutor failed to detect button after ${this.currentAttempt} attempts`);
        }

        eventEmitter.emit('autoExecutor.retryFailed', { attempts: this.currentAttempt });
        this.currentAttempt = 0;
      }
    } catch (error) {
      if (this.options.enableLogging) {
        logger.error('AutoExecutor error during detectAndClick:', error);
      }

      eventEmitter.emit('autoExecutor.error', { error });
    }
  }

  async detectButton() {
    let button = null;

    if (this.options.customDetector) {
      try {
        button = this.options.customDetector();
        if (button) {
          if (this.options.enableLogging) {
            logger.info('AutoExecutor detected button using custom detector');
          }
          return button;
        }
      } catch (error) {
        if (this.options.enableLogging) {
          logger.warn('AutoExecutor custom detector failed:', error);
        }
      }
    }

    const detectorOptions = {
      detectionStrategies: this.options.detectionStrategies
    };
    button = buttonDetector.detect(detectorOptions);

    return button;
  }

  isButtonClickable(button) {
    if (!button) return false;
    if (button.disabled || button.hasAttribute('disabled')) return false;
    if (button.style.display === 'none' || button.style.visibility === 'hidden') return false;

    const rect = button.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return false;

    if (rect.bottom < 0 || rect.top > window.innerHeight || rect.right < 0 || rect.left > window.innerWidth) {
      return false;
    }

    return true;
  }

  compressHistory() {
    if (this.executionHistory.length > this.options.maxHistorySize) {
      this.executionHistory = this.executionHistory.slice(-this.options.maxHistorySize);

      if (this.options.enableLogging) {
        logger.info(`AutoExecutor compressed history to ${this.executionHistory.length} records`);
      }
    }
  }

  clickButton(button) {
    if (!button) return;

    try {
      const clickEvent = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        view: window
      });

      button.dispatchEvent(clickEvent);

      this.executionHistory.push({
        timestamp: new Date().toISOString(),
        buttonText: button.textContent || button.innerText || 'Unknown',
        buttonSelector: this.getElementSelector(button),
        success: true
      });

      this.compressHistory();

      if (this.options.enableLogging) {
        logger.info(`AutoExecutor clicked button: ${button.textContent || button.innerText}`);
      }

      eventEmitter.emit('autoExecutor.buttonClicked', {
        button,
        text: button.textContent || button.innerText,
        selector: this.getElementSelector(button)
      });
    } catch (error) {
      this.executionHistory.push({
        timestamp: new Date().toISOString(),
        buttonText: button.textContent || button.innerText || 'Unknown',
        buttonSelector: this.getElementSelector(button),
        success: false,
        error: error.message
      });

      this.compressHistory();

      if (this.options.enableLogging) {
        logger.error('AutoExecutor failed to click button:', error);
      }

      eventEmitter.emit('autoExecutor.buttonClickFailed', {
        button,
        error
      });
    }
  }

  getElementSelector(element) {
    if (!element) return '';

    try {
      if (element.id) {
        return `#${element.id}`;
      }

      if (element.className && typeof element.className === 'string') {
        const classes = element.className.trim().split(/\s+/);
        for (const cls of classes) {
          if (document.querySelectorAll(`.${cls}`).length === 1) {
            return `.${cls}`;
          }
        }
      }

      let path = [];
      let current = element;

      while (current && current.tagName) {
        let selector = current.tagName.toLowerCase();

        if (current.className && typeof current.className === 'string') {
          const classes = current.className.trim().split(/\s+/);
          selector += '.' + classes.join('.');
        }

        path.unshift(selector);
        current = current.parentElement;
      }

      return path.join(' > ');
    } catch (error) {
      return element.tagName.toLowerCase();
    }
  }

  captureScreenshot(type) {
    try {
      if (typeof HTMLCanvasElement !== 'undefined') {
        logger.info(`AutoExecutor capturing screenshot: ${type}`);
      }
    } catch (error) {
      logger.error('AutoExecutor failed to capture screenshot:', error);
    }
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      isEmergencyStopped: this.isEmergencyStopped,
      currentAttempt: this.currentAttempt,
      executionHistory: this.executionHistory.slice(-10),
      options: this.options
    };
  }

  getExecutionHistory(limit = null) {
    if (limit) {
      return this.executionHistory.slice(-limit);
    }
    return [...this.executionHistory];
  }

  getCurrentAttempt() {
    return this.currentAttempt;
  }

  updateOptions(newOptions) {
    this.options = { ...this.options, ...newOptions };

    if (this.options.enableLogging) {
      logger.info('AutoExecutor options updated:', newOptions);
    }
  }
}

export default new AutoExecutor();


// src/utils/performance.js

import logger from './logger.js';

class PerformanceMonitor {
  /**
   * 构造函数
   * @param {Object} options - 配置选项
   * @param {boolean} options.enableFpsMonitor - 是否启用帧率监控
   * @param {boolean} options.enableMemoryMonitor - 是否启用内存监控
   * @param {number} options.sampleInterval - 采样间隔(ms)
   */
  constructor(options = {}) {
    this.enableFpsMonitor = options.enableFpsMonitor !== false;
    this.enableMemoryMonitor = options.enableMemoryMonitor !== false;
    this.sampleInterval = options.sampleInterval || 1000;
    
    this.metrics = {
      fps: [],
      memory: [],
      executionTimes: {},
      renderTimes: []
    };
    
    this.isMonitoring = false;
    this.fpsMonitorId = null;
    this.memoryMonitorId = null;
    
    this.lastTime = 0;
    this.frameCount = 0;
    this.fpsHistory = [];
    this.maxFpsHistory = 60; // 保存最近60帧的数据
  }

  /**
   * 开始性能监控
   */
  startMonitoring() {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    
    // 启动帧率监控
    if (this.enableFpsMonitor && window.requestAnimationFrame) {
      this.lastTime = performance.now();
      this.frameCount = 0;
      this._startFpsMonitoring();
    }
    
    // 启动内存监控
    if (this.enableMemoryMonitor && performance.memory) {
      this.memoryMonitorId = setInterval(() => {
        this._collectMemoryMetrics();
      }, this.sampleInterval);
    }
  }

  /**
   * 停止性能监控
   */
  stopMonitoring() {
    if (!this.isMonitoring) return;
    
    this.isMonitoring = false;
    
    // 停止帧率监控
    if (this.fpsMonitorId) {
      cancelAnimationFrame(this.fpsMonitorId);
      this.fpsMonitorId = null;
    }
    
    // 停止内存监控
    if (this.memoryMonitorId) {
      clearInterval(this.memoryMonitorId);
      this.memoryMonitorId = null;
    }
  }

  /**
   * 内部方法：开始帧率监控
   * @private
   */
  _startFpsMonitoring() {
    if (!this.isMonitoring) return;
    
    this.fpsMonitorId = requestAnimationFrame((currentTime) => {
      this.frameCount++;
      const deltaTime = currentTime - this.lastTime;
      
      // 每秒计算一次FPS
      if (deltaTime >= 1000) {
        const fps = Math.round((this.frameCount * 1000) / deltaTime);
        this._recordFps(fps);
        
        // 重置计数器
        this.frameCount = 0;
        this.lastTime = currentTime;
      }
      
      this._startFpsMonitoring();
    });
  }

  /**
   * 内部方法：记录FPS
   * @private
   * @param {number} fps - 帧率值
   */
  _recordFps(fps) {
    this.fpsHistory.push(fps);
    if (this.fpsHistory.length > this.maxFpsHistory) {
      this.fpsHistory.shift();
    }
    
    this.metrics.fps.push({
      timestamp: Date.now(),
      value: fps
    });
  }

  /**
   * 内部方法：收集内存指标
   * @private
   */
  _collectMemoryMetrics() {
    if (!performance.memory) return;
    
    const memoryInfo = {
      timestamp: Date.now(),
      usedJSHeapSize: performance.memory.usedJSHeapSize,
      totalJSHeapSize: performance.memory.totalJSHeapSize,
      jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
    };
    
    this.metrics.memory.push(memoryInfo);
  }

  /**
   * 记录函数执行时间
   * @param {string} id - 执行标记ID
   * @param {Function} fn - 要执行的函数
   * @returns {*} 函数执行结果
   */
  measureExecutionTime(id, fn) {
    const startTime = performance.now();
    
    try {
      const result = fn();
      const duration = performance.now() - startTime;
      
      // 记录执行时间
      if (!this.metrics.executionTimes[id]) {
        this.metrics.executionTimes[id] = [];
      }
      
      this.metrics.executionTimes[id].push({
        timestamp: Date.now(),
        duration
      });
      
      return result;
    } catch (error) {
      logger.error(`测量执行时间出错 [${id}]:`, error);
      throw error;
    }
  }

  /**
   * 开始测量渲染时间
   * @returns {Function} 结束测量的函数
   */
  startRenderMeasurement() {
    const startTime = performance.now();
    
    return () => {
      const duration = performance.now() - startTime;
      this.metrics.renderTimes.push({
        timestamp: Date.now(),
        duration
      });
      return duration;
    };
  }

  /**
   * 获取当前FPS
   * @returns {number} 当前帧率
   */
  getCurrentFps() {
    if (this.fpsHistory.length === 0) return 0;
    return this.fpsHistory[this.fpsHistory.length - 1];
  }

  /**
   * 获取平均FPS
   * @param {number} samples - 样本数量
   * @returns {number} 平均帧率
   */
  getAverageFps(samples = 10) {
    if (this.fpsHistory.length === 0) return 0;
    
    const recentSamples = this.fpsHistory.slice(-samples);
    const sum = recentSamples.reduce((acc, fps) => acc + fps, 0);
    return Math.round(sum / recentSamples.length);
  }

  /**
   * 获取内存使用情况
   * @returns {Object|null} 内存信息或null
   */
  getMemoryInfo() {
    if (!performance.memory) return null;
    
    return {
      usedJSHeapSize: performance.memory.usedJSHeapSize,
      totalJSHeapSize: performance.memory.totalJSHeapSize,
      jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
      usedPercent: Math.round((performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit) * 100)
    };
  }

  /**
   * 获取性能指标
   * @returns {Object} 性能指标数据
   */
  getMetrics() {
    return {
      fps: [...this.metrics.fps],
      memory: [...this.metrics.memory],
      executionTimes: { ...this.metrics.executionTimes },
      renderTimes: [...this.metrics.renderTimes],
      currentFps: this.getCurrentFps(),
      averageFps: this.getAverageFps(),
      memoryInfo: this.getMemoryInfo()
    };
  }

  /**
   * 清除性能指标数据
   */
  clearMetrics() {
    this.metrics = {
      fps: [],
      memory: [],
      executionTimes: {},
      renderTimes: []
    };
    this.fpsHistory = [];
  }

  /**
   * 导出性能报告
   * @returns {string} JSON格式的性能报告
   */
  exportReport() {
    return JSON.stringify(this.getMetrics(), null, 2);
  }

  /**
   * 检查性能是否良好
   * @returns {Object} 性能状态对象
   */
  checkPerformanceHealth() {
    const avgFps = this.getAverageFps();
    const memoryInfo = this.getMemoryInfo();
    
    return {
      isHealthy: avgFps >= 30 && (!memoryInfo || memoryInfo.usedPercent < 80),
      fpsHealthy: avgFps >= 30,
      memoryHealthy: !memoryInfo || memoryInfo.usedPercent < 80,
      currentFps: this.getCurrentFps(),
      averageFps: avgFps,
      memoryUsage: memoryInfo ? `${memoryInfo.usedPercent}%` : 'N/A'
    };
  }

  /**
   * 监听性能问题
   * @param {Function} callback - 性能问题回调函数
   * @returns {Object} 包含stop方法的控制对象
   */
  watchPerformance(callback) {
    const checkInterval = setInterval(() => {
      const health = this.checkPerformanceHealth();
      if (!health.isHealthy) {
        callback(health);
      }
    }, 5000); // 每5秒检查一次
    
    return {
      stop: () => clearInterval(checkInterval)
    };
  }
}

// 创建默认实例
const defaultPerformanceMonitor = new PerformanceMonitor();

// 导出类和默认实例
export { PerformanceMonitor };
export default defaultPerformanceMonitor;

// src/controllers/elementController.js

import { logger } from '../utils/logger.js';
import { getElement, getElements } from '../utils/dom.js';

/**
 * 元素控制器类
 */
class ElementController {
  /**
   * 构造函数
   */
  constructor() {
    // 存储被操作元素的原始样式信息
    this.originalStyles = new WeakMap();
    // 存储元素的显示/隐藏状态
    this.elementVisibility = new WeakMap();
    logger.info('ElementController 初始化成功');
  }

  /**
   * 隐藏指定的元素，使用CSS变换实现平滑过渡效果
   * @param {String|Element} selector - CSS选择器或DOM元素，支持单个元素或元素集合
   * @returns {Promise<Boolean>} 隐藏是否成功
   */
  async hideElement(selector) {
    try {
      const elements = this._resolveElements(selector);
      
      if (elements.length === 0) {
        logger.warn(`没有找到匹配的元素: ${selector}`);
        return false;
      }

      for (const element of elements) {
        // 保存原始样式
        this._saveOriginalStyle(element);
        
        // 添加过渡效果
        element.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        element.style.opacity = '0';
        element.style.transform = 'translateY(-10px)';
        element.style.pointerEvents = 'none';
        
        // 标记为隐藏
        this.elementVisibility.set(element, false);
      }

      // 等待过渡动画完成
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // 完全隐藏元素
      for (const element of elements) {
        element.style.display = 'none';
      }

      logger.info(`成功隐藏 ${elements.length} 个元素`);
      return true;
    } catch (error) {
      logger.error(`隐藏元素失败:`, error);
      return false;
    }
  }

  /**
   * 显示指定的元素，恢复之前隐藏的元素状态
   * @param {String|Element} selector - CSS选择器或DOM元素，支持单个元素或元素集合
   * @returns {Promise<Boolean>} 显示是否成功
   */
  async showElement(selector) {
    try {
      const elements = this._resolveElements(selector);
      
      if (elements.length === 0) {
        logger.warn(`没有找到匹配的元素: ${selector}`);
        return false;
      }

      for (const element of elements) {
        // 移除display: none
        element.style.display = '';
        
        // 添加过渡效果
        element.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        element.style.opacity = '0';
        element.style.transform = 'translateY(-10px)';
      }

      // 强制重排
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // 显示元素
      for (const element of elements) {
        element.style.opacity = '1';
        element.style.transform = 'translateY(0)';
        element.style.pointerEvents = '';
        
        // 标记为显示
        this.elementVisibility.set(element, true);
      }

      // 等待过渡动画完成
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // 清理过渡样式
      for (const element of elements) {
        element.style.transition = '';
      }

      logger.info(`成功显示 ${elements.length} 个元素`);
      return true;
    } catch (error) {
      logger.error(`显示元素失败:`, error);
      return false;
    }
  }

  /**
   * 切换元素的显示/隐藏状态，根据当前状态自动切换
   * @param {String|Element} selector - CSS选择器或DOM元素，支持单个元素或元素集合
   * @returns {Promise<Boolean>} 切换后的显示状态（true表示显示，false表示隐藏）
   */
  async toggleElement(selector) {
    try {
      const elements = this._resolveElements(selector);
      
      if (elements.length === 0) {
        logger.warn(`没有找到匹配的元素: ${selector}`);
        return false;
      }

      // 确定是否需要显示或隐藏（基于第一个元素的状态）
      const firstElement = elements[0];
      const currentVisibility = this.elementVisibility.get(firstElement) !== false && 
                               firstElement.style.display !== 'none';
      const targetVisibility = !currentVisibility;

      if (targetVisibility) {
        await this.showElement(selector);
      } else {
        await this.hideElement(selector);
      }

      return targetVisibility;
    } catch (error) {
      logger.error(`切换元素状态失败:`, error);
      return false;
    }
  }

  /**
   * 修改元素的样式
   * @param {String|Element} selector - CSS选择器或DOM元素
   * @param {Object} styles - 样式对象
   * @returns {Boolean} 操作是否成功
   */
  modifyElementStyle(selector, styles) {
    try {
      const elements = this._resolveElements(selector);
      
      if (elements.length === 0) {
        logger.warn(`没有找到匹配的元素: ${selector}`);
        return false;
      }

      for (const element of elements) {
        // 保存原始样式（如果还没有保存）
        if (!this.originalStyles.has(element)) {
          this._saveOriginalStyle(element);
        }

        // 应用新样式
        Object.assign(element.style, styles);
      }

      logger.info(`成功修改 ${elements.length} 个元素的样式`);
      return true;
    } catch (error) {
      logger.error(`修改元素样式失败:`, error);
      return false;
    }
  }

  /**
   * 重置元素的样式为默认状态
   * @param {String|Element} selector - CSS选择器或DOM元素
   * @returns {Boolean} 操作是否成功
   */
  resetElementStyle(selector) {
    try {
      const elements = this._resolveElements(selector);
      
      if (elements.length === 0) {
        logger.warn(`没有找到匹配的元素: ${selector}`);
        return false;
      }

      for (const element of elements) {
        // 如果有保存的原始样式，则恢复
        if (this.originalStyles.has(element)) {
          const originalStyle = this.originalStyles.get(element);
          
          // 清除所有样式
          element.removeAttribute('style');
          
          // 恢复必要的样式属性（如果有）
          if (originalStyle) {
            Object.assign(element.style, originalStyle);
          }
          
          // 清除存储的信息
          this.originalStyles.delete(element);
          this.elementVisibility.delete(element);
        } else {
          // 直接清除样式
          element.removeAttribute('style');
        }
      }

      logger.info(`成功重置 ${elements.length} 个元素的样式`);
      return true;
    } catch (error) {
      logger.error(`重置元素样式失败:`, error);
      return false;
    }
  }

  /**
   * 识别页面中的所有可操作元素
   * @returns {Array<{id: String, selector: String, type: String, description: String}>} 元素列表
   */
  identifyElements() {
    try {
      const elements = [];
      let elementId = 1;

      // 识别按钮元素
      const buttons = getElements('button, [role="button"], .btn, .button, .action');
      buttons.forEach(button => {
        const selector = this._generateSelector(button);
        const description = button.textContent?.trim() || button.getAttribute('aria-label') || '按钮';
        elements.push({
          id: `btn_${elementId++}`,
          selector: selector,
          type: 'button',
          description: description
        });
      });

      // 识别输入元素
      const inputs = getElements('input, textarea, select');
      inputs.forEach(input => {
        const selector = this._generateSelector(input);
        const label = this._getElementLabel(input);
        elements.push({
          id: `input_${elementId++}`,
          selector: selector,
          type: 'input',
          description: label || '输入框'
        });
      });

      // 识别容器元素
      const containers = getElements('.container, .wrapper, .section, .card, .panel');
      containers.forEach(container => {
        const selector = this._generateSelector(container);
        elements.push({
          id: `container_${elementId++}`,
          selector: selector,
          type: 'container',
          description: `容器 - ${container.classList.value}`
        });
      });

      // 识别视频相关元素
      const videoElements = getElements('video, .video, .player');
      videoElements.forEach(video => {
        const selector = this._generateSelector(video);
        elements.push({
          id: `video_${elementId++}`,
          selector: selector,
          type: 'video',
          description: '视频元素'
        });
      });

      logger.info(`成功识别 ${elements.length} 个可操作元素`);
      return elements;
    } catch (error) {
      logger.error(`识别元素失败:`, error);
      return [];
    }
  }

  /**
   * 解析选择器或元素为元素数组
   * @private
   * @param {String|Element|Array<Element>} selector - CSS选择器或DOM元素或元素数组
   * @returns {Array<Element>} 元素数组
   */
  _resolveElements(selector) {
    if (!selector) {
      return [];
    }

    if (typeof selector === 'string') {
      return getElements(selector);
    } else if (selector.nodeType === 1) {
      return [selector];
    } else if (Array.isArray(selector)) {
      return selector.filter(el => el && el.nodeType === 1);
    }

    return [];
  }

  /**
   * 保存元素的原始样式
   * @private
   * @param {Element} element - DOM元素
   */
  _saveOriginalStyle(element) {
    if (!this.originalStyles.has(element)) {
      const computedStyle = window.getComputedStyle(element);
      const originalStyle = {};
      
      // 保存关键样式属性
      const importantProperties = ['display', 'opacity', 'transform', 'pointer-events'];
      importantProperties.forEach(prop => {
        originalStyle[prop] = element.style[prop];
      });
      
      this.originalStyles.set(element, originalStyle);
    }
  }

  /**
   * 生成元素的唯一选择器
   * @private
   * @param {Element} element - DOM元素
   * @returns {String} CSS选择器
   */
  _generateSelector(element) {
    if (!element) return '';

    // 如果有id，优先使用id选择器
    if (element.id) {
      return `#${element.id}`;
    }

    // 如果有特定的类，使用类选择器
    const specificClasses = Array.from(element.classList).filter(cls => 
      /^(btn|input|card|panel|container|video)/i.test(cls)
    );
    if (specificClasses.length > 0) {
      return `.${specificClasses[0]}`;
    }

    // 使用标签名和位置
    const tagName = element.tagName.toLowerCase();
    const siblings = element.parentNode ? Array.from(element.parentNode.children) : [];
    const index = siblings.indexOf(element);
    
    if (siblings.length > 1) {
      return `${tagName}:nth-child(${index + 1})`;
    }

    return tagName;
  }

  /**
   * 获取元素的标签文本
   * @private
   * @param {Element} element - DOM元素
   * @returns {String} 标签文本
   */
  _getElementLabel(element) {
    // 查找关联的label元素
    const id = element.id;
    if (id) {
      const label = getElement(`label[for="${id}"]`);
      if (label) return label.textContent.trim();
    }

    // 查找父元素中的label
    if (element.closest('label')) {
      return element.closest('label').textContent.trim();
    }

    // 返回placeholder或name属性
    return element.getAttribute('placeholder') || element.getAttribute('name');
  }
}

// 创建并导出元素控制器实例
const elementController = new ElementController();

export { ElementController };
export default elementController;

// src/controllers/layoutController.js

import { logger } from '../utils/logger.js';
import { getElement, getElements, createElement } from '../utils/dom.js';
import elementController from './elementController.js';

// 预定义布局配置
const PREDEFINED_LAYOUTS = {
  // 紧凑布局 - 最小化界面元素，最大化内容显示区域
  compact: {
    name: 'compact',
    label: '紧凑布局',
    description: '最小化界面元素，最大化内容显示区域',
    rules: [
      { selector: '.sidebar, .menu, .navigation', action: 'hide' },
      { selector: '.header, .top-bar', styles: { height: '40px', padding: '5px 10px' } },
      { selector: '.footer, .bottom-bar', styles: { height: '30px', padding: '5px' } },
      { selector: '.content, .main-content', styles: { padding: '10px' } },
      { selector: '.card, .video-card', styles: { margin: '5px', borderRadius: '4px' } }
    ]
  },
  
  // 全屏布局 - 隐藏所有非必要元素，专注于内容
  fullscreen: {
    name: 'fullscreen',
    label: '全屏布局',
    description: '隐藏所有非必要元素，专注于内容',
    rules: [
      { selector: '.sidebar, .menu, .navigation, .header, .footer', action: 'hide' },
      { selector: '.content, .main-content', styles: { padding: '0', margin: '0' } },
      { selector: '.video-player, video', styles: { width: '100%', height: '100vh' } }
    ]
  },
  
  // 默认布局 - 标准的三栏布局
  standard: {
    name: 'standard',
    label: '标准布局',
    description: '标准的三栏布局，包含侧边栏、主内容区和信息面板',
    rules: [
      { selector: '.sidebar, .left-sidebar', styles: { width: '240px', display: 'block' } },
      { selector: '.main-content', styles: { marginLeft: '240px', marginRight: '300px' } },
      { selector: '.right-sidebar, .info-panel', styles: { width: '300px', display: 'block' } },
      { selector: '.header, .footer', styles: { display: 'block' } }
    ]
  },
  
  // 阅读模式 - 优化文本阅读体验
  reader: {
    name: 'reader',
    label: '阅读模式',
    description: '优化文本阅读体验，移除干扰元素',
    rules: [
      { selector: '.sidebar, .advertisement, .recommendations', action: 'hide' },
      { selector: '.content, .article, .post', styles: { maxWidth: '800px', margin: '0 auto', padding: '20px' } },
      { selector: 'p', styles: { fontSize: '18px', lineHeight: '1.8' } },
      { selector: 'h1, h2, h3', styles: { marginTop: '30px', marginBottom: '15px' } }
    ]
  },
  
  // 视频模式 - 优化视频观看体验
  video: {
    name: 'video',
    label: '视频模式',
    description: '优化视频观看体验，最大化视频区域',
    rules: [
      { selector: '.sidebar, .recommendations, .comments', action: 'hide' },
      { selector: '.video-container, .player-container', styles: { width: '100%', maxWidth: '1200px', margin: '0 auto' } },
      { selector: '.video-player, video', styles: { width: '100%', height: 'auto', aspectRatio: '16/9' } },
      { selector: '.video-info', styles: { maxWidth: '800px', margin: '20px auto' } }
    ]
  }
};

/**
 * 布局控制器类
 */
class LayoutController {
  /**
   * 构造函数
   */
  constructor() {
    this.layouts = { ...PREDEFINED_LAYOUTS };
    this.currentLayout = null;
    this.customLayouts = {};
    this.layoutPrefix = 'douyin_ui_customizer_layout_';
    
    // 初始化时从存储加载自定义布局
    this._loadCustomLayouts();
    
    logger.info('LayoutController 初始化成功');
  }

  /**
   * 应用预定义的布局模板到当前页面
   * @param {String} layoutName - 布局名称，必须是预定义布局之一
   * @returns {Promise<Boolean>} 应用是否成功
   */
  async applyLayout(layoutName) {
    try {
      // 验证布局名称
      const layout = this.layouts[layoutName];
      if (!layout) {
        logger.warn(`布局 ${layoutName} 不存在`);
        return false;
      }

      logger.info(`开始应用布局: ${layout.label}`);

      // 首先重置所有元素样式
      await this.resetLayout();

      // 应用布局规则
      for (const rule of layout.rules) {
        if (rule.action === 'hide') {
          await elementController.hideElement(rule.selector);
        } else if (rule.styles) {
          elementController.modifyElementStyle(rule.selector, rule.styles);
        }
      }

      // 更新当前布局
      this.currentLayout = layoutName;
      
      // 保存当前布局设置
      localStorage.setItem(`${this.layoutPrefix}current`, layoutName);
      
      // 添加布局类到body
      document.body.classList.remove(
        ...Object.keys(this.layouts).map(l => `douyin-ui-customizer-layout-${l}`)
      );
      document.body.classList.add(`douyin-ui-customizer-layout-${layoutName}`);

      logger.info(`布局应用成功: ${layout.label}`);
      return true;
    } catch (error) {
      logger.error(`应用布局失败 (${layoutName}):`, error);
      return false;
    }
  }

  /**
   * 保存用户自定义布局配置，可在后续应用或分享给其他用户
   * @param {String} layoutName - 布局名称，必须唯一且不为空
   * @param {Object} layoutConfig - 布局配置对象，包含各页面元素的位置、大小等信息
   * @returns {Boolean} 保存是否成功
   */
  saveLayout(layoutName, layoutConfig) {
    try {
      // 验证参数
      if (!layoutName || typeof layoutName !== 'string' || layoutName.trim() === '') {
        throw new Error('布局名称不能为空');
      }

      if (!layoutConfig || typeof layoutConfig !== 'object') {
        throw new Error('布局配置必须是有效的对象');
      }

      // 不允许覆盖预定义布局
      if (PREDEFINED_LAYOUTS[layoutName]) {
        throw new Error('不能覆盖预定义布局');
      }

      // 创建布局配置
      const layout = {
        name: layoutName,
        label: layoutConfig.label || layoutName,
        description: layoutConfig.description || '自定义布局',
        rules: layoutConfig.rules || [],
        isCustom: true,
        createdAt: new Date().toISOString()
      };

      // 保存布局
      this.layouts[layoutName] = layout;
      this.customLayouts[layoutName] = layout;
      
      // 持久化保存
      this._saveCustomLayouts();

      logger.info(`自定义布局保存成功: ${layout.label}`);
      return true;
    } catch (error) {
      logger.error(`保存布局失败:`, error);
      return false;
    }
  }

  /**
   * 获取所有可用的布局
   * @returns {Array<Object>} 布局对象数组
   */
  getAvailableLayouts() {
    return Object.values(this.layouts);
  }

  /**
   * 获取当前应用的布局名称
   * @returns {String|null} 当前布局名称
   */
  getCurrentLayout() {
    return this.currentLayout;
  }

  /**
   * 重置布局为默认状态
   * @returns {Promise<Boolean>} 重置是否成功
   */
  async resetLayout() {
    try {
      // 移除所有布局类
      Object.keys(this.layouts).forEach(layoutName => {
        document.body.classList.remove(`douyin-ui-customizer-layout-${layoutName}`);
      });

      // 重置所有可能被布局修改过的元素
      const allSelectors = new Set();
      Object.values(this.layouts).forEach(layout => {
        layout.rules.forEach(rule => {
          if (rule.selector) {
            // 解析可能包含多个选择器的字符串
            rule.selector.split(',').forEach(selector => {
              allSelectors.add(selector.trim());
            });
          }
        });
      });

      // 重置每个选择器匹配的元素
      for (const selector of allSelectors) {
        await elementController.showElement(selector);
        elementController.resetElementStyle(selector);
      }

      // 清除当前布局
      this.currentLayout = null;
      localStorage.removeItem(`${this.layoutPrefix}current`);

      logger.info('布局已重置');
      return true;
    } catch (error) {
      logger.error('重置布局失败:', error);
      return false;
    }
  }

  /**
   * 删除自定义布局
   * @param {String} layoutName - 布局名称
   * @returns {Boolean} 删除是否成功
   */
  deleteLayout(layoutName) {
    try {
      // 不允许删除预定义布局
      if (PREDEFINED_LAYOUTS[layoutName]) {
        logger.warn(`不能删除预定义布局: ${layoutName}`);
        return false;
      }

      // 检查布局是否存在
      if (!this.customLayouts[layoutName]) {
        logger.warn(`自定义布局不存在: ${layoutName}`);
        return false;
      }

      // 如果正在使用要删除的布局，则重置布局
      if (this.currentLayout === layoutName) {
        this.resetLayout();
      }

      // 删除布局
      delete this.layouts[layoutName];
      delete this.customLayouts[layoutName];
      
      // 更新存储
      this._saveCustomLayouts();

      logger.info(`布局删除成功: ${layoutName}`);
      return true;
    } catch (error) {
      logger.error(`删除布局失败:`, error);
      return false;
    }
  }

  /**
   * 导出布局配置
   * @param {String} layoutName - 布局名称
   * @returns {String|null} JSON格式的布局配置
   */
  exportLayout(layoutName) {
    try {
      const layout = this.layouts[layoutName];
      if (!layout) {
        logger.warn(`布局不存在: ${layoutName}`);
        return null;
      }

      return JSON.stringify(layout, null, 2);
    } catch (error) {
      logger.error(`导出布局失败:`, error);
      return null;
    }
  }

  /**
   * 导入布局配置
   * @param {String} layoutJson - JSON格式的布局配置
   * @returns {Boolean} 导入是否成功
   */
  importLayout(layoutJson) {
    try {
      const layout = JSON.parse(layoutJson);
      
      // 验证布局配置
      if (!layout.name || !layout.rules || !Array.isArray(layout.rules)) {
        throw new Error('无效的布局配置格式');
      }

      // 确保是自定义布局
      layout.isCustom = true;
      layout.importedAt = new Date().toISOString();

      // 保存布局
      this.layouts[layout.name] = layout;
      this.customLayouts[layout.name] = layout;
      
      // 持久化保存
      this._saveCustomLayouts();

      logger.info(`布局导入成功: ${layout.label || layout.name}`);
      return true;
    } catch (error) {
      logger.error(`导入布局失败:`, error);
      return false;
    }
  }

  /**
   * 从本地存储加载自定义布局
   * @private
   */
  _loadCustomLayouts() {
    try {
      const savedLayouts = localStorage.getItem(`${this.layoutPrefix}custom`);
      if (savedLayouts) {
        const layouts = JSON.parse(savedLayouts);
        
        // 合并自定义布局
        Object.entries(layouts).forEach(([name, layout]) => {
          if (!PREDEFINED_LAYOUTS[name]) {
            this.layouts[name] = layout;
            this.customLayouts[name] = layout;
          }
        });
        
        logger.info(`成功加载 ${Object.keys(layouts).length} 个自定义布局`);
      }
    } catch (error) {
      logger.error('加载自定义布局失败:', error);
    }
  }

  /**
   * 保存自定义布局到本地存储
   * @private
   */
  _saveCustomLayouts() {
    try {
      localStorage.setItem(`${this.layoutPrefix}custom`, JSON.stringify(this.customLayouts));
    } catch (error) {
      logger.error('保存自定义布局失败:', error);
    }
  }
}

// 创建并导出布局控制器实例
const layoutController = new LayoutController();

export { LayoutController };
export default layoutController;

// src/styles/index.js

// 主题切换模块
export { ThemeManager } from './theme.js';
export { default as themeManager } from './theme.js';

/**
 * 样式集合
 * 提供所有样式相关功能的统一访问
 */
export const styles = {
  ThemeManager,
  themeManager
};

export default styles;

// src/styles/theme.js

import logger from '../utils/logger.js';
import { injectStyle } from '../utils/dom.js';

// 默认主题配置
const DEFAULT_THEMES = {
  light: {
    name: 'light',
    label: '浅色模式',
    variables: {
      '--bg-primary': '#ffffff',
      '--bg-secondary': '#f8f9fa',
      '--bg-tertiary': '#e9ecef',
      '--text-primary': '#212529',
      '--text-secondary': '#6c757d',
      '--text-tertiary': '#adb5bd',
      '--border-color': '#dee2e6',
      '--accent-color': '#007bff',
      '--accent-hover': '#0056b3',
      '--danger-color': '#dc3545',
      '--success-color': '#28a745',
      '--warning-color': '#ffc107',
      '--shadow-sm': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
      '--shadow-md': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      '--shadow-lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
      '--border-radius': '8px',
      '--transition-speed': '0.2s',
      '--opacity-hover': '0.8',
      '--opacity-active': '0.6'
    }
  },
  dark: {
    name: 'dark',
    label: '深色模式',
    variables: {
      '--bg-primary': '#121212',
      '--bg-secondary': '#1e1e1e',
      '--bg-tertiary': '#2d2d2d',
      '--text-primary': '#ffffff',
      '--text-secondary': '#b0b0b0',
      '--text-tertiary': '#6c6c6c',
      '--border-color': '#3c3c3c',
      '--accent-color': '#1976d2',
      '--accent-hover': '#1565c0',
      '--danger-color': '#f44336',
      '--success-color': '#4caf50',
      '--warning-color': '#ffc107',
      '--shadow-sm': '0 1px 2px 0 rgba(0, 0, 0, 0.3)',
      '--shadow-md': '0 4px 6px -1px rgba(0, 0, 0, 0.4), 0 2px 4px -1px rgba(0, 0, 0, 0.3)',
      '--shadow-lg': '0 10px 15px -3px rgba(0, 0, 0, 0.4), 0 4px 6px -2px rgba(0, 0, 0, 0.3)',
      '--border-radius': '8px',
      '--transition-speed': '0.2s',
      '--opacity-hover': '0.8',
      '--opacity-active': '0.6'
    }
  },
  minimal: {
    name: 'minimal',
    label: '极简模式',
    variables: {
      '--bg-primary': '#ffffff',
      '--bg-secondary': '#fafafa',
      '--bg-tertiary': '#f5f5f5',
      '--text-primary': '#1a1a1a',
      '--text-secondary': '#666666',
      '--text-tertiary': '#999999',
      '--border-color': '#eeeeee',
      '--accent-color': '#333333',
      '--accent-hover': '#000000',
      '--danger-color': '#ff3b30',
      '--success-color': '#34c759',
      '--warning-color': '#ffcc00',
      '--shadow-sm': 'none',
      '--shadow-md': '0 1px 3px rgba(0, 0, 0, 0.1)',
      '--shadow-lg': '0 4px 6px rgba(0, 0, 0, 0.1)',
      '--border-radius': '4px',
      '--transition-speed': '0.2s',
      '--opacity-hover': '0.9',
      '--opacity-active': '0.8'
    }
  }
};

/**
 * 主题管理器类
 */
class ThemeManager {
  /**
   * 构造函数
   */
  constructor() {
    this.themes = { ...DEFAULT_THEMES };
    this.currentTheme = null;
    this.styleElement = null;
    this.themePrefix = 'douyin_ui_customizer_theme_';
  }

  /**
   * 初始化主题管理器
   */
  init() {
    try {
      // 尝试从存储中获取保存的主题
      const savedTheme = localStorage.getItem(`${this.themePrefix}current`);
      
      // 如果有保存的主题且存在，则应用
      if (savedTheme && this.themes[savedTheme]) {
        this.switchTheme(savedTheme);
      } else {
        // 否则使用默认主题（浅色）
        this.switchTheme('light');
      }
      
      logger.info('主题管理器初始化成功');
    } catch (error) {
      logger.error('主题管理器初始化失败:', error);
      // 失败时使用默认主题
      this.switchTheme('light');
    }
  }

  /**
   * 切换到指定主题
   * @param {string} themeName - 主题名称
   * @returns {boolean} 是否切换成功
   */
  switchTheme(themeName) {
    try {
      // 验证主题是否存在
      if (!this.themes[themeName]) {
        logger.warn(`主题 ${themeName} 不存在，使用默认主题`);
        themeName = 'light';
      }

      const theme = this.themes[themeName];
      
      // 生成CSS变量样式
      const cssVariables = Object.entries(theme.variables)
        .map(([key, value]) => `${key}: ${value};`)
        .join('\n  ');
      
      // 生成CSS
      const css = `:root {
  ${cssVariables}
}

/* 主题特定样式 */
.douyin-ui-customizer-theme-${themeName} {}
`;
      
      // 移除旧的样式元素
      if (this.styleElement && this.styleElement.parentNode) {
        this.styleElement.parentNode.removeChild(this.styleElement);
      }
      
      // 注入新的样式
      this.styleElement = injectStyle(css);
      
      // 更新当前主题
      this.currentTheme = themeName;
      
      // 保存主题设置
      localStorage.setItem(`${this.themePrefix}current`, themeName);
      
      // 添加主题类到body
      document.body.classList.remove(
        ...Object.keys(this.themes).map(t => `douyin-ui-customizer-theme-${t}`)
      );
      document.body.classList.add(`douyin-ui-customizer-theme-${themeName}`);
      
      logger.info(`主题切换到 ${theme.label} (${themeName})`);
      return true;
    } catch (error) {
      logger.error(`主题切换失败 (${themeName}):`, error);
      return false;
    }
  }

  /**
   * 获取当前主题名称
   * @returns {string} 当前主题名称
   */
  getCurrentTheme() {
    return this.currentTheme || 'light';
  }

  /**
   * 获取所有可用主题
   * @returns {Object[]} 主题对象数组
   */
  getAvailableThemes() {
    return Object.values(this.themes);
  }

  /**
   * 创建新的自定义主题
   * @param {Object} themeConfig - 主题配置对象，包含name、label、colors和fonts属性
   * @returns {String} 创建的主题ID
   */
  createTheme(themeConfig) {
    try {
      if (!themeConfig.name || !themeConfig.label) {
        throw new Error('主题配置必须包含name和label属性');
      }

      // 转换colors和fonts为CSS变量
      const variables = {};
      
      // 处理颜色变量
      if (themeConfig.colors) {
        Object.entries(themeConfig.colors).forEach(([key, value]) => {
          variables[`--${key}`] = value;
        });
      }
      
      // 处理字体变量
      if (themeConfig.fonts) {
        Object.entries(themeConfig.fonts).forEach(([key, value]) => {
          variables[`--font-${key}`] = value;
        });
      }

      // 注册新主题
      const theme = {
        name: themeConfig.name,
        label: themeConfig.label,
        variables: variables
      };

      this.registerTheme(theme);
      logger.info(`创建新主题成功: ${themeConfig.label}`);
      return themeConfig.name;
    } catch (error) {
      logger.error('创建主题失败:', error);
      return null;
    }
  }

  /**
   * 删除自定义主题
   * @param {String} themeName - 主题名称
   * @returns {Boolean} 删除是否成功
   */
  deleteTheme(themeName) {
    try {
      // 不允许删除默认主题
      if (DEFAULT_THEMES[themeName]) {
        logger.warn(`不能删除默认主题: ${themeName}`);
        return false;
      }

      // 检查主题是否存在
      if (!this.themes[themeName]) {
        logger.warn(`主题不存在: ${themeName}`);
        return false;
      }

      // 如果正在使用要删除的主题，则切换到默认主题
      if (this.currentTheme === themeName) {
        this.switchTheme('light');
      }

      // 删除主题
      delete this.themes[themeName];
      logger.info(`主题删除成功: ${themeName}`);
      return true;
    } catch (error) {
      logger.error(`删除主题失败 (${themeName}):`, error);
      return false;
    }
  }

  /**
   * 获取主题配置
   * @param {string} themeName - 主题名称
   * @returns {Object|null} 主题配置对象
   */
  getThemeConfig(themeName) {
    return this.themes[themeName] || null;
  }

  /**
   * 注册新主题
   * @param {Object} theme - 主题配置对象
   * @returns {boolean} 是否注册成功
   */
  registerTheme(theme) {
    try {
      if (!theme.name || !theme.variables) {
        throw new Error('主题配置必须包含name和variables属性');
      }
      
      // 验证变量格式
      if (typeof theme.variables !== 'object') {
        throw new Error('variables必须是对象');
      }
      
      this.themes[theme.name] = {
        name: theme.name,
        label: theme.label || theme.name,
        variables: { ...theme.variables }
      };
      
      logger.info(`新主题注册成功: ${theme.label || theme.name}`);
      return true;
    } catch (error) {
      logger.error('主题注册失败:', error);
      return false;
    }
  }

  /**
   * 导出主题配置
   * @param {string} themeName - 主题名称
   * @returns {string|null} JSON格式的主题配置
   */
  exportTheme(themeName) {
    try {
      const theme = this.themes[themeName];
      if (!theme) return null;
      
      return JSON.stringify(theme, null, 2);
    } catch (error) {
      logger.error(`主题导出失败 (${themeName}):`, error);
      return null;
    }
  }

  /**
   * 导入主题配置
   * @param {string} themeJson - JSON格式的主题配置
   * @returns {boolean} 是否导入成功
   */
  importTheme(themeJson) {
    try {
      const theme = JSON.parse(themeJson);
      return this.registerTheme(theme);
    } catch (error) {
      logger.error('主题导入失败:', error);
      return false;
    }
  }

  /**
   * 生成主题预览样式
   * @param {string} themeName - 主题名称
   * @returns {string|null} 预览样式字符串
   */
  generatePreviewStyle(themeName) {
    const theme = this.themes[themeName];
    if (!theme) return null;
    
    return Object.entries(theme.variables)
      .map(([key, value]) => `${key}: ${value}`)
      .join('; ');
  }

  /**
   * 应用主题到特定元素
   * @param {HTMLElement} element - 目标元素
   * @param {string} themeName - 主题名称
   */
  applyThemeToElement(element, themeName) {
    try {
      const theme = this.themes[themeName];
      if (!theme || !element) return;
      
      // 应用CSS变量
      Object.entries(theme.variables).forEach(([key, value]) => {
        element.style.setProperty(key, value);
      });
      
      // 添加主题类
      element.classList.remove(
        ...Object.keys(this.themes).map(t => `douyin-ui-customizer-theme-${t}`)
      );
      element.classList.add(`douyin-ui-customizer-theme-${themeName}`);
    } catch (error) {
      logger.error(`应用主题到元素失败:`, error);
    }
  }

  /**
   * 重置所有主题设置
   */
  reset() {
    try {
      // 移除样式元素
      if (this.styleElement && this.styleElement.parentNode) {
        this.styleElement.parentNode.removeChild(this.styleElement);
      }
      
      // 移除主题类
      Object.keys(this.themes).forEach(themeName => {
        document.body.classList.remove(`douyin-ui-customizer-theme-${themeName}`);
      });
      
      // 重置主题配置
      this.themes = { ...DEFAULT_THEMES };
      this.currentTheme = null;
      this.styleElement = null;
      
      // 清除存储
      localStorage.removeItem(`${this.themePrefix}current`);
      
      // 重新初始化
      this.init();
      
      logger.info('主题设置已重置');
    } catch (error) {
      logger.error('重置主题设置失败:', error);
    }
  }
}

// 创建并导出主题管理器实例
const themeManager = new ThemeManager();

export { ThemeManager };
export default themeManager;

// src/ui_manager.js v1.1.1

import {
  debounce,
  throttle,
  getElement,
  getElements,
  findElementsByClassPattern,
  findElementsByStructure,
  toggleElements,
  addClass,
  removeClass,
  addEvent,
  removeEvent,
  createElement,
  injectStyle
} from './utils/dom.js';
import logger from './utils/logger.js';
import eventEmitter from './utils/eventEmitter.js';
import themeManager from './styles/theme.js';
import autoExecutor from './utils/autoExecutor.js';

import {
  createSettingsPanelContent,
  injectPanelStyles,
  setupSettingsPanelEvents,
  applySettingsToPanel,
  setupAutoExecutorEvents,
  updateAutoExecutorStatus
} from './ui/panels/settingsPanel.js';

import { makePanelDraggable, restrictPanelToViewport } from './ui/core/panelDrag.js';
import { applyVideoCustomizations } from './ui/customizations/videoCustomizations.js';
import { applyLiveCustomizations } from './ui/customizations/liveCustomizations.js';

class UIManager {
  constructor(config) {
    this.config = config;
    this.settingsPanel = null;
    this.toggleButton = null;
    this.isPanelVisible = false;
    this.lastScrollPosition = 0;

    this.debouncedApplyCustomizations = debounce(() => this.applyAllCustomizations(), 500);
    this.throttledHandleScroll = throttle((e) => this.handleScroll(e), 100);
    this.mutationObserver = null;
    this.domObserver = null;
    this.autoExecutorStatusInterval = null;

    this.autoExecutor = autoExecutor;

    logger.info('UIManager initialized with config');

    themeManager.on('themeChanged', (newTheme) => {
      logger.info(`Theme changed to ${newTheme}`);
      this.applyTheme(newTheme);
    });
  }

  applyVideoCustomizations() {
    applyVideoCustomizations(this);
  }

  applyLiveCustomizations() {
    applyLiveCustomizations(this);
  }

  toggleElement(selectorOrFinder, show) {
    let elements = [];
    if (typeof selectorOrFinder === 'function') {
      try {
        elements = selectorOrFinder() || [];
      } catch (e) {
        logger.error('查找元素函数执行失败:', e);
        return;
      }
    } else if (typeof selectorOrFinder === 'string' && selectorOrFinder.trim() !== '') {
      try {
        elements = getElements(selectorOrFinder);
      } catch (e) {
        logger.error('无效的CSS选择器:', selectorOrFinder, e);
        return;
      }
    } else {
      logger.error('无效的选择器或查找函数参数');
      return;
    }

    return toggleElements(elements, show);
  }

  findElementsByStructure(options) {
    return findElementsByStructure(options);
  }

  findElementsByClassPattern(pattern, tagName = '*') {
    return findElementsByClassPattern(pattern, tagName);
  }

  customizeControlBar(controlBarConfig) {
    const controlBar = document.querySelector('.video-control-bar');
    if (!controlBar) return;

    if (!controlBarConfig.show) {
      controlBar.style.display = 'none';
      return;
    }

    if (controlBarConfig.position) {
      controlBar.style.position = 'absolute';
      switch (controlBarConfig.position) {
        case 'top':
          controlBar.style.top = '0';
          controlBar.style.bottom = 'auto';
          break;
        case 'bottom':
          controlBar.style.bottom = '0';
          controlBar.style.top = 'auto';
          break;
        default:
          controlBar.style.bottom = '0';
      }
    }

    if (controlBarConfig.autoHide) {}
  }

  customizeDanmaku(danmakuConfig) {
    const styleId = 'douyin-danmaku-custom-styles';
    let styleElement = document.getElementById(styleId);
    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = styleId;
      document.head.appendChild(styleElement);
    }

    let css = '';

    if (danmakuConfig.fontSize) {
      css += `.danmaku { font-size: ${danmakuConfig.fontSize}px !important; }`;
    }
    if (danmakuConfig.color) {
      css += `.danmaku { color: ${danmakuConfig.color} !important; }`;
    }
    if (danmakuConfig.opacity) {
      css += `.danmaku { opacity: ${danmakuConfig.opacity} !important; }`;
    }
    if (danmakuConfig.speed) {
      let duration = 6;
      switch (danmakuConfig.speed) {
        case 'fast': duration = 3; break;
        case 'slow': duration = 10; break;
        default: duration = 6;
      }
      css += `.danmaku { animation-duration: ${duration}s !important; }`;
    }

    styleElement.textContent = css;
  }

  hideSettingsPanel() {
    if (!this.settingsPanel) return;
    this.isPanelVisible = false;
    this.settingsPanel.style.transition = 'opacity 0.3s ease-out';
    this.settingsPanel.style.opacity = '0';
    setTimeout(() => {
      if (this.settingsPanel) {
        this.settingsPanel.style.display = 'none';
      }
    }, 300);
  }

  applyLayout(type, layout) {
    if (!layout || layout === 'default') return;
    logger.info(`应用${type}布局：${layout}`);
  }

  showSettingsPanel() {
    if (this.settingsPanel) {
      this.settingsPanel.remove();
    }

    this.settingsPanel = this.createSettingsPanel();
    document.body.appendChild(this.settingsPanel);
    this.makePanelDraggable(this.settingsPanel);
  }

  createSettingsPanel() {
    const panel = createElement('div', {
      className: 'douyin-ui-customizer-panel',
      style: { animation: 'slideIn 0.3s ease-out' }
    });

    injectPanelStyles();
    panel.innerHTML = createSettingsPanelContent(this.config);
    setupSettingsPanelEvents(panel, this);

    return panel;
  }

  makePanelDraggable(panel) {
    makePanelDraggable(panel);
    restrictPanelToViewport(panel);
  }

  applyAllCustomizations() {
    logger.info('[UI定制] 开始统一应用所有UI定制');
    try {
      const pageType = this.detectPageType();
      logger.info(`[UI定制] 检测到页面类型: ${pageType}`);

      switch (pageType) {
        case 'video':
          this.applyVideoCustomizations();
          break;
        case 'live':
          this.applyLiveCustomizations();
          break;
        default:
          logger.info('[UI定制] 未识别的页面类型，尝试应用通用定制');
          this.applyVideoCustomizations();
      }

      if (this.config.theme) {
        this.applyTheme(this.config.theme);
      }
    } catch (error) {
      logger.error('[UI定制] 应用定制时出错:', error);
    }
  }

  detectPageType() {
    if (document.querySelector('video[autoplay]')) return 'video';
    if (document.querySelector('.live, .live-room, [data-type="live"]')) return 'live';
    return 'other';
  }

  handleScroll(e) {
    const currentScroll = window.scrollY;
    const direction = currentScroll > this.lastScrollPosition ? 'down' : 'up';
    this.lastScrollPosition = currentScroll;

    if (this.settingsPanel && this.isPanelVisible) {
      if (direction === 'down' && currentScroll > 100) {
        this.hideSettingsPanel();
      }
    }
  }

  applyTheme(theme) {
    try {
      themeManager.applyTheme(theme);
      if (this.settingsPanel) {
        const themeConfig = themeManager.getTheme(theme);
        if (themeConfig) {
          this.settingsPanel.style.backgroundColor = themeConfig.background || '#fff';
          this.settingsPanel.style.color = themeConfig.text || '#000';
          this.settingsPanel.style.borderColor = themeConfig.border || '#e0e0e0';

          const buttons = this.settingsPanel.querySelectorAll('button');
          buttons.forEach(btn => {
            btn.style.backgroundColor = themeConfig.buttonBackground || '#f5f5f5';
            btn.style.color = themeConfig.buttonText || '#333';
          });
        }
      }
      logger.info(`Theme ${theme} applied successfully`);
      eventEmitter.emit('ui.theme.applied', theme);
    } catch (error) {
      logger.error('Failed to apply theme:', error);
      eventEmitter.emit('ui.theme.error', error);
    }
  }

  saveToLocalStorage(config) {
    try {
      localStorage.setItem('douyin-ui-customizer-config', JSON.stringify(config));
      logger.info('配置已保存到localStorage');
    } catch (error) {
      logger.error('保存到localStorage失败:', error);
    }
  }

  saveConfig() {
    try {
      import('./config.js').then(({ default: configManager }) => {
        configManager.setConfig(this.config);
        logger.info('配置已保存');
      }).catch(error => {
        logger.error('导入配置管理模块失败:', error);
        this.saveToLocalStorage(this.config);
      });
    } catch (error) {
      logger.error('保存配置失败:', error);
      this.saveToLocalStorage(this.config);
    }
  }

  async saveSettings(panel) {
    try {
      const themeRadios = panel.querySelectorAll('input[type="radio"][name="theme"]');
      for (const radio of themeRadios) {
        if (radio.checked) {
          this.config.theme = radio.value;
          break;
        }
      }

      const generalSettings = ['autoPlay', 'autoScroll', 'keyboardShortcuts', 'notifications'];
      generalSettings.forEach(setting => {
        const checkbox = panel.querySelector(`#${setting}`);
        if (checkbox) {
          if (!this.config.general) this.config.general = {};
          this.config.general[setting] = checkbox.checked;
        }
      });

      const videoSettings = ['showLikeButton', 'showCommentButton', 'showShareButton', 'showAuthorInfo', 'showMusicInfo', 'showDescription', 'showRecommendations'];
      videoSettings.forEach(setting => {
        const checkbox = panel.querySelector(`#${setting}`);
        if (checkbox) {
          if (!this.config.videoUI) this.config.videoUI = {};
          this.config.videoUI[setting] = checkbox.checked;
        }
      });

      const controlBarSettings = ['controlBar-show', 'controlBar-autoHide', 'controlBar-position', 'controlBar-size', 'controlBar-opacity'];
      controlBarSettings.forEach(setting => {
        const element = panel.querySelector(`#${setting}`);
        if (element) {
          if (!this.config.videoUI) this.config.videoUI = {};
          if (!this.config.videoUI.controlBar) this.config.videoUI.controlBar = {};
          const controlBarSetting = setting.replace('controlBar-', '');
          let value = element.value;
          if (element.type === 'checkbox') value = element.checked;
          else if (controlBarSetting === 'opacity') value = parseFloat(value);
          this.config.videoUI.controlBar[controlBarSetting] = value;
        }
      });

      const playbackSettings = ['playback-defaultQuality', 'playback-autoPlay', 'playback-loop'];
      playbackSettings.forEach(setting => {
        const element = panel.querySelector(`#${setting}`);
        if (element) {
          if (!this.config.videoUI) this.config.videoUI = {};
          if (!this.config.videoUI.playback) this.config.videoUI.playback = {};
          const playbackSetting = setting.replace('playback-', '');
          let value = element.value;
          if (element.type === 'checkbox') value = element.checked;
          this.config.videoUI.playback[playbackSetting] = value;
        }
      });

      const liveSettings = ['liveShowGifts', 'liveShowDanmaku', 'liveShowRecommendations', 'liveShowAds', 'liveShowStats'];
      liveSettings.forEach(setting => {
        const checkbox = panel.querySelector(`#${setting}`);
        if (checkbox) {
          if (!this.config.liveUI) this.config.liveUI = {};
          const liveSetting = setting.replace('liveShow', 'show');
          this.config.liveUI[liveSetting] = checkbox.checked;
        }
      });

      const danmakuSettings = ['danmaku-fontSize', 'danmaku-color', 'danmaku-opacity', 'danmaku-speed', 'danmaku-position', 'danmaku-maxLines'];
      danmakuSettings.forEach(setting => {
        const element = panel.querySelector(`#${setting}`);
        if (element) {
          if (!this.config.liveUI) this.config.liveUI = {};
          if (!this.config.liveUI.danmaku) this.config.liveUI.danmaku = {};
          const danmakuSetting = setting.replace('danmaku-', '');
          let value = element.value;
          if (danmakuSetting === 'fontSize' || danmakuSetting === 'maxLines') value = parseInt(value);
          else if (danmakuSetting === 'opacity') value = parseFloat(value);
          this.config.liveUI.danmaku[danmakuSetting] = value;
        }
      });

      const liveLayoutSelect = panel.querySelector('#live-layout');
      if (liveLayoutSelect) {
        if (!this.config.liveUI) this.config.liveUI = {};
        this.config.liveUI.layout = liveLayoutSelect.value;
      }

      const liveVolumeSlider = panel.querySelector('#live-volume');
      if (liveVolumeSlider) {
        if (!this.config.liveUI) this.config.liveUI = {};
        this.config.liveUI.volume = parseInt(liveVolumeSlider.value);
      }

      const debugModeCheckbox = panel.querySelector('#advanced-debugMode');
      const performanceModeCheckbox = panel.querySelector('#advanced-performanceMode');
      const customCSS = panel.querySelector('#advanced-customCSS');

      if (!this.config.advanced) this.config.advanced = {};
      if (debugModeCheckbox) this.config.advanced.debugMode = debugModeCheckbox.checked;
      if (performanceModeCheckbox) this.config.advanced.performanceMode = performanceModeCheckbox.checked;
      if (customCSS) this.config.advanced.customCSS = customCSS.value;

      const scriptItems = panel.querySelectorAll('#custom-scripts-list .script-item input');
      const customScripts = [];
      let hasScripts = false;

      scriptItems.forEach(input => {
        const value = input.value.trim();
        if (value) {
          customScripts.push(value);
          hasScripts = true;
        }
      });

      if (hasScripts) {
        const confirmed = confirm('警告：自定义脚本可能会带来安全风险，是否继续保存？');
        if (!confirmed) return false;

        for (const script of customScripts) {
          if (script.includes('eval(') || script.includes('Function(') || script.includes('innerHTML') || script.includes('document.write') || script.includes('execScript')) {
            const scriptConfirmed = confirm('警告：检测到可能的危险代码，是否确认添加此脚本？');
            if (!scriptConfirmed) return false;
          }

          if (script.startsWith('http://') || script.startsWith('https://')) {
            const allowedDomains = ['cdnjs.cloudflare.com', 'cdn.jsdelivr.net', 'unpkg.com', 'jsdelivr.net', 'cdnjs.com'];
            const url = new URL(script);
            const domain = url.hostname;

            if (!allowedDomains.some(allowedDomain => domain.includes(allowedDomain))) {
              const urlConfirmed = confirm(`警告：脚本URL来自非白名单域名 (${domain})，是否确认添加此脚本？`);
              if (!urlConfirmed) return false;
            }
          }
        }
      }

      this.config.advanced.customScripts = customScripts;

      let validationResult = { valid: true, issues: [] };
      try {
        const configModule = await import('./config.js');
        const configManager = configModule.default;
        validationResult = configManager.validateConfig(this.config);
      } catch (error) {
        logger.error('验证配置失败:', error);
        validationResult = this.basicValidateConfig(this.config);
      }

      if (!validationResult.valid) {
        const errorMessage = '配置验证失败：\n' + validationResult.issues.join('\n');
        alert(errorMessage);
        return;
      }

      this.saveConfig();
      logger.info('Settings saved from panel');
      this.applyAllCustomizations();
      alert('设置保存成功！');
    } catch (error) {
      logger.error('保存设置失败:', error);
      alert('保存设置失败，请重试');
    }
  }

  basicValidateConfig(config) {
    const issues = [];

    try {
      if (config.theme && !['light', 'dark'].includes(config.theme)) {
        issues.push('主题配置无效，应为 light 或 dark');
      }
      if (config.videoUI?.layout && !['default', 'compact', 'fullscreen'].includes(config.videoUI.layout)) {
        issues.push('视频界面布局配置无效');
      }
      if (config.liveUI?.layout && !['default', 'minimal', 'immersive'].includes(config.liveUI.layout)) {
        issues.push('直播间界面布局配置无效');
      }
      if (config.liveUI?.danmaku?.fontSize && (config.liveUI.danmaku.fontSize < 12 || config.liveUI.danmaku.fontSize > 36)) {
        issues.push('弹幕字体大小应在 12-36 之间');
      }
      if (config.liveUI?.danmaku?.opacity && (config.liveUI.danmaku.opacity < 0.1 || config.liveUI.danmaku.opacity > 1)) {
        issues.push('弹幕透明度应在 0.1-1 之间');
      }
      if (config.liveUI?.volume && (config.liveUI.volume < 0 || config.liveUI.volume > 100)) {
        issues.push('音量应在 0-100 之间');
      }
      if (config.videoUI?.controlBar?.opacity && (config.videoUI.controlBar.opacity < 0.1 || config.videoUI.controlBar.opacity > 1)) {
        issues.push('控制栏透明度应在 0.1-1 之间');
      }
    } catch (error) {
      logger.error('基本验证配置失败:', error);
      issues.push('配置验证过程中发生错误');
    }

    return { valid: issues.length === 0, issues: issues };
  }

  init() {
    logger.info('[UI管理器] 初始化UI管理器');
    try {
      this.initSettingsPanel();
      this.initUI();
      this.setupEvents();
    } catch (error) {
      logger.error('[UI管理器] 初始化失败:', error);
    }
  }

  initUI() {
    logger.info('[UI管理器] 初始化UI定制');
    this.showToggleButton();
    this.applyAllCustomizations();
  }

  setupEvents() {
    logger.info('[UI管理器] 设置事件监听');
    addEvent(window, 'load', this.debouncedApplyCustomizations);
    addEvent(document, 'DOMContentLoaded', this.debouncedApplyCustomizations);
    this.observeDomChanges();
    addEvent(window, 'scroll', this.throttledHandleScroll);
    addEvent(window, 'resize', this.debouncedApplyCustomizations);

    if (window.matchMedia && window.matchMedia('(prefers-color-scheme)').addEventListener) {
      addEvent(window.matchMedia('(prefers-color-scheme)'), 'change', this.debouncedApplyCustomizations);
    }
  }

  observeDomChanges() {
    const observer = new MutationObserver(this.debouncedApplyCustomizations);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      characterData: true
    });
    this.domObserver = observer;
  }

  cleanup() {
    logger.info('[UI管理器] 清理资源和事件监听');
    if (this.domObserver) {
      this.domObserver.disconnect();
    }

    removeEvent(window, 'load', this.debouncedApplyCustomizations);
    removeEvent(document, 'DOMContentLoaded', this.debouncedApplyCustomizations);
    removeEvent(window, 'scroll', this.throttledHandleScroll);
    removeEvent(window, 'resize', this.debouncedApplyCustomizations);

    if (window.matchMedia && window.matchMedia('(prefers-color-scheme)').removeEventListener) {
      removeEvent(window.matchMedia('(prefers-color-scheme)'), 'change', this.debouncedApplyCustomizations);
    }

    if (this.autoExecutorStatusInterval) {
      clearInterval(this.autoExecutorStatusInterval);
    }
  }

  initSettingsPanel() {
    this.settingsPanel = document.createElement('div');
    this.settingsPanel.id = 'douyin-customizer-panel';
    this.settingsPanel.className = 'customizer-panel';

    this.settingsPanel.style.position = 'fixed';
    this.settingsPanel.style.left = '20px';
    this.settingsPanel.style.top = '20px';
    this.settingsPanel.style.width = '320px';
    this.settingsPanel.style.maxHeight = '80vh';
    this.settingsPanel.style.overflowY = 'auto';
    this.settingsPanel.style.backgroundColor = '#fff';
    this.settingsPanel.style.border = '1px solid #e0e0e0';
    this.settingsPanel.style.borderRadius = '8px';
    this.settingsPanel.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.1)';
    this.settingsPanel.style.zIndex = '9999';
    this.settingsPanel.style.padding = '20px';

    const dragHandle = document.createElement('div');
    dragHandle.className = 'drag-handle';
    dragHandle.style.cursor = 'move';
    dragHandle.style.padding = '10px';
    dragHandle.style.backgroundColor = '#f5f5f5';
    dragHandle.style.borderRadius = '4px 4px 0 0';
    dragHandle.style.marginBottom = '15px';
    dragHandle.textContent = '抖音UI定制工具 (拖动移动)';

    const closeButton = document.createElement('button');
    closeButton.className = 'close-button';
    closeButton.style.position = 'absolute';
    closeButton.style.top = '10px';
    closeButton.style.right = '10px';
    closeButton.style.width = '24px';
    closeButton.style.height = '24px';
    closeButton.style.border = 'none';
    closeButton.style.backgroundColor = 'transparent';
    closeButton.style.cursor = 'pointer';
    closeButton.style.fontSize = '18px';
    closeButton.style.lineHeight = '1';
    closeButton.textContent = '×';
    closeButton.addEventListener('click', () => {
      this.settingsPanel.style.display = 'none';
      this.showToggleButton();
    });

    const settingsContent = document.createElement('div');
    settingsContent.className = 'settings-content';

    const tabNavigation = document.createElement('div');
    tabNavigation.className = 'tab-navigation';
    tabNavigation.innerHTML = `
      <div>
        <button class="tab-button active" data-tab="general">通用设置</button>
        <button class="tab-button" data-tab="video">视频设置</button>
      </div>
      <button class="tab-button" data-tab="live">直播设置</button>
    `;

    const tabContent = document.createElement('div');
    tabContent.className = 'tab-content';

    const generalTab = document.createElement('div');
    generalTab.className = 'tab-pane active';
    generalTab.id = 'general-tab';
    generalTab.innerHTML = createSettingsPanelContent(this.config).match(/<div class="tab-content active" id="general-tab">([\s\S]*?)<\/div>\s*<div class="tab-content"/)?.[1] || '';

    const videoTab = document.createElement('div');
    videoTab.className = 'tab-pane';
    videoTab.id = 'video-tab';

    const liveTab = document.createElement('div');
    liveTab.className = 'tab-pane';
    liveTab.id = 'live-tab';

    this.settingsPanel.appendChild(dragHandle);
    this.settingsPanel.appendChild(closeButton);
    this.settingsPanel.appendChild(tabNavigation);
    tabContent.appendChild(generalTab);
    tabContent.appendChild(videoTab);
    tabContent.appendChild(liveTab);
    this.settingsPanel.appendChild(tabContent);

    document.body.appendChild(this.settingsPanel);

    this.makePanelDraggable(this.settingsPanel);
    this.restrictPanelToViewport(this.settingsPanel);
    applySettingsToPanel(this);

    tabNavigation.querySelectorAll('.tab-button').forEach(button => {
      button.addEventListener('click', () => {
        const tabId = button.getAttribute('data-tab');
        tabNavigation.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
        tabContent.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));
        button.classList.add('active');
        tabContent.querySelector(`#${tabId}-tab`).classList.add('active');
      });
    });

    this.applyTheme(this.config.theme);
    eventEmitter.emit('ui.panel.initialized');
    logger.info('Settings panel initialized');
  }

  restrictPanelToViewport(panel) {
    restrictPanelToViewport(panel);
  }

  showToggleButton() {
    let toggleButton = document.getElementById('douyin-customizer-toggle');
    if (!toggleButton) {
      toggleButton = document.createElement('button');
      toggleButton.id = 'douyin-customizer-toggle';
      toggleButton.className = 'customizer-toggle';
      toggleButton.style.position = 'fixed';
      toggleButton.style.left = '20px';
      toggleButton.style.bottom = '20px';
      toggleButton.style.width = '50px';
      toggleButton.style.height = '50px';
      toggleButton.style.borderRadius = '50%';
      toggleButton.style.border = 'none';
      toggleButton.style.backgroundColor = '#ff0050';
      toggleButton.style.color = 'white';
      toggleButton.style.fontSize = '16px';
      toggleButton.style.cursor = 'pointer';
      toggleButton.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.2)';
      toggleButton.style.zIndex = '9998';
      toggleButton.style.display = 'flex';
      toggleButton.style.alignItems = 'center';
      toggleButton.style.justifyContent = 'center';
      toggleButton.innerHTML = '⚙️';

      document.body.appendChild(toggleButton);
    }

    toggleButton.style.display = 'flex';
    toggleButton.addEventListener('click', () => {
      this.settingsPanel.style.display = 'block';
      toggleButton.style.display = 'none';
    });
  }
}

export default UIManager;


// ==UserScript==
// @name         抖音网页版UI定制工具
// @namespace    http://tampermonkey.net/
// @version 1.1.1
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
 * src/main.js
 * 抖音Web端界面UI定制工具主入口
 * 作者：SutChan
 * 版本：1.1.1
 * 更新日期：2026-04-27
 */

import { debounce, getElement, addEvent, createElement, injectStyle } from './utils/dom.js';
import { getItem, setItem, NamespacedStorage } from './utils/storage.js';
import logger from './utils/logger.js';
import eventEmitter from './utils/eventEmitter.js';
import performanceMonitor from './utils/performance.js';
import configManager from './config.js';
import UIManager from './ui_manager.js';
import themeManager from './styles/theme.js';
import { injectStyles, injectBasicStyles } from './utils/styleGenerator.js';
import { observePageChanges, stopObserving, isVideoPage, isLivePage } from './utils/pageObserver.js';

const CURRENT_VERSION = '1.1.1';
const UPDATE_CHECK_INTERVAL = 24 * 60 * 60 * 1000;

const storage = new NamespacedStorage('douyin_tool');
let uiManager = null;

async function checkForUpdates(showNoUpdateMessage = false) {
  try {
    const updateUrl = 'https://github.com/SutChan/douyin_tool/raw/main/dist/douyin_ui_customizer.user.js';

    GM_xmlhttpRequest({
      method: 'GET',
      url: updateUrl,
      onload: function(response) {
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
  } catch (error) {
    logger.error('检查更新时发生错误：', error);
  }
}

function isNewerVersion(newVersion, currentVersion) {
  const newParts = newVersion.split('.').map(Number);
  const currentParts = currentVersion.split('.').map(Number);

  for (let i = 0; i < newParts.length; i++) {
    if (newParts[i] > currentParts[i]) return true;
    if (newParts[i] < currentParts[i]) return false;
  }

  return false;
}

function shouldCheckForUpdates() {
  const lastCheckTime = getItem('lastUpdateCheckTime', 0);
  const now = Date.now();

  if (now - lastCheckTime > UPDATE_CHECK_INTERVAL) {
    setItem('lastUpdateCheckTime', now);
    return true;
  }

  return false;
}

function init() {
  logger.info('抖音UI定制工具已启动');

  performanceMonitor.start();
  configManager.loadConfig();
  const config = configManager.getConfig();

  uiManager = new UIManager(config);
  uiManager.init();

  themeManager.init(config.theme);

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

function createFloatingSettingsButton(uiManager) {
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

let globalUIManager = null;

function initUIManager() {
  if (!globalUIManager) {
    const config = configManager.getConfig();
    globalUIManager = new UIManager(config);
  }
  return globalUIManager;
}

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

function setupErrorHandling() {
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

  performanceMonitor.on('performance.warning', (data) => {
    logger.warn('性能警告:', data);
  });
}

function cleanup() {
  logger.info('抖音UI定制工具执行清理');

  try {
    if (uiManager && typeof uiManager.cleanup === 'function') {
      uiManager.cleanup();
    }

    performanceMonitor.stop();
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

function ensureInit() {
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
  theme: {
    apply: (themeName) => themeManager.applyTheme(themeName),
    getCurrent: () => themeManager.getCurrentTheme(),
    list: () => themeManager.listThemes()
  },
  on: (event, callback) => eventEmitter.on(event, callback),
  off: (event, callback) => eventEmitter.off(event, callback),
  emit: (event, data) => eventEmitter.emit(event, data),
  performance: {
    start: () => performanceMonitor.start(),
    stop: () => performanceMonitor.stop(),
    getStats: () => performanceMonitor.getStats(),
    enableDebug: () => performanceMonitor.enableDebug()
  },
  config: {
    export: () => configManager.exportConfig(),
    import: (jsonString) => configManager.importConfig(jsonString),
    reset: () => configManager.resetConfig(),
    validate: (config) => configManager.validateConfig(config)
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


