// ==UserScript==
// @name         抖音Web端界面UI定制工具
// @namespace    https://github.com/sutchan
// @version      2.0.2
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

import { getItem, setItem, getNestedItem, setNestedItem, NamespacedStorage } from './utils/storage.ts';
import logger from './utils/logger.ts';
import eventEmitter from './utils/eventEmitter.ts';

const configStorage = new NamespacedStorage('douyin_tool_config');

const CONFIG_KEY = 'main';
const CONFIG_VERSION = '2.0.2';

interface DanmakuConfig {
  fontSize: number;
  color: string;
  opacity: number;
  speed: string;
  position: string;
  maxLines: number;
}

interface ControlBarConfig {
  show: boolean;
  autoHide: boolean;
  position: string;
  size: string;
  opacity: number;
}

interface PlaybackConfig {
  defaultQuality: string;
  autoPlay: boolean;
  loop: boolean;
}

interface VideoUIConfig {
  showLikeButton: boolean;
  showCommentButton: boolean;
  showShareButton: boolean;
  showAuthorInfo: boolean;
  showMusicInfo: boolean;
  showDescription: boolean;
  showRecommendations: boolean;
  layout: string;
  controlBar: ControlBarConfig;
  playback: PlaybackConfig;
}

interface LiveUIConfig {
  showGifts: boolean;
  showDanmaku: boolean;
  showRecommendations: boolean;
  showAds: boolean;
  showStats: boolean;
  danmaku: DanmakuConfig;
  layout: string;
  volume: number;
}

interface GeneralConfig {
  autoPlay: boolean;
  autoScroll: boolean;
  keyboardShortcuts: boolean;
  notifications: boolean;
  language: string;
  animations: boolean;
  updateCheck: boolean;
}

interface AdvancedConfig {
  debugMode: boolean;
  performanceMode: boolean;
  customCSS: string;
  customScripts: string[];
}

interface Config {
  version: string;
  theme: string;
  videoUI: VideoUIConfig;
  liveUI: LiveUIConfig;
  general: GeneralConfig;
  advanced: AdvancedConfig;
}

const DEFAULT_CONFIG: Config = {
  version: CONFIG_VERSION,
  theme: 'light',

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

  general: {
    autoPlay: true,
    autoScroll: false,
    keyboardShortcuts: true,
    notifications: false,
    language: 'zh-CN',
    animations: true,
    updateCheck: true
  },

  advanced: {
    debugMode: false,
    performanceMode: false,
    customCSS: '',
    customScripts: []
  }
};

let currentConfig: Config | null = null;

export function loadConfig(): Config {
  try {
    const savedConfig = configStorage.getItem(CONFIG_KEY);

    if (savedConfig) {
      logger.info('[抖音工具] 加载已保存的配置');
      const loadedConfig = migrateConfig(savedConfig as Config);
      currentConfig = mergeConfig(loadedConfig, DEFAULT_CONFIG);
      currentConfig.version = CONFIG_VERSION;
    } else {
      logger.info('[抖音工具] 使用默认配置');
      currentConfig = { ...DEFAULT_CONFIG };
    }

    saveConfig(currentConfig);

    return currentConfig;
  } catch (error) {
    logger.error('[抖音工具] 加载配置失败：', error);
    eventEmitter.emit('config.error', { type: 'load', error });
    currentConfig = { ...DEFAULT_CONFIG };
    return currentConfig;
  }
}

export function getConfig(): Config {
  if (!currentConfig) {
    loadConfig();
  }
  return { ...currentConfig! };
}

export function setConfig(key: string | Partial<Config>, value?: unknown): boolean {
  try {
    if (!currentConfig) {
      loadConfig();
    }

    if (typeof key === 'object') {
      currentConfig = mergeConfig(key, currentConfig!);
    } else {
      if (key.includes('.')) {
        setNestedConfig(key, value);
      } else {
        (currentConfig as Record<string, unknown>)[key] = value;
      }
    }

    currentConfig!.version = CONFIG_VERSION;

    saveConfig(currentConfig!);

    return true;
  } catch (error) {
    logger.error('[抖音工具] 设置配置失败：', error);
    eventEmitter.emit('config.error', { type: 'set', error, key, value });
    return false;
  }
}

function setNestedConfig(path: string, value: unknown): void {
  const keys = path.split('.');
  let obj: Record<string, unknown> = currentConfig as Record<string, unknown>;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!obj[key] || typeof obj[key] !== 'object') {
      obj[key] = {};
    }
    obj = obj[key] as Record<string, unknown>;
  }

  obj[keys[keys.length - 1]] = value;
}

export function getConfigValue<T = unknown>(path: string, defaultValue?: T): T {
  if (!currentConfig) {
    loadConfig();
  }

  if (path.includes('.')) {
    return getNestedItemFromConfig(path, defaultValue) as T;
  }

  const value = (currentConfig as Record<string, unknown>)[path];
  return value !== undefined ? (value as T) : defaultValue as T;
}

function getNestedItemFromConfig(path: string, defaultValue: unknown): unknown {
  const keys = path.split('.');
  let obj: Record<string, unknown> = currentConfig as Record<string, unknown>;

  for (const key of keys) {
    if (obj === null || obj === undefined || typeof obj !== 'object' || !(key in obj)) {
      return defaultValue;
    }
    obj = obj[key] as Record<string, unknown>;
  }

  return obj;
}

