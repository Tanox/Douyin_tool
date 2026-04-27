// ==UserScript==
// @name         抖音Web端界面UI定制工具
// @namespace    https://github.com/sutchan
// @version      1.0.151
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

/**
 * src/config.js
 * 配置管理模块
 * 负责处理配置的加载、保存和默认设置
 * 版本：1.0.149
 * 更新日期：2026-01-09 18:35
 */

import { getItem, setItem, getNestedItem, setNestedItem, NamespacedStorage } from './utils/storage.js';
import logger from './utils/logger.js';
import eventEmitter from './utils/eventEmitter.js';

// 创建配置专用的命名空间存储
const configStorage = new NamespacedStorage('douyin_tool_config');

// 配置存储键名
const CONFIG_KEY = 'main';

// 配置版本，用于配置迁移
const CONFIG_VERSION = '1.4.0';

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

/**
 * 工具模块入口
 * 导出所有工具函数和类，提供统一的访问接口
 */

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

/**
 * DOM操作工具模块
 * 提供丰富的DOM操作功能，支持界面元素查找、操作和监听
 */

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
setInterval(cleanupCache, cacheExpiry * 2);

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
    
    // 回退到原始方法
    const allElements = parent.getElementsByTagName('*');
    for (let i = 0; i < allElements.length; i++) {
      const element = allElements[i];
      if (element.className && pattern.test(element.className)) {
        elements.push(element);
      }
    }
    
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

/**
 * 日志记录工具模块
 * 提供统一的日志记录功能，支持不同级别的日志输出和配置
 */

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

/**
 * 存储工具模块
 * 提供丰富的数据存储功能，支持嵌套数据、过期时间和批量操作
 */

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

/**
 * 事件总线模块
 * 实现模块间通信的事件发布订阅模式
 */

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

/**
 * 自动执行控制器模块
 * 负责自动检测和点击界面中的继续/运行按钮，维持任务的持续执行
 */

import { debounce, throttle, getElement, getElements, findElementsByClassPattern, findElementsByStructure } from './dom.js';
import logger from './logger.js';
import eventEmitter from './eventEmitter.js';

class AutoExecutor {
  /**
   * 构造函数
   * @param {Object} options - 配置选项
   */
  constructor(options = {}) {
    this.options = {
      // 按钮检测策略：'css', 'xpath', 'text', 'visual', 'accessibility'
      detectionStrategies: ['text', 'css', 'structure'],
      // 支持的按钮文本
      buttonTexts: ['Continue', 'Run', 'Execute', 'Next', 'Proceed', 'Start', '继续', '运行', '执行', '下一步', '开始'],
      // CSS选择器模式
      cssSelectors: [
        'button:contains(Continue)',
        'button:contains(Run)',
        'button:contains(Execute)',
        'button:contains(Next)',
        'button:contains(Proceed)',
        'button:contains(Start)',
        'button:contains(继续)',
        'button:contains(运行)',
        'button:contains(执行)',
        'button:contains(下一步)',
        'button:contains(开始)',
        '.button-primary',
        '.btn-primary',
        '[type="submit"]',
        '.continue-button',
        '.run-button',
        '.execute-button'
      ],
      // 重试配置
      retryConfig: {
        maxAttempts: 10,
        initialDelay: 500,
        backoffFactor: 2
      },
      // 检查间隔（毫秒）
      checkInterval: 1000,
      // 是否启用
      enabled: false,
      // 自定义检测函数
      customDetector: null,
      // 确认机制
      confirmationRequired: false,
      // 执行日志
      enableLogging: true,
      // 截图验证
      captureScreenshots: false,
      // 历史记录最大数量
      maxHistorySize: 100,
      ...options
    };

    this.isRunning = false;
    this.isEmergencyStopped = false;
    this.checkIntervalId = null;
    this.executionHistory = [];
    this.currentAttempt = 0;

    // 初始化日志记录
    if (this.options.enableLogging) {
      logger.info('AutoExecutor initialized with options:', this.options);
    }

    // 监听紧急停止事件
    eventEmitter.on('autoExecutor.emergencyStop', () => {
      this.emergencyStop();
    });
  }

  /**
   * 开始自动执行
   */
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
    // 立即执行一次检测
    this.detectAndClick();

    // 设置定期检查
    this.checkIntervalId = setInterval(() => {
      this.detectAndClick();
    }, this.options.checkInterval);

