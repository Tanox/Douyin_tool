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