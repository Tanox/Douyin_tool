// src/config.js v1.1.0

import { getItem, setItem, getNestedItem, setNestedItem, NamespacedStorage } from './utils/storage.js';
import logger from './utils/logger.js';
import eventEmitter from './utils/eventEmitter.js';

// 创建配置专用的命名空间存储
const configStorage = new NamespacedStorage('douyin_tool_config');

// 配置存储键名
const CONFIG_KEY = 'main';

// 配置版本，用于配置迁移
const CONFIG_VERSION = '1.1.0';

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