export function saveConfig(config: Config): boolean {
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

export function resetConfig(): Config {
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

function mergeConfig(userConfig: Partial<Config>, defaultConfig: Config): Config {
  const merged = { ...defaultConfig };

  for (const key in userConfig) {
    if (Object.prototype.hasOwnProperty.call(userConfig, key)) {
      if (typeof userConfig[key] === 'object' && userConfig[key] !== null &&
        typeof defaultConfig[key as keyof Config] === 'object' && defaultConfig[key as keyof Config] !== null &&
        !Array.isArray(userConfig[key]) && !Array.isArray(defaultConfig[key as keyof Config])) {
        merged[key as keyof Config] = mergeConfig(
          userConfig[key] as Partial<Config>,
          defaultConfig[key as keyof Config] as Config
        ) as Config[keyof Config];
      } else {
        merged[key as keyof Config] = userConfig[key] as Config[keyof Config];
      }
    }
  }

  return merged;
}

function migrateConfig(oldConfig: Config): Config {
  if (!oldConfig.version || oldConfig.version !== CONFIG_VERSION) {
    logger.info(`[抖音工具] 执行配置迁移: ${oldConfig.version || 'unknown'} -> ${CONFIG_VERSION}`);
    eventEmitter.emit('config.migrating', {
      fromVersion: oldConfig.version || 'unknown',
      toVersion: CONFIG_VERSION
    });

    if (!oldConfig.advanced) {
      oldConfig.advanced = DEFAULT_CONFIG.advanced;
    }

    if (!oldConfig.videoUI.playback) {
      oldConfig.videoUI.playback = DEFAULT_CONFIG.videoUI.playback;
    }

    if (!oldConfig.liveUI.danmaku.maxLines) {
      oldConfig.liveUI.danmaku.maxLines = DEFAULT_CONFIG.liveUI.danmaku.maxLines;
    }
  }

  return oldConfig;
}

export function exportConfig(): string {
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

export function importConfig(jsonString: string): boolean {
  try {
    const config = JSON.parse(jsonString);

    if (typeof config !== 'object' || config === null) {
      throw new Error('配置格式无效');
    }

    currentConfig = mergeConfig(config as Partial<Config>, DEFAULT_CONFIG);
    currentConfig.version = CONFIG_VERSION;
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

export function validateConfig(config: Partial<Config>): { valid: boolean; issues: string[] } {
  const issues: string[] = [];

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

  } catch (error) {
    logger.error('[抖音工具] 验证配置失败：', error);
    eventEmitter.emit('config.error', { type: 'validate', error });
    issues.push('配置验证过程中发生错误');
  }

  return {
    valid: issues.length === 0,
    issues
  };
}

const initialized = loadConfig();

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

logger.info('[抖音工具] 配置管理器已初始化');
eventEmitter.emit('config.initialized', { config: currentConfig });

export * from './dom.js';

export * from './storage.js';

export { Logger } from './logger.js';
export { default as logger } from './logger.js';

export { EventEmitter } from './eventEmitter.js';
export { default as eventEmitter } from './eventEmitter.js';

export { PerformanceMonitor } from './performance.js';
export { default as performanceMonitor } from './performance.js';

export { default as autoExecutor } from './autoExecutor.js';

export const utils = {
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
  
  Logger,
  logger,
  
  EventEmitter,
  eventEmitter,
  
  PerformanceMonitor,
  performanceMonitor,
  
  autoExecutor
};

export default utils;

import logger from './logger.js';
import type { DOMCacheEntry, ElementStructure, BatchUpdateCallback } from '../types/index.js';
import { isDOMCacheEntry } from '../types/index.js';

const domCache = new Map<string, DOMCacheEntry>();
const cacheExpiry = 5000;

// 开发模式检测：通过 URL 参数或本地存储控制
const isDevMode = ((): boolean => {
  try {
    // 检查 URL 参数
    if (typeof window !== 'undefined' && window.location) {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('douyin_tool_debug') === 'true') {
        return true;
      }
    }
    // 检查本地存储（UserScript 环境）
    const debugFlag = localStorage.getItem('douyin_tool_debug_mode');
    return debugFlag === 'true';
  } catch {
    return false;
  }
})();

// 轻量级缓存条目验证（生产环境使用）
function isValidCacheEntry(entry: unknown): entry is DOMCacheEntry {
  if (typeof entry !== 'object' || entry === null) {
    return false;
  }
  const e = entry as Record<string, unknown>;
  // 仅检查必要的 timestamp 字段
  return typeof e.timestamp === 'number';
}

// 根据环境选择验证函数
const validateCacheEntry = isDevMode ? isDOMCacheEntry : isValidCacheEntry;

function generateCacheKey(selector: string | RegExp, parent: HTMLElement | Document = document): string {
  const selectorStr = typeof selector === 'string' ? selector : selector.toString();
  const parentStr = parent === document ? 'document' : parent.id || parent.className || parent.tagName;
  return `${selectorStr}_${parentStr}`;
}

function cleanupCache(): void {
  const now = Date.now();
  for (const [key, { timestamp }] of domCache.entries()) {
    if (now - timestamp > cacheExpiry) {
      domCache.delete(key);
    }
  }
}

let cleanupInterval: ReturnType<typeof setInterval> = setInterval(cleanupCache, cacheExpiry * 2);

export function cleanup(): void {
  clearInterval(cleanupInterval);
  clearDomCache();
  logger.info('DOM工具模块已清理');
}

export function debounce<T extends (...args: unknown[]) => void>(func: T, wait: number): T {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  return function executedFunction(this: unknown, ...args: unknown[]) {
    const later = () => {
      clearTimeout(timeout);
      func.apply(this, args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  } as T;
}

export function throttle<T extends (...args: unknown[]) => void>(func: T, limit: number): T {
  let inThrottle = false;
  return function (this: unknown, ...args: unknown[]) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => { inThrottle = false; }, limit);
    }
  } as T;
}

export function getElement(selector: string, parent: HTMLElement | Document = document): HTMLElement | null {
  try {
    const cacheKey = generateCacheKey(selector, parent);

    if (domCache.has(cacheKey)) {
      const entry = domCache.get(cacheKey)!;
      if (!validateCacheEntry(entry)) {
        if (isDevMode) {
          logger.warn('缓存条目类型验证失败，已清除');
        }
        domCache.delete(cacheKey);
      } else {
        return entry.element as HTMLElement | null;
      }
    }

    const element = parent.querySelector<HTMLElement>(selector);

    domCache.set(cacheKey, {
      element: element as Element | null,
      timestamp: Date.now()
    });

    return element;
  } catch (error) {
    logger.error(`获取元素失败 (${selector}):`, error);
    return null;
  }
}

export function getElements(selector: string, parent: HTMLElement | Document = document): HTMLElement[] {
  try {
    const cacheKey = generateCacheKey(selector, parent);

    if (domCache.has(cacheKey)) {
      const entry = domCache.get(cacheKey)!;
      if (!validateCacheEntry(entry)) {
        if (isDevMode) {
          logger.warn('缓存条目类型验证失败，已清除');
        }
        domCache.delete(cacheKey);
      } else {
        return entry.elements || [];
      }
    }

    const elements = Array.from(parent.querySelectorAll<HTMLElement>(selector));

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

export function findElementsByClassPattern(pattern: RegExp, parent: HTMLElement | Document = document): HTMLElement[] {
  try {
    const cacheKey = generateCacheKey(pattern, parent);

    if (domCache.has(cacheKey)) {
      const entry = domCache.get(cacheKey)!;
      if (!validateCacheEntry(entry)) {
        if (isDevMode) {
          logger.warn('缓存条目类型验证失败，已清除');
        }
        domCache.delete(cacheKey);
      } else {
        return entry.elements || [];
      }
    }

    const elements: HTMLElement[] = [];

    const patternStr = pattern.toString().replace(/^\/|\/$/g, '');
    if (!patternStr.includes('|') && !patternStr.includes('*') && !patternStr.includes('+') && !patternStr.includes('?')) {
      try {
        const selector = `.${patternStr}`;
        const cssElements = getElements(selector, parent);
        if (cssElements.length > 0) {
          domCache.set(cacheKey, {
            elements: cssElements,
            timestamp: Date.now()
          });
          return cssElements;
        }
      } catch {
      }
    }

    const allElements = parent.querySelectorAll<HTMLElement>('[class]');
    allElements.forEach(element => {
      if (pattern.test(element.className)) {
        elements.push(element);
      }
    });

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

export function findElementsByStructure(options: ElementStructure, parent: HTMLElement | Document = document): HTMLElement[] {
  try {
    const cacheKey = generateCacheKey(JSON.stringify(options), parent);

    if (domCache.has(cacheKey)) {
      const entry = domCache.get(cacheKey)!;
      if (!validateCacheEntry(entry)) {
        if (isDevMode) {
          logger.warn('缓存条目类型验证失败，已清除');
        }
        domCache.delete(cacheKey);
      } else {
        return entry.elements || [];
      }
    }

    const result: HTMLElement[] = [];
    const candidates = options.tagName
      ? parent.getElementsByTagName(options.tagName)
      : parent.getElementsByTagName('*');

    for (let i = 0; i < candidates.length; i++) {
      const candidate = candidates[i] as HTMLElement;
      let match = true;

      if (options.attributes) {
        for (const [attr, value] of Object.entries(options.attributes)) {
          if (candidate.getAttribute(attr) !== value) {
            match = false;
            break;
          }
        }
      }

      if (match && options.children) {
        match = options.children.every((childOption, index) => {
          const child = candidate.children[index];
          if (!child) return false;

          if (childOption.tagName && child.tagName.toLowerCase() !== childOption.tagName.toLowerCase()) {
            return false;
          }

          if (childOption.attributes) {
            for (const [attr, value] of Object.entries(childOption.attributes)) {
              if ((child as HTMLElement).getAttribute(attr) !== value) {
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

export function batchUpdate(callback: BatchUpdateCallback, container: HTMLElement = document.body): void {
  try {
    const fragment = document.createDocumentFragment();
    callback(fragment);
    container.appendChild(fragment);
  } catch (error) {
    logger.error('批量更新失败:', error);
  }
}

export function toggleElements(elements: HTMLElement | HTMLElement[], show: boolean): void {
  try {
    const elementArray = Array.isArray(elements) ? elements : [elements];

    elementArray.forEach(element => {
      if (element && element.style) {
        element.style.display = show ? '' : 'none';
      }
    });
  } catch (error) {
    logger.error('切换元素显示状态失败:', error);
  }
}

export function addClass(element: HTMLElement, className: string | string[]): void {
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

export function removeClass(element: HTMLElement, className: string | string[]): void {
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

export function addEvent<K extends keyof HTMLElementEventMap>(
  element: HTMLElement,
  eventType: K,
  handler: (this: HTMLElement, ev: HTMLElementEventMap[K]) => void,
  options?: AddEventListenerOptions
): void {
  try {
    if (element && element.addEventListener) {
      element.addEventListener(eventType, handler, options);
    }
  } catch (error) {
    logger.error(`添加事件监听器失败 (${eventType}):`, error);
  }
}

export function removeEvent<K extends keyof HTMLElementEventMap>(
  element: HTMLElement,
  eventType: K,
  handler: (this: HTMLElement, ev: HTMLElementEventMap[K]) => void,
  options?: EventListenerOptions
): void {
  try {
    if (element && element.removeEventListener) {
      element.removeEventListener(eventType, handler, options);
    }
  } catch (error) {
    logger.error(`移除事件监听器失败 (${eventType}):`, error);
  }
}

export function delegateEvent<K extends keyof HTMLElementEventMap>(
  parent: HTMLElement,
  eventType: K,
  selector: string,
  handler: (this: HTMLElement, ev: HTMLElementEventMap[K]) => void
): void {
  try {
    parent.addEventListener(eventType, (e) => {
      const target = e.target.closest<HTMLElement>(selector);
      if (target) {
        handler.call(target, e);
      }
    });
  } catch (error) {
    logger.error(`事件委托失败 (${eventType}):`, error);
  }
}

export function createElement(
  tagName: string,
  attributes: Record<string, unknown> = {},
  children: (HTMLElement | string)[] = []
): HTMLElement {
  try {
    const element = document.createElement(tagName) as HTMLElement;

    for (const [key, value] of Object.entries(attributes)) {
      if (key === 'style' && typeof value === 'object' && value !== null) {
        Object.assign(element.style, value);
      } else if (key === 'className' && typeof value === 'string') {
        element.className = value;
      } else if (typeof value === 'string') {
        element.setAttribute(key, value);
      }
    }

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
    return document.createElement(tagName) as HTMLElement;
  }
}

export function injectStyle(css: string): HTMLStyleElement | null {
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

export function clearDomCache(): void {
  domCache.clear();
  logger.info('DOM缓存已清理');
}

import type { LoggerOptions, LogEntry } from '../types/index.js';

class Logger {
  private prefix: string;
  private enableDebug: boolean;
  private enableInfo: boolean;
  private enableWarn: boolean;
  private enableError: boolean;
  private logHistory: LogEntry[];
  private maxHistorySize: number;

  constructor(options: LoggerOptions = {}) {
    this.prefix = options.prefix || '[抖音UI定制工具]';
    this.enableDebug = options.enableDebug !== false;
    this.enableInfo = options.enableInfo !== false;
    this.enableWarn = options.enableWarn !== false;
    this.enableError = options.enableError !== false;
    this.logHistory = [];
    this.maxHistorySize = options.maxHistorySize || 100;
  }

  private _formatMessage(level: string, ...args: unknown[]): string {
    const timestamp = new Date().toLocaleTimeString();
    const formattedArgs = args.map(arg => {
      if (typeof arg === 'object' && arg !== null) {
        try {
          return JSON.stringify(arg, null, 2);
        } catch {
          return String(arg);
        }
      }
      return String(arg);
    }).join(' ');

    return `[${timestamp}] ${this.prefix} [${level}] ${formattedArgs}`;
  }

  private _addToHistory(level: LogEntry['level'], message: string): void {
    this.logHistory.push({
      timestamp: Date.now(),
      level,
      message
    });

    if (this.logHistory.length > this.maxHistorySize) {
      this.logHistory.shift();
    }
  }

  debug(...args: unknown[]): void {
    if (!this.enableDebug) return;
    const message = this._formatMessage('DEBUG', ...args);
    console.debug(message);
    this._addToHistory('DEBUG', message);
  }

  info(...args: unknown[]): void {
    if (!this.enableInfo) return;
    const message = this._formatMessage('INFO', ...args);
    console.info(message);
    this._addToHistory('INFO', message);
  }

  warn(...args: unknown[]): void {
    if (!this.enableWarn) return;
    const message = this._formatMessage('WARN', ...args);
    console.warn(message);
    this._addToHistory('WARN', message);
  }

  error(...args: unknown[]): void {
    if (!this.enableError) return;
    const message = this._formatMessage('ERROR', ...args);
    console.error(message);
    this._addToHistory('ERROR', message);
  }

  setLevel(options: Partial<Pick<LoggerOptions, 'enableDebug' | 'enableInfo' | 'enableWarn' | 'enableError'>>): void {
    this.enableDebug = options.enableDebug !== false;
    this.enableInfo = options.enableInfo !== false;
    this.enableWarn = options.enableWarn !== false;
    this.enableError = options.enableError !== false;
    this.debug('日志级别已更新:', options);
  }

  getHistory(limit: number = this.logHistory.length): LogEntry[] {
    return this.logHistory.slice(-limit);
  }

  clearHistory(): void {
    this.logHistory = [];
    this.debug('日志历史已清空');
  }

  exportLogs(): string {
    return this.logHistory
      .map(log => `[${new Date(log.timestamp).toISOString()}] [${log.level}] ${log.message}`)
      .join('\n');
  }

  captureError(error: Error, context: string = ''): string {
    const errorMessage = `${context}${context ? ': ' : ''}${error.message || 'Unknown error'}`;
    const stack = error.stack || '';
    this.error(errorMessage, 'Stack:', stack);
    return errorMessage;
  }
}

const defaultLogger = new Logger();

export { Logger };
export default defaultLogger;

import logger from './logger.js';
import type { StorageInfo } from '../types/index.js';

export function getItem<T = unknown>(key: string, defaultValue: T | null = null): T | null {
  try {
    const item = localStorage.getItem(key);
    if (!item) return defaultValue;

    const parsed = JSON.parse(item);

    if (parsed && typeof parsed === 'object' && parsed._expiresAt && Date.now() > parsed._expiresAt) {
      localStorage.removeItem(key);
      return defaultValue;
    }

    return parsed._data !== undefined ? (parsed._data as T) : (parsed as T);
  } catch (error) {
    logger.error(`获取存储数据失败 (${key}):`, error);
    return defaultValue;
  }
}

export function setItem<T = unknown>(key: string, value: T, expiresIn?: number): boolean {
  try {
    let dataToStore: unknown;

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

export function removeItem(key: string): boolean {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    logger.error(`删除存储数据失败 (${key}):`, error);
    return false;
  }
}

export function clearAll(): boolean {
  try {
    localStorage.clear();
    return true;
  } catch (error) {
    logger.error('清除所有存储数据失败:', error);
    return false;
  }
}

export function getNestedItem<T = unknown>(key: string, path: string, defaultValue: T | null = null): T | null {
  try {
    const data = getItem<Record<string, unknown>>(key, {});
    const keys = path.split('.');
    let current: unknown = data;

    for (const k of keys) {
      if (current === null || current === undefined || typeof current !== 'object') {
        return defaultValue;
      }
      current = (current as Record<string, unknown>)[k];
    }

    return current !== undefined ? (current as T) : defaultValue;
  } catch (error) {
    logger.error(`获取嵌套数据失败 (${key}.${path}):`, error);
    return defaultValue;
  }
}

export function setNestedItem<T = unknown>(key: string, path: string, value: T, expiresIn?: number): boolean {
  try {
    const data = getItem<Record<string, unknown>>(key, {});
    const keys = path.split('.');
    let current = data;

    for (let i = 0; i < keys.length - 1; i++) {
      const k = keys[i];
      if (!current[k] || typeof current[k] !== 'object') {
        current[k] = {};
      }
      current = current[k] as Record<string, unknown>;
    }

    current[keys[keys.length - 1]] = value;

    return setItem(key, data, expiresIn);
  } catch (error) {
    logger.error(`设置嵌套数据失败 (${key}.${path}):`, error);
    return false;
  }
}

export function getMultipleItems(keys: string[]): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  keys.forEach(key => {
    result[key] = getItem(key);
  });

  return result;
}

export function setMultipleItems(keyValuePairs: Record<string, unknown>, expiresIn?: number): Record<string, boolean> {
  const results: Record<string, boolean> = {};

  for (const [key, value] of Object.entries(keyValuePairs)) {
    results[key] = setItem(key, value, expiresIn);
  }

  return results;
}

export function removeMultipleItems(keys: string[]): Record<string, boolean> {
  const results: Record<string, boolean> = {};

  keys.forEach(key => {
    results[key] = removeItem(key);
  });

  return results;
}

export function hasItem(key: string): boolean {
  try {
    return localStorage.getItem(key) !== null;
  } catch (error) {
    logger.error(`检查键是否存在失败 (${key}):`, error);
    return false;
  }
}

export function getAllKeys(): string[] {
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      keys.push(localStorage.key(i) || '');
    }
    return keys;
  } catch (error) {
    logger.error('获取所有键名失败:', error);
    return [];
  }
}

export function getStorageInfo(): StorageInfo {
  try {
    let totalSize = 0;
    const items: Record<string, number> = {};

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      const value = localStorage.getItem(key || '');
      const size = new Blob([key + value]).size;

      totalSize += size;
      if (key) {
        items[key] = size;
      }
    }

    return {
      totalItems: localStorage.length,
      totalSize,
      totalSizeKB: (totalSize / 1024).toFixed(2),
      items
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

export function getPrefixedKey(prefix: string, key: string): string {
  return `${prefix}_${key}`;
}

export class NamespacedStorage {
  private namespace: string;

  constructor(namespace: string) {
    this.namespace = namespace;
  }

  private _getKey(key: string): string {
    return getPrefixedKey(this.namespace, key);
  }

  getItem<T = unknown>(key: string, defaultValue: T | null = null): T | null {
    return getItem(this._getKey(key), defaultValue);
  }

  setItem<T = unknown>(key: string, value: T, expiresIn?: number): boolean {
    return setItem(this._getKey(key), value, expiresIn);
  }

  removeItem(key: string): boolean {
    return removeItem(this._getKey(key));
  }

  clear(): boolean {
    try {
      const prefix = `${this.namespace}_`;
      const keysToRemove: string[] = [];

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

import logger from './logger.js';

interface Listener {
  (...args: unknown[]): void;
  originalListener?: Listener;
}

interface EventsMap {
  [event: string]: Listener[];
}

class EventEmitter {
  private events: EventsMap = {};
  private maxListeners: number = 10;

  setMaxListeners(n: number): EventEmitter {
    this.maxListeners = n;
    return this;
  }

  on(event: string, listener: Listener): EventEmitter {
    if (typeof listener !== 'function') {
      throw new TypeError('监听器必须是函数');
    }

    if (!this.events[event]) {
      this.events[event] = [];
    }

    if (this.events[event].length >= this.maxListeners && !this.events[event].includes(listener)) {
      logger.warn(`警告: 事件'${event}'的监听器数量超过了${this.maxListeners}个。` +
                 `使用setMaxListeners方法可以修改此限制。`);
    }

    this.events[event].push(listener);
    return this;
  }

  once(event: string, listener: Listener): EventEmitter {
    if (typeof listener !== 'function') {
      throw new TypeError('监听器必须是函数');
    }

    const onceWrapper: Listener = (...args) => {
      this.off(event, onceWrapper);
      listener.apply(this, args);
    };

    onceWrapper.originalListener = listener;
    return this.on(event, onceWrapper);
  }

  off(event?: string, listener?: Listener): EventEmitter {
    if (event === undefined) {
      this.events = {};
      return this;
    }

    if (!this.events[event]) {
      return this;
    }

    if (listener === undefined) {
      this.events[event] = [];
      return this;
    }

    this.events[event] = this.events[event].filter(l => {
      return l !== listener && l.originalListener !== listener;
    });

    return this;
  }

  emit(event: string, ...args: unknown[]): boolean {
    if (!this.events[event] || this.events[event].length === 0) {
      return false;
    }

    const listeners = [...this.events[event]];

    listeners.forEach(listener => {
      try {
        listener.apply(this, args);
      } catch (error) {
        logger.error(`事件'${event}'的监听器执行出错:`, error);
      }
    });

    return true;
  }

  listeners(event: string): Listener[] {
    return this.events[event] || [];
  }

  eventNames(): string[] {
    return Object.keys(this.events).filter(event => this.events[event].length > 0);
  }

  listenerCount(event: string): number {
    return this.events[event] ? this.events[event].length : 0;
  }

  removeAllListeners(event?: string): EventEmitter {
    if (event) {
      this.events[event] = [];
    } else {
      this.events = {};
    }
    return this;
  }

  prependListener(event: string, listener: Listener): EventEmitter {
    if (typeof listener !== 'function') {
      throw new TypeError('监听器必须是函数');
    }

    if (!this.events[event]) {
      this.events[event] = [];
    }

    this.events[event].unshift(listener);
    return this;
  }

  prependOnceListener(event: string, listener: Listener): EventEmitter {
    if (typeof listener !== 'function') {
      throw new TypeError('监听器必须是函数');
    }

    const onceWrapper: Listener = (...args) => {
      this.off(event, onceWrapper);
      listener.apply(this, args);
    };

    onceWrapper.originalListener = listener;

    if (!this.events[event]) {
      this.events[event] = [];
    }

    this.events[event].unshift(onceWrapper);
    return this;
  }
}

const defaultEventEmitter = new EventEmitter();

export { EventEmitter };
export default defaultEventEmitter;

import { debounce, throttle, getElement, getElements, findElementsByClassPattern, findElementsByStructure } from './dom.js';
import logger from './logger.js';
import eventEmitter from './eventEmitter.js';
import buttonDetector from './buttonDetector.js';

interface RetryConfig {
  maxAttempts: number;
  initialDelay: number;
  backoffFactor: number;
}

interface AutoExecutorOptions {
  detectionStrategies?: string[];
  retryConfig?: RetryConfig;
  checkInterval?: number;
  enabled?: boolean;
  customDetector?: () => HTMLElement | null;
  confirmationRequired?: boolean;
  enableLogging?: boolean;
  captureScreenshots?: boolean;
  maxHistorySize?: number;
}

interface ExecutionRecord {
  timestamp: string;
  buttonText: string;
  buttonSelector: string;
  success: boolean;
  error?: string;
}

interface ButtonClickEvent {
  button: HTMLElement;
  text: string | null;
  selector: string;
}

class AutoExecutor {
  private options: Required<AutoExecutorOptions>;
  private isRunning: boolean;
  private isEmergencyStopped: boolean;
  private checkIntervalId: ReturnType<typeof setInterval> | null;
  private executionHistory: ExecutionRecord[];
  private currentAttempt: number;

  constructor(options: AutoExecutorOptions = {}) {
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

  start(): void {
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

  stop(): void {
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

  emergencyStop(): void {
    this.isEmergencyStopped = true;
    this.stop();

    if (this.options.enableLogging) {
      logger.error('AutoExecutor emergency stopped');
    }

    eventEmitter.emit('autoExecutor.emergencyStopped');
  }

  private async detectAndClick(): Promise<void> {
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

  private async detectButton(): Promise<HTMLElement | null> {
    let button: HTMLElement | null = null;

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

  private isButtonClickable(button: HTMLElement): boolean {
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

  private compressHistory(): void {
    if (this.executionHistory.length > this.options.maxHistorySize) {
      this.executionHistory = this.executionHistory.slice(-this.options.maxHistorySize);

      if (this.options.enableLogging) {
        logger.info(`AutoExecutor compressed history to ${this.executionHistory.length} records`);
      }
    }
  }

  private clickButton(button: HTMLElement): void {
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
      const err = error as Error;
      this.executionHistory.push({
        timestamp: new Date().toISOString(),
        buttonText: button.textContent || button.innerText || 'Unknown',
        buttonSelector: this.getElementSelector(button),
        success: false,
        error: err.message
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

  private getElementSelector(element: HTMLElement | null): string {
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

      const path: string[] = [];
      let current: HTMLElement | null = element;

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
    } catch {
      return element.tagName.toLowerCase();
    }
  }

  private captureScreenshot(type: string): void {
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

  getExecutionHistory(limit: number | null = null): ExecutionRecord[] {
    if (limit) {
      return this.executionHistory.slice(-limit);
    }
    return [...this.executionHistory];
  }

  getCurrentAttempt(): number {
    return this.currentAttempt;
  }

  updateOptions(newOptions: Partial<AutoExecutorOptions>): void {
    this.options = { ...this.options, ...newOptions };

    if (this.options.enableLogging) {
      logger.info('AutoExecutor options updated:', newOptions);
    }
  }
}

export default new AutoExecutor();

import logger from './logger.js';

interface PerformanceMonitorOptions {
  enableFpsMonitor?: boolean;
  enableMemoryMonitor?: boolean;
  sampleInterval?: number;
}

interface FpsRecord {
  timestamp: number;
  value: number;
}

interface MemoryRecord {
  timestamp: number;
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

interface ExecutionTimeRecord {
  timestamp: number;
  duration: number;
}

interface RenderTimeRecord {
  timestamp: number;
  duration: number;
}

interface MemoryInfo {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
  usedPercent: number;
}

interface PerformanceMetrics {
  fps: FpsRecord[];
  memory: MemoryRecord[];
  executionTimes: Record<string, ExecutionTimeRecord[]>;
  renderTimes: RenderTimeRecord[];
}

interface PerformanceHealth {
  isHealthy: boolean;
  fpsHealthy: boolean;
  memoryHealthy: boolean;
  currentFps: number;
  averageFps: number;
  memoryUsage: string;
}

interface WatchResult {
  stop: () => void;
}

class PerformanceMonitor {
  private enableFpsMonitor: boolean;
  private enableMemoryMonitor: boolean;
  private sampleInterval: number;
  private metrics: PerformanceMetrics;
  private isMonitoring: boolean;
  private fpsMonitorId: number | null;
  private memoryMonitorId: ReturnType<typeof setInterval> | null;
  private lastTime: number;
  private frameCount: number;
  private fpsHistory: number[];
  private maxFpsHistory: number;

  constructor(options: PerformanceMonitorOptions = {}) {
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
    this.maxFpsHistory = 60;
  }

  startMonitoring(): void {
    if (this.isMonitoring) return;

    this.isMonitoring = true;

    if (this.enableFpsMonitor && window.requestAnimationFrame) {
      this.lastTime = performance.now();
      this.frameCount = 0;
      this._startFpsMonitoring();
    }

    if (this.enableMemoryMonitor && (performance as unknown as { memory: MemoryInfo }).memory) {
      this.memoryMonitorId = setInterval(() => {
        this._collectMemoryMetrics();
      }, this.sampleInterval);
    }
  }

  stopMonitoring(): void {
    if (!this.isMonitoring) return;

    this.isMonitoring = false;

    if (this.fpsMonitorId) {
      cancelAnimationFrame(this.fpsMonitorId);
      this.fpsMonitorId = null;
    }

    if (this.memoryMonitorId) {
      clearInterval(this.memoryMonitorId);
      this.memoryMonitorId = null;
    }
  }

  private _startFpsMonitoring(): void {
    if (!this.isMonitoring) return;

    this.fpsMonitorId = requestAnimationFrame((currentTime) => {
      this.frameCount++;
      const deltaTime = currentTime - this.lastTime;

      if (deltaTime >= 1000) {
        const fps = Math.round((this.frameCount * 1000) / deltaTime);
        this._recordFps(fps);

        this.frameCount = 0;
        this.lastTime = currentTime;
      }

      this._startFpsMonitoring();
    });
  }

  private _recordFps(fps: number): void {
    this.fpsHistory.push(fps);
    if (this.fpsHistory.length > this.maxFpsHistory) {
      this.fpsHistory.shift();
    }

    this.metrics.fps.push({
      timestamp: Date.now(),
      value: fps
    });
  }

  private _collectMemoryMetrics(): void {
    const memory = (performance as unknown as { memory: MemoryInfo }).memory;
    if (!memory) return;

    const memoryInfo: MemoryRecord = {
      timestamp: Date.now(),
      usedJSHeapSize: memory.usedJSHeapSize,
      totalJSHeapSize: memory.totalJSHeapSize,
      jsHeapSizeLimit: memory.jsHeapSizeLimit
    };

    this.metrics.memory.push(memoryInfo);
  }

  measureExecutionTime<T>(id: string, fn: () => T): T {
    const startTime = performance.now();

    try {
      const result = fn();
      const duration = performance.now() - startTime;

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

  startRenderMeasurement(): () => number {
    const startTime = performance.now();

    return (): number => {
      const duration = performance.now() - startTime;
      this.metrics.renderTimes.push({
        timestamp: Date.now(),
        duration
      });
      return duration;
    };
  }

  getCurrentFps(): number {
    if (this.fpsHistory.length === 0) return 0;
    return this.fpsHistory[this.fpsHistory.length - 1];
  }

  getAverageFps(samples: number = 10): number {
    if (this.fpsHistory.length === 0) return 0;

    const recentSamples = this.fpsHistory.slice(-samples);
    const sum = recentSamples.reduce((acc, fps) => acc + fps, 0);
    return Math.round(sum / recentSamples.length);
  }

  getMemoryInfo(): MemoryInfo | null {
    const memory = (performance as unknown as { memory: MemoryInfo }).memory;
    if (!memory) return null;

    return {
      usedJSHeapSize: memory.usedJSHeapSize,
      totalJSHeapSize: memory.totalJSHeapSize,
      jsHeapSizeLimit: memory.jsHeapSizeLimit,
      usedPercent: Math.round((memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100)
    };
  }

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

  clearMetrics(): void {
    this.metrics = {
      fps: [],
      memory: [],
      executionTimes: {},
      renderTimes: []
    };
    this.fpsHistory = [];
  }

  exportReport(): string {
    return JSON.stringify(this.getMetrics(), null, 2);
  }

  checkPerformanceHealth(): PerformanceHealth {
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

  watchPerformance(callback: (health: PerformanceHealth) => void): WatchResult {
    const checkInterval = setInterval(() => {
      const health = this.checkPerformanceHealth();
      if (!health.isHealthy) {
        callback(health);
      }
    }, 5000);

    return {
      stop: () => clearInterval(checkInterval)
    };
  }
}

const defaultPerformanceMonitor = new PerformanceMonitor();

export { PerformanceMonitor };
export default defaultPerformanceMonitor;

import { getElement, getElements, findElementsByStructure } from './dom.js';
import logger from './logger.js';

interface ButtonDetectorOptions {
  buttonTexts?: string[];
  cssSelectors?: string[];
  enableLogging?: boolean;
}

export class ButtonDetector {
  private options: ButtonDetectorOptions;

  constructor(options: ButtonDetectorOptions = {}) {
    this.options = {
      buttonTexts: ['Continue', 'Run', 'Execute', 'Next', 'Proceed', 'Start', '继续', '运行', '执行', '下一步', '开始'],
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
      enableLogging: true,
      ...options
    };
  }

  detect(options: { detectionStrategies?: string[] } = {}): HTMLElement | null {
    const detectionStrategies = options.detectionStrategies || ['text', 'css', 'structure'];
    let button: HTMLElement | null = null;

    for (const strategy of detectionStrategies) {
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
            logger.warn(`ButtonDetector unknown detection strategy: ${strategy}`);
          }
      }

      if (button) {
        if (this.options.enableLogging) {
          logger.info(`ButtonDetector detected button using ${strategy} strategy`);
        }
        break;
      }
    }

    return button;
  }

  private detectByText(): HTMLElement | null {
    const allElements = document.getElementsByTagName('*');

    for (const element of allElements) {
      const text = element.textContent || element.innerText || '';
      const trimmedText = text.trim();

      if (this.options.buttonTexts?.includes(trimmedText)) {
        if (this.isClickableElement(element as HTMLElement)) {
          return element as HTMLElement;
        }

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

  private detectByCSS(): HTMLElement | null {
    for (const selector of this.options.cssSelectors || []) {
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

  private detectByStructure(): HTMLElement | null {
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
        const text = element.textContent || element.innerText || '';
        const trimmedText = text.trim();
        if (this.options.buttonTexts?.includes(trimmedText)) {
          return element;
        }
      }
    }

    return null;
  }

  private detectByXPath(): HTMLElement | null {
    try {
      for (const text of this.options.buttonTexts || []) {
        const xpath = `//*[text()='${text}' or contains(text(),'${text}')]`;
        const result = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
        const element = result.singleNodeValue;

        if (element) {
          return element as HTMLElement;
        }
      }
    } catch (error) {
      if (this.options.enableLogging) {
        logger.error('ButtonDetector XPath detection failed:', error);
      }
    }

    return null;
  }

  private detectByAccessibility(): HTMLElement | null {
    const accessibilityAttributes = ['aria-label', 'aria-labelledby', 'title', 'alt'];
    const allElements = document.getElementsByTagName('*');

    for (const element of allElements) {
      for (const attr of accessibilityAttributes) {
        const value = element.getAttribute(attr);
        if (value) {
          for (const text of this.options.buttonTexts || []) {
            if (value.includes(text)) {
              return element as HTMLElement;
            }
          }
        }
      }
    }

    return null;
  }

  private isClickableElement(element: HTMLElement): boolean {
    const clickableTags = ['button', 'input', 'a', 'div', 'span'];
    const clickableRoles = ['button', 'link', 'submit'];

    if (clickableTags.includes(element.tagName.toLowerCase())) {
      const role = element.getAttribute('role');
      if (!role || clickableRoles.includes(role)) {
        return true;
      }
    }

    return false;
  }
}

export default new ButtonDetector();

import { debounce } from './dom.js';
import logger from './logger.js';
import type UIManager from '../ui_manager.js';

let mutationObserver: MutationObserver | null = null;

export function isVideoPage(): boolean {
  return location.pathname.includes('/video/') ||
         location.pathname === '/' ||
         location.pathname.includes('/user/');
}

export function isLivePage(): boolean {
  return location.pathname.includes('/live/');
}

export function observePageChanges(uiManager: UIManager): void {
  logger.info('开始监听页面变化...');

  const debouncedApplyCustomizations = debounce(() => {
    logger.info('应用UI定制...');
    if (isVideoPage()) {
      logger.info('检测到短视频页面，应用视频定制');
      uiManager.applyVideoCustomizations();
    }
    if (isLivePage()) {
      logger.info('检测到直播间页面，应用直播定制');
      uiManager.applyLiveCustomizations();
    }
  }, 300);

  mutationObserver = new MutationObserver((mutations) => {
    let hasSignificantChange = false;

    for (const mutation of mutations) {
      if (mutation.addedNodes.length > 0) {
        const addedElements = Array.from(mutation.addedNodes).filter(node => node.nodeType === 1);
        for (const element of addedElements) {
          const el = element as HTMLElement;
          if (el.querySelector('[class*="video"],[class*="content"],[class*="main"],[id*="video"]') ||
              el.className && (el.className.includes('video') ||
                               el.className.includes('content') ||
                               el.className.includes('main'))) {
            hasSignificantChange = true;
            break;
          }
        }
      }

      if (hasSignificantChange) break;
    }

    if (hasSignificantChange) {
      debouncedApplyCustomizations();
    }
  });

  mutationObserver.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    characterData: true
  });

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

export function stopObserving(): void {
  if (mutationObserver) {
    mutationObserver.disconnect();
    mutationObserver = null;
  }
}

export function getMutationObserver(): MutationObserver | null {
  return mutationObserver;
}

import { injectStyle } from './dom.js';
import logger from './logger.js';
import eventEmitter from './eventEmitter.js';
import type { Config } from '../config.js';

export function generateCustomStyles(config: Config): string {
  let customCSS = '';

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

  if (config.videoUI) {
    if (!config.videoUI.showLikeButton) {
      customCSS += '.like-button { display: none !important; }';
    }
    if (!config.videoUI.showCommentButton) {
      customCSS += '.comment-button { display: none !important; }';
    }
    if (!config.videoUI.showShareButton) {
      customCSS += '.share-button { display: none !important; }';
    }
    if (!config.videoUI.showAuthorInfo) {
      customCSS += '.author-info { display: none !important; }';
    }
    if (!config.videoUI.showMusicInfo) {
      customCSS += '.music-info, .music-label, .sound-info { display: none !important; }';
    }
    if (!config.videoUI.showDescription) {
      customCSS += '.video-desc, .description, .video-content { display: none !important; }';
    }
  }

  if (config.liveUI) {
    if (!config.liveUI.showGifts) {
      customCSS += `
        .gift-animation, .gift-container, .gift-effect, .gift-display,
        .present-animation, .reward-container, .award-animation,
        .animation-container, .live-gift, .live-gift-animation,
        [class*="gift"], [class*="present"], [class*="reward"],
        [class*="award"], [class*="effect"], [class*="animation"],
        [class*="特效"], [class*="礼物"], [class*="打赏"],
        [class*="连击"], [class*="豪华礼物"], [class*="礼物特效"],
        .gift-panel, .gift-button, .send-gift-button,
        [style*="animation:"], [style*="transition:"],
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
    if (!config.liveUI.showRecommendations) {
      customCSS += '.live-recommendations, .live-ads { display: none !important; }';
    }
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

export async function injectStyles(themeManager: { applyTheme: (theme: string) => Promise<boolean> }, config: Config): Promise<void> {
  try {
    const success = await themeManager.applyTheme(config.theme);
    if (!success) {
      logger.warn('主题应用失败，使用备用样式注入');

      const oldStyle = document.getElementById('douyin-ui-customizer-styles');
      if (oldStyle) {
        oldStyle.remove();
      }

      const styleElement = document.createElement('style');
      styleElement.id = 'douyin-ui-customizer-styles';
      styleElement.textContent = '';
      document.head.appendChild(styleElement);
    }

    const customStyle = document.createElement('style');
    customStyle.id = 'douyin-ui-customizer-custom';
    customStyle.textContent = generateCustomStyles(config);
    document.head.appendChild(customStyle);

    eventEmitter.emit('tool.styles.updated', { theme: config.theme });
  } catch (error) {
    logger.error('注入样式失败:', error);
  }
}

export function injectBasicStyles(): void {
  const basicStyles = `
    .douyin-ui-customizer-panel {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
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
  injectStyle(basicStyles);
}

import { logger } from '../utils/logger.ts';
import { getElement, getElements } from '../utils/dom.ts';

interface ElementInfo {
  id: string;
  selector: string;
  type: string;
  description: string;
}

interface OriginalStyle {
  [key: string]: string;
}

class ElementController {
  private originalStyles: WeakMap<HTMLElement, OriginalStyle>;
  private elementVisibility: WeakMap<HTMLElement, boolean>;

  constructor() {
    this.originalStyles = new WeakMap();
    this.elementVisibility = new WeakMap();
    logger.info('ElementController 初始化成功');
  }

  async hideElement(selector: string | HTMLElement): Promise<boolean> {
    try {
      const elements = this._resolveElements(selector);
      
      if (elements.length === 0) {
        logger.warn(`没有找到匹配的元素: ${selector}`);
        return false;
      }

      for (const element of elements) {
        this._saveOriginalStyle(element);
        
        element.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        element.style.opacity = '0';
        element.style.transform = 'translateY(-10px)';
        element.style.pointerEvents = 'none';
        
        this.elementVisibility.set(element, false);
      }

      await new Promise(resolve => setTimeout(resolve, 300));
      
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

  async showElement(selector: string | HTMLElement): Promise<boolean> {
    try {
      const elements = this._resolveElements(selector);
      
      if (elements.length === 0) {
        logger.warn(`没有找到匹配的元素: ${selector}`);
        return false;
      }

      for (const element of elements) {
        element.style.display = '';
        
        element.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        element.style.opacity = '0';
        element.style.transform = 'translateY(-10px)';
      }

      await new Promise(resolve => setTimeout(resolve, 10));
      
      for (const element of elements) {
        element.style.opacity = '1';
        element.style.transform = 'translateY(0)';
        element.style.pointerEvents = '';
        
        this.elementVisibility.set(element, true);
      }

      await new Promise(resolve => setTimeout(resolve, 300));
      
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

  async toggleElement(selector: string | HTMLElement): Promise<boolean> {
    try {
      const elements = this._resolveElements(selector);
      
      if (elements.length === 0) {
        logger.warn(`没有找到匹配的元素: ${selector}`);
        return false;
      }

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

  modifyElementStyle(selector: string | HTMLElement, styles: Record<string, string>): boolean {
    try {
      const elements = this._resolveElements(selector);
      
      if (elements.length === 0) {
        logger.warn(`没有找到匹配的元素: ${selector}`);
        return false;
      }

      for (const element of elements) {
        if (!this.originalStyles.has(element)) {
          this._saveOriginalStyle(element);
        }

        Object.assign(element.style, styles);
      }

      logger.info(`成功修改 ${elements.length} 个元素的样式`);
      return true;
    } catch (error) {
      logger.error(`修改元素样式失败:`, error);
      return false;
    }
  }

  resetElementStyle(selector: string | HTMLElement): boolean {
    try {
      const elements = this._resolveElements(selector);
      
      if (elements.length === 0) {
        logger.warn(`没有找到匹配的元素: ${selector}`);
        return false;
      }

      for (const element of elements) {
        if (this.originalStyles.has(element)) {
          const originalStyle = this.originalStyles.get(element);
          
          element.removeAttribute('style');
          
          if (originalStyle) {
            Object.assign(element.style, originalStyle);
          }
          
          this.originalStyles.delete(element);
          this.elementVisibility.delete(element);
        } else {
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

  identifyElements(): ElementInfo[] {
    try {
      const elements: ElementInfo[] = [];
      let elementId = 1;

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

  private _resolveElements(selector: string | HTMLElement): HTMLElement[] {
    if (!selector) {
      return [];
    }

    if (typeof selector === 'string') {
      return getElements(selector);
    } else if (selector.nodeType === 1) {
      return [selector];
    }

    return [];
  }

  private _saveOriginalStyle(element: HTMLElement): void {
    if (!this.originalStyles.has(element)) {
      const originalStyle: OriginalStyle = {};
      
      const importantProperties = ['display', 'opacity', 'transform', 'pointer-events'];
      importantProperties.forEach(prop => {
        originalStyle[prop] = element.style[prop];
      });
      
      this.originalStyles.set(element, originalStyle);
    }
  }

  private _generateSelector(element: HTMLElement): string {
    if (!element) return '';

    if (element.id) {
      return `#${element.id}`;
    }

    const specificClasses = Array.from(element.classList).filter(cls => 
      /^(btn|input|card|panel|container|video)/i.test(cls)
    );
    if (specificClasses.length > 0) {
      return `.${specificClasses[0]}`;
    }

    const tagName = element.tagName.toLowerCase();
    const siblings = element.parentNode ? Array.from(element.parentNode.children) : [];
    const index = siblings.indexOf(element);
    
    if (siblings.length > 1) {
      return `${tagName}:nth-child(${index + 1})`;
    }

    return tagName;
  }

  private _getElementLabel(element: HTMLElement): string | null {
    const id = element.id;
    if (id) {
      const label = getElement(`label[for="${id}"]`);
      if (label) return label.textContent.trim();
    }

    if (element.closest('label')) {
      return element.closest('label')!.textContent.trim();
    }

    return element.getAttribute('placeholder') || element.getAttribute('name') || null;
  }
}

const elementController = new ElementController();

export { ElementController };
export default elementController;

import { logger } from '../utils/logger.ts';
import { getElement, getElements, createElement } from '../utils/dom.ts';
import elementController from './elementController.js';

interface LayoutRule {
  selector: string;
  action?: 'hide';
  styles?: Record<string, string>;
}

interface Layout {
  name: string;
  label: string;
  description: string;
  rules: LayoutRule[];
  isCustom?: boolean;
  createdAt?: string;
  importedAt?: string;
}

const PREDEFINED_LAYOUTS: Record<string, Layout> = {
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

class LayoutController {
  private layouts: Record<string, Layout>;
  private currentLayout: string | null;
  private customLayouts: Record<string, Layout>;
  private layoutPrefix: string;

  constructor() {
    this.layouts = { ...PREDEFINED_LAYOUTS };
    this.currentLayout = null;
    this.customLayouts = {};
    this.layoutPrefix = 'douyin_ui_customizer_layout_';
    
    this._loadCustomLayouts();
    
    logger.info('LayoutController 初始化成功');
  }

  async applyLayout(layoutName: string): Promise<boolean> {
    try {
      const layout = this.layouts[layoutName];
      if (!layout) {
        logger.warn(`布局 ${layoutName} 不存在`);
        return false;
      }

      logger.info(`开始应用布局: ${layout.label}`);

      await this.resetLayout();

      for (const rule of layout.rules) {
        if (rule.action === 'hide') {
          await elementController.hideElement(rule.selector);
        } else if (rule.styles) {
          elementController.modifyElementStyle(rule.selector, rule.styles);
        }
      }

      this.currentLayout = layoutName;
      
      localStorage.setItem(`${this.layoutPrefix}current`, layoutName);
      
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

  saveLayout(layoutName: string, layoutConfig: Partial<Layout>): boolean {
    try {
      if (!layoutName || typeof layoutName !== 'string' || layoutName.trim() === '') {
        throw new Error('布局名称不能为空');
      }

      if (!layoutConfig || typeof layoutConfig !== 'object') {
        throw new Error('布局配置必须是有效的对象');
      }

      if (PREDEFINED_LAYOUTS[layoutName]) {
        throw new Error('不能覆盖预定义布局');
      }

      const layout: Layout = {
        name: layoutName,
        label: layoutConfig.label || layoutName,
        description: layoutConfig.description || '自定义布局',
        rules: layoutConfig.rules || [],
        isCustom: true,
        createdAt: new Date().toISOString()
      };

      this.layouts[layoutName] = layout;
      this.customLayouts[layoutName] = layout;
      
      this._saveCustomLayouts();

      logger.info(`自定义布局保存成功: ${layout.label}`);
      return true;
    } catch (error) {
      logger.error(`保存布局失败:`, error);
      return false;
    }
  }

  getAvailableLayouts(): Layout[] {
    return Object.values(this.layouts);
  }

  getCurrentLayout(): string | null {
    return this.currentLayout;
  }

  async resetLayout(): Promise<boolean> {
    try {
      Object.keys(this.layouts).forEach(layoutName => {
        document.body.classList.remove(`douyin-ui-customizer-layout-${layoutName}`);
      });

      const allSelectors = new Set<string>();
      Object.values(this.layouts).forEach(layout => {
        layout.rules.forEach(rule => {
          if (rule.selector) {
            rule.selector.split(',').forEach(selector => {
              allSelectors.add(selector.trim());
            });
          }
        });
      });

      for (const selector of allSelectors) {
        await elementController.showElement(selector);
        elementController.resetElementStyle(selector);
      }

      this.currentLayout = null;
      localStorage.removeItem(`${this.layoutPrefix}current`);

      logger.info('布局已重置');
      return true;
    } catch (error) {
      logger.error('重置布局失败:', error);
      return false;
    }
  }

  deleteLayout(layoutName: string): boolean {
    try {
      if (PREDEFINED_LAYOUTS[layoutName]) {
        logger.warn(`不能删除预定义布局: ${layoutName}`);
        return false;
      }

      if (!this.customLayouts[layoutName]) {
        logger.warn(`自定义布局不存在: ${layoutName}`);
        return false;
      }

      if (this.currentLayout === layoutName) {
        this.resetLayout();
      }

      delete this.layouts[layoutName];
      delete this.customLayouts[layoutName];
      
      this._saveCustomLayouts();

      logger.info(`布局删除成功: ${layoutName}`);
      return true;
    } catch (error) {
      logger.error(`删除布局失败:`, error);
      return false;
    }
  }

  exportLayout(layoutName: string): string | null {
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

  importLayout(layoutJson: string): boolean {
    try {
      const layout = JSON.parse(layoutJson) as Layout;
      
      if (!layout.name || !layout.rules || !Array.isArray(layout.rules)) {
        throw new Error('无效的布局配置格式');
      }

      layout.isCustom = true;
      layout.importedAt = new Date().toISOString();

      this.layouts[layout.name] = layout;
      this.customLayouts[layout.name] = layout;
      
      this._saveCustomLayouts();

      logger.info(`布局导入成功: ${layout.label || layout.name}`);
      return true;
    } catch (error) {
      logger.error(`导入布局失败:`, error);
      return false;
    }
  }

  private _loadCustomLayouts(): void {
    try {
      const savedLayouts = localStorage.getItem(`${this.layoutPrefix}custom`);
      if (savedLayouts) {
        const layouts = JSON.parse(savedLayouts) as Record<string, Layout>;
        
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

  private _saveCustomLayouts(): void {
    try {
      localStorage.setItem(`${this.layoutPrefix}custom`, JSON.stringify(this.customLayouts));
    } catch (error) {
      logger.error('保存自定义布局失败:', error);
    }
  }
}

const layoutController = new LayoutController();

export { LayoutController };
export default layoutController;

export { ThemeManager } from './theme.js';
export { default as themeManager } from './theme.js';

export const styles = {
  ThemeManager,
  themeManager
};

export default styles;

import logger from '../utils/logger.ts';
import { injectStyle } from '../utils/dom.ts';

interface ThemeVariables {
  [key: string]: string;
}

interface Theme {
  name: string;
  label: string;
  variables: ThemeVariables;
}

const DEFAULT_THEMES: Record<string, Theme> = {
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

interface ThemeConfig {
  name: string;
  label: string;
  colors?: Record<string, string>;
  fonts?: Record<string, string>;
}

class ThemeManager {
  private themes: Record<string, Theme>;
  private currentTheme: string | null;
  private styleElement: HTMLStyleElement | null;
  private themePrefix: string;

  constructor() {
    this.themes = { ...DEFAULT_THEMES };
    this.currentTheme = null;
    this.styleElement = null;
    this.themePrefix = 'douyin_ui_customizer_theme_';
  }

  init(): void {
    try {
      const savedTheme = localStorage.getItem(`${this.themePrefix}current`);
      
      if (savedTheme && this.themes[savedTheme]) {
        this.switchTheme(savedTheme);
      } else {
        this.switchTheme('light');
      }
      
      logger.info('主题管理器初始化成功');
    } catch (error) {
      logger.error('主题管理器初始化失败:', error);
      this.switchTheme('light');
    }
  }

  switchTheme(themeName: string): boolean {
    try {
      if (!this.themes[themeName]) {
        logger.warn(`主题 ${themeName} 不存在，使用默认主题`);
        themeName = 'light';
      }

      const theme = this.themes[themeName];
      
      const cssVariables = Object.entries(theme.variables)
        .map(([key, value]) => `${key}: ${value};`)
        .join('\n  ');
      
      const css = `:root {
  ${cssVariables}
}

.douyin-ui-customizer-theme-${themeName} {}
`;
      
      if (this.styleElement && this.styleElement.parentNode) {
        this.styleElement.parentNode.removeChild(this.styleElement);
      }
      
      this.styleElement = injectStyle(css);
      
      this.currentTheme = themeName;
      
      localStorage.setItem(`${this.themePrefix}current`, themeName);
      
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

  getCurrentTheme(): string {
    return this.currentTheme || 'light';
  }

  getAvailableThemes(): Theme[] {
    return Object.values(this.themes);
  }

  createTheme(themeConfig: ThemeConfig): string | null {
    try {
      if (!themeConfig.name || !themeConfig.label) {
        throw new Error('主题配置必须包含name和label属性');
      }

      const variables: ThemeVariables = {};
      
      if (themeConfig.colors) {
        Object.entries(themeConfig.colors).forEach(([key, value]) => {
          variables[`--${key}`] = value;
        });
      }
      
      if (themeConfig.fonts) {
        Object.entries(themeConfig.fonts).forEach(([key, value]) => {
          variables[`--font-${key}`] = value;
        });
      }

      const theme: Theme = {
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

  deleteTheme(themeName: string): boolean {
    try {
      if (DEFAULT_THEMES[themeName]) {
        logger.warn(`不能删除默认主题: ${themeName}`);
        return false;
      }

      if (!this.themes[themeName]) {
        logger.warn(`主题不存在: ${themeName}`);
        return false;
      }

      if (this.currentTheme === themeName) {
        this.switchTheme('light');
      }

      delete this.themes[themeName];
      logger.info(`主题删除成功: ${themeName}`);
      return true;
    } catch (error) {
      logger.error(`删除主题失败 (${themeName}):`, error);
      return false;
    }
  }

  getTheme(themeName: string): Theme | null {
    return this.themes[themeName] || null;
  }

  registerTheme(theme: Theme): boolean {
    try {
      if (!theme.name || !theme.variables) {
        throw new Error('主题配置必须包含name和variables属性');
      }
      
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

  exportTheme(themeName: string): string | null {
    try {
      const theme = this.themes[themeName];
      if (!theme) return null;
      
      return JSON.stringify(theme, null, 2);
    } catch (error) {
      logger.error(`主题导出失败 (${themeName}):`, error);
      return null;
    }
  }

  importTheme(themeJson: string): boolean {
    try {
      const theme = JSON.parse(themeJson) as Theme;
      return this.registerTheme(theme);
    } catch (error) {
      logger.error('主题导入失败:', error);
      return false;
    }
  }

  generatePreviewStyle(themeName: string): string | null {
    const theme = this.themes[themeName];
    if (!theme) return null;
    
    return Object.entries(theme.variables)
      .map(([key, value]) => `${key}: ${value}`)
      .join('; ');
  }

  applyThemeToElement(element: HTMLElement, themeName: string): void {
    try {
      const theme = this.themes[themeName];
      if (!theme || !element) return;
      
      Object.entries(theme.variables).forEach(([key, value]) => {
        element.style.setProperty(key, value);
      });
      
      element.classList.remove(
        ...Object.keys(this.themes).map(t => `douyin-ui-customizer-theme-${t}`)
      );
      element.classList.add(`douyin-ui-customizer-theme-${themeName}`);
    } catch (error) {
      logger.error(`应用主题到元素失败:`, error);
    }
  }

  reset(): void {
    try {
      if (this.styleElement && this.styleElement.parentNode) {
        this.styleElement.parentNode.removeChild(this.styleElement);
      }
      
      Object.keys(this.themes).forEach(themeName => {
        document.body.classList.remove(`douyin-ui-customizer-theme-${themeName}`);
      });
      
      this.themes = { ...DEFAULT_THEMES };
      this.currentTheme = null;
      this.styleElement = null;
      
      localStorage.removeItem(`${this.themePrefix}current`);
      
      this.init();
      
      logger.info('主题设置已重置');
    } catch (error) {
      logger.error('重置主题设置失败:', error);
    }
  }

  on(event: string, callback: (data: unknown) => void): void {
    if (event === 'themeChanged') {
      const originalSwitchTheme = this.switchTheme.bind(this);
      this.switchTheme = (themeName: string): boolean => {
        const result = originalSwitchTheme(themeName);
        if (result) {
          callback(themeName);
        }
        return result;
      };
    }
  }

  applyTheme(themeName: string): Promise<boolean> {
    return Promise.resolve(this.switchTheme(themeName));
  }

  listThemes(): Theme[] {
    return this.getAvailableThemes();
  }
}

const themeManager = new ThemeManager();

export { ThemeManager };
export default themeManager;

export * from './panels/settingsPanel.ts';
export * from './panels/settingsEvents.ts';
export * from './core/panelDrag.ts';
export * from './customizations/videoCustomizations.ts';
export * from './customizations/liveCustomizations.ts';

export function makePanelDraggable(panel: HTMLElement): void {
  if (!panel) return;
  const header = panel.querySelector('.panel-header');
  if (!header) return;

  panel.style.transform = 'none';
  let isDragging = false;
  let offsetX: number, offsetY: number;

  header.addEventListener('mousedown', (e: MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;

    isDragging = true;
    const rect = panel.getBoundingClientRect();
    offsetX = e.clientX - rect.left;
    offsetY = e.clientY - rect.top;

    panel.classList.add('dragging');
    e.preventDefault();
  });

  document.addEventListener('mousemove', (e: MouseEvent) => {
    if (!isDragging) return;

    let newLeft = e.clientX - offsetX;
    let newTop = e.clientY - offsetY;

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const panelWidth = panel.offsetWidth;
    const panelHeight = panel.offsetHeight;

    newLeft = Math.max(0, Math.min(newLeft, viewportWidth - panelWidth));
    newTop = Math.max(0, Math.min(newTop, viewportHeight - panelHeight));

    panel.style.left = newLeft + 'px';
    panel.style.top = newTop + 'px';
  });

  document.addEventListener('mouseup', () => {
    if (!isDragging) return;
    isDragging = false;
    panel.classList.remove('dragging');
    restrictPanelToViewport(panel);
  });

  header.addEventListener('touchstart', (e: TouchEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    isDragging = true;
    const touch = e.touches[0];
    const rect = panel.getBoundingClientRect();
    offsetX = touch.clientX - rect.left;
    offsetY = touch.clientY - rect.top;

    panel.classList.add('dragging');
    e.preventDefault();
  }, { passive: false });

  document.addEventListener('touchmove', (e: TouchEvent) => {
    if (!isDragging) return;
    const touch = e.touches[0];
    let newLeft = touch.clientX - offsetX;
    let newTop = touch.clientY - offsetY;

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const panelWidth = panel.offsetWidth;
    const panelHeight = panel.offsetHeight;

    newLeft = Math.max(0, Math.min(newLeft, viewportWidth - panelWidth));
    newTop = Math.max(0, Math.min(newTop, viewportHeight - panelHeight));

    panel.style.left = newLeft + 'px';
    panel.style.top = newTop + 'px';
  }, { passive: false });

  document.addEventListener('touchend', () => {
    if (!isDragging) return;
    isDragging = false;
    panel.classList.remove('dragging');
    restrictPanelToViewport(panel);
  });
}

export function restrictPanelToViewport(panel: HTMLElement): void {
  if (!panel) return;

  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const rect = panel.getBoundingClientRect();
  const panelWidth = rect.width;
  const panelHeight = rect.height;

  let left = rect.left;
  let top = rect.top;

  if (left < 0) {
    left = 0;
  } else if (left + panelWidth > viewportWidth) {
    left = viewportWidth - panelWidth;
  }

  if (top < 0) {
    top = 0;
  } else if (top + panelHeight > viewportHeight) {
    top = viewportHeight - panelHeight;
  }

  panel.style.left = left + 'px';
  panel.style.top = top + 'px';
}

import { createElement, injectStyle } from '../../utils/dom.ts';
import logger from '../../utils/logger.ts';
import type { Config } from '../../config.js';

export function createSettingsPanelContent(config: Config): string {
  return `
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
        ${createGeneralSettings(config)}
      </div>
      
      <div class="tab-content" id="video-tab">
        ${createVideoSettings(config)}
      </div>
      
      <div class="tab-content" id="live-tab">
        ${createLiveSettings(config)}
      </div>
      
      <div class="tab-content" id="auto-executor-tab">
        ${createAutoExecutorSettings()}
      </div>
      
      <div class="tab-content" id="import-export-tab">
        ${createImportExportSettings()}
      </div>
      
      <div class="tab-content" id="advanced-tab">
        ${createAdvancedSettings(config)}
      </div>
    </div>
    <div class="panel-footer">
      <div>
        <button class="save-btn">保存设置</button>
        <button class="reset-btn">重置为默认</button>
      </div>
    </div>
  `;
}

export function createGeneralSettings(config: Config): string {
  return `
    <div class="setting-group">
      <h3>主题设置</h3>
      <label>
        <input type="radio" name="theme" value="light" ${config.theme === 'light' ? 'checked' : ''} />
        浅色主题
      </label>
      <label>
        <input type="radio" name="theme" value="dark" ${config.theme === 'dark' ? 'checked' : ''} />
        深色主题
      </label>
    </div>
    
    <div class="setting-group">
      <h3>播放设置</h3>
      <label>
        <input type="checkbox" id="autoPlay" ${config.general?.autoPlay ? 'checked' : ''} />
        自动播放视频
      </label>
      <label>
        <input type="checkbox" id="autoScroll" ${config.general?.autoScroll ? 'checked' : ''} />
        自动滚动到下一个视频
      </label>
    </div>
    
    <div class="setting-group">
      <h3>功能设置</h3>
      <label>
        <input type="checkbox" id="keyboardShortcuts" ${config.general?.keyboardShortcuts ? 'checked' : ''} />
        启用键盘快捷键
      </label>
      <label>
        <input type="checkbox" id="notifications" ${config.general?.notifications ? 'checked' : ''} />
        启用通知提醒
      </label>
    </div>
  `;
}

export function createVideoSettings(config: Config): string {
  return `
    <div class="setting-group">
      <h3>显示元素</h3>
      <label>
        <input type="checkbox" id="showLikeButton" ${config.videoUI?.showLikeButton ?? true ? 'checked' : ''} />
        显示点赞按钮
      </label>
      <label>
        <input type="checkbox" id="showCommentButton" ${config.videoUI?.showCommentButton ?? true ? 'checked' : ''} />
        显示评论按钮
      </label>
      <label>
        <input type="checkbox" id="showShareButton" ${config.videoUI?.showShareButton ?? true ? 'checked' : ''} />
        显示分享按钮
      </label>
      <label>
        <input type="checkbox" id="showAuthorInfo" ${config.videoUI?.showAuthorInfo ?? true ? 'checked' : ''} />
        显示作者信息
      </label>
      <label>
        <input type="checkbox" id="showMusicInfo" ${config.videoUI?.showMusicInfo ?? true ? 'checked' : ''} />
        显示音乐信息
      </label>
      <label>
        <input type="checkbox" id="showDescription" ${config.videoUI?.showDescription ?? true ? 'checked' : ''} />
        显示视频描述
      </label>
      <label>
        <input type="checkbox" id="showRecommendations" ${config.videoUI?.showRecommendations ?? true ? 'checked' : ''} />
        显示推荐视频
      </label>
    </div>
    
    <div class="setting-group">
      <h3>控制栏设置</h3>
      <label>
        <input type="checkbox" id="controlBar-show" ${config.videoUI?.controlBar?.show ?? true ? 'checked' : ''} />
        显示控制栏
      </label>
      <label>
        <input type="checkbox" id="controlBar-autoHide" ${config.videoUI?.controlBar?.autoHide ?? true ? 'checked' : ''} />
        自动隐藏控制栏
      </label>
      <label>
        <select id="controlBar-position">
          <option value="bottom" ${config.videoUI?.controlBar?.position === 'bottom' ? 'selected' : ''}>底部</option>
          <option value="top" ${config.videoUI?.controlBar?.position === 'top' ? 'selected' : ''}>顶部</option>
        </select>
        控制栏位置
      </label>
      <label>
        <select id="controlBar-size">
          <option value="small" ${config.videoUI?.controlBar?.size === 'small' ? 'selected' : ''}>小</option>
          <option value="medium" ${config.videoUI?.controlBar?.size === 'medium' ? 'selected' : ''}>中</option>
          <option value="large" ${config.videoUI?.controlBar?.size === 'large' ? 'selected' : ''}>大</option>
        </select>
        控制栏大小
      </label>
      <label>
        <input type="range" id="controlBar-opacity" min="0.1" max="1" step="0.1" value="${config.videoUI?.controlBar?.opacity ?? 0.9}" />
        控制栏透明度: <span id="controlBar-opacity-value">${(config.videoUI?.controlBar?.opacity ?? 0.9) * 100}%</span>
      </label>
    </div>
    
    <div class="setting-group">
      <h3>播放设置</h3>
      <label>
        <select id="playback-defaultQuality">
          <option value="auto" ${config.videoUI?.playback?.defaultQuality === 'auto' ? 'selected' : ''}>自动</option>
          <option value="low" ${config.videoUI?.playback?.defaultQuality === 'low' ? 'selected' : ''}>低画质</option>
          <option value="medium" ${config.videoUI?.playback?.defaultQuality === 'medium' ? 'selected' : ''}>中画质</option>
          <option value="high" ${config.videoUI?.playback?.defaultQuality === 'high' ? 'selected' : ''}>高画质</option>
          <option value="ultra" ${config.videoUI?.playback?.defaultQuality === 'ultra' ? 'selected' : ''}>超清</option>
        </select>
        默认画质
      </label>
      <label>
        <input type="checkbox" id="playback-autoPlay" ${config.videoUI?.playback?.autoPlay ?? true ? 'checked' : ''} />
        自动播放
      </label>
      <label>
        <input type="checkbox" id="playback-loop" ${config.videoUI?.playback?.loop ?? false ? 'checked' : ''} />
        循环播放
      </label>
    </div>
  `;
}

export function createLiveSettings(config: Config): string {
  return `
    <div class="setting-group">
      <h3>显示元素</h3>
      <label>
        <input type="checkbox" id="liveShowGifts" ${config.liveUI?.showGifts ?? true ? 'checked' : ''} />
        显示礼物
      </label>
      <label>
        <input type="checkbox" id="liveShowDanmaku" ${config.liveUI?.showDanmaku ?? true ? 'checked' : ''} />
        显示弹幕
      </label>
      <label>
        <input type="checkbox" id="liveShowRecommendations" ${config.liveUI?.showRecommendations ?? true ? 'checked' : ''} />
        显示推荐
      </label>
      <label>
        <input type="checkbox" id="liveShowAds" ${config.liveUI?.showAds ?? false ? 'checked' : ''} />
        显示广告
      </label>
      <label>
        <input type="checkbox" id="liveShowStats" ${config.liveUI?.showStats ?? true ? 'checked' : ''} />
        显示统计信息
      </label>
    </div>
    
    <div class="setting-group">
      <h3>弹幕设置</h3>
      <label>
        <input type="range" id="danmaku-fontSize" min="12" max="36" step="1" value="${config.liveUI?.danmaku?.fontSize ?? 16}" />
        弹幕字体大小: <span id="danmaku-fontSize-value">${config.liveUI?.danmaku?.fontSize ?? 16}px</span>
      </label>
      <label>
        <input type="color" id="danmaku-color" value="${config.liveUI?.danmaku?.color ?? '#FFFFFF'}" />
        弹幕颜色
      </label>
      <label>
        <input type="range" id="danmaku-opacity" min="0.1" max="1" step="0.1" value="${config.liveUI?.danmaku?.opacity ?? 0.8}" />
        弹幕透明度: <span id="danmaku-opacity-value">${(config.liveUI?.danmaku?.opacity ?? 0.8) * 100}%</span>
      </label>
      <label>
        <select id="danmaku-speed">
          <option value="fast" ${config.liveUI?.danmaku?.speed === 'fast' ? 'selected' : ''}>快</option>
          <option value="medium" ${config.liveUI?.danmaku?.speed === 'medium' ? 'selected' : ''}>中</option>
          <option value="slow" ${config.liveUI?.danmaku?.speed === 'slow' ? 'selected' : ''}>慢</option>
        </select>
        弹幕速度
      </label>
      <label>
        <select id="danmaku-position">
          <option value="top" ${config.liveUI?.danmaku?.position === 'top' ? 'selected' : ''}>顶部</option>
          <option value="middle" ${config.liveUI?.danmaku?.position === 'middle' ? 'selected' : ''}>中部</option>
          <option value="bottom" ${config.liveUI?.danmaku?.position === 'bottom' ? 'selected' : ''}>底部</option>
        </select>
        弹幕位置
      </label>
      <label>
        <input type="number" id="danmaku-maxLines" min="1" max="10" value="${config.liveUI?.danmaku?.maxLines ?? 5}" />
        最大弹幕行数
      </label>
    </div>
    
    <div class="setting-group">
      <h3>布局设置</h3>
      <label>
        <select id="live-layout">
          <option value="default" ${config.liveUI?.layout === 'default' ? 'selected' : ''}>默认</option>
          <option value="minimal" ${config.liveUI?.layout === 'minimal' ? 'selected' : ''}>极简</option>
          <option value="immersive" ${config.liveUI?.layout === 'immersive' ? 'selected' : ''}>沉浸</option>
        </select>
        布局类型
      </label>
    </div>
    
    <div class="setting-group">
      <h3>音量设置</h3>
      <label>
        <input type="range" id="live-volume" min="0" max="100" step="5" value="${config.liveUI?.volume ?? 100}" />
        音量: <span id="live-volume-value">${config.liveUI?.volume ?? 100}%</span>
      </label>
    </div>
  `;
}

export function createImportExportSettings(): string {
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

export function createAdvancedSettings(config: Config): string {
  return `
    <div class="setting-group">
      <h3>高级功能</h3>
      <label>
        <input type="checkbox" id="advanced-debugMode" ${config.advanced?.debugMode ?? false ? 'checked' : ''} />
        启用调试模式
      </label>
      <label>
        <input type="checkbox" id="advanced-performanceMode" ${config.advanced?.performanceMode ?? false ? 'checked' : ''} />
        启用性能模式
      </label>
    </div>
    
    <div class="setting-group">
      <h3>自定义CSS</h3>
      <textarea id="advanced-customCSS" placeholder="输入自定义CSS代码" rows="5" cols="40">${config.advanced?.customCSS ?? ''}</textarea>
      <small>注意：自定义CSS可能会影响页面性能</small>
    </div>
    
    <div class="setting-group">
      <h3>自定义脚本</h3>
      <div id="custom-scripts-list">
        ${(config.advanced?.customScripts ?? []).map((script, index) => `
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

export function createAutoExecutorSettings(): string {
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

export function injectPanelStyles(): void {
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
}

import logger from '../../utils/logger.ts';
import eventEmitter from '../../utils/eventEmitter.ts';
import type UIManager from '../../ui_manager.js';

export function setupSettingsPanelEvents(panel: HTMLElement, uiManager: UIManager): void {
  const closeBtn = panel.querySelector('.close-btn');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      panel.remove();
    });
  }

  const tabBtns = panel.querySelectorAll('.tab-btn');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabId = btn.getAttribute('data-tab');
      if (!tabId) return;

      tabBtns.forEach(b => b.classList.remove('active'));
      panel.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

      btn.classList.add('active');
      const tabContent = panel.querySelector(`#${tabId}-tab`);
      if (tabContent) {
        tabContent.classList.add('active');
      }
    });
  });

  const saveBtn = panel.querySelector('.save-btn');
  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      uiManager.saveSettings(panel);
    });
  }

  const resetBtn = panel.querySelector('.reset-btn');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      if (confirm('确定要重置所有设置吗？')) {
        if (typeof window.resetConfig === 'function') {
          uiManager.config = window.resetConfig();
        }
        panel.remove();
        location.reload();
      }
    });
  }

  initImportExport(panel, uiManager);
  setupAutoExecutorEvents(panel, uiManager);
}

function initImportExport(panel: HTMLElement, uiManager: UIManager): void {
  if (!panel) return;

  const exportBtn = panel.querySelector('#exportBtn');
  const exportConfig = panel.querySelector('#exportConfig') as HTMLTextAreaElement;
  const copyBtn = panel.querySelector('#copyBtn');

  if (exportBtn && exportConfig) {
    exportBtn.addEventListener('click', () => {
      try {
        import('../../config.ts').then(({ default: configManager }) => {
          const exportedConfig = configManager.exportConfig();
          exportConfig.value = exportedConfig;
        }).catch(error => {
          logger.error('导入配置管理模块失败:', error);
          exportConfig.value = JSON.stringify(uiManager.config, null, 2);
        });
      } catch (error) {
        logger.error('导出配置失败:', error);
        alert('导出配置失败');
      }
    });
  }

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

  const importBtn = panel.querySelector('#importBtn');
  const importConfig = panel.querySelector('#importConfig') as HTMLTextAreaElement;

  if (importBtn && importConfig) {
    importBtn.addEventListener('click', () => {
      try {
        import('../../config.ts').then(({ default: configManager }) => {
          const success = configManager.importConfig(importConfig.value);
          if (success) {
            uiManager.config = configManager.getConfig();
            alert('配置导入成功');
            location.reload();
          } else {
            alert('导入配置失败，请检查JSON格式');
          }
        }).catch(error => {
          logger.error('导入配置管理模块失败:', error);
          try {
            const newConfig = JSON.parse(importConfig.value);
            const configModule = require('../../config.ts');
            const configManager = configModule.default || configModule;
            if (configManager && typeof configManager.validateConfig === 'function') {
              const validationResult = configManager.validateConfig(newConfig);
              if (validationResult.valid) {
                uiManager.config = newConfig;
                uiManager.saveConfig();
                alert('配置导入成功');
                location.reload();
              } else {
                alert('配置格式验证失败: ' + validationResult.issues.join('\n'));
              }
            } else {
              uiManager.config = newConfig;
              uiManager.saveConfig();
              alert('配置导入成功（跳过验证）');
              location.reload();
            }
          } catch (parseError) {
            logger.error('JSON解析失败:', parseError);
            alert('JSON格式错误，请检查配置内容');
          }
        });
      } catch (error) {
        logger.error('导入配置失败:', error);
        alert('导入配置失败，请检查JSON格式');
      }
    });
  }
}

export function setupAutoExecutorEvents(panel: HTMLElement, uiManager: UIManager): void {
  const autoExecutorTab = panel.querySelector('#auto-executor-tab');
  if (!autoExecutorTab) return;

  const enableSwitch = autoExecutorTab.querySelector('#auto-executor-enable') as HTMLInputElement;
  if (enableSwitch) {
    enableSwitch.addEventListener('change', (e) => {
      uiManager.config.autoExecutorEnabled = (e.target as HTMLInputElement).checked;
      uiManager.saveConfig();
    });
  }

  const startBtn = autoExecutorTab.querySelector('#auto-executor-start');
  if (startBtn) {
    startBtn.addEventListener('click', () => {
      const intervalInput = autoExecutorTab.querySelector('#check-interval') as HTMLInputElement;
      const maxRetriesInput = autoExecutorTab.querySelector('#max-attempts') as HTMLInputElement;
      const enableLoggingInput = autoExecutorTab.querySelector('#enable-logging') as HTMLInputElement;
      const requireConfirmationInput = autoExecutorTab.querySelector('#require-confirmation') as HTMLInputElement;

      const interval = parseInt(intervalInput.value) || 5000;
      const maxRetries = parseInt(maxRetriesInput.value) || 3;
      const enableLogging = enableLoggingInput.checked;
      const requireConfirmation = requireConfirmationInput.checked;

      uiManager.config.autoExecutorConfig = {
        checkInterval: interval,
        maxRetries: maxRetries,
        enableLogging: enableLogging,
        requireConfirmation: requireConfirmation
      };
      uiManager.saveConfig();

      uiManager.autoExecutor.start(uiManager.config.autoExecutorConfig);
      updateAutoExecutorStatus(panel, uiManager.autoExecutor);
    });
  }

  const stopBtn = autoExecutorTab.querySelector('#auto-executor-stop');
  if (stopBtn) {
    stopBtn.addEventListener('click', () => {
      uiManager.autoExecutor.stop();
      updateAutoExecutorStatus(panel, uiManager.autoExecutor);
    });
  }

  const emergencyStopBtn = autoExecutorTab.querySelector('#auto-executor-emergency');
  if (emergencyStopBtn) {
    emergencyStopBtn.addEventListener('click', () => {
      uiManager.autoExecutor.emergencyStop();
      updateAutoExecutorStatus(panel, uiManager.autoExecutor);
    });
  }

  const configInputs = autoExecutorTab.querySelectorAll('.setting-item input');
  configInputs.forEach(input => {
    input.addEventListener('change', () => {
      const intervalInput = autoExecutorTab.querySelector('#check-interval') as HTMLInputElement;
      const maxRetriesInput = autoExecutorTab.querySelector('#max-attempts') as HTMLInputElement;
      const enableLoggingInput = autoExecutorTab.querySelector('#enable-logging') as HTMLInputElement;
      const requireConfirmationInput = autoExecutorTab.querySelector('#require-confirmation') as HTMLInputElement;

      const interval = parseInt(intervalInput.value) || 5000;
      const maxRetries = parseInt(maxRetriesInput.value) || 3;
      const enableLogging = enableLoggingInput.checked;
      const requireConfirmation = requireConfirmationInput.checked;

      uiManager.config.autoExecutorConfig = {
        checkInterval: interval,
        maxRetries: maxRetries,
        enableLogging: enableLogging,
        requireConfirmation: requireConfirmation
      };
      uiManager.saveConfig();
    });
  });

  uiManager.autoExecutorStatusInterval = setInterval(() => {
    updateAutoExecutorStatus(panel, uiManager.autoExecutor);
  }, 1000);
}

export function updateAutoExecutorStatus(panel: HTMLElement, autoExecutor: { isRunning: () => boolean; getCurrentAttempt: () => number; getExecutionHistory: () => Array<{ timestamp: number; action: string; success: boolean }> }): void {
  const autoExecutorTab = panel.querySelector('#auto-executor-tab');
  if (!autoExecutorTab) return;

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

export function applySettingsToPanel(uiManager: UIManager): void {
  const panel = uiManager.settingsPanel;
  if (!panel) return;

  uiManager.applyTheme(uiManager.config.theme || 'light');
  logger.info('Settings applied to panel');

  panel.querySelectorAll('input[type="radio"][name="theme"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      uiManager.config.theme = (e.target as HTMLInputElement).value;
      uiManager.applyTheme(uiManager.config.theme);
      uiManager.saveConfig();
    });
  });

  const generalSettings = ['autoPlay', 'autoScroll', 'keyboardShortcuts', 'notifications'];
  generalSettings.forEach(setting => {
    const checkbox = panel.querySelector(`#${setting}`) as HTMLInputElement;
    if (checkbox) {
      checkbox.addEventListener('change', (e) => {
        if (!uiManager.config.general) uiManager.config.general = {} as Record<string, boolean>;
        uiManager.config.general[setting] = (e.target as HTMLInputElement).checked;
        uiManager.saveConfig();
      });
    }
  });

  const videoSettings = ['showLikeButton', 'showCommentButton', 'showShareButton', 'showAuthorInfo', 'showMusicInfo', 'showDescription', 'showRecommendations'];
  videoSettings.forEach(setting => {
    const checkbox = panel.querySelector(`#${setting}`) as HTMLInputElement;
    if (checkbox) {
      checkbox.addEventListener('change', (e) => {
        if (!uiManager.config.videoUI) uiManager.config.videoUI = {} as Record<string, boolean>;
        uiManager.config.videoUI[setting] = (e.target as HTMLInputElement).checked;
        uiManager.saveConfig();
        uiManager.applyVideoCustomizations();
      });
    }
  });

  const controlBarSettings = ['controlBar-show', 'controlBar-autoHide', 'controlBar-position', 'controlBar-size', 'controlBar-opacity'];
  controlBarSettings.forEach(setting => {
    const element = panel.querySelector(`#${setting}`) as HTMLInputElement;
    if (element) {
      element.addEventListener('change', (e) => {
        if (!uiManager.config.videoUI) uiManager.config.videoUI = {} as Record<string, unknown>;
        if (!uiManager.config.videoUI.controlBar) uiManager.config.videoUI.controlBar = {} as Record<string, unknown>;

        const controlBarSetting = setting.replace('controlBar-', '');
        let value: string | boolean | number = (e.target as HTMLInputElement).value;

        if ((e.target as HTMLInputElement).type === 'checkbox') {
          value = (e.target as HTMLInputElement).checked;
        } else if (controlBarSetting === 'opacity') {
          value = parseFloat(value);
          const valueElement = panel.querySelector('#controlBar-opacity-value');
          if (valueElement) valueElement.textContent = `${value * 100}%`;
        }

        uiManager.config.videoUI.controlBar[controlBarSetting] = value;
        uiManager.saveConfig();
        uiManager.applyVideoCustomizations();
      });
    }
  });

  const playbackSettings = ['playback-defaultQuality', 'playback-autoPlay', 'playback-loop'];
  playbackSettings.forEach(setting => {
    const element = panel.querySelector(`#${setting}`) as HTMLInputElement;
    if (element) {
      element.addEventListener('change', (e) => {
        if (!uiManager.config.videoUI) uiManager.config.videoUI = {} as Record<string, unknown>;
        if (!uiManager.config.videoUI.playback) uiManager.config.videoUI.playback = {} as Record<string, unknown>;

        const playbackSetting = setting.replace('playback-', '');
        let value: string | boolean = (e.target as HTMLInputElement).value;
        if ((e.target as HTMLInputElement).type === 'checkbox') value = (e.target as HTMLInputElement).checked;

        uiManager.config.videoUI.playback[playbackSetting] = value;
        uiManager.saveConfig();
        uiManager.applyVideoCustomizations();
      });
    }
  });

  const liveSettings = ['liveShowGifts', 'liveShowDanmaku', 'liveShowRecommendations', 'liveShowAds', 'liveShowStats'];
  liveSettings.forEach(setting => {
    const checkbox = panel.querySelector(`#${setting}`) as HTMLInputElement;
    if (checkbox) {
      checkbox.addEventListener('change', (e) => {
        if (!uiManager.config.liveUI) uiManager.config.liveUI = {} as Record<string, boolean>;
        const liveSetting = setting.replace('liveShow', 'show');
        uiManager.config.liveUI[liveSetting] = (e.target as HTMLInputElement).checked;
        uiManager.saveConfig();
        uiManager.applyLiveCustomizations();
      });
    }
  });

  const danmakuSettings = ['danmaku-fontSize', 'danmaku-color', 'danmaku-opacity', 'danmaku-speed', 'danmaku-position', 'danmaku-maxLines'];
  danmakuSettings.forEach(setting => {
    const element = panel.querySelector(`#${setting}`) as HTMLInputElement;
    if (element) {
      element.addEventListener('change', (e) => {
        if (!uiManager.config.liveUI) uiManager.config.liveUI = {} as Record<string, unknown>;
        if (!uiManager.config.liveUI.danmaku) uiManager.config.liveUI.danmaku = {} as Record<string, unknown>;

        const danmakuSetting = setting.replace('danmaku-', '');
        let value: string | number = (e.target as HTMLInputElement).value;

        if (danmakuSetting === 'fontSize' || danmakuSetting === 'maxLines') {
          value = parseInt(value);
          if (danmakuSetting === 'fontSize') {
            const valueElement = panel.querySelector('#danmaku-fontSize-value');
            if (valueElement) valueElement.textContent = `${value}px`;
          }
        } else if (danmakuSetting === 'opacity') {
          value = parseFloat(value);
          const valueElement = panel.querySelector('#danmaku-opacity-value');
          if (valueElement) valueElement.textContent = `${value * 100}%`;
        }

        uiManager.config.liveUI.danmaku[danmakuSetting] = value;
        uiManager.saveConfig();
        uiManager.applyLiveCustomizations();
      });
    }
  });

  const liveLayoutSelect = panel.querySelector('#live-layout') as HTMLSelectElement;
  if (liveLayoutSelect) {
    liveLayoutSelect.addEventListener('change', (e) => {
      if (!uiManager.config.liveUI) uiManager.config.liveUI = {} as Record<string, string>;
      uiManager.config.liveUI.layout = (e.target as HTMLSelectElement).value;
      uiManager.saveConfig();
      uiManager.applyLiveCustomizations();
    });
  }

  const liveVolumeSlider = panel.querySelector('#live-volume') as HTMLInputElement;
  if (liveVolumeSlider) {
    liveVolumeSlider.addEventListener('input', (e) => {
      const value = parseInt((e.target as HTMLInputElement).value);
      const valueElement = panel.querySelector('#live-volume-value');
      if (valueElement) valueElement.textContent = `${value}%`;
      if (!uiManager.config.liveUI) uiManager.config.liveUI = {} as Record<string, number>;
      uiManager.config.liveUI.volume = value;
      uiManager.saveConfig();
      uiManager.applyLiveCustomizations();
    });
  }

  const advancedSettings = ['advanced-debugMode', 'advanced-performanceMode'];
  advancedSettings.forEach(setting => {
    const checkbox = panel.querySelector(`#${setting}`) as HTMLInputElement;
    if (checkbox) {
      checkbox.addEventListener('change', (e) => {
        if (!uiManager.config.advanced) uiManager.config.advanced = {} as Record<string, boolean>;
        const advancedSetting = setting.replace('advanced-', '');
        uiManager.config.advanced[advancedSetting] = (e.target as HTMLInputElement).checked;
        uiManager.saveConfig();
      });
    }
  });

  const customCSS = panel.querySelector('#advanced-customCSS') as HTMLTextAreaElement;
  if (customCSS) {
    customCSS.addEventListener('input', (e) => {
      if (!uiManager.config.advanced) uiManager.config.advanced = {} as Record<string, string>;
      uiManager.config.advanced.customCSS = (e.target as HTMLTextAreaElement).value;
      uiManager.saveConfig();
    });
  }

  const addScriptBtn = panel.querySelector('#add-script');
  if (addScriptBtn) {
    addScriptBtn.addEventListener('click', () => {
      const scriptsList = panel.querySelector('#custom-scripts-list');
      if (scriptsList) {
        const index = scriptsList.children.length;
        const scriptItem = document.createElement('div');
        scriptItem.className = 'script-item';
        scriptItem.innerHTML = `
          <input type="text" data-index="${index}" placeholder="脚本URL或代码" />
          <button class="remove-script" data-index="${index}">删除</button>
        `;
        scriptsList.appendChild(scriptItem);

        const removeBtn = scriptItem.querySelector('.remove-script');
        if (removeBtn) {
          removeBtn.addEventListener('click', () => {
            scriptItem.remove();
            uiManager.saveConfig();
          });
        }

        const input = scriptItem.querySelector('input');
        if (input) {
          input.addEventListener('input', () => uiManager.saveConfig());
        }
      }
    });
  }

  const removeScriptBtns = panel.querySelectorAll('.remove-script');
  removeScriptBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const scriptItem = btn.closest('.script-item');
      if (scriptItem) {
        scriptItem.remove();
        uiManager.saveConfig();
      }
    });
  });

  const scriptInputs = panel.querySelectorAll('#custom-scripts-list .script-item input');
  scriptInputs.forEach(input => {
    input.addEventListener('input', () => uiManager.saveConfig());
  });
}

import { findElementsByClassPattern, findElementsByStructure, toggleElements } from '../../utils/dom.ts';
import logger from '../../utils/logger.ts';
import type UIManager from '../../ui_manager.js';

export function applyVideoCustomizations(uiManager: UIManager): void {
  logger.info('[UI定制] 开始应用短视频界面定制');
  const { videoUI } = uiManager.config;

  if (!videoUI) {
    logger.warn('[UI定制] 警告：videoUI配置缺失');
    return;
  }

  logger.info('[UI定制] 视频UI配置:', JSON.stringify(videoUI));

  if (!document.body) {
    logger.warn('[UI定制] 警告：document.body未准备好，延迟应用定制');
    setTimeout(() => uiManager.applyVideoCustomizations(), 500);
    return;
  }

  uiManager.toggleElement(() => {
    logger.info('[UI定制] 查找点赞按钮元素...');
    const heartIcons = uiManager.findElementsByStructure({
      tagName: 'svg',
      attributes: { viewBox: '0 0 1024 1024' }
    });
    if (heartIcons.length > 0) {
      logger.info(`[UI定制] 找到 ${heartIcons.length} 个可能的点赞图标`);
      const elements = heartIcons.map(icon => icon.closest('div') || icon);
      logger.info(`[UI定制] 获取到 ${elements.length} 个点赞相关元素`);
      return elements;
    }

    logger.info('[UI定制] 尝试通过类名模式匹配点赞按钮');
    const classElements = uiManager.findElementsByClassPattern(/like|heart|favorite/i);
    logger.info(`[UI定制] 通过类名找到 ${classElements.length} 个可能的点赞元素`);
    return classElements;
  }, videoUI.showLikeButton);

  uiManager.toggleElement(() => {
    logger.info('[UI定制] 开始查找评论元素...');
    const commentElements = uiManager.findElementsByStructure({
      tagName: 'div',
      children: [{ tagName: 'svg', attributes: { viewBox: '0 0 1024 1024' } }]
    });
    if (commentElements.length > 0) return commentElements;
    return uiManager.findElementsByClassPattern(/comment|discuss/i);
  }, videoUI.showCommentButton);

  uiManager.toggleElement(() => {
    const shareElements = uiManager.findElementsByStructure({
      tagName: 'div',
      children: [{ tagName: 'svg', attributes: { viewBox: '0 0 1024 1024' } }]
    });
    if (shareElements.length > 0) {
      return shareElements.filter(el => {
        const text = el.textContent.toLowerCase();
        return text.includes('share') || text.includes('分享');
      });
    } else {
      return uiManager.findElementsByClassPattern(/share|forward/i);
    }
  }, videoUI.showShareButton);

  uiManager.toggleElement(() => {
    const avatarElements = uiManager.findElementsByStructure({
      tagName: 'img',
      attributes: { class: /avatar|user/i }
    });
    if (avatarElements.length > 0) {
      return avatarElements.map(img => img.closest('div') || img);
    }
    return uiManager.findElementsByClassPattern(/author|user|avatar/i);
  }, videoUI.showAuthorInfo);

  uiManager.toggleElement(() => {
    const musicElements = uiManager.findElementsByStructure({ text: '音乐' });
    if (musicElements.length > 0) {
      return musicElements.map(el => el.closest('div') || el);
    }
    return uiManager.findElementsByClassPattern(/music|sound/i);
  }, videoUI.showMusicInfo);

  uiManager.toggleElement(() => {
    const textElements = document.body.querySelectorAll('div');
    const descriptions = Array.from(textElements).filter(el => {
      return el.textContent.length > 20 && el.textContent.length < 200 &&
             el.querySelector('img') && el.querySelector('video');
    });
    if (descriptions.length > 0) return descriptions;
    return uiManager.findElementsByClassPattern(/desc|description|content/i);
  }, videoUI.showDescription);

  uiManager.toggleElement(() => {
    const recommendationContainers = uiManager.findElementsByStructure({
      tagName: 'div',
      children: [{ tagName: 'video' }]
    });
    if (recommendationContainers.length > 0) return recommendationContainers;
    return uiManager.findElementsByClassPattern(/recommend|suggest|related/i);
  }, videoUI.showRecommendations);

  if (videoUI.controlBar) {
    uiManager.customizeControlBar(videoUI.controlBar);
  }

  uiManager.applyLayout('video', videoUI.layout);
}

import { findElementsByClassPattern, findElementsByStructure } from '../../utils/dom.ts';
import logger from '../../utils/logger.ts';
import type UIManager from '../../ui_manager.js';

export function applyLiveCustomizations(uiManager: UIManager): void {
  logger.info('应用直播间界面定制');
  const { liveUI } = uiManager.config;

  if (!liveUI) return;

  uiManager.toggleElement(() => {
    logger.info('[UI定制] 开始查找礼物元素...');
    let giftElements: HTMLElement[] = [];

    giftElements = giftElements.concat(
      uiManager.findElementsByClassPattern(/gift|present|reward|award|effect|animation|特效|礼物|打赏|赠送|连击|连击奖励|豪华礼物|礼物特效|礼物动画|送礼物|礼物展示/i)
    );

    giftElements = giftElements.concat(
      uiManager.findElementsByStructure({
        attributes: { class: /gift|present|reward|award|effect|animation/i }
      })
    );

    const animatedElements = document.body.querySelectorAll('div');
    const potentialGiftAnims = Array.from(animatedElements).filter(el => {
      const style = window.getComputedStyle(el);
      return (style.animationName !== 'none' ||
        style.transitionProperty.includes('transform') ||
        style.transform !== 'none') &&
        parseInt(style.zIndex) > 100 &&
        style.position === 'absolute';
    });

    giftElements = giftElements.concat(potentialGiftAnims);

    const textGiftElements = uiManager.findElementsByStructure({
      text: /礼物|特效|打赏|赠送|连击|连击奖励|豪华礼物/i
    });

    if (textGiftElements.length > 0) {
      textGiftElements.forEach(el => {
        giftElements.push(el);
        giftElements.push(el.closest('div') || el);
        giftElements.push(el.closest('.gift-container') || el);
        giftElements.push(el.closest('.animation-container') || el);
      });
    }

    giftElements = [...new Set(giftElements)];
    logger.info(`[UI定制] 找到 ${giftElements.length} 个礼物相关元素`);
    return giftElements;
  }, liveUI.showGifts);

  uiManager.toggleElement(() => {
    const bulletElements = document.body.querySelectorAll('div');
    const potentialBullets = Array.from(bulletElements).filter(el => {
      const style = window.getComputedStyle(el);
      return style.position === 'absolute' &&
             style.pointerEvents === 'none' &&
             style.zIndex > 0;
    });
    if (potentialBullets.length > 0) return potentialBullets;
    return uiManager.findElementsByClassPattern(/danmu|bullet|comment|danmaku/i);
  }, liveUI.showDanmaku);

  uiManager.toggleElement(() => {
    const recommendationContainers = uiManager.findElementsByStructure({
      tagName: 'div',
      children: [{ tagName: 'img' }]
    });
    if (recommendationContainers.length > 0) return recommendationContainers;
    return uiManager.findElementsByClassPattern(/recommend|suggest|related|live-recommend/i);
  }, liveUI.showRecommendations);

  uiManager.toggleElement(() => {
    const adElements = uiManager.findElementsByStructure({ text: /广告|推广|ad|promotion/i });
    if (adElements.length > 0) {
      return adElements.map(el => el.closest('div') || el);
    }
    return uiManager.findElementsByClassPattern(/ad|advertisement|promotion|广告/i);
  }, liveUI.showAds);

  uiManager.toggleElement(() => {
    const numberElements = document.body.querySelectorAll('div');
    const potentialStats = Array.from(numberElements).filter(el => {
      return /\d+/.test(el.textContent);
    });
    if (potentialStats.length > 0) return potentialStats;
    return uiManager.findElementsByClassPattern(/stat|count|number|view/i);
  }, liveUI.showStats);

  if (liveUI.danmaku) {
    uiManager.customizeDanmaku(liveUI.danmaku);
  }

  uiManager.applyLayout('live', liveUI.layout);
}

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
} from './utils/dom.ts';
import logger from './utils/logger.ts';
import eventEmitter from './utils/eventEmitter.ts';
import themeManager from './styles/theme.ts';
import autoExecutor from './utils/autoExecutor.ts';

import {
  createSettingsPanelContent,
  injectPanelStyles,
  setupSettingsPanelEvents,
  applySettingsToPanel,
  setupAutoExecutorEvents,
  updateAutoExecutorStatus
} from './ui/panels/settingsPanel.ts';

import { makePanelDraggable, restrictPanelToViewport } from './ui/core/panelDrag.ts';
import { applyVideoCustomizations } from './ui/customizations/videoCustomizations.ts';
import { applyLiveCustomizations } from './ui/customizations/liveCustomizations.ts';
import type { Config } from './config.js';

class UIManager {
  config: Config;
  settingsPanel: HTMLElement | null;
  toggleButton: HTMLButtonElement | null;
  isPanelVisible: boolean;
  lastScrollPosition: number;
  debouncedApplyCustomizations: () => void;
  throttledHandleScroll: (e: Event) => void;
  mutationObserver: MutationObserver | null;
  domObserver: MutationObserver | null;
  autoExecutorStatusInterval: ReturnType<typeof setInterval> | null;
  autoExecutor: typeof autoExecutor;

  constructor(config: Config) {
    this.config = config;
    this.settingsPanel = null;
    this.toggleButton = null;
    this.isPanelVisible = false;
    this.lastScrollPosition = 0;

    this.debouncedApplyCustomizations = debounce(() => this.applyAllCustomizations(), 500);
    this.throttledHandleScroll = throttle((e: Event) => this.handleScroll(e), 100);
    this.mutationObserver = null;
    this.domObserver = null;
    this.autoExecutorStatusInterval = null;

    this.autoExecutor = autoExecutor;

    logger.info('UIManager initialized with config');

    themeManager.on('themeChanged', (newTheme: string) => {
      logger.info(`Theme changed to ${newTheme}`);
      this.applyTheme(newTheme);
    });
  }

  applyVideoCustomizations(): void {
    applyVideoCustomizations(this);
  }

  applyLiveCustomizations(): void {
    applyLiveCustomizations(this);
  }

  toggleElement(selectorOrFinder: string | (() => HTMLElement[]), show: boolean): void {
    let elements: HTMLElement[] = [];
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

    toggleElements(elements, show);
  }

  findElementsByStructure(options: unknown): HTMLElement[] {
    return findElementsByStructure(options);
  }

  findElementsByClassPattern(pattern: string, tagName: string = '*'): HTMLElement[] {
    return findElementsByClassPattern(pattern, tagName);
  }

  customizeControlBar(controlBarConfig: { show?: boolean; position?: string; autoHide?: boolean }): void {
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
  }

  customizeDanmaku(danmakuConfig: { fontSize?: number; color?: string; opacity?: number; speed?: string }): void {
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

  hideSettingsPanel(): void {
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

  applyLayout(type: string, layout: string): void {
    if (!layout || layout === 'default') return;
    logger.info(`应用${type}布局：${layout}`);
  }

  showSettingsPanel(): void {
    if (this.settingsPanel) {
      this.settingsPanel.remove();
    }

    this.settingsPanel = this.createSettingsPanel();
    document.body.appendChild(this.settingsPanel);
    this.makePanelDraggable(this.settingsPanel);
  }

  createSettingsPanel(): HTMLElement {
    const panel = createElement('div', {
      className: 'douyin-ui-customizer-panel',
      style: { animation: 'slideIn 0.3s ease-out' }
    });

    injectPanelStyles();
    panel.innerHTML = createSettingsPanelContent(this.config);
    setupSettingsPanelEvents(panel, this);

    return panel;
  }

  makePanelDraggable(panel: HTMLElement): void {
    makePanelDraggable(panel);
    restrictPanelToViewport(panel);
  }

  applyAllCustomizations(): void {
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

  detectPageType(): string {
    if (document.querySelector('video[autoplay]')) return 'video';
    if (document.querySelector('.live, .live-room, [data-type="live"]')) return 'live';
    return 'other';
  }

  handleScroll(e: Event): void {
    const currentScroll = window.scrollY;
    const direction = currentScroll > this.lastScrollPosition ? 'down' : 'up';
    this.lastScrollPosition = currentScroll;

    if (this.settingsPanel && this.isPanelVisible) {
      if (direction === 'down' && currentScroll > 100) {
        this.hideSettingsPanel();
      }
    }
  }

  applyTheme(theme: string): void {
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

  saveToLocalStorage(config: Config): void {
    try {
      localStorage.setItem('douyin-ui-customizer-config', JSON.stringify(config));
      logger.info('配置已保存到localStorage');
    } catch (error) {
      logger.error('保存到localStorage失败:', error);
    }
  }

  saveConfig(): void {
    try {
      import('./config.ts').then(({ default: configManager }) => {
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

  async saveSettings(panel: HTMLElement): Promise<void> {
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
          if (!this.config.general) this.config.general = {} as Config['general'];
          (this.config.general as Record<string, boolean>)[setting] = (checkbox as HTMLInputElement).checked;
        }
      });

      const videoSettings = ['showLikeButton', 'showCommentButton', 'showShareButton', 'showAuthorInfo', 'showMusicInfo', 'showDescription', 'showRecommendations'];
      videoSettings.forEach(setting => {
        const checkbox = panel.querySelector(`#${setting}`);
        if (checkbox) {
          if (!this.config.videoUI) this.config.videoUI = {} as Config['videoUI'];
          (this.config.videoUI as Record<string, boolean>)[setting] = (checkbox as HTMLInputElement).checked;
        }
      });

      const controlBarSettings = ['controlBar-show', 'controlBar-autoHide', 'controlBar-position', 'controlBar-size', 'controlBar-opacity'];
      controlBarSettings.forEach(setting => {
        const element = panel.querySelector(`#${setting}`);
        if (element) {
          if (!this.config.videoUI) this.config.videoUI = {} as Config['videoUI'];
          if (!this.config.videoUI.controlBar) this.config.videoUI.controlBar = {} as Config['videoUI']['controlBar'];
          const controlBarSetting = setting.replace('controlBar-', '');
          let value: string | boolean | number = (element as HTMLInputElement).value;
          if ((element as HTMLInputElement).type === 'checkbox') value = (element as HTMLInputElement).checked;
          else if (controlBarSetting === 'opacity') value = parseFloat(value as string);
          (this.config.videoUI.controlBar as Record<string, unknown>)[controlBarSetting] = value;
        }
      });

      const playbackSettings = ['playback-defaultQuality', 'playback-autoPlay', 'playback-loop'];
      playbackSettings.forEach(setting => {
        const element = panel.querySelector(`#${setting}`);
        if (element) {
          if (!this.config.videoUI) this.config.videoUI = {} as Config['videoUI'];
          if (!this.config.videoUI.playback) this.config.videoUI.playback = {} as Config['videoUI']['playback'];
          const playbackSetting = setting.replace('playback-', '');
          let value: string | boolean = (element as HTMLInputElement).value;
          if ((element as HTMLInputElement).type === 'checkbox') value = (element as HTMLInputElement).checked;
          (this.config.videoUI.playback as Record<string, unknown>)[playbackSetting] = value;
        }
      });

      const liveSettings = ['liveShowGifts', 'liveShowDanmaku', 'liveShowRecommendations', 'liveShowAds', 'liveShowStats'];
      liveSettings.forEach(setting => {
        const checkbox = panel.querySelector(`#${setting}`);
        if (checkbox) {
          if (!this.config.liveUI) this.config.liveUI = {} as Config['liveUI'];
          const liveSetting = setting.replace('liveShow', 'show');
          (this.config.liveUI as Record<string, boolean>)[liveSetting] = (checkbox as HTMLInputElement).checked;
        }
      });

      const danmakuSettings = ['danmaku-fontSize', 'danmaku-color', 'danmaku-opacity', 'danmaku-speed', 'danmaku-position', 'danmaku-maxLines'];
      danmakuSettings.forEach(setting => {
        const element = panel.querySelector(`#${setting}`);
        if (element) {
          if (!this.config.liveUI) this.config.liveUI = {} as Config['liveUI'];
          if (!this.config.liveUI.danmaku) this.config.liveUI.danmaku = {} as Config['liveUI']['danmaku'];
          const danmakuSetting = setting.replace('danmaku-', '');
          let value: string | number = (element as HTMLInputElement).value;
          if (danmakuSetting === 'fontSize' || danmakuSetting === 'maxLines') value = parseInt(value as string);
          else if (danmakuSetting === 'opacity') value = parseFloat(value as string);
          (this.config.liveUI.danmaku as Record<string, unknown>)[danmakuSetting] = value;
        }
      });

      const liveLayoutSelect = panel.querySelector('#live-layout');
      if (liveLayoutSelect) {
        if (!this.config.liveUI) this.config.liveUI = {} as Config['liveUI'];
        this.config.liveUI.layout = (liveLayoutSelect as HTMLSelectElement).value;
      }

      const liveVolumeSlider = panel.querySelector('#live-volume');
      if (liveVolumeSlider) {
        if (!this.config.liveUI) this.config.liveUI = {} as Config['liveUI'];
        this.config.liveUI.volume = parseInt((liveVolumeSlider as HTMLInputElement).value);
      }

      const debugModeCheckbox = panel.querySelector('#advanced-debugMode');
      const performanceModeCheckbox = panel.querySelector('#advanced-performanceMode');
      const customCSS = panel.querySelector('#advanced-customCSS');

      if (!this.config.advanced) this.config.advanced = {} as Config['advanced'];
      if (debugModeCheckbox) this.config.advanced.debugMode = (debugModeCheckbox as HTMLInputElement).checked;
      if (performanceModeCheckbox) this.config.advanced.performanceMode = (performanceModeCheckbox as HTMLInputElement).checked;
      if (customCSS) this.config.advanced.customCSS = (customCSS as HTMLTextAreaElement).value;

      const scriptItems = panel.querySelectorAll('#custom-scripts-list .script-item input');
      const customScripts: string[] = [];
      let hasScripts = false;

      scriptItems.forEach(input => {
        const value = (input as HTMLInputElement).value.trim();
        if (value) {
          customScripts.push(value);
          hasScripts = true;
        }
      });

      if (hasScripts) {
        const confirmed = confirm('警告：自定义脚本可能会带来安全风险，是否继续保存？');
        if (!confirmed) return;

        for (const script of customScripts) {
          if (script.includes('eval(') || script.includes('Function(') || script.includes('innerHTML') || script.includes('document.write') || script.includes('execScript')) {
            const scriptConfirmed = confirm('警告：检测到可能的危险代码，是否确认添加此脚本？');
            if (!scriptConfirmed) return;
          }

          if (script.startsWith('http://') || script.startsWith('https://')) {
            const allowedDomains = ['cdnjs.cloudflare.com', 'cdn.jsdelivr.net', 'unpkg.com', 'jsdelivr.net', 'cdnjs.com'];
            const url = new URL(script);
            const domain = url.hostname;

            if (!allowedDomains.some(allowedDomain => domain.includes(allowedDomain))) {
              const urlConfirmed = confirm(`警告：脚本URL来自非白名单域名 (${domain})，是否确认添加此脚本？`);
              if (!urlConfirmed) return;
            }
          }
        }
      }

      this.config.advanced.customScripts = customScripts;

      let validationResult = { valid: true, issues: [] as string[] };
      try {
        const configModule = await import('./config.ts');
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

  basicValidateConfig(config: Config): { valid: boolean; issues: string[] } {
    const issues: string[] = [];

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

    return { valid: issues.length === 0, issues };
  }

  init(): void {
    logger.info('[UI管理器] 初始化UI管理器');
    try {
      this.initSettingsPanel();
      this.initUI();
      this.setupEvents();
    } catch (error) {
      logger.error('[UI管理器] 初始化失败:', error);
    }
  }

  initUI(): void {
    logger.info('[UI管理器] 初始化UI定制');
    this.showToggleButton();
    this.applyAllCustomizations();
  }

  setupEvents(): void {
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

  observeDomChanges(): void {
    const observer = new MutationObserver(this.debouncedApplyCustomizations);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      characterData: true
    });
    this.domObserver = observer;
  }

  cleanup(): void {
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

  initSettingsPanel(): void {
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
      this.settingsPanel!.style.display = 'none';
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
        tabContent.querySelector(`#${tabId}-tab`)?.classList.add('active');
      });
    });

    this.applyTheme(this.config.theme);
    eventEmitter.emit('ui.panel.initialized');
    logger.info('Settings panel initialized');
  }

  restrictPanelToViewport(panel: HTMLElement): void {
    restrictPanelToViewport(panel);
  }

  showToggleButton(): void {
    let toggleButton = document.getElementById('douyin-customizer-toggle') as HTMLButtonElement;
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
      this.settingsPanel!.style.display = 'block';
      toggleButton.style.display = 'none';
    });
  }
}

export default UIManager;

import { debounce, getElement, addEvent, createElement, injectStyle } from './utils/dom.ts';
import { getItem, setItem, NamespacedStorage } from './utils/storage.ts';
import logger from './utils/logger.ts';
import eventEmitter from './utils/eventEmitter.ts';
import performanceMonitor from './utils/performance.ts';
import configManager from './config.js';
import UIManager from './ui_manager.js';
import themeManager from './styles/theme.ts';
import { injectStyles, injectBasicStyles } from './utils/styleGenerator.ts';
import { observePageChanges, stopObserving, isVideoPage, isLivePage } from './utils/pageObserver.ts';

const CURRENT_VERSION = '2.0.2';
const UPDATE_CHECK_INTERVAL = 24 * 60 * 60 * 1000;

const storage = new NamespacedStorage('douyin_tool');
let uiManager: UIManager | null = null;

function checkForUpdates(showNoUpdateMessage = false): void {
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
  const lastCheckTime = getItem('lastUpdateCheckTime', 0);
  const now = Date.now();

  if (now - lastCheckTime > UPDATE_CHECK_INTERVAL) {
    setItem('lastUpdateCheckTime', now);
    return true;
  }

  return false;
}

function init(): void {
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

  performanceMonitor.on('performance.warning', (data) => {
    logger.warn('性能警告:', data);
  });
}

function cleanup(): void {
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
    start: () => performanceMonitor.start(),
    stop: () => performanceMonitor.stop(),
    getStats: () => performanceMonitor.getStats(),
    enableDebug: () => performanceMonitor.enableDebug()
  },
  config: {
    export: () => configManager.exportConfig(),
    import: (jsonString: string) => configManager.importConfig(jsonString),
    reset: () => configManager.resetConfig(),
    validate: (config: unknown) => configManager.validateConfig(config as Parameters<typeof configManager.validateConfig>[0])
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

