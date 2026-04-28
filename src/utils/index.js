// src/utils/index.js

// DOM操作工具
export * from './dom.ts';

// 存储工具
export * from './storage.ts';

// 日志记录工具
export { Logger } from './logger.ts';
export { default as logger } from './logger.ts';

// 事件总线
export { EventEmitter } from './eventEmitter.ts';
export { default as eventEmitter } from './eventEmitter.ts';

// 性能监控
export { PerformanceMonitor } from './performance.ts';
export { default as performanceMonitor } from './performance.ts';

// 自动执行控制器
export { default as autoExecutor } from './autoExecutor.ts';

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