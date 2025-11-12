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
  performanceMonitor
};

export default utils;