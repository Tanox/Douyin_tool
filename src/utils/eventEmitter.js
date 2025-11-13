/**
 * 事件总线模块
 * 实现模块间通信的事件发布订阅模式
 */

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
      console.warn(`警告: 事件'${event}'的监听器数量超过了${this.maxListeners}个。` +
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
        console.error(`事件'${event}'的监听器执行出错:`, error);
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