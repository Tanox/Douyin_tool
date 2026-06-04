import logger from './logger';
import type { StorageInfo } from '../types';

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
    const data = getItem<Record<string, unknown>>(key, {}) || {};
    const keys = path.split('.');
    let current = data as Record<string, unknown>;

    for (let i = 0; i < keys.length - 1; i++) {
      const k = keys[i];
      if (!current[k] || typeof current[k] !== 'object' || current[k] === null) {
        current[k] = {};
      }
      current = current[k] as Record<string, unknown>;
    }

    if (current && typeof current === 'object' && current !== null) {
      current[keys[keys.length - 1]] = value;
    }

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
      if (key) {
        const value = localStorage.getItem(key);
        const size = new Blob([key + (value || '')]).size;

        totalSize += size;
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