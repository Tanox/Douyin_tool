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