    // 触发启动事件
    eventEmitter.emit('autoExecutor.started');
  }

  /**
   * 停止自动执行
   */
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

    // 触发停止事件
    eventEmitter.emit('autoExecutor.stopped');
  }

  /**
   * 紧急停止
   */
  emergencyStop() {
    this.isEmergencyStopped = true;
    this.stop();

    if (this.options.enableLogging) {
      logger.error('AutoExecutor emergency stopped');
    }

    // 触发紧急停止事件
    eventEmitter.emit('autoExecutor.emergencyStopped');
  }

  /**
   * 检测并点击按钮
   */
  async detectAndClick() {
    if (this.isEmergencyStopped) {
      return;
    }

    try {
      // 增加尝试次数
      this.currentAttempt++;

      // 检测按钮
      const button = await this.detectButton();

      if (button) {
        // 检查按钮状态
        if (this.isButtonClickable(button)) {
          // 截图验证（如果启用）
          if (this.options.captureScreenshots) {
            this.captureScreenshot('before_click');
          }

          // 点击按钮
          this.clickButton(button);

          // 截图验证（如果启用）
          if (this.options.captureScreenshots) {
            setTimeout(() => {
              this.captureScreenshot('after_click');
            }, 500);
          }

          // 重置尝试次数
          this.currentAttempt = 0;
        }
      } else if (this.currentAttempt >= this.options.retryConfig.maxAttempts) {
        // 达到最大尝试次数
        if (this.options.enableLogging) {
          logger.warn(`AutoExecutor failed to detect button after ${this.currentAttempt} attempts`);
        }

        // 触发重试失败事件
        eventEmitter.emit('autoExecutor.retryFailed', { attempts: this.currentAttempt });

        // 重置尝试次数
        this.currentAttempt = 0;
      }
    } catch (error) {
      if (this.options.enableLogging) {
        logger.error('AutoExecutor error during detectAndClick:', error);
      }

      // 触发错误事件
      eventEmitter.emit('autoExecutor.error', { error });
    }
  }

  /**
   * 检测按钮
   * @returns {Promise<HTMLElement|null>} 找到的按钮元素或null
   */
  async detectButton() {
    let button = null;

    // 尝试自定义检测函数
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

    // 尝试各种检测策略
    for (const strategy of this.options.detectionStrategies) {
      switch (strategy) {
        case 'text':
          button = this.detectByText();
          break;
        case 'css':
          button = this.detectByCSS();
          break;
        case 'structure':
          button = this.detectByStructure();
          break;
        case 'xpath':
          button = this.detectByXPath();
          break;
        case 'accessibility':
          button = this.detectByAccessibility();
          break;
        default:
          if (this.options.enableLogging) {
            logger.warn(`AutoExecutor unknown detection strategy: ${strategy}`);
          }
      }

      if (button) {
        if (this.options.enableLogging) {
          logger.info(`AutoExecutor detected button using ${strategy} strategy`);
        }
        break;
      }
    }

    return button;
  }

  /**
   * 通过文本检测按钮
   * @returns {HTMLElement|null} 找到的按钮元素或null
   */
  detectByText() {
    const allElements = document.getElementsByTagName('*');

    for (const element of allElements) {
      const text = element.textContent || element.innerText || '';
      const trimmedText = text.trim();

      if (this.options.buttonTexts.includes(trimmedText)) {
        // 检查元素是否可点击
        if (this.isClickableElement(element)) {
          return element;
        }

        // 尝试查找最近的可点击父元素
        let parent = element.parentElement;
        let depth = 0;
        const maxDepth = 5;

        while (parent && depth < maxDepth) {
          if (this.isClickableElement(parent)) {
            return parent;
          }
          parent = parent.parentElement;
          depth++;
        }
      }
    }

    return null;
  }

  /**
   * 通过CSS选择器检测按钮
   * @returns {HTMLElement|null} 找到的按钮元素或null
   */
  detectByCSS() {
    for (const selector of this.options.cssSelectors) {
      // 处理包含文本的选择器
      if (selector.includes(':contains')) {
        const textMatch = selector.match(/:contains\(([^)]+)\)/);
        if (textMatch && textMatch[1]) {
          const text = textMatch[1].replace(/['"]/g, '');
          const baseSelector = selector.replace(/:contains\([^)]+\)/, '');
          const elements = getElements(baseSelector || '*');

          for (const element of elements) {
            if (element.textContent && element.textContent.includes(text)) {
              return element;
            }
          }
        }
      } else {
        const element = getElement(selector);
        if (element) {
          return element;
        }
      }
    }

    return null;
  }

  /**
   * 通过结构检测按钮
   * @returns {HTMLElement|null} 找到的按钮元素或null
   */
  detectByStructure() {
    // 查找常见的按钮结构
    const buttonStructures = [
      { tagName: 'button' },
      { tagName: 'input', attributes: { type: 'button' } },
      { tagName: 'input', attributes: { type: 'submit' } },
      { tagName: 'div', attributes: { role: 'button' } },
      { tagName: 'span', attributes: { role: 'button' } },
      { tagName: 'a', attributes: { href: /./ } }
    ];

    for (const structure of buttonStructures) {
      const elements = findElementsByStructure(structure);
      for (const element of elements) {
        // 检查元素文本是否匹配
        const text = element.textContent || element.innerText || '';
        const trimmedText = text.trim();
        if (this.options.buttonTexts.includes(trimmedText)) {
          return element;
        }
      }
    }

    return null;
  }

  /**
   * 通过XPath检测按钮
   * @returns {HTMLElement|null} 找到的按钮元素或null
   */
  detectByXPath() {
    try {
      for (const text of this.options.buttonTexts) {
        const xpath = `//*[text()='${text}' or contains(text(),'${text}')]`;
        const result = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
        const element = result.singleNodeValue;

        if (element) {
          return element;
        }
      }
    } catch (error) {
      if (this.options.enableLogging) {
        logger.error('AutoExecutor XPath detection failed:', error);
      }
    }

    return null;
  }

  /**
   * 通过无障碍属性检测按钮
   * @returns {HTMLElement|null} 找到的按钮元素或null
   */
  detectByAccessibility() {
    const accessibilityAttributes = [
      'aria-label',
      'aria-labelledby',
      'title',
      'alt'
    ];

    const allElements = document.getElementsByTagName('*');

    for (const element of allElements) {
      for (const attr of accessibilityAttributes) {
        const value = element.getAttribute(attr);
        if (value) {
          for (const text of this.options.buttonTexts) {
            if (value.includes(text)) {
              return element;
            }
          }
        }
      }
    }

    return null;
  }

  /**
   * 检查元素是否可点击
   * @param {HTMLElement} element - 要检查的元素
   * @returns {boolean} 是否可点击
   */
  isClickableElement(element) {
    const clickableTags = ['button', 'input', 'a', 'div', 'span'];
    const clickableRoles = ['button', 'link', 'submit'];

    // 检查标签名
    if (clickableTags.includes(element.tagName.toLowerCase())) {
      // 检查角色
      const role = element.getAttribute('role');
      if (!role || clickableRoles.includes(role)) {
        return true;
      }
    }

    return false;
  }

  /**
   * 检查按钮是否可点击
   * @param {HTMLElement} button - 要检查的按钮
   * @returns {boolean} 是否可点击
   */
  isButtonClickable(button) {
    // 检查元素是否存在
    if (!button) {
      return false;
    }

    // 检查是否被禁用
    if (button.disabled || button.hasAttribute('disabled')) {
      return false;
    }

    // 检查是否隐藏
    if (button.style.display === 'none' || button.style.visibility === 'hidden') {
      return false;
    }

    // 检查是否可见
    const rect = button.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      return false;
    }

    // 检查是否在视口中
    if (rect.bottom < 0 || rect.top > window.innerHeight || rect.right < 0 || rect.left > window.innerWidth) {
      return false;
    }

    return true;
  }

  /**
   * 压缩历史记录，限制最大数量
   */
  compressHistory() {
    if (this.executionHistory.length > this.options.maxHistorySize) {
      // 只保留最近的maxHistorySize条记录
      this.executionHistory = this.executionHistory.slice(-this.options.maxHistorySize);
      
      if (this.options.enableLogging) {
        logger.info(`AutoExecutor compressed history to ${this.executionHistory.length} records`);
      }
    }
  }

  /**
   * 点击按钮
   * @param {HTMLElement} button - 要点击的按钮
   */
  clickButton(button) {
    if (!button) {
      return;
    }

    try {
      // 创建并触发点击事件
      const clickEvent = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        view: window
      });

      button.dispatchEvent(clickEvent);

      // 记录执行历史
      this.executionHistory.push({
        timestamp: new Date().toISOString(),
        buttonText: button.textContent || button.innerText || 'Unknown',
        buttonSelector: this.getElementSelector(button),
        success: true
      });

      // 压缩历史记录
      this.compressHistory();

      if (this.options.enableLogging) {
        logger.info(`AutoExecutor clicked button: ${button.textContent || button.innerText}`);
      }

      // 触发点击事件
      eventEmitter.emit('autoExecutor.buttonClicked', {
        button,
        text: button.textContent || button.innerText,
        selector: this.getElementSelector(button)
      });
    } catch (error) {
      // 记录失败历史
      this.executionHistory.push({
        timestamp: new Date().toISOString(),
        buttonText: button.textContent || button.innerText || 'Unknown',
        buttonSelector: this.getElementSelector(button),
        success: false,
        error: error.message
      });

      // 压缩历史记录
      this.compressHistory();

      if (this.options.enableLogging) {
        logger.error('AutoExecutor failed to click button:', error);
      }

      // 触发点击失败事件
      eventEmitter.emit('autoExecutor.buttonClickFailed', {
        button,
        error
      });
    }
  }

  /**
   * 获取元素的选择器
   * @param {HTMLElement} element - 元素
   * @returns {string} 选择器
   */
  getElementSelector(element) {
    if (!element) {
      return '';
    }

    try {
      // 如果元素有ID，使用ID选择器
      if (element.id) {
        return `#${element.id}`;
      }

      // 如果元素有唯一的类名，使用类选择器
      if (element.className && typeof element.className === 'string') {
        const classes = element.className.trim().split(/\s+/);
        for (const cls of classes) {
          if (document.querySelectorAll(`.${cls}`).length === 1) {
            return `.${cls}`;
          }
        }
      }

      // 使用标签名和路径
      let path = [];
      let current = element;

      while (current && current.tagName) {
        let selector = current.tagName.toLowerCase();
        
        // 添加类名信息
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

  /**
   * 截图验证
   * @param {string} type - 截图类型
   */
  captureScreenshot(type) {
    try {
      // 检查是否支持HTMLCanvasElement
      if (typeof HTMLCanvasElement !== 'undefined') {
        // 这里可以实现截图功能
        // 注意：这需要额外的库支持，如html2canvas
        logger.info(`AutoExecutor capturing screenshot: ${type}`);
      }
    } catch (error) {
      logger.error('AutoExecutor failed to capture screenshot:', error);
    }
  }

  /**
   * 获取执行状态
   * @returns {Object} 执行状态
   */
  getStatus() {
    return {
        isRunning: this.isRunning,
        isEmergencyStopped: this.isEmergencyStopped,
        currentAttempt: this.currentAttempt,
        executionHistory: this.executionHistory.slice(-10), // 返回最近10条记录
        options: this.options
      };
  }

  /**
   * 获取执行历史记录
   * @param {number} limit - 返回记录的最大数量，默认返回全部
   * @returns {Array} 执行历史记录数组
   */
  getExecutionHistory(limit = null) {
    if (limit) {
      return this.executionHistory.slice(-limit);
    }
    return [...this.executionHistory];
  }

  /**
   * 获取当前尝试次数
   * @returns {number} 当前尝试次数
   */
  getCurrentAttempt() {
    return this.currentAttempt;
  }

  /**
   * 更新配置
   * @param {Object} newOptions - 新的配置选项
   */
  updateOptions(newOptions) {
    this.options = { ...this.options, ...newOptions };

    if (this.options.enableLogging) {
      logger.info('AutoExecutor options updated:', newOptions);
    }
  }
}

export default new AutoExecutor();

/**
 * 性能监控工具模块
 * 提供性能监控、指标收集、帧率监控等功能
 */

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

/**
 * 元素控制器模块
 * 提供对页面DOM元素的精确控制功能，支持显示/隐藏、样式修改和状态管理
 */

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

/**
 * 布局控制器模块
 * 提供页面布局的定制和管理功能，支持多种预定义布局和自定义布局配置
 */

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

/**
 * 样式模块入口
 * 导出所有样式相关功能，包括主题切换和自定义样式
 */

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

/**
 * 主题切换模块
 * 管理不同主题的样式定义和切换逻辑
 */

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

/**
 * src/ui_manager.js
 * UI管理器模块
 * 负责处理界面定制、设置面板和用户界面交互
 * 版本：1.0.149
 * 更新日期：2026-01-09 18:35
 */

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

class UIManager {
  /**
   * 构造函数
   * @param {Object} config - 配置对象
   */
  constructor(config) {
    this.config = config;
    this.settingsPanel = null;
    this.toggleButton = null;
    this.isPanelVisible = false;
    this.lastScrollPosition = 0;

    // 初始化防抖和节流函数
    this.debouncedApplyCustomizations = debounce(() => this.applyAllCustomizations(), 500);
    this.throttledHandleScroll = throttle((e) => this.handleScroll(e), 100);
    this.mutationObserver = null;

    // 初始化日志记录
    logger.info('UIManager initialized with config');

    // 监听主题变化事件
    themeManager.on('themeChanged', (newTheme) => {
      logger.info(`Theme changed to ${newTheme}`);
      this.applyTheme(newTheme);
    });
  }

  /**
   * 应用短视频界面定制
   */
  applyVideoCustomizations() {
    logger.info('[UI定制] 开始应用短视频界面定制');
    if (!this.config.videoUI) {
      logger.warn('[UI定制] 警告：videoUI配置缺失');
      return;
    }

    const { videoUI } = this.config;
    logger.info('[UI定制] 视频UI配置:', JSON.stringify(videoUI));

    // 确保DOM已准备好
    if (!document.body) {
      logger.warn('[UI定制] 警告：document.body未准备好，延迟应用定制');
      setTimeout(() => this.applyVideoCustomizations(), 500);
      return;
    }

    // 隐藏/显示点赞按钮（使用多种策略）
    this.toggleElement(() => {
      logger.info('[UI定制] 查找点赞按钮元素...');
      // 1. 首先尝试通过可能的点赞图标查找
      const heartIcons = this.findElementsByStructure({
        tagName: 'svg',
        attributes: { viewBox: '0 0 1024 1024' }
      });
      if (heartIcons.length > 0) {
        logger.info(`[UI定制] 找到 ${heartIcons.length} 个可能的点赞图标`);
        // 找到包含点赞图标的元素，返回其父元素
        const elements = heartIcons.map(icon => icon.closest('div') || icon);
        logger.info(`[UI定制] 获取到 ${elements.length} 个点赞相关元素`);
        return elements;
      }

      // 2. 通过类名模式匹配
      logger.info('[UI定制] 尝试通过类名模式匹配点赞按钮');
      const classElements = this.findElementsByClassPattern(/like|heart|favorite/i);
      logger.info(`[UI定制] 通过类名找到 ${classElements.length} 个可能的点赞元素`);
      return classElements;
    }, videoUI.showLikeButton);

    // 隐藏/显示评论按钮
    this.toggleElement(() => {
      logger.info('[UI定制] 开始查找评论元素...');
      const commentElements = this.findElementsByStructure({
        tagName: 'div',
        children: [{
          tagName: 'svg',
          attributes: { viewBox: '0 0 1024 1024' }
        }]
      });
      if (commentElements.length > 0) {
        return commentElements;
      }

      return this.findElementsByClassPattern(/comment|discuss/i);
    }, videoUI.showCommentButton);

    // 隐藏/显示分享按钮
    this.toggleElement(() => {
      const shareElements = this.findElementsByStructure({
        tagName: 'div',
        children: [{
          tagName: 'svg',
          attributes: { viewBox: '0 0 1024 1024' }
        }]
      });
      if (shareElements.length > 0) {
        return shareElements.filter(el => {
          // 尝试排除已找到的点赞和评论按钮
          const text = el.textContent.toLowerCase();
          return text.includes('share') || text.includes('分享');
        });
      } else {
        return this.findElementsByClassPattern(/share|forward/i);
      }
    }, videoUI.showShareButton);

    // 隐藏/显示作者信息
    this.toggleElement(() => {
      // 查找包含头像的元素，通常是作者信息
      const avatarElements = this.findElementsByStructure({
        tagName: 'img',
        attributes: { class: /avatar|user/i }
      });
      if (avatarElements.length > 0) {
        return avatarElements.map(img => img.closest('div') || img);
      }

      return this.findElementsByClassPattern(/author|user|avatar/i);
    }, videoUI.showAuthorInfo);

    // 隐藏/显示音乐信息
    this.toggleElement(() => {
      // 查找包含音乐相关文本或图标的元素
      const musicElements = this.findElementsByStructure({ text: '音乐' });
      if (musicElements.length > 0) {
        return musicElements.map(el => el.closest('div') || el);
      }

      return this.findElementsByClassPattern(/music|sound/i);
    }, videoUI.showMusicInfo);

    // 隐藏/显示描述
    this.toggleElement(() => {
      // 查找包含长文本的元素，可能是视频描述
      const textElements = document.body.querySelectorAll('div');
      const descriptions = Array.from(textElements).filter(el => {
        return el.textContent.length > 20 &&
          el.textContent.length < 200 &&
          el.querySelector('img') && el.querySelector('video');
      });
      if (descriptions.length > 0) {
        return descriptions;
      }

      return this.findElementsByClassPattern(/desc|description|content/i);
    }, videoUI.showDescription);

    // 隐藏/显示推荐
    this.toggleElement(() => {
      // 查找可能包含推荐内容的容器
      const recommendationContainers = this.findElementsByStructure({
        tagName: 'div',
        children: [{ tagName: 'video' }]
      });
      if (recommendationContainers.length > 0) {
        return recommendationContainers;
      }

      return this.findElementsByClassPattern(/recommend|suggest|related/i);
    }, videoUI.showRecommendations);

    // 自定义控制栏
    if (videoUI.controlBar) {
      this.customizeControlBar(videoUI.controlBar);
    }

    // 应用自定义布局
    this.applyLayout('video', videoUI.layout);
  }

  /**
   * 应用直播间界面定制
   */
  applyLiveCustomizations() {
    logger.info('应用直播间界面定制');
    if (!this.config.liveUI) {
      return;
    }

    const { liveUI } = this.config;

    // 隐藏/显示礼物（增强礼物识别能力）
    this.toggleElement(() => {
      logger.info('[UI定制] 开始查找礼物元素...');
      // 1. 组合所有可能的礼物相关元素
      let giftElements = [];
      // 通过类名模式匹配多种礼物相关元素
      giftElements = giftElements.concat(
        this.findElementsByClassPattern(/gift|present|reward|award|effect|animation|特效|礼物|打赏|赠送|连击|连击奖励|豪华礼物|礼物特效|礼物动画|送礼物|礼物展示/i)
      );

      // 通过属性和结构特征查找
      giftElements = giftElements.concat(
        this.findElementsByStructure({
          attributes: {
            class: /gift|present|reward|award|effect|animation/i
          }
        })
      );

      // 查找可能是礼物动画的元素
      const animatedElements = document.body.querySelectorAll('div');
      const potentialGiftAnims = Array.from(animatedElements).filter(el => {
        const style = window.getComputedStyle(el);
        // 礼物通常有动画效果、较高的z-index、绝对定位
        return (style.animationName !== 'none' ||
          style.transitionProperty.includes('transform') ||
          style.transform !== 'none') &&
          parseInt(style.zIndex) > 100 &&
          style.position === 'absolute';
      });

      giftElements = giftElements.concat(potentialGiftAnims);

      // 查找包含特定文字的礼物元素
      const textGiftElements = this.findElementsByStructure({
        text: /礼物|特效|打赏|赠送|连击|连击奖励|豪华礼物/i
      });

      // 收集这些元素及其父容器
      if (textGiftElements.length > 0) {
        textGiftElements.forEach(el => {
          giftElements.push(el);
          giftElements.push(el.closest('div') || el);
          giftElements.push(el.closest('.gift-container') || el);
          giftElements.push(el.closest('.animation-container') || el);
        });
      }

      // 去重
      giftElements = [...new Set(giftElements)];
      logger.info(`[UI定制] 找到 ${giftElements.length} 个礼物相关元素`);
      return giftElements;
    }, liveUI.showGifts);

    // 隐藏/显示弹幕
    this.toggleElement(() => {
      // 查找可能包含弹幕的元素
      const bulletElements = document.body.querySelectorAll('div');
      const potentialBullets = Array.from(bulletElements).filter(el => {
        // 弹幕通常是半透明覆盖层
        const style = window.getComputedStyle(el);
        return style.position === 'absolute' &&
          style.pointerEvents === 'none' &&
          style.zIndex > 0;
      });
      if (potentialBullets.length > 0) {
        return potentialBullets;
      }

      // 备用方案：通过类名模式匹配
      return this.findElementsByClassPattern(/danmu|bullet|comment|danmaku/i);
    }, liveUI.showDanmaku);

    // 隐藏/显示推荐
    this.toggleElement(() => {
      // 查找可能包含推荐内容的容器
      const recommendationContainers = this.findElementsByStructure({
        tagName: 'div',
        children: [{ tagName: 'img' }]
      });
      if (recommendationContainers.length > 0) {
        return recommendationContainers;
      }

      return this.findElementsByClassPattern(/recommend|suggest|related|live-recommend/i);
    }, liveUI.showRecommendations);

    // 隐藏/显示广告
    this.toggleElement(() => {
      // 查找可能是广告的元素
      const adElements = this.findElementsByStructure({ text: /广告|推广|ad|promotion/i });
      if (adElements.length > 0) {
        return adElements.map(el => el.closest('div') || el);
      }

      return this.findElementsByClassPattern(/ad|advertisement|promotion|广告/i);
    }, liveUI.showAds);

    // 隐藏/显示统计信息
    this.toggleElement(() => {
      // 查找可能包含数字的元素，可能是统计信息
      const numberElements = document.body.querySelectorAll('div');
      const potentialStats = Array.from(numberElements).filter(el => {
        return /\d+/.test(el.textContent);
      });
      if (potentialStats.length > 0) {
        return potentialStats;
      }

      return this.findElementsByClassPattern(/stat|count|number|view/i);
    }, liveUI.showStats);

    // 自定义弹幕样式
    if (liveUI.danmaku) {
      this.customizeDanmaku(liveUI.danmaku);
    }

    // 应用自定义布局
    this.applyLayout('live', liveUI.layout);
  }

  /**
   * 切换元素的显示/隐藏
   * @param {string|Function} selectorOrFinder - CSS选择器或元素查找函数
   * @param {boolean} show - 是否显示
   */
  toggleElement(selectorOrFinder, show) {
    let elements = [];
    // 支持函数查找器或选择器字符串
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

    // 使用增强的toggleElements函数
    const result = toggleElements(elements, show);

    return result;
  }

  /**
   * 使用增强的DOM工具函数查找符合结构特征的元素
   * @param {Object} options - 结构查找选项
   * @returns {HTMLElement[]} - 找到的元素数组
   */
  findElementsByStructure(options) {
    return findElementsByStructure(options);
  }

  /**
   * 使用增强的DOM工具函数查找符合类名模式的元素
   * @param {RegExp} pattern - 类名正则表达式
   * @param {string} tagName - 标签名筛选
   * @returns {HTMLElement[]} - 找到的元素数组
   */
  findElementsByClassPattern(pattern, tagName = '*') {
    return findElementsByClassPattern(pattern, tagName);
  }

  /**
   * 自定义控制栏
   * @param {Object} controlBarConfig - 控制栏配置
   */
  customizeControlBar(controlBarConfig) {
    const controlBar = document.querySelector('.video-control-bar');
    if (!controlBar) {
      return;
    }

    // 显示/隐藏控制栏
    if (!controlBarConfig.show) {
      controlBar.style.display = 'none';
      return;
    }

    // 设置控制栏位置
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

    // 自动隐藏功能（需要额外的事件监听）
    if (controlBarConfig.autoHide) {
      // 实现自动隐藏逻辑
    }
  }

  /**
   * 自定义弹幕样式
   * @param {Object} danmakuConfig - 弹幕配置
   */
  customizeDanmaku(danmakuConfig) {
    // 添加弹幕样式
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
      // 根据速度设置动画时长
      let duration = 6; // 默认6秒
      switch (danmakuConfig.speed) {
        case 'fast':
          duration = 3;
          break;
        case 'slow':
          duration = 10;
          break;
        default:
          duration = 6;
      }
      css += `.danmaku { animation-duration: ${duration}s !important; }`;
    }

    styleElement.textContent = css;
  }

  /**
   * 隐藏设置面板
   */
  hideSettingsPanel() {
    if (!this.settingsPanel) {
      return;
    }
    this.isPanelVisible = false;

    // 添加淡出动画
    this.settingsPanel.style.transition = 'opacity 0.3s ease-out';
    this.settingsPanel.style.opacity = '0';

    // 动画结束后隐藏面板
    setTimeout(() => {
      if (this.settingsPanel) {
        this.settingsPanel.style.display = 'none';
      }
    }, 300);
  }

  /**
   * 应用自定义布局
   * @param {string} type - 类型（video或live）
   * @param {string} layout - 布局名称
   */
  applyLayout(type, layout) {
    if (!layout || layout === 'default') {
      return;
    }
    // 根据不同类型和布局应用相应的样式
    logger.info(`应用${type}布局：${layout}`);
  }

  /**
   * 显示设置面板
   */
  showSettingsPanel() {
    // 如果设置面板已存在，先移除
    if (this.settingsPanel) {
      this.settingsPanel.remove();
    }

    // 创建设置面板
    this.settingsPanel = this.createSettingsPanel();
    document.body.appendChild(this.settingsPanel);

    // 启用设置面板拖拽功能
    this.makePanelDraggable(this.settingsPanel);
  }

  /**
   * 统一应用所有UI定制
   */
  applyAllCustomizations() {
    logger.info('[UI定制] 开始统一应用所有UI定制');
    try {
      // 检测页面类型并应用相应的定制
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
          this.applyVideoCustomizations(); // 默认尝试应用视频定制
      }

      // 应用主题
      if (this.config.theme) {
        this.applyTheme(this.config.theme);
      }
    } catch (error) {
      logger.error('[UI定制] 应用定制时出错:', error);
    }
  }

  /**
   * 检测当前页面类型
   * @returns {string} 页面类型 (video/live/home/other)
   */
  detectPageType() {
    if (document.querySelector('video[autoplay]')) {
      return 'video';
    }

    if (document.querySelector('.live, .live-room, [data-type="live"]')) {
      return 'live';
    }

    return 'other';
  }

  /**
   * 处理页面滚动事件
   * @param {Event} e - 滚动事件对象
   */
  handleScroll(e) {
    const currentScroll = window.scrollY;
    // 检测滚动方向
    const direction = currentScroll > this.lastScrollPosition ? 'down' : 'up';
    this.lastScrollPosition = currentScroll;

    // 可以在这里实现基于滚动的UI交互，例如隐藏/显示设置面板
    if (this.settingsPanel && this.isPanelVisible) {
      // 向下滚动超过一定距离时自动隐藏面板
      if (direction === 'down' && currentScroll > 100) {
        this.hideSettingsPanel();
      }
    }
  }

  /**
   * 创建设置面板
   * @returns {HTMLElement} 设置面板元素
   */
  createSettingsPanel() {
    // 使用增强的createElement函数创建主容器
    const panel = createElement('div', {
      className: 'douyin-ui-customizer-panel',
      style: {
        animation: 'slideIn 0.3s ease-out'
      }
    });

    // 注入专用样式
    injectStyle(`
      .douyin-ui-customizer-panel {
        animation: slideIn 0.3s ease-out;
      }
      
      @keyframes slideIn {
        from {
          opacity: 0;
          transform: translateY(100%);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
    `);

    panel.innerHTML = `
      <div class="panel-header">
        <h2>抖音UI定制设置</h2>
        <button class="close-btn">×</button>
      </div>
      <div class="panel-content">
        <div class="settings-tabs">
          <div>
            <button class="tab-btn active" data-tab="general">通用设置</button>
            <button class="tab-btn" data-tab="video">短视频设置</button>
          </div>
          <div>
            <button class="tab-btn" data-tab="live">直播间设置</button>
            <button class="tab-btn" data-tab="advanced">高级设置</button>
          </div>
          <div>
            <button class="tab-btn" data-tab="auto-executor">自动执行</button>
            <button class="tab-btn" data-tab="import-export">导入导出</button>
          </div>
        </div>
        
        <div class="tab-content active" id="general-tab">
          ${this.createGeneralSettings()}
        </div>
        
        <div class="tab-content" id="video-tab">
          ${this.createVideoSettings()}
        </div>
        
        <div class="tab-content" id="live-tab">
          ${this.createLiveSettings()}
        </div>
        
        <div class="tab-content" id="auto-executor-tab">
          ${this.createAutoExecutorSettings()}
        </div>
        
        <div class="tab-content" id="import-export-tab">
          ${this.createImportExportSettings()}
        </div>
        
        <div class="tab-content" id="advanced-tab">
          ${this.createAdvancedSettings()}
        </div>
      </div>
      <div class="panel-footer">
        <div>
          <button class="save-btn">保存设置</button>
          <button class="reset-btn">重置为默认</button>
        </div>
      </div>
    `;

    // 添加事件监听
    this.setupSettingsPanelEvents(panel);

    return panel;
  }

  /**
   * 设置设置面板的事件监听
   * @param {HTMLElement} panel - 设置面板元素
   */
  setupSettingsPanelEvents(panel) {
    // 关闭按钮
    const closeBtn = panel.querySelector('.close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        panel.remove();
      });
    }

    // 标签切换
    const tabBtns = panel.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const tabId = btn.getAttribute('data-tab');
        if (!tabId) {
          return;
        }

        // 移除所有活跃状态
        tabBtns.forEach(b => b.classList.remove('active'));
        panel.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

        // 设置当前活跃状态
        btn.classList.add('active');
        const tabContent = panel.querySelector(`#${tabId}-tab`);
        if (tabContent) {
          tabContent.classList.add('active');
        }
      });
    });

    // 保存按钮
    const saveBtn = panel.querySelector('.save-btn');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        this.saveSettings(panel);
      });
    }

    // 重置按钮
    const resetBtn = panel.querySelector('.reset-btn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        if (confirm('确定要重置所有设置吗？')) {
          if (typeof window.resetConfig === 'function') {
            this.config = window.resetConfig();
          }
          panel.remove();
          location.reload();
        }
      });
    }

    // 初始化导入导出功能
    this.initImportExport(panel);

    // 自动执行控制器事件监听
    this.setupAutoExecutorEvents(panel);
  }

  /**
   * 使面板可拖动并确保不会移出窗口范围
   * @param {HTMLElement} panel - 要使其可拖动的面板元素
   */
  makePanelDraggable(panel) {
    if (!panel) {
      return;
    }
    const header = panel.querySelector('.panel-header');
    if (!header) {
      return;
    }

    // 确保面板初始化时就不会超出视口范围
    this.restrictPanelToViewport(panel);

    // 移除transform属性，改用left和top定位
    panel.style.transform = 'none';

    // 初始化面板可见状态
    this.isPanelVisible = true;

    let isDragging = false;
    let offsetX, offsetY;

    header.addEventListener('mousedown', (e) => {
      // 只有点击标题栏区域才触发拖动
      if (e.target.closest('button')) {
        return;
      }

      isDragging = true;
      const rect = panel.getBoundingClientRect();
      offsetX = e.clientX - rect.left;
      offsetY = e.clientY - rect.top;

      // 添加样式标识拖动状态
      panel.classList.add('dragging');

      // 防止文本选择
      e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
      if (!isDragging) {
        return;
      }
      // 计算新位置
      let newLeft = e.clientX - offsetX;
      let newTop = e.clientY - offsetY;

      // 限制在视口内
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const panelWidth = panel.offsetWidth;
      const panelHeight = panel.offsetHeight;

      // 确保面板不会移出视口范围
      newLeft = Math.max(0, Math.min(newLeft, viewportWidth - panelWidth));
      newTop = Math.max(0, Math.min(newTop, viewportHeight - panelHeight));

      // 设置位置
      panel.style.left = newLeft + 'px';
      panel.style.top = newTop + 'px';
    });

    document.addEventListener('mouseup', () => {
      if (!isDragging) {
        return;
      }
      isDragging = false;
      panel.classList.remove('dragging');

      // 释放拖动后再次检查边界
      this.restrictPanelToViewport(panel);
    });

    // 添加触摸事件支持
    header.addEventListener('touchstart', (e) => {
      if (e.target.closest('button')) {
        return;
      }
      isDragging = true;
      const touch = e.touches[0];
      const rect = panel.getBoundingClientRect();
      offsetX = touch.clientX - rect.left;
      offsetY = touch.clientY - rect.top;

      panel.classList.add('dragging');
      e.preventDefault();
    }, { passive: false });

    document.addEventListener('touchmove', (e) => {
      if (!isDragging) {
        return;
      }
      const touch = e.touches[0];
      let newLeft = touch.clientX - offsetX;
      let newTop = touch.clientY - offsetY;

      // 限制在视口内
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const panelWidth = panel.offsetWidth;
      const panelHeight = panel.offsetHeight;

      // 确保面板不会移出视口范围
      newLeft = Math.max(0, Math.min(newLeft, viewportWidth - panelWidth));
      newTop = Math.max(0, Math.min(newTop, viewportHeight - panelHeight));

      panel.style.left = newLeft + 'px';
      panel.style.top = newTop + 'px';
    }, { passive: false });

    document.addEventListener('touchend', () => {
      if (!isDragging) {
        return;
      }
      isDragging = false;
      panel.classList.remove('dragging');

      // 释放拖动后再次检查边界
      this.restrictPanelToViewport(panel);
    });
  }

  /**
   * 确保面板完全在视口范围内
   * @param {HTMLElement} panel - 面板元素
   */
  restrictPanelToViewport(panel) {
    if (!panel) {
      return;
    }
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const rect = panel.getBoundingClientRect();
    const panelWidth = rect.width;
    const panelHeight = rect.height;

    let left = rect.left;
    let top = rect.top;

    // 检查左右边界
    if (left < 0) {
      left = 0;
    } else if (left + panelWidth > viewportWidth) {
      left = viewportWidth - panelWidth;
    }

    // 检查上下边界
    if (top < 0) {
      top = 0;
    } else if (top + panelHeight > viewportHeight) {
      top = viewportHeight - panelHeight;
    }

    // 应用修正后的位置
    panel.style.left = left + 'px';
    panel.style.top = top + 'px';
  }

  /**
   * 创建通用设置内容
   * @returns {string} HTML字符串
   */
  createGeneralSettings() {
    return `
      <div class="setting-group">
        <h3>主题设置</h3>
        <label>
          <input type="radio" name="theme" value="light" ${this.config.theme === 'light' ? 'checked' : ''} />
          浅色主题
        </label>
        <label>
          <input type="radio" name="theme" value="dark" ${this.config.theme === 'dark' ? 'checked' : ''} />
          深色主题
        </label>
      </div>
      
      <div class="setting-group">
        <h3>播放设置</h3>
        <label>
          <input type="checkbox" id="autoPlay" ${this.config.general?.autoPlay ? 'checked' : ''} />
          自动播放视频
        </label>
        <label>
          <input type="checkbox" id="autoScroll" ${this.config.general?.autoScroll ? 'checked' : ''} />
          自动滚动到下一个视频
        </label>
      </div>
      
      <div class="setting-group">
        <h3>功能设置</h3>
        <label>
          <input type="checkbox" id="keyboardShortcuts" ${this.config.general?.keyboardShortcuts ? 'checked' : ''} />
          启用键盘快捷键
        </label>
        <label>
          <input type="checkbox" id="notifications" ${this.config.general?.notifications ? 'checked' : ''} />
          启用通知提醒
        </label>
      </div>
    `;
  }

  /**
   * 创建短视频设置内容
   * @returns {string} HTML字符串
   */
  createVideoSettings() {
    return `
      <div class="setting-group">
        <h3>显示元素</h3>
        <label>
          <input type="checkbox" id="showLikeButton" ${this.config.videoUI?.showLikeButton ?? true ? 'checked' : ''} />
          显示点赞按钮
        </label>
        <label>
          <input type="checkbox" id="showCommentButton" ${this.config.videoUI?.showCommentButton ?? true ? 'checked' : ''} />
          显示评论按钮
        </label>
        <label>
          <input type="checkbox" id="showShareButton" ${this.config.videoUI?.showShareButton ?? true ? 'checked' : ''} />
          显示分享按钮
        </label>
        <label>
          <input type="checkbox" id="showAuthorInfo" ${this.config.videoUI?.showAuthorInfo ?? true ? 'checked' : ''} />
          显示作者信息
        </label>
        <label>
          <input type="checkbox" id="showMusicInfo" ${this.config.videoUI?.showMusicInfo ?? true ? 'checked' : ''} />
          显示音乐信息
        </label>
        <label>
          <input type="checkbox" id="showDescription" ${this.config.videoUI?.showDescription ?? true ? 'checked' : ''} />
          显示视频描述
        </label>
        <label>
          <input type="checkbox" id="showRecommendations" ${this.config.videoUI?.showRecommendations ?? true ? 'checked' : ''} />
          显示推荐视频
        </label>
      </div>
      
      <div class="setting-group">
        <h3>控制栏设置</h3>
        <label>
          <input type="checkbox" id="controlBar-show" ${this.config.videoUI?.controlBar?.show ?? true ? 'checked' : ''} />
          显示控制栏
        </label>
        <label>
          <input type="checkbox" id="controlBar-autoHide" ${this.config.videoUI?.controlBar?.autoHide ?? true ? 'checked' : ''} />
          自动隐藏控制栏
        </label>
        <label>
          <select id="controlBar-position">
            <option value="bottom" ${this.config.videoUI?.controlBar?.position === 'bottom' ? 'selected' : ''}>底部</option>
            <option value="top" ${this.config.videoUI?.controlBar?.position === 'top' ? 'selected' : ''}>顶部</option>
          </select>
          控制栏位置
        </label>
        <label>
          <select id="controlBar-size">
            <option value="small" ${this.config.videoUI?.controlBar?.size === 'small' ? 'selected' : ''}>小</option>
            <option value="medium" ${this.config.videoUI?.controlBar?.size === 'medium' ? 'selected' : ''}>中</option>
            <option value="large" ${this.config.videoUI?.controlBar?.size === 'large' ? 'selected' : ''}>大</option>
          </select>
          控制栏大小
        </label>
        <label>
          <input type="range" id="controlBar-opacity" min="0.1" max="1" step="0.1" value="${this.config.videoUI?.controlBar?.opacity ?? 0.9}" />
          控制栏透明度: <span id="controlBar-opacity-value">${(this.config.videoUI?.controlBar?.opacity ?? 0.9) * 100}%</span>
        </label>
      </div>
      
      <div class="setting-group">
        <h3>播放设置</h3>
        <label>
          <select id="playback-defaultQuality">
            <option value="auto" ${this.config.videoUI?.playback?.defaultQuality === 'auto' ? 'selected' : ''}>自动</option>
            <option value="low" ${this.config.videoUI?.playback?.defaultQuality === 'low' ? 'selected' : ''}>低画质</option>
            <option value="medium" ${this.config.videoUI?.playback?.defaultQuality === 'medium' ? 'selected' : ''}>中画质</option>
            <option value="high" ${this.config.videoUI?.playback?.defaultQuality === 'high' ? 'selected' : ''}>高画质</option>
            <option value="ultra" ${this.config.videoUI?.playback?.defaultQuality === 'ultra' ? 'selected' : ''}>超清</option>
          </select>
          默认画质
        </label>
        <label>
          <input type="checkbox" id="playback-autoPlay" ${this.config.videoUI?.playback?.autoPlay ?? true ? 'checked' : ''} />
          自动播放
        </label>
        <label>
          <input type="checkbox" id="playback-loop" ${this.config.videoUI?.playback?.loop ?? false ? 'checked' : ''} />
          循环播放
        </label>
      </div>
    `;
  }

  /**
   * 创建直播间设置内容
   * @returns {string} HTML字符串
   */
  createLiveSettings() {
    return `
      <div class="setting-group">
        <h3>显示元素</h3>
        <label>
          <input type="checkbox" id="liveShowGifts" ${this.config.liveUI?.showGifts ?? true ? 'checked' : ''} />
          显示礼物
        </label>
        <label>
          <input type="checkbox" id="liveShowDanmaku" ${this.config.liveUI?.showDanmaku ?? true ? 'checked' : ''} />
          显示弹幕
        </label>
        <label>
          <input type="checkbox" id="liveShowRecommendations" ${this.config.liveUI?.showRecommendations ?? true ? 'checked' : ''} />
          显示推荐
        </label>
        <label>
          <input type="checkbox" id="liveShowAds" ${this.config.liveUI?.showAds ?? false ? 'checked' : ''} />
          显示广告
        </label>
        <label>
          <input type="checkbox" id="liveShowStats" ${this.config.liveUI?.showStats ?? true ? 'checked' : ''} />
          显示统计信息
        </label>
      </div>
      
      <div class="setting-group">
        <h3>弹幕设置</h3>
        <label>
          <input type="range" id="danmaku-fontSize" min="12" max="36" step="1" value="${this.config.liveUI?.danmaku?.fontSize ?? 16}" />
          弹幕字体大小: <span id="danmaku-fontSize-value">${this.config.liveUI?.danmaku?.fontSize ?? 16}px</span>
        </label>
        <label>
          <input type="color" id="danmaku-color" value="${this.config.liveUI?.danmaku?.color ?? '#FFFFFF'}" />
          弹幕颜色
        </label>
        <label>
          <input type="range" id="danmaku-opacity" min="0.1" max="1" step="0.1" value="${this.config.liveUI?.danmaku?.opacity ?? 0.8}" />
          弹幕透明度: <span id="danmaku-opacity-value">${(this.config.liveUI?.danmaku?.opacity ?? 0.8) * 100}%</span>
        </label>
        <label>
          <select id="danmaku-speed">
            <option value="fast" ${this.config.liveUI?.danmaku?.speed === 'fast' ? 'selected' : ''}>快</option>
            <option value="medium" ${this.config.liveUI?.danmaku?.speed === 'medium' ? 'selected' : ''}>中</option>
            <option value="slow" ${this.config.liveUI?.danmaku?.speed === 'slow' ? 'selected' : ''}>慢</option>
          </select>
          弹幕速度
        </label>
        <label>
          <select id="danmaku-position">
            <option value="top" ${this.config.liveUI?.danmaku?.position === 'top' ? 'selected' : ''}>顶部</option>
            <option value="middle" ${this.config.liveUI?.danmaku?.position === 'middle' ? 'selected' : ''}>中部</option>
            <option value="bottom" ${this.config.liveUI?.danmaku?.position === 'bottom' ? 'selected' : ''}>底部</option>
          </select>
          弹幕位置
        </label>
        <label>
          <input type="number" id="danmaku-maxLines" min="1" max="10" value="${this.config.liveUI?.danmaku?.maxLines ?? 5}" />
          最大弹幕行数
        </label>
      </div>
      
      <div class="setting-group">
        <h3>布局设置</h3>
        <label>
          <select id="live-layout">
            <option value="default" ${this.config.liveUI?.layout === 'default' ? 'selected' : ''}>默认</option>
            <option value="minimal" ${this.config.liveUI?.layout === 'minimal' ? 'selected' : ''}>极简</option>
            <option value="immersive" ${this.config.liveUI?.layout === 'immersive' ? 'selected' : ''}>沉浸</option>
          </select>
          布局类型
        </label>
      </div>
      
      <div class="setting-group">
        <h3>音量设置</h3>
        <label>
          <input type="range" id="live-volume" min="0" max="100" step="5" value="${this.config.liveUI?.volume ?? 100}" />
          音量: <span id="live-volume-value">${this.config.liveUI?.volume ?? 100}%</span>
        </label>
      </div>
    `;
  }

  /**
   * 创建导入导出设置内容
   * @returns {string} HTML字符串
   */
  createImportExportSettings() {
    return `
      <div class="setting-group">
        <h3>配置导入</h3>
        <textarea id="importConfig" placeholder="粘贴配置JSON字符串" rows="5" cols="40"></textarea>
        <button id="importBtn" class="action-btn">导入配置</button>
      </div>
      
      <div class="setting-group">
        <h3>配置导出</h3>
        <button id="exportBtn" class="action-btn">导出当前配置</button>
        <textarea id="exportConfig" placeholder="配置将在这里显示" rows="5" cols="40"></textarea>
        <button id="copyBtn" class="action-btn">复制到剪贴板</button>
      </div>
    `;
  }

  /**
   * 初始化导入导出功能
   * @param {HTMLElement} panel - 设置面板元素
   */
  initImportExport(panel) {
    if (!panel) {
      return;
    }
    // 导出配置
    const exportBtn = panel.querySelector('#exportBtn');
    const exportConfig = panel.querySelector('#exportConfig');
    const copyBtn = panel.querySelector('#copyBtn');

    if (exportBtn && exportConfig) {
      exportBtn.addEventListener('click', () => {
        try {
          // 导入配置管理模块
          import('./config.js').then(({ default: configManager }) => {
            // 使用配置管理模块导出配置
            const exportedConfig = configManager.exportConfig();
            exportConfig.value = exportedConfig;
          }).catch(error => {
            logger.error('导入配置管理模块失败:', error);
            // 降级使用直接导出
            exportConfig.value = JSON.stringify(this.config, null, 2);
          });
        } catch (error) {
          logger.error('导出配置失败:', error);
          alert('导出配置失败');
        }
      });
    }

    // 复制到剪贴板
    if (copyBtn && exportConfig) {
      copyBtn.addEventListener('click', () => {
        exportConfig.select();
        try {
          document.execCommand('copy');
          alert('配置已复制到剪贴板');
        } catch (error) {
          logger.error('复制失败:', error);
          alert('复制失败');
        }
      });
    }

    // 导入配置
    const importBtn = panel.querySelector('#importBtn');
    const importConfig = panel.querySelector('#importConfig');

    if (importBtn && importConfig) {
      importBtn.addEventListener('click', () => {
        try {
          // 导入配置管理模块
          import('./config.js').then(({ default: configManager }) => {
            // 使用配置管理模块导入配置
            const success = configManager.importConfig(importConfig.value);
            if (success) {
              // 重新加载配置
              this.config = configManager.getConfig();
              alert('配置导入成功');
              location.reload();
            } else {
              alert('导入配置失败，请检查JSON格式');
            }
          }).catch(error => {
            logger.error('导入配置管理模块失败:', error);
            // 降级使用直接导入
            const newConfig = JSON.parse(importConfig.value);
            this.config = newConfig;
            this.saveConfig();
            alert('配置导入成功');
            location.reload();
          });
        } catch (error) {
          logger.error('导入配置失败:', error);
          alert('导入配置失败，请检查JSON格式');
        }
      });
    }
  }

  /**
   * 保存配置到localStorage
   * @param {Object} config - 配置对象
   */
  saveToLocalStorage(config) {
    try {
      localStorage.setItem('douyin-ui-customizer-config', JSON.stringify(config));
      logger.info('配置已保存到localStorage');
    } catch (error) {
      logger.error('保存到localStorage失败:', error);
    }
  }

  /**
   * 保存配置
   */
  saveConfig() {
    try {
      // 导入配置管理模块
      import('./config.js').then(({ default: configManager }) => {
        // 使用配置管理模块保存配置
        configManager.setConfig(this.config);
        logger.info('配置已保存');
      }).catch(error => {
        logger.error('导入配置管理模块失败:', error);
        // 降级使用localStorage
        this.saveToLocalStorage(this.config);
      });
    } catch (error) {
      logger.error('保存配置失败:', error);
      // 降级使用localStorage
      this.saveToLocalStorage(this.config);
    }
  }

  /**
   * 应用配置到设置面板
   */
  applySettingsToPanel() {
    if (!this.settingsPanel) {
      return;
    }
    // 应用主题
    this.applyTheme(this.config.theme || 'light');
    logger.info('Settings applied to panel');

    // 添加事件监听
    this.settingsPanel.querySelectorAll('input[type="radio"][name="theme"]').forEach(radio => {
      radio.addEventListener('change', (e) => {
        this.config.theme = e.target.value;
        this.applyTheme(this.config.theme);
        this.saveConfig();
      });
    });

    // 通用设置事件监听
    const generalSettings = [
      'autoPlay', 'autoScroll', 'keyboardShortcuts', 'notifications'
    ];

    generalSettings.forEach(setting => {
      const checkbox = this.settingsPanel.querySelector(`#${setting}`);
      if (checkbox) {
        checkbox.addEventListener('change', (e) => {
          if (!this.config.general) {
            this.config.general = {};
          }
          this.config.general[setting] = e.target.checked;
          this.saveConfig();
        });
      }
    });

    // 视频设置事件监听
    const videoSettings = [
      'showLikeButton', 'showCommentButton', 'showShareButton',
      'showAuthorInfo', 'showMusicInfo', 'showDescription',
      'showRecommendations'
    ];

    videoSettings.forEach(setting => {
      const checkbox = this.settingsPanel.querySelector(`#${setting}`);
      if (checkbox) {
        checkbox.addEventListener('change', (e) => {
          if (!this.config.videoUI) {
            this.config.videoUI = {};
          }
          this.config.videoUI[setting] = e.target.checked;
          this.saveConfig();
          this.applyVideoCustomizations();
        });
      }
    });

    // 控制栏设置事件监听
    const controlBarSettings = [
      'controlBar-show', 'controlBar-autoHide', 'controlBar-position',
      'controlBar-size', 'controlBar-opacity'
    ];

    controlBarSettings.forEach(setting => {
      const element = this.settingsPanel.querySelector(`#${setting}`);
      if (element) {
        element.addEventListener('change', (e) => {
          if (!this.config.videoUI) {
            this.config.videoUI = {};
          }
          if (!this.config.videoUI.controlBar) {
            this.config.videoUI.controlBar = {};
          }
          
          const controlBarSetting = setting.replace('controlBar-', '');
          let value = e.target.value;
          
          if (e.target.type === 'checkbox') {
            value = e.target.checked;
          } else if (controlBarSetting === 'opacity') {
            value = parseFloat(value);
            this.settingsPanel.querySelector('#controlBar-opacity-value').textContent = `${value * 100}%`;
          }
          
          this.config.videoUI.controlBar[controlBarSetting] = value;
          this.saveConfig();
          this.applyVideoCustomizations();
        });
      }
    });

    // 播放设置事件监听
    const playbackSettings = [
      'playback-defaultQuality', 'playback-autoPlay', 'playback-loop'
    ];

    playbackSettings.forEach(setting => {
      const element = this.settingsPanel.querySelector(`#${setting}`);
      if (element) {
        element.addEventListener('change', (e) => {
          if (!this.config.videoUI) {
            this.config.videoUI = {};
          }
          if (!this.config.videoUI.playback) {
            this.config.videoUI.playback = {};
          }
          
          const playbackSetting = setting.replace('playback-', '');
          let value = e.target.value;
          
          if (e.target.type === 'checkbox') {
            value = e.target.checked;
          }
          
          this.config.videoUI.playback[playbackSetting] = value;
          this.saveConfig();
          this.applyVideoCustomizations();
        });
      }
    });

    // 直播间设置事件监听
    const liveSettings = [
      'liveShowGifts', 'liveShowDanmaku', 'liveShowRecommendations',
      'liveShowAds', 'liveShowStats'
    ];

    liveSettings.forEach(setting => {
      const checkbox = this.settingsPanel.querySelector(`#${setting}`);
      if (checkbox) {
        checkbox.addEventListener('change', (e) => {
          if (!this.config.liveUI) {
            this.config.liveUI = {};
          }
          const liveSetting = setting.replace('liveShow', 'show');
          this.config.liveUI[liveSetting] = e.target.checked;
          this.saveConfig();
          this.applyLiveCustomizations();
        });
      }
    });

    // 弹幕设置事件监听
    const danmakuSettings = [
      'danmaku-fontSize', 'danmaku-color', 'danmaku-opacity',
      'danmaku-speed', 'danmaku-position', 'danmaku-maxLines'
    ];

    danmakuSettings.forEach(setting => {
      const element = this.settingsPanel.querySelector(`#${setting}`);
      if (element) {
        element.addEventListener('change', (e) => {
          if (!this.config.liveUI) {
            this.config.liveUI = {};
          }
          if (!this.config.liveUI.danmaku) {
            this.config.liveUI.danmaku = {};
          }
          
          const danmakuSetting = setting.replace('danmaku-', '');
          let value = e.target.value;
          
          if (danmakuSetting === 'fontSize' || danmakuSetting === 'maxLines') {
            value = parseInt(value);
            if (danmakuSetting === 'fontSize') {
              this.settingsPanel.querySelector('#danmaku-fontSize-value').textContent = `${value}px`;
            }
          } else if (danmakuSetting === 'opacity') {
            value = parseFloat(value);
            this.settingsPanel.querySelector('#danmaku-opacity-value').textContent = `${value * 100}%`;
          }
          
          this.config.liveUI.danmaku[danmakuSetting] = value;
          this.saveConfig();
          this.applyLiveCustomizations();
        });
      }
    });

    // 直播布局设置
    const liveLayoutSelect = this.settingsPanel.querySelector('#live-layout');
    if (liveLayoutSelect) {
      liveLayoutSelect.addEventListener('change', (e) => {
        if (!this.config.liveUI) {
          this.config.liveUI = {};
        }
        this.config.liveUI.layout = e.target.value;
        this.saveConfig();
        this.applyLiveCustomizations();
      });
    }

    // 直播音量设置
    const liveVolumeSlider = this.settingsPanel.querySelector('#live-volume');
    if (liveVolumeSlider) {
      liveVolumeSlider.addEventListener('input', (e) => {
        const value = parseInt(e.target.value);
        this.settingsPanel.querySelector('#live-volume-value').textContent = `${value}%`;
        if (!this.config.liveUI) {
          this.config.liveUI = {};
        }
        this.config.liveUI.volume = value;
        this.saveConfig();
        this.applyLiveCustomizations();
      });
    }

    // 高级设置事件监听
    const advancedSettings = [
      'advanced-debugMode', 'advanced-performanceMode'
    ];

    advancedSettings.forEach(setting => {
      const checkbox = this.settingsPanel.querySelector(`#${setting}`);
      if (checkbox) {
        checkbox.addEventListener('change', (e) => {
          if (!this.config.advanced) {
            this.config.advanced = {};
          }
          const advancedSetting = setting.replace('advanced-', '');
          this.config.advanced[advancedSetting] = e.target.checked;
          this.saveConfig();
        });
      }
    });

    // 自定义CSS事件监听
    const customCSS = this.settingsPanel.querySelector('#advanced-customCSS');
    if (customCSS) {
      customCSS.addEventListener('input', (e) => {
        if (!this.config.advanced) {
          this.config.advanced = {};
        }
        this.config.advanced.customCSS = e.target.value;
        this.saveConfig();
      });
    }

    // 自定义脚本事件监听
    const addScriptBtn = this.settingsPanel.querySelector('#add-script');
    if (addScriptBtn) {
      addScriptBtn.addEventListener('click', () => {
        const scriptsList = this.settingsPanel.querySelector('#custom-scripts-list');
        if (scriptsList) {
          const index = scriptsList.children.length;
          const scriptItem = document.createElement('div');
          scriptItem.className = 'script-item';
          scriptItem.innerHTML = `
            <input type="text" data-index="${index}" placeholder="脚本URL或代码" />
            <button class="remove-script" data-index="${index}">删除</button>
          `;
          scriptsList.appendChild(scriptItem);
          
          // 添加删除脚本按钮事件
          const removeBtn = scriptItem.querySelector('.remove-script');
          if (removeBtn) {
            removeBtn.addEventListener('click', (e) => {
              scriptItem.remove();
              this.saveConfig();
            });
          }
          
          // 添加输入事件
          const input = scriptItem.querySelector('input');
          if (input) {
            input.addEventListener('input', () => {
              this.saveConfig();
            });
          }
        }
      });
    }

    // 初始化删除脚本按钮事件
    const removeScriptBtns = this.settingsPanel.querySelectorAll('.remove-script');
    removeScriptBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const scriptItem = btn.closest('.script-item');
        if (scriptItem) {
          scriptItem.remove();
          this.saveConfig();
        }
      });
    });

    // 初始化脚本输入事件
    const scriptInputs = this.settingsPanel.querySelectorAll('#custom-scripts-list .script-item input');
    scriptInputs.forEach(input => {
      input.addEventListener('input', () => {
        this.saveConfig();
      });
    });
  }

  /**
   * 创建高级设置内容
   * @returns {string} HTML字符串
   */
  createAdvancedSettings() {
    return `
      <div class="setting-group">
        <h3>高级功能</h3>
        <label>
          <input type="checkbox" id="advanced-debugMode" ${this.config.advanced?.debugMode ?? false ? 'checked' : ''} />
          启用调试模式
        </label>
        <label>
          <input type="checkbox" id="advanced-performanceMode" ${this.config.advanced?.performanceMode ?? false ? 'checked' : ''} />
          启用性能模式
        </label>
      </div>
      
      <div class="setting-group">
        <h3>自定义CSS</h3>
        <textarea id="advanced-customCSS" placeholder="输入自定义CSS代码" rows="5" cols="40">${this.config.advanced?.customCSS ?? ''}</textarea>
        <small>注意：自定义CSS可能会影响页面性能</small>
      </div>
      
      <div class="setting-group">
        <h3>自定义脚本</h3>
        <div id="custom-scripts-list">
          ${(this.config.advanced?.customScripts ?? []).map((script, index) => `
            <div class="script-item">
              <input type="text" value="${script}" data-index="${index}" placeholder="脚本URL或代码" />
              <button class="remove-script" data-index="${index}">删除</button>
            </div>
          `).join('')}
        </div>
        <button id="add-script">添加脚本</button>
        <small>注意：自定义脚本可能会带来安全风险，请谨慎使用</small>
      </div>
    `;
  }

  /**
   * 应用主题到页面
   * @param {string} theme - 主题名称
   */
  applyTheme(theme) {
    try {
      // 使用ThemeManager应用主题
      themeManager.applyTheme(theme);
      // 为设置面板应用主题特定样式
      if (this.settingsPanel) {
        const themeConfig = themeManager.getTheme(theme);
        if (themeConfig) {
          this.settingsPanel.style.backgroundColor = themeConfig.background || '#fff';
          this.settingsPanel.style.color = themeConfig.text || '#000';
          this.settingsPanel.style.borderColor = themeConfig.border || '#e0e0e0';

          // 应用到面板内元素
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

  /**
   * 保存配置到本地存储
   */
  async saveSettings(panel) {
    try {
      // 收集通用设置
      const themeRadios = panel.querySelectorAll('input[type="radio"][name="theme"]');
      for (const radio of themeRadios) {
        if (radio.checked) {
          this.config.theme = radio.value;
          break;
        }
      }

      // 收集通用设置
      const generalSettings = [
        'autoPlay', 'autoScroll', 'keyboardShortcuts', 'notifications'
      ];

      generalSettings.forEach(setting => {
        const checkbox = panel.querySelector(`#${setting}`);
        if (checkbox) {
          if (!this.config.general) {
            this.config.general = {};
          }
          this.config.general[setting] = checkbox.checked;
        }
      });

      // 收集视频设置
      const videoSettings = [
        'showLikeButton', 'showCommentButton', 'showShareButton',
        'showAuthorInfo', 'showMusicInfo', 'showDescription',
        'showRecommendations'
      ];

      videoSettings.forEach(setting => {
        const checkbox = panel.querySelector(`#${setting}`);
        if (checkbox) {
          if (!this.config.videoUI) {
            this.config.videoUI = {};
          }
          this.config.videoUI[setting] = checkbox.checked;
        }
      });

      // 收集控制栏设置
      const controlBarSettings = [
        'controlBar-show', 'controlBar-autoHide', 'controlBar-position',
        'controlBar-size', 'controlBar-opacity'
      ];

      controlBarSettings.forEach(setting => {
        const element = panel.querySelector(`#${setting}`);
        if (element) {
          if (!this.config.videoUI) {
            this.config.videoUI = {};
          }
          if (!this.config.videoUI.controlBar) {
            this.config.videoUI.controlBar = {};
          }
          
          const controlBarSetting = setting.replace('controlBar-', '');
          let value = element.value;
          
          if (element.type === 'checkbox') {
            value = element.checked;
          } else if (controlBarSetting === 'opacity') {
            value = parseFloat(value);
          }
          
          this.config.videoUI.controlBar[controlBarSetting] = value;
        }
      });

      // 收集播放设置
      const playbackSettings = [
        'playback-defaultQuality', 'playback-autoPlay', 'playback-loop'
      ];

      playbackSettings.forEach(setting => {
        const element = panel.querySelector(`#${setting}`);
        if (element) {
          if (!this.config.videoUI) {
            this.config.videoUI = {};
          }
          if (!this.config.videoUI.playback) {
            this.config.videoUI.playback = {};
          }
          
          const playbackSetting = setting.replace('playback-', '');
          let value = element.value;
          
          if (element.type === 'checkbox') {
            value = element.checked;
          }
          
          this.config.videoUI.playback[playbackSetting] = value;
        }
      });

      // 收集直播间设置
      const liveSettings = [
        'liveShowGifts', 'liveShowDanmaku', 'liveShowRecommendations',
        'liveShowAds', 'liveShowStats'
      ];

      liveSettings.forEach(setting => {
        const checkbox = panel.querySelector(`#${setting}`);
        if (checkbox) {
          if (!this.config.liveUI) {
            this.config.liveUI = {};
          }
          const liveSetting = setting.replace('liveShow', 'show');
          this.config.liveUI[liveSetting] = checkbox.checked;
        }
      });

      // 收集弹幕设置
      const danmakuSettings = [
        'danmaku-fontSize', 'danmaku-color', 'danmaku-opacity',
        'danmaku-speed', 'danmaku-position', 'danmaku-maxLines'
      ];

      danmakuSettings.forEach(setting => {
        const element = panel.querySelector(`#${setting}`);
        if (element) {
          if (!this.config.liveUI) {
            this.config.liveUI = {};
          }
          if (!this.config.liveUI.danmaku) {
            this.config.liveUI.danmaku = {};
          }
          
          const danmakuSetting = setting.replace('danmaku-', '');
          let value = element.value;
          
          if (danmakuSetting === 'fontSize' || danmakuSetting === 'maxLines') {
            value = parseInt(value);
          } else if (danmakuSetting === 'opacity') {
            value = parseFloat(value);
          }
          
          this.config.liveUI.danmaku[danmakuSetting] = value;
        }
      });

      // 收集直播布局设置
      const liveLayoutSelect = panel.querySelector('#live-layout');
      if (liveLayoutSelect) {
        if (!this.config.liveUI) {
          this.config.liveUI = {};
        }
        this.config.liveUI.layout = liveLayoutSelect.value;
      }

      // 收集直播音量设置
      const liveVolumeSlider = panel.querySelector('#live-volume');
      if (liveVolumeSlider) {
        if (!this.config.liveUI) {
          this.config.liveUI = {};
        }
        this.config.liveUI.volume = parseInt(liveVolumeSlider.value);
      }

      // 收集高级设置
      const debugModeCheckbox = panel.querySelector('#advanced-debugMode');
      const performanceModeCheckbox = panel.querySelector('#advanced-performanceMode');
      const customCSS = panel.querySelector('#advanced-customCSS');
      
      if (!this.config.advanced) {
        this.config.advanced = {};
      }
      
      if (debugModeCheckbox) {
        this.config.advanced.debugMode = debugModeCheckbox.checked;
      }
      
      if (performanceModeCheckbox) {
        this.config.advanced.performanceMode = performanceModeCheckbox.checked;
      }
      
      if (customCSS) {
        this.config.advanced.customCSS = customCSS.value;
      }
      
      // 收集自定义脚本
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
      
      // 添加自定义脚本安全检查
      if (hasScripts) {
        // 显示安全警告对话框
        const confirmed = confirm('警告：自定义脚本可能会带来安全风险，包括XSS攻击和数据泄露。\n\n请确保您只添加来自可信来源的脚本。\n\n是否继续保存？');
        
        if (!confirmed) {
          return false;
        }
        
        // 对脚本内容进行基本安全检查
        for (const script of customScripts) {
          // 检查危险函数
          if (script.includes('eval(') || script.includes('Function(') || script.includes('innerHTML') || 
              script.includes('document.write') || script.includes('execScript')) {
            const scriptConfirmed = confirm('警告：检测到可能的危险代码（如eval、innerHTML等）。\n\n是否确认添加此脚本？');
            if (!scriptConfirmed) {
              return false;
            }
          }
          
          // 检查脚本URL白名单
          if (script.startsWith('http://') || script.startsWith('https://')) {
            // 简单的白名单检查，只允许常见的CDN和可信域名
            const allowedDomains = [
              'cdnjs.cloudflare.com',
              'cdn.jsdelivr.net',
              'unpkg.com',
              'jsdelivr.net',
              'cdnjs.com'
            ];
            
            const url = new URL(script);
            const domain = url.hostname;
            
            if (!allowedDomains.some(allowedDomain => domain.includes(allowedDomain))) {
              const urlConfirmed = confirm(`警告：脚本URL来自非白名单域名 (${domain})。\n\n是否确认添加此脚本？`);
              if (!urlConfirmed) {
                return false;
              }
            }
          }
        }
      }
      
      this.config.advanced.customScripts = customScripts;

      // 验证配置
      let validationResult = { valid: true, issues: [] };
      
      try {
        // 导入配置管理模块进行验证
        const configModule = await import('./config.js');
        const configManager = configModule.default;
        validationResult = configManager.validateConfig(this.config);
      } catch (error) {
        logger.error('验证配置失败:', error);
        // 降级使用基本验证
        validationResult = this.basicValidateConfig(this.config);
      }
      
      if (!validationResult.valid) {
        // 显示验证错误
        const errorMessage = '配置验证失败：\n' + validationResult.issues.join('\n');
        alert(errorMessage);
        return;
      }

      // 保存配置
      this.saveConfig();
      logger.info('Settings saved from panel');
      
      // 应用所有定制
      this.applyAllCustomizations();
      
      // 显示保存成功提示
      alert('设置保存成功！');
    } catch (error) {
      logger.error('保存设置失败:', error);
      alert('保存设置失败，请重试');
    }
  }

  /**
   * 初始化UI管理器
   */
  init() {
    logger.info('[UI管理器] 初始化UI管理器');
    try {
      // 初始化设置面板
      this.initSettingsPanel();
      // 初始化UI定制
      this.initUI();
      // 注册事件监听
      this.setupEvents();
    } catch (error) {
      logger.error('[UI管理器] 初始化失败:', error);
    }
  }

  /**
   * 初始化UI定制
   */
  initUI() {
    logger.info('[UI管理器] 初始化UI定制');
    // 显示切换按钮
    this.showToggleButton();
    // 使用统一的定制应用方法
    this.applyAllCustomizations();
  }

  /**
   * 设置事件监听
   */
  setupEvents() {
    logger.info('[UI管理器] 设置事件监听');
    // 页面加载完成后应用定制
    addEvent(window, 'load', this.debouncedApplyCustomizations);
    // DOM内容变化时重新应用定制（用于SPA应用）
    addEvent(document, 'DOMContentLoaded', this.debouncedApplyCustomizations);
    // 使用MutationObserver监听DOM变化
    this.observeDomChanges();

    // 监听滚动事件
    addEvent(window, 'scroll', this.throttledHandleScroll);

    // 监听窗口大小变化
    addEvent(window, 'resize', this.debouncedApplyCustomizations);

    // 监听主题变化
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme)').addEventListener) {
      addEvent(window.matchMedia('(prefers-color-scheme)'), 'change', this.debouncedApplyCustomizations);
    }
  }

  /**
   * 观察DOM变化
   */
  observeDomChanges() {
    const observer = new MutationObserver(this.debouncedApplyCustomizations);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      characterData: true
    });

    // 保存观察者实例以便后续清理
    this.domObserver = observer;
  }

  /**
   * 清理资源和事件监听
   */
  cleanup() {
    logger.info('[UI管理器] 清理资源和事件监听');
    // 断开DOM观察者
    if (this.domObserver) {
      this.domObserver.disconnect();
    }

    // 移除事件监听
    removeEvent(window, 'load', this.debouncedApplyCustomizations);
    removeEvent(document, 'DOMContentLoaded', this.debouncedApplyCustomizations);
    removeEvent(window, 'scroll', this.throttledHandleScroll);
    removeEvent(window, 'resize', this.debouncedApplyCustomizations);

    if (window.matchMedia && window.matchMedia('(prefers-color-scheme)').removeEventListener) {
      removeEvent(window.matchMedia('(prefers-color-scheme)'), 'change', this.debouncedApplyCustomizations);
    }
  }

  /**
   * 创建自动执行控制器设置界面
   * @returns {string} HTML字符串
   */
  createAutoExecutorSettings() {
    return `
      <div class="setting-group">
        <h3>自动执行控制器</h3>
        <div class="setting-item">
          <label class="switch">
            <input type="checkbox" id="auto-executor-enable" />
            <span class="slider"></span>
          </label>
          <span>启用自动执行控制器</span>
        </div>
      </div>
      
      <div class="setting-group">
        <h3>控制中心</h3>
        <div class="button-group">
          <div>
            <button id="auto-executor-start" class="ui-button primary">开始执行</button>
            <button id="auto-executor-stop" class="ui-button secondary">停止执行</button>
          </div>
          <button id="auto-executor-emergency" class="ui-button danger">紧急停止</button>
        </div>
      </div>
      
      <div class="setting-group">
        <h3>配置选项</h3>
        <div class="setting-item">
          <label for="check-interval">检查间隔（毫秒）:</label>
          <input type="number" id="check-interval" value="1000" min="500" max="10000" />
        </div>
        <div class="setting-item">
          <label for="max-attempts">最大重试次数:</label>
          <input type="number" id="max-attempts" value="10" min="1" max="50" />
        </div>
        <div class="setting-item">
          <label class="switch">
            <input type="checkbox" id="enable-logging" />
            <span class="slider"></span>
          </label>
          <span>启用日志记录</span>
        </div>
        <div class="setting-item">
          <label class="switch">
            <input type="checkbox" id="require-confirmation" />
            <span class="slider"></span>
          </label>
          <span>需要确认</span>
        </div>
      </div>
      
      <div class="setting-group">
        <h3>执行状态</h3>
        <div class="status-info">
          <div><strong>状态:</strong> <span id="executor-status">未运行</span></div>
          <div><strong>当前尝试:</strong> <span id="current-attempt">0</span></div>
          <div><strong>历史记录:</strong> <span id="execution-history">0</span></div>
        </div>
      </div>
    `;
  }

  /**
   * 设置自动执行控制器的事件监听
   * @param {HTMLElement} panel - 设置面板元素
   */
  setupAutoExecutorEvents(panel) {
    // 获取自动执行控制器相关元素
    const autoExecutorTab = panel.querySelector('#auto-executor-tab');
    if (!autoExecutorTab) {
      return;
    }

    // 启用开关
    const enableSwitch = autoExecutorTab.querySelector('#auto-executor-enable');
    if (enableSwitch) {
      enableSwitch.addEventListener('change', (e) => {
        const isEnabled = e.target.checked;
        this.config.autoExecutorEnabled = isEnabled;
        // 保存配置
        this.saveConfig();
      });
    }

    // 开始按钮
    const startBtn = autoExecutorTab.querySelector('#auto-executor-start');
    if (startBtn) {
      startBtn.addEventListener('click', () => {
        // 获取配置
        const interval = parseInt(autoExecutorTab.querySelector('#check-interval').value) || 5000;
        const maxRetries = parseInt(autoExecutorTab.querySelector('#max-attempts').value) || 3;
        const enableLogging = autoExecutorTab.querySelector('#enable-logging').checked;
        const requireConfirmation = autoExecutorTab.querySelector('#require-confirmation').checked;

        // 更新配置
        this.config.autoExecutorConfig = {
          checkInterval: interval,
          maxRetries: maxRetries,
          enableLogging: enableLogging,
          requireConfirmation: requireConfirmation
        };
        this.saveConfig();

        // 启动自动执行
        autoExecutor.start(this.config.autoExecutorConfig);

        // 更新状态显示
        this.updateAutoExecutorStatus(panel);
      });
    }

    // 停止按钮
    const stopBtn = autoExecutorTab.querySelector('#auto-executor-stop');
    if (stopBtn) {
      stopBtn.addEventListener('click', () => {
        autoExecutor.stop();
        this.updateAutoExecutorStatus(panel);
      });
    }

    // 紧急停止按钮
    const emergencyStopBtn = autoExecutorTab.querySelector('#auto-executor-emergency');
    if (emergencyStopBtn) {
      emergencyStopBtn.addEventListener('click', () => {
        autoExecutor.emergencyStop();
        this.updateAutoExecutorStatus(panel);
      });
    }

    // 配置选项变化时保存配置
    const configInputs = autoExecutorTab.querySelectorAll('.setting-item input');
    configInputs.forEach(input => {
      input.addEventListener('change', () => {
        const interval = parseInt(autoExecutorTab.querySelector('#check-interval').value) || 5000;
        const maxRetries = parseInt(autoExecutorTab.querySelector('#max-attempts').value) || 3;
        const enableLogging = autoExecutorTab.querySelector('#enable-logging').checked;
        const requireConfirmation = autoExecutorTab.querySelector('#require-confirmation').checked;

        this.config.autoExecutorConfig = {
          checkInterval: interval,
          maxRetries: maxRetries,
          enableLogging: enableLogging,
          requireConfirmation: requireConfirmation
        };
        this.saveConfig();
      });
    });

    // 定期更新状态显示
    this.autoExecutorStatusInterval = setInterval(() => {
      this.updateAutoExecutorStatus(panel);
    }, 1000);
  }

  /**
   * 更新自动执行控制器的状态显示
   * @param {HTMLElement} panel - 设置面板元素
   */
  updateAutoExecutorStatus(panel) {
    const autoExecutorTab = panel.querySelector('#auto-executor-tab');
    if (!autoExecutorTab) {
      return;
    }

    const statusElement = autoExecutorTab.querySelector('#executor-status');
    const currentAttemptElement = autoExecutorTab.querySelector('#current-attempt');
    const historyElement = autoExecutorTab.querySelector('#execution-history');

    if (statusElement) {
      statusElement.textContent = autoExecutor.isRunning() ? '运行中' : '已停止';
      statusElement.className = autoExecutor.isRunning() ? 'status-running' : 'status-stopped';
    }

    if (currentAttemptElement) {
      currentAttemptElement.textContent = `当前尝试: ${autoExecutor.getCurrentAttempt()}`;
    }

    if (historyElement) {
      const history = autoExecutor.getExecutionHistory();
      historyElement.innerHTML = history.slice(-10).map((entry, index) => {
        const statusClass = entry.success ? 'success' : 'failed';
        return `<div class="history-entry ${statusClass}">${new Date(entry.timestamp).toLocaleTimeString()} - ${entry.action} (${entry.success ? '成功' : '失败'})</div>`;
      }).join('');
    }
  }

  /**
   * 基本配置验证
   * @param {Object} config - 要验证的配置对象
   * @returns {Object} 包含验证结果的对象
   */
  basicValidateConfig(config) {
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

    return {
      valid: issues.length === 0,
      issues: issues
    };
  }

  /**
   * 初始化设置面板
   */
  initSettingsPanel() {
    // 创建设置面板
    this.settingsPanel = document.createElement('div');
    this.settingsPanel.id = 'douyin-customizer-panel';
    this.settingsPanel.className = 'customizer-panel';

    // 设置面板样式
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

    // 添加拖动句柄
    const dragHandle = document.createElement('div');
    dragHandle.className = 'drag-handle';
    dragHandle.style.cursor = 'move';
    dragHandle.style.padding = '10px';
    dragHandle.style.backgroundColor = '#f5f5f5';
    dragHandle.style.borderRadius = '4px 4px 0 0';
    dragHandle.style.marginBottom = '15px';
    dragHandle.textContent = '抖音UI定制工具 (拖动移动)';

    // 添加关闭按钮
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

    // 添加设置内容
    const settingsContent = document.createElement('div');
    settingsContent.className = 'settings-content';

    // 创建选项卡导航
    const tabNavigation = document.createElement('div');
    tabNavigation.className = 'tab-navigation';
    tabNavigation.innerHTML = `
      <div>
        <button class="tab-button active" data-tab="general">通用设置</button>
        <button class="tab-button" data-tab="video">视频设置</button>
      </div>
      <button class="tab-button" data-tab="live">直播设置</button>
    `;

    // 创建选项卡内容
    const tabContent = document.createElement('div');
    tabContent.className = 'tab-content';

    // 通用设置选项卡
    const generalTab = document.createElement('div');
    generalTab.className = 'tab-pane active';
    generalTab.id = 'general-tab';
    generalTab.innerHTML = this.createGeneralSettings();

    // 视频设置选项卡
    const videoTab = document.createElement('div');
    videoTab.className = 'tab-pane';
    videoTab.id = 'video-tab';
    videoTab.innerHTML = this.createVideoSettings();

    // 直播设置选项卡
    const liveTab = document.createElement('div');
    liveTab.className = 'tab-pane';
    liveTab.id = 'live-tab';
    liveTab.innerHTML = this.createLiveSettings();

    // 组装设置面板
    this.settingsPanel.appendChild(dragHandle);
    this.settingsPanel.appendChild(closeButton);
    this.settingsPanel.appendChild(tabNavigation);
    tabContent.appendChild(generalTab);
    tabContent.appendChild(videoTab);
    tabContent.appendChild(liveTab);
    this.settingsPanel.appendChild(tabContent);

    // 添加到文档
    document.body.appendChild(this.settingsPanel);

    // 使面板可拖动
    this.makePanelDraggable(this.settingsPanel);

    // 初始化时检查并限制面板在视口内
    this.restrictPanelToViewport(this.settingsPanel);

    // 应用设置
    this.applySettingsToPanel();

    // 设置选项卡切换
    tabNavigation.querySelectorAll('.tab-button').forEach(button => {
      button.addEventListener('click', () => {
        const tabId = button.getAttribute('data-tab');
        // 移除所有活动状态
        tabNavigation.querySelectorAll('.tab-button').forEach(btn => {
          btn.classList.remove('active');
        });
        tabContent.querySelectorAll('.tab-pane').forEach(pane => {
          pane.classList.remove('active');
        });

        // 添加活动状态
        button.classList.add('active');
        tabContent.querySelector(`#${tabId}-tab`).classList.add('active');
      });
    });

    // 初始化主题
    this.applyTheme(this.config.theme);

    // 触发面板初始化完成事件
    eventEmitter.emit('ui.panel.initialized');
    logger.info('Settings panel initialized');
  }

  /**
   * 显示切换按钮
   */
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

// 导出UIManager类
export default UIManager;

// ==UserScript==
// @name         抖音网页版UI定制工具
// @namespace    http://tampermonkey.net/
// @version 1.0.151
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
 * 版本：1.0.151
 * 更新日期：2026-01-09 18:35
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
const CURRENT_VERSION = '1.0.151';
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

