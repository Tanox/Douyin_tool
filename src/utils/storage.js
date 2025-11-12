/**
 * 存储工具模块
 * 提供丰富的数据存储功能，支持嵌套数据、过期时间和批量操作
 */

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
    console.error(`获取存储数据失败 (${key}):`, error);
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
    console.error(`设置存储数据失败 (${key}):`, error);
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
    console.error(`删除存储数据失败 (${key}):`, error);
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
    console.error('清除所有存储数据失败:', error);
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
    console.error(`获取嵌套数据失败 (${key}.${path}):`, error);
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
    console.error(`设置嵌套数据失败 (${key}.${path}):`, error);
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
    console.error(`检查键是否存在失败 (${key}):`, error);
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
    console.error('获取所有键名失败:', error);
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
    console.error('获取存储信息失败:', error);
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
      console.error(`清除命名空间 ${this.namespace} 失败:`, error);
      return false;
    }
  }
}