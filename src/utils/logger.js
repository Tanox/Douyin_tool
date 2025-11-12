/**
 * 日志记录工具模块
 * 提供统一的日志记录功能，支持不同级别的日志输出和配置
 */

class Logger {
  /**
   * 构造函数
   * @param {Object} options - 配置选项
   * @param {string} options.prefix - 日志前缀
   * @param {boolean} options.enableDebug - 是否启用调试日志
   * @param {boolean} options.enableInfo - 是否启用信息日志
   * @param {boolean} options.enableWarn - 是否启用警告日志
   * @param {boolean} options.enableError - 是否启用错误日志
   */
  constructor(options = {}) {
    this.prefix = options.prefix || '[抖音UI定制工具]';
    this.enableDebug = options.enableDebug !== false; // 默认启用
    this.enableInfo = options.enableInfo !== false;   // 默认启用
    this.enableWarn = options.enableWarn !== false;   // 默认启用
    this.enableError = options.enableError !== false; // 默认启用
    this.logHistory = [];
    this.maxHistorySize = 100; // 最大历史记录条数
  }

  /**
   * 格式化日志消息
   * @param {string} level - 日志级别
   * @param {*} args - 日志参数
   * @returns {string} 格式化后的日志消息
   */
  _formatMessage(level, ...args) {
    const timestamp = new Date().toLocaleTimeString();
    const formattedArgs = args.map(arg => {
      if (typeof arg === 'object' && arg !== null) {
        try {
          return JSON.stringify(arg, null, 2);
        } catch (e) {
          return String(arg);
        }
      }
      return String(arg);
    }).join(' ');
    
    return `[${timestamp}] ${this.prefix} [${level}] ${formattedArgs}`;
  }

  /**
   * 记录日志到历史记录
   * @param {string} level - 日志级别
   * @param {string} message - 日志消息
   */
  _addToHistory(level, message) {
    this.logHistory.push({
      timestamp: Date.now(),
      level,
      message
    });
    
    // 限制历史记录大小
    if (this.logHistory.length > this.maxHistorySize) {
      this.logHistory.shift();
    }
  }

  /**
   * 调试日志
   * @param {...*} args - 日志参数
   */
  debug(...args) {
    if (!this.enableDebug) return;
    const message = this._formatMessage('DEBUG', ...args);
    console.debug(message);
    this._addToHistory('DEBUG', message);
  }

  /**
   * 信息日志
   * @param {...*} args - 日志参数
   */
  info(...args) {
    if (!this.enableInfo) return;
    const message = this._formatMessage('INFO', ...args);
    console.info(message);
    this._addToHistory('INFO', message);
  }

  /**
   * 警告日志
   * @param {...*} args - 日志参数
   */
  warn(...args) {
    if (!this.enableWarn) return;
    const message = this._formatMessage('WARN', ...args);
    console.warn(message);
    this._addToHistory('WARN', message);
  }

  /**
   * 错误日志
   * @param {...*} args - 日志参数
   */
  error(...args) {
    if (!this.enableError) return;
    const message = this._formatMessage('ERROR', ...args);
    console.error(message);
    this._addToHistory('ERROR', message);
  }

  /**
   * 设置日志级别
   * @param {Object} options - 日志级别配置
   */
  setLevel(options) {
    this.enableDebug = options.debug !== false;
    this.enableInfo = options.info !== false;
    this.enableWarn = options.warn !== false;
    this.enableError = options.error !== false;
    this.debug('日志级别已更新:', options);
  }

  /**
   * 获取日志历史
   * @param {number} limit - 返回的最大条数
   * @returns {Array} 日志历史记录
   */
  getHistory(limit = this.logHistory.length) {
    return this.logHistory.slice(-limit);
  }

  /**
   * 清空日志历史
   */
  clearHistory() {
    this.logHistory = [];
    this.debug('日志历史已清空');
  }

  /**
   * 导出日志历史为字符串
   * @returns {string} 导出的日志字符串
   */
  exportLogs() {
    return this.logHistory
      .map(log => `[${new Date(log.timestamp).toISOString()}] [${log.level}] ${log.message}`)
      .join('\n');
  }

  /**
   * 捕获错误并记录
   * @param {Error} error - 错误对象
   * @param {string} context - 错误上下文
   */
  captureError(error, context = '') {
    const errorMessage = `${context}${context ? ': ' : ''}${error.message || 'Unknown error'}`;
    const stack = error.stack || '';
    this.error(errorMessage, 'Stack:', stack);
    
    // 可以在这里添加错误上报逻辑
    return errorMessage;
  }
}

// 创建默认实例
const defaultLogger = new Logger();

// 导出类和默认实例
export { Logger };
export default defaultLogger;