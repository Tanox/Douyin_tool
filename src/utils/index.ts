export * from './dom.ts';

export * from './storage.ts';

export { Logger } from './logger.ts';
export { default as logger } from './logger.ts';

export { EventEmitter } from './eventEmitter.ts';
export { default as eventEmitter } from './eventEmitter.ts';

export { PerformanceMonitor } from './performance.ts';
export { default as performanceMonitor } from './performance.ts';

export { default as autoExecutor } from './autoExecutor.ts';

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